import { useGuestMode } from '@/contexts/GuestModeContext';
import { AuthService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useContext, useEffect, useState } from 'react';

export type SensoryMode = 'calm' | 'highEnergy' | 'normal' | 'relax';

const SensoryModeContext = createContext<{
  mode: SensoryMode;
  setMode: (mode: SensoryMode) => Promise<void>;
  isLoading: boolean;
  refreshMode: () => Promise<void>;
  loadModeForAuthenticatedUser: () => Promise<void>;
}>({
  mode: 'normal',
  setMode: async () => {},
  isLoading: true,
  refreshMode: async () => {},
  loadModeForAuthenticatedUser: async () => {},
});

export const SensoryModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<SensoryMode>('normal');
  const [isLoading, setIsLoading] = useState(true);
  
  // Safely get guest mode state with error handling
  let isGuestMode = false;
  try {
    const guestModeContext = useGuestMode();
    isGuestMode = guestModeContext?.isGuestMode || false;
  } catch (error) {
    console.log('⚠️ GUEST MODE CONTEXT NOT AVAILABLE: Using default guest mode state');
    isGuestMode = false;
  }

  // Function to save mode to database for authenticated users
  const saveModeToDatabase = async (newMode: SensoryMode) => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        console.log('⚠️ NO USER: Cannot save mode to database, user not authenticated');
        return false;
      }

      console.log('💾 SAVING MODE TO DATABASE:', { userId: currentUser.id, mode: newMode });
      
      const result = await AuthService.updateUserProfile(currentUser.id, {
        settings: {
          mode: newMode,
          modeUpdatedAt: new Date().toISOString(),
        }
      });

      if (result.success) {
        console.log('✅ MODE SAVED TO DATABASE:', newMode);
        return true;
      } else {
        console.error('❌ FAILED TO SAVE MODE TO DATABASE:', result.error);
        return false;
      }
    } catch (error) {
      console.error('❌ ERROR SAVING MODE TO DATABASE:', error);
      return false;
    }
  };

  // Function to save mode to local storage for guest users
  const saveModeToLocalStorage = async (newMode: SensoryMode) => {
    try {
      console.log('💾 SAVING MODE TO LOCAL STORAGE:', newMode);
      await AsyncStorage.setItem('guestMode', newMode);
      console.log('✅ MODE SAVED TO LOCAL STORAGE:', newMode);
      return true;
    } catch (error) {
      console.error('❌ ERROR SAVING MODE TO LOCAL STORAGE:', error);
      return false;
    }
  };

  // Function to load mode from database for authenticated users
  const loadModeFromDatabase = async (): Promise<SensoryMode | null> => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) {
        console.log('⚠️ NO USER: Cannot load mode from database, user not authenticated');
        return null;
      }

      console.log('🔄 LOADING MODE FROM DATABASE for user:', currentUser.id);
      
      if (currentUser.profile?.settings?.mode) {
        const savedMode = currentUser.profile.settings.mode as SensoryMode;
        console.log('✅ MODE LOADED FROM DATABASE:', savedMode);
        return savedMode;
      } else {
        console.log('⚠️ NO MODE IN DATABASE: User has no saved mode');
        return null;
      }
    } catch (error) {
      console.error('❌ ERROR LOADING MODE FROM DATABASE:', error);
      return null;
    }
  };

  // Function to load mode from local storage for guest users
  const loadModeFromLocalStorage = async (): Promise<SensoryMode | null> => {
    try {
      console.log('🔄 LOADING MODE FROM LOCAL STORAGE');
      const savedMode = await AsyncStorage.getItem('guestMode');
      
      if (savedMode) {
        console.log('✅ MODE LOADED FROM LOCAL STORAGE:', savedMode);
        return savedMode as SensoryMode;
      } else {
        console.log('⚠️ NO MODE IN LOCAL STORAGE: Guest has no saved mode');
        return null;
      }
    } catch (error) {
      console.error('❌ ERROR LOADING MODE FROM LOCAL STORAGE:', error);
      return null;
    }
  };

  // Main function to set mode (handles both authenticated and guest users)
  const setMode = async (newMode: SensoryMode) => {
    console.log('🎯 SETTING MODE:', { newMode, isGuestMode });
    
    // Update the global state immediately
    setModeState(newMode);
    
    // Save mode based on user type
    if (isGuestMode) {
      // Guest user: save to local storage
      await saveModeToLocalStorage(newMode);
    } else {
      // Authenticated user: save to database
      await saveModeToDatabase(newMode);
    }
    
    console.log('✅ MODE SET SUCCESSFULLY:', newMode);
  };

  // Function to load mode on app startup
  const loadModeOnStartup = async () => {
    try {
      console.log('🚀 LOADING MODE ON APP STARTUP');
      setIsLoading(true);
      
      let loadedMode: SensoryMode | null = null;
      
      if (isGuestMode) {
        // Guest user: load from local storage
        loadedMode = await loadModeFromLocalStorage();
      } else {
        // Authenticated user: load from database
        loadedMode = await loadModeFromDatabase();
      }
      
      // Set the mode (use 'normal' as default if no mode found)
      const finalMode = loadedMode || 'normal';
      console.log('🎯 SETTING FINAL MODE:', finalMode);
      setModeState(finalMode);
      
    } catch (error) {
      console.error('❌ ERROR LOADING MODE ON STARTUP:', error);
      // Fallback to 'normal' mode
      setModeState('normal');
    } finally {
      setIsLoading(false);
    }
  };

  // Function to refresh mode from storage
  const refreshMode = async () => {
    console.log('🔄 REFRESHING MODE');
    await loadModeOnStartup();
  };

  // Function to load mode for authenticated user (for backward compatibility)
  const loadModeForAuthenticatedUser = async () => {
    console.log('🔄 LOADING MODE FOR AUTHENTICATED USER');
    await loadModeOnStartup();
  };

  // Initialize mode on app startup
  useEffect(() => {
    console.log('🔄 SENSORY MODE CONTEXT INITIALIZED');
    loadModeOnStartup();
  }, [isGuestMode]); // Re-run when guest mode status changes

  return (
    <SensoryModeContext.Provider value={{ 
      mode, 
      setMode, 
      isLoading, 
      refreshMode, 
      loadModeForAuthenticatedUser 
    }}>
      {children}
    </SensoryModeContext.Provider>
  );
};

export const useSensoryMode = () => useContext(SensoryModeContext); 