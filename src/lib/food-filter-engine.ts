import type { UserProfile, Goal } from '../App'
import type { SensorReading } from '../services/sensor/types'
import type { ExpenseItem } from '../services/budgetService'
import { FOOD_DATASET, type FoodItem, type DietType, type MealType } from '../data/foods'

export interface FilterOptions {
  dietType?: DietType
  mealType?: MealType | 'all'
  maxCost?: number
  minProtein?: number
  searchQuery?: string
}

export interface FoodBudgetMetrics {
  foodAllocation: number
  foodSpent: number
  remainingFoodBudget: number
  remainingDays: number
  dailyFoodBudget: number
  status: 'HIGH' | 'MODERATE' | 'LOW' | 'EXHAUSTED'
  statusMessage: string
}

export interface FilterAuditPipeline {
  totalDatasetCount: number
  afterDietCount: number
  afterExclusionCount: number
  afterBudgetCount: number
  finalRankedCount: number
}

export interface RankedFoodItem extends FoodItem {
  score: number
  budgetScore: number
  goalScore: number
  activityScore: number
  prefScore: number
  nutritionScore: number
  reasons: string[]
  explanation: string
  affordableAlternative?: FoodItem
}

export interface RecommendationEngineOutput {
  budgetMetrics: FoodBudgetMetrics
  rankedMeals: RankedFoodItem[]
  pipeline: FilterAuditPipeline
}

// 1. Calculate Food Budget Metrics
export function calculateFoodBudgetMetrics(
  profile: UserProfile,
  expenses: ExpenseItem[],
  overrideDailyBudget?: number
): FoodBudgetMetrics {
  const foodAllocation = profile.budgetCategories?.food || 3000

  const foodSpent = expenses
    .filter((e) => e.category === 'food')
    .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)

  const remainingFoodBudget = Math.max(0, foodAllocation - foodSpent)

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1)
  
  const dailyFoodBudget = overrideDailyBudget !== undefined 
    ? overrideDailyBudget 
    : Math.max(20, Math.round(remainingFoodBudget / remainingDays))

  let status: 'HIGH' | 'MODERATE' | 'LOW' | 'EXHAUSTED' = 'HIGH'
  let statusMessage = 'Healthy food budget balance.'

  const remainingPct = foodAllocation > 0 ? (remainingFoodBudget / foodAllocation) * 100 : 0

  if (remainingFoodBudget <= 0) {
    status = 'EXHAUSTED'
    statusMessage = 'Your food budget has been reached. SmartWear is prioritizing low-cost basic ingredient meals.'
  } else if (remainingPct < 25 || remainingFoodBudget <= 400 || dailyFoodBudget <= 50) {
    status = 'LOW'
    statusMessage = 'Food budget is low. Prioritizing budget-conscious options under ₹50.'
  } else if (remainingPct < 60) {
    status = 'MODERATE'
    statusMessage = 'Moderate food budget remaining. Balanced cost options recommended.'
  }

  return {
    foodAllocation,
    foodSpent,
    remainingFoodBudget,
    remainingDays,
    dailyFoodBudget,
    status,
    statusMessage,
  }
}

