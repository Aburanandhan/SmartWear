-- Migration: Add Food Preferences to profiles
-- Created at: 2026-08-29

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS diet_type TEXT NOT NULL DEFAULT 'vegetarian',
ADD COLUMN IF NOT EXISTS food_style TEXT NOT NULL DEFAULT 'mixed-indian',
ADD COLUMN IF NOT EXISTS excluded_foods JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS preferred_foods JSONB NOT NULL DEFAULT '[]'::jsonb;
