-- Migration: Add target schedule columns to existing user_schedules table
-- Run this if your database was created before target schedule columns were added

-- Add target schedule columns
ALTER TABLE user_schedules 
ADD COLUMN IF NOT EXISTS target_wake_time TIME,
ADD COLUMN IF NOT EXISTS target_breakfast_time TIME,
ADD COLUMN IF NOT EXISTS target_lunch_time TIME,
ADD COLUMN IF NOT EXISTS target_dinner_time TIME,
ADD COLUMN IF NOT EXISTS target_sleep_time TIME;

-- Create indexes for target schedule columns (only when not null for efficiency)
CREATE INDEX IF NOT EXISTS idx_user_schedules_target_wake_time 
ON user_schedules(target_wake_time) WHERE target_wake_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_schedules_target_breakfast_time 
ON user_schedules(target_breakfast_time) WHERE target_breakfast_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_schedules_target_lunch_time 
ON user_schedules(target_lunch_time) WHERE target_lunch_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_schedules_target_dinner_time 
ON user_schedules(target_dinner_time) WHERE target_dinner_time IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_schedules_target_sleep_time 
ON user_schedules(target_sleep_time) WHERE target_sleep_time IS NOT NULL;

-- Verify the columns were added (optional check)
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'user_schedules' 
AND column_name LIKE 'target_%'
ORDER BY column_name;