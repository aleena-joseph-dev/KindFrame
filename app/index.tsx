import { useRouter } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator, Text } from 'react-native';
import { useGuestMode } from '@/contexts/GuestModeContext';
import { supabase } from '@/lib/supabase';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);
  const { isGuestMode } = useGuestMode();

  // Wait for the router to be ready before navigating
  React.useEffect(() => {
    const checkAuthAndNavigate = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        // Small delay to ensure layout is mounted
        setTimeout(() => {
          setIsReady(true);
          
          if (session) {
            // User is authenticated, go to main app
            router.replace('/(tabs)');
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