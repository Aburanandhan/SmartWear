import { useState } from 'react'
import type { UserProfile } from '../App'
import {
  CATEGORIES,
  CategoryKey,
  DEFAULT_PERCENTAGES,
  amountsToPercentages,
  percentagesToAmounts,
  validateCategoryAmounts,
} from '../utils/budgetUtils'

const BUDGET_OPTIONS = [2000, 3000, 5000, 6000, 8000, 10000]

interface Props {
  profile: UserProfile
  onChange: (p: Partial<UserProfile>) => void
  onNext: () => void
  onBack: () => void
}

export default function BudgetSetup({ profile, onChange, onNext, onBack }: Props) {
  const [amounts, setAmounts] = useState<Record<CategoryKey, number>>(() => {
    if (profile.budgetCategories && Object.values(profile.budgetCategories).some((v) => v > 0)) {
      return { ...profile.budgetCategories }
    }
    return percentagesToAmounts(DEFAULT_PERCENTAGES, profile.monthlyBudget || 6000)
  })

  const monthlyBudget = profile.monthlyBudget || 6000
  const totalAllocated = Object.values(amounts).reduce((a, b) => a + b, 0)
  const totalPct = Math.round((totalAllocated / monthlyBudget) * 100)
  const isBalanced = totalAllocated === monthlyBudget

  const handleBudgetSelect = (newBudget: number) => {
    // Calculate current percentages to scale amounts to new budget proportionally
    const currentPcts = totalAllocated > 0
      ? amountsToPercentages(amounts, monthlyBudget)
      : DEFAULT_PERCENTAGES

    const scaledAmounts = percentagesToAmounts(currentPcts, newBudget)
    setAmounts(scaledAmounts)
    onChange({ monthlyBudget: newBudget, budgetCategories: scaledAmounts })
  }

  const handleAmountChange = (key: CategoryKey, rawVal: number) => {
    const val = Math.max(0, Math.round(rawVal))
    const updatedAmounts = { ...amounts, [key]: val }
    setAmounts(updatedAmounts)
    onChange({ budgetCategories: updatedAmounts })
  }

  const handleStepAmount = (key: CategoryKey, delta: number) => {
    const current = amounts[key] ?? 0
    handleAmountChange(key, current + delta)
  }

  const handleContinue = () => {
    const { valid } = validateCategoryAmounts(amounts, monthlyBudget)
    if (!valid) return
    onNext()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="text-sm flex items-center gap-1 cursor-pointer hover:underline" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            ← Back
          </button>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="h-1 flex-1 rounded-full" style={{ background: s <= 3 ? '#0d9488' : '#e2e8f0' }} />
          ))}
        </div>
        <p className="text-xs mt-2" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>Step 3 of 4</p>
      </div>

      <div className="w-full max-w-2xl fade-in">
        <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>
          Set your monthly health budget
        </h2>
        <p className="mb-8" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
          Minimum ₹2,000. Specify amounts per category — percentage is automatically calculated.
        </p>

        {/* Budget selector */}
        <div className="card p-6 mb-4">
          <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Select monthly budget</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => handleBudgetSelect(b)}
                className="py-3 rounded-xl text-sm font-bold border-2 transition-all cursor-pointer"
                style={{
                  background: monthlyBudget === b ? '#0d9488' : 'white',
                  color: monthlyBudget === b ? 'white' : '#0f172a',
                  borderColor: monthlyBudget === b ? '#0d9488' : '#e2e8f0',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                ₹{(b / 1000).toFixed(0)}K
              </button>
            ))}
          </div>

          {/* Allocation summary banner */}
          <div className="p-4 rounded-xl border mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/80" style={{ borderColor: '#e2e8f0' }}>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Total Allocated</p>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="font-mono-data text-xl font-bold text-slate-900">
                  ₹{totalAllocated.toLocaleString()}
                </span>
                <span className="text-xs text-slate-500 font-medium">
                  / ₹{monthlyBudget.toLocaleString()} ({totalPct}%)
                </span>
              </div>
            </div>

            <div className="flex items-center">
              <span
                className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1.5 transition-all shadow-xs"
                style={{
                  background: isBalanced ? '#f0fdf4' : totalAllocated < monthlyBudget ? '#fffbe6' : '#fef2f2',
                  color: isBalanced ? '#16a34a' : totalAllocated < monthlyBudget ? '#b45309' : '#ef4444',
                  border: `1px solid ${isBalanced ? '#bbf7d0' : totalAllocated < monthlyBudget ? '#fde68a' : '#fecaca'}`,
                }}
              >
                <span>{isBalanced ? '✓' : '⚠️'}</span>
                <span>
                  {isBalanced
                    ? '100% allocated'
                    : totalAllocated < monthlyBudget
                    ? `₹${(monthlyBudget - totalAllocated).toLocaleString()} remaining to allocate`
                    : `₹${(totalAllocated - monthlyBudget).toLocaleString()} over budget`}
                </span>
              </span>
            </div>
          </div>

          <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Category Amounts (₹)
          </p>

          {/* Category Amount Controls */}
          <div className="space-y-5">
            {CATEGORIES.map((cat) => {
              const amt = amounts[cat.key] ?? 0
              const derivedPct = monthlyBudget > 0 ? Math.round((amt / monthlyBudget) * 100) : 0
              const trackFillPct = Math.min(100, Math.max(0, (amt / monthlyBudget) * 100))
              const trackFill = `linear-gradient(to right, ${cat.color} 0%, ${cat.color} ${trackFillPct}%, #e2e8f0 ${trackFillPct}%, #e2e8f0 100%)`

              return (
                <div key={cat.key} className="p-3.5 rounded-xl border bg-white space-y-2.5 transition-all hover:border-slate-300" style={{ borderColor: '#f1f5f9' }}>
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-sm font-semibold" style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>{cat.label}</span>
                      <span
                        className="text-xs font-bold px-2 py-0.5 rounded-md ml-1"
                        style={{ background: '#f1f5f9', color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}
                      >
                        {derivedPct}%
                      </span>
                    </div>

                    {/* Direct Amount Input and Steppers */}
                    <div className="flex items-center gap-1.5 self-end sm:self-auto">
                      <button
                        type="button"
                        onClick={() => handleStepAmount(cat.key, -50)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                        title="Decrease ₹50"
                      >
                        -
                      </button>

                      <div className="relative flex items-center">
                        <span className="absolute left-2.5 text-xs font-bold text-slate-400 font-mono-data">₹</span>
                        <input
                          type="number"
                          min={0}
                          step={50}
                          value={amt === 0 ? '' : amt}
                          placeholder="0"
                          onChange={(e) => handleAmountChange(cat.key, Number(e.target.value))}
                          className="w-24 pl-6 pr-2 py-1 text-sm font-bold font-mono-data rounded-lg border outline-none text-right bg-slate-50 focus:bg-white focus:border-teal-600 transition-all"
                          style={{ borderColor: '#e2e8f0', color: cat.color }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStepAmount(cat.key, 50)}
                        className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center transition-all cursor-pointer"
                        title="Increase ₹50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* High hit-area horizontal range slider */}
                  <div className="relative flex items-center">
                    <input
                      type="range"
                      min={0}
                      max={monthlyBudget}
                      step={50}
                      value={amt}
                      onChange={(e) => handleAmountChange(cat.key, Number(e.target.value))}
                      aria-label={`${cat.label} amount in rupees`}
                      className="budget-slider"
                      style={{
                        '--slider-color': cat.color,
                        '--track-bg': trackFill,
                      } as React.CSSProperties}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl p-4 mb-4 flex items-start gap-3" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
          <span className="text-base">💡</span>
          <p className="text-sm" style={{ color: '#92400e', fontFamily: 'Inter, sans-serif' }}>
            You'll receive a budget warning when spending reaches 80% of your monthly limit. Configurable in Settings.
          </p>
        </div>

        <button
          onClick={handleContinue}
          disabled={!isBalanced}
          className={`w-full py-3.5 text-base font-bold rounded-xl transition-all ${
            isBalanced
              ? 'btn-primary cursor-pointer shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
          }`}
        >
          {isBalanced
            ? 'Launch Dashboard →'
            : totalAllocated < monthlyBudget
            ? `Allocate remaining ₹${(monthlyBudget - totalAllocated).toLocaleString()} to Launch`
            : `Reduce allocation by ₹${(totalAllocated - monthlyBudget).toLocaleString()} to Launch`}
        </button>
      </div>
    </div>
  )
}
