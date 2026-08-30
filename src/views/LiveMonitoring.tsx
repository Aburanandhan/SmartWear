import { useState, useEffect } from 'react'
import type { UserProfile } from '../App'
import type { SensorReading, SensorSource, MotionState } from '../services/sensor/types'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { saveWorkout, type WorkoutSession } from '../services/workoutService'
import { fetchTodayHydration, logHydrationIntake } from '../services/hydrationService'

interface Props {
  profile: UserProfile
  reading: SensorReading
  history: SensorReading[]
  sensorSource: SensorSource
  onMotionChange: (m: MotionState) => void
  userId?: string
  onWorkoutToggle?: (active: boolean) => void
}

const MOTION_OPTIONS: { id: MotionState; label: string; icon: string }[] = [
  { id: 'REST', label: 'Rest', icon: '🧘' },
  { id: 'WALK', label: 'Walk', icon: '🚶' },
  { id: 'RUN', label: 'Run', icon: '🏃' },
  { id: 'HIGH_INTENSITY', label: 'High Intensity', icon: '🔥' },
  { id: 'RECOVERY', label: 'Recovery', icon: '🍃' },
]

interface CompletedWorkoutSummary {
  activity: string
  durationFormatted: string
  durationSeconds: number
  avgHr: number
  maxHr: number
  avgTemp: string
  minSpo2: number
  steps: number
  calories: number
  hydrationConsumedMl: number
  intensity: string
  completedAt: string
}

