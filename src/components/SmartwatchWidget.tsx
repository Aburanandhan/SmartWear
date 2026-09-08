import { useState } from 'react'

type ConnectionState = 'disconnected' | 'demo'

interface ProviderOption {
  id: string
  label: string
  icon: string
}

const PROVIDERS: ProviderOption[] = [
  { id: 'apple', label: 'Apple Health / Apple Watch', icon: '🍎' },
  { id: 'google', label: 'Google Health Connect / Wear OS', icon: '🟢' },
  { id: 'other', label: 'Other', icon: '⌚' },
]

export default function SmartwatchWidget() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected')
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isConnectionOpen, setIsConnectionOpen] = useState(false)
  const [selectedProviderMsg, setSelectedProviderMsg] = useState<string | null>(null)

  const isConnected = connectionState === 'demo'

  const openConnectionModal = () => {
    setIsDetailsOpen(false)
    setSelectedProviderMsg(null)
    setIsConnectionOpen(true)
  }

  const handleSelectProvider = (providerLabel: string) => {
    // Web browsers lack native HealthKit / Health Connect access
    setSelectedProviderMsg(
      `${providerLabel} requires a native mobile bridge. Use Demo Mode for simulated data.`
    )
  }

  const connectDemoMode = () => {
    setConnectionState('demo')
    setIsConnectionOpen(false)
    setIsDetailsOpen(true)
  }

  const disconnect = () => {
    setConnectionState('disconnected')
    setIsDetailsOpen(false)
    setIsConnectionOpen(false)
  }

  return (
    <div
      className="fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6"
      style={{
        bottom: 'max(1rem, env(safe-area-inset-bottom))',
        right: 'max(1rem, env(safe-area-inset-right))',
      }}
    >
      {/* ─── POPOVER / DETAILS MODAL ─── */}
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
                Device Details
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
                  Connected (Demo Mode)
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Device:</span>
                <span className="font-medium text-slate-800">Simulated Smartwatch</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Steps:</span>
                <span className="font-bold text-slate-900">7,842</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Active time:</span>
                <span className="font-bold text-slate-900">46 min</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Active calories:</span>
                <span className="font-bold text-slate-900">320 kcal</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-500">Last synced:</span>
                <span className="text-slate-500">Just now</span>
              </div>

              <div className="rounded-xl p-2.5 text-[11px] leading-relaxed border" style={{ background: '#f0fdfa', borderColor: '#ccfbf1', color: '#0f766e' }}>
                <p className="font-semibold">Source: Demo Smartwatch (Simulated)</p>
                <p className="mt-0.5 text-[10px] opacity-90">Simulated connection. Real health values require native integration.</p>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={openConnectionModal}
                  className="flex-1 rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-slate-50"
                  style={{ borderColor: '#cbd5e1', color: '#334155' }}
                >
                  Manage Connection
                </button>
                <button
                  type="button"
                  onClick={disconnect}
                  className="rounded-xl border px-3 py-2 text-xs font-semibold transition hover:bg-rose-50"
                  style={{ borderColor: '#fecaca', color: '#b91c1c' }}
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
                Connect a smartwatch to sync steps, active minutes, and calories.
              </p>
              <button
                type="button"
                onClick={openConnectionModal}
                className="w-full rounded-xl px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:opacity-95"
                style={{ background: '#0d9488' }}
              >
                Connect Watch
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
                Optional Connection
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

          <div className="mt-3 space-y-2">
            {PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleSelectProvider(provider.label)}
                className="flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition hover:border-teal-300 hover:bg-teal-50/50"
                style={{ borderColor: '#e2e8f0' }}
              >
                <span className="text-lg">{provider.icon}</span>
                <span className="flex-1 text-xs font-semibold" style={{ color: '#334155', fontFamily: 'Inter, sans-serif' }}>
                  {provider.label}
                </span>
                <span className="text-[10px] font-medium" style={{ color: '#0d9488' }}>
                  Select
                </span>
              </button>
            ))}
          </div>

          {selectedProviderMsg && (
            <p className="mt-2 text-[11px] leading-tight text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
              {selectedProviderMsg}
            </p>
          )}

          <div className="mt-3 rounded-xl border p-3" style={{ borderColor: '#99f6e4', background: '#f0fdfa' }}>
            <div className="flex items-center gap-1.5">
              <span className="text-xs">⚡</span>
              <p className="text-xs font-semibold" style={{ color: '#115e59', fontFamily: 'Sora, sans-serif' }}>
                Demo Mode — simulated connection
              </p>
            </div>
            <p className="mt-1 text-[11px] leading-relaxed" style={{ color: '#0f766e', fontFamily: 'Inter, sans-serif' }}>
              No real integration configured. Enables simulated smartwatch metrics with transparent demo labeling.
            </p>
            <button
              type="button"
              onClick={connectDemoMode}
              className="mt-2.5 w-full rounded-xl px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90 shadow-sm"
              style={{ background: '#0d9488' }}
            >
              Use Demo Mode
            </button>
          </div>
        </div>
      )}

      {/* ─── FLOATING CORNER WIDGET BUTTON ─── */}
      <div
        className="rounded-2xl border bg-white/95 backdrop-blur p-3 shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl"
        style={{ borderColor: '#cbd5e1', minWidth: 175 }}
      >
        {isConnected ? (
          /* CONNECTED STATE */
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
                <span>⌚</span> Watch Connected
              </div>
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Connected" />
            </div>

            <div className="space-y-0.5 text-[11px] font-medium" style={{ color: '#475569', fontFamily: 'Inter, sans-serif' }}>
              <div className="flex items-center gap-1.5">
                <span>👟</span>
                <span>7,842 steps</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span>🏃</span>
                <span>46 min active</span>
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
        ) : (
          /* DEFAULT (NOT CONNECTED) STATE */
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
                openConnectionModal()
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