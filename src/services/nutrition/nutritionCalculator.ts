import { lookupFoodById, FOOD_NUTRITION_DATABASE } from './foodDatabase'
import type { NutritionDailyTarget, NutritionTotals, FoodLogEntry } from './nutritionTypes'

export function calculateTotalsFromLogs(logs: FoodLogEntry[]): NutritionTotals {
  return logs.reduce(
    (totals, log) => {
      const qty = Number(log.quantity) || 1
      const multiplier = qty
      totals.calories += Number(log.calories || 0) * multiplier
      totals.protein += Number(log.protein || 0) * multiplier
      totals.carbohydrates += Number(log.carbohydrates || 0) * multiplier
      totals.fat += Number(log.fat || 0) * multiplier
      totals.fiber += Number(log.fiber || 0) * multiplier
      totals.sugar += Number(log.sugar || 0) * multiplier
      totals.sodium += Number(log.sodium || 0) * multiplier
      return totals
    },
    { calories: 0, protein: 0, carbohydrates: 0, fat: 0, fiber: 0, sugar: 0, sodium: 0 }
  )
}

export function estimateDailyTargets(profile: {
  goal?: string
  age?: number
  height?: number
  weight?: number
  activityLevel?: string
  dietType?: string
}): NutritionDailyTarget {
  const weight = Number(profile.weight) || 0
  const goal = profile.goal || 'general'
  const isActive = (profile.activityLevel || '').toLowerCase().includes('active') || (profile.activityLevel || '').toLowerCase().includes('very')

  let calories = null
  let protein = null
  let carbohydrates = null
  let fat = null
  let fiber = null

  if (weight > 0) {
    calories = Math.round(weight * 30 + (isActive ? 250 : 0))
    protein = Math.round(weight * 1.6)
    carbohydrates = Math.round(weight * 3.5)
    fat = Math.round(weight * 0.8)
    fiber = Math.round(weight * 0.3)

    if (goal === 'weight') {
      calories = Math.max(1800, calories - 250)
    }
    if (goal === 'strength' || goal === 'gym' || goal === 'athlete') {
      protein = Math.max(protein, 120)
      calories = Math.max(calories, 2200)
    }
    if (goal === 'endurance') {
      carbohydrates = Math.max(carbohydrates, 260)
    }
  }

  return {
    calories,
    protein,
    carbohydrates,
    fat,
    fiber,
  }
}

export function getNutritionValueForFood(foodId: string, servingAmount: number = 1): { calories: number | null; protein: number | null; carbohydrates: number | null; fat: number | null; fiber: number | null; sugar: number | null; sodium: number | null } {
  const base = lookupFoodById(foodId) ?? FOOD_NUTRITION_DATABASE[0]

  if (!base) {
    return { calories: null, protein: null, carbohydrates: null, fat: null, fiber: null, sugar: null, sodium: null }
  }

  return {
    calories: typeof base.calories === 'number' ? Number((base.calories * servingAmount).toFixed(1)) : null,
    protein: typeof base.protein === 'number' ? Number((base.protein * servingAmount).toFixed(1)) : null,
    carbohydrates: typeof base.carbohydrates === 'number' ? Number((base.carbohydrates * servingAmount).toFixed(1)) : null,
    fat: typeof base.fat === 'number' ? Number((base.fat * servingAmount).toFixed(1)) : null,
    fiber: typeof base.fiber === 'number' ? Number((base.fiber * servingAmount).toFixed(1)) : null,
    sugar: typeof base.sugar === 'number' ? Number((base.sugar * servingAmount).toFixed(1)) : null,
    sodium: typeof base.sodium === 'number' ? Number((base.sodium * servingAmount).toFixed(1)) : null,
  }
}
