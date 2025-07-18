import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Switch, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { settingsService, AppSettings } from '../services/settingsService';

export default function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(settingsService.getSettings());

  useEffect(() => {
    const handleSettingsChange = (newSettings: AppSettings) => {
      setSettings(newSettings);
    };

    settingsService.addListener(handleSettingsChange);
    return () => settingsService.removeListener(handleSettingsChange);
  }, []);

  const updateSetting = async (key: keyof AppSettings, value: any) => {
    await settingsService.updateSetting(key, value);
  };

  const resetSettings = async () => {
    Alert.alert(
      'Reset Settings',
      'Are you sure you want to reset all settings to default values?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            await settingsService.resetSettings();
            Alert.alert('Settings Reset', 'All settings have been reset to default values.');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Music</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Feather name="music" size={20} color="#00ccff" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Auto-play Music</Text>
              <Text style={styles.settingDescription}>
                Automatically play music when entering the home screen
              </Text>
            </View>
          </View>
          <Switch
            value={settings.musicAutoPlay}
            onValueChange={(value) => updateSetting('musicAutoPlay', value)}
            trackColor={{ false: '#767577', true: '#00ccff' }}
            thumbColor={settings.musicAutoPlay ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Voice & Speech</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Feather name="volume-2" size={20} color="#00ccff" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Auto-play TTS</Text>
              <Text style={styles.settingDescription}>
                Automatically play Claude's responses using text-to-speech
              </Text>
            </View>
          </View>
          <Switch
            value={settings.ttsAutoPlay}
            onValueChange={(value) => updateSetting('ttsAutoPlay', value)}
            trackColor={{ false: '#767577', true: '#00ccff' }}
            thumbColor={settings.ttsAutoPlay ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Feather name="bell" size={20} color="#00ccff" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Enable Notifications</Text>
              <Text style={styles.settingDescription}>
                Receive notifications for reminders and updates
              </Text>
            </View>
          </View>
          <Switch
            value={settings.notificationsEnabled}
            onValueChange={(value) => updateSetting('notificationsEnabled', value)}
            trackColor={{ false: '#767577', true: '#00ccff' }}
            thumbColor={settings.notificationsEnabled ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Appearance</Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingContent}>
            <Feather name="moon" size={20} color="#00ccff" />
            <View style={styles.settingText}>
              <Text style={styles.settingLabel}>Dark Mode</Text>
              <Text style={styles.settingDescription}>
                Use dark theme for better night viewing
              </Text>
            </View>
          </View>
          <Switch
            value={settings.darkMode}
            onValueChange={(value) => updateSetting('darkMode', value)}
            trackColor={{ false: '#767577', true: '#00ccff' }}
            thumbColor={settings.darkMode ? '#ffffff' : '#f4f3f4'}
          />
        </View>
      </View>

      <View style={styles.section}>
        <TouchableOpacity style={styles.resetButton} onPress={resetSettings}>
          <Feather name="refresh-cw" size={20} color="#ff6b6b" />
          <Text style={styles.resetButtonText}>Reset All Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#00ccff',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    marginBottom: 12,
  },
  settingContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 15,
    flex: 1,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#888888',
    lineHeight: 18,
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#ff6b6b',
    marginLeft: 10,
  },
});