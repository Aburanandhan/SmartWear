import { useState, useEffect } from 'react'
import { fetchAlerts, markAlertAsRead, type SmartAlert } from '../services/alertService'

interface Props {
  userId?: string
  onAlertsRead?: () => void
}

const SEVERITY_BADGES: Record<string, { bg: string; color: string; label: string }> = {
  low: { bg: '#dcfce7', color: '#16a34a', label: 'Low' },
  medium: { bg: '#fef3c7', color: '#d97706', label: 'Medium' },
  high: { bg: '#fee2e2', color: '#dc2626', label: 'High' },
  critical: { bg: '#7f1d1d', color: '#ffffff', label: 'Critical' },
}

export default function Alerts({ userId, onAlertsRead }: Props) {
  const [alerts, setAlerts] = useState<SmartAlert[]>([])
  const [filter, setFilter] = useState<'all' | 'unread' | 'Health' | 'Budget'>('all')

  useEffect(() => {
    async function loadAlerts() {
      const list = await fetchAlerts(userId)
      setAlerts(list)
    }
    loadAlerts()
  }, [userId])

  const handleMarkRead = async (id: string) => {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, read: true } : a)))
    await markAlertAsRead(id, userId)
    if (onAlertsRead) onAlertsRead()
  }

  const filteredAlerts = alerts.filter((a) => {
    if (filter === 'unread') return !a.read
    if (filter === 'Health') return a.category === 'Health'
    if (filter === 'Budget') return a.category === 'Budget'
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            System Alerts & Notifications
          </h2>
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            Automated alerts for health biometric thresholds, hydration & budget warning limits
          </p>
        </div>

        {/* Filter buttons */}
        <div className="bg-slate-100 p-1 rounded-xl flex items-center gap-1">
          {(['all', 'unread', 'Health', 'Budget'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f ? 'bg-white shadow text-teal-800' : 'text-slate-600 hover:text-slate-900'
              }`}
              style={{ fontFamily: 'Sora, sans-serif' }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Alerts list */}
      <div className="space-y-3">
        {filteredAlerts.length === 0 ? (
          <div className="card p-8 text-center text-slate-400">
            No notifications found under this filter.
          </div>
        ) : (
          filteredAlerts.map((a) => {
            const badge = SEVERITY_BADGES[a.severity] || SEVERITY_BADGES.medium
            return (
              <div
                key={a.id}
                className={`card p-5 border-l-4 transition-all ${a.read ? 'opacity-70 bg-slate-50/50' : 'bg-white'}`}
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
                    <p className="text-sm font-semibold text-slate-900 pt-1" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {a.message}
                    </p>
                  </div>

                  {!a.read && (
                    <button
                      onClick={() => handleMarkRead(a.id)}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 hover:bg-teal-100 shrink-0"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
