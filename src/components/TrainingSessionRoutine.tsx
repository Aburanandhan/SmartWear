import { useEffect, useState } from 'react'
import type { Goal, UserProfile } from '../App'

type FitnessLevel = 'beginner' | 'intermediate' | 'advanced'
type TrainingGoal = 'weight-gaining' | 'weight-losing' | 'sports' | 'strength' | 'weight-lifting' | 'general-health'
type ActivityProfile = 'daily-worker' | 'athlete'

interface RoutineTemplate {
  duration: string
  warmUp: string
  workout: string
  sets: string
  rest: string
  coolDown: string
  recovery: string
}

interface RecommendedSession {
  name: string
  duration: string
  focus: string
  frequency: string
}

const LEVELS: { id: FitnessLevel; label: string; description: string }[] = [
  { id: 'beginner', label: 'Beginner', description: 'Build consistency and movement quality' },
  { id: 'intermediate', label: 'Intermediate', description: 'Progress volume and training control' },
  { id: 'advanced', label: 'Advanced', description: 'Train with focused intensity and precision' },
]

const GOALS: { id: TrainingGoal; label: string }[] = [
  { id: 'weight-gaining', label: 'Weight Gaining' },
  { id: 'weight-losing', label: 'Weight Losing' },
  { id: 'sports', label: 'Sports' },
  { id: 'strength', label: 'Strength' },
  { id: 'weight-lifting', label: 'Weight Lifting' },
  { id: 'general-health', label: 'General Health' },
]

const ACTIVITY_PROFILES: { id: ActivityProfile; label: string; description: string }[] = [
  { id: 'daily-worker', label: 'Daily Worker', description: 'Balanced effort around a busy day' },
  { id: 'athlete', label: 'Athlete', description: 'Higher training capacity and sport focus' },
]

