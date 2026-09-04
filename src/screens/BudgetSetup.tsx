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
  const [smartReallocation, setSmartReallocation] = useState<boolean>(
    profile.smartReallocation !== undefined ? profile.smartReallocation : true
  )

  const [monthlyBudget, setMonthlyBudget] = useState<number>(() => {
    return Math.max(2000, profile.monthlyBudget || 10000)
  })

  const [amounts, setAmounts] = useState<Record<CategoryKey, number>>(() => {
    if (profile.budgetCategories && Object.values(profile.budgetCategories).some((v) => v > 0)) {
      return { ...profile.budgetCategories }
    }
    return percentagesToAmounts(DEFAULT_PERCENTAGES, profile.monthlyBudget || 10000)
  })

  const totalAllocated = Object.values(amounts).reduce((a, b) => a + b, 0)
  const isBalanced = totalAllocated === monthlyBudget
  const currentPcts = amountsToPercentages(amounts, monthlyBudget)
  const { error: validationError } = validateCategoryAmounts(amounts, monthlyBudget)

  const handleBudgetSelect = (newBudget: number) => {
    const validBudget = Math.max(2000, newBudget)
    setMonthlyBudget(validBudget)

    // Calculate initial allocations for new budget
    const scaledAmounts = percentagesToAmounts(DEFAULT_PERCENTAGES, validBudget)
    setAmounts(scaledAmounts)

    onChange({
      monthlyBudget: validBudget,
      budgetCategories: scaledAmounts,
      smartReallocation,
    })
  }

  const handleAmountChange = (key: CategoryKey, rawVal: number) => {
    const val = Math.max(0, Math.round(rawVal))
    const updatedAmounts = { ...amounts, [key]: val }
    setAmounts(updatedAmounts)
    onChange({
      budgetCategories: updatedAmounts,
      monthlyBudget,
      smartReallocation,
    })
  }

  const handleStepAmount = (key: CategoryKey, delta: number) => {
    const current = amounts[key] ?? 0
    handleAmountChange(key, current + delta)
  }

  const handleToggleSmartReallocation = () => {
    const newVal = !smartReallocation
    setSmartReallocation(newVal)
    onChange({
      smartReallocation: newVal,
      monthlyBudget,
      budgetCategories: amounts,
    })
  }

  const handleContinue = () => {
    const { valid } = validateCategoryAmounts(amounts, monthlyBudget)
    if (!valid) return
    onNext()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-10 bg-emerald-50/30">
      {/* Onboarding Header & Step Indicator */}
      <div className="w-full max-w-2xl mb-6">
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={onBack}
            className="text-sm font-semibold flex items-center gap-1.5 cursor-pointer hover:text-teal-700 transition-colors"
            style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}
          >
            ← Back
          </button>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800" style={{ fontFamily: 'Inter, sans-serif' }}>
            Step 3 of 4
          </span>
        </div>
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{ background: s <= 3 ? '#0d9488' : '#e2e8f0' }}
            />
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl space-y-6 fade-in">
        {/* 1. SCREEN TITLE */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold mb-2">
            <span>⚡ SmartWear USP</span>
            <span>·</span>
            <span>Smart Adaptive Budgeting</span>
          </div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '2rem', color: '#0f172a', lineHeight: '1.2' }}>
            Smart Fitness Budget
          </h2>
          <p className="mt-2 text-base text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
            Set your monthly fitness budget and let SmartWear optimize how it's spent.
          </p>
        </div>

        {/* 2. MONTHLY BUDGET & 3. SMARTWEAR EXPLANATION CARD */}
        <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                Monthly Fitness Budget
              </label>
              <span className="text-xs text-slate-400 font-medium">Minimum ₹2,000 / month</span>
            </div>

            {/* Prominent Monthly Budget Display */}
            <div className="flex items-baseline gap-2 mb-4 p-4 rounded-xl bg-slate-900 text-white shadow-inner">
              <span className="text-xs text-teal-400 font-semibold uppercase tracking-wider font-mono-data">Budget</span>
              <span className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-mono-data">
                ₹{monthlyBudget.toLocaleString()}
              </span>
              <span className="text-slate-400 text-sm font-medium">/ month</span>
            </div>

            {/* Budget Presets Selector */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
              {BUDGET_OPTIONS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => handleBudgetSelect(b)}
                  className="py-2.5 rounded-xl text-sm font-bold border transition-all cursor-pointer hover:border-teal-500"
                  style={{
                    background: monthlyBudget === b ? '#0d9488' : '#f8fafc',
                    color: monthlyBudget === b ? 'white' : '#0f172a',
                    borderColor: monthlyBudget === b ? '#0d9488' : '#e2e8f0',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}
                >
                  ₹{(b / 1000).toFixed(0)}K
                </button>
              ))}
            </div>
          </div>

          {/* 3. SMARTWEAR EXPLANATION CARD */}
          <div className="p-4 rounded-xl border flex items-start gap-3 bg-teal-50/70" style={{ borderColor: '#99f6e4' }}>
            <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 text-base font-bold">
              💡
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-900 mb-0.5" style={{ fontFamily: 'Sora, sans-serif' }}>
                Adaptive Budget Engine
              </p>
              <p className="text-sm text-teal-950 font-medium leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                SmartWear will dynamically adjust your allocation based on your actual spending, fitness progress and current needs.
              </p>
            </div>
          </div>
        </div>

        {/* 6. MAKE THE USP VISUALLY CLEAR (FEATURE FLOW CARD) */}
        <div className="card p-5 border bg-slate-900 text-white rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-teal-400 animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-widest text-teal-300" style={{ fontFamily: 'Sora, sans-serif' }}>
                SMART FITNESS BUDGET
              </span>
            </div>
            <span className="text-xs italic text-slate-400" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your budget evolves with you.
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
            {[
              { label: 'Initial allocation', icon: '🎯' },
              { label: 'Actual spending', icon: '💳' },
              { label: 'Fitness progress', icon: '📈' },
              { label: 'Current needs', icon: '🥗' },
              { label: 'Smart reallocation', icon: '⚡' },
            ].map((step, idx, arr) => (
              <div key={step.label} className="flex items-center gap-1.5">
                <div className="flex-1 p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-center flex flex-col items-center justify-center gap-1">
                  <span className="text-base">{step.icon}</span>
                  <span className="text-[11px] font-semibold text-slate-200 leading-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                    {step.label}
                  </span>
                </div>
                {idx < arr.length - 1 && (
                  <span className="hidden sm:inline text-slate-500 font-bold text-xs">→</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 4. INITIAL ALLOCATION SECTION & 7. REMOVE MANUAL-PERCENTAGE FEEL */}
        <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h3 className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                Initial allocation
              </h3>
              <p className="text-xs text-slate-500 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                Primary allocation amounts in rupees (₹). Adjust individual amounts if needed.
              </p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-semibold uppercase block">Target Total</span>
              <span className="font-mono-data font-bold text-base text-slate-900">₹{monthlyBudget.toLocaleString()}</span>
            </div>
          </div>

          {/* Allocation List */}
          <div className="space-y-3.5">
            {CATEGORIES.map((cat) => {
              const amt = amounts[cat.key] ?? 0
              const pct = currentPcts[cat.key] ?? 0

              return (
                <div
                  key={cat.key}
                  className="p-3.5 rounded-xl border bg-slate-50/50 hover:bg-white transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-lg shadow-2xs">
                      {cat.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {cat.label}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700 font-mono-data">
                          {pct}%
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5 font-mono-data">
                        Primary: <span className="font-bold text-slate-700">₹{amt.toLocaleString()}</span>
                      </p>
                    </div>
                  </div>

                  {/* Rupee Amount Controls */}
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => handleStepAmount(cat.key, -50)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Decrease ₹50"
                    >
                      -
                    </button>

                    <div className="relative flex items-center">
                      <span className="absolute left-3 text-xs font-bold text-slate-400 font-mono-data">₹</span>
                      <input
                        type="number"
                        min={0}
                        step={50}
                        value={amt === 0 ? '' : amt}
                        placeholder="0"
                        onChange={(e) => handleAmountChange(cat.key, Number(e.target.value))}
                        className="w-28 pl-7 pr-3 py-1.5 text-sm font-bold font-mono-data rounded-lg border outline-none text-right bg-white focus:border-teal-600 transition-all shadow-2xs"
                        style={{ borderColor: '#cbd5e1', color: cat.color }}
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => handleStepAmount(cat.key, 50)}
                      className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-sm flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                      title="Increase ₹50"
                    >
                      +
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Allocation Total Summary & Validation Message */}
          <div className="p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900 text-white" style={{ borderColor: '#334155' }}>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider font-mono-data">TOTAL ALLOCATED</span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl font-extrabold font-mono-data text-teal-400">
                  ₹{totalAllocated.toLocaleString()}
                </span>
                <span className="text-xs text-slate-300 font-mono-data">
                  / ₹{monthlyBudget.toLocaleString()} (100%)
                </span>
              </div>
            </div>

            <div>
              <span
                className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm"
                style={{
                  background: isBalanced ? '#166534' : '#991b1b',
                  color: 'white',
                  border: `1px solid ${isBalanced ? '#22c55e' : '#f87171'}`,
                }}
              >
                <span>{isBalanced ? '✓' : '⚠️'}</span>
                <span>
                  {isBalanced
                    ? '100% Balanced'
                    : `Your allocation must total ₹${monthlyBudget.toLocaleString()}.`}
                </span>
              </span>
            </div>
          </div>

          {!isBalanced && (
            <p className="text-xs text-red-600 font-medium text-center">
              {validationError || `Your allocation must total ₹${monthlyBudget.toLocaleString()}.`}
            </p>
          )}
        </div>

        {/* 5. SMART REALLOCATION TOGGLE CARD */}
        <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-3" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Enable Smart Reallocation
                </h3>
                {smartReallocation && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 uppercase">
                    ACTIVE ✓
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                SmartWear can automatically rebalance your budget when your spending, fitness progress, or needs change.
              </p>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              role="switch"
              aria-checked={smartReallocation}
              onClick={handleToggleSmartReallocation}
              className={`relative inline-flex h-7 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                smartReallocation ? 'bg-teal-600' : 'bg-slate-300'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                  smartReallocation ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Behavior indicator text */}
          <div className="pt-2 text-xs font-semibold flex items-center gap-1.5 text-teal-700 bg-teal-50/60 p-2.5 rounded-lg border border-teal-100">
            <span>{smartReallocation ? '✨' : '🔒'}</span>
            <span>
              {smartReallocation
                ? 'Allocation updated based on your spending, workout activity & nutrition recommendations.'
                : 'Initial allocation remains fixed. Automatic rebalancing is turned off.'}
            </span>
          </div>
        </div>

        {/* 10. CONTINUE BUTTON */}
        <button
          onClick={handleContinue}
          disabled={!isBalanced}
          className={`w-full py-4 text-base font-bold rounded-xl transition-all shadow-md ${
            isBalanced
              ? 'btn-primary cursor-pointer hover:shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
          }`}
        >
          {isBalanced
            ? 'Continue →'
            : `Your allocation must total ₹${monthlyBudget.toLocaleString()}.`}
        </button>
      </div>
    </div>
  )
}
