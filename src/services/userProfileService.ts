import { supabase } from './supabaseClient';
import { UserProfile, ProfileUpdateData, ProfileCompletionStatus } from '../types/profile';

export class UserProfileService {
  
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile found - this is normal for new users
          return null;
        }
        console.error('Error fetching user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getUserProfile:', error);
      return null;
    }
  }

  static async createUserProfile(userId: string, email?: string): Promise<UserProfile | null> {
    try {
      const profileData = {
        user_id: userId,
        email,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single();

      if (error) {
        console.error('Error creating user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in createUserProfile:', error);
      return null;
    }
  }

  static async updateUserProfile(userId: string, updateData: ProfileUpdateData): Promise<UserProfile | null> {
    try {
      const profileData = {
        ...updateData,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('user_profiles')
        .update(profileData)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('Error updating user profile:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in updateUserProfile:', error);
      return null;
    }
  }

  static async updateProfileField(
    userId: string, 
    field: keyof ProfileUpdateData, 
    value: any
  ): Promise<boolean> {
    try {
      // First check if user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        console.error('User not authenticated for profile update:', authError);
        return false;
      }
      
      // Check if profile exists
      const { data: existingProfile, error: checkError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('user_id', userId)
        .single();
      
      if (checkError) {
        if (checkError.code === 'PGRST116') {
          // Create profile first
          const { data: newProfile, error: createError } = await supabase
            .from('user_profiles')
            .insert({
              user_id: userId,
              email: user.email,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .select()
            .single();
          
          if (createError) {
            console.error('Error creating profile:', createError);
            return false;
          }
        } else {
          console.error('Error checking existing profile:', checkError);
          return false;
        }
      }

      const updateData = {
        [field]: value,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('user_profiles')
        .update(updateData)
        .eq('user_id', userId);

      if (error) {
        console.error(`Error updating profile field ${field}:`, error);
        return false;
      }

      return true;
    } catch (error) {
      console.error(`Unexpected error in updateProfileField (${field}):`, error);
      return false;
    }
  }

  static async getOrCreateProfile(userId: string, email?: string): Promise<UserProfile | null> {
    try {
      // Try to get existing profile
      let profile = await this.getUserProfile(userId);
      
      // If no profile exists, create one
      if (!profile) {
        profile = await this.createUserProfile(userId, email);
      } else {
        // Clean up old default values if they exist
        profile = await this.cleanupOldDefaults(profile);
      }

      return profile;
    } catch (error) {
      console.error('Error in getOrCreateProfile:', error);
      return null;
    }
  }

  static async cleanupOldDefaults(profile: UserProfile): Promise<UserProfile> {
    try {
      const needsCleanup = profile.name === 'Voice Assistant User';
      
      if (needsCleanup) {
        const updates: Partial<UserProfile> = {};
        
        if (profile.name === 'Voice Assistant User') {
          updates.name = null;
        }
        
        const { data, error } = await supabase
          .from('user_profiles')
          .update({
            ...updates,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', profile.user_id)
          .select()
          .single();
        
        if (error) {
          console.error('Error cleaning up old defaults:', error);
          return profile;
        }
        
        return data;
      }
      
      return profile;
    } catch (error) {
      console.error('Error in cleanupOldDefaults:', error);
      return profile;
    }
  }

  static getProfileCompletionStatus(profile: UserProfile | null): ProfileCompletionStatus {
    if (!profile) {
      return {
        hasAge: false,
        hasGender: false,
        hasHeight: false,
        hasName: false,
        completionPercentage: 0,
        missingFields: ['age', 'gender', 'height', 'name'],
      };
    }

    // Handle both number and string types from database
    const hasAge = (typeof profile.age === 'number' && profile.age > 0) || 
                   (typeof profile.age === 'string' && parseInt(profile.age) > 0);
    const hasGender = Boolean(profile.gender && profile.gender !== 'Not_Specified' && profile.gender !== 'not_specified');
    const hasHeight = (typeof profile.height === 'number' && profile.height > 0) || 
                      (typeof profile.height === 'string' && parseInt(profile.height) > 0);
    const hasName = Boolean(profile.name?.trim() && profile.name.trim() !== 'Voice Assistant User');

    const completedFields = [hasAge, hasGender, hasHeight, hasName].filter(Boolean).length;
    const totalFields = 4;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);

    const missingFields: string[] = [];
    if (!hasAge) missingFields.push('age');
    if (!hasGender) missingFields.push('gender');
    if (!hasHeight) missingFields.push('height');
    if (!hasName) missingFields.push('name');

    return {
      hasAge,
      hasGender,
      hasHeight,
      hasName,
      completionPercentage,
      missingFields,
    };
  }

  static validateProfileData(data: ProfileUpdateData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate age
    if (data.age !== undefined) {
      if (!Number.isInteger(data.age) || data.age < 1 || data.age > 120) {
        errors.push('Age must be a number between 1 and 120');
      }
    }

    // Validate height (in cm)
    if (data.height !== undefined) {
      if (!Number.isFinite(data.height) || data.height < 50 || data.height > 300) {
        errors.push('Height must be between 50 and 300 centimeters');
      }
    }

    // Validate gender
    if (data.gender !== undefined) {
      const validGenders = ['male', 'female', 'other', 'prefer_not_to_say'];
      if (!validGenders.includes(data.gender)) {
        errors.push('Gender must be one of: male, female, other, prefer_not_to_say');
      }
    }

    // Validate name
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || data.name.trim().length === 0) {
        errors.push('Name must be a non-empty string');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  static formatHeight(heightInCm: number): string {
    const feet = Math.floor(heightInCm / 30.48);
    const inches = Math.round((heightInCm / 30.48 - feet) * 12);
    return `${heightInCm}cm (${feet}'${inches}")`;
  }

  static parseHeight(heightString: string): number | null {
    // Remove spaces and convert to lowercase
    const cleanHeight = heightString.toLowerCase().replace(/\s/g, '');

    // Try to match cm format (e.g., "175cm", "175")
    const cmMatch = cleanHeight.match(/(\d+(?:\.\d+)?)(?:cm)?$/);
    if (cmMatch) {
      const cm = parseFloat(cmMatch[1]);
      if (cm >= 50 && cm <= 300) {
        return Math.round(cm);
      }
    }

    // Try to match feet/inches format (e.g., "5'8", "5'8\"", "5 8")
    const feetInchesMatch = cleanHeight.match(/(\d+)['']?(\d+)[""]?/);
    if (feetInchesMatch) {
      const feet = parseInt(feetInchesMatch[1]);
      const inches = parseInt(feetInchesMatch[2]);
      const cm = Math.round((feet * 12 + inches) * 2.54);
      if (cm >= 50 && cm <= 300) {
        return cm;
      }
    }

    // Try to match meters format (e.g., "1.75m", "1.75")
    const metersMatch = cleanHeight.match(/(\d+\.\d+)m?$/);
    if (metersMatch) {
      const meters = parseFloat(metersMatch[1]);
      const cm = Math.round(meters * 100);
      if (cm >= 50 && cm <= 300) {
        return cm;
      }
    }

    return null;
  }
}