const ROUTINES: Record<FitnessLevel, Record<TrainingGoal, RoutineTemplate>> = {
  beginner: {
    'weight-gaining': { duration: '35-45 min', warmUp: '5-7 min easy walk and mobility', workout: 'Goblet squat, incline push-up, band row, glute bridge', sets: '2 sets of 8-12 reps each', rest: '60-90 sec between sets', coolDown: '5 min easy walking and full-body stretches', recovery: 'Leave at least 48 hours before repeating this muscle-focused session.' },
    'weight-losing': { duration: '35-45 min', warmUp: '6 min brisk walk with dynamic mobility', workout: 'Walk intervals, bodyweight squat, step-up, incline push-up', sets: '2 rounds; 30 sec activity, 60 sec easy recovery', rest: '90 sec between rounds', coolDown: '5 min relaxed walk and breathing', recovery: 'Use a gradual pace and take an easy day if fatigue accumulates.' },
    sports: { duration: '40-50 min', warmUp: '8 min dynamic warm-up and easy movement drills', workout: 'Lateral shuffle, skipping, balance reach, medicine-ball pass', sets: '2 sets of 20 sec drills or 8 reps', rest: '60-90 sec between drills', coolDown: 'Easy walk plus calf, hip, and shoulder stretches', recovery: 'Keep movements controlled while learning technique.' },
    strength: { duration: '35-45 min', warmUp: '7 min mobility and unloaded practice reps', workout: 'Bodyweight squat, incline push-up, assisted row, dead bug', sets: '2 sets of 8-10 reps', rest: '90 sec between sets', coolDown: '5 min gentle mobility', recovery: 'Stop with several comfortable reps in reserve and progress slowly.' },
    'weight-lifting': { duration: '40-50 min', warmUp: '8 min mobility and light warm-up sets', workout: 'Light goblet squat, dumbbell press, dumbbell row, Romanian deadlift', sets: '2 sets of 8-10 reps at an easy load', rest: '90 sec between sets', coolDown: 'Easy walking and relaxed stretches', recovery: 'Prioritize form and use a coach for unfamiliar equipment.' },
    'general-health': { duration: '30-40 min', warmUp: '5 min easy walk and joint mobility', workout: 'Brisk walk, sit-to-stand, wall push-up, heel raise', sets: '2 rounds of 8-12 reps; walk 10-15 min', rest: '60 sec between exercises', coolDown: '5 min slow walk and breathing', recovery: 'Aim for consistency, comfortable effort, and regular rest.' },
  },
  intermediate: {
    'weight-gaining': { duration: '50-60 min', warmUp: '8 min cardio and movement preparation', workout: 'Front squat, dumbbell bench press, seated row, Romanian deadlift', sets: '3 sets of 8-10 reps each', rest: '90 sec between sets', coolDown: '6 min easy cardio and stretches', recovery: 'Refuel after training and allow 48 hours before the same muscle focus.' },
    'weight-losing': { duration: '45-55 min', warmUp: '8 min dynamic warm-up and progressive cardio', workout: 'Bike intervals, reverse lunge, push-up, kettlebell deadlift', sets: '3 rounds; 40 sec work, 80 sec recovery', rest: '2 min between rounds', coolDown: '6 min easy cardio and mobility', recovery: 'Alternate harder sessions with low-intensity movement days.' },
    sports: { duration: '55-65 min', warmUp: '10 min dynamic mobility, skips, and acceleration drills', workout: 'Agility ladder, shuttle runs, single-leg landing, rotational throw', sets: '3 sets of 20-30 sec drills or 8 reps', rest: '90 sec between sets', coolDown: 'Easy jog and lower-body mobility', recovery: 'Keep high-speed work separated by at least one easier day.' },
    strength: { duration: '50-60 min', warmUp: '10 min mobility and progressive warm-up sets', workout: 'Squat, bench press, row, split squat', sets: '3 sets of 6-10 reps', rest: '2 min between compound sets', coolDown: '6 min walking and relaxed stretches', recovery: 'Add load only when every rep stays controlled.' },
    'weight-lifting': { duration: '55-65 min', warmUp: '10 min cardio, mobility, and specific warm-up sets', workout: 'Deadlift, overhead press, pull-down, Bulgarian split squat', sets: '3 sets of 6-10 reps at a moderate load', rest: '2 min between sets', coolDown: 'Easy cardio and hips/shoulders mobility', recovery: 'Keep one full recovery day between demanding lifting sessions.' },
    'general-health': { duration: '40-50 min', warmUp: '7 min brisk cardio and mobility', workout: 'Goblet squat, push-up, row, farmer carry, brisk cardio', sets: '3 rounds of 8-12 reps; 15 min cardio', rest: '60-90 sec between rounds', coolDown: '5 min easy cardio and breathing', recovery: 'Mix moderate sessions with walking and sleep-focused recovery.' },
  },
  advanced: {
    'weight-gaining': { duration: '65-75 min', warmUp: '10 min progressive cardio, mobility, and ramp-up sets', workout: 'Back squat, bench press, weighted row, Romanian deadlift, carries', sets: '4 sets of 6-10 reps each', rest: '2-3 min on compound lifts', coolDown: '8 min easy cardio and targeted mobility', recovery: 'Use planned lighter days and avoid training the same pattern hard on consecutive days.' },
    'weight-losing': { duration: '55-70 min', warmUp: '10 min dynamic mobility and progressive intervals', workout: 'Run or bike intervals, thrusters, walking lunge, pull-up variation', sets: '4 rounds; 45 sec work, 75 sec recovery', rest: '2 min between rounds', coolDown: '8 min easy cardio and breathing', recovery: 'Track fatigue and reduce intensity when recovery or sleep is poor.' },
    sports: { duration: '70-80 min', warmUp: '12 min dynamic warm-up, acceleration, and change-of-direction drills', workout: 'Reactive agility, sprint intervals, plyometric jump, rotational power throw', sets: '4 sets of 20-40 sec drills or 6-8 reps', rest: '2-3 min for quality between sets', coolDown: 'Easy jog and full lower-body mobility', recovery: 'Schedule high-intensity sport work with full recovery between demanding days.' },
    strength: { duration: '65-80 min', warmUp: '12 min mobility and progressive compound warm-up sets', workout: 'Back squat, bench press, deadlift variation, weighted pull-up', sets: '4 sets of 4-8 reps', rest: '2-3 min between heavy sets', coolDown: '8 min easy walk and mobility', recovery: 'Use gradual progression, technical stops, and planned deloads.' },
    'weight-lifting': { duration: '70-85 min', warmUp: '12 min cardio, mobility, and several specific ramp-up sets', workout: 'Deadlift, front squat, overhead press, barbell row, split squat', sets: '4 sets of 5-8 reps at a challenging controlled load', rest: '2-3 min between compound sets', coolDown: '8 min easy cardio and mobility', recovery: 'Keep heavy sessions spaced out and seek qualified coaching for maximal lifts.' },
    'general-health': { duration: '50-60 min', warmUp: '8 min cardio and full-body mobility', workout: 'Squat, push-up, row, carry, moderate intervals', sets: '4 rounds of 8-12 reps; 20 min intervals', rest: '60-90 sec between rounds', coolDown: '8 min easy cardio and breathing', recovery: 'Balance challenging training with easy movement, sleep, and rest days.' },
  },
}

