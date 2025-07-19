import { Audio } from 'expo-av';
import { AudioUtils } from '../utils/audioUtils';
import { ttsService } from './ttsService';

interface GlobalMusicState {
  sound: Audio.Sound | null;
  isPlaying: boolean;
  isLoading: boolean;
  currentVolume: number;
  originalVolume: number;
  trackUrl: string | null;
  showVolumeSlider: boolean;
}

class GlobalMusicService {
  private state: GlobalMusicState = {
    sound: null,
    isPlaying: false,
    isLoading: false,
    currentVolume: 0.5,
    originalVolume: 0.5,
    trackUrl: null,
    showVolumeSlider: false,
  };

  private listeners: Array<(state: GlobalMusicState) => void> = [];
  private ttsListenerAdded = false;

  constructor() {
    this.setupTtsListener();
  }

  private setupTtsListener() {
    if (this.ttsListenerAdded) return;
    
    const handleTtsStatusChange = (status: any) => {
      if (this.state.sound && this.state.isPlaying) {
        if (status.isPlaying) {
          this.duckVolume();
        } else {
          this.restoreVolume();
        }
      }
    };

    ttsService.addStatusListener(handleTtsStatusChange);
    this.ttsListenerAdded = true;
  }

  async stopCurrentMusic() {
    if (this.state.sound) {
      try {
        await this.state.sound.stopAsync();
        await this.state.sound.unloadAsync();
      } catch (error) {
        // Error stopping current music - silently continue
      }
      
      this.updateState({
        sound: null,
        isPlaying: false,
        isLoading: false,
        trackUrl: null,
      });
    }
  }

  async playTrack(trackUrl: string) {
    try {
      this.updateState({ isLoading: true });

      // Stop any existing sound first
      await this.stopCurrentMusic();

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
        { uri: trackUrl },
        { shouldPlay: true, volume: 0 }, // Start at 0 volume for fade-in
        this.onPlaybackStatusUpdate.bind(this)
      );

      this.updateState({
        sound: newSound,
        isPlaying: true,
        isLoading: false,
        trackUrl,
      });

      // Check if TTS is currently playing and duck volume, otherwise fade in normally
      const ttsStatus = ttsService.getStatus();
      if (ttsStatus.isPlaying) {
        await AudioUtils.fadeIn(newSound, this.state.currentVolume * 0.25, { duration: 500 });
      } else {
        await AudioUtils.fadeIn(newSound, this.state.currentVolume, { duration: 500 });
      }

    } catch (error) {
      this.updateState({ isLoading: false });
      throw error;
    }
  }

  async pauseResume() {
    if (!this.state.sound) return;

    try {
      if (this.state.isPlaying) {
        await this.state.sound.pauseAsync();
        this.updateState({ isPlaying: false });
      } else {
        await this.state.sound.playAsync();
        this.updateState({ isPlaying: true });
      }
    } catch (error) {
      // Error pausing/resuming track - silently continue
    }
  }

  async setVolume(newVolume: number) {
    if (!this.state.sound) return;

    try {
      const clampedVolume = Math.max(0, Math.min(1, newVolume));
      await this.state.sound.setVolumeAsync(clampedVolume);
      this.updateState({
        currentVolume: clampedVolume,
        originalVolume: clampedVolume,
      });
    } catch (error) {
      // Error changing volume - silently continue
    }
  }

  toggleVolumeSlider() {
    this.updateState({ showVolumeSlider: !this.state.showVolumeSlider });
  }

  private async duckVolume() {
    if (!this.state.sound) return;
    
    try {
      await AudioUtils.duckVolume(this.state.sound, this.state.currentVolume, { duration: 200 });
    } catch (error) {
      // Error ducking volume - silently continue
    }
  }

  private async restoreVolume() {
    if (!this.state.sound) return;
    
    try {
      await AudioUtils.restoreVolume(this.state.sound, this.state.currentVolume, { duration: 200 });
    } catch (error) {
      // Error restoring volume - silently continue
    }
  }

  private onPlaybackStatusUpdate(status: any) {
    if (status.didJustFinish) {
      this.updateState({
        isPlaying: false,
        sound: null,
        trackUrl: null,
      });
    }
  }

  private updateState(newState: Partial<GlobalMusicState>) {
    this.state = { ...this.state, ...newState };
    this.notifyListeners();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener({ ...this.state }));
  }

  addListener(listener: (state: GlobalMusicState) => void) {
    this.listeners.push(listener);
  }

  removeListener(listener: (state: GlobalMusicState) => void) {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  getState(): GlobalMusicState {
    return { ...this.state };
  }

  async cleanup() {
    await this.stopCurrentMusic();
    this.listeners = [];
  }
}

// Export singleton instance
export const globalMusicService = new GlobalMusicService();
export type { GlobalMusicState };