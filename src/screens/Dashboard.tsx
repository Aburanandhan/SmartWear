import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import DashboardHome from '../views/DashboardHome'
import LiveMonitoring from '../views/LiveMonitoring'
import Activity from '../views/Activity'
import Nutrition from '../views/Nutrition'
import Budget from '../views/Budget'
import Insights from '../views/Insights'
import Alerts from '../views/Alerts'
import Profile from '../views/Profile'
import Settings from '../views/Settings'
import { useSensorData } from '../hooks/useSensorData'
import { fetchAlerts } from '../services/alertService'

export type DashView = 'home' | 'live' | 'activity' | 'nutrition' | 'budget' | 'insights' | 'alerts' | 'profile' | 'settings'

const NAV_ITEMS: { id: DashView; label: string; icon: string }[] = [
  { id: 'home', label: 'Dashboard', icon: '⊞' },
  { id: 'live', label: 'Live Monitoring', icon: '📡' },
  { id: 'activity', label: 'Activity', icon: '🏃' },
  { id: 'nutrition', label: 'Nutrition', icon: '🥗' },
  { id: 'budget', label: 'Budget', icon: '💰' },
  { id: 'insights', label: 'Insights', icon: '📊' },
  { id: 'alerts', label: 'Alerts', icon: '🔔' },
  { id: 'profile', label: 'Profile', icon: '👤' },
  { id: 'settings', label: 'Settings', icon: '⚙️' },
]

interface Props {
  profile: UserProfile
  userId?: string | null
  isDemoMode?: boolean
  onUpdateProfile: (p: Partial<UserProfile>) => void
  onLogout: () => void
}

export default function Dashboard({ profile, userId, isDemoMode = false, onUpdateProfile, onLogout }: Props) {
  const [view, setView] = useState<DashView>('home')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [alertCount, setAlertCount] = useState(3)

  // Central Sensor Data Hook
  const { reading, history, sensorSource, setMotionState, setWorkoutActive } = useSensorData(userId || undefined)

  useEffect(() => {
    async function loadAlertsCount() {
      const alerts = await fetchAlerts(userId || undefined)
      const unread = alerts.filter((a) => !a.read).length
      setAlertCount(unread)
    }
    loadAlertsCount()
  }, [userId, view])

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#f0fdf9' }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static z-30 flex flex-col h-full transition-transform duration-300 shrink-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ width: 220, background: 'linear-gradient(180deg, #0f766e 0%, #0d9488 100%)' }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(255,255,255,0.2)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C7 2 3 6 3 11c0 2.5 1 4.8 2.6 6.5L12 22l6.4-4.5C20 16 21 13.5 21 11c0-5-4-9-9-9z" fill="white"/>
            </svg>
          </div>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15, color: 'white' }}>SmartWear</span>
        </div>

        {/* Wearable status pill */}
        <div className="mx-3 mt-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(255,255,255,0.12)' }}>
          <div className="flex items-center gap-2">
            <span className="pulse-dot w-2 h-2 rounded-full" style={{ background: sensorSource.isSimulated ? '#fbbf24' : '#4ade80' }}></span>
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: 'rgba(255,255,255,0.9)', fontWeight: 600 }}>
              {sensorSource.name}
            </span>
          </div>
          <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.55)', marginTop: 2 }}>
            {sensorSource.isSimulated ? 'Simulator Mode · Active' : 'ESP32 Belt · BLE Connected'}
          </p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              onClick={() => { setView(item.id); setSidebarOpen(false) }}
              className={`sidebar-item w-full text-left relative ${view === item.id ? 'active' : ''}`}
            >
              <span className="text-base w-5 text-center shrink-0">{item.icon}</span>
              <span className="flex-1">{item.label}</span>
              {item.id === 'alerts' && alertCount > 0 && (
                <span className="ml-auto w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#ef4444', color: 'white', fontFamily: 'Sora, sans-serif' }}>
                  {alertCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.12)' }}>
          <button
            onClick={() => setView('profile')}
            className="flex items-center gap-2.5 w-full px-3 py-2.5 rounded-xl transition-all hover:bg-white/10"
          >
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0" style={{ background: 'rgba(255,255,255,0.2)', color: 'white', fontFamily: 'Sora, sans-serif' }}>
              {profile.age}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p style={{ fontFamily: 'Sora, sans-serif', fontSize: 12, fontWeight: 600, color: 'white' }}>
                {isDemoMode ? 'Demo User' : 'User Profile'}
              </p>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 10, color: 'rgba(255,255,255,0.55)' }}>{profile.goal} · {profile.primaryExercise}</p>
            </div>
          </button>
          <button onClick={onLogout} className="w-full mt-2 px-3 py-2 rounded-lg text-xs font-medium text-center transition-all hover:bg-white/10" style={{ color: 'rgba(255,255,255,0.55)', fontFamily: 'Inter, sans-serif' }}>
            ← Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between px-5 py-4 border-b" style={{ background: 'white', borderColor: '#e2e8f0' }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden p-1.5 rounded-lg border" style={{ borderColor: '#e2e8f0' }} onClick={() => setSidebarOpen(true)}>
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path d="M3 6h18M3 12h18M3 18h18" stroke="#64748b" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
            <div>
              <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 17, color: '#0f172a' }}>
                {NAV_ITEMS.find(n => n.id === view)?.label}
              </h1>
              <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#64748b' }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setView('alerts')} className="relative p-2 rounded-xl border transition-all hover:bg-slate-50" style={{ borderColor: '#e2e8f0' }}>
              <span className="text-base">🔔</span>
              {alertCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#ef4444', color: 'white', fontSize: 9 }}>{alertCount}</span>}
            </button>
            <button onClick={() => setView('profile')} className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#ccfbf1', color: '#0f766e', fontFamily: 'Sora, sans-serif' }}>
              {profile.age}
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-5 fade-in" key={view}>
          {view === 'home' && (
            <DashboardHome
              profile={profile}
              userId={userId || undefined}
              onNavigate={setView}
            />
          )}
          {view === 'live' && (
            <LiveMonitoring
              profile={profile}
              reading={reading}
              history={history}
              sensorSource={sensorSource}
              onMotionChange={setMotionState}
              userId={userId || undefined}
              onWorkoutToggle={setWorkoutActive}
            />
          )}
          {view === 'activity' && (
            <Activity
              profile={profile}
              userId={userId || undefined}
              reading={reading}
              onWorkoutToggle={setWorkoutActive}
            />
          )}
          {view === 'nutrition' && (
            <Nutrition
              profile={profile}
              reading={reading}
              userId={userId || undefined}
            />
          )}
          {view === 'budget' && (
            <Budget
              profile={profile}
              userId={userId || undefined}
              onUpdateProfile={onUpdateProfile}
            />
          )}
          {view === 'insights' && (
            <Insights
              profile={profile}
              reading={reading}
            />
          )}
          {view === 'alerts' && (
            <Alerts
              userId={userId || undefined}
              onAlertsRead={() => setAlertCount(0)}
            />
          )}
          {view === 'profile' && (
            <Profile
              profile={profile}
              userId={userId || undefined}
              onUpdate={onUpdateProfile}
            />
          )}
          {view === 'settings' && (
            <Settings
              profile={profile}
              userId={userId || undefined}
              onUpdate={onUpdateProfile}
            />
          )}
        </main>
      </div>
    </div>
  )
}
