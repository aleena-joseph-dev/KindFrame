# 🍎 Apple Sign-In with Supabase

## Overview

This guide covers integrating Apple Sign-In with Supabase for the KindFrame app. Apple Sign-In is required for iOS apps that offer third-party authentication options.

## Prerequisites

1. **Apple Developer Account**: Active Apple Developer membership
2. **Supabase Project**: Active Supabase project
3. **iOS App**: KindFrame app configured for iOS
4. **Expo App**: KindFrame app with Supabase client configured

## Step 1: Apple Developer Console Setup

### 1.1 Create App ID

1. Go to [Apple Developer Console](https://developer.apple.com/)
2. Navigate to **Certificates, Identifiers & Profiles**
3. Go to **Identifiers** → **App IDs**
4. Click **+** to create a new App ID
5. Configure:
   - **Description**: KindFrame
   - **Bundle ID**: `com.kindframe.app`
   - **Capabilities**: Enable **Sign In with Apple**

### 1.2 Create Service ID

1. Go to **Identifiers** → **Services IDs**
2. Click **+** to create a new Service ID
3. Configure:
   - **Description**: KindFrame Web
   - **Identifier**: `com.kindframe.web`
   - **Domains and Subdomains**: Add your Supabase domain
   - **Return URLs**: Add your Supabase callback URLs

### 1.3 Configure Sign In with Apple

1. Go to **Certificates, Identifiers & Profiles** → **Keys**
2. Click **+** to create a new key
3. Enable **Sign In with Apple**
4. Download the key file (`.p8`)
5. Note the **Key ID** and **Team ID**

## Step 2: Supabase Configuration

### 2.1 Enable Apple Auth in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Apple** and click **Enable**
4. Enter your Apple configuration:
   - **Service ID**: `com.kindframe.web`
   - **Team ID**: Your Apple Team ID
   - **Key ID**: Your Apple Key ID
   - **Private Key**: Upload your `.p8` key file
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
npm install @supabase/supabase-js expo-auth-session expo-crypto expo-apple-authentication
```

### 3.2 Create Apple Auth Service

Create `services/appleAuth.ts`:

```typescript
import { supabase } from '../lib/supabase';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

export async function signInWithApple() {
  try {
    // Check if Apple Sign-In is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    
    if (!isAvailable) {
      throw new Error('Apple Sign-In is not available on this device');
    }

    // Create a random nonce for security
    const nonce = Crypto.randomUUID();
    
    // Request Apple Sign-In
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: nonce,
    });

    // Exchange credential for Supabase session
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'apple',
      token: credential.identityToken!,
      nonce: nonce,
    });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Apple sign-in error:', error);
    throw error;
  }
}
```

### 3.3 Update Auth Context

Update `contexts/AuthContext.tsx`:

```typescript
import { signInWithApple } from '../services/appleAuth';

// Add to AuthContextType interface
interface AuthContextType {
  // ... existing properties
  signInWithApple: () => Promise<void>;
}

// Add to AuthProvider
const signInWithApple = async () => {
  try {
    await signInWithApple();
    // Navigation will be handled by AuthContext
  } catch (error) {
    throw error;
  }
};

// Add to provider value
<AuthContext.Provider value={{
  // ... existing values
  signInWithApple,
}}>
```

### 3.4 Create Apple Sign-In Button

```typescript
import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, Alert } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../contexts/AuthContext';

export function AppleSignInButton() {
  const { signInWithApple } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isAvailable, setIsAvailable] = useState(false);

  useEffect(() => {
    checkAppleSignInAvailability();
  }, []);

  const checkAppleSignInAvailability = async () => {
    const available = await AppleAuthentication.isAvailableAsync();
    setIsAvailable(available);
  };

  const handleAppleSignIn = async () => {
    if (!isAvailable) {
      Alert.alert('Error', 'Apple Sign-In is not available on this device');
      return;
    }

    setLoading(true);
    try {
      await signInWithApple();
    } catch (error) {
      if (error.code === 'ERR_CANCELED') {
        // User cancelled the sign-in
        return;
      }
      Alert.alert('Error', 'Failed to sign in with Apple. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isAvailable) {
    return null; // Don't show the button if not available
  }

  return (
    <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
      buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={8}
      style={styles.appleButton}
      onPress={handleAppleSignIn}
      disabled={loading}
    />
  );
}
```

## Step 4: Environment Configuration

### 4.1 Update app.json

```json
{
  "expo": {
    "scheme": "kindframe",
    "ios": {
      "bundleIdentifier": "com.kindframe.app",
      "usesAppleSignIn": true
    }
  }
}
```

### 4.2 Update Environment Variables

Add to your `.env` file:

```env
EXPO_PUBLIC_APPLE_SERVICE_ID=com.kindframe.web
EXPO_PUBLIC_APPLE_TEAM_ID=your_team_id
EXPO_PUBLIC_APPLE_KEY_ID=your_key_id
```

## Step 5: Testing

### 5.1 Test on iOS Simulator

1. Build and run on iOS simulator
2. Navigate to the sign-in screen
3. Click the Apple Sign-In button
4. Complete the authentication flow
5. Verify you're redirected back to the app

### 5.2 Test on Physical Device

1. Build and run on physical iOS device
2. Test the Apple Sign-In flow
3. Verify the authentication works correctly

## Troubleshooting

### Common Issues

1. **"Apple Sign-In is not available"**
   - This is normal on Android or web
   - Only show the button on iOS devices

2. **"Invalid configuration"**
   - Verify your Apple Developer configuration
   - Check that your Service ID is correct
   - Ensure your private key is uploaded to Supabase

3. **"Authentication cancelled"**
   - This is normal if the user cancels
   - Handle gracefully in your UI

### Debug Steps

1. Check the device logs for Apple Sign-In errors
2. Verify your Supabase Apple provider is enabled
3. Test with a physical iOS device
4. Check that your app bundle ID matches

## Security Considerations

1. **Never expose private keys** in client-side code
2. **Use HTTPS** in production
3. **Validate nonce parameter** to prevent replay attacks
4. **Handle errors gracefully** without exposing sensitive information
5. **Implement proper session management**

## Platform-Specific Notes

### iOS Only

Apple Sign-In is only available on iOS devices. For other platforms:

```typescript
import { Platform } from 'react-native';

export function SignInOptions() {
  return (
    <View>
      <GoogleSignInButton />
      {Platform.OS === 'ios' && <AppleSignInButton />}
      {/* Other sign-in options */}
    </View>
  );
}
```

### Web Support

For web support, you'll need to implement Apple Sign-In using the web SDK:

```typescript
// For web implementation
import { AppleID } from 'apple-signin-web';

const appleSignInWeb = async () => {
  // Web-specific implementation
  // See Apple's web documentation for details
};
```

## Next Steps

1. **Google OAuth**: See `google-supabase.md`
2. **User Profile Management**: See `supabase-usermanage.md`
3. **Advanced Auth Features**: See `supabase-auth.md`

## Example Usage

```typescript
// In your sign-in screen
import { AppleSignInButton } from '../components/AppleSignInButton';

export function SignInScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to KindFrame</Text>
      <GoogleSignInButton />
      <AppleSignInButton />
      {/* Other sign-in options */}
    </View>
  );
}
```

This setup provides a complete Apple Sign-In integration for KindFrame! 🎉 