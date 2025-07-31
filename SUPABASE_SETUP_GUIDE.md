# Supabase Authentication Setup Guide

## Overview
This guide will help you set up Supabase authentication for the KindFrame app with Row Level Security (RLS) policies.

## Prerequisites
- Supabase project created at https://supabase.com
- Project URL: `https://dlenuyofztbvhzmdfiek.supabase.co`

## Step 1: Get Your Supabase Anon Key

1. Go to your Supabase dashboard: https://supabase.com/dashboard/project/dlenuyofztbvhzmdfiek/settings/api
2. Copy the `anon` public key from the API settings
3. Create a `.env` file in your project root with:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://dlenuyofztbvhzmdfiek.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
   ```

## Step 2: Set Up Database Schema

1. Go to your Supabase SQL Editor: https://supabase.com/dashboard/project/dlenuyofztbvhzmdfiek/sql
2. Run the SQL from `database/schema.sql` to create:
   - Custom `users` table with sensory mode
   - `user_profiles` table for additional data
   - Row Level Security (RLS) policies
   - Automatic user profile creation triggers

## Step 3: Configure Authentication Providers

### Email/Password Authentication
1. Go to Authentication > Settings in your Supabase dashboard
2. Enable "Enable email confirmations" if you want email verification
3. Configure email templates as needed

### Google OAuth
1. Go to Authentication > Providers in your Supabase dashboard
2. Enable Google provider
3. Add your Google OAuth credentials:
   - Client ID from Google Cloud Console
   - Client Secret from Google Cloud Console
4. Set redirect URL: `https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback`

### Apple OAuth
1. Go to Authentication > Providers in your Supabase dashboard
2. Enable Apple provider
3. Add your Apple Sign-In credentials:
   - Service ID from Apple Developer Console
   - Team ID from Apple Developer Console
   - Key ID from Apple Developer Console
   - Private Key from Apple Developer Console
4. Set redirect URL: `https://dlenuyofztbvhzmdfiek.supabase.co/auth/v1/callback`

## Step 4: Configure Deep Linking (for OAuth)

1. Add deep linking configuration to your `app.json`:
   ```json
   {
     "expo": {
       "scheme": "kindframe",
       "ios": {
         "bundleIdentifier": "com.yourcompany.kindframe"
       },
       "android": {
         "package": "com.yourcompany.kindframe"
       }
     }
   }
   ```

2. Create an OAuth callback handler in your app

## Step 5: Test the Integration

### Test Email/Password Sign Up
1. Open the app
2. Go to Sign Up screen
3. Enter email and password
4. Verify account creation in Supabase dashboard

### Test Email/Password Sign In
1. Go to Sign In screen
2. Enter credentials
3. Verify successful authentication

### Test OAuth (Google/Apple)
1. Click on Google/Apple sign-in button
2. Complete OAuth flow
3. Verify user creation in Supabase dashboard

## Database Schema Details

### Users Table
- `id`: UUID (references auth.users)
- `email`: TEXT (unique)
- `full_name`: TEXT (nullable)
- `avatar_url`: TEXT (nullable)
- `sensory_mode`: TEXT (low/medium/high, default: low)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

### User Profiles Table
- `id`: UUID (primary key)
- `user_id`: UUID (references users.id)
- `preferences`: JSONB (user preferences)
- `settings`: JSONB (user settings)
- `created_at`: TIMESTAMP
- `updated_at`: TIMESTAMP

## RLS Policies

### Users Table Policies
- Users can view their own profile
- Users can update their own profile
- Users can insert their own profile (during signup)
- Users cannot delete their own profile

### User Profiles Table Policies
- Users can view their own profile data
- Users can update their own profile data
- Users can insert their own profile data
- Users cannot delete their own profile data

## Authentication Flow

1. **Sign Up**: User creates account → Supabase creates auth user → Trigger creates custom user profile
2. **Sign In**: User authenticates → Supabase validates → App fetches user profile
3. **OAuth**: User clicks OAuth button → Redirects to provider → Callback creates/updates user
4. **Sign Out**: User logs out → Clears local storage → Redirects to sign-in

## Security Features

- **Row Level Security**: Users can only access their own data
- **Email Verification**: Optional email confirmation for new accounts
- **Password Reset**: Secure password reset via email
- **Session Management**: Automatic token refresh and session persistence
- **OAuth Security**: Secure OAuth flow with proper redirect handling

## Troubleshooting

### Common Issues

1. **"Invalid API key"**: Check your anon key in .env file
2. **"User not found"**: Verify RLS policies are enabled
3. **OAuth redirect errors**: Check redirect URLs in Supabase dashboard
4. **Database connection errors**: Verify database schema is properly set up

### Debug Steps

1. Check Supabase logs in dashboard
2. Verify environment variables are loaded
3. Test authentication in Supabase dashboard directly
4. Check network requests in browser dev tools

## Next Steps

1. Implement user profile management
2. Add sensory mode switching
3. Set up real-time subscriptions
4. Add data synchronization
5. Implement offline support 