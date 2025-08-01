import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthService } from '@/services/authService';

export default function SignInScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // const [isAppleLoading, setIsAppleLoading] = useState(false); // Commented out
  // const [isNotionLoading, setIsNotionLoading] = useState(false); // Commented out - keeping functionality for future use
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const colors = SensoryColors['calm'];

  useEffect(() => {
    // Check if user is already signed in
    checkSignInStatus();
  }, []);

  const checkSignInStatus = async () => {
    try {
      const isAuthenticated = await AuthService.isAuthenticated();
      if (isAuthenticated) {
        // User is already signed in, go to home
        router.replace('/(tabs)');
      }
    } catch (error) {
      console.error('Error checking sign-in status:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();
      
      if (result.success) {
        // OAuth flow will be handled by deep linking
        Alert.alert(
          'Google Sign In', 
          'Redirecting to Google... Please complete the sign-in process.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sign-in Error', 
          result.error?.message || 'Failed to sign in with Google. Please try again.'
        );
      }
    } catch (error) {
      console.error('Google sign-in error:', error);
      Alert.alert(
        'Sign-in Error', 
        'Failed to sign in with Google. Please try again.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Comment out Apple Sign-In handler
  // const handleAppleSignIn = async () => {
  //   setIsAppleLoading(true);
  //   try {
  //     const result = await AuthService.signInWithApple();
  //     if (result.success) {
  //       Alert.alert('Apple Sign In', 'Redirecting to Apple... Please complete the sign-in process.', [{ text: 'OK' }]);
  //     } else {
  //       Alert.alert('Sign-in Error', result.error?.message || 'Failed to sign in with Apple. Please try again.');
  //     }
  //   } catch (error) {
  //     console.error('Apple sign-in error:', error);
  //     Alert.alert('Sign-in Error', 'Failed to sign in with Apple. Please try again.');
  //   } finally {
  //     setIsAppleLoading(false);
  //   }
  // };

  // Comment out Notion Sign-In handler - keeping functionality for future use
  // const handleNotionSignIn = async () => {
  //   setIsNotionLoading(true);
  //   try {
  //     console.log('Starting Notion signin...');
  //     const result = await AuthService.signInWithNotionCustom();
  //     
  //     if (result.success) {
  //       console.log('Notion OAuth initiated successfully');
  //       // The redirect will happen automatically
  //     } else {
  //       console.error('Notion signin failed:', result.error);
  //       Alert.alert('Notion Sign-in Error', result.error?.message || 'Failed to sign in with Notion. Please try again.');
  //     }
  //   } catch (error) {
  //     console.error('Notion signin error:', error);
  //     Alert.alert('Notion Sign-in Error', 'An unexpected error occurred. Please try again.');
  //   } finally {
  //     setIsNotionLoading(false);
  //   }
  // };

  // Add email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleEmailSignIn = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please enter both email and password.');
      return;
    }

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await AuthService.signIn(trimmedEmail, trimmedPassword);
      if (result.success) {
        router.replace('/(tabs)');
      } else {
        Alert.alert('Sign-in Error', result.error?.message || 'Invalid email or password. Please try again.');
      }
    } catch (error) {
      console.error('Email sign-in error:', error);
      Alert.alert('Sign-in Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = () => {
    router.push('/(auth)/signup');
  };

  const handleResetPassword = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address first.');
      return;
    }

    try {
      const result = await AuthService.resetPassword(email.trim());
      
      if (result.success) {
        Alert.alert('Reset Password', 'Password reset email sent. Please check your inbox.');
      } else {
        Alert.alert('Reset Password Error', result.error?.message || 'Failed to send reset email. Please try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      Alert.alert('Reset Password Error', 'An unexpected error occurred. Please try again.');
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={{ alignItems: 'center', marginBottom: 4 }}>
          <Image
            source={require('../../assets/images/kind_frame_logo.png')}
            style={{ width: 80, height: 80, resizeMode: 'contain', marginBottom: 0 }}
            accessibilityLabel="KindFrame logo"
          />
        </View>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.appName, { color: colors.text }]}>KindFrame</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>Structure that respects your brain and your bandwidth.</Text>
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
          {/* Comment out Notion Sign-In button - keeping functionality for future use */}
          {/* <TouchableOpacity
            style={[
              styles.socialButton, 
              { backgroundColor: colors.buttonBackground },
              isNotionLoading && styles.socialButtonDisabled
            ]}
            onPress={handleNotionSignIn}
            disabled={isNotionLoading || isGoogleLoading || isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialButtonIcon, { color: colors.buttonText }]}>N</Text>
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              {isNotionLoading ? 'Signing in...' : 'Continue with Notion'}
            </Text>
          </TouchableOpacity> */}

          {/* Comment out Apple Sign-In button */}
          {/* <TouchableOpacity
            style={[
              styles.socialButton, 
              { backgroundColor: colors.buttonBackground },
              isAppleLoading && styles.socialButtonDisabled
            ]}
            onPress={handleAppleSignIn}
            disabled={isAppleLoading || isGoogleLoading || isLoading}
            activeOpacity={0.8}
          >
            <AppleIcon size={18} color={colors.buttonText} />
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              {isAppleLoading ? 'Signing in...' : 'Continue with Apple'}
            </Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[
              styles.socialButton, 
              { backgroundColor: colors.buttonBackground },
              isGoogleLoading && styles.socialButtonDisabled
            ]}
            onPress={handleGoogleSignIn}
            disabled={isGoogleLoading || isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialButtonIcon, { color: colors.buttonText }]}>G</Text>
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              {isGoogleLoading ? 'Signing in...' : 'Continue with Google'}
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
            style={[
              styles.loginButton, 
              { backgroundColor: colors.buttonBackground },
              isLoading && styles.socialButtonDisabled
            ]}
            onPress={handleEmailSignIn}
            disabled={isLoading || isGoogleLoading}
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
  socialButtonDisabled: {
    opacity: 0.6,
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