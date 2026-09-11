import { useMemo, useState } from 'react'
import type { UserProfile } from '../App'
import type { DietType, FoodStyle } from '../data/foods'
import OnboardingHeader from '../components/OnboardingHeader'
import { searchFoods } from '../services/nutrition/foodDatabase'

const DIET_TYPES: { id: DietType; label: string; icon: string; desc: string }[] = [
  { id: 'vegetarian', label: 'Vegetarian', icon: '🌿', desc: 'Plant foods + dairy, no meat or eggs' },
  { id: 'non-vegetarian', label: 'Non-Vegetarian', icon: '🍗', desc: 'Includes chicken, fish, eggs & meat' },
  { id: 'eggitarian', label: 'Eggitarian', icon: '🥚', desc: 'Vegetarian diet + eggs allowed' },
  { id: 'vegan', label: 'Vegan', icon: '🌱', desc: '100% plant-based, zero animal products' },
]

const FOOD_STYLES: { id: FoodStyle; label: string; icon: string }[] = [
  { id: 'south-indian', label: 'South Indian', icon: '🍛' },
  { id: 'north-indian', label: 'North Indian', icon: '🥘' },
  { id: 'mixed-indian', label: 'Mixed Indian', icon: '🥗' },
  { id: 'no-preference', label: 'No Preference', icon: '🌐' },
]

const EXCLUSION_OPTIONS = ['Eggs', 'Milk/Dairy', 'Peanuts', 'Nuts', 'Soy', 'Gluten', 'Seafood', 'Chicken', 'Mutton']

const FOOD_CATEGORY_HINTS = ['Grains & Staples', 'Eggs', 'Meat & Poultry', 'Fish', 'Dairy', 'Nuts & Seeds', 'Vegetables', 'Fruits', 'Legumes', 'South Indian', 'North Indian', 'Other']

interface Props {
  profile: UserProfile
  onChange: (p: Partial<UserProfile>) => void
  onNext: () => void
  onBack: () => void
  onSkip: () => void
}

