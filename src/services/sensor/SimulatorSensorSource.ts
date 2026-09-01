import type { SensorReading, SensorSource, MotionState } from './types'

export class SimulatorSensorSource implements SensorSource {
  public readonly name = 'SIMULATED DEVICE (OFF)'
  public readonly isSimulated = true

  private currentMotion: MotionState = 'REST'
  private workoutActive = false
  private currentSteps = 0
  private currentTemp = 0
  private currentHR = 0
  private currentSpO2 = 0
  private listeners: Set<(reading: SensorReading) => void> = new Set()
  private intervalId: ReturnType<typeof setInterval> | null = null

  public setMotionState(state: MotionState) {
    this.currentMotion = state
    this.emitCurrent()
  }

  public setWorkoutActive(active: boolean) {
    this.workoutActive = active
    this.emitCurrent()
  }

  public isConnected(): boolean {
    return false
  }

  public getCurrentReading(): SensorReading {
    return {
      deviceId: 'ESP32_SIMULATED_BELT',
      timestamp: new Date().toISOString(),
      temperature: this.currentTemp,
      heartRate: this.currentHR,
      spo2: this.currentSpO2,
      motion: this.currentMotion,
      steps: this.currentSteps,
      workoutActive: this.workoutActive,
    }
  }

  private emitCurrent() {
    const reading = this.getCurrentReading()
    this.listeners.forEach((fn) => fn(reading))
  }

  public startStream(callback: (reading: SensorReading) => void): () => void {
    this.listeners.add(callback)
    callback(this.getCurrentReading())
    return () => {
      this.listeners.delete(callback)
      if (this.listeners.size === 0 && this.intervalId) {
        clearInterval(this.intervalId)
        this.intervalId = null
      }
    }
  }
}

export const simulatorSensorSource = new SimulatorSensorSource()
