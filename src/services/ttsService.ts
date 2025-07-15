import * as Speech from 'expo-speech';

export interface TTSSettings {
  rate: number;
  pitch: number;
  language: string;
  voice?: string;
  autoPlay: boolean;
}

export interface TTSStatus {
  isPlaying: boolean;
  currentText: string | null;
}

export class TTSService {
  private settings: TTSSettings = {
    rate: 0.8,
    pitch: 1.0,
    language: 'en-US',
    voice: undefined,
    autoPlay: false,
  };

  private status: TTSStatus = {
    isPlaying: false,
    currentText: null,
  };

  private statusListeners: Array<(status: TTSStatus) => void> = [];

  async speak(text: string): Promise<void> {
    if (!text.trim()) return;

    try {
      // Stop any current speech
      await this.stop();

      // Update status
      this.status = {
        isPlaying: true,
        currentText: text,
      };
      this.notifyStatusListeners();

      // Start speaking using VoiceAssistantOrb's proven approach
      await Speech.speak(text, {
        rate: this.settings.rate,
        pitch: this.settings.pitch,
        language: this.settings.language,
        voice: this.settings.voice,
        onStart: () => {
          console.log('TTS started');
        },
        onDone: () => {
          console.log('TTS finished');
          this.status = {
            isPlaying: false,
            currentText: null,
          };
          this.notifyStatusListeners();
        },
        onStopped: () => {
          console.log('TTS stopped');
          this.status = {
            isPlaying: false,
            currentText: null,
          };
          this.notifyStatusListeners();
        },
        onError: (error) => {
          console.error('TTS error:', error);
          this.status = {
            isPlaying: false,
            currentText: null,
          };
          this.notifyStatusListeners();
        },
      });
    } catch (error) {
      console.error('TTS speak error:', error);
      this.status = {
        isPlaying: false,
        currentText: null,
      };
      this.notifyStatusListeners();
      throw error;
    }
  }

  async stop(): Promise<void> {
    try {
      await Speech.stop();
      this.status = {
        isPlaying: false,
        currentText: null,
      };
      this.notifyStatusListeners();
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  }

  getStatus(): TTSStatus {
    return { ...this.status };
  }

  getSettings(): TTSSettings {
    return { ...this.settings };
  }

  updateSettings(newSettings: Partial<TTSSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  addStatusListener(listener: (status: TTSStatus) => void): void {
    this.statusListeners.push(listener);
  }

  removeStatusListener(listener: (status: TTSStatus) => void): void {
    const index = this.statusListeners.indexOf(listener);
    if (index > -1) {
      this.statusListeners.splice(index, 1);
    }
  }

  private notifyStatusListeners(): void {
    this.statusListeners.forEach(listener => listener(this.status));
  }

  // Additional VoiceAssistantOrb methods for enhanced functionality
  async getAvailableVoices(): Promise<Speech.Voice[]> {
    try {
      const voices = await Speech.getAvailableVoicesAsync();
      return voices;
    } catch (error) {
      console.error('Error getting available voices:', error);
      return [];
    }
  }

  async getEnglishVoices(): Promise<Speech.Voice[]> {
    const allVoices = await this.getAvailableVoices();
    // Filter for English voices with comprehensive criteria (from VoiceAssistantOrb)
    return allVoices.filter(voice => {
      if (!voice.language) return false;
      
      const lang = voice.language.toLowerCase();
      const name = (voice.name || '').toLowerCase();
      
      return (
        lang.startsWith('en') ||
        lang.includes('en-') ||
        lang.includes('english') ||
        lang === 'en' ||
        lang.startsWith('en_') ||
        name.includes('english') ||
        // Common English language codes
        lang.includes('en-us') ||
        lang.includes('en-gb') ||
        lang.includes('en-au') ||
        lang.includes('en-ca') ||
        lang.includes('en-in') ||
        lang.includes('en-ie') ||
        lang.includes('en-za') ||
        lang.includes('en-nz')
      );
    });
  }

  changeVoice(voiceIdentifier: string): void {
    this.updateSettings({ voice: voiceIdentifier });
  }

  resetToDefaultVoice(): void {
    this.updateSettings({ voice: undefined });
  }

  changeRate(rate: number): void {
    this.updateSettings({ rate });
  }

  changePitch(pitch: number): void {
    this.updateSettings({ pitch });
  }

  async getVoiceInfo(): Promise<{
    current: TTSSettings;
    englishVoices: Speech.Voice[];
    allVoices: Speech.Voice[];
    totalVoices: number;
  }> {
    const voices = await this.getAvailableVoices();
    const englishVoices = await this.getEnglishVoices();
    
    return {
      current: this.settings,
      englishVoices,
      allVoices: voices,
      totalVoices: voices.length
    };
  }
}

// Export a singleton instance
export const ttsService = new TTSService();