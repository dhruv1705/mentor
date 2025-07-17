import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { TimeMusicService, TimeMusicSuggestion as TimeMusicSuggestionType } from '../services/timeMusicService';
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