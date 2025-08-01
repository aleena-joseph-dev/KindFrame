# Notion OAuth Setup Guide for KindFrame

This guide will help you set up Notion OAuth authentication for the KindFrame app.

## Step 1: Create a Notion Integration

1. Go to [Notion Developers](https://developers.notion.com/)
2. Click "New integration"
3. Fill in the integration details:
   - **Name**: KindFrame
   - **Associated workspace**: Select your workspace
   - **Capabilities**:
     - Read content
     - Update content
     - Insert content
     - Create pages
4. Click "Submit"
5. Copy the **Internal Integration Token** (this is your Client Secret)
6. Copy the **OAuth Client ID** from the integration settings

## Step 2: Configure OAuth Settings

1. In your Notion integration settings, go to the "OAuth" tab
2. Add the following redirect URIs:
   - `kindframe://auth-callback` (for mobile app)
   - `http://localhost:8081/auth-callback` (for web development)
   - `https://your-domain.com/auth-callback` (for production web)
3. Save the settings

## Step 3: Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Notion OAuth Configuration
EXPO_PUBLIC_NOTION_CLIENT_ID=your_notion_client_id
EXPO_PUBLIC_NOTION_CLIENT_SECRET=your_notion_client_secret
```

## Step 4: Database Schema Updates

Make sure your Supabase database has the necessary tables for storing Notion user data. The current implementation will:

1. Create a user in Supabase auth with a Notion-specific email
2. Store the Notion access token in AsyncStorage
3. Create a user profile with Notion user information

## Step 5: Testing the Integration

1. Start your development server: `npx expo start`
2. Navigate to the signup screen
3. Click the "Sign up with Notion" button
4. Complete the OAuth flow
5. Verify that the user is created and redirected to the main app

## Troubleshooting

### Common Issues:

1. **"Notion OAuth not configured"**

   - Check that `EXPO_PUBLIC_NOTION_CLIENT_ID` is set in your environment variables

2. **"Invalid redirect URI"**

   - Ensure the redirect URI in your Notion integration matches exactly
   - For development: `http://localhost:8081/auth-callback`
   - For mobile: `kindframe://auth-callback`

3. **"Failed to authenticate with Notion"**

   - Check that `EXPO_PUBLIC_NOTION_CLIENT_SECRET` is set correctly
   - Verify the OAuth flow is completing properly

4. **"Failed to get user information from Notion"**

   - Ensure your Notion integration has the necessary permissions
   - Check that the access token is valid

5. **CORS Errors**

   - The app now uses Edge Functions to avoid CORS issues
   - Make sure both `notion-oauth` and `notion-user` functions are deployed

6. **State Mismatch Errors**
   - State verification is now optional for development
   - Check console logs for detailed state information

### Debug Steps:

1. Check the browser console for OAuth flow logs
2. Verify environment variables are loaded correctly
3. Test the OAuth URL manually in a browser
4. Check Supabase logs for authentication errors
5. Verify Edge Functions are deployed and accessible

## Security Considerations

1. **Client Secret**: Never expose the Notion client secret in client-side code
2. **Token Storage**: Access tokens are stored in AsyncStorage (consider more secure storage for production)
3. **Redirect URIs**: Use HTTPS in production and validate redirect URIs
4. **Error Handling**: Implement proper error handling for OAuth failures

## Production Deployment

For production deployment:

1. Update redirect URIs in Notion integration to use your production domain
2. Use environment variables for different environments (dev/staging/prod)
3. Implement proper token refresh logic
4. Add error monitoring and logging
5. Consider using a backend service to handle OAuth token exchange securely

## API Usage

Once authenticated, you can use the Notion API to:

- Read user's workspaces and pages
- Create and update pages
- Search content
- Manage databases

Example API call:

```typescript
const notionToken = await AsyncStorage.getItem("notionToken");
const response = await fetch("https://api.notion.com/v1/search", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${notionToken}`,
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    filter: {
      value: "page",
      property: "object",
    },
  }),
});
```

## Next Steps

1. Implement Notion workspace selection
2. Add page creation functionality
3. Implement data synchronization between KindFrame and Notion
4. Add user preference settings for Notion integration
5. Implement token refresh logic
