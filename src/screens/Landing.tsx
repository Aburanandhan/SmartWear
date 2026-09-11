interface Props {
  onStart: () => void
  onDemo: () => void
  onOpenAuth?: () => void
}

const navItems = [
  { label: 'Features', id: 'features' },
  { label: 'How it works', id: 'how-it-works' },
  { label: 'Pricing', id: 'pricing' },
]

const featureCards = [
  {
    icon: '❤️',
    title: 'Real-Time Health Monitoring',
    text: 'Monitor available wearable measurements such as temperature, heart rate and SpO₂.',
  },
  {
    icon: '🏃',
    title: 'Smart Activity Tracking',
    text: 'Track workouts, movement, steps and activity using the SmartWear wearable and supported smartwatch data.',
  },
  {
    icon: '🥗',
    title: 'Personalized Nutrition',
    text: 'Get food recommendations based on your fitness goal, diet preference, food style, excluded ingredients and available budget.',
  },
  {
    icon: '💰',
    title: 'Smart Budget Management',
    text: 'Track your monthly fitness spending and see how much budget remains for food, supplements, hydration and recovery.',
  },
  {
    icon: '🧠',
    title: 'Smart Adjustment',
    text: 'Use real sensor and activity data to identify changes in workout conditions and provide fitness and wellness recommendations.',
  },
  {
    icon: '⌚',
    title: 'Smartwatch Integration',
    text: 'Connect a compatible real smartwatch through supported health platforms and sync real activity data such as steps and calories.',
  },
]

const steps = [
  {
    number: '01',
    title: 'Create Your Profile',
    desc: 'Choose your fitness goal, personal information, food preferences and monthly fitness budget.',
  },
  {
    number: '02',
    title: 'Connect Your Wearables',
    desc: 'Connect the SmartWear ESP32 wearable and, when supported, your real smartwatch or health platform.',
  },
  {
    number: '03',
    title: 'SmartWear Collects Your Data',
    desc: 'Use available sensor and activity data to understand workouts, movement, hydration and fitness activity.',
  },
  {
    number: '04',
    title: 'Get Personalized Guidance',
    desc: 'SmartWear combines your goal, activity, nutrition preferences, remaining budget and available wearable data to provide personalized recommendations.',
  },
]

const budgetExamples = [
  { amount: '₹2,000 / month', title: 'Starter' },
  { amount: '₹5,000 / month', title: 'Balanced' },
  { amount: '₹10,000 / month', title: 'Performance' },
]

const categoryRows = [
  'Food',
  'Supplements',
  'Hydration',
  'Recovery',
  'Gear / Other',
]

