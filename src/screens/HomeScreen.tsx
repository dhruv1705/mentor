import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, View, Text } from 'react-native';
import SpeechRecognition from '../components/SpeechRecognition';
import ClaudeChat from '../components/ClaudeChat';
import ProfileIcon from '../components/ProfileIcon';
import TimeMusicSuggestion from '../components/TimeMusicSuggestion';

export default function HomeScreen() {
  const [speechText, setSpeechText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechCompleted, setSpeechCompleted] = useState(false);
  const [speechCountdown, setSpeechCountdown] = useState(0);
  const speechRecognitionRef = useRef<any>(null);
  const claudeChatRef = useRef<any>(null);

  const handleSpeechTextChange = (newText: string) => {
    setSpeechText(newText);
    setSpeechCompleted(false);
  };

  const handleSpeechComplete = () => {
    setSpeechCompleted(true);
  };

  const handleCountdownChange = (countdown: number) => {
    setSpeechCountdown(countdown);
  };

  const handleStartListening = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.startListening();
    }
  };

  const handleStopListening = () => {
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.stopListening();
    }
  };

  const handleClearText = () => {
    setSpeechText('');
    setSpeechCompleted(false);
    if (speechRecognitionRef.current) {
      speechRecognitionRef.current.clearText();
    }
  };

  const handleOrbTap = () => {
    if (claudeChatRef.current) {
      claudeChatRef.current.handleOrbTap();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ProfileIcon />
      
      <View style={styles.musicButtonContainer}>
        <TimeMusicSuggestion />
      </View>
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <SpeechRecognition 
          onTextChange={handleSpeechTextChange} 
          text={speechText}
          onListeningChange={setIsListening}
          onSpeechComplete={handleSpeechComplete}
          ref={speechRecognitionRef}
          isSpeaking={isSpeaking}
          onOrbTap={handleOrbTap}
          onCountdownChange={handleCountdownChange}
        />
        
        {/* Show getting started message based on orb state */}
        {!speechText && (
          <View style={styles.gettingStartedContainer}>
            {isSpeaking ? (
              <Text style={styles.gettingStartedText}>Tap the green orb to say something</Text>
            ) : !isListening ? (
              <Text style={styles.gettingStartedText}>Tap the Blue Orb To get started</Text>
            ) : null}
          </View>
        )}
        
        <ClaudeChat 
          initialText={speechText}
          isListening={isListening}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onClearText={handleClearText}
          speechCompleted={speechCompleted}
          onSpeakingChange={setIsSpeaking}
          ref={claudeChatRef}
          speechCountdown={speechCountdown}
        />
      </ScrollView>
    </KeyboardAvoidingView>
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
    alignItems: 'center',
    paddingBottom: 40,
    flexGrow: 1,
    width: '100%',
  },
  musicButtonContainer: {
    position: 'absolute',
    top: 120,
    right: 20,
    zIndex: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gettingStartedContainer: {
    marginTop: 30,
    marginBottom: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gettingStartedText: {
    fontSize: 16,
    color: '#888888',
    textAlign: 'center',
    fontWeight: '500',
    opacity: 0.8,
  },
});