const PROFILE_ADJUSTMENTS: Record<ActivityProfile, { duration: string; rest: string; recovery: string }> = {
  'daily-worker': {
    rest: 'Add 30-60 sec if workday fatigue is high',
    recovery: 'Prioritize manageable effort, hydration, and a rest day when needed.',
  },
  athlete: {
    rest: 'Use the shorter end of the rest range only when technique stays consistent',
    recovery: 'Include sport practice, mobility, and a full recovery block across the week.',
  },
}

const PROGRESSION_BY_GOAL: Record<TrainingGoal, { first: string; second: string; third: string; ongoing: string }> = {
  'weight-gaining': { first: 'Technique, consistency, and manageable resistance.', second: 'Add 1-2 repetitions before adding a small amount of resistance.', third: 'Add one set to selected exercises when recovery is good.', ongoing: 'Progress one variable at a time and keep recovery days.' },
  'weight-losing': { first: 'Build consistent movement and comfortable conditioning.', second: 'Add a few minutes of conditioning or one interval when ready.', third: 'Increase conditioning duration slightly, not all intensity at once.', ongoing: 'Alternate harder sessions with easy movement and recovery.' },
  sports: { first: 'Learn movement quality, balance, and coordination.', second: 'Add one short drill or a small amount of practice time.', third: 'Progress speed or complexity only while landing and technique stay controlled.', ongoing: 'Rotate high-intensity sport work with easier skill and mobility days.' },
  strength: { first: 'Practice compound movement technique with reserve.', second: 'Add repetitions within the planned range before adding load.', third: 'Add a small load increase or one set, never both together.', ongoing: 'Use planned lighter sessions and progress only when form is consistent.' },
  'weight-lifting': { first: 'Learn equipment setup, range of motion, and stable technique.', second: 'Add repetitions at the current load before increasing resistance.', third: 'Increase load slightly for selected lifts when all reps are controlled.', ongoing: 'Keep heavy lifting spaced out and avoid unnecessary max-effort work.' },
  'general-health': { first: 'Build a sustainable full-body movement habit.', second: 'Add a few repetitions or minutes to one part of the session.', third: 'Increase one training variable gradually while keeping effort manageable.', ongoing: 'Maintain a mix of strength, mobility, cardio, and rest.' },
}

