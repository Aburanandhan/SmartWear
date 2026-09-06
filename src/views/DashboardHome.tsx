import { useState, useEffect, useMemo } from 'react'
import type { UserProfile } from '../App'
import { GOAL_LABELS } from '../App'
import type { DashView } from '../screens/Dashboard'
import { fetchTodayHydration, logHydrationIntake } from '../services/hydrationService'
import { fetchUserExpenses, type ExpenseItem } from '../services/budgetService'
import { saveUserProfile } from '../services/profileService'
import { evaluateSmartAdjustment, saveAdjustmentState } from '../services/smartAdjustment/smartAdjustmentEngine'
import type { SmartAdjustment } from '../services/smartAdjustment/types'
import SmartAdjustmentCard from '../components/SmartAdjustmentCard'
import {
  optimizeFitnessBudget,
  evaluateBudgetReallocation,
  validateBudgetAllocationBalance,
  persistOptimizationAudit,
} from '../services/budgetOptimization/budgetOptimizationEngine'
import type { OptimizationResult } from '../services/budgetOptimization/types'
import { MIN_OPTIMIZE_AMOUNT } from '../services/budgetOptimization/rules'

interface Props {
  profile: UserProfile
  userId?: string
  sensorReading?: any
  onNavigate: (view: DashView) => void
  onUpdateProfile?: (p: Partial<UserProfile>) => void
}

