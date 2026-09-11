export type MotionState = 'REST' | 'WALK' | 'RUN' | 'HIGH_INTENSITY' | 'RECOVERY'
export type HardwareConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED' | 'ERROR'

export interface SensorReading {
  id?: string
  userId?: string | null
  deviceId: string
  timestamp: string
  temperature: number
  heartRate: number
  spo2: number
  motion: MotionState
  steps: number
  workoutActive: boolean
}

export function hasValidSensorReading(reading?: Partial<SensorReading> | null): boolean {
  if (!reading || !reading.timestamp) return false

  const numericValues = [reading.temperature, reading.heartRate, reading.spo2, reading.steps]
  const hasAnyRealValue = numericValues.some((value) => typeof value === 'number' && !Number.isNaN(value) && value > 0)
  const hasMotion = !!reading.motion && reading.motion !== 'REST'

  return hasAnyRealValue || hasMotion
}

export interface SensorSource {
  name: string
  isSimulated: boolean
  startStream: (callback: (reading: SensorReading) => void, intervalMs?: number) => () => void
  getCurrentReading: () => SensorReading
  setMotionState: (state: MotionState) => void
  setWorkoutActive: (active: boolean) => void
  isConnected: () => boolean
  getConnectionStatus?: () => HardwareConnectionStatus
}
