import type { UserProfile, Goal } from '../App'
import type { SensorReading } from '../services/sensor/types'

export interface RecommendationWeights {
  goalMatch: number // default 0.40
  activityMatch: number // default 0.20
  budgetMatch: number // default 0.20
  fitnessMatch: number // default 0.20
}

export const DEFAULT_WEIGHTS: RecommendationWeights = {
  goalMatch: 0.40,
  activityMatch: 0.20,
  budgetMatch: 0.20,
  fitnessMatch: 0.20,
}

export interface MealRecommendation {
  id: string
  name: string
  mealType: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Post-Workout'
  targetGoal: Goal[]
  calories: number
  protein: number
  carbohydrates: number
  fat: number
  estimatedCost: number // in INR ₹
  description: string
  score?: number
}

export const INDIAN_MEAL_DATABASE: MealRecommendation[] = [
  {
    id: 'm1',
    name: 'Sprouted Moong & Paneer Salad',
    mealType: 'Breakfast',
    targetGoal: ['weight', 'general', 'gym'],
    calories: 320,
    protein: 22,
    carbohydrates: 28,
    fat: 12,
    estimatedCost: 65,
    description: 'High-protein, fiber-rich sprouted green gram with low-fat cottage cheese and lemon dressing.',
  },
  {
    id: 'm2',
    name: 'Oats Egg Bhurji Roll',
    mealType: 'Breakfast',
    targetGoal: ['strength', 'athlete', 'gym'],
    calories: 440,
    protein: 28,
    carbohydrates: 42,
    fat: 16,
    estimatedCost: 75,
    description: 'Whole wheat & oat roti stuffed with scrambled eggs, spinach, and spices.',
  },
  {
    id: 'm3',
    name: 'Sattu Protein Smoothie',
    mealType: 'Post-Workout',
    targetGoal: ['strength', 'endurance', 'athlete', 'gym'],
    calories: 280,
    protein: 20,
    carbohydrates: 36,
    fat: 6,
    estimatedCost: 35,
    description: 'Traditional roasted Bengal gram flour shake with banana, milk, and cardamom.',
  },
  {
    id: 'm4',
    name: 'Brown Rice & Chicken/Paneer Curry',
    mealType: 'Lunch',
    targetGoal: ['strength', 'athlete', 'endurance'],
    calories: 550,
    protein: 38,
    carbohydrates: 62,
    fat: 14,
    estimatedCost: 130,
    description: 'Lean protein curry served with unpolished brown rice and cucumber raita.',
  },
  {
    id: 'm5',
    name: 'Dal Khichdi with Ghee & Boiled Egg/Tofu',
    mealType: 'Dinner',
    targetGoal: ['general', 'weight', 'endurance'],
    calories: 380,
    protein: 18,
    carbohydrates: 54,
    fat: 10,
    estimatedCost: 50,
    description: 'Light, gut-friendly moong dal & rice khichdi with a dash of pure ghee.',
  },
  {
    id: 'm6',
    name: 'Roasted Chana & Almond Trail Mix',
    mealType: 'Snack',
    targetGoal: ['general', 'weight', 'gym'],
    calories: 210,
    protein: 10,
    carbohydrates: 22,
    fat: 9,
    estimatedCost: 40,
    description: 'Crunchy roasted chickpeas mixed with raw almonds and cumin powder.',
  },
]

export function rankMealRecommendations(
  profile: UserProfile,
  sensor?: SensorReading,
  weights: RecommendationWeights = DEFAULT_WEIGHTS
): MealRecommendation[] {
  const dailyFoodBudget = (profile.budgetCategories?.food || 3200) / 30

  return INDIAN_MEAL_DATABASE.map((meal) => {
    // 1. Goal Match Score (0 - 100)
    const goalMatch = meal.targetGoal.includes(profile.goal) ? 100 : 40

    // 2. Activity Match Score (0 - 100)
    let activityMatch = 70
    if (sensor) {
      if (sensor.motion === 'RUN' || sensor.motion === 'HIGH_INTENSITY') {
        if (meal.mealType === 'Post-Workout' || meal.protein > 24) activityMatch = 100
      } else if (sensor.motion === 'REST') {
        if (meal.calories < 400) activityMatch = 90
      }
    }

    // 3. Budget Match Score (0 - 100)
    let budgetMatch = 100
    if (meal.estimatedCost > dailyFoodBudget * 0.4) {
      budgetMatch = Math.max(20, 100 - (meal.estimatedCost - dailyFoodBudget * 0.4) * 2)
    }

    // 4. Fitness Match Score (0 - 100)
    let fitnessMatch = 75
    if (profile.activityLevel === 'active' || profile.activityLevel === 'very-active') {
      if (meal.protein >= 20) fitnessMatch = 100
    } else {
      if (meal.calories <= 450) fitnessMatch = 90
    }

    const totalScore = Math.round(
      goalMatch * weights.goalMatch +
        activityMatch * weights.activityMatch +
        budgetMatch * weights.budgetMatch +
        fitnessMatch * weights.fitnessMatch
    )

    return {
      ...meal,
      score: totalScore,
    }
  }).sort((a, b) => (b.score || 0) - (a.score || 0))
}
