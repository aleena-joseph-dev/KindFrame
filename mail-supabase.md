# 📧 Email Authentication with Supabase

## Overview

This guide covers implementing email/password authentication with Supabase for the KindFrame app. Supabase provides robust email authentication with features like email verification, password reset, and secure session management.

## Prerequisites

1. **Supabase Project**: Active Supabase project
2. **Email Provider**: Configured email provider in Supabase
3. **Expo App**: KindFrame app with Supabase client configured

## Step 1: Supabase Email Configuration

### 1.1 Configure Email Provider

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Ensure **Email** is enabled
4. Configure email settings:
   - **Enable email confirmations**: Yes
   - **Enable secure email change**: Yes
   - **Enable double confirm changes**: Yes

### 1.2 Configure Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize templates for:
   - **Confirm signup**
   - **Reset password**
   - **Change email address**
   - **Magic link**

### 1.3 Configure SMTP Settings

1. Go to **Settings** → **Auth**
2. Configure SMTP settings:
   - **SMTP Host**: Your SMTP server
   - **SMTP Port**: 587 (TLS) or 465 (SSL)
   - **SMTP User**: Your SMTP username
   - **SMTP Pass**: Your SMTP password
   - **Sender Name**: KindFrame
   - **Sender Email**: noreply@kindframe.com

## Step 2: React Native Implementation

### 2.1 Create Email Auth Service

Create `services/emailAuth.ts`:

```typescript
import { supabase } from '../lib/supabase';

export async function signUpWithEmail(email: string, password: string, userData: any) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          sensory_mode: userData.sensoryMode || 'low',
          onboarding_completed: false,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email sign-up error:', error);
    throw error;
  }
}

export async function signInWithEmail(email: string, password: string) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Email sign-in error:', error);
    throw error;
  }
}

export async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    throw error;
  }
}

export async function updatePassword(newPassword: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Password update error:', error);
    throw error;
  }
}

export async function updateEmail(newEmail: string) {
  try {
    const { error } = await supabase.auth.updateUser({
      email: newEmail,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Email update error:', error);
    throw error;
  }
}

export async function sendEmailVerification() {
  try {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: (await supabase.auth.getUser()).data.user?.email,
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Email verification error:', error);
    throw error;
  }
}
```

### 2.2 Update Auth Context

Update `contexts/AuthContext.tsx`:

```typescript
import { 
  signUpWithEmail, 
  signInWithEmail, 
  resetPassword, 
  updatePassword, 
  updateEmail,
  sendEmailVerification 
} from '../services/emailAuth';

// Add to AuthContextType interface
interface AuthContextType {
  // ... existing properties
  signUpWithEmail: (email: string, password: string, userData: any) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateEmail: (newEmail: string) => Promise<void>;
  sendEmailVerification: () => Promise<void>;
}

// Add to AuthProvider
const signUpWithEmail = async (email: string, password: string, userData: any) => {
  try {
    await signUpWithEmail(email, password, userData);
    // Show email verification message
  } catch (error) {
    throw error;
  }
};

const signInWithEmail = async (email: string, password: string) => {
  try {
    await signInWithEmail(email, password);
    // Navigation will be handled by AuthContext
  } catch (error) {
    throw error;
  }
};

const resetPassword = async (email: string) => {
  try {
    await resetPassword(email);
    // Show success message
  } catch (error) {
    throw error;
  }
};

const updatePassword = async (newPassword: string) => {
  try {
    await updatePassword(newPassword);
    // Show success message
  } catch (error) {
    throw error;
  }
};

const updateEmail = async (newEmail: string) => {
  try {
    await updateEmail(newEmail);
    // Show verification message
  } catch (error) {
    throw error;
  }
};

const sendEmailVerification = async () => {
  try {
    await sendEmailVerification();
    // Show success message
  } catch (error) {
    throw error;
  }
};

// Add to provider value
<AuthContext.Provider value={{
  // ... existing values
  signUpWithEmail,
  signInWithEmail,
  resetPassword,
  updatePassword,
  updateEmail,
  sendEmailVerification,
}}>
```

## Step 3: Email Auth Components

