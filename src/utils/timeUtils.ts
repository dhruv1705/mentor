// Time utility functions for time-based features

export type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'night';
export type MusicTimeCategory = 'morning' | 'evening';

// Time period definitions
export const TIME_PERIODS = {
  MORNING: { start: 6, end: 12 },    // 6 AM - 12 PM
  AFTERNOON: { start: 12, end: 18 }, // 12 PM - 6 PM
  EVENING: { start: 18, end: 22 },   // 6 PM - 10 PM
  NIGHT: { start: 22, end: 6 },      // 10 PM - 6 AM (next day)
} as const;

/**
 * Get the current time of day based on the current hour
 */
export const getCurrentTimeOfDay = (): TimeOfDay => {
  const now = new Date();
  const hour = now.getHours(); // 0-23

  if (hour >= TIME_PERIODS.MORNING.start && hour < TIME_PERIODS.MORNING.end) {
    return 'morning';
  } else if (hour >= TIME_PERIODS.AFTERNOON.start && hour < TIME_PERIODS.AFTERNOON.end) {
    return 'afternoon';
  } else if (hour >= TIME_PERIODS.EVENING.start && hour < TIME_PERIODS.EVENING.end) {
    return 'evening';
  } else {
    return 'night';
  }
};

/**
 * Get the appropriate music category based on current time
 * Morning/Afternoon = 'morning' music (energizing)
 * Evening/Night = 'evening' music (relaxing)
 */
export const getCurrentMusicCategory = (): MusicTimeCategory => {
  const timeOfDay = getCurrentTimeOfDay();
  
  if (timeOfDay === 'morning' || timeOfDay === 'afternoon') {
    return 'morning';
  } else {
    return 'evening';
  }
};

/**
 * Get a human-readable time period description
 */
export const getTimeDescription = (timeOfDay?: TimeOfDay): string => {
  const time = timeOfDay || getCurrentTimeOfDay();
  
  switch (time) {
    case 'morning':
      return 'Good morning! Time to energize';
    case 'afternoon':
      return 'Good afternoon! Keep the energy up';
    case 'evening':
      return 'Good evening! Time to wind down';
    case 'night':
      return 'Good night! Time to relax';
    default:
      return 'Hello there!';
  }
};

/**
 * Check if a given time falls within a specific time period
 */
export const isTimeInPeriod = (hour: number, period: keyof typeof TIME_PERIODS): boolean => {
  const { start, end } = TIME_PERIODS[period];
  
  if (period === 'NIGHT') {
    // Handle night time crossing midnight (22:00 - 06:00)
    return hour >= start || hour < end;
  } else {
    return hour >= start && hour < end;
  }
};

/**
 * Get the next time period change
 */
export const getNextTimeChange = (): { period: TimeOfDay; timeLeft: string } => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  
  let nextHour: number;
  let nextPeriod: TimeOfDay;
  
  if (currentHour < TIME_PERIODS.MORNING.start) {
    nextHour = TIME_PERIODS.MORNING.start;
    nextPeriod = 'morning';
  } else if (currentHour < TIME_PERIODS.AFTERNOON.start) {
    nextHour = TIME_PERIODS.AFTERNOON.start;
    nextPeriod = 'afternoon';
  } else if (currentHour < TIME_PERIODS.EVENING.start) {
    nextHour = TIME_PERIODS.EVENING.start;
    nextPeriod = 'evening';
  } else {
    nextHour = TIME_PERIODS.NIGHT.start;
    nextPeriod = 'night';
  }
  
  const hoursLeft = nextHour - currentHour;
  const minutesLeft = 60 - currentMinute;
  
  let timeLeft: string;
  if (hoursLeft > 0) {
    timeLeft = `${hoursLeft}h ${minutesLeft}m`;
  } else {
    timeLeft = `${minutesLeft}m`;
  }
  
  return { period: nextPeriod, timeLeft };
};

/**
 * Format time period for display
 */
export const formatTimeOfDay = (timeOfDay: TimeOfDay): string => {
  return timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1);
};