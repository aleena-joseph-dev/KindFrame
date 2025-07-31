# Google & Apple OAuth Setup Guide

## 🎯 Overview

This guide will help you configure Google and Apple OAuth authentication in your Supabase project for the KindFrame app.

## 📋 Prerequisites

- Supabase project with URL: `https://dlenuyofztbvhzmdfiek.supabase.co`
- Project Reference: `dlenuyofztbvhzmdfiek`
- Access to Google Cloud Console
- Apple Developer Account (for Apple Sign-In)

---

## 🔧 Google OAuth Setup

### Step 1: Google Cloud Console Setup

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
   - Also enable "Google Identity" API

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth 2.0 Client IDs"
   - Choose "Web application"
   - Add authorized redirect URIs:
     ```
     https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback
     ```

4. **Get Client Credentials**
   - Copy the **Client ID** and **Client Secret**
   - Keep these secure for the next step

### Step 2: Configure Supabase Google OAuth

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/dlenuyofztbvhzmdfiek
   - Navigate to "Authentication" > "Providers"

2. **Enable Google Provider**
   - Find "Google" in the providers list
   - Toggle it to "Enabled"
   - Enter your Google Client ID and Client Secret
   - Save the configuration

3. **Test Google OAuth**
   - Try signing in with Google from your app
   - Check the authentication logs in Supabase

---

## 🍎 Apple OAuth Setup

### Step 1: Apple Developer Console Setup

1. **Go to Apple Developer Console**
   - Visit: https://developer.apple.com/account/
   - Sign in with your Apple Developer account

2. **Create App ID**
   - Go to "Certificates, Identifiers & Profiles"
   - Click "Identifiers" > "+" to create new
   - Choose "App IDs" > "App"
   - Fill in the details:
     - **Description**: KindFrame
     - **Bundle ID**: com.kindframe.app
     - **Capabilities**: Check "Sign In with Apple"

3. **Create Service ID**
   - Go to "Identifiers" > "+" > "Services IDs"
   - Fill in the details:
     - **Description**: KindFrame Web Service
     - **Identifier**: com.kindframe.app.service
     - **Capabilities**: Check "Sign In with Apple"

4. **Configure Sign In with Apple**
   - Click on your Service ID
   - Go to "Sign In with Apple" > "Configure"
   - Add your domain: `dlenuyofztbvhzmdfiek.supabase.co`
   - Add return URLs:
     ```
     https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback
     ```

5. **Create Private Key**
   - Go to "Keys" > "+" to create new key
   - Enable "Sign In with Apple"
   - Download the `.p8` file (keep it secure)
   - Note the Key ID

### Step 2: Configure Supabase Apple OAuth

1. **Go to Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/dlenuyofztbvhzmdfiek
   - Navigate to "Authentication" > "Providers"

2. **Enable Apple Provider**
   - Find "Apple" in the providers list
   - Toggle it to "Enabled"
   - Enter the following details:
     - **Service ID**: com.kindframe.app.service
     - **Key ID**: [Your Key ID from Apple]
     - **Private Key**: [Content of your .p8 file]
     - **Team ID**: [Your Apple Team ID]

3. **Test Apple OAuth**
   - Try signing in with Apple from your app
   - Check the authentication logs in Supabase

---

## 🔗 Deep Linking Configuration

### Update app.json (Already Done)

The app.json has been configured with:
- **Scheme**: `kindframe`
- **Apple Sign-In**: Enabled
- **Bundle ID**: `com.kindframe.app`

### OAuth Callback URLs

The following URLs are configured for OAuth callbacks:
- **Google**: `kindframe://auth-callback`
- **Apple**: `kindframe://auth-callback`

---

## 🧪 Testing OAuth Authentication

### 1. Test Google Sign-In
1. Open your app
2. Go to Sign In screen
3. Tap "Continue with Google"
4. Complete the Google OAuth flow
5. Verify you're redirected back to the app

### 2. Test Apple Sign-In
1. Open your app
2. Go to Sign In screen
3. Tap "Continue with Apple"
4. Complete the Apple OAuth flow
5. Verify you're redirected back to the app

### 3. Check Authentication Logs
1. Go to Supabase Dashboard
2. Navigate to "Authentication" > "Logs"
3. Verify successful authentication events

---

## 🔍 Troubleshooting

### Common Google OAuth Issues

1. **"Invalid redirect URI"**
   - Ensure the redirect URI in Google Cloud Console matches exactly
   - Check for trailing slashes or typos

2. **"Client ID not found"**
   - Verify the Client ID is correct in Supabase
   - Ensure the Google+ API is enabled

3. **"Access denied"**
   - Check if the Google account has the necessary permissions
   - Verify the OAuth consent screen is configured

### Common Apple OAuth Issues

1. **"Invalid client"**
   - Verify the Service ID matches exactly
   - Check the Key ID and Private Key are correct

2. **"Invalid redirect URI"**
   - Ensure the return URL in Apple Developer Console is correct
   - Check the domain configuration

3. **"Team ID not found"**
   - Verify the Team ID is correct
   - Ensure you're using the right Apple Developer account

### General OAuth Issues

1. **Callback not working**
   - Check the deep linking configuration
   - Verify the auth-callback.tsx file exists
   - Test the redirect URL manually

2. **User profile not created**
   - Check the handleOAuthCallback method
   - Verify the users table exists
   - Check the RLS policies

---

## 📱 Mobile App Configuration

### iOS Configuration
- Apple Sign-In is enabled in app.json
- Bundle ID: `com.kindframe.app`
- Team ID should match your Apple Developer account

### Android Configuration
- Package name: `com.kindframe.app`
- SHA-1 fingerprint may be required for Google OAuth

---

## 🔒 Security Considerations

1. **Keep Credentials Secure**
   - Never commit OAuth credentials to version control
   - Use environment variables for sensitive data
   - Rotate keys regularly

2. **Validate User Data**
   - Always verify user information from OAuth providers
   - Implement proper error handling
   - Add rate limiting if needed

3. **Monitor Authentication**
   - Check Supabase authentication logs regularly
   - Monitor for suspicious activity
   - Set up alerts for failed authentication attempts

---

## ✅ Success Checklist

- [ ] Google OAuth configured in Supabase
- [ ] Apple OAuth configured in Supabase
- [ ] Deep linking working correctly
- [ ] OAuth callback handler implemented
- [ ] User profiles created automatically
- [ ] Sign-in and sign-up flows working
- [ ] Error handling implemented
- [ ] Loading states working
- [ ] Authentication logs showing success

---

## 🚀 Next Steps

1. **Test both OAuth providers** thoroughly
2. **Implement user profile management**
3. **Add email verification flow**
4. **Set up password reset functionality**
5. **Configure user preferences and sensory modes**

---

## 📞 Support

If you encounter issues:
1. Check the Supabase authentication logs
2. Verify the OAuth provider configurations
3. Test the redirect URLs manually
4. Check the browser console for errors
5. Review the app logs for debugging information 