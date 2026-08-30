import { supabase } from '../lib/supabase'

export interface ExpenseItem {
  id?: string
  userId?: string
  category: 'food' | 'supplements' | 'hydration' | 'recovery' | 'other'
  amount: number
  description: string
  timestamp: string
}

export interface BudgetCalculations {
  monthlyBudget: number
  totalSpent: number
  remainingBudget: number
  budgetPercentage: number
  dailyRecommendedSpend: number
  categorySpent: {
    food: number
    supplements: number
    hydration: number
    recovery: number
    other: number
  }
}

export function calculateBudgetMetrics(
  monthlyBudget: number,
  expenses: ExpenseItem[]
): BudgetCalculations {
  const enforcedBudget = Math.max(2000, monthlyBudget)
  let totalSpent = 0
  const categorySpent = {
    food: 0,
    supplements: 0,
    hydration: 0,
    recovery: 0,
    other: 0,
  }

  expenses.forEach((e) => {
    totalSpent += Number(e.amount) || 0
    if (categorySpent[e.category] !== undefined) {
      categorySpent[e.category] += Number(e.amount) || 0
    }
  })

  const remainingBudget = Math.max(0, enforcedBudget - totalSpent)
  const budgetPercentage = Math.min(100, Math.round((totalSpent / enforcedBudget) * 100))

  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const remainingDays = Math.max(1, daysInMonth - now.getDate() + 1)
  const dailyRecommendedSpend = Math.round(remainingBudget / remainingDays)

  return {
    monthlyBudget: enforcedBudget,
    totalSpent,
    remainingBudget,
    budgetPercentage,
    dailyRecommendedSpend,
    categorySpent,
  }
}

export async function fetchUserExpenses(userId?: string): Promise<ExpenseItem[]> {
  if (!userId) {
    // Default demo fallback expenses
    return [
      { id: '1', category: 'food', amount: 1400, description: 'Weekly organic groceries & vegetables', timestamp: new Date(Date.now() - 86400000 * 2).toISOString() },
      { id: '2', category: 'food', amount: 700, description: 'Paneer & sprout staples', timestamp: new Date(Date.now() - 86400000 * 5).toISOString() },
      { id: '3', category: 'supplements', amount: 850, description: 'Electrolytes & protein powder', timestamp: new Date(Date.now() - 86400000 * 4).toISOString() },
      { id: '4', category: 'hydration', amount: 350, description: 'Coconut water supply', timestamp: new Date(Date.now() - 86400000 * 1).toISOString() },
      { id: '5', category: 'recovery', amount: 450, description: 'Foam roller & massage oil', timestamp: new Date(Date.now() - 86400000 * 6).toISOString() },
    ]
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })

    if (error) {
      console.warn('Fetch expenses error:', error)
      return []
    }

    return (data || []).map((row) => ({
      id: row.id,
      userId: row.user_id,
      category: row.category,
      amount: Number(row.amount),
      description: row.description || '',
      timestamp: row.timestamp,
    }))
  } catch (err) {
    console.error('Error fetching expenses:', err)
    return []
  }
}

export async function addExpense(expense: ExpenseItem): Promise<ExpenseItem | null> {
  if (!expense.userId) {
    return { ...expense, id: `demo-${Date.now()}` }
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert({
        user_id: expense.userId,
        category: expense.category,
        amount: expense.amount,
        description: expense.description,
        timestamp: expense.timestamp || new Date().toISOString(),
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      userId: data.user_id,
      category: data.category,
      amount: Number(data.amount),
      description: data.description,
      timestamp: data.timestamp,
    }
  } catch (err) {
    console.error('Error adding expense:', err)
    return null
  }
}
