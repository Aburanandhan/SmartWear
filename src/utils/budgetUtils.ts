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
 * Converts category rupee amounts to exact integer percentages that sum to 100%.
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

  const rawPcts = keys.map((k) => ({
    key: k,
    val: ((amounts[k] || 0) / totalAmount) * 100,
  }))

  const intPcts: Record<CategoryKey, number> = { food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0 }
  let sumInt = 0
  const remainders = rawPcts.map((item) => {
    const floorVal = Math.floor(item.val)
    intPcts[item.key] = floorVal
    sumInt += floorVal
    return { key: item.key, rem: item.val - floorVal }
  })

  let leftover = 100 - sumInt
  remainders.sort((a, b) => b.rem - a.rem)
  for (let i = 0; i < leftover; i++) {
    intPcts[remainders[i].key] += 1
  }

  return intPcts
}

/**
 * Converts integer percentages (totaling 100%) to rupee amounts that sum EXACTLY to monthly budget.
 */
export function percentagesToAmounts(
  percentages: Record<CategoryKey, number>,
  budget: number
): Record<CategoryKey, number> {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']

  const rawAmounts = keys.map((k) => ({
    key: k,
    val: (budget * (percentages[k] || 0)) / 100,
  }))

  const intAmounts: Record<CategoryKey, number> = { food: 0, supplements: 0, hydration: 0, recovery: 0, other: 0 }
  let sumInt = 0
  const remainders = rawAmounts.map((item) => {
    const floorVal = Math.floor(item.val)
    intAmounts[item.key] = floorVal
    sumInt += floorVal
    return { key: item.key, rem: item.val - floorVal }
  })

  let leftover = budget - sumInt
  remainders.sort((a, b) => b.rem - a.rem)
  for (let i = 0; i < leftover; i++) {
    intAmounts[remainders[i].key] += 1
  }

  return intAmounts
}

/**
 * Rebalances percentages when user modifies a category percentage so that:
 * - Sum of all percentages equals exactly 100%.
 * - No percentage < 0.
 * - No percentage > 100.
 */
export function rebalancePercentages(
  currentPcts: Record<CategoryKey, number>,
  changedKey: CategoryKey,
  targetPct: number
): Record<CategoryKey, number> {
  const keys: CategoryKey[] = ['food', 'supplements', 'hydration', 'recovery', 'other']
  const oldPct = currentPcts[changedKey] || 0
  const otherKeys = keys.filter((k) => k !== changedKey)

  const clampedTarget = Math.max(0, Math.min(100, Math.round(targetPct)))
  const delta = clampedTarget - oldPct

  if (delta === 0) return { ...currentPcts }

  const newPcts: Record<CategoryKey, number> = { ...currentPcts }

  if (delta > 0) {
    const availableInOthers = otherKeys.reduce((sum, k) => sum + (currentPcts[k] || 0), 0)
    const actualDelta = Math.min(delta, availableInOthers)

    newPcts[changedKey] = oldPct + actualDelta

    if (availableInOthers > 0 && actualDelta > 0) {
      const posKeys = otherKeys.filter((k) => (currentPcts[k] || 0) > 0)
      const sumPos = posKeys.reduce((sum, k) => sum + currentPcts[k], 0)

      const rawReductions = posKeys.map((k) => ({
        key: k,
        val: (actualDelta * currentPcts[k]) / sumPos,
      }))

      let sumIntReductions = 0
      const remainders = rawReductions.map((item) => {
        const floorVal = Math.floor(item.val)
        sumIntReductions += floorVal
        return { key: item.key, floorVal, rem: item.val - floorVal }
      })

      let leftoverDelta = actualDelta - sumIntReductions
      remainders.sort((a, b) => b.rem - a.rem)

      const finalReductions: Record<string, number> = {}
      remainders.forEach((item, index) => {
        finalReductions[item.key] = item.floorVal + (index < leftoverDelta ? 1 : 0)
      })

      posKeys.forEach((k) => {
        newPcts[k] = Math.max(0, currentPcts[k] - (finalReductions[k] || 0))
      })
    }
  } else {
    const freed = -delta
    newPcts[changedKey] = clampedTarget

    const posKeys = otherKeys.filter((k) => (currentPcts[k] || 0) > 0)

    if (posKeys.length > 0) {
      const sumPos = posKeys.reduce((sum, k) => sum + currentPcts[k], 0)

      const rawAdditions = posKeys.map((k) => ({
        key: k,
        val: (freed * currentPcts[k]) / sumPos,
      }))

      let sumIntAdditions = 0
      const remainders = rawAdditions.map((item) => {
        const floorVal = Math.floor(item.val)
        sumIntAdditions += floorVal
        return { key: item.key, floorVal, rem: item.val - floorVal }
      })

      let leftoverFreed = freed - sumIntAdditions
      remainders.sort((a, b) => b.rem - a.rem)

      const finalAdditions: Record<string, number> = {}
      remainders.forEach((item, index) => {
        finalAdditions[item.key] = item.floorVal + (index < leftoverFreed ? 1 : 0)
      })

      posKeys.forEach((k) => {
        newPcts[k] = currentPcts[k] + (finalAdditions[k] || 0)
      })
    } else {
      const count = otherKeys.length
      const baseAdd = Math.floor(freed / count)
      let leftoverFreed = freed - baseAdd * count

      otherKeys.forEach((k, index) => {
        newPcts[k] = baseAdd + (index < leftoverFreed ? 1 : 0)
      })
    }
  }

  // Guarantee total sum is exactly 100
  const currentTotal = keys.reduce((sum, k) => sum + newPcts[k], 0)
  if (currentTotal !== 100) {
    const diff = 100 - currentTotal
    newPcts[changedKey] = Math.max(0, newPcts[changedKey] + diff)
  }

  return newPcts
}
