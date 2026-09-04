import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import { GOAL_LABELS } from '../App'
import type { DashView } from '../screens/Dashboard'
import { fetchTodayHydration, logHydrationIntake } from '../services/hydrationService'
import { fetchUserExpenses, type ExpenseItem } from '../services/budgetService'
import { evaluateSmartAdjustment, saveAdjustmentState } from '../services/smartAdjustment/smartAdjustmentEngine'
import type { SmartAdjustment } from '../services/smartAdjustment/types'
import SmartAdjustmentCard from '../components/SmartAdjustmentCard'
import { optimizeFitnessBudget } from '../services/budgetOptimization/budgetOptimizationEngine'
import type { OptimizationResult } from '../services/budgetOptimization/types'
import { MIN_OPTIMIZE_AMOUNT } from '../services/budgetOptimization/rules'

interface Props {
  profile: UserProfile
  userId?: string
  onNavigate: (view: DashView) => void
  onUpdateProfile?: (p: Partial<UserProfile>) => void
}

export default function DashboardHome({ profile, userId, onNavigate, onUpdateProfile }: Props) {
  const [hydrationToday, setHydrationToday] = useState(1650)
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [optimizationAppliedToast, setOptimizationAppliedToast] = useState(false)

  // Optimization state
  const [isOptimizeResultOpen, setIsOptimizeResultOpen] = useState(false)
  const [optimizeResult, setOptimizeResult] = useState<OptimizationResult | null>(null)
  const [isOptimizing, setIsOptimizing] = useState(false)

  useEffect(() => {
    async function loadData() {
      const todayHydration = await fetchTodayHydration(userId)
      setHydrationToday(todayHydration)
      const userExpenses = await fetchUserExpenses(userId)
      setExpenses(userExpenses)
    }
    loadData()
  }, [userId])

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

  // Evaluate Smart Adjustment safely at top-level
  const pendingAdjustment = profile ? evaluateSmartAdjustment({
    sensorReading: {
      heartRate: 158,
      temperature: 37.2,
      spo2: 98,
      motion: 'HIGH_INTENSITY',
      steps: 1200,
      workoutActive: true,
      deviceId: 'live-stream',
      timestamp: new Date().toISOString(),
    },
    workoutActive: true,
    profile,
    hydrationToday,
    expenses,
  }) : null

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
  }

  // ── OPTIMIZE MY ₹X ──
  const canOptimize = remainingBudget >= MIN_OPTIMIZE_AMOUNT

  const handleOptimize = () => {
    setIsOptimizing(true)

    // Simulate brief analysis time for premium feel
    setTimeout(() => {
      const result = optimizeFitnessBudget({
        profile,
        expenses,
        hydrationToday,
        sensorContext: pendingAdjustment ? pendingAdjustment.sensorContext : null,
      })

      setOptimizeResult(result)
      setIsOptimizing(false)
      setIsOptimizeResultOpen(true)
    }, 600)
  }

  const handleApplyOptimization = () => {
    if (!optimizeResult || !onUpdateProfile) return

    // Check Smart Reallocation is enabled
    if (!optimizeResult.smartReallocationEnabled) return

    // Build new category allocations from changes
    const newAllocations = { ...categoryAllocations }
    optimizeResult.categoryChanges.forEach((change) => {
      newAllocations[change.category] = change.after
    })

    onUpdateProfile({
      budgetCategories: newAllocations,
    })

    setIsOptimizeResultOpen(false)
    setOptimizationAppliedToast(true)
    setTimeout(() => setOptimizationAppliedToast(false), 4500)
  }

  const handleEnableSmartReallocation = () => {
    if (onUpdateProfile) {
      onUpdateProfile({ smartReallocation: true })
    }
    setIsOptimizeResultOpen(false)
    // Re-trigger optimization with smart reallocation enabled
    setTimeout(() => handleOptimize(), 300)
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
      {/* Toast notification on successful optimization */}
      {optimizationAppliedToast && (
        <div className="p-4 rounded-xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-between shadow-lg fade-in">
          <span>✨ Smart optimization applied! Your fitness budget has been updated.</span>
          <button onClick={() => setOptimizationAppliedToast(false)} className="text-white hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* 1. TOP OF DASHBOARD - Time-Adaptive Greeting & Actual Goal */}
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

      {/* 2. TODAY'S FITNESS STATUS */}
      <div className="card p-5 border bg-white rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 flex items-center justify-center text-2xl shrink-0">
            🟢
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                Today's fitness status
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                Ready to Train
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
              Based on your current activity and available wellness data.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 self-end sm:self-auto">
          <button
            onClick={() => onNavigate('live')}
            className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-teal-50 px-3 py-2 rounded-xl border border-teal-200 transition-all"
          >
            Live Monitoring →
          </button>
        </div>
      </div>

      {/* PENDING SMART ADJUSTMENT CARD */}
      {pendingAdjustment && (
        <SmartAdjustmentCard
          adjustment={pendingAdjustment}
          profile={profile}
          userId={userId}
          onApply={handleApplyDashboardAdjustment}
        />
      )}

      {/* 3. TODAY'S PLAN */}
      <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <div>
            <h3 className="font-extrabold text-lg text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span>🎯</span>
              <span>TODAY'S PLAN</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Personalized action recommendations tailored to your {GOAL_LABELS[profile.goal] || profile.goal} goal.
            </p>
          </div>
        </div>

        {/* 3 Compact Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* WORKOUT CARD */}
          <div className="p-4 rounded-xl border bg-slate-50/70 hover:bg-slate-50 transition-all border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-data">WORKOUT</span>
              <span className="text-base">🏃</span>
            </div>
            <p className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {plan.workout}
            </p>
            <p className="text-xs text-slate-500 font-semibold font-mono-data">
              {plan.workoutTime}
            </p>
          </div>

          {/* NUTRITION CARD */}
          <div className="p-4 rounded-xl border bg-slate-50/70 hover:bg-slate-50 transition-all border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-data">NUTRITION</span>
              <span className="text-base">🥗</span>
            </div>
            <p className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {plan.nutrition}
            </p>
            <p className="text-xs text-teal-700 font-semibold">
              Goal aligned
            </p>
          </div>

          {/* HYDRATION CARD */}
          <div className="p-4 rounded-xl border bg-slate-50/70 hover:bg-slate-50 transition-all border-slate-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono-data">HYDRATION</span>
              <span className="text-base">💧</span>
            </div>
            <p className="font-bold text-base text-slate-900 font-mono-data">
              {plan.hydrationTarget}
            </p>
            <div className="flex items-center justify-between text-xs text-sky-700 font-semibold">
              <span>{hydrationToday.toLocaleString()} ml logged</span>
              <button
                onClick={() => handleAddWater(250)}
                className="px-2 py-0.5 rounded bg-sky-100 hover:bg-sky-200 text-sky-800 font-bold cursor-pointer"
              >
                +250ml
              </button>
            </div>
          </div>
        </div>

        {/* PRIMARY CTA BUTTON */}
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
          {/* Decorative accent bar */}
          <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316, #f59e0b)' }} />

          <div className="p-6 space-y-4">
            {/* Title row */}
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
                    SmartWear Killer Feature
                  </p>
                </div>
              </div>

            </div>

            {/* Description */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-slate-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                Have ₹{remainingBudget.toLocaleString()} to spend?
              </p>
              <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                SmartWear will decide how to use it based on your <span className="font-semibold text-slate-800">goal</span> + <span className="font-semibold text-slate-800">today's performance</span> + <span className="font-semibold text-slate-800">food preferences</span> + <span className="font-semibold text-slate-800">remaining budget</span> + <span className="font-semibold text-slate-800">recent spending</span>.
              </p>
            </div>

            {/* CTA */}
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
            💰 No optimization available
          </p>
          <p className="text-xs text-slate-400">
            Your remaining budget is below ₹{MIN_OPTIMIZE_AMOUNT}. Add to your budget or wait for the next cycle.
          </p>
        </div>
      )}

      {/* 5. YOUR FITNESS MONEY & 6. CATEGORY BREAKDOWN */}
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
            className="text-xs font-bold text-teal-700 hover:underline self-start sm:self-auto"
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

        {/* 6. CATEGORY BREAKDOWN */}
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
      {/* TODAY'S PLAN EXECUTION MODAL                                */}
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
                  <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">STEP 2 · NUTRITION</span>
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
                  <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">STEP 3 · HYDRATION</span>
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
      {/* FULL-SCREEN OPTIMIZATION RESULT MODAL                       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {isOptimizeResultOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm fade-in" style={{ overflowY: 'auto' }}>
          <div className="w-full max-w-xl bg-white rounded-2xl relative border shadow-2xl overflow-hidden slide-up" style={{ borderColor: '#e2e8f0', maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header gradient bar */}
            <div className="h-1.5" style={{ background: 'linear-gradient(90deg, #f59e0b, #f97316, #ef4444, #f59e0b)' }} />

            <button
              onClick={() => setIsOptimizeResultOpen(false)}
              className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-sm cursor-pointer transition-all"
            >
              ✕
            </button>

            <div className="p-6 space-y-6">
              {/* Smart Reallocation OFF state */}
              {optimizeResult && !optimizeResult.smartReallocationEnabled ? (
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-100 flex items-center justify-center text-3xl">
                    ⚠️
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                      Smart Reallocation is currently OFF
                    </h3>
                    <p className="text-sm text-slate-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      You can still preview how SmartWear would optimize your available budget.
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <button
                      onClick={handleEnableSmartReallocation}
                      className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all cursor-pointer"
                      style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}
                    >
                      Enable Smart Reallocation
                    </button>
                    <button
                      onClick={() => setIsOptimizeResultOpen(false)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Close
                    </button>
                  </div>
                </div>
              ) : !optimizeResult ? (
                /* No result / insufficient data state */
                <div className="space-y-5 text-center py-4">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-100 flex items-center justify-center text-3xl">
                    📊
                  </div>
                  <div>
                    <h3 className="font-bold text-xl text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                      Not enough data to optimize
                    </h3>
                    <p className="text-sm text-slate-500 mt-2" style={{ fontFamily: 'Inter, sans-serif' }}>
                      SmartWear needs more information before it can optimize your budget.
                    </p>
                  </div>
                  <div className="space-y-2 text-left bg-slate-50 rounded-xl p-4">
                    {!profile.dietType && (
                      <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                        <span>⚠️</span> Complete your food preferences
                      </p>
                    )}
                    {expenses.length === 0 && (
                      <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                        <span>⚠️</span> Record today's activity
                      </p>
                    )}
                    {!profile.monthlyBudget && (
                      <p className="text-sm text-amber-700 font-medium flex items-center gap-2">
                        <span>⚠️</span> Add your current budget
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setIsOptimizeResultOpen(false)}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              ) : (
                /* ── Full Optimization Result ── */
                <>
                  {/* Header */}
                  <div>
                    <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase tracking-wide">
                      ✨ Smart Optimization
                    </span>
                    <h3 className="font-extrabold text-xl text-slate-900 mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                      Here's how SmartWear recommends using ₹{optimizeResult.availableAmount.toLocaleString()} today.
                    </h3>
                  </div>

                  {/* YOUR INPUT */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Your Input</span>
                      <span className="text-lg font-extrabold text-slate-900 font-mono-data">₹{optimizeResult.availableAmount.toLocaleString()}</span>
                    </div>
                    <div className="text-xs text-slate-500 space-y-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <p>✓ Your goal: {optimizeResult.reasoning.goalLabel}</p>
                      <p>✓ Today's performance: {optimizeResult.reasoning.activitySummary}</p>
                      <p>✓ Food preferences: {optimizeResult.reasoning.foodPreference}</p>
                      <p>✓ Budget: {optimizeResult.reasoning.budgetSummary}</p>
                      <p>✓ Spending: {optimizeResult.reasoning.spendingSummary}</p>
                    </div>
                  </div>

                  {/* SMARTWEAR'S RECOMMENDATION */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">SmartWear's recommendation</p>
                    {optimizeResult.recommendations.map((rec) => (
                      <div key={rec.category} className="p-4 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 hover:bg-slate-50/50 transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-xl">{rec.icon}</span>
                          <div>
                            <p className="font-bold text-sm text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{rec.label}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{rec.description}</p>
                          </div>
                        </div>
                        <span className="font-extrabold text-base text-slate-900 font-mono-data shrink-0">
                          ₹{rec.amount.toLocaleString()}
                        </span>
                      </div>
                    ))}
                    <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-slate-900 text-white">
                      <span className="text-xs font-bold uppercase tracking-wider">Total</span>
                      <span className="font-extrabold text-lg font-mono-data text-teal-400">₹{optimizeResult.availableAmount.toLocaleString()}</span>
                    </div>
                  </div>

                  {/* RECOMMENDATION SCORE */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-emerald-200 bg-emerald-50/60">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center shrink-0" style={{ background: 'conic-gradient(#0d9488 0% ' + optimizeResult.score + '%, #e2e8f0 ' + optimizeResult.score + '% 100%)' }}>
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                        <span className="font-extrabold text-sm text-teal-700 font-mono-data">{optimizeResult.score}%</span>
                      </div>
                    </div>
                    <div>
                      <p className="font-bold text-sm text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>SmartWear Match</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Goal {optimizeResult.scoreBreakdown.goalFit}% · Food {optimizeResult.scoreBreakdown.foodPreferenceFit}% · Budget {optimizeResult.scoreBreakdown.budgetFit}% · Activity {optimizeResult.scoreBreakdown.activityRelevance}%
                      </p>
                    </div>
                  </div>

                  {/* WHY SMARTWEAR CHOSE THIS */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Why SmartWear chose this</p>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 font-semibold block">Goal</span>
                        <span className="text-slate-800 font-bold">{optimizeResult.reasoning.goalLabel}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Today's performance</span>
                        <span className="text-slate-800 font-bold">{optimizeResult.reasoning.activitySummary}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Food preference</span>
                        <span className="text-slate-800 font-bold">{optimizeResult.reasoning.foodPreference}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block">Recent spending</span>
                        <span className="text-slate-800 font-bold">{optimizeResult.reasoning.spendingSummary}</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic border-t border-slate-200 pt-2">
                      {optimizeResult.reasoning.explanation}
                    </p>
                  </div>

                  {/* BEFORE / AFTER */}
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Before → After Smart Optimization</p>
                    <div className="rounded-xl border border-slate-200 overflow-hidden">
                      {/* Table header */}
                      <div className="grid grid-cols-4 text-xs font-bold text-slate-400 uppercase tracking-wider px-4 py-2 bg-slate-50 border-b border-slate-200">
                        <span>Category</span>
                        <span className="text-center">Before</span>
                        <span className="text-center">After</span>
                        <span className="text-right">Change</span>
                      </div>
                      {optimizeResult.categoryChanges.map((change) => (
                        <div key={change.category} className="grid grid-cols-4 text-sm items-center px-4 py-2.5 border-b border-slate-100 last:border-b-0">
                          <span className="text-slate-800 font-semibold flex items-center gap-1.5">
                            <span className="text-sm">{change.icon}</span>
                            <span className="text-xs">{change.label}</span>
                          </span>
                          <span className="text-center font-mono-data text-slate-500 text-xs">₹{change.before.toLocaleString()}</span>
                          <span className="text-center font-mono-data text-slate-900 font-bold text-xs">₹{change.after.toLocaleString()}</span>
                          <span className={`text-right font-mono-data text-xs font-bold ${change.delta > 0 ? 'text-emerald-600' : change.delta < 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                            {change.delta > 0 ? `+₹${change.delta.toLocaleString()}` : change.delta === 0 ? '—' : `-₹${Math.abs(change.delta).toLocaleString()}`}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* PRIMARY ACTION */}
                  <div className="space-y-2 pt-1">
                    <button
                      onClick={handleApplyOptimization}
                      className="w-full py-3.5 rounded-xl text-sm font-extrabold text-white transition-all cursor-pointer shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                      style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)', fontFamily: 'Sora, sans-serif' }}
                    >
                      <span>✨</span>
                      <span>APPLY SMART OPTIMIZATION</span>
                    </button>
                    <button
                      onClick={() => setIsOptimizeResultOpen(false)}
                      className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
                    >
                      Keep Current Budget
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
