import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import { MusicTrack, MusicPlayerState } from '../types/music';
import { ttsService } from '../services/ttsService';
import { AudioUtils } from '../utils/audioUtils';

interface MusicPlayerProps {
  track: MusicTrack;
  onPlayerStateChange?: (state: MusicPlayerState) => void;
  onTrackEnd?: () => void;
}

export const MusicPlayer: React.FC<MusicPlayerProps> = ({
  track,
  onPlayerStateChange,
  onTrackEnd,
}) => {
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [playbackPosition, setPlaybackPosition] = useState(0);
  const [playbackDuration, setPlaybackDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [originalVolume, setOriginalVolume] = useState(0.8);

  useEffect(() => {
    loadTrack();
    
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [track.id]);

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

  useEffect(() => {
    // Notify parent component of state changes
    if (onPlayerStateChange) {
      onPlayerStateChange({
        currentTrack: track,
        isPlaying,
        isLoading,
        playbackPosition,
        playbackDuration,
        volume,
        isMuted: volume === 0,
        repeatMode: 'none',
        shuffleMode: false,
      });
    }
  }, [isPlaying, isLoading, playbackPosition, playbackDuration, volume]);

  const loadTrack = async () => {
    try {
      setIsLoading(true);
      
      // Stop any existing sound
      if (sound) {
        await sound.unloadAsync();
      }

      // Don't stop TTS - let volume ducking handle it
      // const ttsStatus = ttsService.getStatus();
      // if (ttsStatus.isPlaying) {
      //   await ttsService.stop();
      // }

      // Configure audio session for music playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Load the track
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { 
          shouldPlay: false,
          volume: volume,
          isMuted: volume === 0,
        },
        onPlaybackStatusUpdate
      );

      setSound(newSound);
      
      // Check if TTS is currently playing and duck volume immediately
      const ttsStatus = ttsService.getStatus();
      if (ttsStatus.isPlaying && isPlaying) {
        await newSound.setVolumeAsync(volume * 0.25);
      }
    } catch (error) {
      console.error('Error loading track:', error);
      Alert.alert('Error', 'Failed to load music track');
    } finally {
      setIsLoading(false);
    }
  };

  const onPlaybackStatusUpdate = (status: any) => {
    if (status.isLoaded) {
      setPlaybackPosition(status.positionMillis || 0);
      setPlaybackDuration(status.durationMillis || 0);
      
      if (status.didJustFinish) {
        setIsPlaying(false);
        setPlaybackPosition(0);
        if (onTrackEnd) {
          onTrackEnd();
        }
      }
    }
  };

  const playPause = async () => {
    if (!sound) return;

    try {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        // Don't stop TTS - let volume ducking handle it
        // const ttsStatus = ttsService.getStatus();
        // if (ttsStatus.isPlaying) {
        //   await ttsService.stop();
        // }
        
        await sound.playAsync();
        setIsPlaying(true);
        
        // Check if TTS is currently playing and duck volume immediately
        const ttsStatus = ttsService.getStatus();
        if (ttsStatus.isPlaying) {
          await sound.setVolumeAsync(originalVolume * 0.25);
        }
      }
    } catch (error) {
      console.error('Error playing/pausing track:', error);
      Alert.alert('Error', 'Failed to play/pause track');
    }
  };

  const stop = async () => {
    if (!sound) return;

    try {
      await sound.stopAsync();
      setIsPlaying(false);
      setPlaybackPosition(0);
    } catch (error) {
      console.error('Error stopping track:', error);
      Alert.alert('Error', 'Failed to stop track');
    }
  };

  const seek = async (position: number) => {
    if (!sound) return;

    try {
      await sound.setPositionAsync(position);
      setPlaybackPosition(position);
    } catch (error) {
      console.error('Error seeking track:', error);
    }
  };

  const handleVolumeSliderPress = (position: number) => {
    // Calculate volume based on tap position (0-1)
    const newVolume = Math.max(0, Math.min(1, position));
    changeVolume(newVolume);
  };

  const changeVolume = async (newVolume: number) => {
    if (!sound) return;

    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      await sound.setVolumeAsync(clampedVolume);
      setVolume(clampedVolume);
      setOriginalVolume(clampedVolume); // Update original volume when user changes it
    } catch (error) {
      console.error('Error changing volume:', error);
    }
  };

  const duckVolume = async () => {
    if (!sound) return;
    
    try {
      // Duck volume to 25% of original with smooth transition
      await AudioUtils.duckVolume(sound, originalVolume, { duration: 200 });
    } catch (error) {
      console.error('Error ducking volume:', error);
    }
  };

  const restoreVolume = async () => {
    if (!sound) return;
    
    try {
      // Restore to original volume with smooth transition
      await AudioUtils.restoreVolume(sound, originalVolume, { duration: 200 });
    } catch (error) {
      console.error('Error restoring volume:', error);
    }
  };

  const formatTime = (milliseconds: number): string => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = (): number => {
    if (playbackDuration === 0) return 0;
    return (playbackPosition / playbackDuration) * 100;
  };

  return (
    <View style={styles.container}>
      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {track.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {track.artist}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View 
            style={[
              styles.progressFill,
              { width: `${getProgressPercentage()}%` }
            ]}
          />
        </View>
        <View style={styles.progressTime}>
          <Text style={styles.timeText}>{formatTime(playbackPosition)}</Text>
          <Text style={styles.timeText}>{formatTime(playbackDuration)}</Text>
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        <View style={styles.volumeSliderContainer}>
          <Feather 
            name={volume === 0 ? 'volume-x' : volume < 0.5 ? 'volume-1' : 'volume-2'} 
            size={16} 
            color="#00ccff" 
          />
          <View style={styles.volumeSlider}>
            <TouchableOpacity
              style={styles.volumeSliderTrack}
              onPress={(event) => {
                const { locationX } = event.nativeEvent;
                const sliderWidth = 80; // Approximate slider width
                const position = locationX / sliderWidth;
                handleVolumeSliderPress(position);
              }}
              activeOpacity={1}
            >
              <View 
                style={[
                  styles.volumeSliderFill,
                  { width: `${volume * 100}%` }
                ]}
              />
            </TouchableOpacity>
          </View>
          <Text style={styles.volumeText}>{Math.round(volume * 100)}%</Text>
        </View>

        <TouchableOpacity
          style={[styles.controlButton, styles.playButton]}
          onPress={playPause}
          disabled={isLoading}
        >
          {isLoading ? (
            <Feather name="loader" size={24} color="#ffffff" />
          ) : (
            <Feather
              name={isPlaying ? 'pause' : 'play'}
              size={24}
              color="#ffffff"
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={stop}
          disabled={isLoading}
        >
          <Feather name="square" size={20} color="#ff4757" />
        </TouchableOpacity>
      </View>

      {/* Volume Control */}
      <View style={styles.volumeContainer}>
        <TouchableOpacity
          style={styles.volumeButton}
          onPress={() => changeVolume(Math.max(0, volume - 0.1))}
          disabled={isLoading}
        >
          <Feather name="minus" size={16} color="#00ccff" />
        </TouchableOpacity>
        
        <View style={styles.volumeBar}>
          <View 
            style={[
              styles.volumeFill,
              { width: `${volume * 100}%` }
            ]}
          />
        </View>
        
        <TouchableOpacity
          style={styles.volumeButton}
          onPress={() => changeVolume(Math.min(1, volume + 0.1))}
          disabled={isLoading}
        >
          <Feather name="plus" size={16} color="#00ccff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(0, 204, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.2)',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  trackTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#00ccff',
  },
  progressContainer: {
    marginBottom: 16,
  },
  progressBar: {
    height: 4,
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
    marginTop: 8,
  },
  timeText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 8,
  },
  playButton: {
    backgroundColor: '#00ccff',
    borderRadius: 25,
    width: 50,
    height: 50,
    marginHorizontal: 16,
  },
  volumeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 15,
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  volumeBar: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  volumeFill: {
    height: '100%',
    backgroundColor: '#00ccff',
    borderRadius: 2,
  },
  volumeSliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 8,
  },
  volumeSlider: {
    marginHorizontal: 8,
  },
  volumeSliderTrack: {
    width: 80,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  volumeSliderFill: {
    height: '100%',
    backgroundColor: '#00ccff',
    borderRadius: 2,
  },
  volumeText: {
    fontSize: 10,
    color: '#00ccff',
    minWidth: 28,
    textAlign: 'center',
  },
});

export default MusicPlayer;