export default function FoodPreferencesSetup({ profile, onChange, onNext, onBack, onSkip }: Props) {
  const [diet, setDiet] = useState<DietType>(profile.dietType || 'vegetarian')
  const [style, setStyle] = useState<FoodStyle>(profile.foodStyle || 'mixed-indian')
  const [excluded, setExcluded] = useState<string[]>(profile.excludedFoods || [])
  const [preferred, setPreferred] = useState<string[]>(profile.preferredFoods || [])
  const [searchTerm, setSearchTerm] = useState('')
  const [customFoodName, setCustomFoodName] = useState('')

  const foodSuggestions = useMemo(() => {
    const query = searchTerm.trim()
    const options = query ? searchFoods(query) : searchFoods('')
    return options
      .filter((food) => !preferred.some((item) => item.toLowerCase() === food.name.toLowerCase()))
      .slice(0, 12)
  }, [preferred, searchTerm])

  const toggleExclusion = (item: string) => {
    const next = excluded.includes(item) ? excluded.filter((x) => x !== item) : [...excluded, item]
    setExcluded(next)
  }

  const togglePreference = (item: string) => {
    const next = preferred.includes(item) ? preferred.filter((x) => x !== item) : [...preferred, item]
    setPreferred(next)
  }

  const addCustomFood = () => {
    const name = customFoodName.trim()
    if (!name) return
    const formatted = name.split(/\s+/).map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1)).join(' ')
    if (!preferred.some((item) => item.toLowerCase() === formatted.toLowerCase())) {
      setPreferred((curr) => [...curr, formatted])
    }
    setCustomFoodName('')
  }

  const handleContinue = () => {
    onChange({
      dietType: diet,
      foodStyle: style,
      excludedFoods: excluded,
      preferredFoods: preferred,
    })
    onNext()
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      <OnboardingHeader currentStep={3} onBack={onBack} onSkip={onSkip} />

      <div className="w-full max-w-3xl space-y-6 fade-in">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            Step 3 of 4
          </h2>
          <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            Food Preferences
          </h3>
          <p style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            Tell SmartWear what foods you prefer. We&apos;ll use your choices when creating nutrition recommendations and tracking your nutrients.
          </p>
        </div>

        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Diet Type
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {DIET_TYPES.map((dt) => (
              <button
                key={dt.id}
                type="button"
                onClick={() => setDiet(dt.id)}
                className="text-left p-3.5 rounded-xl border-2 transition-all cursor-pointer"
                style={{
                  background: diet === dt.id ? '#ccfbf1' : 'white',
                  borderColor: diet === dt.id ? '#0d9488' : '#e2e8f0',
                }}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xl">{dt.icon}</span>
                  <span className="font-bold text-sm" style={{ fontFamily: 'Sora, sans-serif', color: diet === dt.id ? '#0f766e' : '#0f172a' }}>
                    {dt.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>{dt.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Food Style
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FOOD_STYLES.map((fs) => (
              <button
                key={fs.id}
                type="button"
                onClick={() => setStyle(fs.id)}
                className="p-3 rounded-xl text-center border-2 transition-all cursor-pointer"
                style={{
                  background: style === fs.id ? '#0d9488' : 'white',
                  color: style === fs.id ? 'white' : '#0f172a',
                  borderColor: style === fs.id ? '#0d9488' : '#e2e8f0',
                }}
              >
                <span className="text-xl block mb-1">{fs.icon}</span>
                <span className="text-xs font-semibold block" style={{ fontFamily: 'Sora, sans-serif' }}>{fs.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Excluded Foods / Allergens
          </label>
          <div className="flex flex-wrap gap-2">
            {EXCLUSION_OPTIONS.map((item) => {
              const active = excluded.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => toggleExclusion(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    active ? 'bg-red-100 border-red-400 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {active ? `✕ Exclude ${item}` : `+ ${item}`}
                </button>
              )
            })}
          </div>
        </div>

        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <div className="flex items-center justify-between gap-3 mb-3">
            <label className="block text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              My Preferred Foods
            </label>
            <span className="text-xs text-slate-500">{preferred.length} selected</span>
          </div>

          <p className="text-sm text-slate-600 mb-4" style={{ fontFamily: 'Inter, sans-serif' }}>
            Tell SmartWear what foods you prefer. We&apos;ll use your choices when creating nutrition recommendations and tracking your nutrients.
          </p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Search food</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search foods..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-500"
              />
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            {FOOD_CATEGORY_HINTS.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSearchTerm(category)}
                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
              >
                {category}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {foodSuggestions.map((food) => {
              const isSelected = preferred.includes(food.name)
              return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => togglePreference(food.name)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm transition-all ${
                    isSelected ? 'border-teal-500 bg-teal-50 text-teal-900' : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300'
                  }`}
                >
                  <span className="block font-semibold">{isSelected ? '✓ ' : ''}{food.name}</span>
                  <span className="block text-[11px] text-slate-500">{food.category}</span>
                </button>
              )
            })}
          </div>

          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-3 mb-4">
            <label className="block text-xs font-semibold text-slate-700 mb-2">Add custom food</label>
            <div className="flex gap-2">
              <input
                value={customFoodName}
                onChange={(event) => setCustomFoodName(event.target.value)}
                placeholder="Food name"
                className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-teal-500"
              />
              <button type="button" onClick={addCustomFood} className="btn-primary px-4 py-2 text-xs font-semibold">
                + Add
              </button>
            </div>
          </div>

          {preferred.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {preferred.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => togglePreference(item)}
                  className="rounded-full bg-teal-100 border border-teal-200 px-3 py-1.5 text-xs font-semibold text-teal-800"
                >
                  {item} ×
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
              You haven&apos;t selected your preferred foods yet.
            </div>
          )}
        </div>

        <button onClick={handleContinue} className="btn-primary w-full py-4 text-base font-bold shadow-md hover:shadow-lg cursor-pointer">
          Continue →
        </button>
      </div>
    </div>
  )
}
