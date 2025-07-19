import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { UserSchedule } from '../types/schedule';

interface ScheduleVisualizationProps {
  schedule: UserSchedule | null;
  compact?: boolean;
  showTarget?: boolean;
  title?: string;
}

export const ScheduleVisualization: React.FC<ScheduleVisualizationProps> = ({ 
  schedule, 
  compact = false,
  showTarget = false,
  title
}) => {
  if (!schedule) return null;

  const scheduleItems = showTarget ? [
    { icon: '🌅', label: 'Wake', time: schedule.target_wake_time, type: 'target_wake' },
    { icon: '🍳', label: 'Breakfast', time: schedule.target_breakfast_time, type: 'target_breakfast' },
    { icon: '🍽️', label: 'Lunch', time: schedule.target_lunch_time, type: 'target_lunch' },
    { icon: '🍽️', label: 'Dinner', time: schedule.target_dinner_time, type: 'target_dinner' },
    { icon: '😴', label: 'Sleep', time: schedule.target_sleep_time, type: 'target_sleep' },
  ] : [
    { icon: '🌅', label: 'Wake', time: schedule.wake_time, type: 'wake' },
    { icon: '🍳', label: 'Breakfast', time: schedule.breakfast_time, type: 'breakfast' },
    { icon: '🍽️', label: 'Lunch', time: schedule.lunch_time, type: 'lunch' },
    { icon: '🍽️', label: 'Dinner', time: schedule.dinner_time, type: 'dinner' },
    { icon: '😴', label: 'Sleep', time: schedule.sleep_time, type: 'sleep' },
  ];

  const formatTime = (time: string | null): string => {
    if (!time) return '--:--';
    
    // Convert 24-hour to 12-hour format
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
    const period = hour24 < 12 ? 'AM' : 'PM';
    
    return `${hour12}:${minutes} ${period}`;
  };

  const getCompletionPercentage = (): number => {
    const setTimes = scheduleItems.filter(item => item.time).length;
    return (setTimes / scheduleItems.length) * 100;
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.compactHeader}>
          <Text style={styles.compactTitle}>{title || 'Daily Schedule'}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${getCompletionPercentage()}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(getCompletionPercentage())}%
            </Text>
          </View>
        </View>
        
        <View style={styles.compactGrid}>
          {scheduleItems.map((item, index) => (
            <View key={index} style={styles.compactItem}>
              <Text style={styles.compactIcon}>{item.icon}</Text>
              <Text style={styles.compactTime}>
                {formatTime(item.time)}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{title || 'Your Daily Schedule'}</Text>
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill,
                { width: `${getCompletionPercentage()}%` }
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {Math.round(getCompletionPercentage())}% Complete
          </Text>
        </View>
      </View>

      <View style={styles.scheduleGrid}>
        {scheduleItems.map((item, index) => (
          <View key={index} style={styles.scheduleItem}>
            <View style={styles.timeSlot}>
              <Text style={styles.icon}>{item.icon}</Text>
              <Text style={styles.label}>{item.label}</Text>
            </View>
            <Text style={[
              styles.time,
              !item.time && styles.timeEmpty
            ]}>
              {formatTime(item.time)}
            </Text>
          </View>
        ))}
      </View>

      {getCompletionPercentage() < 100 && (
        <Text style={styles.encouragement}>
          💬 Tell me about your schedule to complete your routine!
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  compactContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 4,
  },
  header: {
    marginBottom: 16,
  },
  compactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  compactTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 2,
    width: 80,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ccff',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    fontWeight: '500',
  },
  scheduleGrid: {
    gap: 12,
  },
  compactGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  scheduleItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
  },
  compactItem: {
    alignItems: 'center',
    minWidth: 50,
  },
  timeSlot: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  icon: {
    fontSize: 20,
  },
  compactIcon: {
    fontSize: 16,
    marginBottom: 4,
  },
  label: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  time: {
    fontSize: 16,
    color: '#00ccff',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  compactTime: {
    fontSize: 10,
    color: '#00ccff',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  timeEmpty: {
    color: 'rgba(255, 255, 255, 0.3)',
  },
  encouragement: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    marginTop: 16,
    fontStyle: 'italic',
  },
});