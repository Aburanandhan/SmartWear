import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import { GOAL_LABELS } from '../App'
import type { DashView } from '../screens/Dashboard'
import { evaluateWellnessStatus } from '../lib/wellness-engine'
import { rankMealRecommendations } from '../lib/recommendation-engine'
import { fetchTodayHydration, logHydrationIntake } from '../services/hydrationService'
import { fetchAlerts, type SmartAlert } from '../services/alertService'
import { fetchUserExpenses } from '../services/budgetService'

interface Props {
  profile: UserProfile
  userId?: string
  onNavigate: (view: DashView) => void
}

export default function DashboardHome({ profile, userId, onNavigate }: Props) {
  const [hydrationToday, setHydrationToday] = useState(1650)
  const [recentAlerts, setRecentAlerts] = useState<SmartAlert[]>([])
  const [foodSpent, setFoodSpent] = useState(0)

  // Derive a summarized wellness status from profile + hydration (no live biometrics)
  const summaryReading = {
    heartRate: 72,
    temperature: 36.6,
    spo2: 98,
    motion: 'REST' as const,
    steps: 0,
    workoutActive: false,
    deviceId: 'summary',
    timestamp: new Date().toISOString(),
  }
  const wellness = evaluateWellnessStatus(summaryReading, hydrationToday)
  const recommendations = rankMealRecommendations(profile, summaryReading).slice(0, 3)

  useEffect(() => {
    async function loadData() {
      const todayHydration = await fetchTodayHydration(userId)
      setHydrationToday(todayHydration)
      const alerts = await fetchAlerts(userId)
      setRecentAlerts(alerts.slice(0, 2))
      const expenses = await fetchUserExpenses(userId)
      const spent = expenses
        .filter((e) => e.category === 'food')
        .reduce((acc, curr) => acc + curr.amount, 0)
      setFoodSpent(spent)
    }
    loadData()
  }, [userId])

  const handleAddWater = async (amountMl: number) => {
    const updated = hydrationToday + amountMl
    setHydrationToday(updated)
    await logHydrationIntake(amountMl, userId)
  }

  // Calculate high level summaries from profile + real expenses
  const foodBudget = profile.budgetCategories?.food || 3000
  const foodRemaining = Math.max(0, foodBudget - foodSpent)

  return (
    <div className="space-y-6">
      {/* Wellness & Overview Banner */}
      <div
        className="rounded-2xl p-6 relative overflow-hidden text-white"
        style={{ background: 'linear-gradient(135deg, #0f766e 0%, #0d9488 50%, #0284c7 100%)' }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold mb-2" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <span>Wellness Overview · {wellness.status}</span>
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.5rem' }}>
              {wellness.title}
            </h2>
            <p className="text-sm mt-1 max-w-xl" style={{ color: 'rgba(255,255,255,0.85)', fontFamily: 'Inter, sans-serif' }}>
              {wellness.message}
            </p>
          </div>
          <button
            onClick={() => onNavigate('live')}
            className="px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:bg-white/90 shadow-md shrink-0"
            style={{ background: 'white', color: '#0f766e', fontFamily: 'Sora, sans-serif' }}
          >
            Open Live Monitoring →
          </button>
        </div>
      </div>

      {/* High-Level Overview Cards (Summarized, No Live Biometrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Latest Workout Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b', fontFamily: 'Sora, sans-serif' }}>Latest Workout</span>
            <span className="text-xl">⚡</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {profile.primaryExercise || 'Running'}
            </span>
          </div>
          <p className="text-xs mt-2 text-teal-700 font-semibold cursor-pointer hover:underline" onClick={() => onNavigate('live')}>
            Start a new session in Live Monitoring →
          </p>
        </div>

        {/* Fitness Goal */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b', fontFamily: 'Sora, sans-serif' }}>Fitness Goal</span>
            <span className="text-xl">🎯</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-semibold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              {GOAL_LABELS[profile.goal] || profile.goal}
            </span>
          </div>
          <div className="mt-2 text-xs text-slate-500 font-medium flex items-center justify-between">
            <span>Activity: {profile.activityLevel}</span>
            <span className="text-teal-700 font-semibold capitalize">{profile.dietType}</span>
          </div>
        </div>

        {/* Hydration Summary */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b', fontFamily: 'Sora, sans-serif' }}>Hydration Summary</span>
            <span className="text-xl">💧</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-mono-data text-2xl font-bold text-sky-600">{hydrationToday}</span>
            <span className="text-xs text-slate-500 font-medium">/ 2,500 ml</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <div className="h-1.5 flex-1 rounded-full bg-slate-100 overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full" style={{ width: `${Math.min(100, (hydrationToday / 2500) * 100)}%` }} />
            </div>
            <button
              onClick={() => handleAddWater(250)}
              className="text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 transition-all"
            >
              +250ml
            </button>
          </div>
        </div>

        {/* Food Budget Status */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#64748b', fontFamily: 'Sora, sans-serif' }}>Food Budget</span>
            <span className="text-xl">💳</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-mono-data text-2xl font-bold text-teal-700">₹{foodRemaining.toLocaleString()}</span>
            <span className="text-xs text-slate-500 font-medium">left</span>
          </div>
          <p className="text-xs mt-2 text-slate-500">
            Spent ₹{foodSpent.toLocaleString()} of ₹{foodBudget.toLocaleString()} monthly allocation
          </p>
        </div>
      </div>

      {/* Recommendations & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recommendation Engine List */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: '#0f172a' }}>
                Goal-Adaptive Recommendations
              </h3>
              <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                Ranked by goal match, activity state & monthly budget
              </p>
            </div>
            <button
              onClick={() => onNavigate('nutrition')}
              className="text-xs font-semibold text-teal-700 hover:underline"
            >
              View All →
            </button>
          </div>

          <div className="space-y-3">
            {recommendations.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-xl border flex items-center justify-between gap-4 transition-all hover:bg-slate-50"
                style={{ borderColor: '#e2e8f0' }}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
                      {item.name}
                    </span>
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-100 text-teal-800">
                      Score: {item.score}%
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{item.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-mono-data font-bold text-sm text-teal-700">₹{item.estimatedCost}</p>
                  <p className="text-xs text-slate-400">{item.calories} kcal</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Widgets & Recent Alerts */}
        <div className="space-y-4">
          <div className="card p-6">
            <h3 className="font-bold text-base mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => onNavigate('live')} className="p-3.5 rounded-xl border text-left hover:border-teal-500 transition-all bg-slate-50">
                <span className="text-2xl block mb-1">📡</span>
                <span className="text-xs font-semibold block" style={{ fontFamily: 'Sora, sans-serif' }}>Live Monitoring</span>
              </button>
              <button onClick={() => onNavigate('budget')} className="p-3.5 rounded-xl border text-left hover:border-teal-500 transition-all bg-slate-50">
                <span className="text-2xl block mb-1">💸</span>
                <span className="text-xs font-semibold block" style={{ fontFamily: 'Sora, sans-serif' }}>Add Expense</span>
              </button>
              <button onClick={() => onNavigate('insights')} className="p-3.5 rounded-xl border text-left hover:border-teal-500 transition-all bg-slate-50">
                <span className="text-2xl block mb-1">📊</span>
                <span className="text-xs font-semibold block" style={{ fontFamily: 'Sora, sans-serif' }}>Recovery Score</span>
              </button>
              <button onClick={() => onNavigate('alerts')} className="p-3.5 rounded-xl border text-left hover:border-teal-500 transition-all bg-slate-50">
                <span className="text-2xl block mb-1">🔔</span>
                <span className="text-xs font-semibold block" style={{ fontFamily: 'Sora, sans-serif' }}>View Alerts</span>
              </button>
            </div>
          </div>

          {recentAlerts.length > 0 && (
            <div className="card p-5 border-l-4 border-amber-500">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700" style={{ fontFamily: 'Sora, sans-serif' }}>Recent Alert</span>
                <button onClick={() => onNavigate('alerts')} className="text-xs text-slate-400 hover:text-slate-600">All Alerts →</button>
              </div>
              <p className="text-sm font-semibold text-slate-800">{recentAlerts[0].message}</p>
              <p className="text-xs text-slate-400 mt-1">Category: {recentAlerts[0].category} · Severity: {recentAlerts[0].severity}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
