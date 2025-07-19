import { supabase } from './supabaseClient';
import { UserSchedule, ScheduleOptimization, ScheduleConsistency } from '../types/schedule';

export class ScheduleService {
  // Get user's schedule (weekday or weekend)
  static async getUserSchedule(userId: string, scheduleType: 'weekday' | 'weekend' = 'weekday'): Promise<UserSchedule | null> {
    try {
      const { data, error } = await supabase
        .from('user_schedules')
        .select('*')
        .eq('user_id', userId)
        .eq('schedule_type', scheduleType)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No schedule found, return null
          return null;
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Error fetching user schedule:', error);
      return null;
    }
  }

  // Create or update user's schedule
  static async createOrUpdateSchedule(schedule: Omit<UserSchedule, 'id' | 'created_at' | 'updated_at'>): Promise<UserSchedule | null> {
    try {
      // Check if schedule already exists
      const existingSchedule = await this.getUserSchedule(schedule.user_id, schedule.schedule_type);

      if (existingSchedule) {
        // Update existing schedule
        const { data, error } = await supabase
          .from('user_schedules')
          .update({
            wake_time: schedule.wake_time,
            breakfast_time: schedule.breakfast_time,
            lunch_time: schedule.lunch_time,
            dinner_time: schedule.dinner_time,
            sleep_time: schedule.sleep_time,
            target_wake_time: schedule.target_wake_time,
            target_breakfast_time: schedule.target_breakfast_time,
            target_lunch_time: schedule.target_lunch_time,
            target_dinner_time: schedule.target_dinner_time,
            target_sleep_time: schedule.target_sleep_time,
          })
          .eq('id', existingSchedule.id)
          .select()
          .single();

        if (error) throw error;
        return data;
      } else {
        // Create new schedule
        const { data, error } = await supabase
          .from('user_schedules')
          .insert(schedule)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
    } catch (error) {
      console.error('Error creating/updating schedule:', error);
      return null;
    }
  }

  // Update specific time slot
  static async updateTimeSlot(
    userId: string, 
    timeSlot: 'wake_time' | 'breakfast_time' | 'lunch_time' | 'dinner_time' | 'sleep_time' | 'target_wake_time' | 'target_breakfast_time' | 'target_lunch_time' | 'target_dinner_time' | 'target_sleep_time',
    time: string,
    scheduleType: 'weekday' | 'weekend' = 'weekday'
  ): Promise<boolean> {
    try {
      // Check if schedule exists first
      const existingSchedule = await this.getUserSchedule(userId, scheduleType);
      
      if (existingSchedule) {
        // Update existing record
        const { error } = await supabase
          .from('user_schedules')
          .update({ [timeSlot]: time })
          .eq('user_id', userId)
          .eq('schedule_type', scheduleType);

        if (error) throw error;
      } else {
        // Create new record with the time slot
        const { error } = await supabase
          .from('user_schedules')
          .insert({
            user_id: userId,
            schedule_type: scheduleType,
            [timeSlot]: time
          });

        if (error) throw error;
      }
      
      return true;
    } catch (error) {
      console.error('Error updating time slot:', error);
      return false;
    }
  }

  // Delete user's schedule
  static async deleteSchedule(userId: string, scheduleType: 'weekday' | 'weekend'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_schedules')
        .delete()
        .eq('user_id', userId)
        .eq('schedule_type', scheduleType);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting schedule:', error);
      return false;
    }
  }

  // Get both weekday and weekend schedules
  static async getAllSchedules(userId: string): Promise<{ weekday: UserSchedule | null; weekend: UserSchedule | null }> {
    try {
      const { data, error } = await supabase
        .from('user_schedules')
        .select('*')
        .eq('user_id', userId);

      if (error) throw error;

      const weekdaySchedule = data.find(s => s.schedule_type === 'weekday') || null;
      const weekendSchedule = data.find(s => s.schedule_type === 'weekend') || null;

      return {
        weekday: weekdaySchedule,
        weekend: weekendSchedule
      };
    } catch (error) {
      console.error('Error fetching all schedules:', error);
      return { weekday: null, weekend: null };
    }
  }

  // Helper: Convert time string to minutes since midnight
  private static timeToMinutes(timeStr: string): number {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Helper: Convert minutes since midnight to time string
  private static minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  // Note: Optimization features removed - app now focuses on data collection only

  // Check schedule consistency (placeholder for future implementation)
  static async getScheduleConsistency(userId: string): Promise<ScheduleConsistency[]> {
    // This would analyze historical schedule data
    // For now, return empty array as placeholder
    return [];
  }
}

export const scheduleService = ScheduleService;