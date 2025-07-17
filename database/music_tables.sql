-- Music Tables for Supabase Database
-- Run these commands in your Supabase SQL editor

-- Create music_tracks table
CREATE TABLE IF NOT EXISTS music_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    duration INTEGER, -- in milliseconds
    url TEXT NOT NULL UNIQUE, -- Google Cloud Storage URL
    thumbnail TEXT, -- Optional thumbnail URL
    genre TEXT,
    album TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create music_playlists table
CREATE TABLE IF NOT EXISTS music_playlists (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create junction table for playlist tracks
CREATE TABLE IF NOT EXISTS playlist_tracks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    playlist_id UUID NOT NULL REFERENCES music_playlists(id) ON DELETE CASCADE,
    track_id UUID NOT NULL REFERENCES music_tracks(id) ON DELETE CASCADE,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(playlist_id, track_id)
);

-- Create music_preferences table for user settings
CREATE TABLE IF NOT EXISTS music_preferences (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    auto_play BOOLEAN DEFAULT TRUE,
    volume INTEGER DEFAULT 80 CHECK (volume >= 0 AND volume <= 100),
    repeat_mode TEXT DEFAULT 'none' CHECK (repeat_mode IN ('none', 'track', 'playlist')),
    shuffle_mode BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_music_tracks_artist ON music_tracks(artist);
CREATE INDEX IF NOT EXISTS idx_music_tracks_genre ON music_tracks(genre);
CREATE INDEX IF NOT EXISTS idx_music_tracks_created_at ON music_tracks(created_at);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_playlist_id ON playlist_tracks(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_tracks_track_id ON playlist_tracks(track_id);
CREATE INDEX IF NOT EXISTS idx_music_preferences_user_id ON music_preferences(user_id);

-- Create triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_music_tracks_updated_at 
    BEFORE UPDATE ON music_tracks 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_playlists_updated_at 
    BEFORE UPDATE ON music_playlists 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_music_preferences_updated_at 
    BEFORE UPDATE ON music_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Sample data is now managed from the app code in src/data/musicData.ts
-- This ensures URLs can be updated from a single location in the codebase

-- Create default playlist
INSERT INTO music_playlists (name, description) VALUES
    ('Relaxation Mix', 'Perfect for unwinding and stress relief'),
    ('Focus & Study', 'Music to enhance concentration and productivity')
ON CONFLICT DO NOTHING;

-- Row Level Security (RLS) Policies

-- Enable RLS
ALTER TABLE music_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE music_preferences ENABLE ROW LEVEL SECURITY;

-- Public read access for music tracks and playlists (everyone can view)
CREATE POLICY "Public music tracks read access" ON music_tracks
    FOR SELECT USING (true);

CREATE POLICY "Public music playlists read access" ON music_playlists
    FOR SELECT USING (true);

CREATE POLICY "Public playlist tracks read access" ON playlist_tracks
    FOR SELECT USING (true);

-- User-specific music preferences
CREATE POLICY "Users can view own music preferences" ON music_preferences
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own music preferences" ON music_preferences
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own music preferences" ON music_preferences
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own music preferences" ON music_preferences
    FOR DELETE USING (auth.uid() = user_id);

-- Optional: Admin policies for managing music content
-- These would be used if you want to allow certain users to manage music tracks
-- CREATE POLICY "Admin can manage music tracks" ON music_tracks
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- CREATE POLICY "Admin can manage music playlists" ON music_playlists
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');

-- CREATE POLICY "Admin can manage playlist tracks" ON playlist_tracks
--     FOR ALL USING (auth.jwt() ->> 'role' = 'admin');