import type { Goal } from '../../App'
import type { CategoryKey } from '../../utils/budgetUtils'

/**
 * Goal-based allocation priority weights.
 * Higher weight = more budget should flow to this category for this goal.
 */
export const GOAL_CATEGORY_WEIGHTS: Record<Goal, Record<CategoryKey, number>> = {
  athlete: { food: 0.45, hydration: 0.25, supplements: 0.15, recovery: 0.10, other: 0.05 },
  gym: { food: 0.40, supplements: 0.25, hydration: 0.15, recovery: 0.15, other: 0.05 },
  strength: { food: 0.40, supplements: 0.30, hydration: 0.10, recovery: 0.15, other: 0.05 },
  general: { food: 0.45, hydration: 0.20, recovery: 0.15, supplements: 0.10, other: 0.10 },
  weight: { food: 0.50, hydration: 0.20, supplements: 0.10, recovery: 0.10, other: 0.10 },
  endurance: { food: 0.40, hydration: 0.30, supplements: 0.10, recovery: 0.15, other: 0.05 },
}

/**
 * Minimum amount (₹) worth optimizing.
 * Below this, we show "No optimization available."
 */
export const MIN_OPTIMIZE_AMOUNT = 50

/**
 * Minimum unused amount (₹) in a category to be considered for reallocation
 */
export const MIN_REALLOCATE_AMOUNT = 50

/**
 * Category metadata for display
 */
export const CATEGORY_DISPLAY: Record<CategoryKey | 'reserve', { label: string; icon: string }> = {
  food: { label: 'Food', icon: '🥗' },
  supplements: { label: 'Supplements', icon: '💊' },
  hydration: { label: 'Hydration', icon: '💧' },
  recovery: { label: 'Recovery', icon: '🧘' },
  other: { label: 'Gear', icon: '🏋️' },
  reserve: { label: 'Reserve', icon: '🛡️' },
}

/**
 * Category safety factors: minimum portion of allocated budget to protect for expected future spend
 */
export const CATEGORY_SAFETY_FACTORS: Record<CategoryKey, number> = {
  food: 0.50,
  supplements: 0.25,
  hydration: 0.30,
  recovery: 0.25,
  other: 0.10,
}

/**
 * Activity-based hydration boost factor.
 * If sensor shows high intensity, boost hydration allocation.
 */
export const ACTIVITY_HYDRATION_BOOST = 1.5

/**
 * Score weights for the recommendation match score
 */
export const SCORE_WEIGHTS = {
  goalFit: 0.30,
  foodPreferenceFit: 0.20,
  budgetFit: 0.20,
  activityRelevance: 0.15,
  nutritionFit: 0.15,
}