// 2. Hard Filtering Engine with Audit Pipeline
export function applyHardFiltersWithAudit(
  foods: FoodItem[],
  profile: UserProfile,
  options: FilterOptions = {},
  dailyBudget: number = 90
): { filtered: FoodItem[]; pipeline: FilterAuditPipeline } {
  const totalDatasetCount = foods.length
  const effectiveDiet = options.dietType || profile.dietType || 'vegetarian'
  const exclusions = (profile.excludedFoods || []).map((e) => e.toLowerCase())

  // Step 1: Diet Filter
  const afterDiet = foods.filter((food) => {
    const foodIngredients = food.ingredients.map((i) => i.toLowerCase())
    if (effectiveDiet === 'vegetarian') {
      if (food.dietType === 'non-vegetarian') return false
      if (foodIngredients.some((i) => ['chicken', 'mutton', 'fish', 'seafood'].includes(i))) return false
    } else if (effectiveDiet === 'vegan') {
      if (food.dietType !== 'vegan') return false
      if (foodIngredients.some((i) => ['eggs', 'milk/dairy', 'paneer', 'curd', 'ghee', 'chicken', 'mutton', 'fish', 'seafood'].includes(i))) return false
    } else if (effectiveDiet === 'eggitarian') {
      if (food.dietType === 'non-vegetarian') return false
      if (foodIngredients.some((i) => ['chicken', 'mutton', 'fish', 'seafood'].includes(i))) return false
    }
    return true
  })

  // Step 2: Exclusion Filter
  const afterExclusion = afterDiet.filter((food) => {
    const foodIngredients = food.ingredients.map((i) => i.toLowerCase())
    const foodNameLower = food.name.toLowerCase()
    if (exclusions.length > 0) {
      for (const excl of exclusions) {
        if (foodIngredients.includes(excl)) return false
        if (foodNameLower.includes(excl)) return false
        if (excl === 'milk/dairy' && (foodIngredients.includes('paneer') || foodIngredients.includes('curd') || foodIngredients.includes('ghee'))) return false
      }
    }
    return true
  })

  // Step 3: Budget & Options Filter
  const afterBudget = afterExclusion.filter((food) => {
    // Meal Type Option
    if (options.mealType && options.mealType !== 'all') {
      if (food.mealType !== options.mealType) return false
    }

    // Max Cost Cap Option
    if (options.maxCost && options.maxCost > 0) {
      if (food.estimatedCost > options.maxCost) return false
    }

    // Min Protein Option
    if (options.minProtein && options.minProtein > 0) {
      if (food.protein < options.minProtein) return false
    }

    // Search Query Option
    if (options.searchQuery && options.searchQuery.trim() !== '') {
      const q = options.searchQuery.toLowerCase()
      const matchName = food.name.toLowerCase().includes(q)
      const matchTag = food.tags.some((t) => t.toLowerCase().includes(q))
      if (!matchName && !matchTag) return false
    }

    return true
  })

  return {
    filtered: afterBudget,
    pipeline: {
      totalDatasetCount,
      afterDietCount: afterDiet.length,
      afterExclusionCount: afterExclusion.length,
      afterBudgetCount: afterBudget.length,
      finalRankedCount: afterBudget.length,
    },
  }
}

// 3. Smart Alternatives Finder
export function findAffordableAlternative(
  originalFood: FoodItem,
  filteredPool: FoodItem[],
  dailyBudget: number
): FoodItem | undefined {
  if (originalFood.estimatedCost <= dailyBudget * 0.7 && originalFood.estimatedCost <= 45) {
    return undefined
  }

  const substitutes = filteredPool.filter((f) => {
    if (f.id === originalFood.id) return false
    if (f.estimatedCost >= originalFood.estimatedCost) return false
    if (f.dietType !== originalFood.dietType && originalFood.dietType === 'vegan' && f.dietType !== 'vegan') return false
    return true
  })

  return substitutes.sort((a, b) => a.estimatedCost - b.estimatedCost)[0]
}

