import { useState, useEffect, useMemo } from 'react'
import type { UserProfile } from '../App'
import { GOAL_LABELS } from '../App'
import type { SensorReading } from '../services/sensor/types'
import { fetchUserExpenses, type ExpenseItem } from '../services/budgetService'
import {
  rankPersonalizedFoods,
  type FilterOptions,
} from '../lib/food-filter-engine'
import type { DietType, MealType } from '../data/foods'

interface Props {
  profile: UserProfile
  reading: SensorReading
  userId?: string
}

export default function Nutrition({ profile, reading, userId }: Props) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [simulatedBudgetOverride, setSimulatedBudgetOverride] = useState<number | undefined>(undefined)
  const [showPipeline, setShowPipeline] = useState(false)
  const [showAlgoInfo, setShowAlgoInfo] = useState(false)
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null)

  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    dietType: profile.dietType || 'vegetarian',
    mealType: 'all',
    maxCost: 150,
    minProtein: 0,
    searchQuery: '',
  })

  useEffect(() => {
    async function loadExpenses() {
      const list = await fetchUserExpenses(userId)
      setExpenses(list)
    }
    loadExpenses()
  }, [userId])

  // Memoize recommendation output for performance
  const engineOutput = useMemo(() => {
    return rankPersonalizedFoods(profile, expenses, reading, filterOptions, simulatedBudgetOverride)
  }, [profile, expenses, reading, filterOptions, simulatedBudgetOverride])

  const { budgetMetrics, rankedMeals, pipeline } = engineOutput

  const handleDietChange = (diet: DietType) => {
    setFilterOptions((prev) => ({ ...prev, dietType: diet }))
  }

  const handleMealTypeChange = (meal: MealType | 'all') => {
    setFilterOptions((prev) => ({ ...prev, mealType: meal }))
  }

  const resetFilters = () => {
    setFilterOptions({
      dietType: profile.dietType || 'vegetarian',
      mealType: 'all',
      maxCost: 150,
      minProtein: 0,
      searchQuery: '',
    })
    setSimulatedBudgetOverride(undefined)
  }

  return (
    <div className="space-y-6">
      {/* 1. "YOUR BUDGET → YOUR FOOD" Visual Hero Banner */}
      <div
        className="card p-6 border-2 relative overflow-hidden shadow-sm"
        style={{
          borderColor: budgetMetrics.status === 'EXHAUSTED' ? '#ef4444' : budgetMetrics.status === 'LOW' ? '#f59e0b' : '#0d9488',
          background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf9 100%)',
        }}
      >
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-2xl">💰</span>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
                Your Budget → Your Food
              </h2>
              <span
                className="px-3 py-0.5 rounded-full text-xs font-bold"
                style={{
                  background: budgetMetrics.status === 'EXHAUSTED' ? '#fee2e2' : budgetMetrics.status === 'LOW' ? '#fef3c7' : '#ccfbf1',
                  color: budgetMetrics.status === 'EXHAUSTED' ? '#dc2626' : budgetMetrics.status === 'LOW' ? '#d97706' : '#0f766e',
                }}
              >
                Budget Status: {budgetMetrics.status}
              </span>
            </div>
            <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              Dynamic food ranking linked to remaining budget · Diet: <span className="font-semibold text-slate-800 capitalize">{profile.dietType}</span> · Goal: <span className="font-semibold text-slate-800">{GOAL_LABELS[profile.goal] || profile.goal}</span>
            </p>
          </div>

          {/* Budget KPI Callout Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full md:w-auto">
            <div className="p-3 rounded-xl bg-white border border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase">Food Budget</p>
              <p className="font-mono-data text-base font-bold text-slate-800">₹{budgetMetrics.foodAllocation.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase">Food Spent</p>
              <p className="font-mono-data text-base font-bold text-slate-800">₹{budgetMetrics.foodSpent.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-white border border-slate-100 text-center">
              <p className="text-xs text-slate-400 font-semibold uppercase">Remaining</p>
              <p className="font-mono-data text-base font-bold text-teal-700">₹{budgetMetrics.remainingFoodBudget.toLocaleString()}</p>
            </div>
            <div className="p-3 rounded-xl bg-teal-600 text-white text-center shadow-md">
              <p className="text-xs text-teal-100 font-semibold uppercase">Daily Allowance</p>
              <p className="font-mono-data text-lg font-bold">₹{budgetMetrics.dailyFoodBudget}<span className="text-xs font-normal">/day</span></p>
            </div>
          </div>
        </div>

        {/* Hero Callout Pill */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2 text-teal-800 font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
            <span className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
            <span>Targeting recommendations under <strong>₹{budgetMetrics.dailyFoodBudget}/day</strong> allowance</span>
          </div>
          <button
            onClick={() => setShowAlgoInfo(!showAlgoInfo)}
            className="text-xs font-semibold text-teal-700 hover:underline flex items-center gap-1"
          >
            <span>ℹ️ How SmartWear Decides</span>
            <span>{showAlgoInfo ? '▲' : '▼'}</span>
          </button>
        </div>
      </div>

      {/* Connected Budget Alert Event Notification Banner */}
      {budgetMetrics.foodSpent >= budgetMetrics.foodAllocation * 0.7 && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 fade-in">
          <span className="text-xl">🔔</span>
          <div className="text-xs text-amber-900 space-y-0.5">
            <p className="font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>Budget & Food Connection Alert</p>
            <p style={{ fontFamily: 'Inter, sans-serif' }}>
              Your remaining food budget has decreased (₹{budgetMetrics.remainingFoodBudget} left of ₹{budgetMetrics.foodAllocation} allocation), so SmartWear has automatically adjusted today's recommendations to prioritize low-cost meal options.
            </p>
          </div>
        </div>
      )}

      {/* 2. Interactive "Budget Adaptation" Simulator Demo */}
      <div className="card p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-teal-500 text-slate-900">DEMO SIMULATOR</span>
              <h3 className="font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif' }}>Interactive Budget Adaptation Demo</h3>
            </div>
            <p className="text-xs text-slate-300 mt-0.5" style={{ fontFamily: 'Inter, sans-serif' }}>
              Simulate different remaining daily budgets to watch food recommendations adapt live:
            </p>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              onClick={() => setSimulatedBudgetOverride(150)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                simulatedBudgetOverride === 150 ? 'bg-teal-400 text-slate-950 shadow' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              ₹150/day (Normal)
            </button>
            <button
              onClick={() => setSimulatedBudgetOverride(80)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                simulatedBudgetOverride === 80 ? 'bg-amber-400 text-slate-950 shadow' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              ₹80/day (Low)
            </button>
            <button
              onClick={() => setSimulatedBudgetOverride(40)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                simulatedBudgetOverride === 40 ? 'bg-red-400 text-slate-950 shadow' : 'bg-slate-700 text-slate-200 hover:bg-slate-600'
              }`}
            >
              ₹40/day (Very Low)
            </button>
            {simulatedBudgetOverride !== undefined && (
              <button
                onClick={() => setSimulatedBudgetOverride(undefined)}
                className="text-xs text-slate-400 underline px-1 hover:text-white"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Filter Controls & Transparency Toggle */}
      <div className="card p-5 space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          {/* Diet selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-xs font-bold text-slate-400 uppercase mr-1" style={{ fontFamily: 'Sora, sans-serif' }}>Diet:</span>
            {(['vegetarian', 'non-vegetarian', 'eggitarian', 'vegan'] as const).map((d) => (
              <button
                key={d}
                onClick={() => handleDietChange(d)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all shrink-0 ${
                  filterOptions.dietType === d ? 'bg-teal-700 text-white shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
                style={{ fontFamily: 'Sora, sans-serif' }}
              >
                {d}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            {/* Search */}
            <input
              type="text"
              placeholder="Search meal or ingredient..."
              value={filterOptions.searchQuery || ''}
              onChange={(e) => setFilterOptions((prev) => ({ ...prev, searchQuery: e.target.value }))}
              className="rounded-xl px-3.5 py-1.5 text-xs border outline-none w-full md:w-48"
              style={{ borderColor: '#e2e8f0', fontFamily: 'Inter, sans-serif' }}
            />
            {/* Pipeline transparency button */}
            <button
              onClick={() => setShowPipeline(!showPipeline)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border bg-slate-50 text-slate-700 hover:bg-slate-100 shrink-0"
              style={{ borderColor: '#e2e8f0', fontFamily: 'Sora, sans-serif' }}
            >
              🔍 See How We Filtered ({pipeline.finalRankedCount})
            </button>
          </div>
        </div>

        {/* Meal Type Tabs */}
        <div className="flex items-center gap-1.5 border-t pt-3 overflow-x-auto" style={{ borderColor: '#f1f5f9' }}>
          <span className="text-xs font-bold text-slate-400 uppercase mr-1" style={{ fontFamily: 'Sora, sans-serif' }}>Meal:</span>
          {(['all', 'breakfast', 'lunch', 'dinner', 'snack', 'post-workout'] as const).map((m) => (
            <button
              key={m}
              onClick={() => handleMealTypeChange(m)}
              className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all shrink-0 ${
                filterOptions.mealType === m ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Filter Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t pt-3" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700">Max Meal Cost Cap:</span>
              <span className="font-mono-data font-bold text-teal-700">₹{filterOptions.maxCost}</span>
            </div>
            <input
              type="range"
              min={20}
              max={150}
              step={5}
              value={filterOptions.maxCost || 150}
              onChange={(e) => setFilterOptions((prev) => ({ ...prev, maxCost: Number(e.target.value) }))}
              className="w-full accent-teal-600 h-1.5 rounded-full cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-xs mb-1">
              <span className="font-semibold text-slate-700">Min Protein Threshold:</span>
              <span className="font-mono-data font-bold text-teal-700">{filterOptions.minProtein || 0}g</span>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              step={2}
              value={filterOptions.minProtein || 0}
              onChange={(e) => setFilterOptions((prev) => ({ ...prev, minProtein: Number(e.target.value) }))}
              className="w-full accent-teal-600 h-1.5 rounded-full cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Filter Transparency Panel ("See How We Filtered") */}
        {showPipeline && (
          <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3 fade-in border border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-teal-400 uppercase" style={{ fontFamily: 'Sora, sans-serif' }}>
                Filter Pipeline Audit & Transparency
              </span>
              <button onClick={() => setShowPipeline(false)} className="text-xs text-slate-400 hover:text-white">✕ Close</button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
              <div className="p-2 bg-slate-800 rounded-lg">
                <p className="text-slate-400">Total Dataset</p>
                <p className="font-mono-data font-bold text-base text-white">{pipeline.totalDatasetCount}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg">
                <p className="text-slate-400">After Diet ({filterOptions.dietType})</p>
                <p className="font-mono-data font-bold text-base text-teal-400">{pipeline.afterDietCount}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg">
                <p className="text-slate-400">After Exclusions</p>
                <p className="font-mono-data font-bold text-base text-blue-400">{pipeline.afterExclusionCount}</p>
              </div>
              <div className="p-2 bg-slate-800 rounded-lg">
                <p className="text-slate-400">After Budget</p>
                <p className="font-mono-data font-bold text-base text-amber-400">{pipeline.afterBudgetCount}</p>
              </div>
              <div className="p-2 bg-teal-900/60 border border-teal-500/40 rounded-lg">
                <p className="text-teal-300 font-bold">Final Ranked</p>
                <p className="font-mono-data font-bold text-base text-teal-300">{pipeline.finalRankedCount}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. "How SmartWear Decides" Algorithm Section Accordion */}
      {showAlgoInfo && (
        <div className="card p-6 bg-slate-50 border space-y-4 fade-in" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
              How SmartWear Decides (Personalized Rule-Based Recommendation Engine)
            </h3>
            <button onClick={() => setShowAlgoInfo(false)} className="text-xs font-semibold text-slate-400">✕ Close</button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-teal-700 block">STEP 1</span>
              <p className="font-semibold text-slate-900">Diet & Exclusions</p>
              <p className="text-slate-500">Hard filters out diet mismatches & user allergen exclusions.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-teal-700 block">STEP 2</span>
              <p className="font-semibold text-slate-900">Budget Fitting</p>
              <p className="text-slate-500">Calculates remaining daily food allowance (₹{budgetMetrics.dailyFoodBudget}/day).</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-teal-700 block">STEP 3</span>
              <p className="font-semibold text-slate-900">Goal & Activity</p>
              <p className="text-slate-500">Evaluated against {GOAL_LABELS[profile.goal] || profile.goal} goal & live {reading.motion} state.</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-teal-700 block">STEP 4</span>
              <p className="font-semibold text-slate-900">Transparent Scoring</p>
              <p className="text-slate-500">Calculates weighted match score (30% Goal, 20% Pref, 25% Budget, 15% Activity, 10% Nutrition).</p>
            </div>
            <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1">
              <span className="font-bold text-teal-700 block">STEP 5</span>
              <p className="font-semibold text-slate-900">Smart Alternatives</p>
              <p className="text-slate-500">Suggests lower-cost substitute options when meals exceed daily budget.</p>
            </div>
          </div>
        </div>
      )}

      {/* 6. Ranked Meal Recommendations List & Empty State */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Recommended Meals ({rankedMeals.length})
          </h3>
          <span className="text-xs text-slate-400 font-mono-data">Updated in real-time</span>
        </div>

        {/* 7. Improved Empty State (Requirement 6) */}
        {rankedMeals.length === 0 ? (
          <div className="card p-8 text-center text-slate-600 space-y-4 border-2 border-dashed" style={{ borderColor: '#cbd5e1' }}>
            <span className="text-4xl block">🔍</span>
            <div className="space-y-1">
              <h4 className="text-base font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>No exact matches found.</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto" style={{ fontFamily: 'Inter, sans-serif' }}>
                Try increasing your maximum meal cost cap slider, lowering the minimum protein threshold, or removing a food ingredient exclusion.
              </p>
            </div>
            <button
              onClick={resetFilters}
              className="btn-primary px-5 py-2.5 text-xs font-semibold"
            >
              Reset Filters & Show Affordable Options
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {rankedMeals.map((meal) => {
              const isExpanded = expandedCardId === meal.id

              return (
                <div
                  key={meal.id}
                  className="card p-6 flex flex-col justify-between hover:shadow-xl transition-all border-l-4"
                  style={{ borderColor: meal.score >= 80 ? '#0d9488' : '#3b82f6' }}
                >
                  <div>
                    {/* Top bar badges */}
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 capitalize">
                        {meal.mealType} · {meal.foodStyle}
                      </span>
                      <span className="font-mono-data font-bold text-xs text-teal-900 bg-teal-100 px-3 py-1 rounded-lg border border-teal-200">
                        Smart Match: {meal.score}%
                      </span>
                    </div>

                    {/* Title & Description */}
                    <h4 className="font-bold text-lg text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
                      {meal.name}
                    </h4>
                    <p className="text-xs text-slate-600 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
                      {meal.description}
                    </p>

                    {/* Macro pills */}
                    <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 text-center mb-4 border" style={{ borderColor: '#f1f5f9' }}>
                      <div>
                        <p className="text-xs text-slate-400">Calories</p>
                        <p className="font-mono-data font-bold text-slate-800 text-sm">{meal.calories}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Protein</p>
                        <p className="font-mono-data font-bold text-teal-600 text-sm">{meal.protein}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Carbs</p>
                        <p className="font-mono-data font-bold text-blue-600 text-sm">{meal.carbs}g</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-400">Fat</p>
                        <p className="font-mono-data font-bold text-amber-600 text-sm">{meal.fat}g</p>
                      </div>
                    </div>

                    {/* Recommendation Explanation — Always-Visible Score Chips */}
                    <div className="mb-4 bg-teal-50/70 rounded-xl border border-teal-100 overflow-hidden">
                      {/* Compact 5-factor score chips — always visible */}
                      <div className="px-3.5 py-2.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-bold text-teal-900 mr-1" style={{ fontFamily: 'Sora, sans-serif' }}>Match: {meal.score}%</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meal.goalScore >= 80 ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'}`}>
                          🎯 Goal {meal.goalScore}%
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meal.dietScore !== undefined && meal.dietScore >= 80 ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'}`}>
                          🥗 Diet ✓
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meal.prefScore >= 70 ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'}`}>
                          ⭐ Pref {meal.prefScore}%
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meal.budgetScore >= 70 ? 'bg-emerald-200 text-emerald-900' : meal.budgetScore >= 40 ? 'bg-amber-200 text-amber-900' : 'bg-red-200 text-red-900'}`}>
                          💰 Budget {meal.budgetScore}%
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${meal.activityScore >= 70 ? 'bg-teal-200 text-teal-900' : 'bg-slate-200 text-slate-700'}`}>
                          🏃 Activity {meal.activityScore}%
                        </span>
                      </div>

                      {/* Reasons bullet points */}
                      <div className="px-3.5 pb-2 space-y-1">
                        {meal.reasons.map((r, idx) => (
                          <p key={idx} className="text-xs text-teal-800 flex items-center gap-1.5" style={{ fontFamily: 'Inter, sans-serif' }}>
                            <span className="text-teal-600 font-bold">✓</span>
                            <span>{r}</span>
                          </p>
                        ))}
                      </div>

                      {/* Expand toggle for detailed progress bar breakdown */}
                      <button
                        onClick={() => setExpandedCardId(isExpanded ? null : meal.id)}
                        className="w-full px-3.5 py-2 flex items-center justify-between text-xs font-bold text-teal-700 hover:bg-teal-100/50 transition-all text-left border-t border-teal-200/60"
                        style={{ fontFamily: 'Sora, sans-serif' }}
                      >
                        <span className="flex items-center gap-1.5">
                          <span>📊</span>
                          <span>Detailed Score Breakdown</span>
                        </span>
                        <span className="text-slate-400">{isExpanded ? '▲ Hide' : '▼ Expand'}</span>
                      </button>

                      {/* Expandable Factor Weights & Scores Table */}
                      {isExpanded && (
                        <div className="px-3.5 py-3 border-t border-teal-200/60 bg-white space-y-2 text-xs fade-in">
                          <p className="font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Transparent Factor Scoring Breakdown:</p>

                          <div className="space-y-1.5">
                            <div>
                              <div className="flex justify-between text-slate-700">
                                <span>Goal Match (30% weight):</span>
                                <span className="font-mono-data font-bold text-teal-700">{meal.goalScore}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-teal-500" style={{ width: `${meal.goalScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-700">
                                <span>Food Preference (20% weight):</span>
                                <span className="font-mono-data font-bold text-teal-700">{meal.prefScore}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-teal-500" style={{ width: `${meal.prefScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-700">
                                <span>Budget Fit (25% weight):</span>
                                <span className="font-mono-data font-bold text-teal-700">{meal.budgetScore}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-teal-500" style={{ width: `${meal.budgetScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-700">
                                <span>Activity Match (15% weight):</span>
                                <span className="font-mono-data font-bold text-teal-700">{meal.activityScore}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-teal-500" style={{ width: `${meal.activityScore}%` }} />
                              </div>
                            </div>

                            <div>
                              <div className="flex justify-between text-slate-700">
                                <span>Nutrition Fit (10% weight):</span>
                                <span className="font-mono-data font-bold text-teal-700">{meal.nutritionScore}%</span>
                              </div>
                              <div className="h-1 rounded-full bg-slate-100 overflow-hidden">
                                <div className="h-full bg-teal-500" style={{ width: `${meal.nutritionScore}%` }} />
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 8. Side-by-Side Comparison Feature (Requirement 5) */}
                    {meal.affordableAlternative && (
                      <div className="mb-4 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-2">
                        <div className="flex items-center justify-between font-bold" style={{ fontFamily: 'Sora, sans-serif' }}>
                          <span>💡 Smart Affordable Comparison</span>
                          <span className="text-amber-700">Reason: Similar meal purpose, lower cost</span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 p-2 bg-white rounded-lg border border-amber-200">
                          <div>
                            <p className="text-slate-400 font-medium">Recommended Option</p>
                            <p className="font-bold text-slate-900">{meal.name}</p>
                            <p className="font-mono-data font-bold text-slate-700">₹{meal.estimatedCost}</p>
                          </div>

                          <div className="border-l border-amber-200 pl-2">
                            <p className="text-teal-700 font-bold">Smart Alternative</p>
                            <p className="font-bold text-teal-900">{meal.affordableAlternative.name}</p>
                            <p className="font-mono-data font-bold text-teal-700">₹{meal.affordableAlternative.estimatedCost} <span className="text-xs font-normal text-amber-800">(Saves ₹{meal.estimatedCost - meal.affordableAlternative.estimatedCost})</span></p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer price & prep time */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <span className="text-xs text-slate-400">Prep time: {meal.preparationTime} mins</span>
                    <div className="text-right">
                      <span className="text-xs text-slate-400 block">Estimated Cost</span>
                      <span className="font-mono-data text-lg font-bold text-teal-700">₹{meal.estimatedCost}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Wellness & Medical Disclaimer */}
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3">
        <span className="text-lg">ℹ️</span>
        <p className="text-xs text-amber-900" style={{ fontFamily: 'Inter, sans-serif' }}>
          <strong>Wellness Disclaimer:</strong> SmartWear meal recommendations are generated by a personalized rule-based recommendation engine for fitness and budget optimization. They are not medical prescriptions or clinical dietary diagnoses.
        </p>
      </div>
    </div>
  )
}
