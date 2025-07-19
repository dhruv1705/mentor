# Database Migration Instructions

## Problem
The application is trying to save target schedule data (e.g., "target_breakfast_time") but the database table `user_schedules` is missing these columns, causing the error:
```
Could not find the 'target_breakfast_time' column of 'user_schedules' in the schema cache
```

## Solution
Run the migration script to add the missing target schedule columns.

## Steps to Fix

### Option 1: Run Migration Script (Recommended)
Execute the migration script against your database:

```bash
# If using Supabase CLI
supabase db reset  # This will recreate the schema with updated columns

# OR if using psql directly
psql -d your_database_name -f add_target_schedule_columns.sql
```

### Option 2: Manual SQL Execution
If you prefer to run the commands manually, execute these SQL statements in your database:

```sql
-- Add target schedule columns
ALTER TABLE user_schedules 
ADD COLUMN target_wake_time TIME,
ADD COLUMN target_breakfast_time TIME,
ADD COLUMN target_lunch_time TIME,
ADD COLUMN target_dinner_time TIME,
ADD COLUMN target_sleep_time TIME;

-- Create indexes for better performance
CREATE INDEX idx_user_schedules_target_wake_time ON user_schedules(target_wake_time) WHERE target_wake_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_breakfast_time ON user_schedules(target_breakfast_time) WHERE target_breakfast_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_lunch_time ON user_schedules(target_lunch_time) WHERE target_lunch_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_dinner_time ON user_schedules(target_dinner_time) WHERE target_dinner_time IS NOT NULL;
CREATE INDEX idx_user_schedules_target_sleep_time ON user_schedules(target_sleep_time) WHERE target_sleep_time IS NOT NULL;
```

## Verification
After running the migration, you can verify the columns were added:

```sql
\d user_schedules;
```

The table should now include both regular schedule columns and target schedule columns:
- `wake_time`, `breakfast_time`, `lunch_time`, `dinner_time`, `sleep_time`
- `target_wake_time`, `target_breakfast_time`, `target_lunch_time`, `target_dinner_time`, `target_sleep_time`

## Files Updated
1. `/Users/dhruvkant/Desktop/mentor/add_target_schedule_columns.sql` - Migration script to add missing columns
2. `/Users/dhruvkant/Desktop/mentor/create_user_schedules_table.sql` - Updated base schema for future deployments

## What This Fixes
- Target schedule extraction from user messages will now save correctly
- No more "column not found" errors when saving target schedule data
- The application can properly track both current and target/ideal schedule times