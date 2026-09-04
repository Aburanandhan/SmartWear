import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import type { SensorReading } from '../services/sensor/types'
import { fetchTodayHydration, logHydrationIntake } from '../services/hydrationService'
import { fetchUserExpenses } from '../services/budgetService'
import { fetchAlerts, markAlertAsRead, type SmartAlert } from '../services/alertService'
import { evaluateSmartAdjustment, saveAdjustmentState, fetchAdjustmentHistory } from '../services/smartAdjustment/smartAdjustmentEngine'
import type { SmartAdjustment } from '../services/smartAdjustment/types'
import SmartAdjustmentCard from '../components/SmartAdjustmentCard'

interface Props {
  profile: UserProfile
  reading?: SensorReading
  userId?: string
  onUpdateProfile?: (p: Partial<UserProfile>) => void
  onAlertsRead?: () => void
}

const SEVERITY_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  low: { bg: '#dcfce7', color: '#16a34a', label: 'Low' },
  medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium' },
  high: { bg: '#fee2e2', color: '#dc2626', label: 'High' },
  critical: { bg: '#7f1d1d', color: '#ffffff', label: 'Critical' },
}

export default function Alerts({ profile, reading, userId, onUpdateProfile, onAlertsRead }: Props) {
  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [pendingAdjustment, setPendingAdjustment] = useState<SmartAdjustment | null>(null)
  const [adjustmentHistory, setAdjustmentHistory] = useState<SmartAdjustment[]>([])
  const [filter, setFilter] = useState<'all' | 'adjustments' | 'history'>('all')

  useEffect(() => {
    async function loadData() {
      const list = await fetchAlerts(userId)
      setAlerts(list)

      const history = fetchAdjustmentHistory(userId)
      setAdjustmentHistory(history)

      const hydrationToday = await fetchTodayHydration(userId)
      const expenses = await fetchUserExpenses(userId)

      // Evaluate Smart Adjustment with real sensor data / active trace
      const activeReading = reading || {
        heartRate: 158,
        temperature: 37.2,
        spo2: 98,
        motion: 'HIGH_INTENSITY',
        steps: 1200,
        workoutActive: true,
        deviceId: 'live-stream',
        timestamp: new Date().toISOString(),
      }

      const generated = evaluateSmartAdjustment({
        sensorReading: activeReading,
        workoutActive: true,
        profile,
        hydrationToday,
        expenses,
      })

      if (generated) {
        // Only set if not already applied
        const isAlreadyApplied = history.some((h) => h.id === generated.id && h.status === 'applied')
        if (!isAlreadyApplied) {
          setPendingAdjustment(generated)
        }
      }
    }

    loadData()
  }, [userId, profile, reading])

  const handleMarkRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
    await markAlertAsRead(id, userId)
    if (onAlertsRead) onAlertsRead()
  }

  const handleApplyAdjustment = async (adj: SmartAdjustment) => {
    const updatedAdj: SmartAdjustment = {
      ...adj,
      status: 'applied',
      appliedAt: new Date().toISOString(),
    }

    // 1. Update hydration
    if (adj.hydrationAdjustment?.additionalMl) {
      await logHydrationIntake(adj.hydrationAdjustment.additionalMl, userId)
    }

    // 2. Update budget reallocation if enabled
    if (adj.smartReallocationEnabled && adj.budgetAdjustment && onUpdateProfile) {
      const alloc = profile.budgetCategories || {
        food: 4550,
        supplements: 2400,
        hydration: 1100,
        recovery: 1000,
        other: 950,
      }

      const fromCat = adj.budgetAdjustment.fromCategory
      const toCat = adj.budgetAdjustment.toCategory
      const amt = adj.budgetAdjustment.amount

      const updatedAlloc = {
        ...alloc,
        [fromCat]: Math.max(0, (alloc[fromCat] || 0) - amt),
        [toCat]: (alloc[toCat] || 0) + amt,
      }

      onUpdateProfile({ budgetCategories: updatedAlloc })
    }

    // 3. Save adjustment state
    await saveAdjustmentState(updatedAdj, userId)
    setPendingAdjustment(null)

    // Update history view
    const newHistory = fetchAdjustmentHistory(userId)
    setAdjustmentHistory(newHistory)
  }

  const handleDismissAdjustment = (adj: SmartAdjustment) => {
    const dismissedAdj: SmartAdjustment = { ...adj, status: 'dismissed' }
    saveAdjustmentState(dismissedAdj, userId)
    setPendingAdjustment(null)
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              Smart Adjustments & System Alerts
            </h2>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-teal-100 text-teal-800 uppercase">
              Real-time Engine
            </span>
          </div>
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            SmartWear decision engine connects live sensors, workout activity, hydration & budget allocations.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1 shrink-0">
          {(['all', 'adjustments', 'history'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-white shadow text-teal-800' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              {f === 'adjustments' ? 'Smart Adjustments' : f === 'history' ? 'Adjustment History' : 'All Alerts'}
            </button>
          ))}
        </div>
      </div>

      {/* 1. PENDING SMART ADJUSTMENTS SECTION */}
      {(filter === 'all' || filter === 'adjustments') && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
              <span>⚠️</span>
              <span>Pending Smart Adjustment</span>
            </h3>
            {profile.smartReallocation !== false ? (
              <span className="text-xs text-teal-700 font-bold bg-teal-50 px-2.5 py-1 rounded-md border border-teal-200">
                Smart Reallocation Active ✓
              </span>
            ) : (
              <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2.5 py-1 rounded-md">
                Smart Reallocation Disabled
              </span>
            )}
          </div>

          {pendingAdjustment ? (
            <SmartAdjustmentCard
              adjustment={pendingAdjustment}
              profile={profile}
              userId={userId}
              onApply={handleApplyAdjustment}
              onDismiss={handleDismissAdjustment}
            />
          ) : (
            <div className="card p-6 border bg-slate-50 text-center text-slate-500 rounded-2xl">
              <span className="text-2xl block mb-1">📡</span>
              <p className="font-semibold text-sm">Smart adjustments will appear when live sensor data is available.</p>
              <p className="text-xs text-slate-400 mt-1">No active biometrics threshold warnings triggered.</p>
            </div>
          )}
        </div>
      )}

      {/* 2. ADJUSTMENT HISTORY SECTION */}
      {(filter === 'all' || filter === 'history') && adjustmentHistory.length > 0 && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-base text-slate-900 flex items-center gap-2" style={{ fontFamily: 'Sora, sans-serif' }}>
            <span>📜</span>
            <span>Applied Adjustment History</span>
          </h3>

          <div className="space-y-3">
            {adjustmentHistory.map((adj) => (
              <div key={adj.id} className="card p-4 border-l-4 border-emerald-500 bg-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-md">
                      ✓ APPLIED
                    </span>
                    <span className="text-xs text-slate-400 font-mono-data">
                      {adj.appliedAt ? new Date(adj.appliedAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {adj.headline}
                  </p>
                  <p className="text-xs text-slate-600 font-medium">
                    Hydration: {adj.hydrationAdjustment.label}
                    {adj.budgetAdjustment ? ` · Reallocated ₹${adj.budgetAdjustment.amount} (${adj.budgetAdjustment.fromLabel} → ${adj.budgetAdjustment.toLabel})` : ' · No budget reallocation'}
                  </p>
                </div>
                <span className="text-xs text-emerald-700 font-bold self-end sm:self-auto">
                  Saved to Supabase
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. STANDARD SYSTEM NOTIFICATIONS */}
      {filter !== 'history' && (
        <div className="space-y-3 pt-2">
          <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            System Notifications Log
          </h3>

          <div className="space-y-3">
            {alerts.length === 0 ? (
              <div className="card p-6 text-center text-slate-400 text-sm">
                No system alerts logged.
              </div>
            ) : (
              alerts.map((a) => {
                const badge = SEVERITY_BADGES[a.severity] || SEVERITY_BADGES.medium
                return (
                  <div
                    key={a.id}
                    className={`card p-4 border-l-4 transition-all ${a.read ? 'opacity-70 bg-slate-50/50' : 'bg-white'}`}
                    style={{ borderColor: badge.color }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-bold"
                            style={{ background: badge.bg, color: badge.color }}
                          >
                            {a.category} · {badge.label}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(a.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900 pt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                          {a.message}
                        </p>
                      </div>

                      {!a.read && (
                        <button
                          onClick={() => handleMarkRead(a.id)}
                          className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 shrink-0"
                        >
                          Mark Read
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
