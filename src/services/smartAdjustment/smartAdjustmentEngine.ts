import type { EngineInput, SmartAdjustment } from './types'
import { DEFAULT_THRESHOLDS, CATEGORY_LABELS } from './rules'
import type { CategoryKey } from '../../utils/budgetUtils'
import { supabase } from '../../lib/supabase'

const STORAGE_KEY_PREFIX = 'smartwear_smart_adjustments_'

/**
 * Rule-Based Smart Adjustment Engine
 * Analyzes real sensor readings, workout state, hydration logs & budget allocations
 * to produce actionable Smart Adjustments.
 */
export function evaluateSmartAdjustment(
  input: EngineInput,
  thresholds = DEFAULT_THRESHOLDS
): SmartAdjustment | null {
  const reading = input.sensorReading
  const workoutActive = Boolean(input.workoutActive)
  const profile = input.profile
  const smartReallocation = profile.smartReallocation !== false

  // If no live sensor signal and no active workout, no adjustment triggered
  if (!reading || (reading.heartRate === 0 && reading.temperature === 0 && !workoutActive)) {
    return null
  }

  const temp = reading.temperature
  const hr = reading.heartRate
  const motion = reading.motion

  // Check condition triggers
  const isElevatedTemp = temp >= thresholds.tempElevatedCelsius
  const isCriticalTemp = temp >= thresholds.tempCriticalCelsius
  const isHighIntensity = motion === 'HIGH_INTENSITY' || hr >= thresholds.heartRateHighBpm || workoutActive

  if (!isElevatedTemp && !isHighIntensity) {
    return null
  }

  // 1. Workout Recommendation
  let workoutType: 'reduce' | 'normal' | 'recover' | 'stop' = 'reduce'
  let workoutLabel = 'Reduce intensity for the next 10 min'
  let workoutDetail = 'Consider lowering pace to stabilize body temperature.'

  if (isCriticalTemp) {
    workoutType = 'stop'
    workoutLabel = 'Stop workout and recover'
    workoutDetail = 'Elevated body temperature trace. Take a full recovery break.'
  } else if (isElevatedTemp && isHighIntensity) {
    workoutType = 'reduce'
    workoutLabel = 'Reduce intensity for the next 10 min'
    workoutDetail = 'Consider taking a light recovery break to stabilize body temperature.'
  }

  // 2. Hydration Recommendation
  const addMl = thresholds.hydrationDefaultAddMl
  const hydrationLabel = `+${addMl} ml`
  const hydrationDetail = `Add ${addMl} ml to today's hydration target.`

  // 3. Financial Recommendation (Only generated when Smart Reallocation is enabled)
  let budgetAdjustment = null

  if (smartReallocation) {
    const allocations = profile.budgetCategories || {
      food: 4550,
      supplements: 2400,
      hydration: 1100,
      recovery: 1000,
      other: 950,
    }

    const categorySpentMap: Record<CategoryKey, number> = {
      food: 0,
      supplements: 0,
      hydration: 0,
      recovery: 0,
      other: 0,
    }

    (input.expenses || []).forEach((e) => {
      if (categorySpentMap[e.category] !== undefined) {
        categorySpentMap[e.category] += Number(e.amount) || 0
      }
    })

    const remainingMap: Record<CategoryKey, number> = {
      food: Math.max(0, (allocations.food || 0) - categorySpentMap.food),
      supplements: Math.max(0, (allocations.supplements || 0) - categorySpentMap.supplements),
      hydration: Math.max(0, (allocations.hydration || 0) - categorySpentMap.hydration),
      recovery: Math.max(0, (allocations.recovery || 0) - categorySpentMap.recovery),
      other: Math.max(0, (allocations.other || 0) - categorySpentMap.other),
    }

    // Find candidate with surplus balance (preferably Gear/'other' or 'supplements')
    const candidates: CategoryKey[] = ['other', 'supplements', 'recovery', 'food']
    const donor = candidates.find((k) => k !== 'hydration' && remainingMap[k] >= thresholds.defaultReallocationAmount)

    if (donor) {
      const amount = thresholds.defaultReallocationAmount
      const fromName = CATEGORY_LABELS[donor]
      budgetAdjustment = {
        fromCategory: donor,
        toCategory: 'hydration' as CategoryKey,
        fromLabel: fromName,
        toLabel: 'Hydration',
        amount,
        label: `Move ₹${amount} from unused ${fromName.toLowerCase()} budget → hydration`,
        detail: `Reallocate ₹${amount} from ${fromName} to Hydration to cover extra fluid needs.`,
      }
    }
  }

  // Trigger headline
  const headline = temp > 0
    ? "Your temperature increased during today's high-intensity activity."
    : "High workout intensity trace detected during exercise."

  return {
    id: `adj-${Date.now()}`,
    userId: input.profile ? undefined : undefined,
    createdAt: new Date().toISOString(),
    trigger: 'Elevated Temperature & Activity Trace',
    headline,
    sensorContext: {
      heartRate: hr,
      temperature: temp,
      spo2: reading.spo2,
      motion,
    },
    workoutRecommendation: {
      type: workoutType,
      label: workoutLabel,
      detail: workoutDetail,
    },
    hydrationAdjustment: {
      additionalMl: addMl,
      label: hydrationLabel,
      detail: hydrationDetail,
    },
    budgetAdjustment,
    smartReallocationEnabled: smartReallocation,
    status: 'pending',
  }
}

/**
 * Saves an adjustment state change (e.g. applied or dismissed) to localStorage & Supabase
 */
export async function saveAdjustmentState(
  adjustment: SmartAdjustment,
  userId?: string
): Promise<void> {
  // Local storage cache
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || 'demo'}`
    const existingRaw = localStorage.getItem(key)
    const list: SmartAdjustment[] = existingRaw ? JSON.parse(existingRaw) : []
    const updated = [adjustment, ...list.filter((a) => a.id !== adjustment.id)]
    localStorage.setItem(key, JSON.stringify(updated))
  } catch (err) {
    console.warn('LocalStorage save error:', err)
  }

  // Supabase alert persistence
  if (userId) {
    try {
      const messageText = `Smart Adjustment (${adjustment.status}): ${adjustment.headline} | Hydration: ${adjustment.hydrationAdjustment.label}${
        adjustment.budgetAdjustment ? ` | Budget: ${adjustment.budgetAdjustment.label}` : ''
      }`

      await supabase.from('alerts').insert({
        user_id: userId,
        category: 'SmartAdjustment',
        severity: 'high',
        message: messageText,
        read: adjustment.status === 'applied',
        timestamp: adjustment.appliedAt || new Date().toISOString(),
      })
    } catch (err) {
      console.warn('Supabase save adjustment error:', err)
    }
  }
}

/**
 * Fetches historical Smart Adjustments
 */
export function fetchAdjustmentHistory(userId?: string): SmartAdjustment[] {
  try {
    const key = `${STORAGE_KEY_PREFIX}${userId || 'demo'}`
    const raw = localStorage.getItem(key)
    if (!raw) return []
    return JSON.parse(raw)
  } catch (err) {
    return []
  }
}
