# Notion OAuth with Supabase Integration Guide

## Overview

This guide explains how to integrate Notion OAuth with Supabase for authentication in your KindFrame app.

## Prerequisites

- Supabase project set up
- Notion Developer account
- React Native/Expo app

## Step 1: Notion Developer Setup

### 1.1 Create Notion Integration

1. Go to [Notion Developers](https://www.notion.so/my-integrations)
2. Click "New integration"
3. Fill in the details:
   - **Name**: `KindFrame`
   - **Associated workspace**: Select your workspace
   - **Capabilities**:
     - ✅ Read content
     - ✅ Update content
     - ✅ Insert content
4. Click "Submit"
5. Copy the **Internal Integration Token** (you'll need this later)

### 1.2 Configure OAuth Settings

1. In your integration settings, go to "OAuth & Permissions"
2. Add redirect URLs:
   - `https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback`
   - `kindframe://auth-callback`
3. Save the settings

## Step 2: Supabase Configuration

### 2.1 Enable Notion OAuth in Supabase

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Providers**
3. Find **Notion** in the list
4. Enable it by toggling the switch
5. Add your Notion credentials:
   - **Client ID**: Your Notion integration's Client ID
   - **Client Secret**: Your Notion integration's Client Secret
   - **Redirect URL**: `https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback`

### 2.2 Environment Variables

Add these to your `.env` file:

```env
EXPO_PUBLIC_SUPABASE_URL=https://dlenuyofztbvhzmdfiek.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Step 3: React Native Implementation

### 3.1 AuthService Integration

The `AuthService.signInWithNotion()` method is already implemented in your app:

```typescript
static async signInWithNotion(): Promise<AuthResult> {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'notion',
      options: {
        redirectTo: 'kindframe://auth-callback',
        queryParams: {
          response_type: 'code',
        },
      },
    });
    if (error) {
      return {
        success: false,
        error: {
          message: error.message,
        },
      };
    }
    return {
      success: true,
      user: data.user as unknown as User,
    };
  } catch (error) {
    console.error('Notion sign-in error:', error);
    return {
      success: false,
      error: {
        message: 'Failed to sign in with Notion',
      },
    };
  }
}
```

### 3.2 UI Components

The sign-in and sign-up screens now include Notion buttons:

```typescript
// Notion Sign-In Button
<TouchableOpacity
  style={[styles.socialButton, { backgroundColor: colors.buttonBackground }]}
  onPress={handleNotionSignIn}
  disabled={isNotionLoading || isGoogleLoading || isLoading}
>
  <Text style={[styles.socialButtonIcon, { color: colors.buttonText }]}>N</Text>
  <Text style={[styles.socialButtonText, { color: colors.buttonText }]}>
    {isNotionLoading ? "Signing in..." : "Continue with Notion"}
  </Text>
</TouchableOpacity>
```

## Step 4: Testing

### 4.1 Test the OAuth Flow

1. Run your app: `npx expo start`
2. Navigate to the sign-in screen
3. Click "Continue with Notion"
4. Complete the Notion OAuth flow
5. Verify you're redirected back to the app

### 4.2 Debug Common Issues

- **"Provider not enabled"**: Check Supabase OAuth settings
- **"Invalid redirect URI"**: Verify redirect URLs in Notion integration
- **"Authentication failed"**: Check client ID/secret in Supabase

## Step 5: User Profile Integration

### 5.1 Handle User Data

When users sign in with Notion, you can access their Notion workspace data:

```typescript
// Get user's Notion workspace info
const {
  data: { user },
} = await supabase.auth.getUser();
const notionWorkspace = user?.user_metadata?.notion_workspace;
```

### 5.2 Store Additional Data

You can store Notion-specific data in your user profile:

```typescript
// Update user profile with Notion data
await supabase
  .from("users")
  .update({
    notion_workspace_id: user?.user_metadata?.notion_workspace?.id,
    notion_access_token: user?.user_metadata?.notion_access_token,
  })
  .eq("id", user?.id);
```

## Security Considerations

### 5.1 Token Management

- Notion access tokens are automatically managed by Supabase
- Tokens are refreshed automatically
- Store sensitive data securely

### 5.2 Permissions

- Only request necessary permissions from users
- Clearly explain what data you'll access
- Respect user privacy preferences

## Troubleshooting

### Common Issues:

1. **"Provider not found"**: Ensure Notion is enabled in Supabase
2. **"Invalid client credentials"**: Check your Notion integration settings
3. **"Redirect URI mismatch"**: Verify URLs in both Notion and Supabase
4. **"OAuth flow failed"**: Check network connectivity and app configuration

### Debug Steps:

1. Check Supabase logs for authentication errors
2. Verify Notion integration settings
3. Test OAuth flow in browser first
4. Check app.json deep linking configuration

## Next Steps

After implementing Notion OAuth:

1. Test the complete authentication flow
2. Add user profile management
3. Implement Notion workspace integration features
4. Add error handling and user feedback
5. Consider adding other OAuth providers (Google, GitHub, etc.)

## Resources

- [Notion API Documentation](https://developers.notion.com/)
- [Supabase Auth Documentation](https://supabase.com/docs/guides/auth)
- [Expo AuthSession Documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
