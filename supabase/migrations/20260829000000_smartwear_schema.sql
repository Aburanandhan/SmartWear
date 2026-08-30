-- SmartWear Database Schema Migration
-- Created at: 2026-08-29

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal TEXT NOT NULL DEFAULT 'gym',
  age INTEGER NOT NULL DEFAULT 24,
  height INTEGER NOT NULL DEFAULT 172,
  weight NUMERIC NOT NULL DEFAULT 70,
  activity_level TEXT NOT NULL DEFAULT 'moderate',
  primary_exercise TEXT NOT NULL DEFAULT 'Running',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Budgets Table
CREATE TABLE IF NOT EXISTS public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_budget NUMERIC NOT NULL DEFAULT 6000,
  category_allocations JSONB NOT NULL DEFAULT '{"food": 3200, "supplements": 800, "hydration": 600, "recovery": 800, "other": 600}'::jsonb,
  warning_threshold NUMERIC NOT NULL DEFAULT 0.8,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Expenses Table
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Sensor Readings Table
CREATE TABLE IF NOT EXISTS public.sensor_readings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL DEFAULT 'ESP32_BELT_01',
  temperature NUMERIC NOT NULL,
  heart_rate NUMERIC NOT NULL,
  spo2 NUMERIC NOT NULL,
  motion TEXT NOT NULL DEFAULT 'REST',
  steps INTEGER NOT NULL DEFAULT 0,
  workout_active BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Workouts Table
CREATE TABLE IF NOT EXISTS public.workouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  steps INTEGER NOT NULL DEFAULT 0,
  calories NUMERIC NOT NULL DEFAULT 0,
  avg_hr NUMERIC NOT NULL DEFAULT 0
);

-- 6. Hydration Logs Table
CREATE TABLE IF NOT EXISTS public.hydration_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_ml INTEGER NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Alerts Table
CREATE TABLE IF NOT EXISTS public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'System',
  severity TEXT NOT NULL DEFAULT 'medium',
  message TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  wearable_status TEXT NOT NULL DEFAULT 'SIMULATED DEVICE',
  notification_prefs JSONB NOT NULL DEFAULT '{"email": true, "push": true, "hydration": true, "budget": true}'::jsonb,
  budget_alert_threshold NUMERIC NOT NULL DEFAULT 0.8,
  units TEXT NOT NULL DEFAULT 'metric',
  privacy_settings JSONB NOT NULL DEFAULT '{"shareData": false, "anonymousAnalytics": true}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sensor_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hydration_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid errors on rerun
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can access own budgets" ON public.budgets;
DROP POLICY IF EXISTS "Users can access own expenses" ON public.expenses;
DROP POLICY IF EXISTS "Users can access own sensor_readings" ON public.sensor_readings;
DROP POLICY IF EXISTS "Users can access own workouts" ON public.workouts;
DROP POLICY IF EXISTS "Users can access own hydration_logs" ON public.hydration_logs;
DROP POLICY IF EXISTS "Users can access own alerts" ON public.alerts;
DROP POLICY IF EXISTS "Users can access own settings" ON public.settings;

-- RLS Policies
-- Profiles:
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Budgets:
CREATE POLICY "Users can access own budgets" ON public.budgets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Expenses:
CREATE POLICY "Users can access own expenses" ON public.expenses FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Sensor Readings (allow user OR null for public demo readings):
CREATE POLICY "Users can access own sensor_readings" ON public.sensor_readings FOR ALL USING (user_id IS NULL OR auth.uid() = user_id) WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Workouts:
CREATE POLICY "Users can access own workouts" ON public.workouts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Hydration Logs:
CREATE POLICY "Users can access own hydration_logs" ON public.hydration_logs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Alerts:
CREATE POLICY "Users can access own alerts" ON public.alerts FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Settings:
CREATE POLICY "Users can access own settings" ON public.settings FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime for sensor_readings and alerts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'sensor_readings'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.sensor_readings;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'alerts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
  END IF;
END $$;
