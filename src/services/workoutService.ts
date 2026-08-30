import { supabase } from '../lib/supabase'

export interface WorkoutSession {
  id?: string
  userId?: string
  activity: string
  startTime: string
  endTime?: string
  durationSeconds: number
  steps: number
  calories: number
  avgHr: number
}

export async function fetchWorkoutHistory(userId?: string): Promise<WorkoutSession[]> {
  if (!userId) {
    return [
      { id: 'w1', activity: 'Morning Run', startTime: new Date(Date.now() - 86400000).toISOString(), durationSeconds: 2400, steps: 4200, calories: 340, avgHr: 148 },
      { id: 'w2', activity: 'Strength Training', startTime: new Date(Date.now() - 86400000 * 2).toISOString(), durationSeconds: 3000, steps: 1800, calories: 410, avgHr: 132 },
      { id: 'w3', activity: 'Cycling Workout', startTime: new Date(Date.now() - 86400000 * 3).toISOString(), durationSeconds: 3600, steps: 5600, calories: 520, avgHr: 142 },
    ]
  }

  try {
    const { data, error } = await supabase
      .from('workouts')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: false })

    if (error) {
      console.warn('Fetch workouts error:', error)
      return []
    }

    return (data || []).map((w) => ({
      id: w.id,
      userId: w.user_id,
      activity: w.activity,
      startTime: w.start_time,
      endTime: w.end_time,
      durationSeconds: w.duration_seconds || 0,
      steps: w.steps || 0,
      calories: Number(w.calories) || 0,
      avgHr: Number(w.avg_hr) || 0,
    }))
  } catch (err) {
    console.error('Error fetching workouts:', err)
    return []
  }
}

export async function saveWorkout(workout: WorkoutSession): Promise<WorkoutSession | null> {
  if (!workout.userId) {
    return { ...workout, id: `demo-w-${Date.now()}` }
  }

  try {
    const { data, error } = await supabase
      .from('workouts')
      .insert({
        user_id: workout.userId,
        activity: workout.activity,
        start_time: workout.startTime,
        end_time: workout.endTime || new Date().toISOString(),
        duration_seconds: workout.durationSeconds,
        steps: workout.steps,
        calories: workout.calories,
        avg_hr: workout.avgHr,
      })
      .select()
      .single()

    if (error) throw error

    return {
      id: data.id,
      userId: data.user_id,
      activity: data.activity,
      startTime: data.start_time,
      endTime: data.end_time,
      durationSeconds: data.duration_seconds,
      steps: data.steps,
      calories: Number(data.calories),
      avgHr: Number(data.avg_hr),
    }
  } catch (err) {
    console.error('Error saving workout:', err)
    return null
  }
}
