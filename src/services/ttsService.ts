import * as Speech from 'expo-speech';
import Constants from 'expo-constants';
import { Audio } from 'expo-av';

export type TTSProvider = 'system' | 'elevenlabs';

export interface TTSSettings {
  provider: TTSProvider;
  rate: number;
  pitch: number;
  language: string;
  voice?: string;
  autoPlay: boolean;
  elevenLabsVoiceId?: string;
}

export interface TTSStatus {
  isPlaying: boolean;
  currentText: string | null;
  currentSentence: string | null;
  sentenceIndex: number;
  totalSentences: number;
}

export class TTSService {
  private settings: TTSSettings = {
    provider: 'system',
    rate: 1.0,
    pitch: 1.0,
    language: 'en-US',
    voice: undefined,
    autoPlay: true,
    elevenLabsVoiceId: undefined,
  };

  private elevenLabsApiKey: string | null = null;
  private currentElevenLabsSound: Audio.Sound | null = null;

  // Convert ArrayBuffer to base64 using chunked approach to avoid stack overflow
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    const chunkSize = 8192; // Process in smaller chunks to avoid call stack limits
    let binary = '';
    
    for (let i = 0; i < bytes.length; i += chunkSize) {
      const chunk = bytes.slice(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    
    return btoa(binary);
  }

  private status: TTSStatus = {
    isPlaying: false,
    currentText: null,
    currentSentence: null,
    sentenceIndex: 0,
    totalSentences: 0,
  };

  private statusListeners: Array<(status: TTSStatus) => void> = [];
  private sentenceProgressListeners: Array<(sentence: string, index: number, total: number) => void> = [];
  private currentSentences: string[] = [];
  private currentSentenceTimeouts: NodeJS.Timeout[] = [];

  // Parse text into sentences
  private parseSentences(text: string): string[] {
    return text.split(/(?<=[.!?])\s+/)
      .filter(sentence => sentence.trim().length > 0)
      .map(sentence => sentence.trim());
  }

  // Clear sentence timeouts
  private clearSentenceTimeouts(): void {
    this.currentSentenceTimeouts.forEach(timeout => clearTimeout(timeout));
    this.currentSentenceTimeouts = [];
  }

  // Start sentence progress tracking
  private startSentenceProgress(sentences: string[]): void {
    this.clearSentenceTimeouts();
    this.currentSentences = sentences;
    
    // Estimate timing for each sentence based on word count
    const avgWordsPerMinute = 150; // Average reading speed
    const avgWordsPerSecond = avgWordsPerMinute / 60;
    
    let cumulativeDelay = 0;
    
    sentences.forEach((sentence, index) => {
      const wordCount = sentence.split(/\s+/).length;
      const estimatedDuration = (wordCount / avgWordsPerSecond) * 1000; // Convert to ms
      
      const timeout = setTimeout(() => {
        this.status = {
          ...this.status,
          currentSentence: sentence,
          sentenceIndex: index,
          totalSentences: sentences.length,
        };
        this.notifyStatusListeners();
        this.notifySentenceProgressListeners(sentence, index, sentences.length);
      }, cumulativeDelay);
      
      this.currentSentenceTimeouts.push(timeout);
      cumulativeDelay += estimatedDuration;
    });
  }

  async speak(text: string): Promise<void> {
    if (!text.trim()) return;

    try {
      // Stop any current speech
      await this.stop();

      // Parse sentences for progress tracking
      const sentences = this.parseSentences(text);
      
      // Update status
      this.status = {
        isPlaying: true,
        currentText: text,
        currentSentence: sentences[0] || null,
        sentenceIndex: 0,
        totalSentences: sentences.length,
      };
      this.notifyStatusListeners();
      
      // Start sentence progress tracking
      this.startSentenceProgress(sentences);

      if (this.settings.provider === 'elevenlabs') {
        await this.speakWithElevenLabs(text);
      } else {
        await this.speakWithSystem(text);
      }
    } catch (error) {
      console.error('TTS speak error:', error);
      this.clearSentenceTimeouts();
      this.status = {
        isPlaying: false,
        currentText: null,
        currentSentence: null,
        sentenceIndex: 0,
        totalSentences: 0,
      };
      this.notifyStatusListeners();
      // Fallback to system TTS on ElevenLabs error
      if (this.settings.provider === 'elevenlabs') {
        // Falling back to system TTS
        try {
          await this.speakWithSystem(text);
        } catch (fallbackError) {
          // Fallback error handled
          throw fallbackError;
        }
      } else {
        throw error;
      }
    }
  }

  private async speakWithSystem(text: string): Promise<void> {
    await Speech.speak(text, {
      rate: this.settings.rate,
      pitch: this.settings.pitch,
      language: this.settings.language,
      voice: this.settings.voice,
      onStart: () => {
        // TTS started
      },
      onDone: () => {
        this.clearSentenceTimeouts();
        this.status = {
          isPlaying: false,
          currentText: null,
          currentSentence: null,
          sentenceIndex: 0,
          totalSentences: 0,
        };
        this.notifyStatusListeners();
      },
      onStopped: () => {
        this.clearSentenceTimeouts();
        this.status = {
          isPlaying: false,
          currentText: null,
          currentSentence: null,
          sentenceIndex: 0,
          totalSentences: 0,
        };
        this.notifyStatusListeners();
      },
      onError: (error) => {
        this.clearSentenceTimeouts();
        this.status = {
          isPlaying: false,
          currentText: null,
          currentSentence: null,
          sentenceIndex: 0,
          totalSentences: 0,
        };
        this.notifyStatusListeners();
      },
    });
  }

  private async speakWithElevenLabs(text: string): Promise<void> {
    if (!this.elevenLabsApiKey) {
      this.initializeElevenLabs();
    }

    if (!this.elevenLabsApiKey) {
      throw new Error('ElevenLabs API key not available');
    }

    try {
      const voiceId = this.settings.elevenLabsVoiceId || '4YYIPFl9wE5c4L2eu2Gb'; // River - neutral voice
      
      
      const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        headers: {
          'Accept': 'audio/mpeg',
          'Content-Type': 'application/json',
          'xi-api-key': this.elevenLabsApiKey,
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_turbo_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.8
          },
        }),
      });
      

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`ElevenLabs API error: ${response.status} - ${errorText}`);
      }

      
      const audioBuffer = await response.arrayBuffer();
      
      // Clean up any previous ElevenLabs audio to prevent memory leaks
      if (this.currentElevenLabsSound) {
        try {
          await this.currentElevenLabsSound.unloadAsync();
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
        this.currentElevenLabsSound = null;
      }
      
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          staysActiveInBackground: false,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        
        const { sound } = await Audio.Sound.createAsync(
          {
            uri: `data:audio/mpeg;base64,${this.arrayBufferToBase64(audioBuffer)}`,
          },
          { shouldPlay: false }
        );
        
        // Store reference for stopping
        this.currentElevenLabsSound = sound;
        
        // Mimic system TTS callbacks exactly
        console.log('ElevenLabs TTS started');
        
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded) {
            if (status.didJustFinish) {
              console.log('ElevenLabs TTS finished');
              this.clearSentenceTimeouts();
              this.status = {
                isPlaying: false,
                currentText: null,
                currentSentence: null,
                sentenceIndex: 0,
                totalSentences: 0,
              };
              this.notifyStatusListeners();
              sound.unloadAsync();
              this.currentElevenLabsSound = null;
            }
          }
        });
        
        await sound.playAsync();
        
      } catch (audioError) {
        console.error('ElevenLabs audio playback error:', audioError);
        this.clearSentenceTimeouts();
        this.status = {
          isPlaying: false,
          currentText: null,
          currentSentence: null,
          sentenceIndex: 0,
          totalSentences: 0,
        };
        this.notifyStatusListeners();
        throw audioError;
      }
      
    } catch (error) {
      console.error('ElevenLabs TTS error:', error);
      throw error;
    }
  }

  private initializeElevenLabs(): void {
    // Try multiple ways to get the API key
    const apiKey = Constants.expoConfig?.extra?.ELEVENLABS_API_KEY || 
                   (Constants.manifest as any)?.extra?.ELEVENLABS_API_KEY ||
                   process.env.ELEVENLABS_API_KEY;
    
    console.log('Initializing ElevenLabs with key:', apiKey ? `${apiKey.substring(0, 10)}...` : 'not found');
    
    if (!apiKey || apiKey === 'your_elevenlabs_api_key_here') {
      console.warn('ElevenLabs API key not found or not set');
      return;
    }

    this.elevenLabsApiKey = apiKey;
    console.log('ElevenLabs client initialized successfully');
  }

  async stop(): Promise<void> {
    try {
      // Stop system TTS
      await Speech.stop();
      
      // Stop ElevenLabs audio if playing
      if (this.currentElevenLabsSound) {
        await this.currentElevenLabsSound.stopAsync();
        await this.currentElevenLabsSound.unloadAsync();
        this.currentElevenLabsSound = null;
      }
      
      this.clearSentenceTimeouts();
      this.status = {
        isPlaying: false,
        currentText: null,
        currentSentence: null,
        sentenceIndex: 0,
        totalSentences: 0,
      };
      this.notifyStatusListeners();
    } catch (error) {
      // Handle stop errors silently
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

  private notifySentenceProgressListeners(sentence: string, index: number, total: number): void {
    this.sentenceProgressListeners.forEach(listener => listener(sentence, index, total));
  }

  addSentenceProgressListener(listener: (sentence: string, index: number, total: number) => void): void {
    this.sentenceProgressListeners.push(listener);
  }

  removeSentenceProgressListener(listener: (sentence: string, index: number, total: number) => void): void {
    const index = this.sentenceProgressListeners.indexOf(listener);
    if (index > -1) {
      this.sentenceProgressListeners.splice(index, 1);
    }
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

  async testCurrentSettings(): Promise<void> {
    const testText = this.settings.provider === 'elevenlabs' 
      ? "This is a test using ElevenLabs voice synthesis."
      : "This is a test of the current speech rate and pitch settings.";
    try {
      await this.speak(testText);
    } catch (error) {
      // Test error handled by speak method
      throw error;
    }
  }

  switchProvider(provider: TTSProvider): void {
    this.updateSettings({ provider });
    if (provider === 'elevenlabs' && !this.elevenLabsApiKey) {
      this.initializeElevenLabs();
    }
  }

  isElevenLabsAvailable(): boolean {
    const apiKey = Constants.expoConfig?.extra?.ELEVENLABS_API_KEY || 
                   (Constants.manifest as any)?.extra?.ELEVENLABS_API_KEY ||
                   process.env.ELEVENLABS_API_KEY;
    const available = !!(apiKey && apiKey !== 'your_elevenlabs_api_key_here');
    console.log('ElevenLabs availability check:', {
      hasApiKey: !!apiKey,
      keyLength: apiKey ? apiKey.length : 0,
      available
    });
    return available;
  }

  // Test method to verify API connection
  async testElevenLabsConnection(): Promise<boolean> {
    if (!this.elevenLabsApiKey) {
      this.initializeElevenLabs();
    }

    if (!this.elevenLabsApiKey) {
      console.error('No ElevenLabs API key available for testing');
      return false;
    }

    try {
      console.log('Testing ElevenLabs connection...');
      const response = await fetch('https://api.elevenlabs.io/v1/voices', {
        headers: {
          'xi-api-key': this.elevenLabsApiKey,
        },
      });

      console.log('ElevenLabs test response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('ElevenLabs test successful, found', data.voices?.length || 0, 'voices');
        return true;
      } else {
        const errorText = await response.text();
        console.error('ElevenLabs test failed:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('ElevenLabs test error:', error);
      return false;
    }
  }

  async getVoiceInfo(): Promise<{
    current: TTSSettings;
    englishVoices: Speech.Voice[];
    allVoices: Speech.Voice[];
    totalVoices: number;
    elevenLabsAvailable: boolean;
  }> {
    const voices = await this.getAvailableVoices();
    const englishVoices = await this.getEnglishVoices();
    
    return {
      current: this.settings,
      englishVoices,
      allVoices: voices,
      totalVoices: voices.length,
      elevenLabsAvailable: this.isElevenLabsAvailable()
    };
  }
}

// Export a singleton instance
export const ttsService = new TTSService();