function getRecommendedSessions(level: FitnessLevel, goal: TrainingGoal, activity: ActivityProfile): RecommendedSession[] {
  const duration = level === 'beginner' ? '20-30 min' : level === 'intermediate' ? '30-40 min' : '35-50 min'
  const frequency = activity === 'athlete' ? '1-2x weekly' : '1x weekly'
  const sessions: RecommendedSession[] = [
    { name: 'Full Body Strength', duration, focus: goal === 'strength' || goal === 'weight-lifting' ? 'Compound strength and technique' : 'Balanced full-body resistance', frequency: '2x weekly' },
    { name: 'Cardio / Conditioning', duration, focus: goal === 'weight-losing' ? 'Steady conditioning with short intervals' : 'Heart and work-capacity support', frequency: activity === 'athlete' ? '2-3x weekly' : '1-2x weekly' },
    { name: 'Mobility & Flexibility', duration: '15-25 min', focus: 'Range of motion and movement quality', frequency: '2-4x weekly' },
    { name: 'Core Strength', duration: '15-25 min', focus: 'Trunk control and posture', frequency: '1-2x weekly' },
  ]
  if (goal === 'sports' || activity === 'athlete') {
    sessions.push({ name: 'Sport Conditioning', duration, focus: 'Agility, coordination, and sport movement', frequency })
  } else {
    sessions.push({ name: 'Recovery Session', duration: '15-20 min', focus: 'Easy movement, breathing, and recovery', frequency: '1-2x weekly' })
  }
  return sessions
}

function initialLevel(profile: UserProfile['activityLevel']): FitnessLevel {
  if (profile === 'advanced' || profile === 'high') return 'advanced'
  if (profile === 'active' || profile === 'intermediate') return 'intermediate'
  return 'beginner'
}

function initialGoal(profileGoal: Goal): TrainingGoal {
  if (profileGoal === 'weight') return 'weight-losing'
  if (profileGoal === 'strength') return 'strength'
  if (profileGoal === 'athlete' || profileGoal === 'endurance') return 'sports'
  return 'general-health'
}

