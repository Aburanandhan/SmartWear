import type { SensorReading, SensorSource, MotionState } from './types'

export class SimulatorSensorSource implements SensorSource {
  public readonly name = 'SIMULATED DEVICE'
  public readonly isSimulated = true

  private currentMotion: MotionState = 'REST'
  private workoutActive = false
  private currentSteps = 6840
  private currentTemp = 36.6
  private currentHR = 72
  private currentSpO2 = 98
  private listeners: Set<(reading: SensorReading) => void> = new Set()
  private intervalId: ReturnType<typeof setInterval> | null = null

  constructor() {
    // Start background simulation state updates
  }

  public setMotionState(state: MotionState) {
    this.currentMotion = state
    this.emitCurrent()
  }

  public setWorkoutActive(active: boolean) {
    this.workoutActive = active
    if (active && this.currentMotion === 'REST') {
      this.currentMotion = 'RUN'
    } else if (!active && (this.currentMotion === 'RUN' || this.currentMotion === 'HIGH_INTENSITY')) {
      this.currentMotion = 'RECOVERY'
    }
    this.emitCurrent()
  }

  public getCurrentReading(): SensorReading {
    this.stepSimulation()
    return {
      deviceId: 'ESP32_SIMULATED_BELT',
      timestamp: new Date().toISOString(),
      temperature: Number(this.currentTemp.toFixed(1)),
      heartRate: Math.round(this.currentHR),
      spo2: Math.round(this.currentSpO2),
      motion: this.currentMotion,
      steps: this.currentSteps,
      workoutActive: this.workoutActive,
    }
  }

  private stepSimulation() {
    const jitter = (Math.random() - 0.5)

    switch (this.currentMotion) {
      case 'REST':
        this.currentHR = Math.max(60, Math.min(76, this.currentHR + jitter * 1.5))
        this.currentTemp = Math.max(36.3, Math.min(36.7, this.currentTemp + jitter * 0.05))
        this.currentSpO2 = Math.max(97, Math.min(99, this.currentSpO2 + jitter * 0.2))
        break

      case 'WALK':
        this.currentHR = Math.max(85, Math.min(115, this.currentHR + jitter * 2 + 0.3))
        this.currentTemp = Math.max(36.5, Math.min(36.9, this.currentTemp + jitter * 0.05))
        this.currentSpO2 = Math.max(97, Math.min(99, this.currentSpO2 + jitter * 0.2))
        this.currentSteps += Math.floor(Math.random() * 2) + 1
        break

      case 'RUN':
        this.currentHR = Math.max(130, Math.min(168, this.currentHR + jitter * 3 + 0.8))
        this.currentTemp = Math.max(36.8, Math.min(37.3, this.currentTemp + 0.02))
        this.currentSpO2 = Math.max(96, Math.min(98, this.currentSpO2 + jitter * 0.3))
        this.currentSteps += Math.floor(Math.random() * 4) + 2
        break

      case 'HIGH_INTENSITY':
        this.currentHR = Math.max(158, Math.min(186, this.currentHR + jitter * 4 + 1.2))
        this.currentTemp = Math.max(37.0, Math.min(37.6, this.currentTemp + 0.04))
        this.currentSpO2 = Math.max(95, Math.min(97, this.currentSpO2 + jitter * 0.4))
        this.currentSteps += Math.floor(Math.random() * 5) + 3
        break

      case 'RECOVERY':
        this.currentHR = Math.max(72, this.currentHR - 1.5 + jitter * 0.5)
        this.currentTemp = Math.max(36.6, this.currentTemp - 0.03)
        this.currentSpO2 = Math.min(99, this.currentSpO2 + 0.2)
        if (this.currentHR <= 76) {
          this.currentMotion = 'REST'
        }
        break
    }
  }

  private emitCurrent() {
    const reading = this.getCurrentReading()
    this.listeners.forEach((fn) => fn(reading))
  }

  public startStream(callback: (reading: SensorReading) => void, intervalMs = 2500): () => void {
    this.listeners.add(callback)
    callback(this.getCurrentReading())

    if (!this.intervalId) {
      this.intervalId = setInterval(() => {
        this.emitCurrent()
      }, intervalMs)
    }

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
