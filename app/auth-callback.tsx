import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthService } from '@/services/authService';

export default function AuthCallbackScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const colors = SensoryColors['calm'];

  useEffect(() => {
    handleAuthCallback();
  }, []);

  const handleAuthCallback = async () => {
    try {
      // Get the current URL to extract auth parameters
      const url = window.location.href;
      console.log('Auth callback URL:', url);
      
      // Check if this is a Notion callback
      const urlParams = new URLSearchParams(window.location.search);
      const notionCode = urlParams.get('code');
      const notionState = urlParams.get('state');
      
      // Also check for Supabase OAuth parameters
      const accessToken = urlParams.get('access_token');
      const refreshToken = urlParams.get('refresh_token');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');
      
      console.log('URL parameters:', {
        notionCode: !!notionCode,
        accessToken: !!accessToken,
        refreshToken: !!refreshToken,
        error,
        errorDescription
      });
      
      if (error) {
        console.error('OAuth error:', error, errorDescription);
        Alert.alert(
          'Authentication Failed',
          errorDescription || 'OAuth authentication failed. Please try again.',
          [
            {
              text: 'OK',
              onPress: () => router.replace('/(auth)/signin'),
            },
          ]
        );
        return;
      }
      
      if (notionCode) {
        console.log('Notion OAuth callback detected');
        // Handle Notion OAuth callback
        const result = await AuthService.handleNotionCallback(notionCode, notionState || undefined);
        
        if (result.success) {
          console.log('Notion authentication successful');
          router.replace('/onboarding');
        } else {
          console.error('Notion authentication failed:', result.error);
          Alert.alert(
            'Notion Authentication Failed',
            result.error?.message || 'Failed to authenticate with Notion. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/signin'),
              },
            ]
          );
        }
      } else if (accessToken) {
        console.log('Supabase OAuth callback detected with access token');
        // Handle Supabase OAuth callback with tokens in URL params
        const result = await AuthService.handleOAuthCallback(url);
        
        if (result.success) {
          console.log('Supabase OAuth authentication successful');
          router.replace('/onboarding');
        } else {
          console.error('Supabase OAuth authentication failed:', result.error);
          Alert.alert(
            'Authentication Failed',
            result.error?.message || 'Failed to authenticate. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/signin'),
              },
            ]
          );
        }
      } else {
        // Handle regular Supabase OAuth callback (tokens in hash)
        console.log('Regular OAuth callback detected (tokens in hash)');
        const result = await AuthService.handleOAuthCallback(url);
        
        if (result.success) {
          console.log('OAuth authentication successful');
          router.replace('/onboarding');
        } else {
          console.error('OAuth authentication failed:', result.error);
          Alert.alert(
            'Authentication Failed',
            result.error?.message || 'Failed to authenticate. Please try again.',
            [
              {
                text: 'OK',
                onPress: () => router.replace('/(auth)/signin'),
              },
            ]
          );
        }
      }
    } catch (error) {
      console.error('Auth callback error:', error);
      Alert.alert(
        'Error',
        'An unexpected error occurred during authentication.',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/(auth)/signin'),
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          Completing Authentication...
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Please wait while we complete your sign-in.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
}); 