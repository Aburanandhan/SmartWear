import { FOOD_NUTRITION_DATABASE, lookupFoodById, searchFoods } from './foodDatabase'
import { estimateDailyTargets, getNutritionValueForFood, calculateTotalsFromLogs } from './nutritionCalculator'
import type { FoodLogEntry, NutritionDailyTarget, NutritionFood, NutritionTotals } from './nutritionTypes'

export type { NutritionFood, FoodLogEntry, NutritionDailyTarget, NutritionTotals }

export const nutritionDatabase = FOOD_NUTRITION_DATABASE

export function getFoodById(foodId: string): NutritionFood | undefined {
  return lookupFoodById(foodId)
}

export function findFoodsByName(query: string): NutritionFood[] {
  return searchFoods(query)
}

export function aFoodIsAvailable(foodId: string): boolean {
  return Boolean(getFoodById(foodId))
}

export function calculateDailyNutrition(logs: FoodLogEntry[], profile: Record<string, unknown>): { totals: NutritionTotals; targets: NutritionDailyTarget } {
  const totals = calculateTotalsFromLogs(logs)
  const targets = estimateDailyTargets(profile)
  return { totals, targets }
}

export function createFoodLogEntry(input: {
  foodId: string | null
  foodName: string
  quantity: number
  servingSize: string
  calories: number | null
  protein: number | null
  carbohydrates: number | null
  fat: number | null
  fiber: number | null
  sugar?: number | null
  sodium?: number | null
  loggedAt?: string
}): FoodLogEntry {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    foodId: input.foodId,
    foodName: input.foodName,
    quantity: Number(input.quantity) || 1,
    servingSize: input.servingSize,
    calories: input.calories,
    protein: input.protein,
    carbohydrates: input.carbohydrates,
    fat: input.fat,
    fiber: input.fiber,
    loggedAt: input.loggedAt || new Date().toISOString(),
  }
}

export function getFoodNutritionSummary(foodId: string, quantity: number = 1) {
  return getNutritionValueForFood(foodId, quantity)
}
