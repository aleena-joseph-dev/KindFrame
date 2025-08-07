import { useGuestMode } from '@/contexts/GuestModeContext';
import { AuthService } from '@/services/authService';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type SensoryMode = 'calm' | 'highEnergy' | 'normal' | 'relax';

const SensoryModeContext = createContext<{
  mode: SensoryMode;
  setMode: (mode: SensoryMode) => void;
  isLoading: boolean;
  refreshMode: () => Promise<void>;
  loadModeForAuthenticatedUser: () => Promise<void>;
}>({
  mode: 'normal',
  setMode: () => {},
  isLoading: true,
  refreshMode: async () => {},
  loadModeForAuthenticatedUser: async () => {},
});

export const SensoryModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<SensoryMode>('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [modeJustSet, setModeJustSet] = useState(false);
  
  // Safely get guest mode state with error handling
  let isGuestMode = false;
  try {
    const guestModeContext = useGuestMode();
    isGuestMode = guestModeContext?.isGuestMode || false;
  } catch (error) {
    console.log('⚠️ GUEST MODE CONTEXT NOT AVAILABLE: Using default guest mode state');
    isGuestMode = false;
  }


  // Function to load saved mode from database
  const loadSavedMode = async () => {
    try {
      console.log('🔄 LOADING SAVED MODE: Attempting to load mode from database');
      
      // If mode was just set, don't override it
      if (modeJustSet) {
        console.log('⚠️ MODE JUST SET: Skipping database load to preserve selected mode');
        setModeJustSet(false);
        setIsLoading(false);
        return;
      }
      
      // Check if user is in guest mode
      if (isGuestMode) {
        console.log('✅ GUEST MODE: User is in guest mode, using default mode');
        setIsLoading(false);
        return;
      }
      
      const currentUser = await AuthService.getCurrentUser();
      
      if (currentUser?.profile?.settings?.mode) {
        const savedMode = currentUser.profile.settings.mode as SensoryMode;
        console.log('✅ MODE LOADED: Using saved mode from database:', savedMode);
        setMode(savedMode);
      } else {
        console.log('⚠️ NO SAVED MODE: Using default mode:', mode);
      }
    } catch (error) {
      console.error('❌ ERROR LOADING MODE:', error);
      // Check if it's an auth session missing error
      if (error?.message?.includes('Auth session missing')) {
        console.log('⚠️ NO AUTH SESSION: User not authenticated, using default mode');
      } else {
        console.log('⚠️ FALLBACK: Using default mode due to error');
      }
    } finally {
      setIsLoading(false);
    }
  };



  // Function to refresh mode from database
  const refreshMode = async () => {
    setIsLoading(true);
    await loadSavedMode();
  };

  // Function to load mode for authenticated user
  const loadModeForAuthenticatedUser = async () => {
    setIsLoading(true);
    await loadSavedMode();
  };

  // Initialize with default mode and set loading to false immediately
  useEffect(() => {
    console.log('🔄 SENSORY MODE CONTEXT INITIALIZED: Using default mode, waiting for explicit load');
    setIsLoading(false);
  }, []);

  // Custom setMode function that marks the mode as just set
  const setModeWithFlag = (newMode: SensoryMode) => {
    console.log('🔍 SETTING MODE WITH FLAG:', newMode);
    setMode(newMode);
    setModeJustSet(true);
  };

  return (
    <SensoryModeContext.Provider value={{ mode, setMode: setModeWithFlag, isLoading, refreshMode, loadModeForAuthenticatedUser }}>
      {children}
    </SensoryModeContext.Provider>
  );
};

export const useSensoryMode = () => useContext(SensoryModeContext); 