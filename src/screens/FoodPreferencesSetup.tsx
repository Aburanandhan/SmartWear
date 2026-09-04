import { useState } from 'react'
import type { UserProfile } from '../App'
import type { DietType, FoodStyle } from '../data/foods'
import OnboardingHeader from '../components/OnboardingHeader'

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

const PREFERRED_OPTIONS = ['Rice', 'Ragi', 'Idli', 'Dosa', 'Chapati', 'Oats', 'Eggs', 'Paneer', 'Chicken', 'Fish', 'Dal', 'Curd', 'Fruits', 'Vegetables']

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

  const toggleExclusion = (item: string) => {
    const next = excluded.includes(item) ? excluded.filter((x) => x !== item) : [...excluded, item]
    setExcluded(next)
  }

  const togglePreference = (item: string) => {
    const next = preferred.includes(item) ? preferred.filter((x) => x !== item) : [...preferred, item]
    setPreferred(next)
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
      {/* Onboarding Header */}
      <OnboardingHeader currentStep={3} onBack={onBack} onSkip={onSkip} />

      <div className="w-full max-w-2xl space-y-6 fade-in">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            Personalize your food choices
          </h2>
          <p style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            We'll filter out unwanted ingredients and prioritize meals you love within your budget.
          </p>
        </div>

        {/* 1. Diet Type Selector */}
        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Select Diet Type
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

        {/* 2. Food Style Selector */}
        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Cuisine / Food Style
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

        {/* 3. Exclude Ingredients / Allergies */}
        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Exclude Foods / Ingredients (Strict Exclusions)
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

        {/* 4. Preferred Foods */}
        <div className="card p-5 border shadow-xs bg-white rounded-2xl" style={{ borderColor: '#e2e8f0' }}>
          <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
            Preferred Foods / Staple Ingredients
          </label>
          <div className="flex flex-wrap gap-2">
            {PREFERRED_OPTIONS.map((item) => {
              const active = preferred.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => togglePreference(item)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    active ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                >
                  {active ? `✓ ${item}` : `+ ${item}`}
                </button>
              )
            })}
          </div>
        </div>

        <button
          onClick={handleContinue}
          className="btn-primary w-full py-4 text-base font-bold shadow-md hover:shadow-lg cursor-pointer"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
