import type {
  OptimizationInput,
  OptimizationResult,
  OptimizationRecommendation,
  CategoryChange,
  OptimizationReasoning,
  ReallocationOpportunity,
  SourceCategoryUnused,
  DestinationAllocation,
  ReallocationAuditLog,
} from './types'
import type { CategoryKey } from '../../utils/budgetUtils'
import {
  GOAL_CATEGORY_WEIGHTS,
  MIN_OPTIMIZE_AMOUNT,
  MIN_REALLOCATE_AMOUNT,
  CATEGORY_DISPLAY,
  CATEGORY_SAFETY_FACTORS,
  ACTIVITY_HYDRATION_BOOST,
  SCORE_WEIGHTS,
} from './rules'
import { GOAL_LABELS, type UserProfile } from '../../App'
import { calculateBudgetMetrics } from '../budgetService'
import { supabase } from '../../lib/supabase'

// ═══════════════════════════════════════════════════════════
// 1. OPTIMIZE MY ₹X FEATURE ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Budget Spending Optimization Engine ("Optimize My ₹X")
 * Analyzes remaining budget to recommend the best way to spend available funds.
 */
export function optimizeFitnessBudget(input: OptimizationInput): OptimizationResult | null {
  const { profile, expenses, hydrationToday, sensorContext } = input

  const monthlyBudget = profile.monthlyBudget || 10000
  const smartReallocationEnabled = profile.smartReallocation !== false

  // Calculate real budget metrics from actual expenses
  const metrics = calculateBudgetMetrics(monthlyBudget, expenses)
  const remainingBudget = metrics.remainingBudget

  // If below minimum threshold, no optimization is possible
  if (remainingBudget < MIN_OPTIMIZE_AMOUNT) {
    return null
  }

  const categoryAllocations = profile.budgetCategories || {
    food: 4550,
    supplements: 2400,
    hydration: 1100,
    recovery: 1000,
    other: 950,
  }

  // Get goal-based category weights
  const goalWeights = GOAL_CATEGORY_WEIGHTS[profile.goal] || GOAL_CATEGORY_WEIGHTS.general

  // Determine optimization amount (use remaining budget)
  const optimizeAmount = remainingBudget

  // Determine activity context
  const isHighActivity = sensorContext
    ? sensorContext.motion === 'HIGH_INTENSITY' || sensorContext.motion === 'RUN' || sensorContext.heartRate >= 140
    : false

  // Adjust weights based on real-time context
  const adjustedWeights = { ...goalWeights }

  // Boost hydration if high activity or elevated temperature
  if (isHighActivity || (sensorContext && sensorContext.temperature >= 37.0)) {
    adjustedWeights.hydration *= ACTIVITY_HYDRATION_BOOST
  }

  // Boost food if user has been spending more on food (high utilization)
  const foodUtilization = categoryAllocations.food > 0
    ? metrics.categorySpent.food / categoryAllocations.food
    : 0
  if (foodUtilization > 0.7) {
    adjustedWeights.food *= 1.2
  }

  // Normalize weights
  const totalWeight = Object.values(adjustedWeights).reduce((s, w) => s + w, 0)
  const normalizedWeights: Record<CategoryKey, number> = {
    food: adjustedWeights.food / totalWeight,
    supplements: adjustedWeights.supplements / totalWeight,
    hydration: adjustedWeights.hydration / totalWeight,
    recovery: adjustedWeights.recovery / totalWeight,
    other: adjustedWeights.other / totalWeight,
  }

  // Distribute the optimization amount across categories
  const allCategories: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']

  // Calculate raw distribution
  const rawDistribution: Record<CategoryKey, number> = {
    food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0,
  }
  allCategories.forEach((cat) => {
    rawDistribution[cat] = Math.round(optimizeAmount * normalizedWeights[cat])
  })

  // Ensure exact sum matches optimize amount
  const rawSum = allCategories.reduce((s, c) => s + rawDistribution[c], 0)
  const sumDiff = optimizeAmount - rawSum
  if (sumDiff !== 0) {
    const topCat = allCategories.reduce((a, b) => normalizedWeights[a] > normalizedWeights[b] ? a : b)
    rawDistribution[topCat] += sumDiff
  }

  // Filter out zero-amount categories and build recommendations
  const recommendations: OptimizationRecommendation[] = []
  allCategories.forEach((cat) => {
    const amt = rawDistribution[cat]
    if (amt <= 0) return

    const display = CATEGORY_DISPLAY[cat]
    let description = ''

    switch (cat) {
      case 'food':
        description = buildFoodDescription(profile)
        break
      case 'hydration':
        description = buildHydrationDescription(hydrationToday, isHighActivity)
        break
      case 'supplements':
        description = buildSupplementsDescription(profile)
        break
      case 'recovery':
        description = buildRecoveryDescription(profile, isHighActivity)
        break
      case 'other':
        description = 'Equipment and gear support'
        break
    }

    recommendations.push({
      category: cat,
      label: display.label,
      icon: display.icon,
      amount: amt,
      description,
    })
  })

  // Sort recommendations by amount descending
  recommendations.sort((a, b) => b.amount - a.amount)

  // Build before/after category changes
  const categoryChanges: CategoryChange[] = allCategories.map((cat) => {
    const display = CATEGORY_DISPLAY[cat]
    const before = categoryAllocations[cat] || 0
    const delta = rawDistribution[cat] || 0
    return {
      category: cat,
      label: display.label,
      icon: display.icon,
      before,
      after: before + delta,
      delta,
    }
  })

  // Calculate recommendation score
  const scoreBreakdown = calculateScore(profile, metrics, sensorContext, hydrationToday, recommendations)
  const totalScore = Math.round(
    scoreBreakdown.goalFit * SCORE_WEIGHTS.goalFit +
    scoreBreakdown.foodPreferenceFit * SCORE_WEIGHTS.foodPreferenceFit +
    scoreBreakdown.budgetFit * SCORE_WEIGHTS.budgetFit +
    scoreBreakdown.activityRelevance * SCORE_WEIGHTS.activityRelevance +
    scoreBreakdown.nutritionFit * SCORE_WEIGHTS.nutritionFit
  )

  // Build reasoning
  const reasoning = buildReasoning(profile, metrics, sensorContext, isHighActivity)

  return {
    availableAmount: optimizeAmount,
    recommendations,
    categoryChanges,
    reasoning,
    score: totalScore,
    scoreBreakdown,
    smartReallocationEnabled,
    timestamp: new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════════════
// 2. DYNAMIC SMART BUDGET REALLOCATION ENGINE
// ═══════════════════════════════════════════════════════════

/**
 * Dynamic Budget Reallocation Engine
 *
 * Compares ALLOCATED BUDGET -> ACTUAL SPENDING -> UNUSED CATEGORY BUDGET ->
 * USER'S CURRENT NEEDS -> SAFE DYNAMIC REALLOCATION.
 *
 * Reallocates planned budget from underused categories to needy categories + Reserve.
 * Invariant: Total budget remains strictly unchanged.
 */
export function evaluateBudgetReallocation(input: OptimizationInput): ReallocationOpportunity {
  const { profile, expenses, hydrationToday, sensorContext } = input
  const smartReallocationEnabled = profile.smartReallocation !== false
  const monthlyBudget = profile.monthlyBudget || 10000

  const categoryAllocations = profile.budgetCategories || {
    food: 4550,
    supplements: 2400,
    hydration: 1100,
    recovery: 1000,
    other: 950,
  }

  // Calculate actual spending metrics
  const metrics = calculateBudgetMetrics(monthlyBudget, expenses)
  const categorySpent = metrics.categorySpent

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const daysRemaining = Math.max(1, daysInMonth - dayOfMonth + 1)
  const monthProgress = Math.min(1, dayOfMonth / daysInMonth)

  // Base fallback result for disabled or balanced states
  const emptyBase = {
    totalUnused: 0,
    totalSafeToReallocate: 0,
    sources: [] as SourceCategoryUnused[],
    destinations: [] as DestinationAllocation[],
    reserveAmount: 0,
    reallocatedAmount: 0,
    recommendationList: [],
    detailedReasoning: {
      sourcesSummary: '',
      workoutContext: '',
      hydrationContext: '',
      spendingPressure: '',
      reserveExplanation: '',
      fullExplanation: '',
    },
    beforeAllocations: { ...categoryAllocations },
    afterAllocations: { ...categoryAllocations },
    matchScore: 90,
    smartReallocationEnabled,
    timestamp: new Date().toISOString(),
  }

  // If Smart Reallocation is disabled by user
  if (!smartReallocationEnabled) {
    return {
      ...emptyBase,
      status: 'disabled',
      summaryHeadline: 'Smart Reallocation is currently disabled.',
    }
  }

  // Check if we have enough spending data
  if (expenses.length === 0) {
    return {
      ...emptyBase,
      status: 'low_data',
      summaryHeadline: 'SmartWear needs more spending data before recommending a reallocation.',
    }
  }

  // 1. EVALUATE UNUSED BUDGET & SAFE AVAILABLE FOR EACH CATEGORY
  const categories: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']
  const sources: SourceCategoryUnused[] = []

  categories.forEach((cat) => {
    const allocated = categoryAllocations[cat] || 0
    const spent = categorySpent[cat] || 0
    const unused = Math.max(0, allocated - spent)
    const runRate = spent / Math.max(1, dayOfMonth)
    const expectedRemainingSpend = runRate * daysRemaining

    // Calculate safe buffer to retain in the category
    // For discretionary (other/gear), buffer is low; for essentials (food), buffer is higher.
    const safetyFactor = CATEGORY_SAFETY_FACTORS[cat] || 0.2
    const minBuffer = allocated * safetyFactor
    const expectedBuffer = expectedRemainingSpend * 1.15
    const categoryBuffer = Math.min(allocated * 0.75, Math.max(minBuffer, expectedBuffer))

    // Safe amount available to reallocate from this category
    let safeAmount = 0
    if (unused >= MIN_REALLOCATE_AMOUNT) {
      if (cat === 'other') {
        // For Gear/other: if spent is very low (e.g. spent ₹100 of ₹1000), safe surplus can be up to unused
        safeAmount = Math.max(0, unused - Math.round(Math.min(100, spent > 0 ? expectedBuffer : 50)))
      } else {
        safeAmount = Math.max(0, unused - Math.round(categoryBuffer))
      }
      // Round to nearest ₹50
      safeAmount = Math.floor(safeAmount / 50) * 50
    }

    if (unused >= MIN_REALLOCATE_AMOUNT && safeAmount >= MIN_REALLOCATE_AMOUNT) {
      sources.push({
        category: cat,
        label: CATEGORY_DISPLAY[cat]?.label || cat,
        icon: CATEGORY_DISPLAY[cat]?.icon || '💰',
        allocated,
        spent,
        unused,
        safeAmount,
        daysRemaining,
        runRate: Math.round(runRate),
      })
    }
  })

  // If no source categories have safe unused funds
  if (sources.length === 0) {
    return {
      ...emptyBase,
      status: 'balanced',
      summaryHeadline: 'Your current budget allocation is already balanced.',
    }
  }

  // Sort sources by safe amount descending
  sources.sort((a, b) => b.safeAmount - a.safeAmount)

  const totalUnused = sources.reduce((sum, s) => sum + s.unused, 0)
  const totalSafeToReallocate = sources.reduce((sum, s) => sum + s.safeAmount, 0)

  if (totalSafeToReallocate < MIN_REALLOCATE_AMOUNT) {
    return {
      ...emptyBase,
      status: 'balanced',
      summaryHeadline: 'Your current budget allocation is already balanced.',
    }
  }

  // 2. DETECT REAL-TIME CONTEXT & SENSOR SIGNALS
  const isHighIntensity = sensorContext
    ? sensorContext.heartRate >= 140 || sensorContext.motion === 'HIGH_INTENSITY' || sensorContext.motion === 'RUN'
    : false
  const isElevatedTemp = sensorContext ? sensorContext.temperature >= 37.0 : false
  const hasHydrationDeficit = hydrationToday < 2000

  // 3. SCORE DESTINATION CATEGORIES
  const goalWeights = GOAL_CATEGORY_WEIGHTS[profile.goal] || GOAL_CATEGORY_WEIGHTS.general
  const sourceCategoryKeys = new Set(sources.map((s) => s.category))

  // Potential destinations (exclude categories acting as major sources with surplus)
  const candidateDestinations: CategoryKey[] = categories.filter((c) => !sourceCategoryKeys.has(c))

  // Priority scoring for each candidate
  const destinationScores: Record<CategoryKey, number> = {
    food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0,
  }

  candidateDestinations.forEach((cat) => {
    let score = (goalWeights[cat] || 0.2) * 40
    const alloc = categoryAllocations[cat] || 1
    const spent = categorySpent[cat] || 0
    const utilization = spent / alloc

    // Food priority
    if (cat === 'food') {
      if (utilization > 0.6) score += 35
      else if (utilization > 0.4) score += 20
      if (profile.goal === 'gym' || profile.goal === 'strength' || profile.goal === 'weight') score += 20
    }

    // Recovery priority
    if (cat === 'recovery') {
      if (isHighIntensity) score += 40
      if (profile.goal === 'athlete' || profile.goal === 'endurance') score += 25
      if (utilization > 0.5) score += 20
    }

    // Hydration priority
    if (cat === 'hydration') {
      if (hasHydrationDeficit) score += 35
      if (isElevatedTemp || isHighIntensity) score += 30
      if (hydrationToday < 1200) score += 20
    }

    // Supplements priority
    if (cat === 'supplements') {
      if (profile.goal === 'gym' || profile.goal === 'strength') score += 35
      if (utilization > 0.5) score += 15
    }

    destinationScores[cat] = Math.max(10, score)
  })

  // 4. CALCULATE RESERVE AMOUNT
  // Reserve ratio: scaled by days remaining (more days left = slightly higher buffer)
  const reserveRatio = Math.max(0.10, Math.min(0.20, (daysRemaining / daysInMonth) * 0.22))
  let reserveAmount = Math.round((totalSafeToReallocate * reserveRatio) / 10) * 10
  // Keep reserve reasonable
  reserveAmount = Math.max(50, Math.min(Math.round(totalSafeToReallocate * 0.25), reserveAmount))

  // Amount to distribute directly to category increases
  const amountToDistribute = totalSafeToReallocate - reserveAmount

  // 5. DISTRIBUTE ACROSS TOP DESTINATION CATEGORIES
  const rankedDestinations = [...candidateDestinations].sort((a, b) => destinationScores[b] - destinationScores[a])
  // Take top 2-3 needy categories
  const activeDestinations = rankedDestinations.slice(0, Math.min(3, rankedDestinations.length))

  const totalDestScore = activeDestinations.reduce((s, c) => s + destinationScores[c], 0) || 1
  const rawIncreases: Record<string, number> = {}

  activeDestinations.forEach((cat) => {
    const share = destinationScores[cat] / totalDestScore
    // Round to nearest ₹50
    rawIncreases[cat] = Math.round((amountToDistribute * share) / 50) * 50
  })

  // Ensure exact sum matches amountToDistribute
  const currentSumIncreases = activeDestinations.reduce((s, c) => s + (rawIncreases[c] || 0), 0)
  const diff = amountToDistribute - currentSumIncreases
  if (diff !== 0 && activeDestinations.length > 0) {
    const topCat = activeDestinations[0]
    rawIncreases[topCat] = Math.max(0, (rawIncreases[topCat] || 0) + diff)
  }

  // Recalculate reserve to guarantee exact match to totalSafeToReallocate
  const totalDirectIncreases = activeDestinations.reduce((s, c) => s + (rawIncreases[c] || 0), 0)
  reserveAmount = totalSafeToReallocate - totalDirectIncreases

  // Build destination details
  const destinations: DestinationAllocation[] = activeDestinations.map((cat) => {
    const increase = rawIncreases[cat] || 0
    const currentAlloc = categoryAllocations[cat] || 0
    const newAlloc = currentAlloc + increase

    let reason = ''
    switch (cat) {
      case 'food':
        reason = `Nutrition priority for ${GOAL_LABELS[profile.goal]} and higher spending pace`
        break
      case 'recovery':
        reason = isHighIntensity ? 'Active workout demand & post-exercise muscle repair' : 'Essential recovery support'
        break
      case 'hydration':
        reason = hasHydrationDeficit ? 'Electrolyte & hydration replenishment deficit' : 'Hydration optimization'
        break
      case 'supplements':
        reason = `Supplement support aligned with ${GOAL_LABELS[profile.goal]}`
        break
      default:
        reason = 'Priority budget rebalancing'
    }

    return {
      category: cat,
      label: CATEGORY_DISPLAY[cat]?.label || cat,
      icon: CATEGORY_DISPLAY[cat]?.icon || '💰',
      currentAllocation: currentAlloc,
      recommendedIncrease: increase,
      newAllocation: newAlloc,
      reason,
      priorityScore: Math.round(destinationScores[cat]),
    }
  })

  // Add Reserve destination
  if (reserveAmount > 0) {
    destinations.push({
      category: 'reserve',
      label: 'Reserve',
      icon: '🛡️',
      currentAllocation: 0,
      recommendedIncrease: reserveAmount,
      newAllocation: reserveAmount,
      reason: `Adaptive safety buffer for the remaining ${daysRemaining} days of the month`,
      priorityScore: 80,
    })
  }

  // 6. BUILD BEFORE / AFTER ALLOCATIONS
  const beforeAllocations: Record<string, number> = { ...categoryAllocations }
  const afterAllocations: Record<string, number> = { ...categoryAllocations }

  // Deduct from sources
  sources.forEach((s) => {
    afterAllocations[s.category] = Math.max(0, (categoryAllocations[s.category] || 0) - s.safeAmount)
  })

  // Add to destinations
  destinations.forEach((d) => {
    if (d.category === 'reserve') {
      afterAllocations.reserve = (afterAllocations.reserve || 0) + d.recommendedIncrease
    } else {
      afterAllocations[d.category] = (afterAllocations[d.category] || 0) + d.recommendedIncrease
    }
  })

  // 7. BUILD SUMMARY HEADLINE & RECOMMENDATION LIST
  let summaryHeadline = ''
  if (sources.length === 1) {
    summaryHeadline = `You have ₹${sources[0].unused.toLocaleString()} unused in ${sources[0].label}.`
  } else {
    const names = sources.map((s) => s.label).join(' & ')
    summaryHeadline = `You have ₹${totalUnused.toLocaleString()} unused across ${names}.`
  }

  const recommendationList = destinations.map((d) => ({
    category: d.category,
    label: d.label,
    icon: d.icon,
    amount: d.recommendedIncrease,
  }))

  // 8. GENERATE DETAILED REASONING FROM REAL DATA
  const sourcesSummary = sources
    .map((s) => `${s.label} has ₹${s.unused.toLocaleString()} unused (allocated ₹${s.allocated.toLocaleString()}, spent ₹${s.spent.toLocaleString()})`)
    .join(', ')

  const workoutContext = isHighIntensity
    ? `Your sensor data detected high-intensity workout activity today, increasing recovery and hydration demands.`
    : `Your ${GOAL_LABELS[profile.goal]} goal requires steady nutritional and recovery allocation.`

  const hydrationContext = hasHydrationDeficit
    ? `Today's hydration intake (${hydrationToday}ml) is below target, warranting proactive hydration support.`
    : `Hydration tracking is steady at ${hydrationToday}ml.`

  const spendingPressure = `Reallocating underutilized funds protects active categories from budget strain.`
  const reserveExplanation = `₹${reserveAmount.toLocaleString()} is intentionally kept as Reserve to maintain a safety cushion for future unexpected needs.`

  const destinationItemsSummary = destinations
    .map((d) => `${d.label} (+₹${d.recommendedIncrease.toLocaleString()})`)
    .join(', ')

  const fullExplanation = `${sourcesSummary}. SmartWear recommends moving ₹${totalSafeToReallocate.toLocaleString()} to ${destinationItemsSummary} while keeping your total ₹${monthlyBudget.toLocaleString()} monthly budget unchanged.`

  // Calculate Match Score
  const matchScore = Math.min(98, 85 + (isHighIntensity ? 5 : 0) + (sources.length > 0 ? 5 : 0) + (hasHydrationDeficit ? 4 : 0))

  return {
    status: 'available',
    totalUnused,
    totalSafeToReallocate,
    sources,
    destinations,
    reserveAmount,
    reallocatedAmount: totalSafeToReallocate,
    summaryHeadline,
    recommendationList,
    detailedReasoning: {
      sourcesSummary,
      workoutContext,
      hydrationContext,
      spendingPressure,
      reserveExplanation,
      fullExplanation,
    },
    beforeAllocations,
    afterAllocations,
    matchScore,
    smartReallocationEnabled,
    timestamp: new Date().toISOString(),
  }
}

// ═══════════════════════════════════════════════════════════
// 3. BUDGET VALIDATION & AUDIT PERSISTENCE
// ═══════════════════════════════════════════════════════════

/**
 * Validates that after-optimization allocations strictly equal the monthly budget.
 * Invariant: Total category allocations + reserve MUST equal monthly budget (100%).
 */
export function validateBudgetAllocationBalance(
  allocations: Record<string, number>,
  monthlyBudget: number
): { valid: boolean; totalAmount: number; error: string | null } {
  const sum = Object.entries(allocations).reduce((acc, [key, val]) => {
    // Exclude internal metadata fields starting with '_'
    if (key.startsWith('_')) return acc
    return acc + (Number(val) || 0)
  }, 0)

  if (sum !== monthlyBudget) {
    return {
      valid: false,
      totalAmount: sum,
      error: `Optimization could not be applied because the budget totals do not balance (₹${sum.toLocaleString()} vs ₹${monthlyBudget.toLocaleString()}).`,
    }
  }

  return {
    valid: true,
    totalAmount: sum,
    error: null,
  }
}

/**
 * Persists optimization audit trail to Supabase / local storage.
 */
export async function persistOptimizationAudit(
  userId: string | undefined,
  audit: ReallocationAuditLog
): Promise<boolean> {
  try {
    const auditRecord = {
      ...audit,
      id: audit.id || `audit_${Date.now()}`,
      timestamp: audit.timestamp || new Date().toISOString(),
    }

    // 1. Store in local storage history for instant client retrieval
    try {
      const existingLogs = JSON.parse(localStorage.getItem('smartwear_optimization_audit') || '[]')
      existingLogs.unshift(auditRecord)
      localStorage.setItem('smartwear_optimization_audit', JSON.stringify(existingLogs.slice(0, 50)))
    } catch {
      // LocalStorage fallback ignored
    }

    // 2. If Supabase user exists, write an alert/audit notification
    if (userId) {
      await supabase.from('alerts').insert({
        user_id: userId,
        category: 'Budget',
        severity: 'low',
        message: `Smart Budget Optimization applied: ${audit.reason}`,
        read: false,
        timestamp: new Date().toISOString(),
      })
    }

    return true
  } catch (err) {
    console.error('Error persisting optimization audit:', err)
    return false
  }
}

// ═══════════════════════════════════════════════════════════
// 4. HELPER DESCRIPTIONS & SCORE CALCULATIONS
// ═══════════════════════════════════════════════════════════

function calculateScore(
  profile: OptimizationInput['profile'],
  metrics: ReturnType<typeof calculateBudgetMetrics>,
  sensorContext: OptimizationInput['sensorContext'],
  hydrationToday: number,
  recommendations: OptimizationRecommendation[]
): OptimizationResult['scoreBreakdown'] {
  const goalWeights = GOAL_CATEGORY_WEIGHTS[profile.goal] || GOAL_CATEGORY_WEIGHTS.general
  const topGoalCategory = (Object.entries(goalWeights) as [CategoryKey, number][])
    .sort(([, a], [, b]) => b - a)[0][0]
  const topRec = recommendations[0]
  const goalFit = topRec && topRec.category === topGoalCategory ? 95 : 80

  const hasDietType = !!profile.dietType
  const hasFoodStyle = !!profile.foodStyle
  const hasPreferredFoods = (profile.preferredFoods?.length || 0) > 0
  const foodPreferenceFit = hasDietType && hasFoodStyle && hasPreferredFoods ? 92 : (hasDietType ? 75 : 60)

  const utilizationRate = metrics.totalSpent / metrics.monthlyBudget
  const budgetFit = utilizationRate < 0.3 ? 95 : (utilizationRate < 0.7 ? 88 : 75)

  const activityRelevance = sensorContext
    ? (sensorContext.heartRate > 100 ? 92 : 82)
    : 70

  const hydrationTarget = 2500
  const hydrationRatio = Math.min(1, hydrationToday / hydrationTarget)
  const nutritionFit = hydrationRatio > 0.6 ? 90 : (hydrationRatio > 0.3 ? 78 : 65)

  return {
    goalFit,
    foodPreferenceFit,
    budgetFit,
    activityRelevance,
    nutritionFit,
  }
}

function buildFoodDescription(profile: OptimizationInput['profile']): string {
  const parts: string[] = []
  if (profile.goal === 'gym' || profile.goal === 'strength' || profile.goal === 'athlete') {
    parts.push('High-protein')
  } else if (profile.goal === 'weight') {
    parts.push('Calorie-conscious')
  } else {
    parts.push('Balanced nutrition')
  }

  if (profile.foodStyle) {
    const styleMap: Record<string, string> = {
      'south-indian': 'South Indian',
      'north-indian': 'North Indian',
      'continental': 'Continental',
      'mixed': 'Mixed cuisine',
    }
    parts.push(styleMap[profile.foodStyle] || profile.foodStyle)
  }

  if (profile.dietType) {
    parts.push(profile.dietType.charAt(0).toUpperCase() + profile.dietType.slice(1))
  }

  parts.push('meals')
  return parts.join(' · ')
}

function buildHydrationDescription(hydrationToday: number, isHighActivity: boolean): string {
  if (isHighActivity) {
    return 'Electrolyte & fluid replenishment for high-intensity activity'
  }
  if (hydrationToday < 1500) {
    return 'Hydration support — below daily target'
  }
  return 'Electrolyte & hydration support'
}

function buildSupplementsDescription(profile: OptimizationInput['profile']): string {
  if (profile.goal === 'gym' || profile.goal === 'strength') {
    return 'Protein & recovery supplements for muscle growth'
  }
  if (profile.goal === 'endurance' || profile.goal === 'athlete') {
    return 'Performance & endurance supplementation'
  }
  return 'Daily vitamin & mineral supplementation'
}

function buildRecoveryDescription(profile: OptimizationInput['profile'], isHighActivity: boolean): string {
  if (isHighActivity) {
    return 'Post-workout recovery & cool-down support'
  }
  if (profile.goal === 'athlete' || profile.goal === 'endurance') {
    return 'Active recovery & muscle repair'
  }
  return 'Recovery & wellness support'
}

function buildReasoning(
  profile: OptimizationInput['profile'],
  metrics: ReturnType<typeof calculateBudgetMetrics>,
  sensorContext: OptimizationInput['sensorContext'],
  isHighActivity: boolean
): OptimizationReasoning {
  const goalLabel = GOAL_LABELS[profile.goal] || profile.goal

  const activitySummary = sensorContext
    ? (isHighActivity ? 'High-intensity workout detected' : 'Moderate activity level')
    : `${profile.activityLevel || 'Active'} activity level`

  const foodParts: string[] = []
  if (profile.foodStyle) {
    const styleMap: Record<string, string> = {
      'south-indian': 'South Indian',
      'north-indian': 'North Indian',
      'continental': 'Continental',
      'mixed': 'Mixed',
    }
    foodParts.push(styleMap[profile.foodStyle] || profile.foodStyle)
  }
  if (profile.dietType) {
    foodParts.push(profile.dietType.charAt(0).toUpperCase() + profile.dietType.slice(1))
  }
  const foodPreference = foodParts.join(' · ') || 'Not specified'
  const budgetSummary = `₹${metrics.remainingBudget.toLocaleString()} remaining of ₹${metrics.monthlyBudget.toLocaleString()}`

  const spentEntries = Object.entries(metrics.categorySpent) as [string, number][]
  const topSpending = spentEntries.sort(([, a], [, b]) => b - a)[0]
  const topSpendingLabel = CATEGORY_DISPLAY[topSpending[0] as CategoryKey]?.label || topSpending[0]
  const spendingSummary = metrics.totalSpent > 0
    ? `Higher ${topSpendingLabel.toLowerCase()} spending (₹${topSpending[1].toLocaleString()})`
    : 'No spending recorded yet'

  const priorityCategories: string[] = []
  const goalWeights = GOAL_CATEGORY_WEIGHTS[profile.goal] || GOAL_CATEGORY_WEIGHTS.general
  const sorted = (Object.entries(goalWeights) as [CategoryKey, number][]).sort(([, a], [, b]) => b - a)
  priorityCategories.push(CATEGORY_DISPLAY[sorted[0][0]].label.toLowerCase())
  priorityCategories.push(CATEGORY_DISPLAY[sorted[1][0]].label.toLowerCase())

  const explanation = `SmartWear prioritized ${priorityCategories[0]} and ${priorityCategories[1]} while keeping your remaining budget balanced.`

  return {
    goalLabel,
    activitySummary,
    foodPreference,
    budgetSummary,
    spendingSummary,
    explanation,
  }
}
