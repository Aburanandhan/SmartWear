import { supabase } from '../lib/supabase'

export interface UserSettings {
  wearableStatus: string
  notificationPrefs: {
    email: boolean
    push: boolean
    hydration: boolean
    budget: boolean
  }
  budgetAlertThreshold: number
  units: 'metric' | 'imperial'
  privacySettings: {
    shareData: boolean
    anonymousAnalytics: boolean
  }
}

export const DEFAULT_SETTINGS: UserSettings = {
  wearableStatus: 'SIMULATED DEVICE',
  notificationPrefs: {
    email: true,
    push: true,
    hydration: true,
    budget: true,
  },
  budgetAlertThreshold: 0.8,
  units: 'metric',
  privacySettings: {
    shareData: false,
    anonymousAnalytics: true,
  },
}

export async function fetchUserSettings(userId?: string): Promise<UserSettings> {
  if (!userId) return DEFAULT_SETTINGS

  try {
    const { data, error } = await supabase
      .from('settings')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle()

    if (error || !data) return DEFAULT_SETTINGS

    return {
      wearableStatus: data.wearable_status || 'SIMULATED DEVICE',
      notificationPrefs: data.notification_prefs || DEFAULT_SETTINGS.notificationPrefs,
      budgetAlertThreshold: Number(data.budget_alert_threshold) || 0.8,
      units: (data.units as any) || 'metric',
      privacySettings: data.privacy_settings || DEFAULT_SETTINGS.privacySettings,
    }
  } catch (err) {
    console.error('Error fetching settings:', err)
    return DEFAULT_SETTINGS
  }
}

export async function saveUserSettings(userId: string, settings: UserSettings): Promise<boolean> {
  try {
    const { error } = await supabase.from('settings').upsert({
      user_id: userId,
      wearable_status: settings.wearableStatus,
      notification_prefs: settings.notificationPrefs,
      budget_alert_threshold: settings.budgetAlertThreshold,
      units: settings.units,
      privacy_settings: settings.privacySettings,
      updated_at: new Date().toISOString(),
    })

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error saving settings:', err)
    return false
  }
}
