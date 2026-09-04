import { useState } from 'react'
import type { SmartAdjustment } from '../services/smartAdjustment/types'
import type { UserProfile } from '../App'

interface Props {
  adjustment: SmartAdjustment
  profile: UserProfile
  userId?: string
  onApply: (adj: SmartAdjustment) => Promise<void> | void
  onDismiss?: (adj: SmartAdjustment) => void
  isApplied?: boolean
}

export default function SmartAdjustmentCard({
  adjustment,
  profile,
  onApply,
  onDismiss,
  isApplied = false,
}: Props) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isApplying, setIsApplying] = useState(false)
  const [appliedSuccess, setAppliedSuccess] = useState(isApplied)

  const handleConfirmApply = async () => {
    setIsApplying(true)
    await onApply(adjustment)
    setIsApplying(false)
    setIsPreviewOpen(false)
    setAppliedSuccess(true)
  }

  if (appliedSuccess || adjustment.status === 'applied') {
    return (
      <div className="card p-5 border-l-4 border-emerald-500 bg-emerald-50/60 rounded-2xl flex items-center justify-between gap-4 fade-in">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg">
            ✓
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-900 font-mono-data">
                SMART ADJUSTMENT APPLIED
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">
                {adjustment.appliedAt ? new Date(adjustment.appliedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Recently'}
              </span>
            </div>
            <p className="text-sm font-bold text-emerald-950 mt-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
              {adjustment.headline}
            </p>
            <p className="text-xs text-emerald-800 mt-1 font-medium">
              Hydration: {adjustment.hydrationAdjustment.label}
              {adjustment.budgetAdjustment && ` · Budget: ${adjustment.budgetAdjustment.label}`}
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="card p-6 border-2 border-amber-400 bg-gradient-to-br from-white via-amber-50/30 to-teal-50/20 rounded-2xl space-y-4 shadow-md fade-in relative">
      {/* Alert Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-amber-200">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500 text-slate-950 text-xs font-extrabold tracking-wider uppercase mb-1">
            <span>⚠️ SMART ADJUSTMENT</span>
          </div>
          <p className="text-base font-bold text-slate-900 leading-snug mt-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            "{adjustment.headline}"
          </p>
        </div>
        {onDismiss && (
          <button
            onClick={() => onDismiss(adjustment)}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold p-1 cursor-pointer"
            title="Dismiss adjustment"
          >
            ✕
          </button>
        )}
      </div>

      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 font-mono-data">
        SmartWear recommends:
      </p>

      {/* 3 Compact Sections */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Workout */}
        <div className="p-3.5 rounded-xl border bg-white border-slate-200/80 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <span>🏋</span>
            <span className="uppercase font-mono-data">Workout</span>
          </div>
          <p className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            {adjustment.workoutRecommendation.label}
          </p>
          <p className="text-xs text-slate-500">{adjustment.workoutRecommendation.detail}</p>
        </div>

        {/* Hydration */}
        <div className="p-3.5 rounded-xl border bg-white border-slate-200/80 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-sky-700">
            <span>💧</span>
            <span className="uppercase font-mono-data">Hydration</span>
          </div>
          <p className="text-sm font-bold text-sky-950 font-mono-data">
            {adjustment.hydrationAdjustment.label}
          </p>
          <p className="text-xs text-slate-500">{adjustment.hydrationAdjustment.detail}</p>
        </div>

        {/* Budget */}
        <div className="p-3.5 rounded-xl border bg-white border-slate-200/80 space-y-1 shadow-2xs">
          <div className="flex items-center gap-1.5 text-xs font-bold text-teal-700">
            <span>💰</span>
            <span className="uppercase font-mono-data">Budget</span>
          </div>
          {adjustment.smartReallocationEnabled && adjustment.budgetAdjustment ? (
            <>
              <p className="text-xs font-bold text-slate-900 leading-snug">
                {adjustment.budgetAdjustment.label}
              </p>
              <p className="text-xs text-slate-500">{adjustment.budgetAdjustment.detail}</p>
            </>
          ) : (
            <>
              <p className="text-xs font-bold text-slate-600 italic">
                Smart Reallocation is disabled.
              </p>
              <p className="text-xs text-slate-400">Budget allocation remains unchanged.</p>
            </>
          )}
        </div>
      </div>

      {/* Primary Action Button */}
      <button
        onClick={() => setIsPreviewOpen(true)}
        className="w-full py-3.5 rounded-xl font-extrabold text-sm text-slate-950 bg-amber-400 hover:bg-amber-500 transition-all cursor-pointer shadow-sm flex items-center justify-center gap-2"
        style={{ fontFamily: 'Sora, sans-serif' }}
      >
        <span>APPLY RECOMMENDATION</span>
        <span>→</span>
      </button>

      {/* CONFIRMATION PREVIEW MODAL */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 relative border shadow-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
            <button
              onClick={() => setIsPreviewOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold text-lg cursor-pointer"
            >
              ✕
            </button>

            <div>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 uppercase font-mono-data">
                CONFIRMATION REQUIRED
              </span>
              <h3 className="font-bold text-xl text-slate-900 mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                Review Smart Adjustment
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Confirm your approval before applying changes to your plan & budget allocations.
              </p>
            </div>

            <div className="space-y-3 border-y py-4 border-slate-100">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold uppercase text-slate-400 block font-mono-data">WORKOUT</span>
                <p className="font-bold text-sm text-slate-900">{adjustment.workoutRecommendation.label}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold uppercase text-sky-600 block font-mono-data">HYDRATION</span>
                <p className="font-bold text-sm text-slate-900">{adjustment.hydrationAdjustment.label}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-xs font-bold uppercase text-teal-600 block font-mono-data">BUDGET</span>
                {adjustment.smartReallocationEnabled && adjustment.budgetAdjustment ? (
                  <div className="flex items-center justify-between text-sm font-mono-data pt-1">
                    <span className="text-red-600 font-bold">{adjustment.budgetAdjustment.fromLabel}: -₹{adjustment.budgetAdjustment.amount}</span>
                    <span className="text-emerald-600 font-bold">{adjustment.budgetAdjustment.toLabel}: +₹{adjustment.budgetAdjustment.amount}</span>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500 italic pt-1">Smart Reallocation disabled · No budget change</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleConfirmApply}
                disabled={isApplying}
                className="w-full py-3.5 rounded-xl font-bold text-sm text-white bg-teal-700 hover:bg-teal-800 transition-all cursor-pointer shadow-sm"
              >
                {isApplying ? 'Applying Changes...' : 'Confirm & Apply'}
              </button>
              <button
                onClick={() => setIsPreviewOpen(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
