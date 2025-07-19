import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Logo';
import { Text } from '@/components/ui/Text';
import { SensoryColors } from '@/constants/Colors';
import { router } from 'expo-router';
import { useState } from 'react';
import {
    Alert,
    Dimensions,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function EmailSignUpScreen() {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const sensoryTheme: 'low' | 'medium' | 'high' = 'low';

  const colors = SensoryColors[sensoryTheme];

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const validateForm = () => {
    if (!formData.firstName.trim()) {
      Alert.alert('Error', 'Please enter your first name.');
      return false;
    }
    if (!formData.lastName.trim()) {
      Alert.alert('Error', 'Please enter your last name.');
      return false;
    }
    if (!formData.email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return false;
    }
    if (!/\S+@\S+\.\S+/.test(formData.email)) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return false;
    }
    if (formData.password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters long.');
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      Alert.alert('Error', 'Passwords do not match.');
      return false;
    }
    return true;
  };

  const handleSignUp = async () => {
    if (!validateForm()) return;

    try {
      setIsLoading(true);
      
      // TODO: Implement actual email sign-up API call
      console.log('Creating account with:', formData);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success',
        'Account created successfully!',
        [
          {
            text: 'Continue',
            onPress: () => {
              // Navigate to onboarding or main app
              router.replace('/(tabs)');
            }
          }
        ]
      );
      
    } catch (error) {
      console.error('Sign-up error:', error);
      Alert.alert(
        'Sign-up Failed',
        'Unable to create account. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToSignUp = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={handleBackToSignUp} style={styles.backButton}>
              <Text variant="medium" size="base" style={{ color: '#000000' }}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Logo and Branding */}
          <View style={styles.logoContainer}>
            <Logo size={Math.min(80, width * 0.2)} />
            <Text 
              variant="bold" 
              size="3xl" 
              style={[styles.appName, { color: '#000000' }]}
            >
              KindFrame
            </Text>
            <Text 
              variant="regular" 
              size="base" 
              style={[styles.tagline, { color: '#000000' }]}
            >
              Create your account
            </Text>
          </View>

          {/* Sign-up Form */}
          <View style={styles.formContainer}>
            <Text 
              variant="medium" 
              size="2xl" 
              style={[styles.sectionTitle, { color: '#000000' }]}
            >
              Sign Up
            </Text>

            {/* Name Fields */}
            <View style={styles.nameContainer}>
              <View style={styles.inputContainer}>
                <Text variant="medium" size="base" style={[styles.inputLabel, { color: '#000000' }]}>First Name</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: '#000000',
                    fontFamily: 'FunnelDisplay-Regular',
                    fontSize: 16,
                  }]}
                  placeholder="Enter your first name"
                  placeholderTextColor="#666666"
                  value={formData.firstName}
                  onChangeText={(value) => handleInputChange('firstName', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text variant="medium" size="base" style={[styles.inputLabel, { color: '#000000' }]}>Last Name</Text>
                <TextInput
                  style={[styles.textInput, { 
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: '#000000',
                    fontFamily: 'FunnelDisplay-Regular',
                    fontSize: 16,
                  }]}
                  placeholder="Enter your last name"
                  placeholderTextColor="#666666"
                  value={formData.lastName}
                  onChangeText={(value) => handleInputChange('lastName', value)}
                  autoCapitalize="words"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* Email Field */}
            <View style={styles.inputContainer}>
              <Text variant="medium" size="base" style={[styles.inputLabel, { color: '#000000' }]}>Email</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: '#000000',
                  fontFamily: 'FunnelDisplay-Regular',
                  fontSize: 16,
                }]}
                placeholder="Enter your email"
                placeholderTextColor="#666666"
                value={formData.email}
                onChangeText={(value) => handleInputChange('email', value)}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Password Fields */}
            <View style={styles.inputContainer}>
              <Text variant="medium" size="base" style={[styles.inputLabel, { color: '#000000' }]}>Password</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: '#000000',
                  fontFamily: 'FunnelDisplay-Regular',
                  fontSize: 16,
                }]}
                placeholder="Create a password"
                placeholderTextColor="#666666"
                value={formData.password}
                onChangeText={(value) => handleInputChange('password', value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View style={styles.inputContainer}>
              <Text variant="medium" size="base" style={[styles.inputLabel, { color: '#000000' }]}>Confirm Password</Text>
              <TextInput
                style={[styles.textInput, { 
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  color: '#000000',
                  fontFamily: 'FunnelDisplay-Regular',
                  fontSize: 16,
                }]}
                placeholder="Confirm your password"
                placeholderTextColor="#666666"
                value={formData.confirmPassword}
                onChangeText={(value) => handleInputChange('confirmPassword', value)}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            {/* Sign Up Button */}
            <Button
              title={isLoading ? "Creating Account..." : "Create Account"}
              onPress={handleSignUp}
              loading={isLoading}
              style={styles.signUpButton}
              sensoryTheme={sensoryTheme}
            />

            {/* Legal Disclaimer */}
            <Text variant="regular" size="xs" style={[styles.legalText, { color: '#000000' }]}>
              By creating an account, you agree to our{' '}
              <Text variant="medium" size="xs" style={{ color: '#000000', textDecorationLine: 'underline' }}>Terms of Service</Text> and{' '}
              <Text variant="medium" size="xs" style={{ color: '#000000', textDecorationLine: 'underline' }}>Privacy Policy</Text>.
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Math.min(24, width * 0.06),
    paddingVertical: Math.min(32, height * 0.04),
    minHeight: height,
    alignItems: 'center',
  },
  header: {
    width: '100%',
    marginBottom: 20,
  },
  backButton: {
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: Math.min(48, height * 0.06),
    width: '100%',
  },
  appName: {
    marginBottom: 8,
    textAlign: 'center',
  },
  tagline: {
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  formContainer: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  sectionTitle: {
    marginBottom: 32,
    textAlign: 'center',
  },
  nameContainer: {
    flexDirection: 'row',
    width: '100%',
    gap: 16,
    marginBottom: 20,
  },
  inputContainer: {
    marginBottom: 20,
    width: '100%',
    alignItems: 'center',
  },
  inputLabel: {
    marginBottom: 8,
    textAlign: 'center',
  },
  textInput: {
    height: 48,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 350,
  },
  signUpButton: {
    marginTop: 8,
    marginBottom: 32,
    width: '100%',
    maxWidth: 350,
  },
  legalText: {
    textAlign: 'center',
    lineHeight: 18,
  },
}); 