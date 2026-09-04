import type { UserProfile } from '../App'
import OnboardingHeader from '../components/OnboardingHeader'

const ACTIVITY_LEVELS = [
  { val: 'sedentary', label: 'Sedentary', desc: 'Little or no exercise' },
  { val: 'light', label: 'Light', desc: '1–3 days/week' },
  { val: 'moderate', label: 'Moderate', desc: '3–5 days/week' },
  { val: 'active', label: 'Active', desc: '6–7 days/week' },
  { val: 'very-active', label: 'Very Active', desc: 'Athlete / physical job' },
]

const EXERCISES = ['Running', 'Cycling', 'Swimming', 'Weightlifting', 'Yoga', 'HIIT', 'Walking', 'Football', 'Basketball', 'Cricket', 'Boxing']

interface Props {
  profile: UserProfile
  onChange: (p: Partial<UserProfile>) => void
  onNext: () => void
  onBack: () => void
}

export default function PersonalDetails({ profile, onChange, onNext, onBack }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      {/* Onboarding Header */}
      <OnboardingHeader currentStep={2} onBack={onBack} />

      <div className="w-full max-w-2xl space-y-6 fade-in">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            Tell us about yourself
          </h2>
          <p style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            We use this to calibrate your daily targets and recommendations.
          </p>
        </div>

        <div className="card p-6 border shadow-xs bg-white rounded-2xl space-y-5" style={{ borderColor: '#e2e8f0' }}>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {/* Age */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Age</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={10} max={80}
                  value={profile.age}
                  onChange={(e) => onChange({ age: +e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:ring-2"
                  style={{ borderColor: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <span className="text-sm shrink-0" style={{ color: '#64748b' }}>yrs</span>
              </div>
            </div>
            {/* Height */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Height</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={100} max={220}
                  value={profile.height}
                  onChange={(e) => onChange({ height: +e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:ring-2"
                  style={{ borderColor: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <span className="text-sm shrink-0" style={{ color: '#64748b' }}>cm</span>
              </div>
            </div>
            {/* Weight */}
            <div>
              <label className="block text-sm font-semibold mb-1.5" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Weight</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={30} max={200}
                  value={profile.weight}
                  onChange={(e) => onChange({ weight: +e.target.value })}
                  className="w-full rounded-xl px-4 py-2.5 text-sm border outline-none focus:ring-2"
                  style={{ borderColor: '#e2e8f0', fontFamily: 'JetBrains Mono, monospace' }}
                />
                <span className="text-sm shrink-0" style={{ color: '#64748b' }}>kg</span>
              </div>
            </div>
          </div>

          {/* BMI preview */}
          <div className="rounded-xl p-3" style={{ background: '#f0fdf9' }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>Estimated BMI</span>
              <span className="font-mono-data font-bold" style={{ color: '#0d9488' }}>
                {(profile.weight / ((profile.height / 100) ** 2)).toFixed(1)}
                <span className="text-xs font-normal ml-1" style={{ color: '#64748b' }}>
                  {(() => {
                    const bmi = profile.weight / ((profile.height / 100) ** 2)
                    if (bmi < 18.5) return '· Underweight'
                    if (bmi < 25) return '· Normal'
                    if (bmi < 30) return '· Overweight'
                    return '· Obese'
                  })()}
                </span>
              </span>
            </div>
          </div>

          {/* Activity Level */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Activity Level</label>
            <div className="flex flex-wrap gap-2">
              {ACTIVITY_LEVELS.map((a) => (
                <button
                  key={a.val}
                  type="button"
                  onClick={() => onChange({ activityLevel: a.val })}
                  className="px-4 py-2 rounded-xl text-sm font-medium border transition-all cursor-pointer"
                  style={{
                    background: profile.activityLevel === a.val ? '#0d9488' : 'white',
                    color: profile.activityLevel === a.val ? 'white' : '#64748b',
                    borderColor: profile.activityLevel === a.val ? '#0d9488' : '#e2e8f0',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Exercise */}
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Primary Exercise</label>
            <div className="flex flex-wrap gap-2">
              {EXERCISES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => onChange({ primaryExercise: ex })}
                  className="px-3 py-1.5 rounded-lg text-sm border transition-all cursor-pointer"
                  style={{
                    background: profile.primaryExercise === ex ? '#ccfbf1' : 'white',
                    color: profile.primaryExercise === ex ? '#0f766e' : '#64748b',
                    borderColor: profile.primaryExercise === ex ? '#0d9488' : '#e2e8f0',
                    fontFamily: 'Inter, sans-serif',
                  }}
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={onNext}
          className="btn-primary w-full py-4 text-base font-bold shadow-md hover:shadow-lg cursor-pointer"
        >
          Continue →
        </button>
      </div>
    </div>
  )
}
