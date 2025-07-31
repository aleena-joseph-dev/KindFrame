import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthService } from '@/services/authService';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // const [isAppleLoading, setIsAppleLoading] = useState(false); // Commented out
  const [isNotionLoading, setIsNotionLoading] = useState(false); // Added
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
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

  const handleGoogleSignUp = async () => {
    setIsGoogleLoading(true);
    try {
      const result = await AuthService.signInWithGoogle();
      
      if (result.success) {
        // OAuth flow will be handled by deep linking
        Alert.alert(
          'Google Sign Up', 
          'Redirecting to Google... Please complete the sign-up process.',
          [{ text: 'OK' }]
        );
      } else {
        Alert.alert(
          'Sign-up Error', 
          result.error?.message || 'Failed to sign up with Google. Please try again.'
        );
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
      Alert.alert(
        'Sign-up Error', 
        'Failed to sign up with Google. Please try again.'
      );
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Comment out Apple Sign-Up handler
  // const handleAppleSignUp = async () => {
  //   setIsAppleLoading(true);
  //   try {
  //     const result = await AuthService.signInWithApple();
  //     if (result.success) {
  //       Alert.alert('Apple Sign Up', 'Redirecting to Apple... Please complete the sign-up process.', [{ text: 'OK' }]);
  //     } else {
  //       Alert.alert('Sign-up Error', result.error?.message || 'Failed to sign up with Apple. Please try again.');
  //     }
  //   } catch (error) {
  //     console.error('Apple sign-up error:', error);
  //     Alert.alert('Sign-up Error', 'Failed to sign up with Apple. Please try again.');
  //   } finally {
  //     setIsAppleLoading(false);
  //   }
  // };

  const handleNotionSignUp = async () => {
    setIsNotionLoading(true);
    try {
      const result = await AuthService.signInWithNotion();
      if (result.success) {
        Alert.alert('Notion Sign Up', 'Redirecting to Notion... Please complete the sign-up process.', [{ text: 'OK' }]);
      } else {
        Alert.alert('Sign-up Error', result.error?.message || 'Failed to sign up with Notion. Please try again.');
      }
    } catch (error) {
      console.error('Notion sign-up error:', error);
      Alert.alert('Sign-up Error', 'Failed to sign up with Notion. Please try again.');
    } finally {
      setIsNotionLoading(false);
    }
  };

  // Add email validation function
  const isValidEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidEmailDomain = (email: string): boolean => {
    // Check for common valid domains
    const validDomains = [
      'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com',
      'protonmail.com', 'mail.com', 'aol.com', 'live.com', 'msn.com',
      'yandex.com', 'zoho.com', 'fastmail.com', 'tutanota.com'
    ];
    
    const domain = email.split('@')[1]?.toLowerCase();
    return validDomains.includes(domain);
  };

  // Add password validation function
  const isValidPassword = (password: string): { isValid: boolean; message: string } => {
    if (password.length < 8) {
      return { isValid: false, message: 'Password must be at least 8 characters long.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[a-z]/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one lowercase letter.' };
    }
    if (!/\d/.test(password)) {
      return { isValid: false, message: 'Password must contain at least one number.' };
    }
    return { isValid: true, message: '' };
  };

  // Add password strength indicator
  const getPasswordStrength = (password: string): { strength: 'weak' | 'medium' | 'strong'; color: string; text: string } => {
    if (password.length === 0) {
      return { strength: 'weak', color: '#6B7280', text: '' };
    }
    
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    
    const score = [hasUpperCase, hasLowerCase, hasNumbers, hasMinLength].filter(Boolean).length;
    
    if (score <= 1) {
      return { strength: 'weak', color: '#EF4444', text: 'Weak' };
    } else if (score <= 3) {
      return { strength: 'medium', color: '#F59E0B', text: 'Medium' };
    } else {
      return { strength: 'strong', color: '#10B981', text: 'Strong' };
    }
  };

  const passwordStrength = getPasswordStrength(password);

  const handleEmailSignUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Check if all fields are filled
    if (!trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      Alert.alert('Error', 'Please fill in all fields.');
      return;
    }

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }

    // Check for valid email domain
    if (!isValidEmailDomain(trimmedEmail)) {
      Alert.alert(
        'Invalid Email Domain', 
        'Please use a valid email domain (e.g., gmail.com, outlook.com, yahoo.com).\n\nTest domains like example.com are not allowed.'
      );
      return;
    }

    // Validate password
    const passwordValidation = isValidPassword(trimmedPassword);
    if (!passwordValidation.isValid) {
      Alert.alert('Invalid Password', passwordValidation.message);
      return;
    }

    // Check password confirmation
    if (trimmedPassword !== trimmedConfirmPassword) {
      Alert.alert('Password Mismatch', 'Passwords do not match. Please try again.');
      return;
    }

    // Additional password length check for Supabase
    if (trimmedPassword.length < 6) {
      Alert.alert('Password Too Short', 'Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Starting signup process...');
      const result = await AuthService.signUp(trimmedEmail, trimmedPassword, fullName);
      
      if (result.success) {
        console.log('Signup successful, redirecting...');
        // Since email confirmation is disabled, redirect immediately
        router.replace('/(tabs)');
      } else {
        console.error('Signup failed:', result.error);
        Alert.alert('Sign-up Error', result.error?.message || 'Failed to create account. Please try again.');
      }
    } catch (error) {
      console.error('Email sign-up error:', error);
      Alert.alert('Sign-up Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin');
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
            Ready to get started?
          </Text>
          <Text style={[styles.signupTitle, { color: colors.text }]}>
            Create your KindFrame account
          </Text>
        </View>

        {/* Social Sign-up Buttons */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            style={[
              styles.socialButton, 
              { backgroundColor: colors.buttonBackground },
              isNotionLoading && styles.socialButtonDisabled
            ]}
            onPress={handleNotionSignUp}
            disabled={isNotionLoading || isGoogleLoading || isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialButtonIcon, { color: colors.buttonText }]}>N</Text>
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              {isNotionLoading ? 'Signing up...' : 'Continue with Notion'}
            </Text>
          </TouchableOpacity>

          {/* Comment out Apple Sign-Up button */}
          {/* <TouchableOpacity
            style={[
              styles.socialButton, 
              { backgroundColor: colors.buttonBackground },
              isAppleLoading && styles.socialButtonDisabled
            ]}
            onPress={handleAppleSignUp}
            disabled={isAppleLoading || isGoogleLoading || isLoading}
            activeOpacity={0.8}
          >
            <AppleIcon size={18} color={colors.buttonText} />
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              {isAppleLoading ? 'Signing up...' : 'Continue with Apple'}
            </Text>
          </TouchableOpacity> */}

          <TouchableOpacity
            style={[
              styles.socialButton, 
              { backgroundColor: colors.buttonBackground },
              isGoogleLoading && styles.socialButtonDisabled
            ]}
            onPress={handleGoogleSignUp}
            disabled={isGoogleLoading || isNotionLoading || isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialButtonIcon, { color: colors.buttonText }]}>G</Text>
            <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
              {isGoogleLoading ? 'Signing up...' : 'Continue with Google'}
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
              placeholder="Enter your email (e.g., user@gmail.com)"
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
            {password.length > 0 && (
              <View style={styles.passwordStrengthContainer}>
                <Text style={[styles.passwordStrengthText, { color: passwordStrength.color }]}>
                  {passwordStrength.text}
                </Text>
                <View style={styles.passwordStrengthBar}>
                  <View 
                    style={[
                      styles.passwordStrengthFill, 
                      { 
                        backgroundColor: passwordStrength.color,
                        width: `${passwordStrength.strength === 'weak' ? '33%' : passwordStrength.strength === 'medium' ? '66%' : '100%'}`
                      }
                    ]} 
                  />
                </View>
              </View>
            )}
            
            {password.length > 0 && (
              <Text style={[styles.passwordRequirements, { color: colors.textSecondary }]}>
                Password must be at least 8 characters with uppercase, lowercase, and number
              </Text>
            )}
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
            style={[
              styles.signupButton, 
              { backgroundColor: colors.buttonBackground },
              isLoading && styles.socialButtonDisabled
            ]}
            onPress={handleEmailSignUp}
            disabled={isLoading || isGoogleLoading || isNotionLoading}
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
  passwordStrengthContainer: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  passwordStrengthText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 8,
  },
  passwordStrengthBar: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#E5E7EB',
  },
  passwordStrengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  passwordRequirements: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'left',
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