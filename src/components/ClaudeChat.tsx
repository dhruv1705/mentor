import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { claudeApi, ClaudeMessage } from '../services/claudeApi';
import { ttsService, TTSStatus, TTSProvider, TTSSettings } from '../services/ttsService';
import { useAuth } from '../contexts/AuthContext';
import { ProfileCompletion } from './ProfileCompletion';
import { Feather } from '@expo/vector-icons';

interface ClaudeChatProps {
  initialText: string;
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onClearText?: () => void;
  speechCompleted?: boolean;
}

// Utility function to parse text into sentences
const parseSentences = (text: string): string[] => {
  // Split by sentence-ending punctuation followed by whitespace or end of string
  const sentences = text.split(/(?<=[.!?])\s+/)
    .filter(sentence => sentence.trim().length > 0)
    .map(sentence => sentence.trim());
  
  return sentences;
};

export default function ClaudeChat({ initialText, isListening, onStartListening, onStopListening, onClearText, speechCompleted }: ClaudeChatProps) {
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

  const { profile, updateProfileField, getProfileCompletion, refreshProfile } = useAuth();

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
      conversationLength: 0,
      onProfileUpdate: handleProfileUpdate,
    });
  }, [profile]);

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

  // Clear profile update notification
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
    } finally {
      setIsLoading(false);
    }
  };

  const clearConversation = () => {
    claudeApi.clearHistory();
    setError(null);
    setCurrentSentence(null);
    // Stop any ongoing speech
    ttsService.stop().catch(console.error);
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
        'ElevenLabs Unavailable',
        'ElevenLabs API key is not configured. Please add your API key to use ElevenLabs TTS.',
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }
    
    ttsService.switchProvider(newProvider);
    setCurrentTtsProvider(newProvider);
    
    // Show feedback
    const providerName = newProvider === 'elevenlabs' ? 'ElevenLabs' : 'System TTS';
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
          <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
            <Text style={styles.clearButtonText}>🗑️ Clear History</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* TTS Provider Toggle - Moved below input area */}
      <View style={styles.ttsToggleContainer}>
        <TouchableOpacity 
          style={[
            styles.ttsToggleButton,
            !elevenLabsAvailable && styles.ttsToggleButtonDisabled
          ]} 
          onPress={toggleTtsProvider}
          disabled={!elevenLabsAvailable && currentTtsProvider === 'system'}
        >
          <Text style={styles.ttsToggleLabel}>TTS:</Text>
          <View style={styles.ttsToggleOptions}>
            <Text style={[
              styles.ttsToggleOption,
              currentTtsProvider === 'system' && styles.ttsToggleOptionActive
            ]}>
              📱 System
            </Text>
            <Text style={styles.ttsToggleDivider}>|</Text>
            <Text style={[
              styles.ttsToggleOption,
              currentTtsProvider === 'elevenlabs' && styles.ttsToggleOptionActive,
              !elevenLabsAvailable && styles.ttsToggleOptionDisabled
            ]}>
              🎭 ElevenLabs
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

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
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearButtonText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
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