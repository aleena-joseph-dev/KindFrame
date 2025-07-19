import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppleIcon from '@/components/icons/AppleIcon';
import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

  const handleGoogleSignIn = async () => {
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
      console.error('Sign-in error:', error);
      Alert.alert('Sign-in Error', 'Failed to sign in. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
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
      console.error('Apple sign-in error:', error);
      Alert.alert('Sign-in Error', 'Failed to sign in with Apple. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignIn = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    try {
      // Mock email sign-in for development
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
      console.error('Email sign-in error:', error);
      Alert.alert('Sign-in Error', 'Invalid email or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/signup');
  };

  const handleResetPassword = () => {
    Alert.alert('Reset Password', 'Password reset functionality will be implemented soon.');
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
            Hey again. Ready to roll at your pace?
          </Text>
          <Text style={[styles.loginTitle, { color: colors.text }]}>
            Log in to KindFrame
          </Text>
        </View>

        {/* Social Login Buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[styles.socialButton, { backgroundColor: colors.buttonBackground }]}
            onPress={handleAppleSignIn}
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
            onPress={handleGoogleSignIn}
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
              placeholder="Enter your password"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Log In Button */}
          <TouchableOpacity
            style={[styles.loginButton, { backgroundColor: colors.buttonBackground }]}
            onPress={handleEmailSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.loginButtonText, { color: colors.buttonText }]}>
              {isLoading ? 'Signing in...' : 'Log In'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Links */}
        <View style={styles.links}>
          <TouchableOpacity onPress={handleResetPassword}>
            <Text style={[styles.linkText, { color: colors.text, textDecorationLine: 'underline' }]}>
              Reset password
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleSignUp}>
            <Text style={[styles.linkText, { color: colors.text }]}>
              Don't have an account?{' '}
              <Text style={{ textDecorationLine: 'underline' }}>Create new account</Text>
            </Text>
          </TouchableOpacity>
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
  loginTitle: {
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
  loginButton: {
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
  loginButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  links: {
    alignItems: 'center',
    gap: 16,
  },
  linkText: {
    fontSize: 14,
    textAlign: 'center',
  },
}); 