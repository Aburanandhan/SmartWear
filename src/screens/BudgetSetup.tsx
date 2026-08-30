import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import {
  CATEGORIES,
  CategoryKey,
  amountsToPercentages,
  percentagesToAmounts,
  rebalancePercentages,
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

  // Ensure state stays in sync if monthlyBudget or budgetCategories props update
  useEffect(() => {
    const pcts = amountsToPercentages(profile.budgetCategories, profile.monthlyBudget)
    const currentSum = Object.values(percentages).reduce((a, b) => a + b, 0)
    if (currentSum !== 100) {
      setPercentages(pcts)
    }
  }, [profile.monthlyBudget])

  const customCats = percentagesToAmounts(percentages, profile.monthlyBudget)
  const totalAmount = Object.values(customCats).reduce((a, b) => a + b, 0)
  const totalPct = Object.values(percentages).reduce((a, b) => a + b, 0)

  const handleBudgetSelect = (b: number) => {
    const updatedAmounts = percentagesToAmounts(percentages, b)
    onChange({ monthlyBudget: b, budgetCategories: updatedAmounts })
  }

  const handlePctChange = (key: CategoryKey, val: number) => {
    const updatedPcts = rebalancePercentages(percentages, key, val)
    setPercentages(updatedPcts)
    const updatedAmounts = percentagesToAmounts(updatedPcts, profile.monthlyBudget)
    onChange({ budgetCategories: updatedAmounts })
  }

  const isAllocated100Pct = totalPct === 100 && totalAmount === profile.monthlyBudget

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

          {/* Category sliders */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              Allocate by category
            </p>
            <span
              className="text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 transition-all"
              style={{
                background: isAllocated100Pct ? '#f0fdf4' : '#fef2f2',
                color: isAllocated100Pct ? '#16a34a' : '#ef4444',
                border: `1px solid ${isAllocated100Pct ? '#bbf7d0' : '#fecaca'}`,
              }}
            >
              <span>{isAllocated100Pct ? '✓' : '⚠️'}</span>
              <span>{isAllocated100Pct ? '100% allocated' : `${totalPct}% allocated`}</span>
              <span className="font-normal opacity-80">
                (₹{totalAmount.toLocaleString()} / ₹{profile.monthlyBudget.toLocaleString()})
              </span>
            </span>
          </div>

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
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cat.color }} />
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
          onClick={onNext}
          disabled={!isAllocated100Pct}
          className="btn-primary w-full py-3.5 text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Launch Dashboard →
        </button>
      </div>
    </div>
  )
}
