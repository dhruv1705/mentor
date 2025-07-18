import { MusicTrack } from '../types/music';

// Music data configuration
// Only contains tracks with actual working URLs
export const MUSIC_TRACKS: Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>[] = [
  {
    title: 'Upbeat Morning Music',
    artist: 'Morning Energy',
    duration: 240000, // 4 minutes estimated
    url: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/sleep/puritysleeppiano.mp3',
    thumbnail: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/morning/upbeat-morning-thumbnail.jpg',
    genre: 'Morning',
    album: 'Morning Energy Collection',
  },
  {
    title: 'Sleep Piano',
    artist: 'Purity Sleep',
    duration: 1800000, // 30 minutes estimated
    url: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/sleep/puritysleeppiano.mp3',
    thumbnail: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/sleep/puritysleeppiano-thumbnail.jpg',
    genre: 'Sleep',
    album: 'Sleep Collection',
  },
  {
    title: 'Ambient Unspoken',
    artist: 'The Ambientalist',
    duration: 480000, // 8 minutes estimated
    //url: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/ambient/ytdl.canehill.info%20-%20The%20Ambientalist%20-%20Unspoken%20(320%20KBps).mp3',
    url: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/sleep/puritysleeppiano.mp3',
    thumbnail: 'https://storage.googleapis.com/lifesparkbucket/lifeguide/ambient/ambient-thumbnail.jpg',
    genre: 'Ambient',
    album: 'Ambient Collection',
  },
];

// Configuration for Google Cloud Storage
export const MUSIC_CONFIG = {
  bucket: 'your-bucket-name',
  basePath: 'music',
  thumbnailPath: 'thumbnails',
  // Helper function to generate full URLs
  getFullUrl: (filename: string) => `https://storage.googleapis.com/${MUSIC_CONFIG.bucket}/${MUSIC_CONFIG.basePath}/${filename}`,
  getThumbnailUrl: (filename: string) => `https://storage.googleapis.com/${MUSIC_CONFIG.bucket}/${MUSIC_CONFIG.thumbnailPath}/${filename}`,
};

// Default playlists
export const DEFAULT_PLAYLISTS = [
  {
    name: 'Morning Energy',
    description: 'Upbeat music to start your day right',
    trackTitles: ['Upbeat Morning Music'],
  },
  {
    name: 'Sleep & Rest',
    description: 'Peaceful music for better sleep and rest',
    trackTitles: ['Sleep Piano'],
  },
];

// Helper function to get tracks by playlist
export const getTracksByPlaylist = (playlistName: string): Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>[] => {
  const playlist = DEFAULT_PLAYLISTS.find(p => p.name === playlistName);
  if (!playlist) return [];
  
  return MUSIC_TRACKS.filter(track => playlist.trackTitles.includes(track.title));
};

// Helper function to get tracks by genre
export const getTracksByGenre = (genre: string): Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>[] => {
  return MUSIC_TRACKS.filter(track => track.genre === genre);
};

// Helper function to get tracks by artist
export const getTracksByArtist = (artist: string): Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>[] => {
  return MUSIC_TRACKS.filter(track => track.artist === artist);
};

// Helper function to get tracks by time of day
export const getTracksByTimeOfDay = (timeCategory: 'morning' | 'evening'): Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'>[] => {
  if (timeCategory === 'morning') {
    return MUSIC_TRACKS.filter(track => track.genre === 'Morning');
  } else {
    return MUSIC_TRACKS.filter(track => track.genre === 'Sleep');
  }
};

// Helper function to get recommended track for current time
export const getRecommendedTrackForTime = (timeCategory: 'morning' | 'evening'): Omit<MusicTrack, 'id' | 'created_at' | 'updated_at'> | null => {
  const tracks = getTracksByTimeOfDay(timeCategory);
  return tracks.length > 0 ? tracks[0] : null;
};