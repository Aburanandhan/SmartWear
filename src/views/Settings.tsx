import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import { fetchUserSettings, saveUserSettings, type UserSettings } from '../services/settingsService'

interface Props {
  profile: UserProfile
  userId?: string
  onUpdate?: (p: Partial<UserProfile>) => void
  onUpdateProfile?: (p: Partial<UserProfile>) => void
}

export default function Settings({ userId }: Props) {
  const [settings, setSettings] = useState<UserSettings>({
    wearableStatus: 'SIMULATED DEVICE',
    notificationPrefs: { email: true, push: true, hydration: true, budget: true },
    budgetAlertThreshold: 0.8,
    units: 'metric',
    privacySettings: { shareData: false, anonymousAnalytics: true },
  })
  const [msg, setMsg] = useState('')

  useEffect(() => {
    async function loadSettings() {
      const data = await fetchUserSettings(userId)
      setSettings(data)
    }
    loadSettings()
  }, [userId])

  const handleToggle = async (key: keyof UserSettings['notificationPrefs']) => {
    const updated = {
      ...settings,
      notificationPrefs: {
        ...settings.notificationPrefs,
        [key]: !settings.notificationPrefs[key],
      },
    }
    setSettings(updated)
    if (userId) {
      await saveUserSettings(userId, updated)
      setMsg('Settings updated.')
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="card p-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            App Preferences & Device Settings
          </h2>
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            Configure notification alerts, budget warning thresholds, and hardware pairing preferences
          </p>
        </div>

        {msg && <p className="text-xs font-semibold text-teal-700">{msg}</p>}

        {/* Wearable Connection Status */}
        <div className="p-4 rounded-xl border bg-slate-50 space-y-2">
          <p className="text-xs font-bold uppercase text-slate-500" style={{ fontFamily: 'Sora, sans-serif' }}>Hardware Device Status</p>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 pulse-dot" />
              <span className="font-semibold text-sm text-slate-900">{settings.wearableStatus}</span>
            </div>
            <span className="text-xs font-mono-data text-slate-500">ESP32 BLE 5.0 Protocol</span>
          </div>
        </div>

        {/* Notification Preferences */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Notification Triggers</h3>

          {Object.entries(settings.notificationPrefs).map(([prefKey, enabled]) => (
            <div key={prefKey} className="flex items-center justify-between py-2 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold capitalize text-slate-800">{prefKey} Alerts</p>
                <p className="text-xs text-slate-400">Receive automated system alerts for {prefKey}</p>
              </div>
              <button
                onClick={() => handleToggle(prefKey as any)}
                className={`w-12 h-6 rounded-full transition-all relative ${enabled ? 'bg-teal-600' : 'bg-slate-300'}`}
              >
                <span className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-all ${enabled ? 'right-0.5' : 'left-0.5'}`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
