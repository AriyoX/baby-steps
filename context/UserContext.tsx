import React, { createContext, useContext, useState } from 'react';
import { supabase } from '@/lib/supabase'; // Import Supabase client

interface UserContextType {
  name: string;
  gender: string;
  age: string;
  reason: string;
  isOnboardingComplete: boolean;
  setName: (name: string) => void;
  setGender: (gender: string) => void;
  setAge: (age: string) => void;
  setReason: (reason: string) => void;
  setOnboardingComplete: (status: boolean) => void;
  addChildProfile: () => Promise<void>; // Function to add child profile
  userData: {
    name: string;
    gender: string;
    age: string;
    reason: string;
    isOnboardingComplete: boolean;
  };
  setUserData: (data: { name: string; gender: string; age: string; reason: string; isOnboardingComplete: boolean }) => void;
}

export const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [name, setName] = useState('');
  const [gender, setGender] = useState('');
  const [age, setAge] = useState('');
  const [reason, setReason] = useState('');
  const [isOnboardingComplete, setOnboardingComplete] = useState(false);

  // Handle the global state
  const setUserData = (data: { name: string; gender: string; age: string; reason: string; isOnboardingComplete: boolean }) => {
    setName(data.name);
    setGender(data.gender);
    setAge(data.age);
    setReason(data.reason);
    setOnboardingComplete(data.isOnboardingComplete);
  };

  // Add child profile to Supabase
  const addChildProfile = async () => {
    try {
      const session = await supabase.auth.getSession(); // Get the current user session
      if (!session.data.session) {
        throw new Error('User is not authenticated');
      }

      const parent_id = session.data.session.user.id;

      const { error } = await supabase.from('children').insert([
        {
          parent_id,
          name,
          gender,
          age,
          reason,
        },
      ]);

      if (error) {
        throw new Error(`Failed to add child profile: ${error.message}`);
      }

      console.log('Child profile added successfully!');
      setOnboardingComplete(true); // Mark onboarding as complete
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <UserContext.Provider
      value={{
        name,
        gender,
        age,
        reason,
        isOnboardingComplete,
        setName,
        setGender,
        setAge,
        setReason,
        setOnboardingComplete,
        addChildProfile,
        setUserData,
        userData: { name, gender, age, reason, isOnboardingComplete }, // userData object
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