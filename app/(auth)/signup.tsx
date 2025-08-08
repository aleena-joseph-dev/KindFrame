import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { SensoryColors } from '@/constants/Colors';
import { useGuestData } from '@/contexts/GuestDataContext';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthService } from '@/services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SignUpScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { handleSignUpFromHomeScreen } = useGuestData();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  // const [isAppleLoading, setIsAppleLoading] = useState(false); // Commented out
  // const [isNotionLoading, setIsNotionLoading] = useState(false); // Commented out - keeping functionality for future use
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];

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
      // Check SaveWorkModal flag before calling handleSignUpFromHomeScreen
      const cameThroughSaveWorkModal = await AsyncStorage.getItem('came_through_save_work_modal');
      console.log('🔍 [SIGNUP DEBUG] SaveWorkModal flag before handleSignUpFromHomeScreen:', cameThroughSaveWorkModal);
      
      // Only handle home screen sign-up scenario if user did NOT come through SaveWorkModal
      if (cameThroughSaveWorkModal !== 'true') {
        console.log('🔍 [SIGNUP DEBUG] User came from home screen, clearing task data');
        await handleSignUpFromHomeScreen();
      } else {
        console.log('🔍 [SIGNUP DEBUG] User came through SaveWorkModal, preserving task data');
      }
      
      // Check SaveWorkModal flag after calling handleSignUpFromHomeScreen
      const flagAfter = await AsyncStorage.getItem('came_through_save_work_modal');
      console.log('🔍 [SIGNUP DEBUG] SaveWorkModal flag after handleSignUpFromHomeScreen:', flagAfter);
      
      const result = await AuthService.signInWithGoogle();
      
      if (result.success) {
        // OAuth flow will be handled by deep linking
        console.log('Google Sign Up: Redirecting to Google... Please complete the sign-up process.');
        // Note: The actual redirect after OAuth will be handled in the auth callback
        // which should also check for onboarding status
      } else {
        console.error('Sign-up Error:', result.error?.message || 'Failed to sign up with Google. Please try again.');
      }
    } catch (error) {
      console.error('Google sign-up error:', error);
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

  // Comment out Notion Sign-Up handler - keeping functionality for future use
  // const handleNotionSignUp = async () => {
  //   setIsNotionLoading(true);
  //   try {
  //     console.log('Starting Notion signup...');
  //     const result = await AuthService.signInWithNotionCustom();
  //     
  //     if (result.success) {
  //       console.log('Notion OAuth initiated successfully');
  //       // The redirect will happen automatically
  //     } else {
  //       console.error('Notion signup failed:', result.error);
  //       Alert.alert('Notion Sign-up Error', result.error?.message || 'Failed to sign up with Notion. Please try again.');
  //     }
  //   } catch (error) {
  //     console.error('Notion signup error:', error);
  //     Alert.alert('Notion Sign-up Error', 'An unexpected error occurred. Please try again.');
  //   } finally {
  //     setIsNotionLoading(false);
  //   }
  // };

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

  const checkOnboardingStatus = async () => {
    try {
      const currentUser = await AuthService.getCurrentUser();
      if (!currentUser) return false;

      // Check if user has completed onboarding in their profile
      const hasCompletedInProfile = currentUser.profile?.settings?.hasCompletedOnboarding;
      let hasCompletedInStorage = await AsyncStorage.getItem('hasCompletedOnboarding');
      
      console.log('Signup onboarding check:', {
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
      
      console.log('Signup onboarding completion:', isOnboardingCompleted);
      return isOnboardingCompleted;
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      return false;
    }
  };

  const handleEmailSignUp = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Check if all fields are filled
    if (!trimmedEmail || !trimmedPassword || !trimmedConfirmPassword) {
      console.error('Error: Please fill in all fields.');
      return;
    }

    // Validate email format
    if (!isValidEmail(trimmedEmail)) {
      console.error('Invalid Email: Please enter a valid email address.');
      return;
    }

    // Check for valid email domain
    if (!isValidEmailDomain(trimmedEmail)) {
      console.error('Invalid Email Domain: Please use a valid email domain (e.g., gmail.com, outlook.com, yahoo.com). Test domains like example.com are not allowed.');
      return;
    }

    // Validate password
    const passwordValidation = isValidPassword(trimmedPassword);
    if (!passwordValidation.isValid) {
      console.error('Invalid Password:', passwordValidation.message);
      return;
    }

    // Check password confirmation
    if (trimmedPassword !== trimmedConfirmPassword) {
      console.error('Password Mismatch: Passwords do not match. Please try again.');
      return;
    }

    // Additional password length check for Supabase
    if (trimmedPassword.length < 6) {
      console.error('Password Too Short: Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      // Check SaveWorkModal flag before calling handleSignUpFromHomeScreen
      const cameThroughSaveWorkModal = await AsyncStorage.getItem('came_through_save_work_modal');
      console.log('🔍 [SIGNUP DEBUG] SaveWorkModal flag before handleSignUpFromHomeScreen (email):', cameThroughSaveWorkModal);
      
      // Only handle home screen sign-up scenario if user did NOT come through SaveWorkModal
      if (cameThroughSaveWorkModal !== 'true') {
        console.log('🔍 [SIGNUP DEBUG] User came from home screen (email), clearing task data');
        await handleSignUpFromHomeScreen();
      } else {
        console.log('🔍 [SIGNUP DEBUG] User came through SaveWorkModal (email), preserving task data');
      }
      
      // Check SaveWorkModal flag after calling handleSignUpFromHomeScreen
      const flagAfter = await AsyncStorage.getItem('came_through_save_work_modal');
      console.log('🔍 [SIGNUP DEBUG] SaveWorkModal flag after handleSignUpFromHomeScreen (email):', flagAfter);
      
      console.log('Starting signup process...');
      const result = await AuthService.signUp(trimmedEmail, trimmedPassword, fullName);
      
      if (result.success) {
        console.log('Signup successful, checking onboarding status...');
        // Check if user needs onboarding (new users should always need onboarding)
        const hasCompletedOnboarding = await checkOnboardingStatus();
        if (hasCompletedOnboarding) {
          router.replace('/(tabs)');
        } else {
          router.replace('/onboarding');
        }
      } else {
        console.error('Signup failed:', result.error);
      }
    } catch (error) {
      console.error('Email sign-up error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = () => {
    router.push('/(auth)/signin');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
          <Text style={[styles.appName, { color: '#000000' }]}>KindFrame</Text>
          <Text style={[styles.tagline, { color: '#000000' }]}>Structure that respects your brain and your bandwidth.</Text>
        </View>

        {/* App Introduction */}
        <View style={styles.introContainer}>
          <View style={styles.introBlock}>
            <View style={styles.introHeader}>
              <Text style={[styles.introBlockIcon, { color: colors.primary }]}>🎯</Text>
              <Text style={[styles.introBlockTitle, { color: '#000000' }]}>Productivity Meets Wellness</Text>
            </View>
            <Text style={[styles.introBlockText, { color: '#000000' }]}>
              Quick Jot for instant thoughts, Notes for organization, Kanban for projects, Pomodoro for focus, Calendar for planning, Goals for direction, and Todos for tasks—all designed to work with your natural rhythms.
            </Text>
          </View>

          <View style={styles.introBlock}>
            <View style={styles.introHeader}>
              <Text style={[styles.introBlockIcon, { color: colors.primary }]}>🧘‍♀️</Text>
              <Text style={[styles.introBlockTitle, { color: '#000000' }]}>Mindful Living Tools</Text>
            </View>
            <Text style={[styles.introBlockText, { color: '#000000' }]}>
              Meditation, breathing, mood tracking, music sessions, and zone-out moments—supporting your mental wellness.
            </Text>
          </View>

          <View style={styles.introBlock}>
            <View style={styles.introHeader}>
              <Text style={[styles.introBlockIcon, { color: colors.primary }]}>⚡</Text>
              <Text style={[styles.introBlockTitle, { color: '#000000' }]}>Adaptive Intelligence</Text>
            </View>
            <Text style={[styles.introBlockText, { color: '#000000' }]}>
              Smart interface that adapts to your energy levels and cognitive load—providing exactly what you need, when you need it.
            </Text>
          </View>
        </View>

        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={[styles.greetingText, { color: '#000000' }]}>
            Ready to get started?
          </Text>
          <Text style={[styles.signupTitle, { color: '#000000' }]}>
            Create your KindFrame account
          </Text>
        </View>

        {/* Social Sign-up Buttons */}
        <View style={styles.socialButtons}>
          {/* Comment out Notion Sign-Up button - keeping functionality for future use */}
          {/* <TouchableOpacity
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
          </TouchableOpacity> */}

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
              { backgroundColor: colors.primary },
              isGoogleLoading && styles.socialButtonDisabled
            ]}
            onPress={handleGoogleSignUp}
            disabled={isGoogleLoading || isLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.socialButtonIcon, { color: '#FFFFFF' }]}>G</Text>
            <Text style={[styles.socialButtonText, { color: '#FFFFFF' }]}>
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
            <Text style={[styles.inputLabel, { color: '#000000' }]}>Email</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: '#000000'
              }]}
              placeholder="Enter your email (e.g., user@gmail.com)"
              placeholderTextColor="#666666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: '#000000' }]}>Password</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: '#000000'
              }]}
              placeholder="Create a password"
              placeholderTextColor="#666666"
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
              <Text style={[styles.passwordRequirements, { color: '#666666' }]}>
                Password must be at least 8 characters with uppercase, lowercase, and number
              </Text>
            )}
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.inputLabel, { color: '#000000' }]}>Confirm Password</Text>
            <TextInput
              style={[styles.textInput, { 
                backgroundColor: colors.surface,
                borderColor: colors.border,
                color: '#000000'
              }]}
              placeholder="Confirm your password"
              placeholderTextColor="#666666"
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
              { backgroundColor: colors.primary },
              isLoading && styles.socialButtonDisabled
            ]}
            onPress={handleEmailSignUp}
            disabled={isLoading || isGoogleLoading}
            activeOpacity={0.8}
          >
            <Text style={[styles.signupButtonText, { color: '#FFFFFF' }]}>
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Links */}
        <View style={styles.links}>
          <TouchableOpacity onPress={handleSignIn}>
            <Text style={[styles.linkText, { color: '#000000' }]}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
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
  introContainer: {
    marginHorizontal: 16,
    marginBottom: 20,
    gap: 16,
  },
  introBlock: {
    alignItems: 'flex-start',
    paddingVertical: 8,
  },
  introHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  introBlockIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  introBlockTitle: {
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'left',
    lineHeight: 18,
  },
  introBlockText: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'left',
    opacity: 0.7,
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