### 3.1 Sign Up Component

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function SignUpScreen() {
  const { signUpWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword || !firstName || !lastName) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password, {
        firstName,
        lastName,
        sensoryMode: 'low',
      });
      
      Alert.alert(
        'Success',
        'Account created! Please check your email to verify your account.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create Account</Text>
      
      <TextInput
        style={styles.input}
        placeholder="First Name"
        value={firstName}
        onChangeText={setFirstName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Last Name"
        value={lastName}
        onChangeText={setLastName}
        autoCapitalize="words"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TextInput
        style={styles.input}
        placeholder="Confirm Password"
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignUp}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Creating Account...' : 'Create Account'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3.2 Sign In Component

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function SignInScreen() {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signInWithEmail(email, password);
      // Navigation will be handled by AuthContext
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleSignIn}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Signing In...' : 'Sign In'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.forgotPassword}
        onPress={() => {/* Navigate to forgot password */}}
      >
        <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### 3.3 Forgot Password Component

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function ForgotPasswordScreen() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(email);
      Alert.alert(
        'Success',
        'Password reset email sent! Please check your email.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you a link to reset your password.
      </Text>
      
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResetPassword}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'Send Reset Email'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Step 4: Email Verification

### 4.1 Email Verification Component

```typescript
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function EmailVerificationScreen() {
  const { user, sendEmailVerification } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleResendVerification = async () => {
    setLoading(true);
    try {
      await sendEmailVerification();
      Alert.alert('Success', 'Verification email sent!');
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Verify Your Email</Text>
      <Text style={styles.subtitle}>
        We've sent a verification email to:
      </Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.instructions}>
        Please check your email and click the verification link to continue.
      </Text>
      
      <TouchableOpacity
        style={[styles.button, loading && styles.buttonDisabled]}
        onPress={handleResendVerification}
        disabled={loading}
      >
        <Text style={styles.buttonText}>
          {loading ? 'Sending...' : 'Resend Verification Email'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

## Step 5: Password Security

### 5.1 Password Validation

```typescript
export function validatePassword(password: string) {
  const errors = [];
  
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/\d/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }
  
  return errors;
}
```

### 5.2 Password Strength Indicator

```typescript
import React from 'react';
import { View, Text } from 'react-native';

export function PasswordStrengthIndicator({ password }: { password: string }) {
  const getStrength = (password: string) => {
    let score = 0;
    
    if (password.length >= 8) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/\d/.test(password)) score++;
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++;
    
    return score;
  };

  const strength = getStrength(password);
  const getStrengthText = (strength: number) => {
    switch (strength) {
      case 0:
      case 1:
        return { text: 'Very Weak', color: '#ef4444' };
      case 2:
        return { text: 'Weak', color: '#f97316' };
      case 3:
        return { text: 'Fair', color: '#eab308' };
      case 4:
        return { text: 'Good', color: '#22c55e' };
      case 5:
        return { text: 'Strong', color: '#16a34a' };
      default:
        return { text: '', color: '#6b7280' };
    }
  };

  const { text, color } = getStrengthText(strength);

  return (
    <View style={styles.strengthContainer}>
      <View style={styles.strengthBar}>
        {[1, 2, 3, 4, 5].map((level) => (
          <View
            key={level}
            style={[
              styles.strengthSegment,
              { backgroundColor: level <= strength ? color : '#e5e7eb' }
            ]}
          />
        ))}
      </View>
      <Text style={[styles.strengthText, { color }]}>{text}</Text>
    </View>
  );
}
```

## Step 6: Testing

### 6.1 Test Email Flow

1. Create a new account with email
2. Check email for verification link
3. Click verification link
4. Verify account is activated

### 6.2 Test Password Reset

1. Go to forgot password screen
2. Enter email address
3. Check email for reset link
4. Reset password
5. Sign in with new password

## Troubleshooting

### Common Issues

1. **"Email not confirmed"**
   - Check spam folder
   - Resend verification email
   - Verify email address is correct

2. **"Invalid login credentials"**
   - Check email and password
   - Ensure account is verified
   - Try password reset

3. **"Email already in use"**
   - Try signing in instead
   - Use password reset if forgotten
   - Contact support if needed

### Debug Steps

1. Check Supabase logs for email errors
2. Verify SMTP configuration
3. Test email templates
4. Check email provider settings

## Security Best Practices

1. **Use strong passwords** with validation
2. **Enable email verification** for all accounts
3. **Implement rate limiting** for auth attempts
4. **Use HTTPS** in production
5. **Monitor auth logs** for suspicious activity
6. **Implement account lockout** after failed attempts

## Next Steps

1. **Google OAuth**: See `google-supabase.md`
2. **Apple Sign-In**: See `apple-supabase.md`
3. **User Profile Management**: See `supabase-usermanage.md`

## Example Usage

```typescript
// In your sign-in screen
import { SignInScreen } from '../components/SignInScreen';
import { SignUpScreen } from '../components/SignUpScreen';

export function AuthScreen() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  return (
    <View style={styles.container}>
      {mode === 'signin' ? (
        <SignInScreen />
      ) : (
        <SignUpScreen />
      )}
      
      <TouchableOpacity onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}>
        <Text>
          {mode === 'signin' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
```

This setup provides a complete email authentication system for KindFrame! 🎉 