export type MotionState = 'REST' | 'WALK' | 'RUN' | 'HIGH_INTENSITY' | 'RECOVERY'

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

export interface SensorSource {
  name: string
  isSimulated: boolean
  startStream: (callback: (reading: SensorReading) => void, intervalMs?: number) => () => void
  getCurrentReading: () => SensorReading
  setMotionState: (state: MotionState) => void
  setWorkoutActive: (active: boolean) => void
  isConnected: () => boolean
}
