import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface GuestModeIndicatorProps {
  onSignUp?: () => void;
  showSignUpButton?: boolean;
}

export function GuestModeIndicator({ onSignUp, showSignUpButton = true }: GuestModeIndicatorProps) {
  const { colors } = useThemeColors();
  const router = useRouter();

  const handleSignUp = () => {
    if (onSignUp) {
      onSignUp();
    } else {
      router.push('/(auth)/signup');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.text }]}>
          👤 Guest Mode
        </Text>
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          You're exploring in guest mode. Your data is saved locally and will be transferred to your account when you sign up.
        </Text>
        {showSignUpButton && (
          <TouchableOpacity
            style={[styles.signUpButton, { backgroundColor: colors.primary }]}
            onPress={handleSignUp}
          >
            <Text style={[styles.signUpText, { color: colors.background }]}>
              Sign Up to Save Permanently
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  content: {
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 12,
  },
  signUpButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  signUpText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 