export default function DashboardHome({
  profile,
  userId,
  sensorReading,
  onNavigate,
  onUpdateProfile,
}: Props) {
  const [hydrationToday, setHydrationToday] = useState(1650)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // 1. "Optimize My ₹X" State
  const [isOptimizeResultOpen, setIsOptimizeResultOpen] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<OptimizationResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  // 2. Dynamic Budget Reallocation State
  const [isReallocationReviewOpen, setIsReallocationReviewOpen] = useState(false)
  const [isApplyingReallocation, setIsApplyingReallocation] = useState(false)

  useEffect(() => {
    async function loadData() {
      const todayHydration = await fetchTodayHydration(userId)
      setHydrationToday(todayHydration)
      const userExpenses = await fetchUserExpenses(userId)
      setExpenses(userExpenses)
    }
    loadData()
  }, [userId])

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 5000)
  }

  const handleAddWater = async (amountMl: number) => {
    const updated = hydrationToday + amountMl
    setHydrationToday(updated)
    await logHydrationIntake(amountMl, userId)
  }

  // Time-of-day adaptive greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning 👋'
    if (hour < 17) return 'Good afternoon 👋'
    return 'Good evening 👋'
  }

  // Real budget calculations
  const monthlyBudget = profile.monthlyBudget || 10000
  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0)
  const remainingBudget = Math.max(0, monthlyBudget - totalSpent)

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const daysLeft = Math.max(1, daysInMonth - now.getDate() + 1)

  // Category breakdown calculation from real categories & expenses
  const categoryAllocations = profile.budgetCategories || {
    food: 4550,
    supplements: 2400,
    hydration: 1100,
    recovery: 1000,
    other: 950,
  }

  const categorySpentMap: Record<string, number> = {
    food: 0,
    supplements: 0,
    hydration: 0,
    recovery: 0,
    other: 0,
  }

  expenses.forEach((e) => {
    if (categorySpentMap[e.category] !== undefined) {
      categorySpentMap[e.category] += Number(e.amount) || 0
    }
  })

  const categoryRemaining = {
    food: Math.max(0, (categoryAllocations.food || 0) - categorySpentMap.food),
    supplements: Math.max(0, (categoryAllocations.supplements || 0) - categorySpentMap.supplements),
    hydration: Math.max(0, (categoryAllocations.hydration || 0) - categorySpentMap.hydration),
    recovery: Math.max(0, (categoryAllocations.recovery || 0) - categorySpentMap.recovery),
    other: Math.max(0, (categoryAllocations.other || 0) - categorySpentMap.other),
    reserve: Math.max(0, categoryAllocations.reserve || 0),
  }

  // Dynamic plan recommendations based on profile goal
  const getPlanDetails = () => {
    const goal = profile.goal
    if (goal === 'gym' || goal === 'strength') {
      return {
        workout: `${profile.primaryExercise || 'Upper Body'} · Moderate`,
        workoutTime: '45 min',
        nutrition: `Protein-focused · ${profile.foodStyle || 'South Indian'} meals`,
        hydrationTarget: '2.5 L target',
      }
    }
    if (goal === 'athlete' || goal === 'endurance') {
      return {
        workout: `${profile.primaryExercise || 'Interval Running'} · High Intensity`,
        workoutTime: '50 min',
        nutrition: `Carb & Electrolyte Support · ${profile.dietType || 'Vegetarian'}`,
        hydrationTarget: '3.0 L target',
      }
    }
    return {
      workout: `${profile.primaryExercise || 'Mobility & Cardio'} · Moderate`,
      workoutTime: '35 min',
      nutrition: `Calorie-Conscious · ${profile.dietType || 'Vegetarian'}`,
      hydrationTarget: '2.5 L target',
    }
  }

  const plan = getPlanDetails()

  // Evaluate Smart Adjustment safely with live sensor reading
  const pendingAdjustment = useMemo(() => {
    if (!profile) return null
    return evaluateSmartAdjustment({
      sensorReading: sensorReading || {
        heartRate: 158,
        temperature: 37.2,
        spo2: 98,
        motion: 'HIGH_INTENSITY',
        steps: 1200,
        workoutActive: true,
        deviceId: 'live-stream',
        timestamp: new Date().toISOString(),
      },
      workoutActive: sensorReading?.workoutActive ?? true,
      profile,
      hydrationToday,
      expenses,
    })
  }, [profile, sensorReading, hydrationToday, expenses])

  const handleApplyDashboardAdjustment = async (appliedAdj: SmartAdjustment) => {
    const updatedAdj: SmartAdjustment = { ...appliedAdj, status: 'applied', appliedAt: new Date().toISOString() }
    if (appliedAdj.hydrationAdjustment?.additionalMl) {
      await handleAddWater(appliedAdj.hydrationAdjustment.additionalMl)
    }
    if (appliedAdj.smartReallocationEnabled && appliedAdj.budgetAdjustment && onUpdateProfile && profile) {
      const alloc = profile.budgetCategories || { food: 4550, supplements: 2400, hydration: 1100, recovery: 1000, other: 950 }
      const fromCat = appliedAdj.budgetAdjustment.fromCategory
      const toCat = appliedAdj.budgetAdjustment.toCategory
      const amt = appliedAdj.budgetAdjustment.amount
      onUpdateProfile({
        budgetCategories: {
          ...alloc,
          [fromCat]: Math.max(0, (alloc[fromCat] || 0) - amt),
          [toCat]: (alloc[toCat] || 0) + amt,
        },
      })
    }
    await saveAdjustmentState(updatedAdj, userId)
    showToast('Smart Adjustment applied successfully!')
  }

  // ═══════════════════════════════════════════════════════════
  // 1. "OPTIMIZE MY ₹X" HANDLERS
  // ═══════════════════════════════════════════════════════════
  const canOptimize = remainingBudget >= MIN_OPTIMIZE_AMOUNT

  const handleOptimize = () => {
    setIsOptimizing(true)
    setTimeout(() => {
      const result = optimizeFitnessBudget({
        profile,
        expenses,
        hydrationToday,
        sensorContext: sensorReading || (pendingAdjustment ? pendingAdjustment.sensorContext : null),
      })
      setOptimizeResult(result)
      setIsOptimizing(false)
      setIsOptimizeResultOpen(true)
    }, 450)
  }

  const handleApplySpendingOptimization = () => {
    if (!optimizeResult || !onUpdateProfile) return
    if (!optimizeResult.smartReallocationEnabled) return

    const newAllocations = { ...categoryAllocations }
    optimizeResult.categoryChanges.forEach((change) => {
      newAllocations[change.category] = change.after
    })

    onUpdateProfile({
      budgetCategories: newAllocations,
    })

    setIsOptimizeResultOpen(false)
    showToast('✨ Smart optimization applied! Your fitness budget has been updated.')
  }

  // ═══════════════════════════════════════════════════════════
  // 2. DYNAMIC BUDGET REALLOCATION ENGINE EVALUATION
  // ═══════════════════════════════════════════════════════════
  const reallocationOpportunity = useMemo(() => {
    return evaluateBudgetReallocation({
      profile,
      expenses,
      hydrationToday,
      sensorContext: sensorReading ? {
        heartRate: sensorReading.heartRate,
        temperature: sensorReading.temperature,
        spo2: sensorReading.spo2,
        motion: sensorReading.motion,
      } : (pendingAdjustment ? pendingAdjustment.sensorContext : null),
    })
  }, [profile, expenses, hydrationToday, sensorReading, pendingAdjustment])

  const handleApplyReallocation = async () => {
    if (!reallocationOpportunity || reallocationOpportunity.status !== 'available') return

    setIsApplyingReallocation(true)

    // Validate budget balance
    const validation = validateBudgetAllocationBalance(reallocationOpportunity.afterAllocations, monthlyBudget)
    if (!validation.valid) {
      alert(validation.error || 'Optimization cannot be applied due to allocation imbalance.')
      setIsApplyingReallocation(false)
      return
    }

    // Build updated budget categories
    const updatedCategories: any = {
      food: reallocationOpportunity.afterAllocations.food || 0,
      supplements: reallocationOpportunity.afterAllocations.supplements || 0,
      hydration: reallocationOpportunity.afterAllocations.hydration || 0,
      recovery: reallocationOpportunity.afterAllocations.recovery || 0,
      other: reallocationOpportunity.afterAllocations.other || 0,
    }
    if (reallocationOpportunity.afterAllocations.reserve !== undefined) {
      updatedCategories.reserve = reallocationOpportunity.afterAllocations.reserve
    }

    // Update local React state
    if (onUpdateProfile) {
      onUpdateProfile({
        budgetCategories: updatedCategories,
      })
    }

    // Persist to Supabase if userId available
    if (userId) {
      await saveUserProfile(userId, {
        ...profile,
        budgetCategories: updatedCategories,
      })
    }

    // Persist audit log
    await persistOptimizationAudit(userId, {
      userId,
      sourceReductions: reallocationOpportunity.sources.reduce((acc, s) => ({ ...acc, [s.category]: s.safeAmount }), {}),
      destinationIncreases: reallocationOpportunity.destinations.reduce((acc, d) => ({ ...acc, [d.category]: d.recommendedIncrease }), {}),
      reserveAmount: reallocationOpportunity.reserveAmount,
      totalReallocated: reallocationOpportunity.reallocatedAmount,
      reason: reallocationOpportunity.detailedReasoning.fullExplanation,
      timestamp: new Date().toISOString(),
      status: 'applied',
    })

    setIsApplyingReallocation(false)
    setIsReallocationReviewOpen(false)
    showToast('✨ Dynamic Smart Budget Reallocation applied! Your monthly budget remains perfectly balanced.')
  }

  const handleEnableSmartReallocationToggle = async () => {
    if (onUpdateProfile) {
      onUpdateProfile({ smartReallocation: true })
    }
    if (userId) {
      await saveUserProfile(userId, { ...profile, smartReallocation: true })
    }
    showToast('Smart Reallocation has been enabled.')
  }

  if (!profile) {
    return (
      <div className="card p-8 text-center text-slate-500">
        <p className="font-bold text-base">Loading your fitness plan...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-between shadow-lg fade-in">
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-white hover:text-emerald-200 cursor-pointer">✕</button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 1. TOP OF DASHBOARD - Time-Adaptive Greeting & Goal        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/80">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            {getGreeting()}
          </h2>
          <p className="text-sm font-semibold text-slate-600 mt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
            Your goal: <span className="text-teal-700 font-bold">{GOAL_LABELS[profile.goal] || profile.goal}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-100 text-teal-800" style={{ fontFamily: 'Inter, sans-serif' }}>
            {profile.activityLevel} activity
          </span>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-slate-100 text-slate-700 capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>
            {profile.dietType}
          </span>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 2. TODAY'S FITNESS STATUS & RECOVERY                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Fitness Readiness */}
        <div className="card p-5 border shadow-xs bg-white rounded-2xl flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#ecfdf5', color: '#059669' }}>
              🟢
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                Today's fitness status
              </p>
              <h3 className="font-extrabold text-xl text-slate-900 mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Ready to Train
              </h3>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-800 font-mono-data">
            Optimal
          </span>
        </div>

        {/* Recovery Score */}
        <div className="card p-5 border shadow-xs bg-white rounded-2xl flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              ⚡
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
                Body Battery & Recovery
              </p>
              <h3 className="font-extrabold text-xl text-slate-900 mt-0.5 font-mono-data" style={{ fontFamily: 'Sora, sans-serif' }}>
                82% Recovered
              </h3>
            </div>
          </div>
          <div className="w-16 bg-slate-100 h-2.5 rounded-full overflow-hidden">
            <div className="bg-emerald-500 h-full rounded-full" style={{ width: '82%' }}></div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* PENDING SMART ADJUSTMENT ALERT CARD (IF ACTIVE)             */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {pendingAdjustment && (
        <div className="fade-in">
          <SmartAdjustmentCard
            adjustment={pendingAdjustment}
            profile={profile}
            userId={userId}
            onApply={handleApplyDashboardAdjustment}
            onDismiss={() => {}}
          />
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 3. TODAY'S PLAN HERO CARD                                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div
        className="card p-6 border shadow-md bg-white rounded-2xl space-y-6 relative overflow-hidden"
        style={{ borderColor: '#0d9488', background: 'linear-gradient(180deg, #ffffff 0%, #f0fdfa 100%)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-4 border-teal-100">
          <div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 uppercase tracking-wide" style={{ fontFamily: 'Inter, sans-serif' }}>
              Personalized for You
            </span>
            <h2 className="text-2xl font-extrabold text-slate-900 mt-2 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span>📋</span>
              <span>Today's Plan</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            Engineered to achieve your <strong className="text-teal-900">{GOAL_LABELS[profile.goal]}</strong> goal
          </p>
        </div>

        {/* 3 Key Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Workout Pillar */}
          <div className="p-4 rounded-xl border bg-white border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 font-mono-data">
              <span>WORKOUT</span>
              <span>⏱️ {plan.workoutTime}</span>
            </div>
            <p className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Sora, sans-serif' }}>
              {plan.workout}
            </p>
            <p className="text-xs text-slate-500">
              Primary exercise: {profile.primaryExercise || 'Running'}
            </p>
          </div>

          {/* Training Plan Pillar */}
          <button
            type="button"
            onClick={() => onNavigate('training-session')}
            className="p-4 rounded-xl border bg-white border-slate-200/80 shadow-xs space-y-2 text-left transition-all hover:border-teal-300 hover:shadow-sm cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 font-mono-data">
              <span>TRAINING PLAN</span>
              <span>🧭 {profile.primaryExercise || 'Fitness'}</span>
            </div>
            <p className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Sora, sans-serif' }}>
              Personalized training plan
            </p>
            <p className="text-xs text-slate-500">
              Based on your {GOAL_LABELS[profile.goal] || profile.goal} goal · View plan →
            </p>
          </button>

          {/* Nutrition Pillar */}
          <div className="p-4 rounded-xl border bg-white border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 font-mono-data">
              <span>NUTRITION</span>
              <span>🥗 {profile.dietType}</span>
            </div>
            <p className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Sora, sans-serif' }}>
              {plan.nutrition}
            </p>
            <p className="text-xs text-slate-500">
              Style: {profile.foodStyle || 'South Indian'}
            </p>
          </div>

          {/* Hydration Pillar */}
          <div className="p-4 rounded-xl border bg-white border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 font-mono-data">
              <span>HYDRATION</span>
              <span>💧 {hydrationToday} / 2500 ml</span>
            </div>
            <p className="font-bold text-slate-900 text-base" style={{ fontFamily: 'Sora, sans-serif' }}>
              {plan.hydrationTarget}
            </p>
            <div className="flex items-center justify-between pt-1">
              <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full transition-all"
                  style={{ width: `${Math.min(100, (hydrationToday / 2500) * 100)}%` }}
                />
              </div>
              <button
                onClick={() => handleAddWater(250)}
                className="px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold cursor-pointer text-xs"
              >
                +250ml
              </button>
            </div>
          </div>
        </div>

        {/* Start Today's Plan CTA */}
        <button
          onClick={() => setIsPlanModalOpen(true)}
          className="w-full py-4 rounded-xl font-extrabold text-base text-white transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', fontFamily: 'Sora, sans-serif' }}
        >
          <span>START TODAY'S PLAN</span>
          <span>→</span>
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 4. 💰 OPTIMIZE MY ₹X — HERO FEATURE CARD                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {canOptimize ? (
        <div
          className="relative overflow-hidden rounded-2xl border-2 shadow-lg transition-all hover:shadow-xl"
          style={{
            borderColor: '#f59e0b',
            background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 30%, #fff7ed 100%)',
          }}
        >
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316, #f59e0b)' }} />

          <div className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg, #f59e0b, #f97316)', boxShadow: '0 4px 12px rgba(245, 158, 11, 0.35)' }}>
                  💰
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Optimize My ₹{remainingBudget.toLocaleString()}
                  </h3>
                  <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Goal-driven Spending Allocator
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                Have ₹{remainingBudget.toLocaleString()} to spend?
              </p>
              <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                SmartWear will decide how to use it based on your <span className="font-semibold text-slate-800">goal</span> + <span className="font-semibold text-slate-800">today's performance</span> + <span className="font-semibold text-slate-800">food preferences</span> + <span className="font-semibold text-slate-800">remaining budget</span> + <span className="font-semibold text-slate-800">recent spending</span>.
              </p>
            </div>

            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="w-full py-3.5 rounded-xl font-extrabold text-sm text-slate-950 transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              {isOptimizing ? (
                <>
                  <span className="inline-block w-4 h-4 border-2 border-slate-900/30 border-t-slate-900 rounded-full animate-spin" />
                  <span>Analyzing...</span>
                </>
              ) : (
                <>
                  <span>🔥 OPTIMIZE ₹{remainingBudget.toLocaleString()}</span>
                  <span>→</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="card p-5 border rounded-2xl bg-slate-50 text-center space-y-2" style={{ borderColor: '#e2e8f0' }}>
          <p className="text-sm font-semibold text-slate-500" style={{ fontFamily: 'Sora, sans-serif' }}>
            💰 No spending optimization available
          </p>
          <p className="text-xs text-slate-400">
            Your remaining budget is below ₹{MIN_OPTIMIZE_AMOUNT}. Add to your budget or wait for the next cycle.
          </p>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 5. 💡 DYNAMIC BUDGET REALLOCATION HERO CARD (CORE USP)      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {reallocationOpportunity.status === 'available' ? (
        <div
          className="relative overflow-hidden rounded-2xl border-2 shadow-lg transition-all hover:shadow-xl fade-in"
          style={{
            borderColor: '#0d9488',
            background: 'linear-gradient(135deg, #f0fdfa 0%, #ccfbf1 40%, #ffffff 100%)',
          }}
        >
          {/* Decorative accent top line */}
          <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: 'linear-gradient(90deg, #0d9488, #14b8a6, #06b6d4)' }} />

          <div className="p-6 space-y-5">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-white"
                  style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)', boxShadow: '0 4px 12px rgba(13, 148, 136, 0.3)' }}
                >
                  💡
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                    <span>Budget Optimization</span>
                  </h3>
                  <p className="text-xs text-slate-500 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Smart Adaptive Reallocation
                  </p>
                </div>
              </div>

              <span className="text-xs font-bold px-3 py-1 rounded-full bg-teal-600 text-white uppercase tracking-wider shadow-xs" style={{ fontFamily: 'Inter, sans-serif' }}>
                ✨ Dynamic Opportunity
              </span>
            </div>

            {/* Unused Opportunity Highlight */}
            <div className="p-4 rounded-xl bg-white/90 border border-teal-200/80 shadow-xs space-y-1">
              <p className="text-base font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                "{reallocationOpportunity.summaryHeadline}"
              </p>
              <p className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                SmartWear detected underutilized funds with {daysLeft} days remaining. Safely redistribute to high-priority categories.
              </p>
            </div>

            {/* Recommended Reallocation List */}
            <div className="space-y-2.5">
              <p className="text-xs font-bold uppercase tracking-wider text-teal-900 flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                <span>⚡</span>
                <span>Recommended Reallocation</span>
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {reallocationOpportunity.recommendationList.map((rec) => (
                  <div
                    key={rec.category}
                    className="p-3 rounded-xl border bg-white border-teal-100 shadow-xs flex flex-col justify-between"
                  >
                    <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
                      <span>{rec.icon}</span>
                      <span>{rec.label}</span>
                    </div>
                    <span className="text-base font-black text-emerald-700 font-mono-data mt-1">
                      +₹{rec.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => setIsReallocationReviewOpen(true)}
              className="w-full py-4 rounded-xl font-extrabold text-sm text-white transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
              style={{
                background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                fontFamily: 'Sora, sans-serif',
              }}
            >
              <span>🔍 REVIEW OPTIMIZATION</span>
              <span>→</span>
            </button>
          </div>
        </div>
      ) : reallocationOpportunity.status === 'disabled' ? (
        <div className="card p-5 border rounded-2xl bg-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <span className="text-2xl">💡</span>
            <div>
              <p className="text-sm font-bold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>
                Budget Optimization
              </p>
              <p className="text-xs text-slate-500">
                Smart Reallocation is currently disabled in your budget settings.
              </p>
            </div>
          </div>
          <button
            onClick={handleEnableSmartReallocationToggle}
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shrink-0 cursor-pointer"
          >
            Enable Smart Reallocation
          </button>
        </div>
      ) : reallocationOpportunity.status === 'low_data' ? (
        <div className="card p-5 border rounded-2xl bg-slate-50 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>
              Budget Optimization
            </p>
            <p className="text-xs text-slate-500">
              SmartWear needs more spending data before recommending a reallocation.
            </p>
          </div>
        </div>
      ) : (
        <div className="card p-5 border rounded-2xl bg-slate-50 flex items-center gap-3" style={{ borderColor: '#e2e8f0' }}>
          <span className="text-2xl">💡</span>
          <div>
            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: 'Sora, sans-serif' }}>
              Budget Optimization
            </p>
            <p className="text-xs text-slate-500">
              Your current budget allocation is already balanced across all fitness categories.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* 6. YOUR FITNESS MONEY & CATEGORY BREAKDOWN                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-3 border-slate-100">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span>💰</span>
              <span>YOUR FITNESS MONEY</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time budget status based on actual recorded expenses.
            </p>
          </div>
          <button
            onClick={() => onNavigate('budget')}
            className="text-xs font-bold text-teal-700 hover:underline self-start sm:self-auto cursor-pointer"
          >
            Manage Budget →
          </button>
        </div>

        {/* Remaining Money Summary Callout */}
        <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono-data">Remaining Budget</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-3xl font-extrabold text-teal-400 font-mono-data">
                ₹{remainingBudget.toLocaleString()}
              </span>
              <span className="text-slate-400 text-xs font-mono-data">
                remaining of ₹{monthlyBudget.toLocaleString()}
              </span>
            </div>
          </div>
          <div className="sm:text-right">
            <span className="text-xs text-slate-400 font-semibold uppercase block">Budget Cycle</span>
            <span className="text-lg font-bold text-white font-mono-data">{daysLeft} days left</span>
          </div>
        </div>

        {/* Category Breakdown */}
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3" style={{ fontFamily: 'Inter, sans-serif' }}>
            Category Remaining Balance
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">🥗 Food</span>
              <span className="font-mono-data text-base font-bold text-slate-900 mt-1 block">
                ₹{categoryRemaining.food.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">💧 Hydration</span>
              <span className="font-mono-data text-base font-bold text-slate-900 mt-1 block">
                ₹{categoryRemaining.hydration.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">🧘 Recovery</span>
              <span className="font-mono-data text-base font-bold text-slate-900 mt-1 block">
                ₹{categoryRemaining.recovery.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">💊 Supplements</span>
              <span className="font-mono-data text-base font-bold text-slate-900 mt-1 block">
                ₹{categoryRemaining.supplements.toLocaleString()}
              </span>
            </div>
            <div className="p-3 rounded-xl border bg-slate-50 border-slate-200">
              <span className="text-xs text-slate-500 font-medium block">🏋️ Gear</span>
              <span className="font-mono-data text-base font-bold text-slate-900 mt-1 block">
                ₹{categoryRemaining.other.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: TODAY'S PLAN EXECUTION MODAL                         */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs fade-in">
          <div className="w-full max-w-lg bg-white rounded-2xl p-6 relative border shadow-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
                Active Execution Guide
              </span>
              <h3 className="font-bold text-xl text-slate-900 mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                Today's Action Plan
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Targeting: {GOAL_LABELS[profile.goal] || profile.goal} goal
              </p>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">STEP 1 · WORKOUT</span>
                  <p className="font-bold text-sm text-slate-900">{plan.workout}</p>
                </div>
                <button
                  onClick={() => { setIsPlanModalOpen(false); onNavigate('live') }}
                  className="btn-primary text-xs font-bold px-3 py-2 shrink-0 cursor-pointer"
                >
                  Start Workout →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">STEP 2 · TRAINING PLAN</span>
                  <p className="font-bold text-sm text-slate-900">Personalized {profile.primaryExercise || 'fitness'} session</p>
                </div>
                <button
                  onClick={() => { setIsPlanModalOpen(false); onNavigate('training-session') }}
                  className="btn-primary text-xs font-bold px-3 py-2 shrink-0 cursor-pointer"
                >
                  View Plan →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">STEP 3 · NUTRITION</span>
                  <p className="font-bold text-sm text-slate-900">{plan.nutrition}</p>
                </div>
                <button
                  onClick={() => { setIsPlanModalOpen(false); onNavigate('nutrition') }}
                  className="btn-primary text-xs font-bold px-3 py-2 shrink-0 cursor-pointer"
                >
                  View Food →
                </button>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">STEP 4 · HYDRATION</span>
                  <p className="font-bold text-sm text-slate-900">{plan.hydrationTarget}</p>
                </div>
                <button
                  onClick={() => handleAddWater(250)}
                  className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs shrink-0 cursor-pointer"
                >
                  +250ml Water
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: "OPTIMIZE MY ₹X" RESULT MODAL                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isOptimizeResultOpen && optimizeResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in" style={{ overflowY: 'auto' }}>
          <div className="w-full max-w-xl bg-white rounded-2xl relative border shadow-2xl overflow-hidden slide-up" style={{ borderColor: '#e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="p-6 border-b border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl bg-amber-500 text-white shadow-md">
                  💰
                </div>
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Optimization Result: ₹{optimizeResult.availableAmount.toLocaleString()}
                  </h3>
                  <p className="text-xs text-slate-600">
                    SmartWear Allocation Recommendation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOptimizeResultOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Category Recommendations */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Recommended Spending Breakdown
                </h4>
                <div className="space-y-2.5">
                  {optimizeResult.recommendations.map((rec) => (
                    <div key={rec.category} className="p-3.5 rounded-xl border bg-slate-50 border-slate-200 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{rec.icon}</span>
                        <div>
                          <p className="font-bold text-sm text-slate-900">{rec.label}</p>
                          <p className="text-xs text-slate-500">{rec.description}</p>
                        </div>
                      </div>
                      <span className="font-mono-data text-base font-bold text-emerald-700">
                        ₹{rec.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2 border-t border-slate-200">
                <button
                  onClick={handleApplySpendingOptimization}
                  className="flex-1 py-3.5 rounded-xl font-extrabold text-sm text-slate-950 transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2"
                  style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)' }}
                >
                  <span>✓ APPLY SPENDING PLAN</span>
                </button>
                <button
                  onClick={() => setIsOptimizeResultOpen(false)}
                  className="px-5 py-3.5 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MODAL: DYNAMIC BUDGET REALLOCATION REVIEW PANEL (CORE)      */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isReallocationReviewOpen && reallocationOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm fade-in" style={{ overflowY: 'auto' }}>
          <div className="w-full max-w-2xl bg-white rounded-2xl relative border shadow-2xl overflow-hidden slide-up my-6" style={{ borderColor: '#0d9488', maxHeight: '92vh', overflowY: 'auto' }}>
            {/* Modal Header */}
            <div className="p-6 border-b border-teal-200 bg-gradient-to-r from-teal-50 via-teal-100/50 to-emerald-50 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-xl text-white bg-teal-600 shadow-md">
                  💡
                </div>
                <div>
                  <h3 className="font-extrabold text-xl text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                    Smart Budget Optimization Review
                  </h3>
                  <p className="text-xs text-slate-600 font-medium">
                    Continuous category rebalancing without altering your total ₹{monthlyBudget.toLocaleString()} budget
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsReallocationReviewOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-2xl cursor-pointer p-1"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Source Opportunity Callout */}
              <div className="p-4 rounded-xl bg-teal-50 border border-teal-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800">
                    DETECTED UNUSED ALLOCATION
                  </span>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">
                    {reallocationOpportunity.sources.map((s) => `Move ₹${s.safeAmount.toLocaleString()} from ${s.label}`).join(' & ')}
                  </p>
                  <p className="text-xs text-slate-600 mt-1">
                    Based on actual spending of ₹{reallocationOpportunity.sources.reduce((a, s) => a + s.spent, 0).toLocaleString()} and {daysLeft} days remaining.
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-500 font-bold block">Match Fit</span>
                  <span className="text-lg font-black text-teal-700 font-mono-data">
                    {reallocationOpportunity.matchScore}%
                  </span>
                </div>
              </div>

              {/* BEFORE vs AFTER TABLE */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                    Allocation Comparison
                  </h4>
                  <span className="text-xs font-bold text-teal-800 bg-teal-100 px-2 py-0.5 rounded-full">
                    Total Budget: Unchanged (₹{monthlyBudget.toLocaleString()})
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                      <tr>
                        <th className="p-3">Category</th>
                        <th className="p-3 text-right">Current</th>
                        <th className="p-3 text-center">Change</th>
                        <th className="p-3 text-right">After Optimization</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {/* Food */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span>🥗</span>
                          <span>Food</span>
                        </td>
                        <td className="p-3 text-right text-slate-600 font-mono-data">
                          ₹{(categoryAllocations.food || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold font-mono-data text-emerald-600">
                          {reallocationOpportunity.afterAllocations.food > (categoryAllocations.food || 0)
                            ? `+₹${(reallocationOpportunity.afterAllocations.food - (categoryAllocations.food || 0)).toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono-data">
                          ₹{(reallocationOpportunity.afterAllocations.food || 0).toLocaleString()}
                        </td>
                      </tr>

                      {/* Recovery */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span>🧘</span>
                          <span>Recovery</span>
                        </td>
                        <td className="p-3 text-right text-slate-600 font-mono-data">
                          ₹{(categoryAllocations.recovery || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold font-mono-data text-emerald-600">
                          {reallocationOpportunity.afterAllocations.recovery > (categoryAllocations.recovery || 0)
                            ? `+₹${(reallocationOpportunity.afterAllocations.recovery - (categoryAllocations.recovery || 0)).toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono-data">
                          ₹{(reallocationOpportunity.afterAllocations.recovery || 0).toLocaleString()}
                        </td>
                      </tr>

                      {/* Hydration */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span>💧</span>
                          <span>Hydration</span>
                        </td>
                        <td className="p-3 text-right text-slate-600 font-mono-data">
                          ₹{(categoryAllocations.hydration || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold font-mono-data text-emerald-600">
                          {reallocationOpportunity.afterAllocations.hydration > (categoryAllocations.hydration || 0)
                            ? `+₹${(reallocationOpportunity.afterAllocations.hydration - (categoryAllocations.hydration || 0)).toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono-data">
                          ₹{(reallocationOpportunity.afterAllocations.hydration || 0).toLocaleString()}
                        </td>
                      </tr>

                      {/* Supplements */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span>💊</span>
                          <span>Supplements</span>
                        </td>
                        <td className="p-3 text-right text-slate-600 font-mono-data">
                          ₹{(categoryAllocations.supplements || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold font-mono-data text-emerald-600">
                          {reallocationOpportunity.afterAllocations.supplements > (categoryAllocations.supplements || 0)
                            ? `+₹${(reallocationOpportunity.afterAllocations.supplements - (categoryAllocations.supplements || 0)).toLocaleString()}`
                            : reallocationOpportunity.afterAllocations.supplements < (categoryAllocations.supplements || 0)
                              ? `-₹${((categoryAllocations.supplements || 0) - reallocationOpportunity.afterAllocations.supplements).toLocaleString()}`
                              : '—'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono-data">
                          ₹{(reallocationOpportunity.afterAllocations.supplements || 0).toLocaleString()}
                        </td>
                      </tr>

                      {/* Gear / Other */}
                      <tr className="hover:bg-slate-50/50">
                        <td className="p-3 font-semibold text-slate-900 flex items-center gap-2">
                          <span>🏋️</span>
                          <span>Gear</span>
                        </td>
                        <td className="p-3 text-right text-slate-600 font-mono-data">
                          ₹{(categoryAllocations.other || 0).toLocaleString()}
                        </td>
                        <td className="p-3 text-center font-bold font-mono-data text-rose-600">
                          {reallocationOpportunity.afterAllocations.other < (categoryAllocations.other || 0)
                            ? `-₹${((categoryAllocations.other || 0) - reallocationOpportunity.afterAllocations.other).toLocaleString()}`
                            : '—'}
                        </td>
                        <td className="p-3 text-right font-extrabold text-slate-900 font-mono-data">
                          ₹{(reallocationOpportunity.afterAllocations.other || 0).toLocaleString()}
                        </td>
                      </tr>

                      {/* Reserve */}
                      {reallocationOpportunity.reserveAmount > 0 && (
                        <tr className="bg-amber-50/40">
                          <td className="p-3 font-semibold text-amber-900 flex items-center gap-2">
                            <span>🛡️</span>
                            <span>Reserve (Buffer)</span>
                          </td>
                          <td className="p-3 text-right text-slate-600 font-mono-data">
                            ₹{(categoryAllocations.reserve || 0).toLocaleString()}
                          </td>
                          <td className="p-3 text-center font-bold font-mono-data text-amber-700">
                            +₹{reallocationOpportunity.reserveAmount.toLocaleString()}
                          </td>
                          <td className="p-3 text-right font-extrabold text-amber-900 font-mono-data">
                            ₹{(reallocationOpportunity.afterAllocations.reserve || reallocationOpportunity.reserveAmount).toLocaleString()}
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-300">
                      <tr>
                        <td className="p-3">TOTAL MONTHLY BUDGET</td>
                        <td className="p-3 text-right font-mono-data">₹{monthlyBudget.toLocaleString()}</td>
                        <td className="p-3 text-center text-teal-300 font-mono-data">100% Balanced</td>
                        <td className="p-3 text-right font-mono-data text-teal-300">₹{monthlyBudget.toLocaleString()}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Why SmartWear Recommends This */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Why SmartWear Recommends This
                </h4>
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/80 space-y-2.5 text-xs text-slate-700 leading-relaxed">
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <p>
                      <strong>Underutilized Allocation:</strong> {reallocationOpportunity.detailedReasoning.sourcesSummary}.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <p>
                      <strong>Workout & Fitness Demand:</strong> {reallocationOpportunity.detailedReasoning.workoutContext}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-teal-600 font-bold">✓</span>
                    <p>
                      <strong>Hydration Status:</strong> {reallocationOpportunity.detailedReasoning.hydrationContext}
                    </p>
                  </div>
                  {reallocationOpportunity.reserveAmount > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-amber-600 font-bold">🛡️</span>
                      <p>
                        <strong>Adaptive Reserve:</strong> {reallocationOpportunity.detailedReasoning.reserveExplanation}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-slate-200">
                <button
                  onClick={handleApplyReallocation}
                  disabled={isApplyingReallocation}
                  className="flex-1 py-4 rounded-xl font-extrabold text-sm text-white transition-all shadow-md hover:shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60"
                  style={{
                    background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 100%)',
                    fontFamily: 'Sora, sans-serif',
                  }}
                >
                  {isApplyingReallocation ? (
                    <>
                      <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Applying Reallocation...</span>
                    </>
                  ) : (
                    <>
                      <span>✓ APPLY OPTIMIZATION</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => setIsReallocationReviewOpen(false)}
                  className="px-6 py-4 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer"
                >
                  KEEP CURRENT ALLOCATION
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
