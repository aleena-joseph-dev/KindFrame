import { useGuestMode } from '@/contexts/GuestModeContext';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);
  const { isGuestMode } = useGuestMode();

  const checkOnboardingStatus = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) return false;

      // Check if user has completed onboarding in their profile
      const hasCompletedInProfile = currentUser.profile?.settings?.hasCompletedOnboarding;
      let hasCompletedInStorage = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      console.log('Index onboarding check:', {
        hasCompletedInProfile,
        hasCompletedInStorage,
        profileExists: !!currentUser.profile,
        settingsExist: !!currentUser.profile?.settings
      });
      
      // ADDITIONAL FIX: Clear AsyncStorage flag if it exists but profile doesn't have explicit flag
      if (hasCompletedInStorage === 'true' && !hasCompletedInProfile) {
        console.log('🔧 ADDITIONAL FIX: Clearing AsyncStorage flag because profile has no explicit completion flag');
        await AsyncStorage.removeItem('hasCompletedOnboarding');
        hasCompletedInStorage = null;
      }
      
      // Only consider it completed if hasCompletedOnboarding is explicitly true
      const isOnboardingCompleted = hasCompletedInProfile === true || hasCompletedInStorage === 'true';
      
      console.log('Index onboarding completion:', isOnboardingCompleted);
      return isOnboardingCompleted;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  // Wait for the router to be ready before navigating
  React.useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Small delay to ensure layout is mounted
        setTimeout(async () => {
          setIsReady(true);
          
          if (session) {
            // User is authenticated, check if they need onboarding
            const hasCompletedOnboarding = await checkOnboardingStatus();
            if (hasCompletedOnboarding) {
              router.replace('/(tabs)');
            } else {
              router.replace('/onboarding');
            }
          } else if (isGuestMode) {
            // User is in guest mode, go to main app
            router.replace('/(tabs)');
          } else {
            // No session and not in guest mode, go to sign in
            router.replace('/(auth)/signin');
          }
        }, 100);
      } catch (error) {
        console.error('Error checking auth status:', error);
        // Fallback to guest mode
        setTimeout(() => {
          setIsReady(true);
          router.replace('/(tabs)');
        }, 100);
      }
    };

    checkAuthAndNavigate();
  }, [router, isGuestMode]);

  // Show loading indicator while waiting
  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#e0e5de'
      }}>
        <ActivityIndicator size="large" color="#4285f4" />
        <Text style={{ marginTop: 16, fontSize: 16, color: '#666' }}>
          {isGuestMode ? 'Loading Guest Mode...' : 'Loading...'}
        </Text>
      </View>
    );
  }

  return null;
} 