import { supabase } from '../../../lib/supabase'
import type {
  ConnectionStatus,
  SmartwatchProvider,
  SmartwatchSyncResult,
  WorkoutData,
} from '../types'

/**
 * HealthConnectProvider implementation
 * Interacts with Android Health Connect via native bridge when present on Android device,
 * or syncs/retrieves authenticated Supabase smartwatch activity records when running in web browser.
 */
export class HealthConnectProvider implements SmartwatchProvider {
  id = 'health_connect'
  name = 'Android Health Connect'

  private getNativeBridge() {
    if (typeof window !== 'undefined' && (window as any).AndroidHealthConnect) {
      return (window as any).AndroidHealthConnect
    }
    return null
  }

  async isAvailable(): Promise<boolean> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      try {
        return await bridge.isAvailable()
      } catch (e) {
        return false
      }
    }
    // Web app fallback: check if user has an existing Health Connect connection in Supabase
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return false

      const { data } = await supabase
        .from('smartwatch_connections')
        .select('connected, provider')
        .eq('user_id', user.id)
        .eq('provider', 'health_connect')
        .maybeSingle()

      return !!(data && data.connected)
    } catch (e) {
      return false
    }
  }

  async connect(): Promise<boolean> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      return await bridge.connect()
    }
    // Register connection in Supabase
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const nowStr = new Date().toISOString()
      await supabase.from('smartwatch_connections').upsert(
        {
          user_id: user.id,
          provider: 'health_connect',
          device_name: 'Health Connect',
          connected: true,
          last_sync: nowStr,
          updated_at: nowStr,
        },
        { onConflict: 'user_id' }
      )
    }
    return true
  }

  async disconnect(): Promise<void> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      await bridge.disconnect()
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase.from('smartwatch_connections').upsert(
        {
          user_id: user.id,
          provider: 'health_connect',
          connected: false,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' }
      )
    }
  }

  async requestPermissions(): Promise<boolean> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      return await bridge.requestPermissions([
        'READ_STEPS',
        'READ_HEART_RATE',
        'READ_ACTIVE_CALORIES',
        'READ_EXERCISE',
      ])
    }
    return true
  }

  async getConnectionStatus(): Promise<ConnectionStatus> {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'NOT_CONNECTED'

    const { data: conn } = await supabase
      .from('smartwatch_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!conn || !conn.connected) {
      return 'NOT_CONNECTED'
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: activity } = await supabase
      .from('smartwatch_daily_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (!activity) {
      return 'NO_DATA'
    }

    return 'CONNECTED'
  }

  async getSteps(start: Date, end: Date): Promise<number | null> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      return await bridge.getSteps(start.toISOString(), end.toISOString())
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const todayStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('smartwatch_daily_activity')
      .select('steps')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    return data && data.steps !== undefined ? data.steps : null
  }

  async getActiveCalories(start: Date, end: Date): Promise<number | null> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      return await bridge.getActiveCalories(start.toISOString(), end.toISOString())
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const todayStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('smartwatch_daily_activity')
      .select('active_calories')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    return data && data.active_calories !== undefined ? Number(data.active_calories) : null
  }

  async getHeartRate(start: Date, end: Date): Promise<number | null> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      return await bridge.getHeartRate(start.toISOString(), end.toISOString())
    }
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const todayStr = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('smartwatch_daily_activity')
      .select('heart_rate')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    return data && data.heart_rate !== undefined ? data.heart_rate : null
  }

  async getWorkouts(start: Date, end: Date): Promise<WorkoutData[]> {
    const bridge = this.getNativeBridge()
    if (bridge) {
      return await bridge.getWorkouts(start.toISOString(), end.toISOString())
    }
    return []
  }

  async sync(): Promise<SmartwatchSyncResult> {
    const bridge = this.getNativeBridge()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return {
        success: false,
        connectionStatus: 'NOT_CONNECTED',
        lastSyncedAt: null,
        steps: null,
        activeMinutes: null,
        activeCalories: null,
        distanceMeters: null,
        heartRateBpm: null,
        restingHeartRateBpm: null,
        deviceName: null,
        error: 'User not authenticated',
      }
    }

    if (bridge) {
      try {
        const nativeData = await bridge.readTodayData()
        const nowStr = new Date().toISOString()
        const todayStr = nowStr.split('T')[0]

        await supabase.from('smartwatch_connections').upsert(
          {
            user_id: user.id,
            provider: 'health_connect',
            device_name: nativeData.deviceName || 'Health Connect',
            connected: true,
            last_sync: nowStr,
            updated_at: nowStr,
          },
          { onConflict: 'user_id' }
        )

        await supabase.from('smartwatch_daily_activity').upsert(
          {
            user_id: user.id,
            provider: 'health_connect',
            device_name: nativeData.deviceName || 'Health Connect',
            date: todayStr,
            steps: nativeData.steps,
            active_minutes: nativeData.activeMinutes,
            active_calories: nativeData.activeCalories,
            distance: nativeData.distance,
            heart_rate: nativeData.heartRate,
            resting_heart_rate: nativeData.restingHeartRate,
            synced_at: nowStr,
          },
          { onConflict: 'user_id,date' }
        )

        return {
          success: true,
          connectionStatus: 'CONNECTED',
          lastSyncedAt: nowStr,
          steps: nativeData.steps ?? null,
          activeMinutes: nativeData.activeMinutes ?? null,
          activeCalories: nativeData.activeCalories ?? null,
          distanceMeters: nativeData.distance ?? null,
          heartRateBpm: nativeData.heartRate ?? null,
          restingHeartRateBpm: nativeData.restingHeartRate ?? null,
          deviceName: nativeData.deviceName || 'Health Connect',
        }
      } catch (err: any) {
        return {
          success: false,
          connectionStatus: 'SYNC_ERROR',
          lastSyncedAt: null,
          steps: null,
          activeMinutes: null,
          activeCalories: null,
          distanceMeters: null,
          heartRateBpm: null,
          restingHeartRateBpm: null,
          deviceName: null,
          error: err.message || 'Health Connect native sync failure',
        }
      }
    }

    // Web container: Query Supabase for user's real synchronized Health Connect record
    const { data: conn, error: connErr } = await supabase
      .from('smartwatch_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (connErr || !conn || !conn.connected) {
      return {
        success: false,
        connectionStatus: 'NOT_CONNECTED',
        lastSyncedAt: null,
        steps: null,
        activeMinutes: null,
        activeCalories: null,
        distanceMeters: null,
        heartRateBpm: null,
        restingHeartRateBpm: null,
        deviceName: null,
      }
    }

    const todayStr = new Date().toISOString().split('T')[0]
    const { data: activity } = await supabase
      .from('smartwatch_daily_activity')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .maybeSingle()

    if (!activity) {
      return {
        success: true,
        connectionStatus: 'NO_DATA',
        lastSyncedAt: conn.last_sync,
        steps: null,
        activeMinutes: null,
        activeCalories: null,
        distanceMeters: null,
        heartRateBpm: null,
        restingHeartRateBpm: null,
        deviceName: conn.device_name || 'Health Connect',
      }
    }

    return {
      success: true,
      connectionStatus: 'CONNECTED',
      lastSyncedAt: activity.synced_at || conn.last_sync,
      steps: activity.steps,
      activeMinutes: activity.active_minutes,
      activeCalories: activity.active_calories !== null ? Number(activity.active_calories) : null,
      distanceMeters: activity.distance !== null ? Number(activity.distance) : null,
      heartRateBpm: activity.heart_rate,
      restingHeartRateBpm: activity.resting_heart_rate,
      deviceName: activity.device_name || conn.device_name || 'Health Connect',
    }
  }
}
