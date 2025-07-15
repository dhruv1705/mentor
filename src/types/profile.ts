export interface UserProfile {
  id?: string;
  user_id: string;
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height?: number; // in centimeters
  name?: string;
  avatar_url?: string;
  email?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ProfileUpdateData {
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height?: number;
  name?: string;
  avatar_url?: string;
}

export interface ExtractedProfileInfo {
  age?: number;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  height?: number;
  confidence: number; // 0-1 score for extraction confidence
  source: string; // the text that was parsed
}

export interface ProfileCompletionStatus {
  hasAge: boolean;
  hasGender: boolean;
  hasHeight: boolean;
  hasName: boolean;
  completionPercentage: number;
  missingFields: string[];
}

export const PROFILE_FIELD_LABELS = {
  age: 'Age',
  gender: 'Gender',
  height: 'Height',
  name: 'Name'
} as const;

export const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' }
] as const;