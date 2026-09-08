export type ConnectionStatus =
  | 'NOT_CONNECTED'
  | 'CONNECTING'
  | 'PERMISSION_REQUIRED'
  | 'CONNECTED'
  | 'SYNCING'
  | 'SYNC_ERROR'
  | 'DISCONNECTED'
  | 'NO_DATA'

export interface WorkoutData {
  id: string
  title: string
  activityType: string
  startTime: string
  endTime: string
  durationMinutes: number
  caloriesBurned?: number
  avgHeartRate?: number
}

export interface SmartwatchSyncResult {
  success: boolean
  connectionStatus: ConnectionStatus
  lastSyncedAt: string | null
  steps: number | null
  activeMinutes: number | null
  activeCalories: number | null
  distanceMeters: number | null
  heartRateBpm: number | null
  restingHeartRateBpm: number | null
  deviceName: string | null
  error?: string
}

export interface SmartwatchDailyActivity {
  id?: string
  userId: string
  provider: string
  deviceName: string | null
  date: string
  steps: number | null
  activeMinutes: number | null
  activeCalories: number | null
  distanceMeters: number | null
  heartRateBpm: number | null
  restingHeartRateBpm: number | null
  syncedAt: string
}

export interface SmartwatchConnection {
  id?: string
  userId: string
  provider: string
  deviceName: string | null
  connected: boolean
  lastSync: string | null
  createdAt?: string
  updatedAt?: string
}

export interface SmartwatchProvider {
  id: string
  name: string
  isAvailable(): Promise<boolean>
  connect(): Promise<boolean>
  disconnect(): Promise<void>
  requestPermissions(): Promise<boolean>
  getConnectionStatus(): Promise<ConnectionStatus>
  getSteps(start: Date, end: Date): Promise<number | null>
  getActiveCalories(start: Date, end: Date): Promise<number | null>
  getHeartRate(start: Date, end: Date): Promise<number | null>
  getWorkouts(start: Date, end: Date): Promise<WorkoutData[]>
  sync(): Promise<SmartwatchSyncResult>
}
