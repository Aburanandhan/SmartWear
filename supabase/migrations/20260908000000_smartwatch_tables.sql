-- SmartWear Smartwatch Integration Schema
-- Created at: 2026-09-08

-- 1. Smartwatch Connections Table
CREATE TABLE IF NOT EXISTS public.smartwatch_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  provider TEXT NOT NULL DEFAULT 'health_connect',
  device_name TEXT,
  connected BOOLEAN NOT NULL DEFAULT FALSE,
  last_sync TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Smartwatch Daily Activity Table
CREATE TABLE IF NOT EXISTS public.smartwatch_daily_activity (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL DEFAULT 'health_connect',
  device_name TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  steps INTEGER,
  active_minutes INTEGER,
  active_calories NUMERIC,
  distance NUMERIC,
  heart_rate INTEGER,
  resting_heart_rate INTEGER,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT smartwatch_user_date_unique UNIQUE (user_id, date)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.smartwatch_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.smartwatch_daily_activity ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to allow clean re-application
DROP POLICY IF EXISTS "Users can access own smartwatch_connections" ON public.smartwatch_connections;
DROP POLICY IF EXISTS "Users can access own smartwatch_daily_activity" ON public.smartwatch_daily_activity;

-- RLS Policies: Authenticated users can only read and modify their own records
CREATE POLICY "Users can access own smartwatch_connections"
  ON public.smartwatch_connections
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can access own smartwatch_daily_activity"
  ON public.smartwatch_daily_activity
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Enable Supabase Realtime for smartwatch_connections and smartwatch_daily_activity
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'smartwatch_connections'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.smartwatch_connections;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'smartwatch_daily_activity'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.smartwatch_daily_activity;
  END IF;
END $$;
