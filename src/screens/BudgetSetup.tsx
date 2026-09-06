import { useRef, useState } from 'react'
import type { UserProfile } from '../App'
import {
  CATEGORIES,
  CategoryKey,
  DEFAULT_PERCENTAGES,
  amountsToPercentages,
  percentagesToAmounts,
  validateCategoryAmounts,
} from '../utils/budgetUtils'
import OnboardingHeader from '../components/OnboardingHeader'

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
  const [isCustomBudgetOpen, setIsCustomBudgetOpen] = useState(false)
  const [customBudget, setCustomBudget] = useState('')
  const [customBudgetError, setCustomBudgetError] = useState('')
  const [adjustedCategory, setAdjustedCategory] = useState<CategoryKey | null>(null)
  const profileUpdateTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [amounts, setAmounts] = useState<Record<CategoryKey, number>>(() => {
    if (profile.budgetCategories && Object.values(profile.budgetCategories).some((v) => v > 0)) {
      return {
        food: profile.budgetCategories.food || 4550,
        supplements: profile.budgetCategories.supplements || 2400,
        hydration: profile.budgetCategories.hydration || 1100,
        recovery: profile.budgetCategories.recovery || 1000,
        other: profile.budgetCategories.other || 950,
      }
    }
    return percentagesToAmounts(DEFAULT_PERCENTAGES, profile.monthlyBudget || 10000)
  })

  const totalAllocated = Object.values(amounts).reduce((a, b) => a + b, 0)
  const isBalanced = totalAllocated === monthlyBudget
  const currentPcts = amountsToPercentages(amounts, monthlyBudget)
  const { error: validationError } = validateCategoryAmounts(amounts, monthlyBudget)

  const handleBudgetSelect = (newBudget: number) => {
    const validBudget = Math.max(2000, newBudget)
    if (profileUpdateTimeout.current) clearTimeout(profileUpdateTimeout.current)
    setMonthlyBudget(validBudget)
    setIsCustomBudgetOpen(false)
    setCustomBudgetError('')

    // Calculate initial allocations for new budget
    const scaledAmounts = percentagesToAmounts(DEFAULT_PERCENTAGES, validBudget)
    setAmounts(scaledAmounts)

    onChange({
      monthlyBudget: validBudget,
      budgetCategories: scaledAmounts,
      smartReallocation,
    })
  }

  const handleCustomBudgetSelect = () => {
    const enteredBudget = Number(customBudget)
    if (!Number.isFinite(enteredBudget) || enteredBudget <= 10000) {
      setCustomBudgetError('Enter an amount greater than ₹10,000.')
      return
    }

    handleBudgetSelect(Math.round(enteredBudget))
  }

  const handleAmountChange = (key: CategoryKey, rawVal: number) => {
    const val = Math.max(0, Math.round(rawVal))
    const updatedAmounts = { ...amounts, [key]: val }
    setAmounts(updatedAmounts)
    setAdjustedCategory(key)
    if (profileUpdateTimeout.current) clearTimeout(profileUpdateTimeout.current)
    profileUpdateTimeout.current = setTimeout(() => {
      onChange({
        budgetCategories: updatedAmounts,
        monthlyBudget,
        smartReallocation,
      })
    }, 250)
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
    if (profileUpdateTimeout.current) clearTimeout(profileUpdateTimeout.current)
    onChange({
      budgetCategories: amounts,
      monthlyBudget,
      smartReallocation,
    })
    onNext()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      {/* Onboarding Header */}
      <OnboardingHeader currentStep={4} onBack={onBack} />

      <div className="w-full max-w-2xl space-y-6 fade-in">
        {/* 1. SCREEN TITLE */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-100 text-teal-800 text-xs font-bold mb-2">
            <span>⚡ Adaptive Budgeting</span>
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
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-teal-800" style={{ fontFamily: 'Sora, sans-serif' }}>₹</span>
                <input
                  type="number"
                  min={2000}
                  step={500}
                  value={monthlyBudget}
                  onChange={(e) => handleBudgetSelect(Number(e.target.value))}
                  className="font-mono-data text-3xl font-extrabold text-slate-900 bg-transparent border-none outline-none w-44"
                />
              </div>
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-emerald-100 text-emerald-800">
                Active Cycle
              </span>
            </div>

            {/* Quick Pick Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              {BUDGET_OPTIONS.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => handleBudgetSelect(amt)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono-data ${
                    monthlyBudget === amt
                      ? 'bg-teal-700 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  ₹{amt.toLocaleString()}
                </button>
              ))}
              <button
                type="button"
                onClick={() => {
                  setIsCustomBudgetOpen(true)
                  setCustomBudgetError('')
                }}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer font-mono-data ${
                  isCustomBudgetOpen
                    ? 'bg-teal-700 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Above ₹10,000
              </button>
            </div>

            {isCustomBudgetOpen && (
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <input
                  type="number"
                  min={10001}
                  step={500}
                  value={customBudget}
                  onChange={(e) => {
                    setCustomBudget(e.target.value)
                    setCustomBudgetError('')
                  }}
                  placeholder="Enter amount above ₹10,000"
                  aria-label="Custom budget amount"
                  className="min-w-0 flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono-data outline-none focus:border-teal-600"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleCustomBudgetSelect}
                  className="px-4 py-2 rounded-xl bg-teal-700 text-white text-xs font-bold hover:bg-teal-800 cursor-pointer"
                >
                  Select Amount
                </button>
              </div>
            )}
            {customBudgetError && (
              <p className="mt-2 text-xs font-semibold text-amber-700">{customBudgetError}</p>
            )}
          </div>

          {/* 3. SMARTWEAR FEATURE CALLOUT */}
          <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/50 space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-teal-700 font-bold text-sm">💡 How SmartWear Budget Works</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
              Your money is divided into target categories based on your fitness goals. If you spend less in one category (like gear), SmartWear dynamically reallocates funds to essential areas like post-workout nutrition or recovery.
            </p>
          </div>
        </div>

        {/* 4. INITIAL CATEGORY ALLOCATION SECTION */}
        <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b pb-3 border-slate-100">
            <div>
              <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                Initial Category Allocation
              </h3>
              <p className="text-xs text-slate-500">
                Adjust how much you plan to allocate for each area.
              </p>
            </div>
            <div className="text-xs font-semibold self-start sm:self-auto">
              <span className="font-mono-data font-bold text-slate-700">Total: </span>
              <span className={`font-mono-data font-black text-sm ${isBalanced ? 'text-emerald-600' : 'text-amber-600'}`}>
                ₹{totalAllocated.toLocaleString()}
              </span>
              <span className="text-slate-400 font-mono-data"> / ₹{monthlyBudget.toLocaleString()}</span>
            </div>
          </div>

          {/* Category Sliders & Amount Pickers */}
          <div className="space-y-4">
            {CATEGORIES.map((cat) => {
              const val = amounts[cat.key] || 0
              const pct = currentPcts[cat.key] || 0

              return (
                <div key={cat.key} className="p-4 rounded-xl border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-all space-y-2.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{cat.icon}</span>
                      <div>
                        <span className="font-bold text-sm text-slate-900 block" style={{ fontFamily: 'Sora, sans-serif' }}>
                          {cat.label}
                        </span>
                        <span className="text-xs text-slate-500 font-mono-data font-medium">
                          {pct}% of budget
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleStepAmount(cat.key, -100)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer text-sm"
                      >
                        -
                      </button>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1.5 text-xs text-slate-400 font-bold">₹</span>
                        <input
                          type="number"
                          step={50}
                          value={val}
                          onChange={(e) => handleAmountChange(cat.key, Number(e.target.value))}
                          className="w-24 pl-5 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 text-right font-mono-data outline-none focus:border-teal-600"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleStepAmount(cat.key, 100)}
                        className="w-7 h-7 rounded-lg border border-slate-200 bg-white text-slate-700 font-bold flex items-center justify-center hover:bg-slate-100 cursor-pointer text-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Range Slider */}
                  <input
                    type="range"
                    min={0}
                    max={monthlyBudget}
                    step={50}
                    value={val}
                    onChange={(e) => handleAmountChange(cat.key, Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />

                  {adjustedCategory === cat.key && validationError && (
                    <div className="p-3 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-xs font-semibold flex items-center gap-2">
                      <span className="text-base">⚠️</span>
                      <span>{validationError}</span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* 5. SMART REALLOCATION TOGGLE CARD */}
        <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-4" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-base">✨</span>
                <span className="font-bold text-slate-900 text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Enable Smart Reallocation
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-100 text-teal-800">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif' }}>
                Allow SmartWear to automatically adjust monthly category limits if unused money is detected and other areas need support.
              </p>
            </div>

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

        {/* 6. COMPLETE SETUP BUTTON */}
        <button
          onClick={handleContinue}
          disabled={!isBalanced}
          className={`w-full py-4 text-base font-bold rounded-xl transition-all shadow-md cursor-pointer ${
            isBalanced
              ? 'btn-primary hover:shadow-lg'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300 shadow-none'
          }`}
        >
          {isBalanced
            ? 'Finish Setup →'
            : `Your allocation must total ₹${monthlyBudget.toLocaleString()}.`}
        </button>
      </div>
    </div>
  )
}
