import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

interface TutorialContextType {
  hasCompletedTutorial: boolean;
  showTutorial: boolean;
  showCompletionPopup: boolean;
  startTutorial: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  hideCompletionPopup: () => void;
  resetSessionState: () => void; // For testing purposes
}

const TutorialContext = createContext<TutorialContextType | undefined>(undefined);

export const TutorialProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  const [hasShownCompletionPopupThisSession, setHasShownCompletionPopupThisSession] = useState(false);

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
    console.log('🎯 TUTORIAL CONTEXT: startTutorial called');
    setShowTutorial(true);
    setShowCompletionPopup(false); // Hide completion popup if it was showing
    console.log('🎯 TUTORIAL CONTEXT: showTutorial set to true');
  };

  const completeTutorial = () => {
    setShowTutorial(false);
    setHasCompletedTutorial(true);
    
    // Only show completion popup if it hasn't been shown this session
    if (!hasShownCompletionPopupThisSession) {
      console.log('🎯 TUTORIAL: Showing completion popup (first time this session)');
      setShowCompletionPopup(true);
      setHasShownCompletionPopupThisSession(true);
    } else {
      console.log('🎯 TUTORIAL: Skipping completion popup (already shown this session)');
    }
    
    saveTutorialStatus(true);
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    setHasCompletedTutorial(true);
    
    // Only show completion popup if it hasn't been shown this session
    if (!hasShownCompletionPopupThisSession) {
      console.log('🎯 TUTORIAL: Showing completion popup (first time this session)');
      setShowCompletionPopup(true);
      setHasShownCompletionPopupThisSession(true);
    } else {
      console.log('🎯 TUTORIAL: Skipping completion popup (already shown this session)');
    }
    
    saveTutorialStatus(true);
  };

  const hideCompletionPopup = () => {
    setShowCompletionPopup(false);
    // Mark that the popup has been shown this session
    setHasShownCompletionPopupThisSession(true);
  };

  const resetSessionState = () => {
    setHasShownCompletionPopupThisSession(false);
    console.log('🎯 TUTORIAL CONTEXT: Session state reset - completion popup can be shown again');
  };

  return (
    <TutorialContext.Provider
      value={{
        hasCompletedTutorial,
        showTutorial,
        showCompletionPopup,
        startTutorial,
        completeTutorial,
        skipTutorial,
        hideCompletionPopup,
        resetSessionState,
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
