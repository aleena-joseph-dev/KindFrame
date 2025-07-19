import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppleIcon from '@/components/icons/AppleIcon';
import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const colors = SensoryColors.low;

  useEffect(() => {
    // Check if user is already signed in
    checkSignInStatus();
  }, []);

  const checkSignInStatus = async () => {
    try {
      const userToken = await AsyncStorage.getItem('userToken');
      if (userToken) {
        // User is already signed in, go to home
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking sign-in status:', error);
    }
  };

  const handleGoogleSignUp = async () => {
    setIsLoading(true);
    try {
      // Mock Google OAuth for development
      const mockUserData = {
        id: 'mock-user-id',
        email: 'user@example.com',
        name: 'Test User',
        picture: null,
      };

      // Store user data
      await AsyncStorage.setItem('userToken', 'mock-token');
      await AsyncStorage.setItem('userData', JSON.stringify(mockUserData));

      // Navigate to home screen (onboarding will be handled there)
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Sign-up error:', error);
      Alert.alert('Sign-up Error', 'Failed to sign up. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setIsLoading(true);
    try {
      // Mock Apple Sign In for development
      const mockUserData = {
        id: 'mock-apple-user-id',
        email: 'user@icloud.com',
        name: 'Apple User',
        picture: null,
      };

      // Store user data
      await AsyncStorage.setItem('userToken', 'mock-apple-token');
      await AsyncStorage.setItem('userData', JSON.stringify(mockUserData));

      // Navigate to home screen
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Apple sign-up error:', error);
      Alert.alert('Sign-up Error', 'Failed to sign up with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async () => {
    if (!email.trim() || !password.trim() || !confirmPassword.trim()) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      // Mock email sign-up for development
      const mockUserData = {
        id: 'mock-email-user-id',
        email: email.trim(),
        name: 'Email User',
        picture: null,
      };

      // Store user data
      await AsyncStorage.setItem('userToken', 'mock-email-token');
      await AsyncStorage.setItem('userData', JSON.stringify(mockUserData));

      // Navigate to home screen
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Email sign-up error:', error);
      Alert.alert('Sign-up Error', 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/signin');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.text }]}>KindFrame</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Structure that respects your brain and your bandwidth.
          </Text>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: colors.text }]}>
            Ready to get started?
          </Text>
          <Text style={[styles.signupTitle, { color: colors.text }]}>
            Create your KindFrame account
          </Text>
        </View>

        {/* Social Sign-up Buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: colors.buttonBackground }]}
            onPress={handleAppleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <AppleIcon size={18} color={colors.buttonText} />
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              Continue with Apple
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: colors.buttonBackground }]}
            onPress={handleGoogleSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialButtonIcon, { color: colors.buttonText }]}>G</Text>
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              Continue with Google
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
          <Text style={[styles.dividerText, { color: colors.textSecondary }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.textSecondary }]} />
        </View>

        {/* Email and Password Fields */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Email</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Password</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Create a password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>Confirm Password</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: colors.text
              }]}
              placeholder="Confirm your password"
              placeholderTextColor={colors.textSecondary}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Sign Up Button */}
          <TouchableOpacity
            style={[styles.signupButton, { backgroundColor: colors.buttonBackground }]}
            onPress={handleEmailSignUp}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.signupButtonText, { color: colors.buttonText }]}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Links */}
        <View style={styles.links}>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={[styles.linkText, { color: colors.text }]}>
              Already have an account?{' '}
              <Text style={{ textDecorationLine: 'underline' }}>Sign in</Text>
            </Text>
          </TouchableOpacity>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>
            By creating an account, you agree to our Terms of Service and Privacy Policy
          </Text>
        </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appName: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
  },
  greeting: {
    alignItems: 'center',
    marginBottom: 32,
  },
  greetingText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 8,
  },
  signupTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  socialButtons: {
    marginBottom: 24,
  },
  socialButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  socialButtonIcon: {
    fontSize: 18,
    marginRight: 12,
    fontWeight: 'bold',
  },
  socialButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    opacity: 0.3,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
  },
  signupButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  signupButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  links: {
    alignItems: 'center',
    marginBottom: 24,
  },
  linkText: {
    fontSize: 14,
    textAlign: 'center',
  },
  footer: {
    alignItems: 'center',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
}); 