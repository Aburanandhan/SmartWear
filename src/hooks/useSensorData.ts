import { useState, useEffect, useCallback } from 'react'
import type { SensorReading, SensorSource, MotionState } from '../services/sensor/types'
import { simulatorSensorSource } from '../services/sensor/SimulatorSensorSource'
import { esp32SensorSource } from '../services/sensor/ESP32SensorSource'
import { supabase } from '../lib/supabase'

export function useSensorData(userId?: string, preferPhysical = false) {
  const [activeSource, setActiveSource] = useState<SensorSource>(
    preferPhysical && esp32SensorSource.isConnected() ? esp32SensorSource : simulatorSensorSource
  )
  const [reading, setReading] = useState<SensorReading>(() => activeSource.getCurrentReading())
  const [history, setHistory] = useState<SensorReading[]>([activeSource.getCurrentReading()])

  // Select active source
  const switchSource = useCallback((usePhysical: boolean) => {
    if (usePhysical) {
      setActiveSource(esp32SensorSource)
    } else {
      setActiveSource(simulatorSensorSource)
    }
  }, [])

  // Push reading to Supabase if user is logged in
  const persistReadingToSupabase = useCallback(
    async (newReading: SensorReading) => {
      if (!userId) return

      try {
        await supabase.from('sensor_readings').insert({
          user_id: userId,
          device_id: newReading.deviceId,
          temperature: newReading.temperature,
          heart_rate: newReading.heartRate,
          spo2: newReading.spo2,
          motion: newReading.motion,
          steps: newReading.steps,
          workout_active: newReading.workoutActive,
          timestamp: newReading.timestamp,
        })
      } catch (err) {
        // Silent catch for stream inserts
      }
    },
    [userId]
  )

  useEffect(() => {
    // 1. Subscribe to active SensorSource stream
    const unsubscribeStream = activeSource.startStream((newReading) => {
      setReading(newReading)
      setHistory((prev) => [...prev.slice(-29), newReading])
      persistReadingToSupabase(newReading)
    }, 2500)

    // 2. Subscribe to Supabase Realtime for remote sensor updates if logged in
    let realtimeChannel: any = null
    if (userId) {
      realtimeChannel = supabase
        .channel('public:sensor_readings')
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'sensor_readings', filter: `user_id=eq.${userId}` },
          (payload) => {
            const row = payload.new
            const realtimeReading: SensorReading = {
              id: row.id,
              userId: row.user_id,
              deviceId: row.device_id,
              temperature: Number(row.temperature),
              heartRate: Number(row.heart_rate),
              spo2: Number(row.spo2),
              motion: row.motion,
              steps: row.steps,
              workoutActive: row.workout_active,
              timestamp: row.timestamp,
            }
            setReading(realtimeReading)
            setHistory((prev) => [...prev.slice(-29), realtimeReading])
          }
        )
        .subscribe()
    }

    return () => {
      unsubscribeStream()
      if (realtimeChannel) {
        supabase.removeChannel(realtimeChannel)
      }
    }
  }, [activeSource, userId, persistReadingToSupabase])

  const setMotionState = useCallback(
    (motion: MotionState) => {
      activeSource.setMotionState(motion)
    },
    [activeSource]
  )

  const setWorkoutActive = useCallback(
    (active: boolean) => {
      activeSource.setWorkoutActive(active)
    },
    [activeSource]
  )

  return {
    reading,
    history,
    sensorSource: activeSource,
    switchSource,
    setMotionState,
    setWorkoutActive,
  }
}
