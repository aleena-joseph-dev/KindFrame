# 🔐 Google OAuth with Supabase

## Overview

This guide covers integrating Google OAuth authentication with Supabase for the KindFrame app. Supabase provides built-in Google OAuth support that's easy to implement.

## Prerequisites

1. **Supabase Project**: Active Supabase project
2. **Google Cloud Console**: Google Cloud project with OAuth credentials
3. **Expo App**: KindFrame app with Supabase client configured

## Step 1: Google Cloud Console Setup

### 1.1 Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project called "KindFrame"
3. Enable the following APIs:
   - Google+ API
   - Google OAuth2 API

### 1.2 Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **External** user type
3. Fill in required information:
   - **App name**: KindFrame
   - **User support email**: Your email
   - **Developer contact information**: Your email
4. Add scopes:
   - `openid`
   - `profile`
   - `email`
5. Add test users (your email addresses)

### 1.3 Create OAuth Credentials

#### For Web (Development)

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth 2.0 Client IDs**
3. Choose **Web application**
4. Name: "KindFrame Web"
5. Authorized redirect URIs:
   ```
   http://localhost:8081
   http://localhost:8082
   http://localhost:8083
   http://localhost:19006
   kindframe://auth
   ```
6. Copy the **Client ID**

#### For iOS

1. Create another OAuth 2.0 Client ID
2. Choose **iOS**
3. Name: "KindFrame iOS"
4. Bundle ID: `com.kindframe.app`
5. Copy the **Client ID**

#### For Android

1. Create another OAuth 2.0 Client ID
2. Choose **Android**
3. Name: "KindFrame Android"
4. Package name: `com.kindframe.app`
5. Generate SHA-1 certificate fingerprint:
   ```bash
   keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
   ```
6. Copy the **Client ID**

## Step 2: Supabase Configuration

### 2.1 Enable Google Auth in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Google** and click **Enable**
4. Enter your Google Client ID and Client Secret
5. Save the configuration

### 2.2 Configure Redirect URLs

In your Supabase project settings, add these redirect URLs:

```
http://localhost:8081/auth/callback
http://localhost:8082/auth/callback
http://localhost:8083/auth/callback
kindframe://auth/callback
```

## Step 3: React Native Implementation

### 3.1 Install Dependencies

```bash
npm install @supabase/supabase-js expo-auth-session expo-crypto
```

### 3.2 Create Google Auth Service

Create `services/googleAuth.ts`:

```typescript
import { supabase } from '../lib/supabase';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';

const GOOGLE_CLIENT_ID = {
  web: 'YOUR_WEB_CLIENT_ID',
  ios: 'YOUR_IOS_CLIENT_ID',
  android: 'YOUR_ANDROID_CLIENT_ID',
};

const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'kindframe',
  path: 'auth/callback',
});

export async function signInWithGoogle() {
  try {
    // Create a random state for security
    const state = Crypto.randomUUID();
    
    // Create the OAuth URL
    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', GOOGLE_CLIENT_ID.web);
    authUrl.searchParams.append('redirect_uri', GOOGLE_REDIRECT_URI);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid profile email');
    authUrl.searchParams.append('state', state);
    
    // Open the auth session
    const result = await AuthSession.startAsync({
      authUrl: authUrl.toString(),
      returnUrl: GOOGLE_REDIRECT_URI,
    });
    
    if (result.type === 'success' && result.params.code) {
      // Exchange code for session
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: result.params.code,
        nonce: state,
      });
      
      if (error) throw error;
      return data;
    }
    
    throw new Error('Authentication was cancelled');
  } catch (error) {
    console.error('Google sign-in error:', error);
    throw error;
  }
}
```

### 3.3 Update Auth Context

Update `contexts/AuthContext.tsx`:

```typescript
import { signInWithGoogle } from '../services/googleAuth';

// Add to AuthContextType interface
interface AuthContextType {
  // ... existing properties
  signInWithGoogle: () => Promise<void>;
}

// Add to AuthProvider
const signInWithGoogle = async () => {
  try {
    await signInWithGoogle();
    // Navigation will be handled by AuthContext
  } catch (error) {
    throw error;
  }
};

// Add to provider value
<AuthContext.Provider value={{
  // ... existing values
  signInWithGoogle,
}}>
```

### 3.4 Create Google Sign-In Button

```typescript
import React from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export function GoogleSignInButton() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      Alert.alert('Error', 'Failed to sign in with Google. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={styles.googleButton}
      onPress={handleGoogleSignIn}
      disabled={loading}
    >
      <Text style={styles.googleButtonText}>
        {loading ? 'Signing in...' : 'Continue with Google'}
      </Text>
    </TouchableOpacity>
  );
}
```

## Step 4: Environment Configuration

### 4.1 Update Environment Variables

Add to your `.env` file:

```env
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your_web_client_id
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your_ios_client_id
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your_android_client_id
```

### 4.2 Update app.json

```json
{
  "expo": {
    "scheme": "kindframe",
    "android": {
      "package": "com.kindframe.app"
    },
    "ios": {
      "bundleIdentifier": "com.kindframe.app"
    }
  }
}
```

## Step 5: Testing

### 5.1 Test on Web

1. Start your development server
2. Navigate to the sign-in screen
3. Click "Continue with Google"
4. Complete the OAuth flow
5. Verify you're redirected back to the app

### 5.2 Test on Mobile

1. Build and run on device/simulator
2. Test the Google sign-in flow
3. Verify the redirect URI works correctly

## Troubleshooting

### Common Issues

1. **"Invalid redirect URI"**
   - Check that your redirect URIs match exactly
   - Ensure the scheme is configured correctly

2. **"Client ID not found"**
   - Verify your Google Client IDs are correct
   - Check that the OAuth consent screen is configured

3. **"Authentication cancelled"**
   - This is normal if the user cancels the flow
   - Handle gracefully in your UI

### Debug Steps

1. Check the browser console for OAuth errors
2. Verify your Supabase Google provider is enabled
3. Test the redirect URI manually
4. Check that your app scheme is working

## Security Considerations

1. **Never expose Client Secrets** in client-side code
2. **Use HTTPS** in production
3. **Validate state parameter** to prevent CSRF attacks
4. **Handle errors gracefully** without exposing sensitive information
5. **Implement proper session management**

## Next Steps

1. **Apple Sign-In**: See `apple-supabase.md`
2. **User Profile Management**: See `supabase-usermanage.md`
3. **Advanced Auth Features**: See `supabase-auth.md`

## Example Usage

```typescript
// In your sign-in screen
import { GoogleSignInButton } from '../components/GoogleSignInButton';

export function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to KindFrame</Text>
      <GoogleSignInButton />
      {/* Other sign-in options */}
    </View>
  );
}
```

This setup provides a complete Google OAuth integration for KindFrame! 🎉 