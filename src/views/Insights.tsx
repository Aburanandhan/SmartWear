import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import type { UserProfile } from '../App'
import type { SensorReading } from '../services/sensor/types'

const weeklyHealth = [
  { day: 'Mon', temp: 36.6, hr: 74, spo2: 98 },
  { day: 'Tue', temp: 36.8, hr: 78, spo2: 97 },
  { day: 'Wed', temp: 36.9, hr: 82, spo2: 98 },
  { day: 'Thu', temp: 36.7, hr: 76, spo2: 99 },
  { day: 'Fri', temp: 37.1, hr: 88, spo2: 97 },
  { day: 'Sat', temp: 36.5, hr: 71, spo2: 98 },
  { day: 'Sun', temp: 36.7, hr: 75, spo2: 98 },
]

const activityTrend = [
  { week: 'W1', steps: 38000, cal: 1820, workouts: 3 },
  { week: 'W2', steps: 45000, cal: 2100, workouts: 4 },
  { week: 'W3', steps: 42000, cal: 1980, workouts: 4 },
  { week: 'W4', steps: 48000, cal: 2250, workouts: 5 },
]

const spendingTrend = [
  { month: 'May', food: 3100, supplements: 750, hydration: 400, recovery: 700 },
  { month: 'Jun', food: 3400, supplements: 800, hydration: 450, recovery: 750 },
  { month: 'Jul', food: 3000, supplements: 700, hydration: 380, recovery: 820 },
  { month: 'Aug', food: 1850, supplements: 800, hydration: 420, recovery: 900 },
]

interface Props {
  profile: UserProfile
  reading?: SensorReading
}

export default function Insights({ profile }: Props) {
  return (
    <div className="space-y-5 max-w-5xl">
      {/* Score cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Health Score', val: 82, trend: '+3', color: '#22c55e', icon: '💚' },
          { label: 'Activity Score', val: 74, trend: '+8', color: '#0d9488', icon: '🏃' },
          { label: 'Nutrition Score', val: 78, trend: '+2', color: '#f59e0b', icon: '🥗' },
          { label: 'Budget Score', val: 71, trend: '-5', color: '#8b5cf6', icon: '💰' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="font-mono-data font-bold text-2xl" style={{ color: s.color }}>{s.val}</p>
            <p className="text-xs font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>{s.label}</p>
            <p className="text-xs mt-0.5" style={{ fontFamily: 'Inter, sans-serif', color: s.trend.startsWith('+') ? '#22c55e' : '#ef4444' }}>{s.trend} this week</p>
          </div>
        ))}
      </div>

      {/* Health trends */}
      <div className="card p-5">
        <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Health Trends — This Week</p>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={weeklyHealth} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="day" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="left" domain={[35, 38]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis yAxisId="right" orientation="right" domain={[50, 110]} tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontFamily: 'Inter', fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="temp" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Skin Temp °C" />
            <Line yAxisId="right" type="monotone" dataKey="hr" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Heart Rate BPM" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Activity trend */}
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Monthly Activity Trend</p>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={activityTrend} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <defs>
                <linearGradient id="stepsGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0d9488" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#0d9488" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="week" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [v.toLocaleString(), 'Steps']} />
              <Area type="monotone" dataKey="steps" stroke="#0d9488" strokeWidth={2} fill="url(#stepsGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Spending trend */}
        <div className="card p-5">
          <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>Spending by Category</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={spendingTrend} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 11, fontFamily: 'Inter', fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 11 }} formatter={(v: any) => [`₹${v}`, '']} />
              <Bar dataKey="food" stackId="a" fill="#22c55e" />
              <Bar dataKey="supplements" stackId="a" fill="#8b5cf6" />
              <Bar dataKey="hydration" stackId="a" fill="#3b82f6" />
              <Bar dataKey="recovery" stackId="a" fill="#f59e0b" radius={[5, 5, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Insights list */}
      <div className="card p-5">
        <p className="text-sm font-semibold mb-4" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>AI Insights</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: '📈', title: 'Activity improving', desc: 'Your weekly step count has increased 26% over the last month. Great trend!', color: '#0d9488', bg: '#ccfbf1' },
            { icon: '❤️', title: 'Heart rate variability', desc: 'Resting HR dropped from 82 to 74 BPM this month — a sign of improving cardiovascular fitness.', color: '#ef4444', bg: '#fee2e2' },
            { icon: '💧', title: 'Hydration opportunity', desc: 'Your session intensity increases hydration needs. Consider tracking water intake more closely.', color: '#3b82f6', bg: '#dbeafe' },
            { icon: '🥗', title: 'Nutrition on track', desc: `Your ${profile.goal} goal plan is meeting protein targets 5 out of 7 days this week.`, color: '#f59e0b', bg: '#fef3c7' },
            { icon: '💰', title: 'Budget pacing', desc: 'At current spending rate, you\'ll end the month at ₹5,100 — within your ₹6,000 budget.', color: '#8b5cf6', bg: '#ede9fe' },
            { icon: '🛌', title: 'Recovery recommended', desc: 'You\'ve had 4 consecutive high-intensity days. Consider an active recovery session today.', color: '#22c55e', bg: '#dcfce7' },
          ].map((ins) => (
            <div key={ins.title} className="flex items-start gap-3 p-4 rounded-xl" style={{ background: ins.bg }}>
              <span className="text-xl">{ins.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ fontFamily: 'Sora, sans-serif', color: '#0f172a' }}>{ins.title}</p>
                <p className="text-xs mt-1 leading-relaxed" style={{ fontFamily: 'Inter, sans-serif', color: '#64748b' }}>{ins.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
