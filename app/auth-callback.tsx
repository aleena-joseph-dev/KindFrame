import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as WebBrowser from 'expo-web-browser';

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
      
      // Handle the OAuth callback
      const result = await AuthService.handleOAuthCallback(url);
      
      if (result.success) {
        // Successfully authenticated, navigate to home
        router.replace('/(tabs)');
      } else {
        // Authentication failed
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