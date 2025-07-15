import React, { useState, useEffect, useImperativeHandle, forwardRef, useRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';
import VoiceAssistantOrb from './VoiceAssistantOrb';
import { ttsService } from '../services/ttsService';

interface SpeechRecognitionProps {
  onTextChange: (text: string) => void;
  text: string;
  onListeningChange?: (isListening: boolean) => void;
  onSpeechComplete?: () => void;
}

interface SpeechRecognitionHandle {
  startListening: () => void;
  stopListening: () => void;
  clearText: () => void;
}

const SpeechRecognition = forwardRef<SpeechRecognitionHandle, SpeechRecognitionProps>(({ onTextChange, text, onListeningChange, onSpeechComplete }, ref) => {
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [isAvailable, setIsAvailable] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [countdown, setCountdown] = useState(0);
  const [supportsOnDevice, setSupportsOnDevice] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [showSettings, setShowSettings] = useState(false);
  
  // Use refs for reliable access to current values (prevents race conditions)
  const interimTextRef = useRef('');
  const accumulatedFinalTextRef = useRef('');
  const lastResultIndexRef = useRef(0);
  const isProcessingRef = useRef(false);

  useEffect(() => {
    checkAvailability();
  }, []);

  // Notify parent component when listening state changes
  useEffect(() => {
    if (onListeningChange) {
      onListeningChange(isListening);
    }
  }, [isListening, onListeningChange]);

  // Consolidated function to move interim text to final text (prevents race conditions)
  const moveInterimToFinal = () => {
    if (isProcessingRef.current) return; // Prevent concurrent processing
    isProcessingRef.current = true;
    
    try {
      const currentInterim = interimTextRef.current.trim();
      const currentAccumulated = accumulatedFinalTextRef.current.trim();
      
      if (currentInterim) {
        // Combine accumulated final text with new interim text
        const newFinalText = currentAccumulated + 
          (currentAccumulated ? ' ' : '') + 
          currentInterim;
        
        // Update the main text input
        const existingText = text.trim();
        const completeText = existingText + 
          (existingText ? ' ' : '') + 
          newFinalText;
        
        onTextChange(completeText);
        
        // Reset accumulated text and interim text
        accumulatedFinalTextRef.current = '';
        interimTextRef.current = '';
        setTranscript('');
        
        // Notify that speech is complete
        if (onSpeechComplete) {
          onSpeechComplete();
        }
      }
    } finally {
      isProcessingRef.current = false;
    }
  };

  // Reset session state when starting new speech recognition
  const resetSessionState = () => {
    interimTextRef.current = '';
    accumulatedFinalTextRef.current = '';
    lastResultIndexRef.current = 0;
    isProcessingRef.current = false;
    setTranscript('');
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    startListening,
    stopListening,
    clearText,
  }));

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (countdown > 0) {
      interval = setInterval(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [countdown]);

  useSpeechRecognitionEvent('start', () => {
    console.log('Speech recognition started');
    setIsListening(true);
    resetSessionState();
  });

  useSpeechRecognitionEvent('end', () => {
    console.log('Speech recognition ended');
    
    // Process any remaining interim text before cleaning up
    moveInterimToFinal();
    
    setIsListening(false);
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setCountdown(0);
  });

  useSpeechRecognitionEvent('result', (event) => {
    console.log('Speech result:', event);
    console.log('Event results:', JSON.stringify(event.results, null, 2));
    
    if (event.results && event.results.length > 0) {
      let newFinalText = '';
      let newInterimText = '';
      
      // Process only new results (those beyond lastResultIndex)
      for (let i = lastResultIndexRef.current; i < event.results.length; i++) {
        const result = event.results[i];
        console.log(`Processing result ${i}:`, result);
        
        if (result.isFinal) {
          newFinalText += result.transcript;
          console.log('Final transcript found:', result.transcript);
          lastResultIndexRef.current = i + 1; // Update processed index
        } else {
          newInterimText += result.transcript;
          console.log('Interim transcript found:', result.transcript);
        }
      }
      
      // Handle final results by accumulating them
      if (newFinalText.trim()) {
        console.log('Adding final transcript to accumulated text:', newFinalText);
        accumulatedFinalTextRef.current += 
          (accumulatedFinalTextRef.current ? ' ' : '') + 
          newFinalText.trim();
        console.log('Accumulated final text:', accumulatedFinalTextRef.current);
      }
      
      // Handle interim results by updating the ref and display
      if (newInterimText.trim()) {
        interimTextRef.current = newInterimText.trim();
        setTranscript(newInterimText.trim());
      } else if (newFinalText.trim()) {
        // Clear interim display when we get final results
        interimTextRef.current = '';
        setTranscript('');
      }
      
      // Reset auto-stop timeout when we get results
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Set auto-stop after 4 seconds of silence with countdown
      setCountdown(4);
      const newTimeoutId = setTimeout(() => {
        if (isListening) {
          console.log('Auto-stopping due to silence');
          moveInterimToFinal();
          stopListening();
        }
      }, 4000);
      
      setTimeoutId(newTimeoutId);
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    console.log('Speech recognition error:', event);
    console.log('Error details:', JSON.stringify(event, null, 2));
    setIsListening(false);
    setCountdown(0);
    
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
    
    try {
      console.log('Starting speech recognition...');
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
      if (timeoutId) {
        clearTimeout(timeoutId);
        setTimeoutId(null);
      }
      setCountdown(0);
      
      // Process any remaining text before stopping
      moveInterimToFinal();
      
      await ExpoSpeechRecognitionModule.stop();
      setIsListening(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to stop listening: ' + error);
      setIsListening(false);
      setCountdown(0);
      resetSessionState();
    }
  };

  const clearText = () => {
    onTextChange('');
    resetSessionState();
  };

  const finishSpeaking = () => {
    // Move interim text to final text using the consolidated function
    moveInterimToFinal();
  };

  const handleOrbPress = async () => {
    // Stop TTS if it's currently playing
    try {
      await ttsService.stop();
    } catch (error) {
      console.error('Error stopping TTS:', error);
    }
    
    if (isListening) {
      stopListening();
    } else {
      startListening();
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
      {(permissionStatus !== 'granted' || !isAvailable) && (
        <View style={styles.statusContainer}>
          {permissionStatus !== 'granted' && (
            <Text style={[styles.status, styles.statusBad]}>
              ❌ Permission: {permissionStatus}
            </Text>
          )}
          {!isAvailable && (
            <Text style={[styles.status, styles.statusBad]}>
              ❌ Speech Recognition: Not Available
            </Text>
          )}
        </View>
      )}
      
      {!isAvailable && (
        <Text style={styles.warning}>
          ⚠️ Speech recognition not available on this device
        </Text>
      )}
      
      {/* Settings Button */}
      <TouchableOpacity style={styles.settingsButton} onPress={() => setShowSettings(!showSettings)}>
        <Text style={styles.settingsButtonText}>
          ⚙️ Settings {showSettings ? '▼' : '▶'}
        </Text>
      </TouchableOpacity>
      
      {/* Collapsible Settings Section */}
      {showSettings && (
        <View style={styles.settingsContainer}>
          {permissionStatus !== 'granted' && (
            <TouchableOpacity style={styles.permissionButton} onPress={requestPermissions}>
              <Text style={styles.permissionButtonText}>🎤 Request Mic Permission</Text>
            </TouchableOpacity>
          )}
          
          <View style={styles.languageContainer}>
            <Text style={styles.languageLabel}>Language:</Text>
            <View style={styles.languageButtons}>
              {[
                { code: 'en-US', label: '🇺🇸 US English' },
                { code: 'en-GB', label: '🇬🇧 UK English' },
                { code: 'en-AU', label: '🇦🇺 Australian' },
                { code: 'en-CA', label: '🇨🇦 Canadian' }
              ].map((lang) => (
                <TouchableOpacity
                  key={lang.code}
                  style={[
                    styles.languageButton,
                    selectedLanguage === lang.code && styles.languageButtonSelected
                  ]}
                  onPress={() => setSelectedLanguage(lang.code)}
                >
                  <Text style={[
                    styles.languageButtonText,
                    selectedLanguage === lang.code && styles.languageButtonTextSelected
                  ]}>
                    {lang.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          {supportsOnDevice && (
            <Text style={[styles.status, styles.statusGood]}>
              📱 On-device Recognition: Available
            </Text>
          )}
        </View>
      )}
      
      {/* 3D Voice Assistant Orb */}
      <View style={styles.orbContainer}>
        <VoiceAssistantOrb 
          isRecording={isListening}
          isListening={false}
          isProcessing={false}
          size={280}
          onPress={handleOrbPress}
          disabled={permissionStatus !== 'granted' || !isAvailable}
        />
      </View>
      
      
      {transcript && (
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.finishButton} onPress={finishSpeaking}>
            <Text style={styles.finishButtonText}>✓ Finish</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {transcript && (
        <View style={styles.interimContainer}>
          <View style={styles.interimHeader}>
            <Text style={styles.interimLabel}>🎤 Listening...</Text>
            {countdown > 0 && (
              <Text style={styles.countdown}>Auto-stop in {countdown}s</Text>
            )}
          </View>
          <Text style={styles.interimText}>{transcript}</Text>
        </View>
      )}
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
  settingsButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 10,
    alignSelf: 'center',
  },
  settingsButtonText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  settingsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  permissionButton: {
    backgroundColor: '#00ccff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 15,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
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
  languageContainer: {
    marginBottom: 20,
    width: '100%',
  },
  languageLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 10,
    textAlign: 'center',
  },
  languageButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  languageButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  languageButtonSelected: {
    backgroundColor: '#00ccff',
    borderColor: '#00ccff',
  },
  languageButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  languageButtonTextSelected: {
    color: 'white',
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
});