// 4. Recommendation Scoring & Ranking Engine
export function rankPersonalizedFoods(
  profile: UserProfile,
  expenses: ExpenseItem[],
  sensor?: SensorReading,
  options: FilterOptions = {},
  overrideDailyBudget?: number
): RecommendationEngineOutput {
  const budgetMetrics = calculateFoodBudgetMetrics(profile, expenses, overrideDailyBudget)
  const { filtered, pipeline } = applyHardFiltersWithAudit(FOOD_DATASET, profile, options, budgetMetrics.dailyFoodBudget)

  const preferredList = (profile.preferredFoods || []).map((p) => p.toLowerCase())
  const userGoal = profile.goal || 'gym'
  const motionState = sensor?.motion || 'REST'

  const rankedMeals: RankedFoodItem[] = filtered
    .map((food) => {
      const reasons: string[] = []

      // 1. Goal Match Score (30%)
      let goalScore = 60
      if (food.goalCompatibility.includes(userGoal)) {
        goalScore = 100
        reasons.push(`Matches your ${userGoal.toUpperCase()} goal`)
      } else {
        goalScore = 50
      }

      // 2. Food Preference Score (20%)
      let prefScore = 50
      if (profile.foodStyle && profile.foodStyle !== 'no-preference') {
        if (food.foodStyle === profile.foodStyle) {
          prefScore += 25
          reasons.push(`Matches ${profile.foodStyle.replace('-', ' ').toUpperCase()} style`)
        }
      }
      if (preferredList.length > 0) {
        const matchesPref = food.ingredients.some((i) => preferredList.includes(i.toLowerCase()))
        if (matchesPref) {
          prefScore += 25
          reasons.push(`Contains preferred staple ingredients`)
        }
      }
      prefScore = Math.min(100, prefScore)

      // 3. Budget Fit Score (25%)
      let budgetScore = 70
      const costRatio = food.estimatedCost / Math.max(1, budgetMetrics.dailyFoodBudget)

      if (budgetMetrics.status === 'EXHAUSTED' || budgetMetrics.status === 'LOW' || budgetMetrics.dailyFoodBudget <= 45) {
        if (food.estimatedCost <= 35) {
          budgetScore = 100
          reasons.push(`Fits remaining ₹${budgetMetrics.dailyFoodBudget}/day budget`)
        } else {
          budgetScore = Math.max(10, 90 - (food.estimatedCost - 35) * 3)
        }
      } else {
        if (costRatio <= 0.35) {
          budgetScore = 100
          reasons.push(`Fits remaining ₹${budgetMetrics.dailyFoodBudget}/day budget`)
        } else if (costRatio <= 0.7) {
          budgetScore = 85
          reasons.push(`Within daily allowance (₹${food.estimatedCost})`)
        } else if (costRatio <= 1.0) {
          budgetScore = 70
        } else {
          budgetScore = Math.max(10, 70 - (food.estimatedCost - budgetMetrics.dailyFoodBudget) * 2)
        }
      }

      // 4. Activity Match Score (15%)
      let activityScore = 70
      if (motionState === 'RUN' || motionState === 'HIGH_INTENSITY') {
        if (food.mealType === 'post-workout' || food.protein >= 18) {
          activityScore = 100
          reasons.push(`Suitable for current ${motionState} activity`)
        }
      } else if (motionState === 'REST') {
        if (food.calories <= 450) {
          activityScore = 90
          reasons.push(`Suitable for current rest activity`)
        }
      }

      // 5. Nutrition Fit Score (10%)
      let nutritionScore = 70
      if (userGoal === 'strength' || userGoal === 'gym') {
        nutritionScore = Math.min(100, food.protein * 3.5)
        if (food.protein >= 18) reasons.push(`Meets your protein preference`)
      } else if (userGoal === 'weight') {
        nutritionScore = food.calories <= 380 ? 95 : 60
      } else {
        nutritionScore = 80
      }

      // Weighted Total Score
      const totalScore = Math.round(
        goalScore * 0.30 +
        prefScore * 0.20 +
        budgetScore * 0.25 +
        activityScore * 0.15 +
        nutritionScore * 0.10
      )

      // Explanation Summary Text
      const mainReason = reasons[0] || `Matches dietary profile`
      const explanation = `Recommended because it ${mainReason.toLowerCase()} and fits your remaining ₹${budgetMetrics.dailyFoodBudget}/day food budget.`

      // Smart Affordable Alternative Check
      const affordableAlternative = findAffordableAlternative(food, filtered, budgetMetrics.dailyFoodBudget)

      return {
        ...food,
        score: totalScore,
        budgetScore,
        goalScore,
        activityScore,
        prefScore,
        nutritionScore,
        reasons,
        explanation,
        affordableAlternative,
      }
    })
    .sort((a, b) => b.score - a.score)

  return {
    budgetMetrics,
    rankedMeals,
    pipeline,
  }
}
