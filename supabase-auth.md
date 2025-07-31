# 🔐 Advanced Supabase Authentication Features

## Overview

This guide covers advanced authentication features in Supabase for the KindFrame app, including session management, multi-factor authentication, social login customization, and security best practices.

## Prerequisites

1. **Supabase Project**: Active Supabase project with basic auth configured
2. **React Native App**: KindFrame app with Supabase client configured
3. **Basic Auth Setup**: Email/password authentication working

## Step 1: Advanced Session Management

### 1.1 Custom Session Handling

```typescript
import { supabase } from '../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Custom session storage
const customStorage = {
  getItem: async (key: string) => {
    const value = await AsyncStorage.getItem(key);
    return value;
  },
  setItem: async (key: string, value: string) => {
    await AsyncStorage.setItem(key, value);
  },
  removeItem: async (key: string) => {
    await AsyncStorage.removeItem(key);
  },
};

// Initialize Supabase with custom storage
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: customStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 1.2 Session Persistence

```typescript
// Enhanced AuthContext with session persistence
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // ... rest of provider
}
```

### 1.3 Session Refresh

```typescript
// Automatic session refresh
useEffect(() => {
  const refreshSession = async () => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Session refresh failed:', error);
      // Handle session refresh failure
    }
  };

  // Refresh session every 30 minutes
  const interval = setInterval(refreshSession, 30 * 60 * 1000);
  return () => clearInterval(interval);
}, []);
```

## Step 2: Multi-Factor Authentication (MFA)

### 2.1 Enable MFA

```typescript
// Enable MFA for user
export async function enableMFA() {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('MFA enrollment error:', error);
    throw error;
  }
}

