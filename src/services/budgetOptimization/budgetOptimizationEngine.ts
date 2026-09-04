import type { OptimizationInput, OptimizationResult, OptimizationRecommendation, CategoryChange, OptimizationReasoning } from './types'
import type { CategoryKey } from '../../utils/budgetUtils'
import { GOAL_CATEGORY_WEIGHTS, MIN_OPTIMIZE_AMOUNT, CATEGORY_DISPLAY, ACTIVITY_HYDRATION_BOOST, SCORE_WEIGHTS } from './rules'
import { GOAL_LABELS } from '../../App'
import { calculateBudgetMetrics } from '../budgetService'

/**
 * Budget Optimization Engine
 *
 * Analyzes user profile, expenses, hydration, sensor data, and budget allocations
 * to produce a smart budget reallocation recommendation.
 *
 * Uses the project's existing goal/scoring logic and budget calculation infrastructure.
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

  // Calculate category remaining balances
  const categoryRemaining: Record<CategoryKey, number> = {
    food: Math.max(0, (categoryAllocations.food || 0) - metrics.categorySpent.food),
    supplements: Math.max(0, (categoryAllocations.supplements || 0) - metrics.categorySpent.supplements),
    hydration: Math.max(0, (categoryAllocations.hydration || 0) - metrics.categorySpent.hydration),
    recovery: Math.max(0, (categoryAllocations.recovery || 0) - metrics.categorySpent.recovery),
    other: Math.max(0, (categoryAllocations.other || 0) - metrics.categorySpent.other),
  }

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
    // Add/subtract difference to the highest-weighted category
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
  // "Before" = current remaining balance, "After" = remaining + optimization allocation
  // But we show the ALLOCATION changes, not remaining
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
    smartReallocationEnabled: smartReallocationEnabled,
    timestamp: new Date().toISOString(),
  }
}

/**
 * Score calculation using real data — no random values
 */
function calculateScore(
  profile: OptimizationInput['profile'],
  metrics: ReturnType<typeof calculateBudgetMetrics>,
  sensorContext: OptimizationInput['sensorContext'],
  hydrationToday: number,
  recommendations: OptimizationRecommendation[]
): OptimizationResult['scoreBreakdown'] {
  // Goal fit: how well do recommendations align with goal weights
  const goalWeights = GOAL_CATEGORY_WEIGHTS[profile.goal] || GOAL_CATEGORY_WEIGHTS.general
  const topGoalCategory = (Object.entries(goalWeights) as [CategoryKey, number][])
    .sort(([, a], [, b]) => b - a)[0][0]
  const topRec = recommendations[0]
  const goalFit = topRec && topRec.category === topGoalCategory ? 95 : 80

  // Food preference fit: does the user have food preferences set?
  const hasDietType = !!profile.dietType
  const hasFoodStyle = !!profile.foodStyle
  const hasPreferredFoods = (profile.preferredFoods?.length || 0) > 0
  const foodPreferenceFit = hasDietType && hasFoodStyle && hasPreferredFoods ? 92 : (hasDietType ? 75 : 60)

  // Budget fit: how well-distributed is the remaining budget
  const utilizationRate = metrics.totalSpent / metrics.monthlyBudget
  const budgetFit = utilizationRate < 0.3 ? 95 : (utilizationRate < 0.7 ? 88 : 75)

  // Activity relevance: is there real sensor/activity data
  const activityRelevance = sensorContext
    ? (sensorContext.heartRate > 100 ? 92 : 82)
    : 70

  // Nutrition fit: hydration status and food category allocation
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

  // Determine which category has highest actual spending
  const spentEntries = Object.entries(metrics.categorySpent) as [string, number][]
  const topSpending = spentEntries.sort(([, a], [, b]) => b - a)[0]
  const topSpendingLabel = CATEGORY_DISPLAY[topSpending[0] as CategoryKey]?.label || topSpending[0]
  const spendingSummary = metrics.totalSpent > 0
    ? `Higher ${topSpendingLabel.toLowerCase()} spending (₹${topSpending[1].toLocaleString()})`
    : 'No spending recorded yet'

  // Build explanation
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
