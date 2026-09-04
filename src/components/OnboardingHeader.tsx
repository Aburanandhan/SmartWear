export interface OnboardingStepConfig {
  step: 1 | 2 | 3 | 4
  title: string
  subtitle?: string
}

export const TOTAL_ONBOARDING_STEPS = 4

export const ONBOARDING_STEPS: OnboardingStepConfig[] = [
  { step: 1, title: 'Primary Goal' },
  { step: 2, title: 'Personal Information' },
  { step: 3, title: 'Food Preferences', subtitle: 'Food Preferences' },
  { step: 4, title: 'Smart Fitness Budget' },
]

interface Props {
  currentStep: 1 | 2 | 3 | 4
  onBack: () => void
  onSkip?: () => void
}

export default function OnboardingHeader({ currentStep, onBack, onSkip }: Props) {
  const stepConfig = ONBOARDING_STEPS.find((s) => s.step === currentStep) || ONBOARDING_STEPS[0]

  return (
    <div className="w-full max-w-2xl mx-auto mb-6 sm:mb-8">
      {/* Top row: Back button on left, Step Indicator (and optional Skip) on right */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-teal-700 transition-colors cursor-pointer py-1"
          style={{ fontFamily: 'Inter, sans-serif' }}
        >
          <span>←</span>
          <span>Back</span>
        </button>

        <div className="flex items-center gap-2">
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-xs font-semibold px-2.5 py-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-all cursor-pointer"
              style={{ fontFamily: 'Inter, sans-serif' }}
            >
              Skip for now →
            </button>
          )}
          <span
            className="text-xs font-bold px-3 py-1 rounded-full bg-teal-100 text-teal-800 tracking-wide shadow-xs"
            style={{ fontFamily: 'Inter, sans-serif' }}
          >
            Step {currentStep} of {TOTAL_ONBOARDING_STEPS}
            {stepConfig.subtitle ? ` · ${stepConfig.subtitle}` : ''}
          </span>
        </div>
      </div>

      {/* 4-Step Synchronized Progress Bar (25%, 50%, 75%, 100%) */}
      <div className="flex gap-2 w-full">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className="h-1.5 flex-1 rounded-full transition-all duration-300"
            style={{
              background: s <= currentStep ? '#0d9488' : '#e2e8f0',
            }}
          />
        ))}
      </div>
    </div>
  )
}
