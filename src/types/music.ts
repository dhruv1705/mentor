export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  duration?: number; // in milliseconds
  url: string; // Google Cloud Storage URL
  thumbnail?: string; // Optional thumbnail URL
  genre?: string;
  album?: string;
  created_at: string;
  updated_at: string;
}

export interface MusicPlaylist {
  id: string;
  name: string;
  description?: string;
  tracks: MusicTrack[];
  created_at: string;
  updated_at: string;
}

export interface MusicPlayerState {
  currentTrack: MusicTrack | null;
  isPlaying: boolean;
  isLoading: boolean;
  playbackPosition: number;
  playbackDuration: number;
  volume: number;
  isMuted: boolean;
  repeatMode: 'none' | 'track' | 'playlist';
  shuffleMode: boolean;
}

export interface MusicPreferences {
  id: string;
  user_id: string;
  auto_play: boolean;
  volume: number;
  repeat_mode: 'none' | 'track' | 'playlist';
  shuffle_mode: boolean;
  created_at: string;
  updated_at: string;
}