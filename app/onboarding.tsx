import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnergyPopup } from '@/components/onboarding/EnergyPopup';
import { NicknamePopup } from '@/components/onboarding/NicknamePopup';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { AuthService } from '@/services/authService';

interface OnboardingData {
  nickname: string;
  mode: string;
  energyLevel: number;
}

export default function OnboardingScreen() {
  const router = useRouter();
  const { setMode, loadModeForAuthenticatedUser } = useSensoryMode();
  
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    nickname: 'Alex',
    mode: 'normal',
    energyLevel: 5,
  });

  // Onboarding flow state
  const [showNicknamePopup, setShowNicknamePopup] = useState(false);
  const [showEnergyPopup, setShowEnergyPopup] = useState(false);
  const [showModePopup, setShowModePopup] = useState(false);

  // Check if user needs onboarding
  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      // First check if user is authenticated
      const currentUser = await AuthService.getCurrentUser();
      console.log('Checking onboarding status for user:', currentUser);
      
      if (!currentUser) {
        // No user logged in, redirect to signin
        console.log('No user logged in, redirecting to signin');
        router.replace('/(auth)/signin');
        return;
      }

      // Check if user has completed onboarding in their profile
      const hasCompletedInProfile = currentUser.profile?.settings?.hasCompletedOnboarding;
      let hasCompletedInStorage = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      console.log('Onboarding status check:', {
        hasCompletedInProfile,
        hasCompletedInStorage,
        userSettings: currentUser.profile?.settings
      });
      
      // For testing: Clear AsyncStorage if profile settings are empty
      if (!hasCompletedInProfile && hasCompletedInStorage === 'true') {
        console.log('Clearing AsyncStorage for testing - profile has no onboarding data');
        await AsyncStorage.removeItem('hasCompletedOnboarding');
        console.log('AsyncStorage cleared, will show onboarding');
        // Re-check AsyncStorage after clearing
        hasCompletedInStorage = await AsyncStorage.getItem('hasCompletedOnboarding');
        console.log('AsyncStorage after clearing:', hasCompletedInStorage);
      }
      
      // Check if onboarding is completed in either place
      const isOnboardingCompleted = hasCompletedInProfile === true || hasCompletedInStorage === 'true';
      
      console.log('Final onboarding check:', {
        hasCompletedInProfile,
        hasCompletedInStorage,
        isOnboardingCompleted
      });
      
      if (!isOnboardingCompleted) {
        // First-time user, show onboarding
        console.log('First-time user detected, showing onboarding');
        
        // Extract nickname from user's email
        const userEmail = currentUser.email;
        const extractedNickname = await AsyncStorage.getItem('extractedNickname');
        
        // If no extracted nickname in AsyncStorage, extract from email
        let defaultNickname = extractedNickname;
        if (!defaultNickname && userEmail) {
          // Import the name extractor utility
          const { extractNameFromEmail } = await import('../utils/nameExtractor');
          const nameResult = extractNameFromEmail(userEmail);
          defaultNickname = nameResult.displayName;
          console.log('Extracted nickname from email:', defaultNickname);
        }
        
        // Fallback to 'Alex' if no nickname found
        defaultNickname = defaultNickname || 'Alex';
        
        console.log('Using nickname for onboarding:', defaultNickname);
        setOnboardingData(prev => ({ ...prev, nickname: defaultNickname }));
        setShowNicknamePopup(true);
      } else {
        // User has completed onboarding, set mode and redirect to home
        console.log('User has completed onboarding, setting mode and redirecting to home');
        await loadModeForAuthenticatedUser();
        console.log('🔄 NAVIGATING TO HOME SCREEN (ONBOARDING ALREADY COMPLETED)...');
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      
      // Check if it's an auth session missing error
      if (error?.message?.includes('Auth session missing')) {
        console.log('No auth session, redirecting to signin');
        router.replace('/(auth)/signin');
        return;
      }
      
      // Default to showing onboarding if there's an error
      console.log('Error occurred, defaulting to show onboarding');
      setShowNicknamePopup(true);
    }
  };

  // --- Onboarding popup flow ---
  const handleNicknameNext = (nickname: string) => {
    setOnboardingData(prev => ({ ...prev, nickname }));
    setShowNicknamePopup(false);
    setShowEnergyPopup(true);
  };

  const handleNicknameSkip = () => {
    console.log('User skipped nickname setup, completing onboarding');
    setShowNicknamePopup(false);
    // Complete onboarding immediately without going through other steps
    completeOnboarding();
  };

  const handleEnergyNext = (energyLevel: number) => {
    setOnboardingData(prev => ({ ...prev, energyLevel }));
    setShowEnergyPopup(false);
    setShowModePopup(true);
  };

  const handleEnergySkip = () => {
    setShowEnergyPopup(false);
    setShowModePopup(true);
  };

  const handleModeSelect = (modeId: string) => {
    setOnboardingData(prev => {
      const newData = { ...prev, mode: modeId };
      console.log('🔍 UPDATED ONBOARDING DATA:', newData);
      return newData;
    });
    
    // Immediately apply the mode to change UI
    console.log('🔍 APPLYING MODE TO UI:', modeId);
    setMode(modeId as 'calm' | 'highEnergy' | 'normal' | 'relax');
    setShowModePopup(false);
    
    console.log('🔍 CALLING COMPLETE ONBOARDING WITH MODE:', modeId);
    completeOnboarding(modeId);
  };

  const handleModeSkip = () => {
    setShowModePopup(false);
    completeOnboarding(); // No mode selected, will use default
  };

  const completeOnboarding = async (selectedMode?: string) => {
    try {
      console.log('🔄 STARTING ONBOARDING COMPLETION...');
      
      // Save to AsyncStorage first
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      console.log('✅ AsyncStorage updated successfully');
      
      // Store nickname, mode, and onboarding completion in database
      const currentUser = await AuthService.getCurrentUser();
      console.log('=== ONBOARDING COMPLETION TEST ===');
      console.log('Current user for onboarding completion:', currentUser);
      
      if (currentUser) {
        const userId = currentUser.id;
        console.log('=== TEST 1: Nickname and Mode Saving ===');
        
        // Ensure we have a nickname - use the one from onboarding data or fallback
        const nicknameToSave = onboardingData.nickname || 'there';
        
        // Use the selected mode if provided, otherwise fall back to onboardingData.mode
        const modeToSave = selectedMode || onboardingData.mode;
        
        console.log('Saving onboarding data:', {
          userId,
          nickname: onboardingData.nickname,
          mode: modeToSave,
          selectedMode,
          onboardingDataMode: onboardingData.mode,
          nicknameToSave: nicknameToSave
        });
        
        // Trust the database constraints - let it handle the insert/update logic
        // Always use the authenticated user's ID (which is currentUser.id)
        const result = await AuthService.updateUserProfile(currentUser.id, {
          settings: {
            nickname: nicknameToSave,
            mode: modeToSave,
            hasCompletedOnboarding: true,
            onboardingCompletedAt: new Date().toISOString(),
          }
        });
        
        if (result.success) {
          console.log('✅ ONBOARDING SUCCESS: Completed and stored in database:', {
            nickname: onboardingData.nickname,
            mode: modeToSave
          });
        } else {
          console.error('❌ ONBOARDING FAILED: Failed to update user profile:', result.error);
        }
      } else {
        console.log('❌ NO USER: No current user found for onboarding completion');
      }
      
      // Navigate to home screen
      console.log('🔄 NAVIGATING TO HOME SCREEN...');
      router.replace('/(tabs)');
      
    } catch (error) {
      console.error('❌ ONBOARDING EXCEPTION: Error saving onboarding data:', error);
      // Still redirect to home even if there's an error
      console.log('🔄 NAVIGATING TO HOME SCREEN (ERROR FALLBACK)...');
      router.replace('/(tabs)');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Blank screen - no content */}
      <View style={styles.blankScreen} />
      
      {/* Onboarding Popups */}
      <NicknamePopup
        visible={showNicknamePopup}
        onClose={() => setShowNicknamePopup(false)}
        onNext={handleNicknameNext}
        onSkip={handleNicknameSkip}
        defaultNickname={onboardingData.nickname}
      />
      <EnergyPopup
        visible={showEnergyPopup}
        onClose={() => setShowEnergyPopup(false)}
        onNext={handleEnergyNext}
        onSkip={handleEnergySkip}
        defaultEnergyLevel={onboardingData.energyLevel}
      />
      <OnboardingPopup
        visible={showModePopup}
        onClose={() => setShowModePopup(false)}
        onSkip={handleModeSkip}
        onModeSelect={handleModeSelect}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  blankScreen: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
}); 