// Verify MFA
export async function verifyMFA(code: string) {
  try {
    const { data, error } = await supabase.auth.mfa.challenge({
      factorId: 'your_factor_id',
      code: code,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('MFA verification error:', error);
    throw error;
  }
}
```

### 2.2 MFA Component

```typescript
import React, { useState } from 'react';
import { View, TextInput, TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function MFASetupScreen() {
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleEnableMFA = async () => {
    setLoading(true);
    try {
      const { data } = await enableMFA();
      setQrCode(data.totp.qr_code);
    } catch (error) {
      Alert.alert('Error', 'Failed to enable MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyMFA = async () => {
    if (!verificationCode) {
      Alert.alert('Error', 'Please enter the verification code');
      return;
    }

    setLoading(true);
    try {
      await verifyMFA(verificationCode);
      Alert.alert('Success', 'MFA enabled successfully!');
    } catch (error) {
      Alert.alert('Error', 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set Up Two-Factor Authentication</Text>
      
      {!qrCode ? (
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleEnableMFA}
          disabled={loading}
        >
          <Text style={styles.buttonText}>
            {loading ? 'Setting up...' : 'Enable MFA'}
          </Text>
        </TouchableOpacity>
      ) : (
        <View>
          <Text style={styles.subtitle}>
            Scan this QR code with your authenticator app:
          </Text>
          {/* Display QR code */}
          <TextInput
            style={styles.input}
            placeholder="Enter verification code"
            value={verificationCode}
            onChangeText={setVerificationCode}
            keyboardType="number-pad"
          />
          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleVerifyMFA}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Verifying...' : 'Verify Code'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
```

## Step 3: Social Login Customization

### 3.1 Custom OAuth Scopes

```typescript
// Custom Google OAuth with specific scopes
export async function signInWithGoogleCustom() {
  try {
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID);
    authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid profile email https://www.googleapis.com/auth/calendar.readonly');
    authUrl.searchParams.append('state', Crypto.randomUUID());
    
    const result = await AuthSession.startAsync({
      authUrl: authUrl.toString(),
      returnUrl: GOOGLE_REDIRECT_URI,
    });
    
    if (result.type === 'success' && result.params.code) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.params.code,
      });
      
      if (error) throw error;
      return data;
    }
  } catch (error) {
    console.error('Custom Google sign-in error:', error);
    throw error;
  }
}
```

### 3.2 Custom User Metadata

```typescript
// Sign up with custom metadata
export async function signUpWithCustomMetadata(userData: any) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          first_name: userData.firstName,
          last_name: userData.lastName,
          sensory_mode: userData.sensoryMode,
          onboarding_completed: false,
          preferences: {
            notifications: true,
            theme: 'auto',
            accessibility: {
              high_contrast: false,
              reduced_motion: false,
              screen_reader: false,
            },
          },
          profile: {
            bio: '',
            avatar_url: '',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
        },
      },
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Sign-up error:', error);
    throw error;
  }
}
```

## Step 4: Security Features

### 4.1 Rate Limiting

```typescript
// Custom rate limiting for auth attempts
class AuthRateLimiter {
  private attempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private maxAttempts = 5;
  private lockoutDuration = 15 * 60 * 1000; // 15 minutes

  isRateLimited(identifier: string): boolean {
    const attempt = this.attempts.get(identifier);
    
    if (!attempt) return false;
    
    const now = Date.now();
    const timeSinceLastAttempt = now - attempt.lastAttempt;
    
    if (timeSinceLastAttempt > this.lockoutDuration) {
      this.attempts.delete(identifier);
      return false;
    }
    
    return attempt.count >= this.maxAttempts;
  }

  recordAttempt(identifier: string): void {
    const attempt = this.attempts.get(identifier);
    const now = Date.now();
    
    if (attempt) {
      attempt.count++;
      attempt.lastAttempt = now;
    } else {
      this.attempts.set(identifier, { count: 1, lastAttempt: now });
    }
  }

  resetAttempts(identifier: string): void {
    this.attempts.delete(identifier);
  }
}

const rateLimiter = new AuthRateLimiter();

// Use in auth functions
export async function signInWithRateLimit(email: string, password: string) {
  if (rateLimiter.isRateLimited(email)) {
    throw new Error('Too many login attempts. Please try again later.');
  }

  try {
    const result = await signInWithEmail(email, password);
    rateLimiter.resetAttempts(email);
    return result;
  } catch (error) {
    rateLimiter.recordAttempt(email);
    throw error;
  }
}
```

### 4.2 Device Management

```typescript
// Track and manage user devices
export async function trackDevice() {
  try {
    const deviceInfo = {
      platform: Platform.OS,
      version: Platform.Version,
      model: Platform.constants.Brand || 'Unknown',
      appVersion: '1.0.0', // Get from app config
      lastSeen: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('user_devices')
      .upsert({
        user_id: (await supabase.auth.getUser()).data.user?.id,
        device_id: await getDeviceId(),
        device_info: deviceInfo,
        is_active: true,
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Device tracking error:', error);
    throw error;
  }
}

// Get unique device ID
async function getDeviceId(): Promise<string> {
  const deviceId = await AsyncStorage.getItem('device_id');
  if (deviceId) return deviceId;
  
  const newDeviceId = Crypto.randomUUID();
  await AsyncStorage.setItem('device_id', newDeviceId);
  return newDeviceId;
}
```

## Step 5: Advanced Error Handling

### 5.1 Custom Error Handler

```typescript
// Enhanced error handling for auth operations
export class AuthErrorHandler {
  static handleError(error: any): string {
    console.error('Auth error:', error);

    switch (error.message) {
      case 'Invalid login credentials':
        return 'Invalid email or password. Please try again.';
      
      case 'Email not confirmed':
        return 'Please check your email and confirm your account before signing in.';
      
      case 'Too many requests':
        return 'Too many login attempts. Please wait a few minutes before trying again.';
      
      case 'User not found':
        return 'No account found with this email address. Please sign up instead.';
      
      case 'Password should be at least 6 characters':
        return 'Password must be at least 6 characters long.';
      
      case 'Unable to validate email address: invalid format':
        return 'Please enter a valid email address.';
      
      case 'User already registered':
        return 'An account with this email already exists. Please sign in instead.';
      
      case 'JWT expired':
        return 'Your session has expired. Please sign in again.';
      
      case 'Invalid JWT':
        return 'Your session is invalid. Please sign in again.';
      
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  static isRetryableError(error: any): boolean {
    const retryableErrors = [
      'Network error',
      'Request timeout',
      'Service unavailable',
    ];
    
    return retryableErrors.some(msg => error.message.includes(msg));
  }

  static async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        if (!this.isRetryableError(error)) {
          throw error;
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
      }
    }

    throw lastError;
  }
}
```

### 5.2 Auth State Recovery

```typescript
// Recover from auth state issues
export async function recoverAuthState() {
  try {
    // Clear any corrupted session data
    await AsyncStorage.removeItem('supabase.auth.token');
    
    // Get fresh session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Session recovery failed:', error);
      // Force user to sign in again
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Auth state recovery error:', error);
    return null;
  }
}
```

## Step 6: Performance Optimization

### 6.1 Lazy Loading

```typescript
// Lazy load auth components
const SignInScreen = React.lazy(() => import('../components/SignInScreen'));
const SignUpScreen = React.lazy(() => import('../components/SignUpScreen'));
const MFAScreen = React.lazy(() => import('../components/MFAScreen'));

export function AuthScreen() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <SignInScreen />
    </Suspense>
  );
}
```

### 6.2 Session Caching

```typescript
// Cache user data for better performance
class UserCache {
  private cache = new Map<string, any>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutes

  async getUserData(userId: string) {
    const cached = this.cache.get(userId);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) throw error;

    this.cache.set(userId, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  invalidateCache(userId: string) {
    this.cache.delete(userId);
  }
}

const userCache = new UserCache();
```

## Step 7: Testing

### 7.1 Auth Testing Utilities

```typescript
// Test utilities for auth
export class AuthTestUtils {
  static async createTestUser(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (error) throw error;
    return data;
  }

  static async deleteTestUser(userId: string) {
    // Note: This requires admin privileges
    const { error } = await supabase.auth.admin.deleteUser(userId);
    if (error) throw error;
  }

  static async simulateNetworkError() {
    // Temporarily break the connection
    const originalFetch = global.fetch;
    global.fetch = () => Promise.reject(new Error('Network error'));
    
    setTimeout(() => {
      global.fetch = originalFetch;
    }, 1000);
  }
}
```

## Security Best Practices

1. **Always validate user input** on both client and server
2. **Use HTTPS** in production
3. **Implement proper session management**
4. **Monitor auth logs** for suspicious activity
5. **Regularly rotate keys** and tokens
6. **Use environment variables** for sensitive data
7. **Implement rate limiting** for auth endpoints
8. **Enable MFA** for sensitive operations
9. **Validate email addresses** before sending auth emails
10. **Implement proper error handling** without exposing sensitive information

## Next Steps

1. **User Management**: See `supabase-usermanage.md`
2. **Database Views**: See `tableview-supabase.md`
3. **MCP Integration**: See `supabase-mcp.md`

This setup provides advanced authentication features for KindFrame! 🎉 