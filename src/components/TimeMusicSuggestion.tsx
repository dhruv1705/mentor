import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { TimeMusicService, TimeMusicSuggestion as TimeMusicSuggestionType } from '../services/timeMusicService';
import { MUSIC_TRACKS } from '../data/musicData';
import { settingsService } from '../services/settingsService';
import { globalMusicService, GlobalMusicState } from '../services/globalMusicService';

interface TimeMusicSuggestionProps {
  onMusicPlay?: (track: any) => void;
}

export const TimeMusicSuggestion: React.FC<TimeMusicSuggestionProps> = ({ onMusicPlay }) => {
  const [suggestion, setSuggestion] = useState<TimeMusicSuggestionType | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
  const [musicState, setMusicState] = useState<GlobalMusicState>(globalMusicService.getState());

  useEffect(() => {
    loadTimeMusicSuggestion();
    
    // Load auto-play setting
    const settings = settingsService.getSettings();
    setAutoPlayEnabled(settings.musicAutoPlay);
    
    // Listen for global music state changes
    const handleMusicStateChange = (state: GlobalMusicState) => {
      setMusicState(state);
    };
    
    globalMusicService.addListener(handleMusicStateChange);
    
    return () => {
      globalMusicService.removeListener(handleMusicStateChange);
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
    if (!loading && autoPlayEnabled && suggestion && !musicState.sound) {
      const timer = setTimeout(() => {
        handleAutoPlay();
      }, 2500); // 2.5 second delay
      
      return () => clearTimeout(timer);
    }
  }, [loading, suggestion, autoPlayEnabled, musicState.sound]);

  const loadTimeMusicSuggestion = async () => {
    try {
      setLoading(true);
      const timeSuggestion = await TimeMusicService.getCurrentTimeMusicSuggestion();
      setSuggestion(timeSuggestion);
    } catch (error) {
      // Error loading suggestion - use fallback
    } finally {
      setLoading(false);
    }
  };

  const getFallbackTrack = () => {
    return MUSIC_TRACKS.find(track => track.genre === 'Ambient');
  };

  const handleAutoPlay = async () => {
    if (!autoPlayEnabled) return;
    
    try {
      let trackUrl;
      
      if (suggestion?.recommendedTrack) {
        trackUrl = suggestion.recommendedTrack.url;
      } else {
        // Use fallback ambient track from musicData
        const fallbackTrack = getFallbackTrack();
        trackUrl = fallbackTrack?.url || '';
      }

      if (trackUrl) {
        await globalMusicService.playTrack(trackUrl);
      }
    } catch (error) {
      // Error in auto-play - continue silently
    }
  };

  const handlePlaySuggestion = async () => {
    if (!suggestion?.recommendedTrack) return;
    
    try {
      await globalMusicService.playTrack(suggestion.recommendedTrack.url);
    } catch (error) {
      Alert.alert('Error', 'Failed to play music track');
    }
  };

  const adjustVolume = (delta: number) => {
    const newVolume = Math.max(0, Math.min(1, musicState.currentVolume + delta));
    globalMusicService.setVolume(newVolume);
  };

  const toggleVolumeSlider = () => {
    globalMusicService.toggleVolumeSlider();
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
      {musicState.sound ? (
        <View style={styles.musicControlsContainer}>
          <TouchableOpacity
            style={styles.volumeIconButton}
            onPress={toggleVolumeSlider}
            activeOpacity={0.7}
          >
            <Feather 
              name={musicState.currentVolume === 0 ? 'volume-x' : musicState.currentVolume < 0.5 ? 'volume-1' : 'volume-2'} 
              size={18} 
              color={musicState.isPlaying ? "#00ccff" : "#888888"} 
            />
          </TouchableOpacity>
          
          <View style={[
            styles.volumeSliderContainer,
            { opacity: musicState.showVolumeSlider ? 1 : 0 }
          ]}>
            <View style={styles.volumeControlsRow}>
              <TouchableOpacity
                style={styles.volumeMinusButton}
                onPress={() => adjustVolume(-0.1)}
                activeOpacity={0.7}
                disabled={!musicState.showVolumeSlider}
              >
                <Feather name="minus" size={16} color="#00ccff" />
              </TouchableOpacity>
              
              <Text style={styles.volumeText}>{Math.round(musicState.currentVolume * 100)}%</Text>
              
              <TouchableOpacity
                style={styles.volumePlusButton}
                onPress={() => adjustVolume(0.1)}
                activeOpacity={0.7}
                disabled={!musicState.showVolumeSlider}
              >
                <Feather name="plus" size={16} color="#00ccff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.playButton, musicState.isLoading && styles.playButtonDisabled]}
          onPress={handlePlaySuggestion}
          activeOpacity={0.7}
          disabled={musicState.isLoading}
        >
          {musicState.isLoading ? (
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
  musicControlsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeIconButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 25,
    width: 50,
    height: 50,
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.3)',
  },
  volumeSliderContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.4)',
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    maxWidth: 280,
    alignSelf: 'center',
    minHeight: 50,
    justifyContent: 'center',
    position: 'absolute',
    top: 50,
    left: -115,
  },
  volumeControlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: 30, // Consistent row height
  },
  volumeMinusButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumePlusButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeText: {
    fontSize: 12,
    color: '#00ccff',
    minWidth: 40,
    textAlign: 'center',
    fontWeight: '600',
  },
});

export default TimeMusicSuggestion;