import { AuthService } from '@/services/authService';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const isAuthenticated = await AuthService.isAuthenticated();
      
      if (isAuthenticated) {
        // User is authenticated, go to main app
        router.replace('/(tabs)');
      } else {
        // User is not authenticated, go to sign-in
        router.replace('/(auth)/signin');
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      // On error, redirect to sign-in
      router.replace('/(auth)/signin');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#e0e5de',
        padding: 20
      }}>
        <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#222', marginBottom: 20 }}>
          KindFrame App
        </Text>
        <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 24 }}>
          Welcome to your neurodivergent-friendly productivity app!
        </Text>
        <Text style={{ fontSize: 14, color: '#888', marginTop: 20, textAlign: 'center' }}>
          Checking authentication...
        </Text>
      </View>
    );
  }

  return null;
} 