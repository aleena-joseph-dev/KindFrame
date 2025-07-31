# 🔐 Supabase Authentication Introduction

## Overview

Supabase provides a comprehensive authentication system that's perfect for KindFrame. It supports multiple authentication methods and integrates seamlessly with React Native/Expo.

## Key Features

### ✅ **Built-in Authentication Methods**
- Email/Password authentication
- Google OAuth
- Apple Sign-In
- GitHub OAuth
- Discord OAuth
- And many more...

### ✅ **Security Features**
- Row Level Security (RLS)
- JWT tokens
- Refresh tokens
- Password reset
- Email verification

### ✅ **Real-time Capabilities**
- Live user sessions
- Real-time user presence
- Instant authentication state changes

## Installation

```bash
npm install @supabase/supabase-js
```

## Basic Setup

### 1. Environment Variables

Create a `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_project_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Supabase Client

Create `lib/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### 3. Auth Context

Create `contexts/AuthContext.tsx`:

```typescript
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

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
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      resetPassword,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

## Usage in Components

### Sign In Component

```typescript
import React, { useState } from 'react';
import { Alert, TextInput, TouchableOpacity, Text } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      await signIn(email, password);
      // Navigation will be handled by AuthContext
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View>
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <TouchableOpacity onPress={handleSignIn} disabled={loading}>
        <Text>{loading ? 'Signing in...' : 'Sign In'}</Text>
      </TouchableOpacity>
    </View>
  );
}
```

### Protected Routes

```typescript
import { useAuth } from '../contexts/AuthContext';
import { useRouter } from 'expo-router';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/(auth)/signin');
    }
  }, [user, loading]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}
```

## Row Level Security (RLS)

Enable RLS on your tables:

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON users
  FOR INSERT WITH CHECK (auth.uid() = id);
```

## Error Handling

```typescript
const handleAuthError = (error: any) => {
  switch (error.message) {
    case 'Invalid login credentials':
      Alert.alert('Error', 'Invalid email or password');
      break;
    case 'Email not confirmed':
      Alert.alert('Error', 'Please check your email and confirm your account');
      break;
    case 'Too many requests':
      Alert.alert('Error', 'Too many attempts. Please try again later');
      break;
    default:
      Alert.alert('Error', error.message);
  }
};
```

## Next Steps

1. **Google OAuth**: See `google-supabase.md`
2. **Apple Sign-In**: See `apple-supabase.md`
3. **User Management**: See `supabase-usermanage.md`
4. **Advanced Auth**: See `supabase-auth.md`

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Use RLS policies** for all tables
3. **Validate user input** on both client and server
4. **Implement proper error handling**
5. **Use HTTPS** in production
6. **Regularly rotate keys**
7. **Monitor auth logs** for suspicious activity

## Testing

```typescript
// Test authentication flow
const testAuth = async () => {
  try {
    // Test sign up
    await signUp('test@example.com', 'password123');
    
    // Test sign in
    await signIn('test@example.com', 'password123');
    
    // Test sign out
    await signOut();
    
    console.log('✅ Auth tests passed');
  } catch (error) {
    console.error('❌ Auth test failed:', error);
  }
};
```

This provides the foundation for all authentication features in KindFrame! 