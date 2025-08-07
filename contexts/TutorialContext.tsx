import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface TutorialContextType {
  hasCompletedTutorial: boolean;
  showTutorial: boolean;
  showAppreciation: boolean;
  startTutorial: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  hideAppreciation: () => void;
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showAppreciation, setShowAppreciation] = useState(false);

  // Load tutorial completion status on app start
  useEffect(() => {
    loadTutorialStatus();
  }, []);

  const loadTutorialStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('hasCompletedTutorial');
      setHasCompletedTutorial(status === 'true');
    } catch (error) {
      console.error('Error loading tutorial status:', error);
    }
  };

  const saveTutorialStatus = async (completed: boolean) => {
    try {
      await AsyncStorage.setItem('hasCompletedTutorial', completed.toString());
    } catch (error) {
      console.error('Error saving tutorial status:', error);
    }
  };

  const startTutorial = () => {
    setShowTutorial(true);
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    setHasCompletedTutorial(true);
    setShowAppreciation(true);
    saveTutorialStatus(true);
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    setHasCompletedTutorial(true);
    setShowAppreciation(true);
    saveTutorialStatus(true);
  };

  const hideAppreciation = () => {
    setShowAppreciation(false);
  };

  return (
    <TutorialContext.Provider
      value={{
        hasCompletedTutorial,
        showTutorial,
        showAppreciation,
        startTutorial,
        completeTutorial,
        skipTutorial,
        hideAppreciation,
      }}
    >
      {children}
    </TutorialContext.Provider>
  );
};

export const useTutorial = () => {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
};
