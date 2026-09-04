import { useState } from 'react'
import type { UserProfile, Goal } from '../App'
import type { DietType, FoodStyle } from '../data/foods'
import { saveUserProfile } from '../services/profileService'

interface Props {
  profile: UserProfile
  userId?: string
  onUpdate: (p: Partial<UserProfile>) => void
}

const GOALS: { id: Goal; label: string }[] = [
  { id: 'athlete', label: 'Athlete' },
  { id: 'gym', label: 'Muscle & Fitness' },
  { id: 'general', label: 'General Health' },
  { id: 'strength', label: 'Strength' },
  { id: 'weight', label: 'Weight Management' },
  { id: 'endurance', label: 'Endurance' },
]

const EXCLUSION_OPTIONS = ['Eggs', 'Milk/Dairy', 'Peanuts', 'Nuts', 'Soy', 'Gluten', 'Seafood', 'Chicken', 'Mutton']
const PREFERRED_OPTIONS = ['Rice', 'Ragi', 'Idli', 'Dosa', 'Chapati', 'Oats', 'Eggs', 'Paneer', 'Chicken', 'Fish', 'Dal', 'Curd', 'Fruits', 'Vegetables']

export default function Profile({ profile, userId, onUpdate }: Props) {
  const [form, setForm] = useState<UserProfile>(profile)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMsg('')
    onUpdate(form)

    if (userId) {
      const ok = await saveUserProfile(userId, form)
      if (ok) setMsg('Profile & food preferences saved to Supabase!')
      else setMsg('Saved locally.')
    } else {
      setMsg('Profile updated for demo session.')
    }
    setSaving(false)
  }

  const toggleExclusion = (item: string) => {
    const current = form.excludedFoods || []
    const updated = current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
    setForm({ ...form, excludedFoods: updated })
  }

  const togglePreference = (item: string) => {
    const current = form.preferredFoods || []
    const updated = current.includes(item) ? current.filter((x) => x !== item) : [...current, item]
    setForm({ ...form, preferredFoods: updated })
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>
            Personal Fitness & Food Profile
          </h2>
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            Calibrates baseline goals, food restrictions, and budget-aware meal recommendations
          </p>
        </div>

        {msg && (
          <div className="p-3 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold">
            {msg}
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Physical & Fitness Goals */}
          <div className="space-y-4 border-b pb-5" style={{ borderColor: '#f1f5f9' }}>
            <h3 className="font-bold text-sm text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>1. Physical & Activity Baseline</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Fitness Goal</label>
              <select
                value={form.goal}
                onChange={(e) => setForm({ ...form, goal: e.target.value as Goal })}
                className="w-full rounded-xl p-2.5 text-sm border outline-none bg-white font-medium"
                style={{ borderColor: '#e2e8f0' }}
              >
                {GOALS.map((g) => (
                  <option key={g.id} value={g.id}>{g.label}</option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Age (yrs)</label>
                <input
                  type="number"
                  value={form.age}
                  onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none font-mono-data"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Height (cm)</label>
                <input
                  type="number"
                  value={form.height}
                  onChange={(e) => setForm({ ...form, height: Number(e.target.value) })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none font-mono-data"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Weight (kg)</label>
                <input
                  type="number"
                  value={form.weight}
                  onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none font-mono-data"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Activity Level</label>
                <select
                  value={form.activityLevel}
                  onChange={(e) => setForm({ ...form, activityLevel: e.target.value })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none bg-white font-medium"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="sedentary">Sedentary</option>
                  <option value="light">Light</option>
                  <option value="moderate">Moderate</option>
                  <option value="active">Active</option>
                  <option value="very-active">Very Active</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Exercise</label>
                <input
                  type="text"
                  value={form.primaryExercise}
                  onChange={(e) => setForm({ ...form, primaryExercise: e.target.value })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none font-medium"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>
            </div>
          </div>

          {/* Section 2: Dietary Preferences & Restrictions */}
          <div className="space-y-4">
            <h3 className="font-bold text-sm text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>2. Dietary Preferences & Restrictions</h3>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Diet Type</label>
                <select
                  value={form.dietType}
                  onChange={(e) => setForm({ ...form, dietType: e.target.value as DietType })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none bg-white font-medium capitalize"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="vegetarian">Vegetarian 🌿</option>
                  <option value="non-vegetarian">Non-Vegetarian 🍗</option>
                  <option value="eggitarian">Eggitarian 🥚</option>
                  <option value="vegan">Vegan 🌱</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Cuisine / Food Style</label>
                <select
                  value={form.foodStyle}
                  onChange={(e) => setForm({ ...form, foodStyle: e.target.value as FoodStyle })}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none bg-white font-medium capitalize"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="south-indian">South Indian 🍛</option>
                  <option value="north-indian">North Indian 🥘</option>
                  <option value="mixed-indian">Mixed Indian 🥗</option>
                  <option value="no-preference">No Preference 🌐</option>
                </select>
              </div>
            </div>

            {/* Excluded ingredients */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Excluded Ingredients / Allergens</label>
              <div className="flex flex-wrap gap-1.5">
                {EXCLUSION_OPTIONS.map((item) => {
                  const active = (form.excludedFoods || []).includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => toggleExclusion(item)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        active ? 'bg-red-100 border-red-400 text-red-700' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {active ? `✕ ${item}` : `+ ${item}`}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Preferred foods */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Foods / Ingredients</label>
              <div className="flex flex-wrap gap-1.5">
                {PREFERRED_OPTIONS.map((item) => {
                  const active = (form.preferredFoods || []).includes(item)
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => togglePreference(item)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                        active ? 'bg-teal-100 border-teal-500 text-teal-800' : 'bg-slate-50 border-slate-200 text-slate-600'
                      }`}
                    >
                      {active ? `✓ ${item}` : `+ ${item}`}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          <button type="submit" disabled={saving} className="btn-primary w-full py-3.5 text-sm font-bold">
            {saving ? 'Saving...' : 'Save Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  )
}
