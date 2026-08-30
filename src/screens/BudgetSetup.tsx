import { useState } from 'react'
import type { UserProfile } from '../App'
import {
  CATEGORIES,
  CategoryKey,
  amountsToPercentages,
  percentagesToAmounts,
  validateBudgetAllocation,
} from '../utils/budgetUtils'

const BUDGET_OPTIONS = [2000, 3000, 5000, 6000, 8000, 10000]

interface Props {
  profile: UserProfile
  onChange: (p: Partial<UserProfile>) => void
  onNext: () => void
  onBack: () => void
}

export default function BudgetSetup({ profile, onChange, onNext, onBack }: Props) {
  const [percentages, setPercentages] = useState<Record<CategoryKey, number>>(() => {
    return amountsToPercentages(profile.budgetCategories, profile.monthlyBudget)
  })
  const [validationError, setValidationError] = useState<string | null>(null)

  const customCats = percentagesToAmounts(percentages, profile.monthlyBudget)
  const totalAmount = Object.values(customCats).reduce((a, b) => a + b, 0)
  const totalPct = Object.values(percentages).reduce((a, b) => a + b, 0)

  const handleBudgetSelect = (b: number) => {
    setValidationError(null)
    const updatedAmounts = percentagesToAmounts(percentages, b)
    onChange({ monthlyBudget: b, budgetCategories: updatedAmounts })
  }

  const handlePctChange = (key: CategoryKey, rawVal: number) => {
    setValidationError(null)
    const val = Math.max(0, Math.min(100, Math.round(rawVal)))
    const updatedPcts = { ...percentages, [key]: val }
    setPercentages(updatedPcts)

    // Update parent profile with current rupee allocations
    const updatedAmounts = percentagesToAmounts(updatedPcts, profile.monthlyBudget)
    onChange({ budgetCategories: updatedAmounts })
  }

  const handleContinue = () => {
    const { valid, error } = validateBudgetAllocation(percentages, profile.monthlyBudget)

    if (!valid) {
      setValidationError(error)
      return
    }

    setValidationError(null)
    onNext()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-2xl mb-8">
        <div className="flex items-center gap-2 mb-4">
          <button onClick={onBack} className="text-sm flex items-center gap-1" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
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
          Minimum ₹2,000. We'll help you spend wisely on what matters most.
        </p>

        {/* Budget selector */}
        <div className="card p-6 mb-4">
          <p className="text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Select monthly budget</p>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-6">
            {BUDGET_OPTIONS.map((b) => (
              <button
                key={b}
                onClick={() => handleBudgetSelect(b)}
                className="py-3 rounded-xl text-sm font-bold border-2 transition-all"
                style={{
                  background: profile.monthlyBudget === b ? '#0d9488' : 'white',
                  color: profile.monthlyBudget === b ? 'white' : '#0f172a',
                  borderColor: profile.monthlyBudget === b ? '#0d9488' : '#e2e8f0',
                  fontFamily: 'JetBrains Mono, monospace',
                }}
              >
                ₹{(b / 1000).toFixed(0)}K
              </button>
            ))}
          </div>

          {/* Category sliders header with allocation indicator */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              Allocate by category
            </p>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all"
              style={{
                background: totalPct === 100 ? '#f0fdf4' : '#fef2f2',
                color: totalPct === 100 ? '#16a34a' : '#ef4444',
                border: `1px solid ${totalPct === 100 ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              <span>{totalPct === 100 ? '✓' : '⚠️'}</span>
              <span>
                {totalPct === 100
                  ? '100% allocated'
                  : totalPct < 100
                  ? `Allocation must total 100%. Current: ${totalPct}%`
                  : `Allocation cannot exceed 100%. Current: ${totalPct}%`}
              </span>
              <span className="font-normal opacity-80">
                (₹{totalAmount.toLocaleString()} / ₹{profile.monthlyBudget.toLocaleString()})
              </span>
            </span>
          </div>

          {/* Independent Category Sliders */}
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const pct = percentages[cat.key] ?? 0
              const amt = customCats[cat.key] ?? 0
              return (
                <div key={cat.key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-base">{cat.icon}</span>
                      <span className="text-sm font-medium" style={{ fontFamily: 'Inter, sans-serif', color: '#0f172a' }}>{cat.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: '#f1f5f9', color: '#475569', fontFamily: 'JetBrains Mono, monospace' }}>
                        {pct}%
                      </span>
                      <span className="font-mono-data text-sm font-bold" style={{ color: cat.color }}>
                        ₹{amt.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={pct}
                    onChange={(e) => handlePctChange(cat.key, Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{ accentColor: cat.color }}
                  />
                  <div className="h-1.5 rounded-full mt-1" style={{ background: '#f1f5f9' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(100, pct)}%`, background: cat.color }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Validation Error Banner when validation fails on Continue */}
        {validationError && (
          <div className="rounded-xl p-4 mb-4 flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 text-sm font-semibold fade-in">
            <span className="text-base">⚠️</span>
            <p style={{ fontFamily: 'Inter, sans-serif' }}>{validationError}</p>
          </div>
        )}

        <div className="rounded-xl p-4 mb-4 flex items-start gap-3" style={{ background: '#fef3c7', border: '1px solid #fde68a' }}>
          <span className="text-base">💡</span>
          <p className="text-sm" style={{ color: '#92400e', fontFamily: 'Inter, sans-serif' }}>
            You'll receive a budget warning when spending reaches 80% of your monthly limit. Configurable in Settings.
          </p>
        </div>

        <button
          onClick={handleContinue}
          className="btn-primary w-full py-3.5 text-base"
        >
          Launch Dashboard →
        </button>
      </div>
    </div>
  )
}
