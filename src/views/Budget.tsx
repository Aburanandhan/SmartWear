import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import {
  fetchUserExpenses,
  addExpense,
  calculateBudgetMetrics,
  type ExpenseItem,
} from '../services/budgetService'
import { checkAndTriggerFoodBudgetAlert } from '../services/alertService'

interface Props {
  profile: UserProfile
  userId?: string
  onUpdateProfile: (p: Partial<UserProfile>) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  food: '🥗',
  supplements: '💊',
  hydration: '💧',
  recovery: '🧘',
  other: '🏋️',
}

export default function Budget({ profile, userId, onUpdateProfile }: Props) {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newCat, setNewCat] = useState<'food' | 'supplements' | 'hydration' | 'recovery' | 'other'>('food')
  const [newAmount, setNewAmount] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function loadData() {
      const list = await fetchUserExpenses(userId)
      setExpenses(list)
    }
    loadData()
  }, [userId])

  const metrics = calculateBudgetMetrics(profile.monthlyBudget, expenses)

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAmount || Number(newAmount) <= 0) return

    setLoading(true)
    const exp: ExpenseItem = {
      userId: userId || undefined,
      category: newCat,
      amount: Number(newAmount),
      description: newDesc || `${newCat.toUpperCase()} expense`,
      timestamp: new Date().toISOString(),
    }

    const created = await addExpense(exp)
    if (created) {
      const updatedList = [created, ...expenses]
      setExpenses(updatedList)
      if (newCat === 'food') {
        const newSpent = updatedList.filter(e => e.category === 'food').reduce((acc, c) => acc + c.amount, 0)
        await checkAndTriggerFoodBudgetAlert(userId || undefined, newSpent, profile.budgetCategories?.food || 3200)
      }
    }
    setLoading(false)
    setIsModalOpen(false)
    setNewAmount('')
    setNewDesc('')
  }

  return (
    <div className="space-y-6">
      {/* Header & Metrics Summary */}
      <div className="card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              Smart Fitness Budget
            </h2>
            {profile.smartReallocation !== false && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-teal-100 text-teal-800 uppercase">
                Smart Reallocation Active ✓
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            {profile.smartReallocation !== false
              ? 'Adaptive budgeting active · Allocation updates based on actual spending and fitness needs'
              : 'Track and optimize your fitness & wellness spending (Min ₹2,000 threshold)'}
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="btn-primary px-5 py-2.5 text-sm font-semibold flex items-center gap-2"
        >
          <span>➕</span>
          <span>Add Expense</span>
        </button>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card p-5">
          <p className="text-xs text-slate-400 font-semibold uppercase">Total Budget</p>
          <p className="font-mono-data text-2xl font-bold text-slate-900 mt-1">₹{metrics.monthlyBudget.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Monthly allocation</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-slate-400 font-semibold uppercase">Total Spent</p>
          <p className="font-mono-data text-2xl font-bold text-teal-600 mt-1">₹{metrics.totalSpent.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">{metrics.budgetPercentage}% of limit</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-slate-400 font-semibold uppercase">Remaining</p>
          <p className="font-mono-data text-2xl font-bold text-blue-600 mt-1">₹{metrics.remainingBudget.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Available balance</p>
        </div>

        <div className="card p-5">
          <p className="text-xs text-slate-400 font-semibold uppercase">Daily Rec. Spend</p>
          <p className="font-mono-data text-2xl font-bold text-amber-600 mt-1">₹{metrics.dailyRecommendedSpend.toLocaleString()}</p>
          <p className="text-xs text-slate-400 mt-1">Per remaining day</p>
        </div>
      </div>

      {/* Category breakdown & Expenses list */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Category Budget Allocation */}
        <div className="card p-6 space-y-4">
          <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
            Category Allocations vs Spent
          </h3>

          <div className="space-y-4">
            {Object.entries(profile.budgetCategories || {}).map(([catKey, targetVal]) => {
              const spentVal = metrics.categorySpent[catKey as keyof typeof metrics.categorySpent] || 0
              const pct = targetVal > 0 ? Math.min(100, Math.round((spentVal / targetVal) * 100)) : 0

              return (
                <div key={catKey} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <span>{CATEGORY_ICONS[catKey] || '📦'}</span>
                      <span className="font-medium capitalize" style={{ fontFamily: 'Inter, sans-serif' }}>{catKey}</span>
                    </div>
                    <span className="font-mono-data text-xs font-bold text-slate-700">
                      ₹{spentVal.toLocaleString()} / ₹{targetVal.toLocaleString()}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${pct}%`,
                        background: pct > 85 ? '#ef4444' : '#0d9488',
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Expenses Log History */}
        <div className="lg:col-span-2 card p-6">
          <h3 className="font-bold text-base text-slate-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>
            Expense Transactions
          </h3>

          <div className="space-y-3">
            {expenses.length === 0 ? (
              <p className="text-center text-slate-400 py-6 text-sm">No expenses logged yet.</p>
            ) : (
              expenses.map((exp) => (
                <div key={exp.id} className="p-3.5 rounded-xl border flex items-center justify-between hover:bg-slate-50 transition-all" style={{ borderColor: '#f1f5f9' }}>
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-teal-50 text-base">
                      {CATEGORY_ICONS[exp.category] || '💸'}
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>{exp.description}</p>
                      <p className="text-xs text-slate-400 capitalize">{exp.category} · {new Date(exp.timestamp).toLocaleDateString('en-IN')}</p>
                    </div>
                  </div>
                  <span className="font-mono-data font-bold text-sm text-slate-900">₹{exp.amount.toLocaleString()}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm fade-in">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 relative border shadow-2xl" style={{ borderColor: '#e2e8f0' }}>
            <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 font-bold">✕</button>
            <h3 className="font-bold text-lg text-slate-900 mb-4" style={{ fontFamily: 'Sora, sans-serif' }}>Log New Health Expense</h3>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Category</label>
                <select
                  value={newCat}
                  onChange={(e) => setNewCat(e.target.value as any)}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none bg-white"
                  style={{ borderColor: '#e2e8f0' }}
                >
                  <option value="food">Food & Groceries</option>
                  <option value="supplements">Supplements</option>
                  <option value="hydration">Hydration</option>
                  <option value="recovery">Recovery</option>
                  <option value="other">Other / Gear</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Amount (₹)</label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 450"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none font-mono-data"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700">Description</label>
                <input
                  type="text"
                  placeholder="e.g. Whey Protein Powder"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full rounded-xl p-2.5 text-sm border outline-none"
                  style={{ borderColor: '#e2e8f0' }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-primary w-full py-3 text-sm font-bold mt-2">
                {loading ? 'Saving...' : 'Save Expense'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
