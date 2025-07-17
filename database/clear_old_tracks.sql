-- Clear old placeholder tracks and keep only real ones
-- Run this to clean up the database

-- Delete all tracks except the Sleep Piano track
DELETE FROM music_tracks 
WHERE url NOT LIKE '%lifesparkbucket%';

-- Verify what's left
SELECT title, artist, url FROM music_tracks;