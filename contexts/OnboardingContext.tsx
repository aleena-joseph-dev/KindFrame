import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
}

interface OnboardingContextType {
  currentStep: OnboardingStep | null;
  isOnboardingActive: boolean;
  userData: {
    nickname: string;
    mode: string;
    energyLevel: number;
  };
  startOnboarding: () => void;
  nextStep: () => void;
  previousStep: () => void;
  completeOnboarding: () => void;
  updateUserData: (data: Partial<{ nickname: string; mode: string; energyLevel: number }>) => void;
}

const OnboardingContext = createContext<OnboardingContextType | undefined>(undefined);

// Updated onboarding steps based on wireframes
const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'nickname',
    title: 'Welcome!',
    description: 'Enter your nickname',
  },
  {
    id: 'mode',
    title: 'Choose your mode',
    description: 'Pick what matches your current state',
  },
  {
    id: 'energy',
    title: 'Rate your energy',
    description: 'How are you feeling right now?',
  },
];

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);
  const [userData, setUserData] = useState({
    nickname: '',
    mode: '',
    energyLevel: 5,
  });

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const stored = await AsyncStorage.getItem('kindframe_onboarding');
      if (stored) {
        const data = JSON.parse(stored);
        if (!data.isOnboardingComplete) {
          setIsOnboardingActive(true);
          if (data.userData) {
            setUserData(data.userData);
          }
        }
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const startOnboarding = () => {
    setCurrentStepIndex(0);
    setIsOnboardingActive(true);
  };

  const nextStep = () => {
    if (currentStepIndex < ONBOARDING_STEPS.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      completeOnboarding();
    }
  };

  const previousStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const updateUserData = (data: Partial<{ nickname: string; mode: string; energyLevel: number }>) => {
    setUserData(prev => ({ ...prev, ...data }));
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('kindframe_onboarding', JSON.stringify({
        isOnboardingComplete: true,
        completedAt: new Date().toISOString(),
        userData,
      }));
      setIsOnboardingActive(false);
      setCurrentStepIndex(0);
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const value: OnboardingContextType = {
    currentStep: ONBOARDING_STEPS[currentStepIndex] || null,
    isOnboardingActive,
    userData,
    startOnboarding,
    nextStep,
    previousStep,
    completeOnboarding,
    updateUserData,
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = (): OnboardingContextType => {
  const context = useContext(OnboardingContext);
  if (context === undefined) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
}; 