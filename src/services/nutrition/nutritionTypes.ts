export type NutritionKey = 'calories' | 'protein' | 'carbohydrates' | 'fat' | 'fiber' | 'sugar' | 'sodium'

export interface NutritionFood {
  id: string
  name: string
  category: string
  servingSize: string
  calories: number | null
  protein: number | null
  carbohydrates: number | null
  fat: number | null
  fiber: number | null
  sugar: number | null
  sodium: number | null
  nutritionSource: string
  verified: boolean
}

export interface FoodLogEntry {
  id: string
  foodId: string | null
  foodName: string
  quantity: number
  servingSize: string
  calories: number | null
  protein: number | null
  carbohydrates: number | null
  fat: number | null
  fiber: number | null
  loggedAt: string
}

export interface NutritionTotals {
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  fiber: number
  sugar: number
  sodium: number
}

export interface NutritionDailyTarget {
  calories: number | null
  protein: number | null
  carbohydrates: number | null
  fat: number | null
  fiber: number | null
}
