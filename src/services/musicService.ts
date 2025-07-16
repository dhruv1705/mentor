import { supabase } from './supabaseClient';
import { MusicTrack, MusicPlaylist, MusicPreferences } from '../types/music';

export class MusicService {
  // Music Tracks
  static async getAllTracks(): Promise<MusicTrack[]> {
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching music tracks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('MusicService.getAllTracks error:', error);
      throw error;
    }
  }

  static async getTrackById(id: string): Promise<MusicTrack | null> {
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching track:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('MusicService.getTrackById error:', error);
      throw error;
    }
  }

  static async createTrack(track: Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>): Promise<MusicTrack | null> {
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .insert([track])
        .select()
        .single();

      if (error) {
        console.error('Error creating track:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('MusicService.createTrack error:', error);
      throw error;
    }
  }

  static async updateTrack(id: string, updates: Partial<MusicTrack>): Promise<MusicTrack | null> {
    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating track:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('MusicService.updateTrack error:', error);
      throw error;
    }
  }

  static async deleteTrack(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('music_tracks')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting track:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('MusicService.deleteTrack error:', error);
      throw error;
    }
  }

  // Music Playlists
  static async getAllPlaylists(): Promise<MusicPlaylist[]> {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .select(`
          *,
          playlist_tracks (
            music_tracks (*)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching playlists:', error);
        throw error;
      }

      // Transform the data to match our interface
      const playlists: MusicPlaylist[] = (data || []).map(playlist => ({
        id: playlist.id,
        name: playlist.name,
        description: playlist.description,
        tracks: playlist.playlist_tracks?.map((pt: any) => pt.music_tracks) || [],
        created_at: playlist.created_at,
        updated_at: playlist.updated_at,
      }));

      return playlists;
    } catch (error) {
      console.error('MusicService.getAllPlaylists error:', error);
      throw error;
    }
  }

  static async createPlaylist(playlist: Omit<MusicPlaylist, 'id' | 'tracks' | 'created_at' | 'updated_at'>): Promise<MusicPlaylist | null> {
    try {
      const { data, error } = await supabase
        .from('music_playlists')
        .insert([playlist])
        .select()
        .single();

      if (error) {
        console.error('Error creating playlist:', error);
        throw error;
      }

      return {
        ...data,
        tracks: [],
      };
    } catch (error) {
      console.error('MusicService.createPlaylist error:', error);
      throw error;
    }
  }

  static async addTrackToPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('playlist_tracks')
        .insert([{
          playlist_id: playlistId,
          track_id: trackId,
        }]);

      if (error) {
        console.error('Error adding track to playlist:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('MusicService.addTrackToPlaylist error:', error);
      throw error;
    }
  }

  static async removeTrackFromPlaylist(playlistId: string, trackId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('playlist_tracks')
        .delete()
        .eq('playlist_id', playlistId)
        .eq('track_id', trackId);

      if (error) {
        console.error('Error removing track from playlist:', error);
        throw error;
      }

      return true;
    } catch (error) {
      console.error('MusicService.removeTrackFromPlaylist error:', error);
      throw error;
    }
  }

  // Music Preferences
  static async getUserPreferences(userId: string): Promise<MusicPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('music_preferences')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
        console.error('Error fetching music preferences:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('MusicService.getUserPreferences error:', error);
      throw error;
    }
  }

  static async createUserPreferences(userId: string, preferences: Omit<MusicPreferences, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<MusicPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('music_preferences')
        .insert([{
          user_id: userId,
          ...preferences,
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating music preferences:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('MusicService.createUserPreferences error:', error);
      throw error;
    }
  }

  static async updateUserPreferences(userId: string, updates: Partial<MusicPreferences>): Promise<MusicPreferences | null> {
    try {
      const { data, error } = await supabase
        .from('music_preferences')
        .update(updates)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating music preferences:', error);
        throw error;
      }

      return data;
    } catch (error) {
      console.error('MusicService.updateUserPreferences error:', error);
      throw error;
    }
  }

  // Helper methods for sample data
  static async createSampleTracks(): Promise<MusicTrack[]> {
    const { MUSIC_TRACKS } = await import('../data/musicData');

    try {
      const { data, error } = await supabase
        .from('music_tracks')
        .insert(MUSIC_TRACKS)
        .select();

      if (error) {
        console.error('Error creating sample tracks:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('MusicService.createSampleTracks error:', error);
      throw error;
    }
  }

  // Helper method to initialize music data from config
  static async initializeMusicData(): Promise<void> {
    try {
      // Check if tracks already exist
      const { data: existingTracks, error: checkError } = await supabase
        .from('music_tracks')
        .select('id')
        .limit(1);

      if (checkError) {
        console.error('Error checking existing tracks:', checkError);
        return;
      }

      // If no tracks exist, create sample data
      if (!existingTracks || existingTracks.length === 0) {
        await this.createSampleTracks();
        console.log('Sample music tracks created successfully');
      }
    } catch (error) {
      console.error('Error initializing music data:', error);
    }
  }

  // Helper method to force refresh music data (adds new tracks)
  static async refreshMusicData(): Promise<void> {
    try {
      const { MUSIC_TRACKS } = await import('../data/musicData');
      
      // Get existing track URLs
      const { data: existingTracks, error: checkError } = await supabase
        .from('music_tracks')
        .select('url');

      if (checkError) {
        console.error('Error checking existing tracks:', checkError);
        return;
      }

      const existingUrls = existingTracks?.map(track => track.url) || [];
      
      // Find new tracks that don't exist in database
      const newTracks = MUSIC_TRACKS.filter(track => !existingUrls.includes(track.url));
      
      if (newTracks.length > 0) {
        const { data, error } = await supabase
          .from('music_tracks')
          .insert(newTracks)
          .select();

        if (error) {
          console.error('Error adding new tracks:', error);
          throw error;
        }

        console.log(`Added ${newTracks.length} new music tracks`);
        return;
      }
      
      console.log('No new tracks to add');
    } catch (error) {
      console.error('Error refreshing music data:', error);
    }
  }
}

// Export a singleton instance
export const musicService = new MusicService();