import { supabase } from '../lib/supabase'

export interface HydrationLog {
  id?: string
  userId?: string
  amountMl: number
  timestamp: string
}

export async function fetchTodayHydration(userId?: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)

  if (!userId) {
    return 1650 // Demo fallback
  }

  try {
    const { data, error } = await supabase
      .from('hydration_logs')
      .select('amount_ml')
      .eq('user_id', userId)
      .gte('timestamp', startOfDay.toISOString())

    if (error) {
      console.warn('Fetch hydration error:', error)
      return 1650
    }

    return (data || []).reduce((acc, curr) => acc + (curr.amount_ml || 0), 0)
  } catch (err) {
    console.error('Error fetching hydration:', err)
    return 1650
  }
}

export async function logHydrationIntake(amountMl: number, userId?: string): Promise<boolean> {
  if (!userId) {
    return true
  }

  try {
    const { error } = await supabase.from('hydration_logs').insert({
      user_id: userId,
      amount_ml: amountMl,
      timestamp: new Date().toISOString(),
    })

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error logging hydration:', err)
    return false
  }
}
