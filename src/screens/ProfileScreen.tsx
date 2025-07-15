import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ProfileIcon from '../components/ProfileIcon';
import { ttsService } from '../services/ttsService';
import { useAuth } from '../contexts/AuthContext';

export default function ProfileScreen() {
  const [settings, setSettings] = useState(ttsService.getSettings());
  const { user, signOut } = useAuth();

  const updateTTSSetting = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    ttsService.updateSettings({ [key]: value });
  };

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: signOut },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ProfileIcon />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Feather name="user" size={60} color="#00ccff" />
          </View>
          <Text style={styles.profileName}>{user?.user_metadata?.full_name || 'Voice Assistant User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@voiceassistant.app'}</Text>
        </View>

        {/* TTS Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>🔊 Text-to-Speech Settings</Text>
          
          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Auto-play Responses</Text>
            <Switch
              value={settings.autoPlay}
              onValueChange={(value) => updateTTSSetting('autoPlay', value)}
              trackColor={{ false: '#767577', true: '#00ccff' }}
              thumbColor={settings.autoPlay ? '#ffffff' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Speech Rate</Text>
            <View style={styles.rateContainer}>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => updateTTSSetting('rate', Math.max(0.1, settings.rate - 0.1))}
              >
                <Text style={styles.rateButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.rateValue}>{settings.rate.toFixed(1)}x</Text>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => updateTTSSetting('rate', Math.min(2.0, settings.rate + 0.1))}
              >
                <Text style={styles.rateButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Speech Pitch</Text>
            <View style={styles.rateContainer}>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => updateTTSSetting('pitch', Math.max(0.5, settings.pitch - 0.1))}
              >
                <Text style={styles.rateButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.rateValue}>{settings.pitch.toFixed(1)}</Text>
              <TouchableOpacity
                style={styles.rateButton}
                onPress={() => updateTTSSetting('pitch', Math.min(2.0, settings.pitch + 0.1))}
              >
                <Text style={styles.rateButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.settingItem}>
            <Text style={styles.settingLabel}>Language</Text>
            <Text style={styles.settingValue}>{settings.language}</Text>
          </View>
        </View>

        {/* App Settings Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>⚙️ App Settings</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="moon" size={20} color="#00ccff" style={styles.menuIcon} />
            <Text style={styles.menuText}>Theme</Text>
            <Text style={styles.menuValue}>Dark</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="globe" size={20} color="#00ccff" style={styles.menuIcon} />
            <Text style={styles.menuText}>Language</Text>
            <Text style={styles.menuValue}>English</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="bell" size={20} color="#00ccff" style={styles.menuIcon} />
            <Text style={styles.menuText}>Notifications</Text>
            <Text style={styles.menuValue}>Enabled</Text>
          </TouchableOpacity>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ℹ️ About</Text>
          
          <TouchableOpacity style={styles.menuItem}>
            <Feather name="info" size={20} color="#00ccff" style={styles.menuIcon} />
            <Text style={styles.menuText}>App Version</Text>
            <Text style={styles.menuValue}>1.0.0</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="help-circle" size={20} color="#00ccff" style={styles.menuIcon} />
            <Text style={styles.menuText}>Help & Support</Text>
            <Feather name="chevron-right" size={16} color="#888" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem}>
            <Feather name="shield" size={20} color="#00ccff" style={styles.menuIcon} />
            <Text style={styles.menuText}>Privacy Policy</Text>
            <Feather name="chevron-right" size={16} color="#888" />
          </TouchableOpacity>
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>👤 Account</Text>
          
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Feather name="log-out" size={20} color="#ff4757" style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: '#ff4757' }]}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
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
    paddingTop: 100, // Account for ProfileIcon
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(0, 204, 255, 0.1)',
    borderWidth: 2,
    borderColor: '#00ccff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 15,
  },
  profileName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  settingLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  settingValue: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  rateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rateButton: {
    backgroundColor: '#00ccff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rateButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  rateValue: {
    color: '#FFFFFF',
    fontSize: 16,
    marginHorizontal: 15,
    minWidth: 40,
    textAlign: 'center',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  menuIcon: {
    marginRight: 15,
  },
  menuText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  menuValue: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
});