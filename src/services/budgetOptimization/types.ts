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

// ═══════════════════════════════════════════════════════════
// DYNAMIC BUDGET REALLOCATION TYPES
// ═══════════════════════════════════════════════════════════

export interface SourceCategoryUnused {
  category: CategoryKey
  label: string
  icon: string
  allocated: number
  spent: number
  unused: number
  safeAmount: number
  daysRemaining: number
  runRate: number
}

export interface DestinationAllocation {
  category: CategoryKey | 'reserve'
  label: string
  icon: string
  currentAllocation: number
  recommendedIncrease: number
  newAllocation: number
  reason: string
  priorityScore: number
}

export interface ReallocationOpportunity {
  status: 'available' | 'balanced' | 'low_data' | 'disabled'
  totalUnused: number
  totalSafeToReallocate: number
  sources: SourceCategoryUnused[]
  destinations: DestinationAllocation[]
  reserveAmount: number
  reallocatedAmount: number
  summaryHeadline: string
  recommendationList: {
    category: string
    label: string
    icon: string
    amount: number
  }[]
  detailedReasoning: {
    sourcesSummary: string
    workoutContext: string
    hydrationContext: string
    spendingPressure: string
    reserveExplanation: string
    fullExplanation: string
  }
  beforeAllocations: Record<string, number>
  afterAllocations: Record<string, number>
  matchScore: number
  smartReallocationEnabled: boolean
  timestamp: string
}

export interface ReallocationAuditLog {
  id?: string
  userId?: string
  sourceReductions: Record<string, number>
  destinationIncreases: Record<string, number>
  reserveAmount: number
  totalReallocated: number
  reason: string
  timestamp: string
  status: 'applied' | 'dismissed'
}
