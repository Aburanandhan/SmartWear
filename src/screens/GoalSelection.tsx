import type { Goal } from '../App'
import OnboardingHeader from '../components/OnboardingHeader'

const GOALS: { id: Goal; label: string; icon: string; desc: string; color: string; bg: string }[] = [
  { id: 'athlete', label: 'Athlete', icon: '🏅', desc: 'Competition training, peak performance', color: '#0d9488', bg: '#ccfbf1' },
  { id: 'gym', label: 'Muscle & Fitness', icon: '💪', desc: 'Regular gym sessions, muscle tone', color: '#3b82f6', bg: '#dbeafe' },
  { id: 'general', label: 'General Health', icon: '🌿', desc: 'Stay active, feel better daily', color: '#22c55e', bg: '#dcfce7' },
  { id: 'strength', label: 'Strength', icon: '🏋️', desc: 'Progressive overload, power gains', color: '#8b5cf6', bg: '#ede9fe' },
  { id: 'weight', label: 'Weight Management', icon: '⚖️', desc: 'Healthy weight loss or maintenance', color: '#f59e0b', bg: '#fef3c7' },
  { id: 'endurance', label: 'Endurance', icon: '🚴', desc: 'Cardio, stamina, long distances', color: '#ef4444', bg: '#fee2e2' },
]

interface Props {
  value: Goal
  onChange: (g: Goal) => void
  onNext: () => void
  onBack: () => void
}

export default function GoalSelection({ value, onChange, onNext, onBack }: Props) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 sm:px-6 py-10 sm:py-12">
      {/* Onboarding Header */}
      <OnboardingHeader currentStep={1} onBack={onBack} />

      <div className="w-full max-w-2xl space-y-6 fade-in">
        <div>
          <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: '1.875rem', color: '#0f172a', marginBottom: '0.5rem' }}>
            Primary Goal
          </h2>
          <p style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            We'll personalize your fitness, nutrition, and monitoring around your goal.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {GOALS.map((g, i) => (
            <button
              key={g.id}
              onClick={() => onChange(g.id)}
              className="text-left p-5 rounded-2xl border-2 transition-all slide-up cursor-pointer"
              style={{
                animationDelay: `${i * 0.06}s`,
                animationFillMode: 'both',
                background: value === g.id ? g.bg : 'white',
                borderColor: value === g.id ? g.color : '#e2e8f0',
                boxShadow: value === g.id ? `0 0 0 3px ${g.color}22` : '0 1px 3px rgba(0,0,0,0.06)',
                transform: value === g.id ? 'translateY(-2px)' : 'none',
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">{g.icon}</span>
                <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: '1rem', color: value === g.id ? g.color : '#0f172a' }}>
                  {g.label}
                </span>
              </div>
              <p className="text-sm" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>{g.desc}</p>
            </button>
          ))}
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
