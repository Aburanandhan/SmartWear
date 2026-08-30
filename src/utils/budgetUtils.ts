export type CategoryKey = 'food' | 'supplements' | 'hydration' | 'recovery' | 'other'

export interface CategoryDef {
  key: CategoryKey
  label: string
  icon: string
  color: string
}

export const CATEGORIES: CategoryDef[] = [
  { key: 'food', label: 'Food & Groceries', icon: '🥗', color: '#22c55e' },
  { key: 'supplements', label: 'Supplements', icon: '💊', color: '#8b5cf6' },
  { key: 'hydration', label: 'Hydration', icon: '💧', color: '#3b82f6' },
  { key: 'recovery', label: 'Recovery', icon: '🧘', color: '#f59e0b' },
  { key: 'other', label: 'Other / Gear', icon: '🏋️', color: '#64748b' },
]

export const DEFAULT_PERCENTAGES: Record<CategoryKey, number> = {
  food: 50,
  supplements: 20,
  hydration: 10,
  recovery: 10,
  other: 10,
}

/**
 * Converts category rupee amounts to integer percentages.
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
    result[k] = Math.round(((amounts[k] || 0) / budget) * 100)
  })

  return result
}

/**
 * Converts category percentages to rupee amounts based on monthly budget.
 */
export function percentagesToAmounts(
  percentages: Record<CategoryKey, number>,
  budget: number
): Record<CategoryKey, number> {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']
  const result: Record<CategoryKey, number> = { food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0 }

  keys.forEach((k) => {
    result[k] = Math.round((budget * (percentages[k] || 0)) / 100)
  })

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

  if (totalPct < 100) {
    return {
      valid: false,
      totalPct,
      totalAmount,
      error: `Allocation must total 100%. Current allocation: ${totalPct}%`,
    }
  }

  if (totalPct > 100) {
    return {
      valid: false,
      totalPct,
      totalAmount,
      error: `Allocation cannot exceed 100%. Current allocation: ${totalPct}%`,
    }
  }

  if (totalAmount !== budget) {
    return {
      valid: false,
      totalPct,
      totalAmount,
      error: `Calculated category amounts (₹${totalAmount.toLocaleString()}) must total exactly the selected monthly budget (₹${budget.toLocaleString()}).`,
    }
  }

  return {
    valid: true,
    totalPct,
    totalAmount,
    error: null,
  }
}
