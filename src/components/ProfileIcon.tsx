import React, { useState, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Modal, Animated, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from '@react-native-community/blur';

export default function ProfileIcon() {
  const navigation = useNavigation();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const toggleProfileMenu = () => {
    if (showProfileMenu) {
      // Hide menu
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }).start(() => setShowProfileMenu(false));
    } else {
      // Show menu
      setShowProfileMenu(true);
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    }
  };

  const navigateToScreen = (screenName: string) => {
    toggleProfileMenu(); // Close menu first
    setTimeout(() => {
      navigation.navigate(screenName as never);
    }, 200);
  };

  return (
    <>
      {/* Profile Icon */}
      <TouchableOpacity 
        style={styles.profileIcon}
        onPress={toggleProfileMenu}
        activeOpacity={0.7}
      >
        <Feather name="user" size={20} color="#00ccff" />
      </TouchableOpacity>

      {/* Profile Menu Modal */}
      <Modal
        visible={showProfileMenu}
        transparent={true}
        animationType="none"
        onRequestClose={toggleProfileMenu}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={toggleProfileMenu}
        >
          <Animated.View 
            style={[
              styles.profileMenuContainer,
              {
                opacity: fadeAnim,
                transform: [{
                  scale: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  })
                }]
              }
            ]}
          >
            {Platform.OS === 'ios' ? (
              <BlurView
                style={styles.profileMenu}
                blurType="dark"
                blurAmount={10}
                reducedTransparencyFallbackColor="rgba(42, 54, 66, 0.95)"
              >
                <View style={styles.profileMenuContent}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Home')}
                >
                  <Text style={styles.menuItemIcon}>⌂</Text>
                  <Text style={styles.menuItemText}>Home</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Music')}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Feather name="music" size={18} color="#00ccff" />
                  </View>
                  <Text style={styles.menuItemText}>Music</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Schedule')}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Feather name="calendar" size={18} color="#00ccff" />
                  </View>
                  <Text style={styles.menuItemText}>Schedule</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Profile')}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Feather name="user" size={18} color="#00ccff" />
                  </View>
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>
                </View>
              </BlurView>
            ) : (
              <View style={styles.profileMenu}>
                <View style={styles.profileMenuContent}>
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Home')}
                >
                  <Text style={styles.menuItemIcon}>⌂</Text>
                  <Text style={styles.menuItemText}>Home</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Music')}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Feather name="music" size={18} color="#00ccff" />
                  </View>
                  <Text style={styles.menuItemText}>Music</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Schedule')}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Feather name="calendar" size={18} color="#00ccff" />
                  </View>
                  <Text style={styles.menuItemText}>Schedule</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.menuItem}
                  onPress={() => navigateToScreen('Profile')}
                >
                  <View style={styles.menuItemIconContainer}>
                    <Feather name="user" size={18} color="#00ccff" />
                  </View>
                  <Text style={styles.menuItemText}>Profile</Text>
                </TouchableOpacity>
                </View>
              </View>
            )}
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  profileIcon: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(42, 54, 66, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(0, 204, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#00ccff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    zIndex: 1000,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: 100,
    paddingRight: 20,
  },
  profileMenuContainer: {
    minWidth: 160,
  },
  profileMenu: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(42, 54, 66, 0.95)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  profileMenuContent: {
    backgroundColor: 'transparent',
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  menuItemIcon: {
    fontSize: 18,
    color: '#00ccff',
    marginRight: 12,
    width: 24,
    textAlign: 'center',
  },
  menuItemIconContainer: {
    marginRight: 12,
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuItemText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    flex: 1,
  },
});