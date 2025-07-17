import React, { useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { claudeApi, ClaudeMessage } from '../services/claudeApi';
import { ttsService, TTSStatus, TTSProvider, TTSSettings } from '../services/ttsService';
import { useAuth } from '../contexts/AuthContext';
import { ProfileCompletion } from './ProfileCompletion';
import { ScheduleVisualization } from './ScheduleVisualization';
import { Feather } from '@expo/vector-icons';

interface ClaudeChatProps {
  initialText: string;
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onClearText?: () => void;
  speechCompleted?: boolean;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

interface ClaudeChatHandle {
  handleOrbTap: () => void;
}

// Utility function to parse text into sentences
const parseSentences = (text: string): string[] => {
  // Split by sentence-ending punctuation followed by whitespace or end of string
  const sentences = text.split(/(?<=[.!?])\s+/)
    .filter(sentence => sentence.trim().length > 0)
    .map(sentence => sentence.trim());
  
  return sentences;
};

const ClaudeChat = forwardRef<ClaudeChatHandle, ClaudeChatProps>(({ initialText, isListening, onStartListening, onStopListening, onClearText, speechCompleted, onSpeakingChange }, ref) => {
  const [inputText, setInputText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSentence, setCurrentSentence] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>(ttsService.getStatus());
  const [profileUpdateNotification, setProfileUpdateNotification] = useState<string | null>(null);
  const [autoSendEnabled, setAutoSendEnabled] = useState(true);
  const [autoSendCountdown, setAutoSendCountdown] = useState(0);
  const [autoSendTimeoutId, setAutoSendTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [currentTtsProvider, setCurrentTtsProvider] = useState<TTSProvider>('system');
  const [elevenLabsAvailable, setElevenLabsAvailable] = useState(false);
  const [orbState, setOrbState] = useState<'idle' | 'speaking' | 'listening'>('idle');

  const { profile, schedule, updateProfileField, getProfileCompletion, refreshProfile, updateSchedule, updateScheduleField, refreshSchedule } = useAuth();

  // Generate context-aware questions based on user profile and conversation history
  const generateContextualQuestion = (): string => {
    const completion = getProfileCompletion();
    
    // First time user welcome
    if (completion.completionPercentage === 0) {
      return "Welcome to mentor! Tell me about yourself to get started.";
    }
    
    // Profile completion questions
    if (completion.missingFields.length > 0) {
      const missingField = completion.missingFields[0];
      switch (missingField) {
        case 'name':
          return "What's your name?";
        case 'age':
          return "How old are you?";
        case 'occupation':
          return "What do you do for work?";
        case 'interests':
          return "What are your main interests or hobbies?";
        case 'goals':
          return "What are your current goals or aspirations?";
        case 'location':
          return "Where are you located?";
        case 'education':
          return "What's your educational background?";
        case 'experience':
          return "Tell me about your professional experience.";
        default:
          return "Tell me more about yourself.";
      }
    }
    
    // General conversation starters when profile is complete
    const conversationStarters = [
      "How are you feeling today?",
      "What's on your mind?",
      "What would you like to talk about?",
      "How can I help you today?",
      "What's been happening in your life lately?",
    ];
    
    return conversationStarters[Math.floor(Math.random() * conversationStarters.length)];
  };

  // Handle orb tap with simplified state transitions
  const handleOrbTap = async () => {
    if (isLoading) return;
    
    setError(null);
    
    try {
      switch (orbState) {
        case 'idle':
          // Blue → Green: Generate question and start speaking
          await handleIdleToSpeaking();
          break;
          
        case 'speaking':
          // Green → Red: Stop speaking and start listening
          await handleSpeakingToListening();
          break;
          
        case 'listening':
          // Red → Blue: Stop listening and go idle
          await handleListeningToIdle();
          break;
      }
    } catch (error) {
      console.error('Orb tap error:', error);
      setError('Something went wrong. Please try again.');
      // Fall back to idle state on error
      await handleErrorFallback();
    }
  };

  // Blue → Green: Generate question and start speaking
  const handleIdleToSpeaking = async () => {
    setIsLoading(true);
    setOrbState('speaking');
    
    if (onSpeakingChange) {
      onSpeakingChange(true);
    }
    
    try {
      const question = generateContextualQuestion();
      const response = await claudeApi.sendMessage(question);
      
      // Start TTS
      const settings = ttsService.getSettings();
      if (settings.autoPlay && response.trim()) {
        await ttsService.speak(response);
      }
    } catch (error) {
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Green → Red: Stop speaking and start listening
  const handleSpeakingToListening = async () => {
    setOrbState('listening');
    
    // Stop TTS immediately
    await ttsService.stop();
    
    if (onSpeakingChange) {
      onSpeakingChange(false);
    }
    
    // Start speech recognition
    if (onStartListening) {
      onStartListening();
    }
  };

  // Red → Blue: Stop listening and go idle
  const handleListeningToIdle = async () => {
    setOrbState('idle');
    
    // Stop speech recognition
    if (onStopListening) {
      onStopListening();
    }
  };

  // Error fallback: Go to idle state
  const handleErrorFallback = async () => {
    setOrbState('idle');
    
    // Stop everything
    await ttsService.stop();
    
    if (onSpeakingChange) {
      onSpeakingChange(false);
    }
    
    if (onStopListening) {
      onStopListening();
    }
  };

  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    handleOrbTap,
  }));

  // Update inputText when initialText prop changes (real-time speech updates)
  useEffect(() => {
    setInputText(initialText);
  }, [initialText]);

  // Start auto-send timer when speech recognition completes
  useEffect(() => {
    if (speechCompleted && initialText.trim() && autoSendEnabled && !isLoading) {
      startAutoSendTimer();
    }
  }, [speechCompleted, initialText]);

  // Auto-send countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (autoSendCountdown > 0) {
      interval = setInterval(() => {
        setAutoSendCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [autoSendCountdown]);

  // Auto-send when countdown reaches 0
  useEffect(() => {
    if (autoSendCountdown === 0 && autoSendTimeoutId && inputText.trim()) {
      sendMessage();
    }
  }, [autoSendCountdown]);

  // Set up TTS status listener and load TTS info
  useEffect(() => {
    const handleTtsStatusChange = (status: TTSStatus) => {
      setTtsStatus(status);
      // Update current sentence display
      setCurrentSentence(status.currentSentence);
      
      // Update speaking state based on TTS status
      if (status.isPlaying && status.currentText !== null) {
        // TTS is playing - ensure orb state is speaking
        setOrbState('speaking');
        if (onSpeakingChange) {
          onSpeakingChange(true);
        }
      } else if (!status.isPlaying && status.currentText === null && orbState === 'speaking') {
        // TTS has completed naturally - stay in speaking state until user taps
        if (onSpeakingChange) {
          onSpeakingChange(false);
        }
      }
    };

    const loadTtsInfo = async () => {
      const settings = ttsService.getSettings();
      setCurrentTtsProvider(settings.provider);
      setElevenLabsAvailable(ttsService.isElevenLabsAvailable());
    };

    loadTtsInfo();
    ttsService.addStatusListener(handleTtsStatusChange);
    
    return () => {
      ttsService.removeStatusListener(handleTtsStatusChange);
    };
  }, []);

  // Set up Claude API context with profile information
  useEffect(() => {
    const profileCompletion = getProfileCompletion();
    claudeApi.setContext({
      profile,
      profileCompletion,
      schedule,
      conversationLength: 0,
      onProfileUpdate: handleProfileUpdate,
      onScheduleUpdate: handleScheduleUpdate,
    });
  }, [profile, schedule]);

  // Handle profile updates from Claude conversations
  const handleProfileUpdate = async (field: string, value: any): Promise<void> => {
    try {
      const success = await updateProfileField(field as any, value);
      if (success) {
        // Show notification to user
        const fieldLabel = field.charAt(0).toUpperCase() + field.slice(1);
        setProfileUpdateNotification(`${fieldLabel} updated automatically!`);
        
        // Auto-hide notification after 3 seconds
        setTimeout(() => {
          setProfileUpdateNotification(null);
        }, 3000);

        // Refresh profile data
        await refreshProfile();
      }
    } catch (error) {
      console.error('Error updating profile field:', error);
    }
  };

  // Handle schedule updates from Claude conversations
  const handleScheduleUpdate = async (scheduleData: any): Promise<void> => {
    try {
      if (scheduleData.field && scheduleData.value) {
        // Field-specific update (new format)
        const success = await updateScheduleField(
          scheduleData.field,
          scheduleData.value,
          scheduleData.scheduleType || 'weekday'
        );
        if (success) {
          console.log('✅ Schedule field updated successfully:', scheduleData);
          await refreshSchedule();
        }
      } else {
        // Full schedule update (old format)
        const success = await updateSchedule(scheduleData);
        if (success) {
          console.log('✅ Schedule updated successfully:', scheduleData);
          await refreshSchedule();
        }
      }
    } catch (error) {
      console.error('Error updating schedule:', error);
    }
  };

  // Clear notifications
  const dismissNotification = () => {
    setProfileUpdateNotification(null);
  };


  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const messageToSend = inputText.trim();
    setInputText('');
    setError(null);
    setIsLoading(true);
    
    // Clear auto-send timer and countdown
    if (autoSendTimeoutId) {
      clearTimeout(autoSendTimeoutId);
      setAutoSendTimeoutId(null);
    }
    setAutoSendCountdown(0);
    
    // Clear speech text in parent component to prevent accumulation
    if (onClearText) {
      onClearText();
    }

    try {
      const response = await claudeApi.sendMessage(messageToSend);
      
      // Automatically transition to speaking state (Red → Green)
      setOrbState('speaking');
      
      if (onSpeakingChange) {
        onSpeakingChange(true);
      }
      
      // Auto-play TTS if enabled
      const settings = ttsService.getSettings();
      if (settings.autoPlay && response.trim()) {
        try {
          await ttsService.speak(response);
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
        }
      }
      
    } catch (error) {
      setError('Failed to send message. Please try again.');
      console.error('Chat error:', error);
      // Fall back to idle state on error
      await handleErrorFallback();
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    claudeApi.clearHistory();
    setError(null);
    setCurrentSentence(null);
    
    // Reset orb state to idle
    setOrbState('idle');
    
    // Stop any ongoing speech
    ttsService.stop().catch(console.error);
    
    // Reset speaking state
    if (onSpeakingChange) {
      onSpeakingChange(false);
    }
  };

  const handleSpeakMessage = async (text: string) => {
    try {
      await ttsService.speak(text);
    } catch (error) {
      console.error('TTS speak error:', error);
    }
  };

  const handleStopSpeech = async () => {
    try {
      await ttsService.stop();
    } catch (error) {
      console.error('TTS stop error:', error);
    }
  };

  const toggleAutoPlay = () => {
    const settings = ttsService.getSettings();
    ttsService.updateSettings({ autoPlay: !settings.autoPlay });
  };

  // Toggle TTS provider
  const toggleTtsProvider = () => {
    const newProvider: TTSProvider = currentTtsProvider === 'system' ? 'elevenlabs' : 'system';
    if (newProvider === 'elevenlabs' && !elevenLabsAvailable) {
      Alert.alert(
        'Pro TTS Unavailable',
        'Pro TTS API key is not configured. Please add your API key to use Pro TTS.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    ttsService.switchProvider(newProvider);
    setCurrentTtsProvider(newProvider);
    
    // Show feedback
    const providerName = newProvider === 'elevenlabs' ? 'Pro TTS' : 'Free TTS';
    Alert.alert(
      'TTS Provider Changed',
      `Switched to ${providerName}`,
      [{ text: 'OK', style: 'default' }]
    );
  };

  const startAutoSendTimer = () => {
    // Clear any existing timer
    if (autoSendTimeoutId) {
      clearTimeout(autoSendTimeoutId);
    }
    
    // Start 4-second countdown
    setAutoSendCountdown(4);
    const timeoutId = setTimeout(() => {
      setAutoSendCountdown(0);
    }, 4000);
    
    setAutoSendTimeoutId(timeoutId);
  };

  const retryLastMessage = async () => {
    const lastMessage = claudeApi.getLastUserMessage();
    if (!lastMessage) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await claudeApi.sendMessage(lastMessage);
      
      // Auto-play TTS if enabled
      const settings = ttsService.getSettings();
      if (settings.autoPlay && response.trim()) {
        try {
          await ttsService.speak(response);
        } catch (ttsError) {
          console.error('TTS error:', ttsError);
        }
      }
      
    } catch (error) {
      setError('Failed to retry message. Please try again.');
      console.error('Retry error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      
      
      {/* Profile Completion - Show when profile is incomplete */}
      <ProfileCompletion compact={true} />

      {/* Schedule Visualization - Show current schedule */}
      <ScheduleVisualization schedule={schedule.weekday} compact={true} />

      {/* Profile Update Notification */}
      {profileUpdateNotification && (
        <View style={styles.notificationContainer}>
          <Text style={styles.notificationText}>{profileUpdateNotification}</Text>
          <TouchableOpacity onPress={dismissNotification} style={styles.dismissButton}>
            <Text style={styles.dismissButtonText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={retryLastMessage}>
            <Text style={styles.retryButtonText}>🔄 Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Sentence Display */}
      <View style={styles.sentenceContainer}>
        {currentSentence && (
          <Text style={styles.sentenceText}>"{currentSentence}"</Text>
        )}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Claude is thinking...</Text>
          </View>
        )}
      </View>

      <View style={styles.inputContainer}>
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type your message..."
            placeholderTextColor="rgba(255, 255, 255, 0.5)"
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <View style={styles.inputButtons}>
            <TouchableOpacity
              style={[styles.inputIconButton, (!inputText.trim() || isLoading) && styles.disabledIconButton]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              <Feather name="send" size={20} color={(!inputText.trim() || isLoading) ? '#8E8E93' : '#00ccff'} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.micButton}
              onPress={isListening ? onStopListening : onStartListening}
            >
              <Text style={styles.micButtonText}>
                {isListening ? '🔴' : '🎤'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.buttonRow}>
          <TouchableOpacity 
            style={[
              styles.ttsToggleButton,
              !elevenLabsAvailable && styles.ttsToggleButtonDisabled
            ]} 
            onPress={toggleTtsProvider}
            disabled={!elevenLabsAvailable && currentTtsProvider === 'system'}
          >
            <View style={styles.ttsToggleOptions}>
              <Text style={[
                styles.ttsToggleOption,
                currentTtsProvider === 'system' && styles.ttsToggleOptionActive
              ]}>
                Free
              </Text>
              <Text style={styles.ttsToggleDivider}>|</Text>
              <Text style={[
                styles.ttsToggleOption,
                currentTtsProvider === 'elevenlabs' && styles.ttsToggleOptionActive,
                !elevenLabsAvailable && styles.ttsToggleOptionDisabled
              ]}>
                Pro
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
            <Text style={styles.clearButtonText}>Clear History</Text>
          </TouchableOpacity>
        </View>
      </View>

    </View>
  );
});

export default ClaudeChat;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  errorContainer: {
    backgroundColor: '#FFE6E6',
    borderWidth: 1,
    borderColor: '#FF3B30',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    flex: 1,
    fontWeight: 'bold',
  },
  retryButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  notificationContainer: {
    backgroundColor: 'rgba(0, 204, 255, 0.15)',
    borderWidth: 1,
    borderColor: '#00ccff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  habitNotificationContainer: {
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    borderColor: '#4CAF50',
  },
  notificationText: {
    color: '#00ccff',
    fontSize: 14,
    flex: 1,
    fontWeight: '600',
  },
  dismissButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dismissButtonText: {
    color: '#00ccff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sentenceContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    minHeight: 100,
  },
  sentenceText: {
    fontSize: 18,
    lineHeight: 28,
    color: '#FFFFFF',
    textAlign: 'center',
    paddingHorizontal: 20,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    marginBottom: 15,
  },
  loadingText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#FFFFFF',
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
    paddingTop: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 15,
    marginTop: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
    position: 'relative',
  },
  textInput: {
    borderWidth: 2,
    borderColor: '#00ccff',
    borderRadius: 12,
    padding: 15,
    paddingRight: 100,
    fontSize: 16,
    maxHeight: 100,
    textAlignVertical: 'top',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    flex: 1,
  },
  inputButtons: {
    position: 'absolute',
    right: 8,
    bottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  inputIconButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  disabledIconButton: {
    opacity: 0.6,
  },
  micButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 36,
    minHeight: 36,
  },
  micButtonText: {
    fontSize: 20,
    color: '#00ccff',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: '#8E8E93',
    opacity: 0.6,
  },
  ttsToggleContainer: {
    marginTop: 15,
    alignItems: 'center',
  },
  ttsToggleButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  ttsToggleButtonDisabled: {
    opacity: 0.6,
  },
  ttsToggleLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ttsToggleOptions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ttsToggleOption: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  ttsToggleOptionActive: {
    color: '#00ccff',
    fontWeight: '700',
  },
  ttsToggleOptionDisabled: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  ttsToggleDivider: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 14,
  },
});