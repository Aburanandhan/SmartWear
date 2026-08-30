interface Props {
  onStart: () => void
  onDemo: () => void
  onOpenAuth?: () => void
}

export default function Landing({ onStart, onDemo, onOpenAuth }: Props) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #f0fdf9 0%, #ccfbf1 40%, #e0f2fe 100%)', backgroundImage: 'radial-gradient(circle, #0d948818 1px, transparent 1px)', backgroundSize: '28px 28px' }}>
      {/* Nav */}
      <nav className="flex items-center justify-between px-8 py-5 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#0d9488' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 6 3 11c0 2.5 1 4.8 2.6 6.5L12 22l6.4-4.5C20 16 21 13.5 21 11c0-5-4-9-9-9z" fill="white" fillOpacity="0.9"/>
              <path d="M12 7v8M9 10h6" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="font-display font-700 text-xl" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, color: '#0f172a' }}>SmartWear</span>
        </div>
        <div className="hidden md:flex items-center gap-6">
          <a className="text-sm font-medium cursor-pointer" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>Features</a>
          <a className="text-sm font-medium cursor-pointer" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>How it works</a>
          <a className="text-sm font-medium cursor-pointer" style={{ color: '#64748b', fontFamily: 'Inter, sans-serif' }}>Pricing</a>
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
            {/* Glow */}
            <div className="absolute inset-0 rounded-full" style={{ background: 'radial-gradient(circle, rgba(13,148,136,0.15) 0%, transparent 70%)', transform: 'scale(1.3)' }} />
            {/* Main device card */}
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

              {/* Belt visual */}
              <div className="rounded-2xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, #0f766e, #0d9488)' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="w-16 h-4 rounded-full opacity-60" style={{ background: 'rgba(255,255,255,0.3)' }} />
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24">
                      <path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {/* Belt strip */}
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

              {/* Mini metrics */}
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

            {/* Floating badges */}
            <div className="absolute -top-4 -right-6 card px-3 py-2 text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f766e', fontSize: 12 }}>
              🔋 94% Battery
            </div>
            <div className="absolute -bottom-4 -left-6 card px-3 py-2 text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#64748b', fontSize: 12 }}>
              📡 SIMULATED DEVICE
            </div>
          </div>
        </div>
      </main>

      {/* Feature strip */}
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
    </div>
  )
}
