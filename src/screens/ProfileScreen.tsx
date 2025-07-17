import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Switch, Alert, TextInput, Modal } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ProfileIcon from '../components/ProfileIcon';
import { ttsService } from '../services/ttsService';
import { useAuth } from '../contexts/AuthContext';
import { ProfileCompletion } from '../components/ProfileCompletion';
import { CollapsibleSection } from '../components/CollapsibleSection';
import { GENDER_OPTIONS, ProfileUpdateData } from '../types/profile';

export default function ProfileScreen() {
  const [settings, setSettings] = useState(ttsService.getSettings());
  const { user, profile, signOut, updateProfileField } = useAuth();
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  const updateTTSSetting = (key: keyof typeof settings, value: any) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    ttsService.updateSettings({ [key]: value });
  };

  const testTTSSettings = async () => {
    try {
      await ttsService.testCurrentSettings();
    } catch (error) {
      console.error('TTS test error:', error);
      Alert.alert('Error', 'Failed to test voice settings');
    }
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

  const handleFieldEdit = (field: string) => {
    const currentValue = profile?.[field as keyof typeof profile] || '';
    setEditValue(String(currentValue));
    setEditingField(field);
    setModalVisible(true);
  };

  const handleSaveField = async () => {
    if (!editingField) return;

    let processedValue: any = editValue;

    // Process the value based on field type
    if (editingField === 'age') {
      processedValue = parseInt(editValue);
      if (isNaN(processedValue) || processedValue < 1 || processedValue > 120) {
        Alert.alert('Invalid Age', 'Please enter a valid age between 1 and 120');
        return;
      }
    } else if (editingField === 'height') {
      processedValue = parseInt(editValue);
      if (isNaN(processedValue) || processedValue < 50 || processedValue > 300) {
        Alert.alert('Invalid Height', 'Please enter a valid height between 50 and 300 cm');
        return;
      }
    }

    const success = await updateProfileField(editingField as keyof ProfileUpdateData, processedValue);
    
    if (success) {
      setModalVisible(false);
      setEditingField(null);
      setEditValue('');
    } else {
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    }
  };

  const renderEditModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit {editingField}</Text>
          
          {editingField === 'gender' ? (
            <View style={styles.genderOptions}>
              {GENDER_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.genderOption,
                    editValue === option.value && styles.genderOptionSelected
                  ]}
                  onPress={() => setEditValue(option.value)}
                >
                  <Text style={[
                    styles.genderOptionText,
                    editValue === option.value && styles.genderOptionTextSelected
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : (
            <TextInput
              style={styles.modalInput}
              value={editValue}
              onChangeText={setEditValue}
              placeholder={`Enter ${editingField}`}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              keyboardType={editingField === 'age' || editingField === 'height' ? 'numeric' : 'default'}
            />
          )}
          
          <View style={styles.modalButtons}>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonCancel]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.modalButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalButton, styles.modalButtonSave]}
              onPress={handleSaveField}
            >
              <Text style={styles.modalButtonText}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <ProfileIcon />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.profileImageContainer}>
            <Feather name="user" size={60} color="#00ccff" />
          </View>
          <Text style={styles.profileName}>
            {(profile?.name?.trim() && profile.name.trim() !== 'Voice Assistant User') 
              ? profile.name.trim() 
              : user?.user_metadata?.full_name || 'User'}
          </Text>
          <Text style={styles.profileEmail}>{user?.email || 'user@voiceassistant.app'}</Text>
        </View>

        {/* Profile Completion */}
        <CollapsibleSection title="Profile Information" defaultExpanded={true} icon="👤">
          <ProfileCompletion onFieldPress={handleFieldEdit} collapsible={true} />
        </CollapsibleSection>


        {/* TTS Settings Section */}
        <CollapsibleSection title="Text-to-Speech Settings" defaultExpanded={true} icon="🔊">
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

          <TouchableOpacity style={styles.testButton} onPress={testTTSSettings}>
            <Text style={styles.testButtonText}>🎤 Test Voice Settings</Text>
          </TouchableOpacity>
        </CollapsibleSection>

        {/* App Settings Section */}
        <CollapsibleSection title="App Settings" defaultExpanded={false} icon="⚙️">
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
        </CollapsibleSection>

        {/* About Section */}
        <CollapsibleSection title="About" defaultExpanded={false} icon="ℹ️">
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
        </CollapsibleSection>

        {/* Account Section */}
        <CollapsibleSection title="Account" defaultExpanded={false} icon="👤">
          <TouchableOpacity style={styles.menuItem} onPress={handleSignOut}>
            <Feather name="log-out" size={20} color="#ff4757" style={styles.menuIcon} />
            <Text style={[styles.menuText, { color: '#ff4757' }]}>Sign Out</Text>
          </TouchableOpacity>
        </CollapsibleSection>
      </ScrollView>
      {renderEditModal()}
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
    marginBottom: 12,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1a1a1a',
    borderRadius: 16,
    padding: 24,
    width: '80%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 20,
    textAlign: 'center',
    textTransform: 'capitalize',
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#FFFFFF',
    marginBottom: 20,
  },
  genderOptions: {
    marginBottom: 20,
  },
  genderOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  genderOptionSelected: {
    backgroundColor: 'rgba(0, 204, 255, 0.2)',
    borderColor: '#00ccff',
  },
  genderOptionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
  },
  genderOptionTextSelected: {
    color: '#00ccff',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalButtonSave: {
    backgroundColor: '#00ccff',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  testButton: {
    backgroundColor: '#00ccff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});