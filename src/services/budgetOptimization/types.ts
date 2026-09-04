import type { CategoryKey } from '../../utils/budgetUtils'
import type { UserProfile } from '../../App'
import type { ExpenseItem } from '../budgetService'

export interface OptimizationInput {
  profile: UserProfile
  expenses: ExpenseItem[]
  hydrationToday: number
  sensorContext?: {
    heartRate: number
    temperature: number
    spo2: number
    motion: string
  } | null
}

export interface CategoryChange {
  category: CategoryKey
  label: string
  icon: string
  before: number
  after: number
  delta: number
}

export interface OptimizationReasoning {
  goalLabel: string
  activitySummary: string
  foodPreference: string
  budgetSummary: string
  spendingSummary: string
  explanation: string
}

export interface OptimizationRecommendation {
  category: CategoryKey
  label: string
  icon: string
  amount: number
  description: string
}

export interface OptimizationResult {
  availableAmount: number
  recommendations: OptimizationRecommendation[]
  categoryChanges: CategoryChange[]
  reasoning: OptimizationReasoning
  score: number
  scoreBreakdown: {
    goalFit: number
    foodPreferenceFit: number
    budgetFit: number
    activityRelevance: number
    nutritionFit: number
  }
  smartReallocationEnabled: boolean
  timestamp: string
}
