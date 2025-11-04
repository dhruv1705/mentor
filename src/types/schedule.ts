export interface UserSchedule {
  id?: string;
  user_id: string;
  wake_time: string | null;
  breakfast_time: string | null;
  lunch_time: string | null;
  dinner_time: string | null;
  sleep_time: string | null;
  target_wake_time: string | null;
  target_breakfast_time: string | null;
  target_lunch_time: string | null;
  target_dinner_time: string | null;
  target_sleep_time: string | null;
  schedule_type: 'weekday' | 'weekend';
  created_at?: string;
  updated_at?: string;
}

export interface ScheduleTimeSlot {
  type: 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'sleep';
  time: string | null;
  label: string;
}

export interface ScheduleOptimization {
  type: 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'sleep';
  currentTime: string | null;
  suggestedTime: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
}

export interface ScheduleConsistency {
  timeSlot: 'wake' | 'breakfast' | 'lunch' | 'dinner' | 'sleep';
  averageTime: string;
  variationMinutes: number;
  consistencyScore: number; // 0-100
}