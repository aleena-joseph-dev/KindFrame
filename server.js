const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = 8082;

// Middleware
app.use(express.json());
app.use(express.static('dist'));

// Google OAuth Code Exchange API
app.post('/api/exchange-google-code', async (req, res) => {
  try {
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Authorization code is required' });
    }

    console.log('🔍 API: Received code for exchange:', code.substring(0, 10) + '...');

    // Google OAuth token exchange endpoint
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    
    // Prepare the token exchange request
    const tokenData = {
      code: code,
      client_id: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID,
      client_secret: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.EXPO_PUBLIC_GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    };

    console.log('🔍 API: Exchanging code for tokens...');

    // Make the token exchange request to Google
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenData)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('🔍 API: Token exchange successful');
      
      // Store tokens securely (in a real app, you'd store these in a database)
      // For now, we'll store them in memory and also return them to the client
      const tokenData = {
        access_token: result.access_token,
        refresh_token: result.refresh_token,
        expires_in: result.expires_in,
        token_type: result.token_type,
        scope: result.scope,
        expires_at: Date.now() + (result.expires_in * 1000)
      };
      
      // Store tokens in memory (in production, use a secure database)
      global.googleKeepTokens = tokenData;
      
      console.log('🔍 API: Tokens stored successfully');
      
      // Return success response to client
      return res.status(200).json({
        success: true,
        message: 'Google Keep connected successfully!',
        expires_in: result.expires_in
      });
    } else {
      console.error('🔍 API: Token exchange failed:', result);
      return res.status(400).json({
        error: 'Token exchange failed',
        details: result.error_description || result.error
      });
    }

  } catch (error) {
    console.error('🔍 API: Error in token exchange:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error.message
    });
  }
});

// API endpoint to check if Google Keep is connected
app.get('/api/google-keep-status', (req, res) => {
  try {
    const tokens = global.googleKeepTokens;
    
    if (tokens && tokens.expires_at > Date.now()) {
      return res.status(200).json({
        connected: true,
        expires_in: Math.floor((tokens.expires_at - Date.now()) / 1000)
      });
    } else {
      return res.status(200).json({
        connected: false
      });
    }
  } catch (error) {
    console.error('🔍 API: Error checking Google Keep status:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// API endpoint to clear stored tokens and force fresh OAuth
app.post('/api/google-keep-refresh', (req, res) => {
  try {
    console.log('🔍 API: Clearing stored Google Keep tokens...');
    
    // Clear stored tokens
    global.googleKeepTokens = null;
    
    console.log('🔍 API: Tokens cleared successfully');
    
    return res.status(200).json({
      success: true,
      message: 'Google Keep tokens cleared. Please reconnect to sync fresh data.'
    });
  } catch (error) {
    console.error('🔍 API: Error clearing tokens:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// API endpoint to fetch Google Keep notes
app.get('/api/google-keep-notes', async (req, res) => {
  try {
    const tokens = global.googleKeepTokens;
    
    if (!tokens || tokens.expires_at <= Date.now()) {
      return res.status(401).json({
        error: 'Google Keep not connected or tokens expired'
      });
    }
    
    console.log('🔍 API: Fetching Google Keep notes...');
    console.log('🔍 API: Using access token:', tokens.access_token.substring(0, 20) + '...');
    
    // Fetch notes from Google Drive API (Keep notes are stored as files)
    const response = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.document"&fields=files(id,name,createdTime,modifiedTime,webViewLink)', {
      headers: {
        'Authorization': `Bearer ${tokens.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('🔍 API: Google Keep API error:', response.status, errorText);
      
      // If token is expired, try to refresh it
      if (response.status === 401 && tokens.refresh_token) {
        console.log('🔍 API: Token expired, attempting refresh...');
        const refreshResult = await refreshGoogleToken(tokens.refresh_token);
        
        if (refreshResult.success) {
          // Update stored tokens
          global.googleKeepTokens = {
            ...tokens,
            access_token: refreshResult.access_token,
            expires_in: refreshResult.expires_in,
            expires_at: Date.now() + (refreshResult.expires_in * 1000)
          };
          
          // Retry the request with new token
          const retryResponse = await fetch('https://www.googleapis.com/drive/v3/files?q=mimeType="application/vnd.google-apps.document"&fields=files(id,name,createdTime,modifiedTime,webViewLink)', {
            headers: {
              'Authorization': `Bearer ${refreshResult.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (retryResponse.ok) {
            const notes = await retryResponse.json();
            console.log('🔍 API: Successfully fetched notes after token refresh');
            return res.status(200).json(notes);
          }
        }
      }
      
      return res.status(response.status).json({
        error: 'Failed to fetch notes from Google Keep',
        details: errorText
      });
    }
    
    const notes = await response.json();
    console.log('🔍 API: Successfully fetched Google Keep notes');
    
    return res.status(200).json(notes);
    
  } catch (error) {
    console.error('🔍 API: Error fetching Google Keep notes:', error);
    return res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Helper function to refresh Google OAuth token
async function refreshGoogleToken(refreshToken) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token'
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        access_token: result.access_token,
        expires_in: result.expires_in
      };
    } else {
      console.error('🔍 API: Token refresh failed:', response.status);
      return { success: false };
    }
  } catch (error) {
    console.error('🔍 API: Error refreshing token:', error);
    return { success: false };
  }
}

// Handle SPA routing - serve index.html for all non-API routes
app.get('/notes', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.get('/auth-callback', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'auth-callback', 'index.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log('🔍 OAuth API endpoint: POST /api/exchange-google-code');
}); 