export default function TrainingSessionRoutine({ profile }: { profile: UserProfile }) {
  const [level, setLevel] = useState<FitnessLevel>(() => initialLevel(profile.activityLevel))
  const [goal, setGoal] = useState<TrainingGoal>(() => initialGoal(profile.goal))
  const [activity, setActivity] = useState<ActivityProfile>(() => profile.goal === 'athlete' ? 'athlete' : 'daily-worker')
  const [routine, setRoutine] = useState<RoutineTemplate | null>(() => ROUTINES[initialLevel(profile.activityLevel)][initialGoal(profile.goal)])

  useEffect(() => {
    const profileLevel = initialLevel(profile.activityLevel)
    const profileGoal = initialGoal(profile.goal)
    const profileActivity: ActivityProfile = profile.goal === 'athlete' || profile.goal === 'endurance' ? 'athlete' : 'daily-worker'

    setLevel(profileLevel)
    setGoal(profileGoal)
    setActivity(profileActivity)
    setRoutine(ROUTINES[profileLevel][profileGoal])
  }, [profile.activityLevel, profile.goal])

  const selectedLevel = LEVELS.find((item) => item.id === level)
  const selectedGoal = GOALS.find((item) => item.id === goal)
  const selectedActivity = ACTIVITY_PROFILES.find((item) => item.id === activity)
  const adjustment = PROFILE_ADJUSTMENTS[activity]
  const progression = PROGRESSION_BY_GOAL[goal]
  const recommendedSessions = getRecommendedSessions(level, goal, activity)

  const generateRoutine = () => setRoutine(ROUTINES[level][goal])

  return (
    <div className="card p-6 space-y-6 fade-in">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">🧭</span>
              <h3 className="font-bold text-lg text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>
                Training Plan
              </h3>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Your onboarding details are preselected. Adjust them only when you want to explore another training plan.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">1. Fitness Level</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {LEVELS.map((item) => (
            <button key={item.id} type="button" onClick={() => { setLevel(item.id); setRoutine(null) }} className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${level === item.id ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'}`}>
              <span className="block text-sm font-bold text-slate-900">{item.label}</span>
              <span className="block text-xs text-slate-500 mt-1">{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">2. Activity Profile</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACTIVITY_PROFILES.map((item) => (
            <button key={item.id} type="button" onClick={() => { setActivity(item.id); setRoutine(null) }} className={`text-left p-3 rounded-xl border transition-all cursor-pointer ${activity === item.id ? 'border-teal-500 bg-teal-50 shadow-sm' : 'border-slate-200 bg-white hover:border-teal-300 hover:bg-slate-50'}`}>
              <span className="block text-sm font-bold text-slate-900">{item.label}</span>
              <span className="block text-xs text-slate-500 mt-1">{item.description}</span>
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={generateRoutine} className="btn-primary w-full sm:w-auto px-5 py-3 text-sm shadow-sm hover:shadow-md">
        Generate Training Plan
      </button>

      {routine && (
        <div className="rounded-2xl border border-teal-100 bg-teal-50/50 p-5 space-y-5 fade-in">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-teal-100 pb-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-700">Personalized Session</p>
              <h4 className="text-lg font-bold text-slate-900 mt-1" style={{ fontFamily: 'Sora, sans-serif' }}>{selectedGoal?.label} · {selectedLevel?.label}</h4>
              <p className="text-xs text-slate-500 mt-1">{selectedActivity?.label} profile · Primary activity: {profile.primaryExercise || 'General fitness'}</p>
            </div>
            <div className="text-left sm:text-right">
              <p className="text-xs text-slate-500">Session Duration</p>
              <p className="font-mono-data font-bold text-teal-800">{routine.duration}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <RoutineDetail label="Warm-up" value={routine.warmUp} />
            <RoutineDetail label="Main Workout" value={routine.workout} />
            <RoutineDetail label="Sets / Repetitions" value={routine.sets} />
            <RoutineDetail label="Rest Period" value={`${routine.rest}. ${adjustment.rest}.`} />
            <RoutineDetail label="Cool-down" value={routine.coolDown} />
            <RoutineDetail label="Recovery Guidance" value={`${routine.recovery} ${adjustment.recovery}`} />
          </div>
          <p className="text-xs text-slate-500 border-t border-teal-100 pt-3">General fitness guidance only. Progress gradually, listen to your body, and take appropriate rest.</p>
        </div>
      )}

      <div className="border-t border-slate-100 pt-5 space-y-4">
        <div>
          <h4 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Progressive Overload</h4>
          <p className="text-xs text-slate-500 mt-1">A gradual plan for your selected {selectedGoal?.label.toLowerCase()} goal.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <ProgressionStep label="Week 1-2" title="Learn & Adapt" value={progression.first} />
          <ProgressionStep label="Week 3-4" title="Increase Intensity" value={progression.second} />
          <ProgressionStep label="Week 5-6" title="Progress Further" value={progression.third} />
          <ProgressionStep label="Week 7+" title="Maintain & Improve" value={progression.ongoing} />
        </div>
        <p className="text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl p-3">Increase training difficulty gradually and only when you can complete the current routine comfortably with good technique.</p>
      </div>

      <div className="border-t border-slate-100 pt-5 space-y-4">
        <div>
          <h4 className="font-bold text-base text-slate-900" style={{ fontFamily: 'Sora, sans-serif' }}>Additional Recommended Sessions</h4>
          <p className="text-xs text-slate-500 mt-1">Optional sessions to complement your generated routine. They do not need to all be completed.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {recommendedSessions.map((session) => (
            <div key={session.name} className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 transition-all hover:border-teal-300 hover:bg-teal-50/40">
              <div className="flex items-start justify-between gap-2">
                <h5 className="text-sm font-bold text-slate-900">{session.name}</h5>
                <span className="text-[10px] font-bold text-teal-700 bg-teal-100 px-2 py-1 rounded-full whitespace-nowrap">{session.duration}</span>
              </div>
              <p className="text-xs text-slate-500 mt-2">{session.focus}</p>
              <p className="text-xs text-slate-400 mt-2">Suggested: {session.frequency}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProgressionStep({ label, title, value }: { label: string; title: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
      <p className="text-xs font-bold text-teal-700">{label}</p>
      <p className="text-sm font-bold text-slate-900 mt-1">{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{value}</p>
    </div>
  )
}

function RoutineDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white bg-white/80 p-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="text-sm text-slate-700 mt-1 leading-relaxed">{value}</p>
    </div>
  )
}
