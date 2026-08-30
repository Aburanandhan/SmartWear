import { supabase } from '../lib/supabase'

export interface SmartAlert {
  id: string
  userId?: string
  category: 'Health' | 'Activity' | 'Hydration' | 'Budget' | 'System'
  severity: 'low' | 'medium' | 'high' | 'critical'
  message: string
  read: boolean
  timestamp: string
}

export async function fetchAlerts(userId?: string): Promise<SmartAlert[]> {
  const defaultAlerts: SmartAlert[] = [
    {
      id: 'a1',
      category: 'Health',
      severity: 'medium',
      message: 'Skin temperature reached 37.2°C during high intensity run. Consider hydration break.',
      read: false,
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    },
    {
      id: 'a2',
      category: 'Budget',
      severity: 'high',
      message: 'Monthly health budget has reached 78% of ₹6,000 threshold. ₹1,320 remaining.',
      read: false,
      timestamp: new Date(Date.now() - 1000 * 3600 * 3).toISOString(),
    },
    {
      id: 'a3',
      category: 'Hydration',
      severity: 'low',
      message: 'Daily hydration goal 65% completed. Drink 500ml before next workout.',
      read: true,
      timestamp: new Date(Date.now() - 1000 * 3600 * 8).toISOString(),
    },
  ]

  if (!userId) {
    return defaultAlerts
  }

  try {
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) {
      console.warn('Fetch alerts error:', error)
      return defaultAlerts
    }

    if (!data || data.length === 0) {
      // Seed default initial alerts for new user
      for (const a of defaultAlerts) {
        await supabase.from('alerts').insert({
          user_id: userId,
          category: a.category,
          severity: a.severity,
          message: a.message,
          read: a.read,
          timestamp: a.timestamp,
        })
      }
      return defaultAlerts
    }

    return data.map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      severity: row.severity,
      message: row.message,
      read: row.read,
      timestamp: row.timestamp,
    }))
  } catch (err) {
    console.error('Error fetching alerts:', err)
    return defaultAlerts
  }
}

export async function markAlertAsRead(alertId: string, userId?: string): Promise<boolean> {
  if (!userId) return true

  try {
    const { error } = await supabase
      .from('alerts')
      .update({ read: true })
      .eq('id', alertId)
      .eq('user_id', userId)

    if (error) throw error
    return true
  } catch (err) {
    console.error('Error marking alert read:', err)
    return false
  }
}

export async function createAlert(alert: Omit<SmartAlert, 'id'>): Promise<SmartAlert | null> {
  if (!alert.userId) return null

  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert({
        user_id: alert.userId,
        category: alert.category,
        severity: alert.severity,
        message: alert.message,
        read: alert.read || false,
        timestamp: alert.timestamp || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      severity: data.severity,
      message: data.message,
      read: data.read,
      timestamp: data.timestamp,
    }
  } catch (err) {
    console.error('Error creating alert:', err)
    return null
  }
}

export async function checkAndTriggerFoodBudgetAlert(
  userId: string | undefined,
  foodSpent: number,
  foodAllocation: number
): Promise<void> {
  if (foodAllocation <= 0) return
  const pct = (foodSpent / foodAllocation) * 100

  if (pct >= 100) {
    await createAlert({
      userId,
      category: 'Budget',
      severity: 'critical',
      message: 'Your monthly food budget has been exceeded. SmartWear is prioritizing lower-cost meal options.',
      read: false,
      timestamp: new Date().toISOString(),
    })
  } else if (pct >= 80) {
    await createAlert({
      userId,
      category: 'Budget',
      severity: 'high',
      message: `Food spending has reached ${Math.round(pct)}% of your monthly food budget limit.`,
      read: false,
      timestamp: new Date().toISOString(),
    })
  }
}
