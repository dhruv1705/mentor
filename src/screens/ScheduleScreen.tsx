import React from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import ProfileIcon from '../components/ProfileIcon';
import { useAuth } from '../contexts/AuthContext';
import { ScheduleVisualization } from '../components/ScheduleVisualization';

export default function ScheduleScreen() {
  const { schedule } = useAuth();

  return (
    <View style={styles.container}>
      <ProfileIcon />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.contentContainer}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerIconContainer}>
            <Feather name="calendar" size={60} color="#00ccff" />
          </View>
          <Text style={styles.headerTitle}>Your Schedule</Text>
          <Text style={styles.headerSubtitle}>Manage your daily routine</Text>
        </View>

        {/* Schedule Visualization */}
        <View style={styles.visualizationContainer}>
          <ScheduleVisualization 
            schedule={schedule.weekday} 
            title="Current Daily Schedule"
          />
          <ScheduleVisualization 
            schedule={schedule.weekday} 
            showTarget={true}
            title="Target Daily Schedule"
          />
        </View>

        {/* Detailed Schedule View */}
        <View style={styles.detailedScheduleContainer}>
          <Text style={styles.sectionTitle}>Current Weekday Schedule</Text>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🌅 Wake Up</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.wake_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍳 Breakfast</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.breakfast_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Lunch</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.lunch_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Dinner</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.dinner_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>😴 Sleep</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.sleep_time || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Target Schedule View */}
        <View style={styles.detailedScheduleContainer}>
          <Text style={styles.sectionTitle}>Target Weekday Schedule</Text>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🌅 Wake Up</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.target_wake_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍳 Breakfast</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.target_breakfast_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Lunch</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.target_lunch_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Dinner</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.target_dinner_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>😴 Sleep</Text>
              <Text style={styles.scheduleTime}>{schedule.weekday?.target_sleep_time || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Current Weekend Schedule */}
        <View style={styles.detailedScheduleContainer}>
          <Text style={styles.sectionTitle}>Current Weekend Schedule</Text>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🌅 Wake Up</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.wake_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍳 Breakfast</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.breakfast_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Lunch</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.lunch_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Dinner</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.dinner_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>😴 Sleep</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.sleep_time || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Target Weekend Schedule */}
        <View style={styles.detailedScheduleContainer}>
          <Text style={styles.sectionTitle}>Target Weekend Schedule</Text>
          <View style={styles.scheduleGrid}>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🌅 Wake Up</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.target_wake_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍳 Breakfast</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.target_breakfast_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Lunch</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.target_lunch_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>🍽️ Dinner</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.target_dinner_time || 'Not set'}</Text>
            </View>
            <View style={styles.scheduleItem}>
              <Text style={styles.scheduleLabel}>😴 Sleep</Text>
              <Text style={styles.scheduleTime}>{schedule.weekend?.target_sleep_time || 'Not set'}</Text>
            </View>
          </View>
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>💡 How to Update Your Schedule</Text>
          <Text style={styles.instructionsText}>
            Go to the Home screen and talk to your mentor about your schedule. Say things like:
          </Text>
          <View style={styles.exampleContainer}>
            <Text style={styles.exampleText}>• "I wake up at 7 AM on weekdays"</Text>
            <Text style={styles.exampleText}>• "I have lunch at 12:30 PM"</Text>
            <Text style={styles.exampleText}>• "I go to bed at 10 PM"</Text>
          </View>
          <Text style={styles.instructionsText}>
            Your mentor will automatically extract and update your schedule times!
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="message-circle" size={20} color="#00ccff" style={styles.actionIcon} />
            <Text style={styles.actionText}>Talk to Mentor</Text>
            <Feather name="chevron-right" size={16} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="trending-up" size={20} color="#00ccff" style={styles.actionIcon} />
            <Text style={styles.actionText}>Optimize Schedule</Text>
            <Feather name="chevron-right" size={16} color="#888" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Feather name="clock" size={20} color="#00ccff" style={styles.actionIcon} />
            <Text style={styles.actionText}>Set Reminders</Text>
            <Feather name="chevron-right" size={16} color="#888" />
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
  headerIconContainer: {
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
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  visualizationContainer: {
    marginBottom: 30,
  },
  detailedScheduleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 16,
    textAlign: 'center',
  },
  scheduleGrid: {
    gap: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  scheduleLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
  scheduleTime: {
    fontSize: 16,
    color: '#00ccff',
    fontWeight: '600',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0, 204, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#00ccff',
    marginBottom: 12,
    textAlign: 'center',
  },
  instructionsText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    lineHeight: 22,
    marginBottom: 12,
  },
  exampleContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  exampleText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 4,
  },
  quickActionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  actionIcon: {
    marginRight: 15,
  },
  actionText: {
    fontSize: 16,
    color: '#FFFFFF',
    flex: 1,
  },
});