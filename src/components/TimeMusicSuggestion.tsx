import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { TimeMusicService, TimeMusicSuggestion as TimeMusicSuggestionType } from '../services/timeMusicService';
import { useNavigation } from '@react-navigation/native';
import { ttsService } from '../services/ttsService';

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
  const navigation = useNavigation();

  useEffect(() => {
    loadTimeMusicSuggestion();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, []);

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

  const handlePlaySuggestion = async () => {
    if (!suggestion?.recommendedTrack) return;

    try {
      setIsLoading(true);

      // Stop any existing sound
      if (sound) {
        await sound.unloadAsync();
        setSound(null);
      }

      // Stop TTS if it's playing
      const ttsStatus = ttsService.getStatus();
      if (ttsStatus.isPlaying) {
        await ttsService.stop();
      }

      // Configure audio session
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load and play the track
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: suggestion.recommendedTrack.url },
        { shouldPlay: true },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      setIsPlaying(true);
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

  const handleViewAllMusic = () => {
    navigation.navigate('Music' as never);
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Feather name="music" size={24} color="#00ccff" />
          <Text style={styles.loadingText}>Loading music suggestion...</Text>
        </View>
      </View>
    );
  }

  if (!suggestion || !suggestion.recommendedTrack) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Feather name="music" size={20} color="#00ccff" />
        <Text style={styles.headerText}>Music for You</Text>
      </View>
      
      <View style={styles.suggestionCard}>
        <View style={styles.timeInfo}>
          <Text style={styles.timeText}>{suggestion.description}</Text>
          <Text style={styles.categoryText}>
            {suggestion.category === 'morning' ? '🌅 Morning Energy' : '🌙 Evening Relaxation'}
          </Text>
        </View>
        
        <View style={styles.trackInfo}>
          <Text style={styles.trackTitle} numberOfLines={1}>
            {suggestion.recommendedTrack.title}
          </Text>
          <Text style={styles.trackArtist} numberOfLines={1}>
            by {suggestion.recommendedTrack.artist}
          </Text>
        </View>
        
        {/* Progress Bar */}
        {playbackStatus && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  {
                    width: playbackStatus.durationMillis 
                      ? `${(playbackStatus.positionMillis / playbackStatus.durationMillis) * 100}%`
                      : '0%'
                  }
                ]}
              />
            </View>
            <View style={styles.progressTime}>
              <Text style={styles.timeText}>
                {formatTime(playbackStatus.positionMillis || 0)}
              </Text>
              <Text style={styles.timeText}>
                {formatTime(playbackStatus.durationMillis || 0)}
              </Text>
            </View>
          </View>
        )}
        
        <View style={styles.actions}>
          {sound && isPlaying ? (
            <View style={styles.playingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePauseResume}
                activeOpacity={0.7}
              >
                <Feather name="pause" size={18} color="#00ccff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleStop}
                activeOpacity={0.7}
              >
                <Feather name="square" size={18} color="#ff4757" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAllMusic}
                activeOpacity={0.7}
              >
                <Feather name="list" size={16} color="#00ccff" />
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
          ) : sound && !isPlaying ? (
            <View style={styles.playingControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handlePauseResume}
                activeOpacity={0.7}
              >
                <Feather name="play" size={18} color="#00ccff" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.controlButton}
                onPress={handleStop}
                activeOpacity={0.7}
              >
                <Feather name="square" size={18} color="#ff4757" />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAllMusic}
                activeOpacity={0.7}
              >
                <Feather name="list" size={16} color="#00ccff" />
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.playButton, isLoading && styles.playButtonDisabled]}
                onPress={handlePlaySuggestion}
                activeOpacity={0.7}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Feather name="loader" size={18} color="#ffffff" />
                ) : (
                  <Feather name="play" size={18} color="#ffffff" />
                )}
                <Text style={styles.playButtonText}>
                  {isLoading ? 'Loading...' : 'Play Now'}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={handleViewAllMusic}
                activeOpacity={0.7}
              >
                <Feather name="list" size={16} color="#00ccff" />
                <Text style={styles.viewAllButtonText}>View All</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 204, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.2)',
    width: '100%',
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  headerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 8,
  },
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
  suggestionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 16,
    width: '100%',
  },
  timeInfo: {
    marginBottom: 12,
  },
  timeText: {
    fontSize: 14,
    color: '#ffffff',
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 12,
    color: '#00ccff',
    fontWeight: '600',
  },
  trackInfo: {
    marginBottom: 12,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  trackArtist: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#00ccff',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
  },
  playButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginLeft: 6,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.3)',
    minHeight: 44,
    justifyContent: 'center',
  },
  viewAllButtonText: {
    fontSize: 12,
    color: '#00ccff',
    marginLeft: 4,
  },
  progressContainer: {
    marginBottom: 12,
  },
  progressBar: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ccff',
    borderRadius: 2,
  },
  progressTime: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  timeText: {
    fontSize: 10,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  playingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    justifyContent: 'space-between',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 22,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.3)',
  },
  playButtonDisabled: {
    opacity: 0.6,
  },
});

export default TimeMusicSuggestion;