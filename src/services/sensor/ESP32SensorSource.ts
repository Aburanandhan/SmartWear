import type { SensorReading, SensorSource, MotionState, HardwareConnectionStatus } from './types'

export class ESP32SensorSource implements SensorSource {
  public get name(): string {
    return this.connectionStatus === 'CONNECTED' ? 'SmartWear Belt' : 'SmartWear Belt'
  }
  public readonly isSimulated = false

  private connectionStatus: HardwareConnectionStatus = 'DISCONNECTED'
  private device: any = null
  private listeners: Set<(reading: SensorReading) => void> = new Set()

  private lastReading: SensorReading = {
    deviceId: 'ESP32_PHYSICAL_BELT_01',
    timestamp: new Date().toISOString(),
    temperature: 0,
    heartRate: 0,
    spo2: 0,
    motion: 'REST',
    steps: 0,
    workoutActive: false,
  }

  public isConnected(): boolean {
    return this.connectionStatus === 'CONNECTED'
  }

  public getConnectionStatus(): HardwareConnectionStatus {
    return this.connectionStatus
  }

  public updateRealReading(reading: Partial<SensorReading>) {
    this.connectionStatus = 'CONNECTED'
    this.lastReading = {
      ...this.lastReading,
      ...reading,
      timestamp: new Date().toISOString(),
    }
    this.listeners.forEach((cb) => cb(this.getCurrentReading()))
  }

  public setMotionState(state: MotionState) {
    if (this.connectionStatus === 'CONNECTED') {
      this.lastReading.motion = state
      this.listeners.forEach((cb) => cb(this.getCurrentReading()))
    }
  }

  public setWorkoutActive(active: boolean) {
    if (this.connectionStatus === 'CONNECTED') {
      this.lastReading.workoutActive = active
      this.listeners.forEach((cb) => cb(this.getCurrentReading()))
    }
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
      this.connectionStatus = 'ERROR'
      return false
    }

    try {
      this.connectionStatus = 'CONNECTING'
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ namePrefix: 'SmartWear' }],
        optionalServices: ['heart_rate', 'health_thermometer', 'battery_service'],
      })
      this.connectionStatus = 'CONNECTED'
      this.listeners.forEach((cb) => cb(this.getCurrentReading()))
      return true
    } catch (err) {
      console.error('BLE connection attempt:', err)
      this.connectionStatus = 'ERROR'
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
