import { supabase } from '../lib/supabase'
import type { UserProfile } from '../App'

export async function fetchUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const { data: profileData, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()

    if (profileErr) console.warn('Fetch profile error:', profileErr)

    const { data: budgetData } = await supabase
      .from('budgets')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!profileData) return null

    const rawAlloc = budgetData?.category_allocations || {}
    const smartReallocation = rawAlloc._smartReallocation !== undefined ? Boolean(rawAlloc._smartReallocation) : true

    return {
      goal: profileData.goal || 'gym',
      age: profileData.age || 24,
      height: profileData.height || 172,
      weight: Number(profileData.weight) || 70,
      activityLevel: profileData.activity_level || 'moderate',
      primaryExercise: profileData.primary_exercise || 'Running',
      monthlyBudget: budgetData?.monthly_budget ? Number(budgetData.monthly_budget) : 10000,
      budgetCategories: {
        food: Number(rawAlloc.food) || 4550,
        supplements: Number(rawAlloc.supplements) || 2400,
        hydration: Number(rawAlloc.hydration) || 1100,
        recovery: Number(rawAlloc.recovery) || 1000,
        other: Number(rawAlloc.other) || 950,
      },
      smartReallocation,
      dietType: profileData.diet_type || 'vegetarian',
      foodStyle: profileData.food_style || 'mixed-indian',
      excludedFoods: Array.isArray(profileData.excluded_foods) ? profileData.excluded_foods : [],
      preferredFoods: Array.isArray(profileData.preferred_foods) ? profileData.preferred_foods : [],
    }
  } catch (err) {
    console.error('Error in fetchUserProfile:', err)
    return null
  }
}

export async function saveUserProfile(userId: string, profile: UserProfile): Promise<boolean> {
  try {
    const profilePayload = {
      id: userId,
      goal: profile.goal,
      age: profile.age,
      height: profile.height,
      weight: profile.weight,
      activity_level: profile.activityLevel,
      primary_exercise: profile.primaryExercise,
      diet_type: profile.dietType || 'vegetarian',
      food_style: profile.foodStyle || 'mixed-indian',
      excluded_foods: profile.excludedFoods || [],
      preferred_foods: profile.preferredFoods || [],
      updated_at: new Date().toISOString(),
    }

    const { error: pErr } = await supabase
      .from('profiles')
      .upsert(profilePayload, { onConflict: 'id' })

    if (pErr) {
      const { error: updateErr } = await supabase
        .from('profiles')
        .update(profilePayload)
        .eq('id', userId)

      if (updateErr) console.warn('Profile update fallback warning:', updateErr)
    }

    const categoryAllocationsPayload = {
      ...profile.budgetCategories,
      _smartReallocation: profile.smartReallocation ?? true,
    }

    // Save budget info
    const { data: existingBudgets } = await supabase
      .from('budgets')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)

    const existingBudget = existingBudgets && existingBudgets.length > 0 ? existingBudgets[0] : null

    if (existingBudget) {
      await supabase
        .from('budgets')
        .update({
          monthly_budget: profile.monthlyBudget,
          category_allocations: categoryAllocationsPayload,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingBudget.id)
    } else {
      await supabase.from('budgets').insert({
        user_id: userId,
        monthly_budget: profile.monthlyBudget,
        category_allocations: categoryAllocationsPayload,
      })
    }

    return true
  } catch (err) {
    console.error('Error saving profile to Supabase:', err)
    return false
  }
}
