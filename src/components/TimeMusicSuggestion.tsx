import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { TimeMusicService, TimeMusicSuggestion as TimeMusicSuggestionType } from '../services/timeMusicService';
import { ttsService } from '../services/ttsService';
import { MUSIC_TRACKS } from '../data/musicData';
import { AudioUtils } from '../utils/audioUtils';
import { settingsService } from '../services/settingsService';

interface TimeMusicSuggestionProps {
  onMusicPlay?: (track: any) => void;
}

export const TimeMusicSuggestion: React.FC<TimeMusicSuggestionProps> = ({ onMusicPlay }) => {
  const [suggestion, setSuggestion] = useState<TimeMusicSuggestionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playbackStatus, setPlaybackStatus] = useState<any>(null);
  const [originalVolume, setOriginalVolume] = useState(1.0);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);

  useEffect(() => {
    loadTimeMusicSuggestion();
    
    // Load auto-play setting
    const settings = settingsService.getSettings();
    setAutoPlayEnabled(settings.musicAutoPlay);
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

  // Listen for settings changes
  useEffect(() => {
    const handleSettingsChange = (settings: any) => {
      setAutoPlayEnabled(settings.musicAutoPlay);
    };
    
    settingsService.addListener(handleSettingsChange);
    return () => settingsService.removeListener(handleSettingsChange);
  }, []);

  // Auto-play music after loading suggestion
  useEffect(() => {
    if (!loading && autoPlayEnabled && suggestion) {
      const timer = setTimeout(() => {
        handleAutoPlay();
      }, 2500); // 2.5 second delay
      
      return () => clearTimeout(timer);
    }
  }, [loading, suggestion, autoPlayEnabled]);

  // Listen for TTS status changes for volume ducking
  useEffect(() => {
    const handleTtsStatusChange = (status: any) => {
      if (sound && isPlaying) {
        if (status.isPlaying) {
          // Duck volume when TTS starts
          duckVolume();
        } else {
          // Restore volume when TTS stops
          restoreVolume();
        }
      }
    };

    ttsService.addStatusListener(handleTtsStatusChange);
    return () => ttsService.removeStatusListener(handleTtsStatusChange);
  }, [sound, isPlaying]);

  const loadTimeMusicSuggestion = async () => {
    try {
      setLoading(true);
      const timeSuggestion = await TimeMusicService.getCurrentTimeMusicSuggestion();
      setSuggestion(timeSuggestion);
    } catch (error) {
      console.error('Error loading time music suggestion:', error);
    } finally {
      setLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    setPlaybackStatus(status);
    if (status.didJustFinish) {
      setIsPlaying(false);
      setSound(null);
    }
  };

  const getFallbackTrack = () => {
    return MUSIC_TRACKS.find(track => track.genre === 'Ambient');
  };

  const handleAutoPlay = async () => {
    if (!autoPlayEnabled) return;
    
    try {
      let trackToPlay;
      
      if (suggestion?.recommendedTrack) {
        trackToPlay = { uri: suggestion.recommendedTrack.url };
      } else {
        // Use fallback ambient track from musicData
        const fallbackTrack = getFallbackTrack();
        trackToPlay = { uri: fallbackTrack?.url || '' };
      }

      await playTrack(trackToPlay);
    } catch (error) {
      console.error('Error in auto-play:', error);
    }
  };

  const handlePlaySuggestion = async () => {
    if (!suggestion?.recommendedTrack) return;
    await playTrack({ uri: suggestion.recommendedTrack.url });
  };

  const playTrack = async (trackSource: any) => {
    try {
      setIsLoading(true);

      // Stop any existing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Don't stop TTS anymore - let volume ducking handle it
      // const ttsStatus = ttsService.getStatus();
      // if (ttsStatus.isPlaying) {
      //   await ttsService.stop();
      // }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load and play the track with fade-in
      const { sound: newSound } = await Audio.Sound.createAsync(
        trackSource,
        { shouldPlay: true, volume: 0 }, // Start at 0 volume for fade-in
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);

      // Check if TTS is currently playing and duck volume, otherwise fade in normally
      const ttsStatus = ttsService.getStatus();
      if (ttsStatus.isPlaying) {
        await AudioUtils.fadeIn(newSound, originalVolume * 0.25, { duration: 500 });
      } else {
        await AudioUtils.fadeIn(newSound, originalVolume, { duration: 500 });
      }

    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Error', 'Failed to play music track');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePauseResume = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error pausing/resuming track:', error);
    }
  };

  const handleStop = async () => {
    if (!sound) return;

    try {
      await sound.stopAsync();
      await sound.unloadAsync();
      setSound(null);
      setIsPlaying(false);
      setPlaybackStatus(null);
    } catch (error) {
      console.error('Error stopping track:', error);
    }
  };

  const duckVolume = async () => {
    if (!sound) return;
    
    try {
      // Smooth volume transition to 25%
      await AudioUtils.duckVolume(sound, originalVolume, { duration: 200 });
    } catch (error) {
      console.error('Error ducking volume:', error);
    }
  };

  const restoreVolume = async () => {
    if (!sound) return;
    
    try {
      // Smooth volume transition back to original
      await AudioUtils.restoreVolume(sound, originalVolume, { duration: 200 });
    } catch (error) {
      console.error('Error restoring volume:', error);
    }
  };



  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Feather name="music" size={24} color="#00ccff" />
        <Text style={styles.loadingText}>Loading music suggestion...</Text>
      </View>
    );
  }

  if (!suggestion || !suggestion.recommendedTrack) {
    return null;
  }

  return (
    <View style={styles.actions}>
      {sound ? (
        <TouchableOpacity
          style={styles.playButton}
          onPress={handlePauseResume}
          activeOpacity={0.7}
        >
          <Feather name="music" size={20} color={isPlaying ? "#00ccff" : "#888888"} />
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[styles.playButton, isLoading && styles.playButtonDisabled]}
          onPress={handlePlaySuggestion}
          activeOpacity={0.7}
          disabled={isLoading}
        >
          {isLoading ? (
            <Feather name="loader" size={20} color="#ffffff" />
          ) : (
            <Feather name="music" size={20} color="#00ccff" />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    marginLeft: 8,
  },
  actions: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.3)',
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
});

export default TimeMusicSuggestion;