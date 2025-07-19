import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

// Google OAuth configuration
const GOOGLE_CLIENT_ID = {
  ios: 'YOUR_IOS_CLIENT_ID', // Replace with your iOS client ID
  android: 'YOUR_ANDROID_CLIENT_ID', // Replace with your Android client ID
  web: 'YOUR_WEB_CLIENT_ID', // Replace with your web client ID
};

const GOOGLE_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'kindframe',
  path: 'auth',
});

const GOOGLE_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  given_name?: string;
  family_name?: string;
}

export class GoogleAuthService {
  private static instance: GoogleAuthService;
  private request: AuthSession.AuthRequest | null = null;

  private constructor() {}

  static getInstance(): GoogleAuthService {
    if (!GoogleAuthService.instance) {
      GoogleAuthService.instance = new GoogleAuthService();
    }
    return GoogleAuthService.instance;
  }

  async signIn(): Promise<GoogleUser | null> {
    try {
      // Check if we have valid client IDs configured
      const clientId = this.getClientId();
      
      if (clientId.includes('YOUR_') || clientId === '') {
        // Development mode: Return mock user data
        console.log('Development mode: Using mock Google authentication');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Return mock user data
        return {
          id: 'dev_user_123',
          email: 'aleena001@gmail.com',
          name: 'Aleena',
          picture: 'https://via.placeholder.com/150',
          given_name: 'Aleena',
          family_name: 'User',
        };
      }

      // Production mode: Use real Google OAuth
      console.log('Production mode: Using real Google OAuth');
      
      // Create auth request
      this.request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: ['openid', 'profile', 'email'],
        redirectUri: GOOGLE_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'select_account',
        },
      });

      // Get auth URL
      const authUrl = await this.request.makeAuthUrlAsync(GOOGLE_DISCOVERY);
      
      // Present auth session
      const result = await this.request.promptAsync(GOOGLE_DISCOVERY, {
        showInRecents: true,
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: clientId,
            code: result.params.code,
            redirectUri: GOOGLE_REDIRECT_URI,
            extraParams: {
              code_verifier: this.request.codeVerifier || '',
            },
          },
          GOOGLE_DISCOVERY
        );

        if (tokenResult.accessToken) {
          // Get user info
          const userInfo = await this.getUserInfo(tokenResult.accessToken);
          return userInfo;
        }
      }

      return null;
    } catch (error) {
      console.error('Google sign-in error:', error);
      
      // In development, fall back to mock data
      if (process.env.NODE_ENV === 'development') {
        console.log('Falling back to mock authentication due to error');
        return {
          id: 'dev_user_123',
          email: 'aleena001@gmail.com',
          name: 'Aleena',
          picture: 'https://via.placeholder.com/150',
          given_name: 'Aleena',
          family_name: 'User',
        };
      }
      
      throw error;
    }
  }

  private async getUserInfo(accessToken: string): Promise<GoogleUser> {
    const response = await fetch(
      `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userData = await response.json();
    return {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      picture: userData.picture,
      given_name: userData.given_name,
      family_name: userData.family_name,
    };
  }

  private getClientId(): string {
    if (Platform.OS === 'ios') {
      return GOOGLE_CLIENT_ID.ios;
    } else if (Platform.OS === 'android') {
      return GOOGLE_CLIENT_ID.android;
    } else {
      return GOOGLE_CLIENT_ID.web;
    }
  }

  async signOut(): Promise<void> {
    // Clear any stored tokens or user data
    this.request = null;
  }
}

export const googleAuthService = GoogleAuthService.getInstance(); 