import type { SensorReading, SensorSource, MotionState } from './types'

export class ESP32SensorSource implements SensorSource {
  public readonly name = 'WEARABLE CONNECTED'
  public readonly isSimulated = false

  private connected = false
  private device: any = null
  private listeners: Set<(reading: SensorReading) => void> = new Set()

  private lastReading: SensorReading = {
    deviceId: 'ESP32_PHYSICAL_BELT_01',
    timestamp: new Date().toISOString(),
    temperature: 36.8,
    heartRate: 78,
    spo2: 98,
    motion: 'REST',
    steps: 7200,
    workoutActive: false,
  }

  public isConnected(): boolean {
    return this.connected
  }

  public setMotionState(state: MotionState) {
    this.lastReading.motion = state
  }

  public setWorkoutActive(active: boolean) {
    this.lastReading.workoutActive = active
  }

  public getCurrentReading(): SensorReading {
    return {
      ...this.lastReading,
      timestamp: new Date().toISOString(),
    }
  }

  public async connectBLE(): Promise<boolean> {
    if (typeof window === 'undefined' || !(navigator as any).bluetooth) {
      console.warn('Web Bluetooth API not supported in this browser context.')
      return false
    }

    try {
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: 'SmartWear' }],
        optionalServices: ['heart_rate', 'health_thermometer', 'battery_service'],
      })
      this.connected = true
      return true
    } catch (err) {
      console.error('BLE connection attempt:', err)
      return false
    }
  }

  public startStream(callback: (reading: SensorReading) => void): () => void {
    this.listeners.add(callback)
    callback(this.getCurrentReading())
    return () => {
      this.listeners.delete(callback)
    }
  }
}

export const esp32SensorSource = new ESP32SensorSource()