export default function Landing({ onStart, onDemo, onOpenAuth }: Props) {
  const scrollToSection = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    event.preventDefault()
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #ccfbf1 40%, #e0f2fe 100%)', backgroundImage: 'radial-gradient(circle, #0d948818 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-4 md:px-8 py-5 max-w-7xl mx-auto w-full gap-4">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0d9488' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 6 3 11c0 2.5 1 4.8 2.6 6.5L12 22l6.4-4.5C20 16 21 13.5 21 11c0-5-4-9-9-9z" fill="white" fillOpacity="0.9"/>
              <path d="M12 7v8M9 10h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display font-700 text-xl" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#0f172a' }}>SmartWear</span>
        </div>

        <div className="flex items-center justify-end gap-2 md:gap-6 flex-wrap">
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => scrollToSection(event, item.id)}
              className="text-sm font-medium cursor-pointer rounded-lg px-2 py-1.5 transition-all hover:bg-white/40 hover:text-[#0f172a]"
              style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}
            >
              {item.label}
            </a>
          ))}
          <button onClick={onOpenAuth || onStart} className="text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:bg-slate-100" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>
            Sign In
          </button>
          <button onClick={onStart} className="btn-primary px-5 py-2 text-sm">Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-between max-w-7xl mx-auto px-8 py-12 gap-12 w-full">
        <div className="flex-1 max-w-xl fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-6" style={{ background: '#ccfbf1', color: '#0f766e', fontFamily: 'Inter, sans-serif' }}>
            <span className="pulse-dot w-2 h-2 rounded-full inline-block" style={{ background: '#0d9488' }}></span>
            ESP32 Smart Hydration Belt Connected
          </div>
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(2.2rem, 5vw, 3.5rem)', lineHeight: 1.1, color: '#0f172a', marginBottom: '1rem' }}>
            Your body.<br />
            <span style={{ color: '#0d9488' }}>Your activity.</span><br />
            Your plan.
          </h1>
          <p className="text-lg mb-8" style={{ color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            Real-time wearable monitoring with personalized fitness, nutrition and budget guidance — all in one intelligent platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <button onClick={onStart} className="btn-primary px-7 py-3.5 text-base">
              Get Started →
            </button>
            <button onClick={onDemo} className="btn-outline px-7 py-3.5 text-base">
              Explore Demo
            </button>
          </div>
          <div className="flex items-center gap-8 mt-10">
            {[
              { val: '98%', label: 'SpO₂ Accuracy' },
              { val: '24/7', label: 'Live Monitoring' },
              { val: '₹2K+', label: 'Starting Budget' },
            ].map((s) => (
              <div key={s.label}>
                <div className="font-mono-data text-2xl font-bold" style={{ color: '#0d9488' }}>{s.val}</div>
                <div className="text-xs mt-0.5" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Belt Illustration */}
        <div className="flex-1 flex items-center justify-center max-w-lg fade-in" style={{ animationDelay: '0.15s' }}>
          <div className="relative float">
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)', transform: 'scale(1.3)' }} />
            <div className="card p-8 relative" style={{ width: 340, background: 'white' }}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>SmartWear Belt v2</p>
                  <p className="text-sm" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>ESP32 · BLE 5.0</p>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold" style={{ background: '#dcfce7', color: '#16a34a' }}>
                  <span className="pulse-dot w-1.5 h-1.5 rounded-full" style={{ background: '#16a34a' }}></span>
                  Live
                </div>
              </div>

              <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-4 rounded-full opacity-60" style={{ background: 'rgba(255,255,255,0.3)' }} />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="h-3 rounded-full flex-1" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }} />
                  <div className="w-12 h-6 rounded-lg" style={{ background: 'rgba(255,255,255,0.9)' }}>
                    <div className="w-full h-full rounded-lg flex items-center justify-center">
                      <div className="w-6 h-1.5 rounded-full" style={{ background: '#0d9488' }} />
                    </div>
                  </div>
                  <div className="h-3 rounded-full flex-1" style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)' }} />
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.7)', fontFamily: 'Inter, sans-serif' }}>Body/Skin Temperature</p>
                  <p className="font-mono-data text-2xl font-bold text-white">36.8°C</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Heart Rate', val: '78', unit: 'BPM', color: '#ef4444', bg: '#fee2e2' },
                  { label: 'SpO₂', val: '98', unit: '%', color: '#3b82f6', bg: '#dbeafe' },
                  { label: 'Steps', val: '6.8K', unit: 'today', color: '#0d9488', bg: '#ccfbf1' },
                ].map((m) => (
                  <div key={m.label} className="rounded-xl p-3 text-center" style={{ background: m.bg }}>
                    <p className="font-mono-data font-bold text-base" style={{ color: m.color }}>{m.val}</p>
                    <p className="text-xs" style={{ color: m.color, opacity: 0.8, fontFamily: 'Inter, sans-serif' }}>{m.unit}</p>
                    <p className="text-xs mt-0.5" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif', fontSize: 10 }}>{m.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="border-t py-8 px-8" style={{ borderColor: '#e2e8f0', background: 'rgba(255,255,255,0.5)' }}>
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { icon: '🩺', title: 'Real-time Health', desc: 'Continuous body/skin temp, HR, SpO₂ tracking' },
            { icon: '🏃', title: 'Smart Activity', desc: 'Steps, workouts, calories burned' },
            { icon: '🥗', title: 'Nutrition Planning', desc: 'Goal-based affordable meal plans' },
            { icon: '💰', title: 'Budget Tracking', desc: 'Health spending within your means' },
          ].map((f) => (
            <div key={f.title} className="flex items-start gap-3">
              <span className="text-2xl">{f.icon}</span>
              <div>
                <p className="font-semibold text-sm" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>{f.title}</p>
                <p className="text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: '#64748b' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <section id="features" className="max-w-7xl mx-auto w-full px-4 md:px-8 py-16 md:py-20">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>Features</p>
          <h2 className="text-3xl md:text-5xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a', lineHeight: 1.1 }}>
            Everything you need to train smarter.
          </h2>
          <p className="text-base md:text-lg" style={{ color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            SmartWear combines real-time wearable monitoring, personalized fitness guidance, nutrition planning, and budget-aware recommendations in one platform.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {featureCards.map((feature) => (
            <div key={feature.title} className="card p-6 transition-transform duration-200 hover:-translate-y-0.5" style={{ border: '1px solid rgba(226,232,240,0.9)' }}>
              <div className="text-3xl mb-4">{feature.icon}</div>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>{feature.title}</h3>
              <p className="text-sm" style={{ color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>{feature.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm" style={{ color: '#0f766e', fontFamily: 'Inter, sans-serif' }}>
          Real data only — smartwatch data syncs through supported health platforms and real activity sources.
        </div>
      </section>

      <section id="how-it-works" className="max-w-7xl mx-auto w-full px-4 md:px-8 py-16 md:py-20" style={{ background: 'rgba(255,255,255,0.32)' }}>
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>How it works</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>How SmartWear Works</h2>
        </div>

        <div className="grid gap-4 lg:grid-cols-4">
          {steps.map((step) => (
            <div key={step.number} className="card p-5 h-full" style={{ border: '1px solid rgba(226,232,240,0.9)' }}>
              <div className="text-xs font-semibold uppercase tracking-[0.12em] mb-4" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>{step.number}</div>
              <h3 className="text-xl font-semibold mb-3" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>{step.title}</h3>
              <p className="text-sm" style={{ color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>{step.desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 card p-5 md:p-6" style={{ border: '1px solid rgba(226,232,240,0.9)' }}>
          <div className="flex flex-col items-center gap-4 md:flex-row md:justify-center md:gap-8">
            {['Wearables', 'SmartWear', 'Your Data', 'Personalized Plan'].map((item, index) => (
              <div key={item} className="flex items-center gap-3 text-center">
                <span className="inline-flex items-center justify-center rounded-full bg-white border border-emerald-200 px-4 py-2 text-sm font-semibold" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>{item}</span>
                {index < 3 && <span style={{ color: '#0d9488', fontSize: 22 }}>↓</span>}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="max-w-7xl mx-auto w-full px-4 md:px-8 py-16 md:py-20">
        <div className="max-w-3xl mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.14em] mb-3" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Plan your fitness budget your way.</h2>
          <p className="text-base md:text-lg" style={{ color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            Set the amount you want to spend each month and SmartWear helps you manage it across your fitness needs.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {budgetExamples.map((example) => (
            <div key={example.title} className="card p-6 text-center" style={{ border: '1px solid rgba(226,232,240,0.9)' }}>
              <div className="font-mono-data text-2xl font-bold mb-3" style={{ color: '#0d9488' }}>{example.amount}</div>
              <div className="text-xl font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>{example.title}</div>
            </div>
          ))}
        </div>

        <div className="mt-10 card p-6" style={{ border: '1px solid rgba(226,232,240,0.9)' }}>
          <div className="mb-6">
            <p className="text-sm uppercase tracking-[0.12em] font-semibold" style={{ color: '#0d9488', fontFamily: 'Sora, sans-serif' }}>Monthly budget</p>
          </div>

          <div className="grid gap-3 md:grid-cols-5">
            {categoryRows.map((row) => (
              <div key={row} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-center" style={{ color: '#0f172a', fontFamily: 'Inter, sans-serif' }}>
                {row}
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4 rounded-2xl bg-emerald-50/70 px-4 py-4" style={{ color: '#0f172a', fontFamily: 'Sora, sans-serif' }}>
            <span>Monthly Budget</span>
            <span>− Spending</span>
            <span>= Remaining Budget</span>
          </div>

          <p className="mt-6 text-sm md:text-base" style={{ color: '#475569', fontFamily: 'Inter, sans-serif', lineHeight: 1.7 }}>
            SmartWear can recommend how to use your remaining budget based on your fitness goal, activity, nutrition preferences and current needs.
          </p>
          <p className="mt-4 text-sm" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>
            SmartWear is not a paid subscription product. The ₹2K+ figure shown on the landing page represents a suggested minimum monthly fitness budget for the user, not a SmartWear subscription price.
          </p>
        </div>
      </section>
    </div>
  )
}
