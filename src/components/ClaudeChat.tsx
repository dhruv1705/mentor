import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { claudeApi, ClaudeMessage } from '../services/claudeApi';
import { ttsService, TTSStatus } from '../services/ttsService';
import { useAuth } from '../contexts/AuthContext';
import { ProfileCompletion } from './ProfileCompletion';

interface ClaudeChatProps {
  initialText: string;
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
  onClearText?: () => void;
}

export default function ClaudeChat({ initialText, isListening, onStartListening, onStopListening, onClearText }: ClaudeChatProps) {
  const [inputText, setInputText] = useState(initialText);
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ClaudeMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [ttsStatus, setTtsStatus] = useState<TTSStatus>(ttsService.getStatus());
  const [profileUpdateNotification, setProfileUpdateNotification] = useState<string | null>(null);

  const { profile, updateProfileField, getProfileCompletion, refreshProfile } = useAuth();

  // Update inputText when initialText prop changes (real-time speech updates)
  useEffect(() => {
    setInputText(initialText);
  }, [initialText]);

  // Set up TTS status listener
  useEffect(() => {
    const handleTtsStatusChange = (status: TTSStatus) => {
      setTtsStatus(status);
    };

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
      conversationLength: conversation.length,
      onProfileUpdate: handleProfileUpdate,
    });
  }, [profile, conversation.length]);

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

    // Add user message to local conversation display
    const userMessage: ClaudeMessage = { role: 'user', content: messageToSend };
    setConversation(prev => [...prev, userMessage]);

    try {
      const response = await claudeApi.sendMessage(messageToSend);
      
      // Add assistant response to local conversation display
      const assistantMessage: ClaudeMessage = { role: 'assistant', content: response };
      setConversation(prev => [...prev, assistantMessage]);
      
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
    setConversation([]);
    claudeApi.clearHistory();
    setError(null);
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

  const retryLastMessage = async () => {
    if (conversation.length === 0) return;
    
    // Find the last user message
    const lastUserMessage = [...conversation].reverse().find(msg => msg.role === 'user');
    if (!lastUserMessage) return;

    setError(null);
    setIsLoading(true);

    try {
      const response = await claudeApi.sendMessage(lastUserMessage.content);
      
      // Add assistant response to local conversation display
      const assistantMessage: ClaudeMessage = { role: 'assistant', content: response };
      setConversation(prev => [...prev, assistantMessage]);
      
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

      <ScrollView style={styles.conversationContainer} showsVerticalScrollIndicator={false}>
        {conversation.map((message, index) => (
          <View
            key={index}
            style={[
              styles.messageContainer,
              message.role === 'user' ? styles.userMessage : styles.assistantMessage
            ]}
          >
            <View style={styles.messageHeader}>
              <Text style={styles.messageRole}>
                {message.role === 'user' ? '👤 You' : '🤖 Claude'}
              </Text>
              {message.role === 'assistant' && (
                <View style={styles.ttsControls}>
                  <TouchableOpacity
                    style={styles.ttsButton}
                    onPress={() => handleSpeakMessage(message.content)}
                    disabled={ttsStatus.isPlaying}
                  >
                    <Text style={styles.ttsButtonText}>
                      {ttsStatus.isPlaying && ttsStatus.currentText === message.content ? '🔊' : '🔉'}
                    </Text>
                  </TouchableOpacity>
                  {ttsStatus.isPlaying && ttsStatus.currentText === message.content && (
                    <TouchableOpacity
                      style={styles.ttsButton}
                      onPress={handleStopSpeech}
                    >
                      <Text style={styles.ttsButtonText}>⏹️</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
            <Text style={styles.messageText}>{message.content}</Text>
          </View>
        ))}
        
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#007AFF" />
            <Text style={styles.loadingText}>Claude is thinking...</Text>
          </View>
        )}
      </ScrollView>

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
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.disabledButton]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>📤 Send</Text>
          </TouchableOpacity>
          
          {conversation.length > 0 && (
            <TouchableOpacity style={styles.clearButton} onPress={clearConversation}>
              <Text style={styles.clearButtonText}>🗑️ Clear Chat</Text>
            </TouchableOpacity>
          )}
        </View>
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
  conversationContainer: {
    flex: 1,
    marginBottom: 15,
    maxHeight: 300,
  },
  messageContainer: {
    marginBottom: 15,
    padding: 12,
    borderRadius: 12,
    maxWidth: '85%',
  },
  userMessage: {
    backgroundColor: '#00ccff',
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  messageRole: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 4,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#FFFFFF',
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
    paddingRight: 60,
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
  sendButton: {
    backgroundColor: '#00ccff',
    paddingHorizontal: 25,
    paddingVertical: 15,
    borderRadius: 12,
    flex: 1,
    marginRight: 10,
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  clearButton: {
    backgroundColor: '#FF9500',
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderRadius: 12,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#8E8E93',
    opacity: 0.6,
  },
  messageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  ttsControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ttsButton: {
    backgroundColor: '#00ccff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginLeft: 4,
  },
  ttsButtonText: {
    color: 'white',
    fontSize: 12,
  },
});