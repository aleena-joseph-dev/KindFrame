# OAuth Provider Setup Guide for KindFrame

This guide will help you configure Google and Notion OAuth providers in your Supabase project.

## 🟢 Google OAuth Setup

### Step 1: Create Google Cloud Project

1. **Go to [Google Cloud Console](https://console.cloud.google.com/)**
2. **Create a new project:**
   - Click the project dropdown at the top
   - Click "New Project"
   - Name: `KindFrame`
   - Click "Create"

### Step 2: Enable Google+ API

1. **Go to APIs & Services → Library**
2. **Search for "Google+ API"**
3. **Click on it and press "Enable"**

### Step 3: Create OAuth 2.0 Credentials

1. **Go to APIs & Services → Credentials**
2. **Click "Create Credentials" → "OAuth 2.0 Client IDs"**
3. **Configure OAuth consent screen:**
   - User Type: External
   - App name: KindFrame
   - User support email: your-email@gmail.com
   - Developer contact information: your-email@gmail.com
4. **Create OAuth 2.0 Client ID:**
   - Application type: Web application
   - Name: KindFrame Web Client
   - **Authorized redirect URIs:**
     ```
     https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback
     ```
5. **Click "Create"**
6. **Copy your credentials:**
   - Client ID: `123456789-abcdef.apps.googleusercontent.com`
   - Client Secret: `GOCSPX-abcdefghijklmnop`

### Step 4: Configure Google in Supabase

1. **Go to your Supabase Dashboard**
2. **Navigate to Authentication → Providers**
3. **Find "Google" and click "Edit"**
4. **Enable Google provider**
5. **Enter your credentials:**
   - **Client ID:** Your Google Client ID
   - **Client Secret:** Your Google Client Secret
6. **Click "Save"**

## 🔵 Notion OAuth Setup

### Step 1: Create Notion Integration

1. **Go to [Notion Developers](https://developers.notion.com/)**
2. **Sign in with your Notion account**
3. **Click "New integration"**
4. **Fill in the details:**
   - **Name:** KindFrame
   - **Description:** Productivity app integration
   - **Logo:** Upload KindFrame logo (optional)
   - **Capabilities:** Read content
5. **Click "Submit"**
6. **Copy your Integration Token (Client ID)**

### Step 2: Configure Environment Variables

Add these to your `.env` file:

```env
# Notion OAuth
EXPO_PUBLIC_NOTION_CLIENT_ID=your-notion-integration-token
EXPO_PUBLIC_NOTION_CLIENT_SECRET=your-notion-client-secret
```

### Step 3: Update App Configuration

The app is already configured to handle Notion OAuth. The custom implementation will:

1. **Redirect users to Notion OAuth**
2. **Handle the callback**
3. **Create user accounts in Supabase**
4. **Store Notion tokens for API access**

## 🔧 Testing OAuth

### Test Google OAuth:

1. **Start your app**
2. **Go to signup/signin screen**
3. **Click "Continue with Google"**
4. **Complete Google OAuth flow**
5. **Should redirect back to your app**

### Test Notion OAuth:

1. **Start your app**
2. **Go to signup/signin screen**
3. **Click "Continue with Notion"**
4. **Complete Notion OAuth flow**
5. **Should redirect back to your app**

## 🚨 Troubleshooting

### Google OAuth Issues:

- **"Invalid redirect URI"**: Make sure the redirect URI in Google Cloud Console matches exactly
- **"Client ID not found"**: Verify your Client ID is correct
- **"Unauthorized"**: Check if Google+ API is enabled

### Notion OAuth Issues:

- **"Integration not found"**: Verify your Notion integration token
- **"Invalid redirect URI"**: Check the redirect URI in your Notion integration
- **"Permission denied"**: Make sure your integration has the right permissions

### General Issues:

- **Check browser console** for detailed error messages
- **Verify environment variables** are set correctly
- **Ensure Supabase project** is properly configured

## 📝 Environment Variables

Make sure these are in your `.env` file:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://dlenuyofztbvhzmdfiek.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Notion OAuth
EXPO_PUBLIC_NOTION_CLIENT_ID=your-notion-integration-token
EXPO_PUBLIC_NOTION_CLIENT_SECRET=your-notion-client-secret
```

## 🎯 Next Steps

After configuring OAuth:

1. **Test both Google and Notion signup/signin**
2. **Verify user profiles are created correctly**
3. **Test logout functionality**
4. **Continue with other app features**

## 📞 Support

If you encounter issues:

1. **Check the browser console** for error messages
2. **Verify all credentials** are correct
3. **Ensure redirect URIs** match exactly
4. **Test with a fresh browser session**

---

**Note:** Notion OAuth might require additional setup depending on your specific use case. The custom implementation provided should handle most scenarios.
