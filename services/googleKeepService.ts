import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

// Google Keep OAuth configuration
const GOOGLE_KEEP_CLIENT_ID = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_KEEP_CLIENT_ID || 'YOUR_IOS_CLIENT_ID',
  android: process.env.EXPO_PUBLIC_GOOGLE_KEEP_CLIENT_ID || 'YOUR_ANDROID_CLIENT_ID',
  web: process.env.EXPO_PUBLIC_GOOGLE_KEEP_CLIENT_ID || 'YOUR_WEB_CLIENT_ID',
};

const GOOGLE_KEEP_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'kindframe',
  path: 'keep-auth',
});

const GOOGLE_KEEP_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleKeepNote {
  id: string;
  title: string;
  content: string;
  color?: string;
  labels?: string[];
  createdAt: string;
  updatedAt: string;
  isArchived?: boolean;
  isPinned?: boolean;
}

export interface NotesSyncStatus {
  isConnected: boolean;
  lastSync?: string;
  notesCount?: number;
  accessToken?: string;
  refreshToken?: string;
}

export class GoogleKeepService {
  private static instance: GoogleKeepService;
  private request: AuthSession.AuthRequest | null = null;

  private constructor() {}

  static getInstance(): GoogleKeepService {
    if (!GoogleKeepService.instance) {
      GoogleKeepService.instance = new GoogleKeepService();
    }
    return GoogleKeepService.instance;
  }

  async getSyncStatus(): Promise<NotesSyncStatus> {
    try {
      const status = await AsyncStorage.getItem('google_keep_sync_status');
      return status ? JSON.parse(status) : { isConnected: false };
    } catch (error) {
      console.error('Error getting notes sync status:', error);
      return { isConnected: false };
    }
  }

  async setSyncStatus(status: NotesSyncStatus): Promise<void> {
    try {
      await AsyncStorage.setItem('google_keep_sync_status', JSON.stringify(status));
    } catch (error) {
      console.error('Error setting notes sync status:', error);
    }
  }

  async connect(): Promise<boolean> {
    try {
      console.log('🔗 CONNECTING TO GOOGLE KEEP...');
      
      // Check if we have valid client IDs configured
      const clientId = this.getClientId();
      
      if (clientId.includes('YOUR_') || clientId === '') {
        // Development mode: Simulate connection
        console.log('Development mode: Simulating Google Keep connection');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create mock sync status
        const mockStatus: NotesSyncStatus = {
          isConnected: true,
          lastSync: new Date().toISOString(),
          notesCount: 5,
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token'
        };
        
        await this.setSyncStatus(mockStatus);
        console.log('✅ SUCCESS: Mock Google Keep connected');
        return true;
      }

      // Production mode: Use real Google OAuth
      console.log('Production mode: Using real Google Keep OAuth');
      
      // Create auth request with Keep scopes
      this.request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: [
          'https://www.googleapis.com/auth/keep',
          'https://www.googleapis.com/auth/keep.readonly'
        ],
        redirectUri: GOOGLE_KEEP_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      // Get auth URL
      const authUrl = await this.request.makeAuthUrlAsync(GOOGLE_KEEP_DISCOVERY);
      
      // Present auth session
      const result = await this.request.promptAsync(GOOGLE_KEEP_DISCOVERY, {
        showInRecents: true,
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: clientId,
            code: result.params.code,
            redirectUri: GOOGLE_KEEP_REDIRECT_URI,
            extraParams: {
              code_verifier: this.request.codeVerifier || '',
            },
          },
          GOOGLE_KEEP_DISCOVERY
        );

        if (tokenResult.accessToken) {
          // Get user's notes count
          const notesCount = await this.getNotesCount(tokenResult.accessToken);
          
          // Create sync status
          const syncStatus: NotesSyncStatus = {
            isConnected: true,
            lastSync: new Date().toISOString(),
            notesCount: notesCount,
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
          };
          
          await this.setSyncStatus(syncStatus);
          console.log('✅ SUCCESS: Google Keep connected');
          return true;
        }
      }

      console.log('❌ FAILED: Google Keep connection failed');
      return false;
    } catch (error) {
      console.error('❌ ERROR: Google Keep connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('🔌 DISCONNECTING FROM GOOGLE KEEP...');
      
      // Clear sync status
      await this.setSyncStatus({ isConnected: false });
      
      // Clear stored tokens
      await AsyncStorage.removeItem('google_keep_sync_status');
      
      console.log('✅ SUCCESS: Google Keep disconnected');
    } catch (error) {
      console.error('❌ ERROR: Error disconnecting from Google Keep:', error);
    }
  }

  async getNotes(): Promise<GoogleKeepNote[]> {
    try {
      const status = await this.getSyncStatus();
      
      if (!status.isConnected || !status.accessToken) {
        console.log('⚠️ WARNING: Google Keep not connected');
        return [];
      }

      // In development mode, return mock notes
      if (status.accessToken === 'mock_access_token') {
        console.log('Development mode: Returning mock Keep notes');
        return this.getMockNotes();
      }

      // Production mode: Fetch real notes
      console.log('Production mode: Fetching real Keep notes');
      
      const response = await fetch(
        'https://keep.googleapis.com/v1/notes',
        {
          headers: {
            'Authorization': `Bearer ${status.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch notes: ${response.status}`);
      }

      const data = await response.json();
      return data.notes || [];
    } catch (error) {
      console.error('❌ ERROR: Error fetching Keep notes:', error);
      return [];
    }
  }

  private async getNotesCount(accessToken: string): Promise<number> {
    try {
      const response = await fetch(
        'https://keep.googleapis.com/v1/notes',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch notes count: ${response.status}`);
      }

      const data = await response.json();
      return data.notes?.length || 0;
    } catch (error) {
      console.error('❌ ERROR: Error fetching notes count:', error);
      return 0;
    }
  }

  private getMockNotes(): GoogleKeepNote[] {
    // Generate mock notes for development
    const mockNotes: GoogleKeepNote[] = [
      {
        id: 'mock_note_1',
        title: 'Meeting Notes',
        content: 'Discuss project timeline and deliverables for Q1',
        color: '#fbbc04',
        labels: ['work', 'meetings'],
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
        isPinned: true
      },
      {
        id: 'mock_note_2',
        title: 'Shopping List',
        content: 'Milk, Bread, Eggs, Bananas, Coffee',
        color: '#34a853',
        labels: ['personal', 'shopping'],
        createdAt: '2024-01-14T15:30:00Z',
        updatedAt: '2024-01-14T15:30:00Z',
        isPinned: false
      },
      {
        id: 'mock_note_3',
        title: 'Ideas for App',
        content: 'Dark mode support, Voice notes, Calendar integration',
        color: '#ea4335',
        labels: ['ideas', 'development'],
        createdAt: '2024-01-13T09:15:00Z',
        updatedAt: '2024-01-13T09:15:00Z',
        isPinned: true
      }
    ];

    return mockNotes;
  }

  private getClientId(): string {
    if (Platform.OS === 'ios') {
      return GOOGLE_KEEP_CLIENT_ID.ios;
    } else if (Platform.OS === 'android') {
      return GOOGLE_KEEP_CLIENT_ID.android;
    } else {
      return GOOGLE_KEEP_CLIENT_ID.web;
    }
  }
}

export const googleKeepService = GoogleKeepService.getInstance(); 