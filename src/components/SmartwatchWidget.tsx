import { useEffect, useState } from 'react'
import { smartwatchService } from '../services/smartwatch/smartwatchService'
import type { ConnectionStatus, SmartwatchSyncResult } from '../services/smartwatch/types'

interface SmartwatchWidgetProps {
  userId?: string | null
}

export default function SmartwatchWidget({ userId }: SmartwatchWidgetProps) {
  const [status, setStatus] = useState<ConnectionStatus>('NOT_CONNECTED')
  const [syncData, setSyncData] = useState<SmartwatchSyncResult | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isConnectionOpen, setIsConnectionOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch real smartwatch sync status on mount and when userId changes
  useEffect(() => {
    async function loadStatus() {
      try {
        const currentData = await smartwatchService.getLatestSmartwatchData(userId || undefined)
        setSyncData(currentData)
        setStatus(currentData.connectionStatus)
      } catch (err) {
        setStatus('NOT_CONNECTED')
      }
    }
    loadStatus()
  }, [userId])

  const handleConnect = async () => {
    setLoading(true)
    setErrorMsg(null)
    setStatus('CONNECTING')
    try {
      const res = await smartwatchService.connectHealthConnect(userId || undefined)
      setSyncData(res)
      setStatus(res.connectionStatus)
      if (!res.success && res.error) {
        setErrorMsg(res.error)
      } else {
        setIsConnectionOpen(false)
        setIsDetailsOpen(true)
      }
    } catch (err: any) {
      setStatus('SYNC_ERROR')
      setErrorMsg(err.message || 'Health Connect authorization failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleSyncNow = async () => {
    setLoading(true)
    setErrorMsg(null)
    setStatus('SYNCING')
    try {
      const res = await smartwatchService.syncSmartwatchData(userId || undefined)
      setSyncData(res)
      setStatus(res.connectionStatus)
      if (!res.success && res.error) {
        setErrorMsg(res.error)
      }
    } catch (err: any) {
      setStatus('SYNC_ERROR')
      setErrorMsg(err.message || 'Sync failed.')
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = async () => {
    setLoading(true)
    try {
      await smartwatchService.disconnectSmartwatch(userId || undefined)
      setStatus('NOT_CONNECTED')
      setSyncData(null)
      setIsDetailsOpen(false)
      setIsConnectionOpen(false)
    } catch (err) {
      console.error('Disconnect error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Format relative sync time
  const getRelativeSyncTime = (lastSync: string | null): string => {
    if (!lastSync) return 'Never'
    const syncDate = new Date(lastSync)
    const diffMs = Date.now() - syncDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins === 1) return '1 min ago'
    if (diffMins < 60) return `${diffMins} min ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours === 1) return '1 hour ago'
    if (diffHours < 24) return `${diffHours} hours ago`
    return syncDate.toLocaleDateString()
  }

  const isConnected = status === 'CONNECTED' || status === 'NO_DATA'
  const deviceName = syncData?.deviceName || 'Health Connect'

  return (
    <div
      className="fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6"
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* ─── POPOVER DETAILS MODAL ─── */}
      {isDetailsOpen && (
        <div
          className="absolute right-0 bottom-[calc(100%+12px)] w-[min(20rem,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-2xl transition-all"
          style={{ borderColor: '#dbe7e5' }}
        >
          <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: '#f1f5f9' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#0f766e', fontFamily: 'Inter, sans-serif' }}>
                Smartwatch
              </p>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                Health Connect Sync
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close smartwatch details"
              onClick={() => setIsDetailsOpen(false)}
              className="rounded-lg px-2 py-0.5 text-lg font-medium leading-none transition hover:bg-slate-100"
              style={{ color: '#64748b' }}
            >
              ×
            </button>
          </div>

          {isConnected ? (
            <div className="mt-3 space-y-3 text-xs" style={{ color: '#334155', fontFamily: 'Inter, sans-serif' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Status:</span>
                <span className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Connected 🟢
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Device:</span>
                <span className="font-medium text-slate-800">{deviceName}</span>
              </div>

              <div className="pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Today's Activity</p>

                {/* Steps */}
                {syncData?.steps !== null && syncData?.steps !== undefined ? (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-slate-600">👟 Steps</span>
                    <span className="font-bold text-slate-900">{syncData.steps.toLocaleString()}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 opacity-60">
                    <span className="font-medium text-slate-500">👟 Steps</span>
                    <span className="text-slate-400">—</span>
                  </div>
                )}

                {/* Active Time */}
                {syncData?.activeMinutes !== null && syncData?.activeMinutes !== undefined ? (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-slate-600">🏃 Active time</span>
                    <span className="font-bold text-slate-900">{syncData.activeMinutes} min</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between py-1 opacity-60">
                    <span className="font-medium text-slate-500">🏃 Active time</span>
                    <span className="text-slate-400">—</span>
                  </div>
                )}

                {/* Active Calories */}
                {syncData?.activeCalories !== null && syncData?.activeCalories !== undefined && (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-slate-600">🔥 Active calories</span>
                    <span className="font-bold text-slate-900">{syncData.activeCalories} kcal</span>
                  </div>
                )}

                {/* Heart Rate */}
                {syncData?.heartRateBpm !== null && syncData?.heartRateBpm !== undefined && (
                  <div className="flex items-center justify-between py-1">
                    <span className="font-semibold text-slate-600">❤️ Heart rate</span>
                    <span className="font-bold text-slate-900">{syncData.heartRateBpm} BPM</span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: '#f1f5f9' }}>
                <span className="font-semibold text-slate-500">Last sync:</span>
                <span className="text-slate-600">{getRelativeSyncTime(syncData?.lastSyncedAt || null)}</span>
              </div>

              <div className="rounded-xl p-2.5 text-[11px] leading-relaxed border" style={{ background: '#f0fdfa', borderColor: '#ccfbf1', color: '#0f766e' }}>
                <p className="font-semibold">Source: {deviceName} → Health Connect</p>
                <p className="mt-0.5 text-[10px] opacity-90">Real health data retrieved via Android Health Connect inter-op pipeline.</p>
              </div>

              {errorMsg && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  {errorMsg}
                </p>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSyncNow}
                  className="flex-1 rounded-xl bg-teal-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-700 shadow-sm disabled:opacity-50"
                >
                  {loading ? 'Syncing...' : 'Sync Now'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsDetailsOpen(false)
                    setIsConnectionOpen(true)
                  }}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Manage
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleDisconnect}
                  className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                >
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-3 space-y-3 text-xs" style={{ color: '#475569', fontFamily: 'Inter, sans-serif' }}>
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Status:</span>
                <span className="font-medium text-slate-500">⚪ Not connected</span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Connect your watch companion app via Android Health Connect to read real steps, active time, calories, and heart rate.
              </p>
              {errorMsg && (
                <p className="text-[11px] text-red-600 bg-red-50 border border-red-200 rounded-lg p-2">
                  {errorMsg}
                </p>
              )}
              <button
                type="button"
                disabled={loading}
                onClick={handleConnect}
                className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
                style={{ background: '#0d9488' }}
              >
                {loading ? 'Connecting...' : 'Connect Health Connect'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* ─── CONNECTION FLOW MODAL ─── */}
      {isConnectionOpen && (
        <div
          className="absolute right-0 bottom-[calc(100%+12px)] w-[min(21rem,calc(100vw-2rem))] rounded-2xl border bg-white p-4 shadow-2xl transition-all z-50"
          style={{ borderColor: '#dbe7e5' }}
        >
          <div className="flex items-start justify-between gap-3 border-b pb-2.5" style={{ borderColor: '#f1f5f9' }}>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: '#0f766e', fontFamily: 'Inter, sans-serif' }}>
                Health Integration
              </p>
              <h3 className="text-sm font-bold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                Connect Smartwatch
              </h3>
            </div>
            <button
              type="button"
              aria-label="Close connection dialog"
              onClick={() => setIsConnectionOpen(false)}
              className="rounded-lg px-2 py-0.5 text-lg font-medium leading-none transition hover:bg-slate-100"
              style={{ color: '#64748b' }}
            >
              ×
            </button>
          </div>

          <div className="mt-3 space-y-3">
            <div className="rounded-xl border p-3" style={{ borderColor: '#99f6e4', background: '#f0fdfa' }}>
              <div className="flex items-center gap-2">
                <span className="text-base">🟢</span>
                <p className="text-xs font-bold text-teal-950" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Android Health Connect
                </p>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-teal-800" style={{ fontFamily: 'Inter, sans-serif' }}>
                Integrates with Samsung Galaxy Watch, Wear OS, boAt, Noise, Fire-Boltt, and all watches writing data to Health Connect.
              </p>

              <div className="mt-2.5 space-y-1 text-[10px] text-teal-700">
                <p>✓ Steps permission (READ_STEPS)</p>
                <p>✓ Active Calories (READ_ACTIVE_CALORIES)</p>
                <p>✓ Heart Rate (READ_HEART_RATE)</p>
                <p>✓ Workout sessions (READ_EXERCISE)</p>
              </div>

              <button
                type="button"
                disabled={loading}
                onClick={handleConnect}
                className="mt-3 w-full rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-50"
                style={{ background: '#0d9488' }}
              >
                {loading ? 'Opening Health Connect...' : 'Connect Health Connect'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── FLOATING CORNER WIDGET BUTTON ─── */}
      <div
        className="rounded-2xl border bg-white/95 backdrop-blur p-3 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
        style={{ borderColor: '#cbd5e1', minWidth: 175 }}
      >
        {status === 'CONNECTED' ? (
          /* CONNECTED STATE WITH DATA */
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                <span>⌚</span> Watch Connected
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected 🟢" />
            </div>

            <div className="space-y-0.5 text-[11px] font-medium" style={{ color: '#475569', fontFamily: 'Inter, sans-serif' }}>
              <div className="flex items-center gap-1.5">
                <span>👟</span>
                <span>{syncData?.steps !== null && syncData?.steps !== undefined ? `${syncData.steps.toLocaleString()} steps` : '-- steps'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🏃</span>
                <span>{syncData?.activeMinutes !== null && syncData?.activeMinutes !== undefined ? `${syncData.activeMinutes} min active` : '-- min active'}</span>
              </div>
              <div className="text-[10px] text-slate-400">
                Last sync: {getRelativeSyncTime(syncData?.lastSyncedAt || null)}
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsConnectionOpen(false)
                setIsDetailsOpen((prev) => !prev)
              }}
              className="w-full rounded-lg px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 transition hover:bg-teal-100"
            >
              View
            </button>
          </div>
        ) : status === 'NO_DATA' ? (
          /* CONNECTED BUT NO RECENT DATA */
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                <span>⌚</span> Connected 🟢
              </div>
            </div>
            <p className="text-[11px] text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              No recent smartwatch data available
            </p>
            <button
              type="button"
              onClick={() => {
                setIsConnectionOpen(false)
                setIsDetailsOpen((prev) => !prev)
              }}
              className="w-full rounded-lg px-2 py-1 text-[11px] font-semibold text-teal-800 bg-teal-50 border border-teal-200 transition hover:bg-teal-100"
            >
              View
            </button>
          </div>
        ) : status === 'CONNECTING' || status === 'SYNCING' ? (
          /* CONNECTING / SYNCING STATE */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-800">
              <span>⌚</span> {status === 'CONNECTING' ? 'Connecting...' : 'Syncing...'}
            </div>
            <p className="text-[11px] text-slate-500">Opening Health Connect...</p>
          </div>
        ) : status === 'PERMISSION_REQUIRED' ? (
          /* PERMISSION REQUIRED STATE */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-700">
              <span>⌚</span> Permission Required
            </div>
            <p className="text-[10px] text-amber-800">Allow SmartWear to read health data</p>
            <button
              type="button"
              onClick={handleConnect}
              className="w-full rounded-lg px-2 py-1 text-[11px] font-semibold text-white bg-amber-600 hover:bg-amber-700"
            >
              Grant Permission
            </button>
          </div>
        ) : status === 'SYNC_ERROR' ? (
          /* SYNC ERROR STATE */
          <div className="space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-700">
              <span>⌚</span> Sync Error
            </div>
            <p className="text-[10px] text-rose-600">Could not sync health data</p>
            <button
              type="button"
              onClick={handleSyncNow}
              className="w-full rounded-lg px-2 py-1 text-[11px] font-semibold text-white bg-rose-600 hover:bg-rose-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          /* DEFAULT (NOT CONNECTED / DISCONNECTED) STATE */
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                <span>⌚</span> Connect Watch
              </div>
            </div>

            <p className="text-[11px]" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
              Not connected
            </p>

            <button
              type="button"
              onClick={() => {
                setIsDetailsOpen(false)
                setIsConnectionOpen(true)
              }}
              className="w-full rounded-lg px-2.5 py-1 text-[11px] font-semibold text-white shadow-sm transition hover:opacity-90"
              style={{ background: '#0d9488' }}
            >
              Connect
            </button>
          </div>
        )}
      </div>
    </div>
  )
}