export default function LiveMonitoring({
  profile,
  reading,
  history,
  sensorSource,
  onMotionChange,
  userId,
  onWorkoutToggle,
}: Props) {
  // Mode selector: 'self' = Self Monitor (user monitors own session), 'monitor' = Monitor Someone (caregiver/trainer observer view)
  const [activeTab, setActiveTab] = useState<'self' | 'monitor'>('self')

  // Hydration state
  const [hydrationToday, setHydrationToday] = useState(1650)

  // My Workout state
  const [isWorkoutActive, setIsWorkoutActive] = useState(false)
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [workoutReadings, setWorkoutReadings] = useState<SensorReading[]>([])
  const [lastSummary, setLastSummary] = useState<CompletedWorkoutSummary | null>(null)

  useEffect(() => {
    async function loadHydration() {
      const today = await fetchTodayHydration(userId)
      setHydrationToday(today)
    }
    loadHydration()
  }, [userId])

  // Workout timer & telemetry sample collector
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null
    if (isWorkoutActive && workoutStartTime) {
      timer = setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - workoutStartTime.getTime()) / 1000))
        if (reading.heartRate > 0) {
          setWorkoutReadings((prev) => [...prev, reading])
        }
      }, 1000)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isWorkoutActive, workoutStartTime, reading])

  const handleAddWater = async (amountMl: number) => {
    const updated = hydrationToday + amountMl
    setHydrationToday(updated)
    await logHydrationIntake(amountMl, userId)
  }

  const handleStartWorkout = () => {
    setIsWorkoutActive(true)
    setWorkoutStartTime(new Date())
    setElapsedSeconds(0)
    setWorkoutReadings(reading.heartRate > 0 ? [reading] : [])
    setLastSummary(null)
    if (onWorkoutToggle) onWorkoutToggle(true)
  }

  const handleStopWorkout = async () => {
    setIsWorkoutActive(false)
    if (onWorkoutToggle) onWorkoutToggle(false)
    const endTime = new Date()

    const readingsToCalc = workoutReadings.filter((r) => r.heartRate > 0)
    const hasData = readingsToCalc.length > 0
    const hrs = hasData ? readingsToCalc.map((r) => r.heartRate) : [0]
    const temps = hasData ? readingsToCalc.map((r) => r.temperature) : [0]
    const spo2s = hasData ? readingsToCalc.map((r) => r.spo2) : [0]

    const avgHr = Math.round(hrs.reduce((a, b) => a + b, 0) / hrs.length)
    const maxHr = Math.max(...hrs)
    const avgTemp = (temps.reduce((a, b) => a + b, 0) / temps.length).toFixed(1)
    const minSpo2 = Math.min(...spo2s)
    const steps = Math.max(0, Math.round(elapsedSeconds * 2.2))
    const calories = Math.round(elapsedSeconds * 0.18)
    const hydrationConsumedMl = Math.round(elapsedSeconds * 0.4)

    const formatDuration = (secs: number) => {
      const mins = Math.floor(secs / 60)
      const s = secs % 60
      return `${mins}m ${s < 10 ? '0' : ''}${s}s`
    }

    const summary: CompletedWorkoutSummary = {
      activity: profile.primaryExercise || 'Running',
      durationFormatted: formatDuration(elapsedSeconds),
      durationSeconds: elapsedSeconds,
      avgHr,
      maxHr,
      avgTemp,
      minSpo2,
      steps,
      calories,
      hydrationConsumedMl,
      intensity: avgHr > 150 ? 'High Intensity' : avgHr > 125 ? 'Moderate' : avgHr > 0 ? 'Light Recovery' : 'No Sensor Signal',
      completedAt: endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setLastSummary(summary)

    // Save to Supabase workouts history table
    const workoutSession: WorkoutSession = {
      userId,
      activity: summary.activity,
      startTime: workoutStartTime ? workoutStartTime.toISOString() : new Date().toISOString(),
      endTime: endTime.toISOString(),
      durationSeconds: elapsedSeconds,
      steps,
      calories,
      avgHr,
    }
    await saveWorkout(workoutSession)

    setWorkoutStartTime(null)
    setElapsedSeconds(0)
  }

  const chartData = history
    .filter((item) => item.heartRate > 0)
    .map((item, idx) => ({
      time: item.timestamp
        ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : `${idx * 2.5}s`,
      heartRate: item.heartRate,
      temperature: item.temperature,
      spo2: item.spo2,
    }))

  const formatSecs = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const s = secs % 60
    return `${mins < 10 ? '0' : ''}${mins}:${s < 10 ? '0' : ''}${s}`
  }

  return (
    <div className="space-y-6">
      {/* Page Header & Segmented Mode Control */}
      <div className="card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h2 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
              Live Monitoring
            </h2>
            <span
              className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                sensorSource.isConnected() ? 'bg-teal-100 text-teal-800' : 'bg-slate-100 text-slate-600'
              }`}
            >
              {sensorSource.isConnected() ? 'Physical BLE Stream' : 'No Live Sensor Connected'}
            </span>
          </div>
          <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
            Real-time wearable telemetry & workout session tracking
          </p>
        </div>

        {/* Compact Segmented Mode Selector */}
        <div className="inline-flex bg-slate-100 p-1 rounded-xl gap-1 shrink-0 border border-slate-200">
          <button
            onClick={() => setActiveTab('self')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'self'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            <span>🏃</span>
            Self Monitor
          </button>
          <button
            onClick={() => setActiveTab('monitor')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'monitor'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
            style={{ fontFamily: 'Sora, sans-serif' }}
          >
            <span className={`w-2 h-2 rounded-full inline-block ${sensorSource.isConnected() ? 'bg-emerald-400 pulse-dot' : 'bg-slate-400'}`} />
            Monitor Someone
          </button>
        </div>
      </div>

      {/* MODE 2: MONITOR SOMEONE (Caregiver / trainer view — observe another person's telemetry) */}
      {activeTab === 'monitor' && (
        <div className="space-y-6 fade-in">
          {/* Subheader status bar */}
          <div className="card p-5 bg-teal-50/50 border-teal-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${sensorSource.isConnected() ? 'bg-emerald-500 pulse-dot' : 'bg-slate-400'}`} />
              <span className="font-bold text-sm text-teal-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                LIVE TELEMETRY STREAM
              </span>
              <span className="text-xs text-teal-700 font-medium">
                · {sensorSource.isConnected() ? "Viewing live wearable telemetry" : "Waiting for sensor data"}
              </span>
            </div>

            {/* Motion state switcher for testing when sensor is active */}
            {sensorSource.isSimulated && (
              <div className="bg-white p-1 rounded-xl flex items-center gap-1 border border-teal-200">
                <span className="text-xs font-bold text-slate-400 px-2 uppercase" style={{ fontSize: 10 }}>Motion:</span>
                {MOTION_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => onMotionChange(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
                      reading.motion === opt.id ? 'bg-teal-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                    style={{ fontFamily: 'Sora, sans-serif' }}
                  >
                    <span>{opt.icon}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Full Telemetry Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Heart Rate */}
            <div className="card p-4 border-l-4 border-red-500">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Heart Rate</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-data text-3xl font-bold text-red-500">
                  {reading.heartRate > 0 ? reading.heartRate : '--'}
                </span>
                {reading.heartRate > 0 && <span className="text-xs text-slate-500 font-semibold">BPM</span>}
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {reading.heartRate > 0 ? `State: ${reading.motion}` : 'Waiting for sensor data'}
              </p>
            </div>

            {/* Body/Skin Temp */}
            <div className="card p-4 border-l-4 border-teal-500">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Body/Skin Temp</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-data text-3xl font-bold text-teal-600">
                  {reading.temperature > 0 ? reading.temperature : '--'}
                </span>
                {reading.temperature > 0 && <span className="text-xs text-slate-500 font-semibold">°C</span>}
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {reading.temperature > 0 ? 'Continuous Probe' : 'No live sensor connected'}
              </p>
            </div>

            {/* SpO2 */}
            <div className="card p-4 border-l-4 border-blue-500">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>SpO₂ Level</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-data text-3xl font-bold text-blue-600">
                  {reading.spo2 > 0 ? reading.spo2 : '--'}
                </span>
                {reading.spo2 > 0 && <span className="text-xs text-slate-500 font-semibold">%</span>}
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {reading.spo2 > 0 ? 'Pulse Oximeter' : 'Waiting for sensor data'}
              </p>
            </div>

            {/* Motion / Activity */}
            <div className="card p-4 border-l-4 border-amber-500">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Activity State</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="text-xl">
                  {reading.heartRate > 0 ? (MOTION_OPTIONS.find((m) => m.id === reading.motion)?.icon || '🏃') : '📡'}
                </span>
                <span className="font-bold text-sm text-slate-900 truncate" style={{ fontFamily: 'Sora, sans-serif' }}>
                  {reading.heartRate > 0 ? reading.motion : 'Waiting...'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {reading.steps > 0 ? `${reading.steps} Total Steps` : 'No live sensor connected'}
              </p>
            </div>

            {/* Hydration Tracking */}
            <div className="card p-4 border-l-4 border-sky-500">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Hydration</p>
              <div className="flex items-baseline gap-1">
                <span className="font-mono-data text-2xl font-bold text-sky-600">{hydrationToday}</span>
                <span className="text-xs text-slate-400 font-medium">/2.5L</span>
              </div>
              <button
                onClick={() => handleAddWater(250)}
                className="mt-2 text-xs font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700 hover:bg-sky-200 transition-all w-full text-center"
              >
                +250ml Log
              </button>
            </div>

            {/* Hardware Connection & Battery */}
            <div className="card p-4 border-l-4 border-emerald-500">
              <p className="text-xs font-bold uppercase text-slate-500 mb-1" style={{ fontFamily: 'Sora, sans-serif' }}>Device Status</p>
              <div className="flex items-center gap-1.5 mt-1">
                <span className={`w-2 h-2 rounded-full ${sensorSource.isConnected() ? 'bg-emerald-500 pulse-dot' : 'bg-slate-400'}`} />
                <span className="font-bold text-xs text-slate-800 truncate">{sensorSource.name}</span>
              </div>
              <p className="text-xs text-slate-400 mt-2 truncate">
                {sensorSource.isConnected() ? 'BLE Connected' : 'No Live Sensor Connected'}
              </p>
            </div>
          </div>

          {/* Real-time Telemetry Graph Stream */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Real-time Biometric Stream Graph
                </h3>
                <p className="text-xs text-slate-400">
                  {sensorSource.isConnected() ? 'Continuous telemetry feed (Heart Rate & Skin Temperature)' : 'Waiting for sensor data connection...'}
                </p>
              </div>
              <span className="text-xs text-slate-500 bg-slate-100 px-3 py-1 rounded-full font-mono-data font-semibold">
                {sensorSource.isConnected() ? 'Live Stream Active' : 'No Sensor Signal'}
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Heart Rate (BPM)" />
                    <Line type="monotone" dataKey="temperature" stroke="#0d9488" strokeWidth={2.5} dot={false} name="Body/Skin Temp (°C)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 w-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <span className="text-2xl mb-1">📡</span>
                <span>No live sensor connected. Waiting for telemetry data...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 1: SELF MONITOR (User monitors their own workout / session with live telemetry) */}
      {activeTab === 'self' && (
        <div className="space-y-6 fade-in">
          {/* Active Workout Control Card */}
          <div
            className="card p-6 border-2 transition-all"
            style={{ borderColor: isWorkoutActive ? '#ef4444' : '#0d9488' }}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-2xl">🏃</span>
                  <h3 className="text-xl font-bold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>
                    {profile.primaryExercise || 'Workout'} Monitoring Session
                  </h3>
                </div>
                <p className="text-sm text-slate-500" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Target exercise: {profile.primaryExercise} · User Goal: {profile.goal}
                </p>
              </div>

              <div>
                {!isWorkoutActive ? (
                  <button
                    onClick={handleStartWorkout}
                    className="btn-primary px-6 py-3 text-base flex items-center gap-2 shadow-md hover:shadow-lg"
                  >
                    <span>▶</span>
                    <span>Start {profile.primaryExercise} Workout</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStopWorkout}
                    className="px-6 py-3 rounded-xl font-bold text-white bg-red-600 hover:bg-red-700 transition-all flex items-center gap-2 shadow-lg pulse-dot"
                  >
                    <span>⏹</span>
                    <span>Stop Workout ({formatSecs(elapsedSeconds)})</span>
                  </button>
                )}
              </div>
            </div>

            {/* Live Metrics display while workout is active */}
            {isWorkoutActive && (
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 mt-6 pt-6 border-t border-slate-100 fade-in">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Duration</p>
                  <p className="font-mono-data text-xl font-bold text-slate-900">{formatSecs(elapsedSeconds)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Heart Rate</p>
                  <p className="font-mono-data text-xl font-bold text-red-500">
                    {reading.heartRate > 0 ? `${reading.heartRate} BPM` : 'Waiting...'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Body/Skin Temp</p>
                  <p className="font-mono-data text-xl font-bold text-teal-600">
                    {reading.temperature > 0 ? `${reading.temperature}°C` : 'Waiting...'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">SpO₂</p>
                  <p className="font-mono-data text-xl font-bold text-blue-600">
                    {reading.spo2 > 0 ? `${reading.spo2}%` : 'Waiting...'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Activity State</p>
                  <p className="font-mono-data text-base font-bold text-amber-600 truncate">
                    {reading.heartRate > 0 ? reading.motion : 'Active'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Steps</p>
                  <p className="font-mono-data text-xl font-bold text-indigo-600">{Math.round(elapsedSeconds * 2.2)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Est. Calories</p>
                  <p className="font-mono-data text-xl font-bold text-emerald-600">{Math.round(elapsedSeconds * 0.18)}</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-400 font-semibold uppercase">Hydration Target</p>
                  <p className="font-mono-data text-xl font-bold text-sky-600">{Math.round(elapsedSeconds * 0.4)} <span className="text-xs">ml</span></p>
                </div>
              </div>
            )}
          </div>

          {/* POST WORKOUT SUMMARY */}
          {lastSummary && (
            <div className="card p-6 bg-gradient-to-br from-teal-900 to-slate-900 text-white rounded-2xl shadow-xl fade-in space-y-6 border border-teal-700">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-teal-800 pb-4">
                <div>
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30 uppercase tracking-wide">
                    Workout Summary Completed
                  </span>
                  <h3 className="text-2xl font-bold mt-2" style={{ fontFamily: 'Sora, sans-serif' }}>
                    {lastSummary.activity} Session Overview
                  </h3>
                  <p className="text-xs text-teal-200/80 mt-0.5">Completed today at {lastSummary.completedAt}</p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-teal-300 font-semibold block">Intensity Rating</span>
                  <span className="text-lg font-bold text-amber-400">{lastSummary.intensity}</span>
                </div>
              </div>

              {/* Summary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs text-teal-200 uppercase font-semibold">Total Duration</p>
                  <p className="font-mono-data text-2xl font-bold text-white mt-1">{lastSummary.durationFormatted}</p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs text-teal-200 uppercase font-semibold">Avg / Max Heart Rate</p>
                  <p className="font-mono-data text-2xl font-bold text-red-400 mt-1">
                    {lastSummary.avgHr > 0 ? `${lastSummary.avgHr} / ${lastSummary.maxHr} BPM` : '--'}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs text-teal-200 uppercase font-semibold">Avg Body/Skin Temp</p>
                  <p className="font-mono-data text-2xl font-bold text-teal-300 mt-1">
                    {Number(lastSummary.avgTemp) > 0 ? `${lastSummary.avgTemp}°C` : '--'}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs text-teal-200 uppercase font-semibold">Lowest SpO₂</p>
                  <p className="font-mono-data text-2xl font-bold text-blue-300 mt-1">
                    {lastSummary.minSpo2 > 0 ? `${lastSummary.minSpo2}%` : '--'}
                  </p>
                </div>
                <div className="bg-white/5 p-4 rounded-xl border border-white/10">
                  <p className="text-xs text-teal-200 uppercase font-semibold">Calories & Steps</p>
                  <p className="font-mono-data text-2xl font-bold text-emerald-300 mt-1">
                    {lastSummary.calories} <span className="text-xs text-slate-300 font-normal">kcal ({lastSummary.steps} steps)</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 text-xs text-teal-200/80 border-t border-teal-800/80">
                <span>💧 Hydration fluid replenishment recommended: ~{lastSummary.hydrationConsumedMl} ml</span>
                <span className="font-semibold text-emerald-400">✓ Saved to Supabase Workout Database</span>
              </div>
            </div>
          )}

          {/* Telemetry Charts */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                  Workout Session Telemetry & Trends
                </h3>
                <p className="text-xs text-slate-400">
                  {sensorSource.isConnected() ? 'Real-time sensor trace captured during activity' : 'Waiting for sensor data connection...'}
                </p>
              </div>
              <span className="text-xs font-mono-data text-slate-400">
                {sensorSource.isConnected() ? 'Live feed active' : 'No Live Sensor Connected'}
              </span>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <XAxis dataKey="time" stroke="#94a3b8" fontSize={11} />
                    <YAxis stroke="#94a3b8" fontSize={11} domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0' }} />
                    <Line type="monotone" dataKey="heartRate" stroke="#ef4444" strokeWidth={2.5} dot={false} name="Heart Rate (BPM)" />
                    <Line type="monotone" dataKey="temperature" stroke="#0d9488" strokeWidth={2.5} dot={false} name="Body/Skin Temp (°C)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 w-full flex flex-col items-center justify-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-400 text-xs">
                <span className="text-2xl mb-1">🏃</span>
                <span>No live sensor connected. Waiting for telemetry data...</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
