import React, { useState, useRef } from 'react';
import { StyleSheet, ScrollView, KeyboardAvoidingView, Platform, View, Text } from 'react-native';
import SpeechRecognition from '../components/SpeechRecognition';
import ClaudeChat from '../components/ClaudeChat';
import ProfileIcon from '../components/ProfileIcon';
import TimeMusicSuggestion from '../components/TimeMusicSuggestion';
import { ScheduleVisualization } from '../components/ScheduleVisualization';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen() {
  const [speechText, setSpeechText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const speechRecognitionRef = useRef<any>(null);
  const claudeChatRef = useRef<any>(null);
  const { schedule } = useAuth();

  const handleSpeechTextChange = (newText: string) => {
    console.log('🔥 HomeScreen handleSpeechTextChange - newText:', newText);
    setSpeechText(newText);
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
    console.log('🔥 HomeScreen handleClearText called!');
    setSpeechText('');
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
      
      {/* Current Daily Schedule Widget */}
      {schedule && (schedule.weekday || schedule.weekend) && (() => {
        const currentSchedule = schedule.weekday || schedule.weekend;
        const scheduleItems = [
          currentSchedule?.wake_time,
          currentSchedule?.breakfast_time,
          currentSchedule?.lunch_time,
          currentSchedule?.dinner_time,
          currentSchedule?.sleep_time,
        ];
        const setTimes = scheduleItems.filter(time => time).length;
        const completionPercentage = (setTimes / scheduleItems.length) * 100;
        
        return completionPercentage < 100 ? (
          <View style={styles.scheduleWidgetContainer}>
            <ScheduleVisualization 
              schedule={currentSchedule} 
              compact={true}
              title="Daily Schedule"
            />
          </View>
        ) : null;
      })()}

      {/* Target Daily Schedule Widget */}
      {schedule && (schedule.weekday || schedule.weekend) && (() => {
        const currentSchedule = schedule.weekday || schedule.weekend;
        const targetScheduleItems = [
          currentSchedule?.target_wake_time,
          currentSchedule?.target_breakfast_time,
          currentSchedule?.target_lunch_time,
          currentSchedule?.target_dinner_time,
          currentSchedule?.target_sleep_time,
        ];
        const setTargetTimes = targetScheduleItems.filter(time => time).length;
        const targetCompletionPercentage = (setTargetTimes / targetScheduleItems.length) * 100;
        
        return targetCompletionPercentage < 100 ? (
          <View style={styles.targetScheduleWidgetContainer}>
            <ScheduleVisualization 
              schedule={currentSchedule} 
              compact={true}
              showTarget={true}
              title="Target Schedule"
            />
          </View>
        ) : null;
      })()}
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        <SpeechRecognition 
          onTextChange={handleSpeechTextChange} 
          text={speechText}
          onListeningChange={setIsListening}
          ref={speechRecognitionRef}
          isSpeaking={isSpeaking}
          onOrbTap={handleOrbTap}
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
          onSpeakingChange={setIsSpeaking}
          ref={claudeChatRef}
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
  scheduleWidgetContainer: {
    position: 'absolute',
    top: 160,
    left: 20,
    right: 20,
    zIndex: 998,
  },
  targetScheduleWidgetContainer: {
    position: 'absolute',
    top: 240,
    left: 20,
    right: 20,
    zIndex: 997,
  },
});