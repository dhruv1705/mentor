import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { AuthService } from '../services/authService';
import { UserProfileService } from '../services/userProfileService';
import { UserProfile, ProfileUpdateData, ProfileCompletionStatus } from '../types/profile';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  profileLoading: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updateProfile: (data: ProfileUpdateData) => Promise<boolean>;
  updateProfileField: (field: keyof ProfileUpdateData, value: any) => Promise<boolean>;
  getProfileCompletion: () => ProfileCompletionStatus;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  // Load user profile
  const loadUserProfile = async (currentUser: User | null) => {
    if (!currentUser) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    try {
      const userProfile = await UserProfileService.getOrCreateProfile(
        currentUser.id, 
        currentUser.email
      );
      setProfile(userProfile);
    } catch (error) {
      console.error('Error loading user profile:', error);
      setProfile(null);
    } finally {
      setProfileLoading(false);
    }
  };

  useEffect(() => {
    // Get initial user
    AuthService.getCurrentUser().then(async (user) => {
      setUser(user);
      await loadUserProfile(user);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = AuthService.onAuthStateChange(async (user) => {
      setUser(user);
      await loadUserProfile(user);
      setLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    const { user, error } = await AuthService.signIn(email, password);
    setUser(user);
    if (user) {
      await loadUserProfile(user);
    }
    setLoading(false);
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    setLoading(true);
    const { user, error } = await AuthService.signUp(email, password);
    setUser(user);
    if (user) {
      await loadUserProfile(user);
    }
    setLoading(false);
    return { error };
  };

  const signOut = async () => {
    setLoading(true);
    await AuthService.signOut();
    setUser(null);
    setProfile(null);
    setLoading(false);
  };

  const resetPassword = async (email: string) => {
    const { error } = await AuthService.resetPassword(email);
    return { error };
  };

  const updateProfile = async (data: ProfileUpdateData): Promise<boolean> => {
    if (!user) return false;

    const updatedProfile = await UserProfileService.updateUserProfile(user.id, data);
    if (updatedProfile) {
      setProfile(updatedProfile);
      return true;
    }
    return false;
  };

  const updateProfileField = async (field: keyof ProfileUpdateData, value: any): Promise<boolean> => {
    if (!user) return false;

    const success = await UserProfileService.updateProfileField(user.id, field, value);
    if (success) {
      // Immediately update the local profile state
      if (profile) {
        // Ensure numeric fields are stored as numbers
        let processedValue = value;
        if (field === 'age' || field === 'height') {
          processedValue = typeof value === 'string' ? parseInt(value) : value;
        }
        
        setProfile(prevProfile => ({
          ...prevProfile!,
          [field]: processedValue,
          updated_at: new Date().toISOString(),
        }));
      }
      
      // Also refresh from database to ensure consistency
      await refreshProfile();
      return true;
    }
    return false;
  };

  const getProfileCompletion = (): ProfileCompletionStatus => {
    return UserProfileService.getProfileCompletionStatus(profile);
  };

  const refreshProfile = async (): Promise<void> => {
    if (user) {
      await loadUserProfile(user);
    }
  };

  const value: AuthContextType = {
    user,
    profile,
    profileLoading,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updateProfile,
    updateProfileField,
    getProfileCompletion,
    refreshProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};