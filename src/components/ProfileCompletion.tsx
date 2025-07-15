import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { PROFILE_FIELD_LABELS } from '../types/profile';

interface ProfileCompletionProps {
  onFieldPress?: (field: string) => void;
  showProgress?: boolean;
  compact?: boolean;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  onFieldPress,
  showProgress = true,
  compact = false,
}) => {
  const { profile, getProfileCompletion } = useAuth();
  
  if (!profile) {
    return null;
  }

  const completion = getProfileCompletion();

  if (completion.completionPercentage === 100 && compact) {
    return null; // Don't show when profile is complete and in compact mode
  }

  const getFieldIcon = (field: string, isComplete: boolean) => {
    const iconName = isComplete ? 'check-circle' : 'circle';
    const iconColor = isComplete ? '#00ccff' : 'rgba(255, 255, 255, 0.3)';
    
    return <Feather name={iconName} size={16} color={iconColor} />;
  };

  const getFieldValue = (field: string): string => {
    if (!profile) return '';
    
    switch (field) {
      case 'age':
        const age = typeof profile.age === 'string' ? parseInt(profile.age) : profile.age;
        return age && age > 0 ? `${age} years old` : '';
      case 'gender':
        return profile.gender && profile.gender !== 'Not specified' ? profile.gender.replace('_', ' ') : '';
      case 'height':
        const height = typeof profile.height === 'string' ? parseInt(profile.height) : profile.height;
        return height && height > 0 ? `${height}cm` : '';
      case 'name':
        return (profile.name?.trim() && profile.name.trim() !== 'Voice Assistant User') 
          ? profile.name.trim() 
          : '';
      default:
        return '';
    }
  };

  if (compact) {
    return (
      <View style={styles.compactContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.compactTitle}>Profile: {completion.completionPercentage}% complete</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                { width: `${completion.completionPercentage}%` }
              ]} 
            />
          </View>
        </View>
        {completion.missingFields.length > 0 && (
          <Text style={styles.missingFieldsText}>
            Missing: {completion.missingFields.map(field => PROFILE_FIELD_LABELS[field as keyof typeof PROFILE_FIELD_LABELS]).join(', ')}
          </Text>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile Information</Text>
        {showProgress && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{completion.completionPercentage}% complete</Text>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill, 
                  { width: `${completion.completionPercentage}%` }
                ]} 
              />
            </View>
          </View>
        )}
      </View>

      <View style={styles.fieldsContainer}>
        {Object.entries(PROFILE_FIELD_LABELS).map(([field, label]) => {
          const isComplete = !completion.missingFields.includes(field);
          const value = getFieldValue(field);
          
          return (
            <TouchableOpacity
              key={field}
              style={styles.fieldItem}
              onPress={() => onFieldPress?.(field)}
              disabled={!onFieldPress}
            >
              <View style={styles.fieldHeader}>
                {getFieldIcon(field, isComplete)}
                <Text style={styles.fieldLabel}>{label}</Text>
              </View>
              {isComplete ? (
                <Text style={styles.fieldValue}>{value}</Text>
              ) : (
                <Text style={styles.fieldMissing}>Not provided</Text>
              )}
              {onFieldPress && (
                <Feather name="chevron-right" size={16} color="rgba(255, 255, 255, 0.5)" />
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {completion.missingFields.length > 0 && (
        <View style={styles.helpContainer}>
          <Feather name="info" size={16} color="#00ccff" />
          <Text style={styles.helpText}>
            Chat with Claude to automatically fill in missing information!
          </Text>
        </View>
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
    backgroundColor: 'rgba(0, 204, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    marginBottom: 16,
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
    color: '#00ccff',
    marginBottom: 4,
  },
  progressHeader: {
    marginBottom: 4,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressText: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    minWidth: 80,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#00ccff',
    borderRadius: 3,
  },
  fieldsContainer: {
    gap: 12,
  },
  fieldItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  fieldHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  fieldLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    marginRight: 8,
  },
  fieldMissing: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.4)',
    fontStyle: 'italic',
    marginRight: 8,
  },
  missingFieldsText: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.6)',
    fontStyle: 'italic',
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 204, 255, 0.1)',
    borderRadius: 8,
  },
  helpText: {
    fontSize: 14,
    color: '#00ccff',
    flex: 1,
  },
});