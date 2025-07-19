# Google OAuth Setup for KindFrame

This guide will help you set up Google OAuth authentication for the KindFrame app.

## Prerequisites

1. A Google Cloud Console account
2. Expo CLI installed
3. The KindFrame project set up

## Step 1: Create a Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API and Google OAuth2 API

## Step 2: Configure OAuth Consent Screen

1. In the Google Cloud Console, go to "APIs & Services" > "OAuth consent screen"
2. Choose "External" user type
3. Fill in the required information:
   - App name: "KindFrame"
   - User support email: Your email
   - Developer contact information: Your email
4. Add scopes:
   - `openid`
   - `profile`
   - `email`
5. Add test users (your email addresses)

## Step 3: Create OAuth 2.0 Credentials

### For Web (Development)

1. Go to "APIs & Services" > "Credentials"
2. Click "Create Credentials" > "OAuth 2.0 Client IDs"
3. Choose "Web application"
4. Name: "KindFrame Web"
5. Authorized redirect URIs:
   - `http://localhost:8081`
   - `http://localhost:8082`
   - `http://localhost:8083`
   - `http://localhost:19006`
6. Copy the Client ID

### For iOS

1. Create another OAuth 2.0 Client ID
2. Choose "iOS"
3. Name: "KindFrame iOS"
4. Bundle ID: `com.kindframe.app`
5. Copy the Client ID

### For Android

1. Create another OAuth 2.0 Client ID
2. Choose "Android"
3. Name: "KindFrame Android"
4. Package name: `com.kindframe.app`
5. Generate SHA-1 certificate fingerprint (see below)
6. Copy the Client ID

## Step 4: Get SHA-1 Certificate Fingerprint (Android)

### For Development

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

### For Production

```bash
keytool -list -v -keystore your-release-key.keystore -alias your-key-alias
```

## Step 5: Update the App Configuration

1. Open `services/googleAuth.ts`
2. Replace the placeholder client IDs with your actual client IDs:

```typescript
const GOOGLE_CLIENT_ID = {
  ios: "YOUR_ACTUAL_IOS_CLIENT_ID",
  android: "YOUR_ACTUAL_ANDROID_CLIENT_ID",
  web: "YOUR_ACTUAL_WEB_CLIENT_ID",
};
```

## Step 6: Test the Integration

1. Start the development server:

   ```bash
   npm start
   ```

2. Test on different platforms:

   - Web: `npm run web`
   - iOS Simulator: Press `i` in the terminal
   - Android Emulator: Press `a` in the terminal

3. Try signing in with Google on each platform

## Troubleshooting

### Common Issues

1. **"Invalid client" error**: Make sure you're using the correct client ID for each platform
2. **"Redirect URI mismatch"**: Ensure the redirect URIs in Google Console match your app's scheme
3. **"Access blocked"**: Add your email to the test users in the OAuth consent screen

### Debug Tips

1. Check the console logs for detailed error messages
2. Verify that all required APIs are enabled in Google Cloud Console
3. Ensure your app's bundle ID/package name matches the OAuth configuration

## Security Notes

1. Never commit your actual client IDs to version control
2. Use environment variables for production builds
3. Regularly rotate your OAuth credentials
4. Monitor your OAuth usage in Google Cloud Console

## Next Steps

1. Set up user data storage in your backend
2. Implement token refresh logic
3. Add sign-out functionality
4. Set up proper error handling and user feedback

## Support

If you encounter issues:

1. Check the [Expo AuthSession documentation](https://docs.expo.dev/versions/latest/sdk/auth-session/)
2. Review the [Google OAuth 2.0 documentation](https://developers.google.com/identity/protocols/oauth2)
3. Check the console logs for detailed error messages
