// Time-based music recommendation service
import { MusicTrack } from '../types/music';
import { getCurrentMusicCategory, getCurrentTimeOfDay, getTimeDescription } from '../utils/timeUtils';
import { getRecommendedTrackForTime, getTracksByTimeOfDay } from '../data/musicData';
import { MusicService } from './musicService';

export interface TimeMusicSuggestion {
  timeOfDay: string;
  category: 'morning' | 'evening';
  description: string;
  recommendedTrack: MusicTrack | Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'> | null;
  allTracks: (MusicTrack | Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>)[];
}

export class TimeMusicService {
  /**
   * Get music suggestion based on current time
   */
  static async getCurrentTimeMusicSuggestion(): Promise<TimeMusicSuggestion> {
    const timeOfDay = getCurrentTimeOfDay();
    const category = getCurrentMusicCategory();
    const description = getTimeDescription(timeOfDay);
    
    // Get recommended track from static data
    const staticRecommendation = getRecommendedTrackForTime(category);
    const staticTracks = getTracksByTimeOfDay(category);
    
    try {
      // Try to get tracks from database
      const dbTracks = await MusicService.getAllTracks();
      
      // Filter database tracks by time category
      const filteredDbTracks = dbTracks.filter(track => {
        if (category === 'morning') {
          return track.genre === 'Morning';
        } else {
          return track.genre === 'Sleep';
        }
      });
      
      // Use database tracks if available, otherwise fall back to static data
      const recommendedTrack = filteredDbTracks.length > 0 ? filteredDbTracks[0] : staticRecommendation;
      const allTracks = filteredDbTracks.length > 0 ? filteredDbTracks : staticTracks;
      
      return {
        timeOfDay,
        category,
        description,
        recommendedTrack,
        allTracks,
      };
    } catch (error) {
      console.error('Error getting database tracks, using static data:', error);
      
      // Fall back to static data if database fails
      return {
        timeOfDay,
        category,
        description,
        recommendedTrack: staticRecommendation,
        allTracks: staticTracks,
      };
    }
  }
  
  /**
   * Get music suggestion for a specific time category
   */
  static async getMusicSuggestionForCategory(category: 'morning' | 'evening'): Promise<TimeMusicSuggestion> {
    const timeOfDay = category === 'morning' ? 'morning' : 'evening';
    const description = getTimeDescription(timeOfDay);
    
    // Get recommended track from static data
    const staticRecommendation = getRecommendedTrackForTime(category);
    const staticTracks = getTracksByTimeOfDay(category);
    
    try {
      // Try to get tracks from database
      const dbTracks = await MusicService.getAllTracks();
      
      // Filter database tracks by time category
      const filteredDbTracks = dbTracks.filter(track => {
        if (category === 'morning') {
          return track.genre === 'Morning';
        } else {
          return track.genre === 'Sleep';
        }
      });
      
      // Use database tracks if available, otherwise fall back to static data
      const recommendedTrack = filteredDbTracks.length > 0 ? filteredDbTracks[0] : staticRecommendation;
      const allTracks = filteredDbTracks.length > 0 ? filteredDbTracks : staticTracks;
      
      return {
        timeOfDay,
        category,
        description,
        recommendedTrack,
        allTracks,
      };
    } catch (error) {
      console.error('Error getting database tracks, using static data:', error);
      
      // Fall back to static data if database fails
      return {
        timeOfDay,
        category,
        description,
        recommendedTrack: staticRecommendation,
        allTracks: staticTracks,
      };
    }
  }
  
  /**
   * Check if it's time to suggest different music
   */
  static shouldSuggestTimeBasedMusic(): boolean {
    // Always suggest time-based music for now
    // Could add logic here for user preferences or frequency limits
    return true;
  }
  
  /**
   * Get formatted time-based music message
   */
  static getTimeMusicMessage(suggestion: TimeMusicSuggestion): string {
    if (!suggestion.recommendedTrack) {
      return `${suggestion.description} No music available for this time.`;
    }
    
    const trackName = suggestion.recommendedTrack.title;
    const artist = suggestion.recommendedTrack.artist;
    
    return `${suggestion.description} Perfect time for "${trackName}" by ${artist}`;
  }
}

// Export singleton instance
export const timeMusicService = new TimeMusicService();