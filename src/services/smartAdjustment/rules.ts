import type { CategoryKey } from '../../utils/budgetUtils'

export interface AdjustmentRuleThresholds {
  tempElevatedCelsius: number
  tempCriticalCelsius: number
  heartRateHighBpm: number
  hydrationDefaultAddMl: number
  defaultReallocationAmount: number
}

export const DEFAULT_THRESHOLDS: AdjustmentRuleThresholds = {
  tempElevatedCelsius: 37.0,
  tempCriticalCelsius: 38.0,
  heartRateHighBpm: 155,
  hydrationDefaultAddMl: 250,
  defaultReallocationAmount: 30,
}

export const CATEGORY_LABELS: Record<CategoryKey, string> = {
  food: 'Food',
  supplements: 'Supplements',
  hydration: 'Hydration',
  recovery: 'Recovery',
  other: 'Gear',
}
