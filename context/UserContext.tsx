import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Import Supabase client
import type { SupportedLearningLanguageCode } from '@/content/types';

type ChildLearningLanguageCode = SupportedLearningLanguageCode | '';

interface CreatedChildProfile {
  id: string;
  parent_id: string;
  name: string;
  gender: string;
  age: string;
  reason?: string;
  selected_language_code?: ChildLearningLanguageCode;
  created_at?: string;
}

interface UserContextType {
  name: string;
  gender: string;
  age: string;
  reason: string;
  selectedLanguageCode: ChildLearningLanguageCode;
  isOnboardingComplete: boolean;
  setName: (name: string) => void;
  setGender: (gender: string) => void;
  setAge: (age: string) => void;
  setReason: (reason: string) => void;
  setSelectedLanguageCode: (languageCode: ChildLearningLanguageCode) => void;
  setOnboardingComplete: (status: boolean) => void;
  addChildProfile: () => Promise<CreatedChildProfile>; // Function to add child profile
  userData: {
    name: string;
    gender: string;
    age: string;
    reason: string;
    selectedLanguageCode: ChildLearningLanguageCode;
    isOnboardingComplete: boolean;
  };
  setUserData: (data: {
    name: string;
    gender: string;
    age: string;
    reason: string;
    selectedLanguageCode?: ChildLearningLanguageCode;
    isOnboardingComplete: boolean;
  }) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [reason, setReason] = useState('');
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<ChildLearningLanguageCode>('');
  const [isOnboardingComplete, setOnboardingComplete] = useState(false);

  // Handle the global state
  const setUserData = (data: {
    name: string;
    gender: string;
    age: string;
    reason: string;
    selectedLanguageCode?: ChildLearningLanguageCode;
    isOnboardingComplete: boolean;
  }) => {
    setName(data.name);
    setGender(data.gender);
    setAge(data.age);
    setReason(data.reason);
    setSelectedLanguageCode(data.selectedLanguageCode || '');
    setOnboardingComplete(data.isOnboardingComplete);
  };

  // Add child profile to Supabase
  const addChildProfile = async (): Promise<CreatedChildProfile> => {
    try {
      const session = await supabase.auth.getSession(); // Get the current user session
      if (!session.data.session) {
        throw new Error('User is not authenticated');
      }

      const parent_id = session.data.session.user.id;
      if (!selectedLanguageCode) {
        throw new Error('Learning language is required before creating a child profile');
      }

      const { data, error } = await supabase
        .from('children')
        .insert([
          {
            parent_id,
            name,
            gender,
            age,
            reason,
            selected_language_code: selectedLanguageCode,
          },
        ])
        .select('id, parent_id, name, gender, age, reason, selected_language_code, created_at')
        .single();

      if (error) {
        throw new Error(`Failed to add child profile: ${error.message}`);
      }

      if (!data) {
        throw new Error('Failed to add child profile: no saved profile was returned.');
      }

      console.log('Child profile added successfully!');
      setOnboardingComplete(true); // Mark onboarding as complete
      return data as CreatedChildProfile;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  return (
    <UserContext.Provider
      value={{
        name,
        gender,
        age,
        reason,
        selectedLanguageCode,
        isOnboardingComplete,
        setName,
        setGender,
        setAge,
        setReason,
        setSelectedLanguageCode,
        setOnboardingComplete,
        addChildProfile,
        setUserData,
        userData: { name, gender, age, reason, selectedLanguageCode, isOnboardingComplete }, // userData object
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
