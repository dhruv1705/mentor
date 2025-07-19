-- Create user_schedules table for daily schedule tracking
CREATE TABLE user_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  wake_time TIME,
  breakfast_time TIME,
  lunch_time TIME,
  dinner_time TIME,
  sleep_time TIME,
  target_wake_time TIME,
  target_breakfast_time TIME,
  target_lunch_time TIME,
  target_dinner_time TIME,
  target_sleep_time TIME,
  schedule_type VARCHAR(20) DEFAULT 'weekday' CHECK (schedule_type IN ('weekday', 'weekend')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_user_schedules_user_id ON user_schedules(user_id);
CREATE INDEX idx_user_schedules_schedule_type ON user_schedules(schedule_type);

-- Create indexes for target schedule columns (only when not null for efficiency)
CREATE INDEX idx_user_schedules_target_wake_time ON user_schedules(target_wake_time) WHERE target_wake_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_breakfast_time ON user_schedules(target_breakfast_time) WHERE target_breakfast_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_lunch_time ON user_schedules(target_lunch_time) WHERE target_lunch_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_dinner_time ON user_schedules(target_dinner_time) WHERE target_dinner_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_sleep_time ON user_schedules(target_sleep_time) WHERE target_sleep_time IS NOT NULL;

-- Add RLS (Row Level Security) policies
ALTER TABLE user_schedules ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own schedules
CREATE POLICY "Users can view their own schedules" ON user_schedules
FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can only insert their own schedules
CREATE POLICY "Users can insert their own schedules" ON user_schedules
FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can only update their own schedules
CREATE POLICY "Users can update their own schedules" ON user_schedules
FOR UPDATE USING (auth.uid() = user_id);

-- Policy: Users can only delete their own schedules
CREATE POLICY "Users can delete their own schedules" ON user_schedules
FOR DELETE USING (auth.uid() = user_id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_schedules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_schedules_updated_at
  BEFORE UPDATE ON user_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_user_schedules_updated_at();