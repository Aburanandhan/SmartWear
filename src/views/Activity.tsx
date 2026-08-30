import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import type { SensorReading } from '../services/sensor/types'
import { fetchWorkoutHistory, saveWorkout, type WorkoutSession } from '../services/workoutService'

interface Props {
  profile: UserProfile
  userId?: string
  reading: SensorReading
  onWorkoutToggle: (active: boolean) => void
}

export default function Activity({ profile, userId, reading, onWorkoutToggle }: Props) {
  const [workouts, setWorkouts] = useState<WorkoutSession[]>([])
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  useEffect(() => {
    async function loadHistory() {
      const history = await fetchWorkoutHistory(userId)
      setWorkouts(history)
    }
    loadHistory()
  }, [userId])

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    if (isWorkoutActive && workoutStartTime) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000))
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isWorkoutActive, workoutStartTime])

  const handleStartWorkout = () => {
    setIsWorkoutActive(true)
    setWorkoutStartTime(new Date())
    setElapsedSeconds(0)
    onWorkoutToggle(true)
  }

  const handleStopWorkout = async () => {
    setIsWorkoutActive(false)
    onWorkoutToggle(false)
    const endTime = new Date()

    const newWorkout: WorkoutSession = {
      userId,
      activity: profile.primaryExercise || 'Running',
      startTime: workoutStartTime ? workoutStartTime.toISOString() : new Date().toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: elapsedSeconds,
      steps: Math.max(300, Math.round(elapsedSeconds * 2.2)),
      calories: Math.round(elapsedSeconds * 0.18),
      avgHr: reading.heartRate || 0,
    }

    const saved = await saveWorkout(newWorkout)
    if (saved) {
      setWorkouts((prev) => [saved, ...prev])
    }
    setWorkoutStartTime(null)
    setElapsedSeconds(0)
  }

  const formatDuration = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins}m ${s < 10 ? '0' : ''}${s}s`
  }

  return (
    <div className="space-y-6">
      {/* Workout Session Controller Card */}
      <div className="card p-6 border-2" style={{ borderColor: isWorkoutActive ? '#ef4444' : '#0d9488' }}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🏃</span>
              <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
                Active Workout Tracker
              </h2>
            </div>
            <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
              Target exercise: {profile.primaryExercise} · Goal: {profile.goal}
            </p>
          </div>

          <div>
            {!isWorkoutActive ? (
              <button
                onClick={handleStartWorkout}
                className="btn-primary px-6 py-3 text-base flex items-center gap-2"
              >
                <span>▶</span>
                <span>Start {profile.primaryExercise} Workout</span>
              </button>
            ) : (
              <button
                onClick={handleStopWorkout}
                className="px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg"
              >
                <span>⏹</span>
                <span>Stop Workout ({formatDuration(elapsedSeconds)})</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Active Workout Metrics */}
        {isWorkoutActive && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100 fade-in">
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Elapsed Time</p>
              <p className="font-mono-data text-2xl font-bold text-slate-900">{formatDuration(elapsedSeconds)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Current HR</p>
              <p className="font-mono-data text-2xl font-bold text-red-500">{reading.heartRate} BPM</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Est. Calories</p>
              <p className="font-mono-data text-2xl font-bold text-teal-600">{Math.round(elapsedSeconds * 0.18)} kcal</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase">Est. Steps</p>
              <p className="font-mono-data text-2xl font-bold text-blue-600">{Math.round(elapsedSeconds * 2.2)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Workout History Table */}
      <div className="card p-6">
        <h3 className="font-bold text-lg mb-4 text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
          Workout History & Logs
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" style={{ fontFamily: 'Inter, sans-serif' }}>
            <thead>
              <tr className="border-b text-xs uppercase text-slate-400" style={{ borderColor: '#e2e8f0' }}>
                <th className="py-3 px-4">Date / Time</th>
                <th className="py-3 px-4">Activity</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Steps</th>
                <th className="py-3 px-4">Calories</th>
                <th className="py-3 px-4">Avg HR</th>
              </tr>
            </thead>
            <tbody>
              {workouts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    No workouts logged yet. Click Start Workout to log your first session!
                  </td>
                </tr>
              ) : (
                workouts.map((w) => (
                  <tr key={w.id} className="border-b hover:bg-slate-50 transition-all" style={{ borderColor: '#f1f5f9' }}>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {new Date(w.startTime).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-900">{w.activity}</td>
                    <td className="py-3.5 px-4 font-mono-data">{formatDuration(w.durationSeconds)}</td>
                    <td className="py-3.5 px-4 font-mono-data">{w.steps}</td>
                    <td className="py-3.5 px-4 font-mono-data text-teal-700">{w.calories} kcal</td>
                    <td className="py-3.5 px-4 font-mono-data text-red-500">{w.avgHr} BPM</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
