import { Audio } from 'expo-av';

export interface VolumeTransitionOptions {
  duration?: number; // in milliseconds
  steps?: number; // number of steps for smooth transition
}

export class AudioUtils {
  /**
   * Smoothly transitions volume from current level to target level
   * @param sound - Audio.Sound instance
   * @param targetVolume - Target volume level (0-1)
   * @param options - Transition options
   */
  static async smoothVolumeTransition(
    sound: Audio.Sound,
    targetVolume: number,
    options: VolumeTransitionOptions = {}
  ): Promise<void> {
    const { duration = 300, steps = 10 } = options;
    
    try {
      // Get current volume
      const status = await sound.getStatusAsync();
      if (!status.isLoaded) return;
      
      const currentVolume = status.volume || 0;
      const volumeDiff = targetVolume - currentVolume;
      const stepSize = volumeDiff / steps;
      const stepDuration = duration / steps;
      
      // Perform smooth transition
      for (let i = 1; i <= steps; i++) {
        const newVolume = currentVolume + (stepSize * i);
        await sound.setVolumeAsync(Math.max(0, Math.min(1, newVolume)));
        
        // Wait for next step
        if (i < steps) {
          await new Promise(resolve => setTimeout(resolve, stepDuration));
        }
      }
    } catch (error) {
      console.error('Error in smooth volume transition:', error);
      // Fallback to direct volume set
      await sound.setVolumeAsync(targetVolume);
    }
  }
  
  /**
   * Smoothly duck volume to 25% of original
   * @param sound - Audio.Sound instance
   * @param originalVolume - Original volume level
   * @param options - Transition options
   */
  static async duckVolume(
    sound: Audio.Sound,
    originalVolume: number,
    options: VolumeTransitionOptions = {}
  ): Promise<void> {
    const targetVolume = originalVolume * 0.25;
    await this.smoothVolumeTransition(sound, targetVolume, options);
  }
  
  /**
   * Smoothly restore volume to original level
   * @param sound - Audio.Sound instance
   * @param originalVolume - Original volume level
   * @param options - Transition options
   */
  static async restoreVolume(
    sound: Audio.Sound,
    originalVolume: number,
    options: VolumeTransitionOptions = {}
  ): Promise<void> {
    await this.smoothVolumeTransition(sound, originalVolume, options);
  }
  
  /**
   * Fade in audio from 0 to target volume
   * @param sound - Audio.Sound instance
   * @param targetVolume - Target volume level (0-1)
   * @param options - Transition options
   */
  static async fadeIn(
    sound: Audio.Sound,
    targetVolume: number = 1.0,
    options: VolumeTransitionOptions = {}
  ): Promise<void> {
    // Start at 0 volume
    await sound.setVolumeAsync(0);
    await this.smoothVolumeTransition(sound, targetVolume, options);
  }
  
  /**
   * Fade out audio from current volume to 0
   * @param sound - Audio.Sound instance
   * @param options - Transition options
   */
  static async fadeOut(
    sound: Audio.Sound,
    options: VolumeTransitionOptions = {}
  ): Promise<void> {
    await this.smoothVolumeTransition(sound, 0, options);
  }
  
  /**
   * Cross-fade between two audio sources
   * @param fadeOutSound - Sound to fade out
   * @param fadeInSound - Sound to fade in
   * @param targetVolume - Target volume for fade in sound
   * @param options - Transition options
   */
  static async crossFade(
    fadeOutSound: Audio.Sound,
    fadeInSound: Audio.Sound,
    targetVolume: number = 1.0,
    options: VolumeTransitionOptions = {}
  ): Promise<void> {
    // Perform both transitions simultaneously
    await Promise.all([
      this.fadeOut(fadeOutSound, options),
      this.fadeIn(fadeInSound, targetVolume, options)
    ]);
  }
}

export default AudioUtils;