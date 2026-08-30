import type { SensorReading } from '../services/sensor/types'

export type WellnessStatus =
  | 'NORMAL'
  | 'MODERATE'
  | 'HIGH_INTENSITY'
  | 'RECOVERY_RECOMMENDED'
  | 'HYDRATION_RECOMMENDED'

export interface WellnessEvaluation {
  status: WellnessStatus
  title: string
  message: string
  skinTempStatus: string
  hrStatus: string
  recoveryScore: number // 0 - 100
}

export function evaluateWellnessStatus(reading: SensorReading, hydrationTodayMl = 1400): WellnessEvaluation {
  const { temperature, heartRate, motion } = reading

  // Default values
  let status: WellnessStatus = 'NORMAL'
  let title = 'Optimal Balance'
  let message = 'Vitals stable. Maintaining healthy daily movement.'
  let skinTempStatus = 'Normal Range (36.4 - 36.8 °C)'
  let hrStatus = 'Normal Resting HR'
  let recoveryScore = 92

  // Skin temperature check
  if (temperature > 37.3) {
    skinTempStatus = 'Elevated Skin Temperature'
  } else if (temperature < 36.0) {
    skinTempStatus = 'Slightly Cool Skin Temperature'
  }

  // Heart rate & Motion check
  if (motion === 'HIGH_INTENSITY' || heartRate > 155) {
    status = 'HIGH_INTENSITY'
    title = 'High Intensity Active'
    message = 'High-intensity activity detected. Monitor exertion level and keep hydrated.'
    hrStatus = 'Peak Active Heart Rate'
    recoveryScore = 65
  } else if (motion === 'RUN' || heartRate > 130) {
    status = 'MODERATE'
    title = 'Active Exercise'
    message = 'Sustained workout detected. Excellent stamina pacing.'
    hrStatus = 'Elevated Active HR'
    recoveryScore = 80
  } else if (temperature >= 37.2 && heartRate > 100) {
    status = 'RECOVERY_RECOMMENDED'
    title = 'Recovery Advised'
    message = 'Elevated skin temperature and heart rate observed. Consider a short rest break.'
    recoveryScore = 55
  }

  // Hydration evaluation
  if (hydrationTodayMl < 1000 || (temperature > 37.0 && hydrationTodayMl < 1800)) {
    if (status !== 'HIGH_INTENSITY' && status !== 'RECOVERY_RECOMMENDED') {
      status = 'HYDRATION_RECOMMENDED'
      title = 'Hydration Intake Recommended'
      message = 'Your body skin temperature is slightly elevated relative to fluid intake today. Sip 250ml water.'
    }
  }

  return {
    status,
    title,
    message,
    skinTempStatus,
    hrStatus,
    recoveryScore,
  }
}
