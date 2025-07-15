import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Modal, ScrollView, Alert } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Slider } from '@react-native-community/slider';
import { ttsService, TTSSettings } from '../services/ttsService';
import * as Speech from 'expo-speech';

interface TTSSettingsProps {
  visible: boolean;
  onClose: () => void;
}

export default function TTSSettingsModal({ visible, onClose }: TTSSettingsProps) {
  const [settings, setSettings] = useState<TTSSettings>(ttsService.getSettings());
  const [availableVoices, setAvailableVoices] = useState<Speech.Voice[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadVoices();
      setSettings(ttsService.getSettings());
    }
  }, [visible]);

  const loadVoices = async () => {
    try {
      setIsLoading(true);
      const voices = await ttsService.getAvailableVoices();
      setAvailableVoices(voices);
    } catch (error) {
      console.error('Failed to load voices:', error);
      Alert.alert('Error', 'Failed to load available voices');
    } finally {
      setIsLoading(false);
    }
  };

  const updateSetting = (key: keyof TTSSettings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    ttsService.updateSettings(newSettings);
  };

  const testVoice = async () => {
    try {
      await ttsService.testCurrentSettings();
    } catch (error) {
      console.error('Voice test error:', error);
      Alert.alert('Error', 'Failed to test voice');
    }
  };

  const resetToDefaults = () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all TTS settings to defaults?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          onPress: () => {
            const defaultSettings: TTSSettings = {
              rate: 1.0,
              pitch: 1.0,
              voice: undefined,
              language: 'en-US',
              autoPlay: true
            };
            setSettings(defaultSettings);
            ttsService.updateSettings(defaultSettings);
          }
        }
      ]
    );
  };

  const getVoicesForLanguage = (language: string) => {
    return availableVoices.filter(voice => 
      voice.language === language || 
      voice.language.startsWith(language.split('-')[0])
    );
  };

  const languages = [
    { code: 'en-US', name: '🇺🇸 English (US)' },
    { code: 'en-GB', name: '🇬🇧 English (UK)' },
    { code: 'en-AU', name: '🇦🇺 English (Australia)' },
    { code: 'en-CA', name: '🇨🇦 English (Canada)' },
    { code: 'es-ES', name: '🇪🇸 Spanish' },
    { code: 'fr-FR', name: '🇫🇷 French' },
    { code: 'de-DE', name: '🇩🇪 German' },
    { code: 'it-IT', name: '🇮🇹 Italian' },
    { code: 'pt-BR', name: '🇧🇷 Portuguese' },
    { code: 'ja-JP', name: '🇯🇵 Japanese' },
    { code: 'ko-KR', name: '🇰🇷 Korean' },
    { code: 'zh-CN', name: '🇨🇳 Chinese' },
  ];

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>🔊 Speech Settings</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Auto-play Setting */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Auto-play Responses</Text>
            <TouchableOpacity
              style={[styles.toggleButton, settings.autoPlay && styles.toggleActive]}
              onPress={() => updateSetting('autoPlay', !settings.autoPlay)}
            >
              <Text style={[styles.toggleText, settings.autoPlay && styles.toggleTextActive]}>
                {settings.autoPlay ? '🔊 Enabled' : '🔇 Disabled'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Language Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Language</Text>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={settings.language}
                onValueChange={(value) => updateSetting('language', value)}
                style={styles.picker}
              >
                {languages.map(lang => (
                  <Picker.Item key={lang.code} label={lang.name} value={lang.code} />
                ))}
              </Picker>
            </View>
          </View>

          {/* Voice Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Voice</Text>
            {isLoading ? (
              <Text style={styles.loadingText}>Loading voices...</Text>
            ) : (
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={settings.voice}
                  onValueChange={(value) => updateSetting('voice', value)}
                  style={styles.picker}
                >
                  <Picker.Item label="Default Voice" value={undefined} />
                  {getVoicesForLanguage(settings.language).map(voice => (
                    <Picker.Item 
                      key={voice.identifier} 
                      label={`${voice.name} (${voice.quality})`} 
                      value={voice.identifier} 
                    />
                  ))}
                </Picker>
              </View>
            )}
          </View>

          {/* Speech Rate */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Speech Rate: {settings.rate.toFixed(1)}x</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              value={settings.rate}
              onValueChange={(value) => updateSetting('rate', value)}
              step={0.1}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#007AFF"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Slow</Text>
              <Text style={styles.sliderLabel}>Fast</Text>
            </View>
          </View>

          {/* Speech Pitch */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Speech Pitch: {settings.pitch.toFixed(1)}x</Text>
            <Slider
              style={styles.slider}
              minimumValue={0.5}
              maximumValue={2.0}
              value={settings.pitch}
              onValueChange={(value) => updateSetting('pitch', value)}
              step={0.1}
              minimumTrackTintColor="#007AFF"
              maximumTrackTintColor="#E0E0E0"
              thumbTintColor="#007AFF"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>Low</Text>
              <Text style={styles.sliderLabel}>High</Text>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonSection}>
            <TouchableOpacity style={styles.testButton} onPress={testVoice}>
              <Text style={styles.testButtonText}>🎤 Test Voice</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.resetButton} onPress={resetToDefaults}>
              <Text style={styles.resetButtonText}>🔄 Reset to Defaults</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    backgroundColor: '#E0E0E0',
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  toggleButton: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleText: {
    fontSize: 16,
    color: '#666',
    fontWeight: 'bold',
  },
  toggleTextActive: {
    color: 'white',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    backgroundColor: '#F8F8F8',
  },
  picker: {
    height: 50,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
  },
  sliderLabel: {
    fontSize: 12,
    color: '#666',
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  buttonSection: {
    marginTop: 20,
    gap: 15,
  },
  testButton: {
    backgroundColor: '#007AFF',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  testButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  resetButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});