import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Alert, ActivityIndicator, FlatList } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Audio } from 'expo-av';
import ProfileIcon from '../components/ProfileIcon';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { MusicService } from '../services/musicService';
import { MusicTrack } from '../types/music';
import { MusicPlayer } from '../components/MusicPlayer';

export default function MusicScreen() {
  const [musicTracks, setMusicTracks] = useState<MusicTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTrack, setCurrentTrack] = useState<MusicTrack | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    initializeMusicData();
  }, []);

  const initializeMusicData = async () => {
    try {
      // Initialize music data if needed
      await MusicService.initializeMusicData();
      // Also refresh to add any new tracks
      await MusicService.refreshMusicData();
      // Then load tracks
      await loadMusicTracks();
    } catch (error) {
      console.error('Error initializing music data:', error);
      setLoading(false);
    }
  };

  const loadMusicTracks = async () => {
    try {
      setLoading(true);
      const tracks = await MusicService.getAllTracks();
      setMusicTracks(tracks);
    } catch (error) {
      console.error('Error loading music tracks:', error);
      Alert.alert('Error', 'Failed to load music tracks');
    } finally {
      setLoading(false);
    }
  };

  const playTrack = async (track: MusicTrack) => {
    try {
      setCurrentTrack(track);
      setIsPlaying(true);
    } catch (error) {
      console.error('Error playing track:', error);
      Alert.alert('Error', 'Failed to play track');
    }
  };

  const formatDuration = (milliseconds: number | undefined): string => {
    if (!milliseconds) return '0:00';
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const renderTrackItem = ({ item }: { item: MusicTrack }) => (
    <View style={styles.trackItem}>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle}>{item.title}</Text>
        <Text style={styles.trackArtist}>{item.artist}</Text>
        <Text style={styles.trackDuration}>{formatDuration(item.duration)}</Text>
      </View>
      <View style={styles.trackControls}>
        {currentTrack?.id === item.id ? (
          <TouchableOpacity 
            style={[styles.controlButton, styles.activeButton]} 
            onPress={() => setCurrentTrack(null)}
          >
            <Feather name="stop-circle" size={20} color="#ff4757" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.controlButton} onPress={() => playTrack(item)}>
            <Feather name="play" size={20} color="#00ccff" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderNowPlaying = () => {
    if (!currentTrack) return null;

    return (
      <CollapsibleSection title="Now Playing" defaultExpanded={true} icon="🎵">
        <MusicPlayer
          track={currentTrack}
          onPlayerStateChange={(state) => {
            setIsPlaying(state.isPlaying);
          }}
          onTrackEnd={() => {
            setCurrentTrack(null);
            setIsPlaying(false);
          }}
        />
      </CollapsibleSection>
    );
  };

  return (
    <View style={styles.container}>
      <ProfileIcon />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>🎵 Music Library</Text>
          <Text style={styles.headerSubtitle}>
            {musicTracks.length} track{musicTracks.length !== 1 ? 's' : ''} available
          </Text>
        </View>

        {/* Now Playing Section */}
        {renderNowPlaying()}

        {/* Music Library Section */}
        <CollapsibleSection title="Music Library" defaultExpanded={true} icon="🎶">
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#00ccff" />
              <Text style={styles.loadingText}>Loading music tracks...</Text>
            </View>
          ) : musicTracks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Feather name="music" size={48} color="rgba(255, 255, 255, 0.3)" />
              <Text style={styles.emptyText}>No music tracks available</Text>
              <Text style={styles.emptySubtext}>Music tracks will appear here when added</Text>
            </View>
          ) : (
            <FlatList
              data={musicTracks}
              renderItem={renderTrackItem}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
            />
          )}
        </CollapsibleSection>

        {/* Music Controls Info */}
        <CollapsibleSection title="Music Controls" defaultExpanded={false} icon="ℹ️">
          <View style={styles.infoContainer}>
            <View style={styles.infoItem}>
              <Feather name="play" size={20} color="#00ccff" style={styles.infoIcon} />
              <Text style={styles.infoText}>Play/Resume Track</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="pause" size={20} color="#00ccff" style={styles.infoIcon} />
              <Text style={styles.infoText}>Pause Track</Text>
            </View>
            <View style={styles.infoItem}>
              <Feather name="square" size={20} color="#ff4757" style={styles.infoIcon} />
              <Text style={styles.infoText}>Stop Track</Text>
            </View>
          </View>
        </CollapsibleSection>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
    paddingTop: 100,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  loadingContainer: {
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 10,
  },
  emptyContainer: {
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 18,
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 15,
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.5)',
    textAlign: 'center',
  },
  trackItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  trackInfo: {
    flex: 1,
  },
  trackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  trackArtist: {
    fontSize: 14,
    color: '#00ccff',
    marginBottom: 2,
  },
  trackDuration: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  trackControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  controlButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  activeButton: {
    backgroundColor: 'rgba(255, 71, 87, 0.2)',
    borderWidth: 1,
    borderColor: '#ff4757',
  },
  infoContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoIcon: {
    marginRight: 12,
  },
  infoText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
});