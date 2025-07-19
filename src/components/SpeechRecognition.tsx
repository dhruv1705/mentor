import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import VoiceAssistantOrb from './VoiceAssistantOrb';
import { ttsService, TTSStatus } from '../services/ttsService';

interface SpeechRecognitionProps {
  onTextChange: (text: string) => void;
  text: string;
  onListeningChange?: (isListening: boolean) => void;
  isSpeaking?: boolean;
  onOrbTap?: () => void;
  autoListenMode?: boolean;
}

interface SpeechRecognitionHandle {
  startListening: () => void;
  stopListening: () => void;
  clearText: () => void;
}

const SpeechRecognition = forwardRef<SpeechRecognitionHandle, SpeechRecognitionProps>(({ onTextChange, text, onListeningChange, isSpeaking = false, onOrbTap, autoListenMode = true }, ref) => {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isInitializing, setIsInitializing] = useState(true);
  const [supportsOnDevice, setSupportsOnDevice] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [wasPausedForTTS, setWasPausedForTTS] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const ttsStatusRef = useRef<TTSStatus>(ttsService.getStatus());
  
  // Use refs for reliable access to current values (prevents race conditions)
  const interimTextRef = useRef('');
  const accumulatedFinalTextRef = useRef('');
  const lastResultIndexRef = useRef(0);
  const isProcessingRef = useRef(false);
  const baseTextRef = useRef(''); // Store the original text before speech started

  useEffect(() => {
    checkAvailability();
  }, []);

  useEffect(() => {
    if (autoListenMode && permissionStatus === 'granted' && isAvailable && !isInitializing) {
      startAutoListening();
    }
    
    return () => {
      // Cleanup if needed
    };
  }, [autoListenMode, permissionStatus, isAvailable, isInitializing]);

  // TTS Status Listener for pause/resume logic
  useEffect(() => {
    const handleTTSStatusChange = (status: TTSStatus) => {
      ttsStatusRef.current = status;
      
      if (autoListenMode) {
        if (status.isPlaying && isListening) {
          // TTS started while listening - pause recognition
          console.log('TTS started - pausing speech recognition');
          setWasPausedForTTS(true);
          stopListening();
        } else if (!status.isPlaying && wasPausedForTTS && !isListening) {
          // TTS stopped and we were paused for TTS - resume recognition
          console.log('TTS stopped - resuming speech recognition');
          setWasPausedForTTS(false);
          setTimeout(() => {
            if (!isListening && !isSpeaking) {
              startListening();
            }
          }, 500); // Increased delay to ensure TTS audio has fully stopped
        }
      }
    };

    // Add TTS status listener
    ttsService.addStatusListener(handleTTSStatusChange);
    
    return () => {
      // Remove TTS status listener on cleanup
      ttsService.removeStatusListener(handleTTSStatusChange);
    };
  }, [autoListenMode, isListening, wasPausedForTTS, isSpeaking]);

  // Notify parent component when listening state changes
  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
  }, [isListening, onListeningChange]);

  // Simple text accumulation - no complex processing
  const simpleTextUpdate = (newText: string) => {
    const currentBase = baseTextRef.current.trim();
    const combinedText = currentBase ? currentBase + ' ' + newText : newText;
    console.log('🔥 simpleTextUpdate - currentBase:', currentBase);
    console.log('🔥 simpleTextUpdate - newText:', newText);
    console.log('🔥 simpleTextUpdate - combinedText:', combinedText);
    baseTextRef.current = combinedText;
    onTextChange(combinedText);
    console.log('🔥 simpleTextUpdate - AFTER update baseTextRef:', baseTextRef.current);
  };

  // Simple session reset - NEVER clear accumulated text
  const resetSessionState = () => {
    console.log('🔥 resetSessionState - BEFORE baseTextRef:', baseTextRef.current);
    interimTextRef.current = '';
    accumulatedFinalTextRef.current = '';
    lastResultIndexRef.current = 0;
    isProcessingRef.current = false;
    // Keep existing baseTextRef - NEVER overwrite it
    setTranscript('');
    console.log('🔥 resetSessionState - AFTER baseTextRef:', baseTextRef.current);
  };

  // Simple auto-listening - directly start speech recognition
  const startAutoListening = async () => {
    if (!isListening && !isSpeaking) {
      console.log('Auto-listening mode enabled - starting continuous speech recognition');
      await startListening();
    }
  };

  // Auto-restart listening after speech ends (for continuous mode)
  const autoRestartListening = async () => {
    if (autoListenMode && !isSpeaking && permissionStatus === 'granted' && isAvailable) {
      // Don't restart if TTS is currently playing
      const currentTTSStatus = ttsService.getStatus();
      if (currentTTSStatus.isPlaying) {
        console.log('Skipping auto-restart - TTS is playing');
        return;
      }
      
      console.log('Auto-restarting speech recognition for continuous listening');
      setTimeout(async () => {
        if (!isListening && !isSpeaking && !ttsStatusRef.current.isPlaying) {
          await startListening();
        }
      }, 500); // Small delay before restarting
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    clearText,
  }));

  // Countdown functionality removed for simplicity

  useSpeechRecognitionEvent('start', () => {
    console.log('Speech recognition started - simple accumulation mode');
    setIsListening(true);
    resetSessionState();
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('🔥 Speech recognition ended - simple mode');
    
    // ALWAYS treat speech end as final result - add interim text as final
    if (interimTextRef.current.trim()) {
      console.log('🔥 Speech ended - treating interim as FINAL:', interimTextRef.current);
      simpleTextUpdate(interimTextRef.current.trim());
      interimTextRef.current = '';
    }
    
    setIsListening(false);
    
    // Auto-restart if in auto-listening mode
    if (autoListenMode) {
      autoRestartListening();
    }
  });

  useSpeechRecognitionEvent('result', (event) => {
    if (event.results && event.results.length > 0) {
      // Process ALL results, not just the latest one
      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        console.log('🔥 Processing result', i, '- isFinal:', result.isFinal, 'transcript:', result.transcript);
        
        if (result.isFinal === true && result.transcript.trim()) {
          // Final result - add to accumulated text
          console.log('🔥 FINAL RESULT - calling simpleTextUpdate');
          simpleTextUpdate(result.transcript.trim());
        } else if (result.transcript.trim()) {
          // Interim result - show live feedback but DON'T save to baseTextRef yet
          console.log('🔥 INTERIM RESULT - showing live feedback');
          const currentBase = baseTextRef.current.trim();
          const liveText = currentBase ? currentBase + ' ' + result.transcript.trim() : result.transcript.trim();
          
          // Store the current session's interim text (without base)
          interimTextRef.current = result.transcript.trim();
          console.log('🔥 INTERIM - currentBase:', currentBase);
          console.log('🔥 INTERIM - current session text:', result.transcript.trim());
          console.log('🔥 INTERIM - showing combined:', liveText);
          
          onTextChange(liveText);
          
          // BACKUP STRATEGY: Set timeout to save text after 2 seconds of no new results
          if (saveTimeoutRef.current) {
            clearTimeout(saveTimeoutRef.current);
          }
          saveTimeoutRef.current = setTimeout(() => {
            console.log('🔥 TIMEOUT SAVE - saving interim text to baseTextRef:', result.transcript.trim());
            if (interimTextRef.current.trim()) {
              simpleTextUpdate(interimTextRef.current.trim());
              interimTextRef.current = '';
            }
          }, 2000);
        }
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech recognition error:', event);
    console.log('Error details:', JSON.stringify(event, null, 2));
    setIsListening(false);
    
    let errorTitle = 'Speech Recognition Error';
    let errorMessage = 'An unknown error occurred';
    let suggestion = '';
    
    const errorCode = event.error?.code || event.code;
    const errorMsg = event.error?.message || event.message;
    
    switch (errorCode) {
      case 'network':
      case 'NETWORK_ERROR':
        errorTitle = 'Network Error';
        errorMessage = 'Unable to connect to speech recognition service';
        suggestion = 'Please check your internet connection and try again.';
        break;
      case 'no-speech':
      case 'NO_SPEECH':
        errorTitle = 'No Speech Detected';
        errorMessage = 'No speech was detected';
        suggestion = 'Please speak clearly into the microphone and try again.';
        break;
      case 'audio-capture':
      case 'AUDIO_CAPTURE':
        errorTitle = 'Microphone Error';
        errorMessage = 'Unable to access microphone';
        suggestion = 'Please check microphone permissions and ensure no other app is using the microphone.';
        break;
      case 'not-allowed':
      case 'PERMISSION_DENIED':
        errorTitle = 'Permission Denied';
        errorMessage = 'Microphone permission was denied';
        suggestion = 'Please grant microphone permission in device settings.';
        break;
      case 'service-not-allowed':
      case 'SERVICE_NOT_ALLOWED':
        errorTitle = 'Service Unavailable';
        errorMessage = 'Speech recognition service is not available';
        suggestion = 'Please ensure Google Speech Services is installed and enabled.';
        break;
      default:
        errorMessage = errorMsg || `Error code: ${errorCode || 'unknown'}`;
        suggestion = 'Please try again. If the problem persists, restart the app.';
    }
    
    Alert.alert(
      errorTitle, 
      `${errorMessage}\n\n${suggestion}`,
      [{ text: 'OK', style: 'default' }]
    );
  });

  const checkAvailability = async () => {
    try {
      setIsInitializing(true);
      console.log('Checking speech recognition availability...');
      const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
      console.log('Speech recognition available:', available);
      setIsAvailable(available);
      
      const permissions = await ExpoSpeechRecognitionModule.getPermissionsAsync();
      console.log('Current permissions:', permissions);
      setPermissionStatus(permissions.granted ? 'granted' : 'denied');
      
      // Also check supported locales and on-device capability
      if (available) {
        try {
          // Check if getSupportedLocales method exists before calling it
          if (typeof ExpoSpeechRecognitionModule.getSupportedLocales === 'function') {
            const locales = await ExpoSpeechRecognitionModule.getSupportedLocales();
            console.log('Supported locales:', locales);
          } else {
            console.log('getSupportedLocales method not available');
          }
          
          // Check if supportsOnDeviceRecognition method exists before calling it
          if (typeof ExpoSpeechRecognitionModule.supportsOnDeviceRecognition === 'function') {
            const onDeviceSupport = await ExpoSpeechRecognitionModule.supportsOnDeviceRecognition();
            console.log('Supports on-device recognition:', onDeviceSupport);
            setSupportsOnDevice(onDeviceSupport);
          } else {
            console.log('supportsOnDeviceRecognition method not available');
            setSupportsOnDevice(false);
          }
        } catch (localeError) {
          console.log('Could not get supported locales or on-device support:', localeError);
          setSupportsOnDevice(false);
        }
      }
    } catch (error) {
      console.log('Availability check failed:', error);
      setIsAvailable(false);
    } finally {
      setIsInitializing(false);
    }
  };

  const requestPermissions = async () => {
    try {
      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      setPermissionStatus(result.granted ? 'granted' : 'denied');
      
      if (result.granted) {
        const available = await ExpoSpeechRecognitionModule.isRecognitionAvailable();
        setIsAvailable(available);
        Alert.alert('Success', 'Microphone permission granted!');
      } else {
        Alert.alert('Permission Denied', 'Microphone access is required for speech recognition.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to request permissions: ' + error);
    }
  };

  const startListening = async () => {
    if (permissionStatus !== 'granted') {
      Alert.alert('Permission Required', 'Please grant microphone permission first.');
      return;
    }
    
    if (!isAvailable) {
      Alert.alert('Not Available', 'Speech recognition is not available on this device.');
      return;
    }
    
    // Don't start listening if TTS is currently playing
    const currentTTSStatus = ttsService.getStatus();
    if (currentTTSStatus.isPlaying) {
      console.log('Skipping start listening - TTS is playing');
      return;
    }
    
    try {
      console.log('Starting speech recognition - simple accumulation mode');
      resetSessionState();
      setIsListening(true);
      
      await ExpoSpeechRecognitionModule.start({
        lang: selectedLanguage,
        interimResults: true,
        maxAlternatives: 1,
        continuous: true,
        requiresOnDeviceRecognition: false,
      });
      
      console.log('Speech recognition started successfully');
    } catch (error) {
      console.log('Start listening error:', error);
      console.log('Error details:', JSON.stringify(error, null, 2));
      setIsListening(false);
      
      let errorMessage = 'Failed to start speech recognition';
      let suggestion = 'Please try again';
      
      if ((error as any).message?.includes('network') || (error as any).message?.includes('Network')) {
        errorMessage = 'Network connection required';
        suggestion = 'Please check your internet connection and try again';
      } else if ((error as any).message?.includes('permission') || (error as any).message?.includes('Permission')) {
        errorMessage = 'Microphone permission required';
        suggestion = 'Please grant microphone permission and try again';
      } else if ((error as any).message?.includes('not available') || (error as any).message?.includes('Not available')) {
        errorMessage = 'Speech recognition not available';
        suggestion = 'Please ensure your device supports speech recognition';
      }
      
      Alert.alert(
        'Cannot Start Listening',
        `${errorMessage}\n\n${suggestion}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Retry', onPress: () => setTimeout(() => startListening(), 1000) }
        ]
      );
    }
  };

  const stopListening = async () => {
    try {
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop listening: ' + error);
      setIsListening(false);
    }
  };

  const clearText = () => {
    console.log('🔥 clearText - BEFORE clear, baseTextRef:', baseTextRef.current);
    onTextChange('');
    baseTextRef.current = ''; // Clear base text completely
    resetSessionState();
    console.log('🔥 clearText - AFTER clear, baseTextRef:', baseTextRef.current);
  };

  // finishSpeaking removed - not needed in simple mode

  const handleOrbPress = async () => {
    if (autoListenMode) {
      // In auto mode, orb toggles continuous listening
      if (isListening) {
        stopListening();
      } else {
        startAutoListening();
      }
    } else if (onOrbTap) {
      // Use the simplified orb tap handler from ClaudeChat
      onOrbTap();
    } else {
      // Fallback behavior if no custom handler
      if (isListening) {
        stopListening();
      } else {
        startListening();
      }
    }
  };

  if (isInitializing) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>🔄 Initializing Speech...</Text>
          <Text style={styles.loadingSubtext}>Checking device capabilities</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>      
      {/* Smart Status Display - Only show when there are issues */}
      {autoListenMode && (isListening || wasPausedForTTS) && (
        <View style={styles.vadStatusContainer}>
          <Text style={styles.vadStatusText}>
            {wasPausedForTTS ? '⏸️ Paused for Claude' : '🎤 Auto-listening enabled'}
          </Text>
          <Text style={styles.vadStatusSubtext}>
            {wasPausedForTTS ? 'Will resume when Claude finishes speaking' : 'Speak naturally - no button needed'}
          </Text>
        </View>
      )}
      
      {(permissionStatus !== 'granted' || !isAvailable) && (
        <TouchableOpacity 
          style={styles.statusContainer}
          onPress={requestPermissions}
          activeOpacity={0.7}
        >
          {permissionStatus !== 'granted' && (
            <Text style={[styles.status, styles.statusBad]}>
              ❌ Permission: denied
            </Text>
          )}
          {!isAvailable && (
            <Text style={[styles.status, styles.statusBad]}>
              ❌ Speech Recognition: Not Available
            </Text>
          )}
          {permissionStatus !== 'granted' && (
            <Text style={styles.tapToAllowText}>
              Tap to allow permissions
            </Text>
          )}
        </TouchableOpacity>
      )}
      
      {!isAvailable && (
        <Text style={styles.warning}>
          ⚠️ Speech recognition not available on this device
        </Text>
      )}
      
      
      {/* 3D Voice Assistant Orb */}
      <View style={styles.orbContainer}>
        <VoiceAssistantOrb 
          isRecording={isListening}
          isListening={false}
          isProcessing={false}
          isSpeaking={isSpeaking}
          size={280}
          onPress={handleOrbPress}
          disabled={permissionStatus !== 'granted' || !isAvailable}
        />
      </View>
      
      
    </View>
  );
});

export default SpeechRecognition;

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  statusContainer: {
    marginBottom: 15,
    backgroundColor: '#FFE6E6',
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
  },
  status: {
    fontSize: 14,
    marginBottom: 5,
    textAlign: 'center',
  },
  statusGood: {
    color: '#34C759',
    fontWeight: 'bold',
  },
  statusBad: {
    color: '#FF3B30',
    fontWeight: 'bold',
  },
  orbContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#00ccff',
    fontWeight: 'bold',
    marginBottom: 10,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  warning: {
    color: '#FF9500',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    gap: 10,
  },
  finishButton: {
    backgroundColor: '#34C759',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
  },
  finishButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  interimContainer: {
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 6,
    padding: 10,
    marginBottom: 15,
    width: '100%',
  },
  interimHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  interimLabel: {
    fontSize: 12,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  countdown: {
    fontSize: 11,
    color: '#FF9500',
    fontWeight: 'bold',
  },
  interimText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  tapToAllowText: {
    fontSize: 12,
    color: '#007AFF',
    textAlign: 'center',
    marginTop: 5,
    fontWeight: '600',
  },
  vadStatusContainer: {
    backgroundColor: '#E8F5E8',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#34C759',
  },
  vadStatusText: {
    fontSize: 14,
    color: '#34C759',
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  vadStatusSubtext: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
});