import type { CategoryKey } from '../../utils/budgetUtils'
import type { SensorReading } from '../sensor/types'
import type { UserProfile } from '../../App'

export type SmartAdjustmentStatus = 'pending' | 'applied' | 'dismissed'

export interface WorkoutRecommendation {
  type: 'reduce' | 'normal' | 'recover' | 'stop'
  label: string
  detail: string
}

export interface HydrationAdjustment {
  additionalMl: number
  label: string
  detail: string
}

export interface BudgetAdjustment {
  fromCategory: CategoryKey
  toCategory: CategoryKey
  fromLabel: string
  toLabel: string
  amount: number
  label: string
  detail: string
}

export interface SmartAdjustment {
  id: string
  userId?: string
  createdAt: string
  trigger: string
  headline: string
  sensorContext: {
    heartRate: number
    temperature: number
    spo2: number
    motion: string
  }
  workoutRecommendation: WorkoutRecommendation
  hydrationAdjustment: HydrationAdjustment
  budgetAdjustment: BudgetAdjustment | null
  smartReallocationEnabled: boolean
  status: SmartAdjustmentStatus
  appliedAt?: string
}

export interface EngineInput {
  sensorReading?: SensorReading | null
  workoutActive?: boolean
  profile: UserProfile
  hydrationToday: number
  expenses: { category: CategoryKey; amount: number }[]
}
