import { supabase } from '../../lib/supabase'
import { HealthConnectProvider } from './providers/healthConnectProvider'
import type {
  ConnectionStatus,
  SmartwatchConnection,
  SmartwatchDailyActivity,
  SmartwatchProvider,
  SmartwatchSyncResult,
} from './types'

class SmartwatchService {
  private activeProvider: SmartwatchProvider

  constructor() {
    this.activeProvider = new HealthConnectProvider()
  }

  getProvider(): SmartwatchProvider {
    return this.activeProvider
  }

  async getLatestSmartwatchData(userId?: string): Promise<SmartwatchSyncResult> {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id
    if (!currentUserId) {
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
    return await this.activeProvider.sync()
  }

  async getConnectionStatus(userId?: string): Promise<{ connection: SmartwatchConnection | null; status: ConnectionStatus }> {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id
    if (!currentUserId) {
      return { connection: null, status: 'NOT_CONNECTED' }
    }

    const { data: conn } = await supabase
      .from('smartwatch_connections')
      .select('*')
      .eq('user_id', currentUserId)
      .maybeSingle()

    if (!conn || !conn.connected) {
      return { connection: null, status: 'NOT_CONNECTED' }
    }

    const status = await this.activeProvider.getConnectionStatus()
    return {
      connection: {
        id: conn.id,
        userId: conn.user_id,
        provider: conn.provider,
        deviceName: conn.device_name,
        connected: conn.connected,
        lastSync: conn.last_sync,
      },
      status,
    }
  }

  async connectHealthConnect(userId?: string): Promise<SmartwatchSyncResult> {
    const currentUserId = userId || (await supabase.auth.getUser()).data.user?.id
    if (!currentUserId) {
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
        error: 'Authentication required to connect smartwatch.',
      }
    }

    const permOk = await this.activeProvider.requestPermissions()
    if (!permOk) {
      return {
        success: false,
        connectionStatus: 'PERMISSION_REQUIRED',
        lastSyncedAt: null,
        steps: null,
        activeMinutes: null,
        activeCalories: null,
        distanceMeters: null,
        heartRateBpm: null,
        restingHeartRateBpm: null,
        deviceName: null,
        error: 'Health Connect permissions were denied.',
      }
    }

    await this.activeProvider.connect()
    return await this.activeProvider.sync()
  }

  async syncSmartwatchData(userId?: string): Promise<SmartwatchSyncResult> {
    return await this.getLatestSmartwatchData(userId)
  }

  async disconnectSmartwatch(userId?: string): Promise<void> {
    await this.activeProvider.disconnect()
  }
}

export const smartwatchService = new SmartwatchService()
