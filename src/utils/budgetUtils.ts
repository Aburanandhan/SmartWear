export type CategoryKey = 'food' | 'supplements' | 'hydration' | 'recovery' | 'other'

export interface CategoryDef {
  key: CategoryKey
  label: string
  icon: string
  color: string
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'food', label: 'Food', icon: '🥗', color: '#22c55e' },
  { key: 'supplements', label: 'Supplements', icon: '💊', color: '#8b5cf6' },
  { key: 'hydration', label: 'Hydration', icon: '💧', color: '#3b82f6' },
  { key: 'recovery', label: 'Recovery', icon: '🧘', color: '#f59e0b' },
  { key: 'other', label: 'Gear', icon: '🏋️', color: '#64748b' },
]

export const DEFAULT_PERCENTAGES: Record<CategoryKey, number> = {
  food: 45.5,
  supplements: 24,
  hydration: 11,
  recovery: 10,
  other: 9.5,
}

/**
 * Converts category rupee amounts to percentage values.
 */
export function amountsToPercentages(
  amounts: Record<CategoryKey, number> | undefined,
  budget: number
): Record<CategoryKey, number> {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']

  if (!amounts || budget <= 0) {
    return { ...DEFAULT_PERCENTAGES }
  }

  const totalAmount = keys.reduce((sum, k) => sum + (amounts[k] || 0), 0)
  if (totalAmount <= 0) {
    return { ...DEFAULT_PERCENTAGES }
  }

  const result: Record<CategoryKey, number> = { food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0 }
  keys.forEach((k) => {
    const pct = ((amounts[k] || 0) / budget) * 100
    result[k] = Math.round(pct * 10) / 10
  })

  return result
}

/**
 * Converts category percentages to rupee amounts based on monthly budget.
 * Guarantees that sum of amounts equals budget exactly.
 */
export function percentagesToAmounts(
  percentages: Record<CategoryKey, number>,
  budget: number
): Record<CategoryKey, number> {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']
  const result: Record<CategoryKey, number> = { food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0 }

  let sum = 0
  keys.forEach((k) => {
    const amt = Math.round((budget * (percentages[k] || 0)) / 100)
    result[k] = amt
    sum += amt
  })

  const diff = budget - sum
  if (diff !== 0) {
    result.food += diff
  }

  return result
}

/**
 * Validates budget category allocation percentages and total rupee amounts.
 */
export function validateBudgetAllocation(
  percentages: Record<CategoryKey, number>,
  budget: number
): { valid: boolean; totalPct: number; totalAmount: number; error: string | null } {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']
  const totalPct = keys.reduce((sum, k) => sum + (percentages[k] || 0), 0)

  const amounts = percentagesToAmounts(percentages, budget)
  const totalAmount = keys.reduce((sum, k) => sum + (amounts[k] || 0), 0)

  if (totalAmount !== budget) {
    return {
      valid: false,
      totalPct,
      totalAmount,
      error: `Your allocation must total ₹${budget.toLocaleString()}.`,
    }
  }

  return {
    valid: true,
    totalPct,
    totalAmount,
    error: null,
  }
}

/**
 * Validates category rupee amounts directly against the selected monthly budget.
 */
export function validateCategoryAmounts(
  amounts: Record<CategoryKey, number>,
  budget: number
): { valid: boolean; totalAmount: number; totalPct: number; error: string | null } {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']
  const totalAmount = keys.reduce((sum, k) => sum + (amounts[k] || 0), 0)
  const totalPct = budget > 0 ? Math.round((totalAmount / budget) * 100 * 10) / 10 : 0

  if (totalAmount < budget) {
    const remaining = budget - totalAmount
    return {
      valid: false,
      totalAmount,
      totalPct,
      error: `Your allocation must total ₹${budget.toLocaleString()}. (₹${remaining.toLocaleString()} remaining)`,
    }
  }

  if (totalAmount > budget) {
    const exceeded = totalAmount - budget
    return {
      valid: false,
      totalAmount,
      totalPct,
      error: `Your allocation must total ₹${budget.toLocaleString()}. (₹${exceeded.toLocaleString()} over budget)`,
    }
  }

  return {
    valid: true,
    totalAmount,
    totalPct,
    error: null,
  }
}


