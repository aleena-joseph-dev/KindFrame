import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Complete the auth session
WebBrowser.maybeCompleteAuthSession();

// Google Calendar OAuth configuration
const GOOGLE_CALENDAR_CLIENT_ID = {
  ios: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || 'YOUR_IOS_CLIENT_ID',
  android: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || 'YOUR_ANDROID_CLIENT_ID',
  web: process.env.EXPO_PUBLIC_GOOGLE_CALENDAR_CLIENT_ID || 'YOUR_WEB_CLIENT_ID',
};

const GOOGLE_CALENDAR_REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: 'kindframe',
  path: 'calendar-auth',
});

const GOOGLE_CALENDAR_DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime?: string;
    date?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

export interface GoogleCalendar {
  id: string;
  summary: string;
  primary?: boolean;
  accessRole: string;
}

export interface CalendarSyncStatus {
  isConnected: boolean;
  lastSync?: string;
  calendars?: GoogleCalendar[];
  accessToken?: string;
  refreshToken?: string;
}

export class GoogleCalendarService {
  private static instance: GoogleCalendarService;
  private request: AuthSession.AuthRequest | null = null;

  private constructor() {}

  static getInstance(): GoogleCalendarService {
    if (!GoogleCalendarService.instance) {
      GoogleCalendarService.instance = new GoogleCalendarService();
    }
    return GoogleCalendarService.instance;
  }

  async getSyncStatus(): Promise<CalendarSyncStatus> {
    try {
      const status = await AsyncStorage.getItem('google_calendar_sync_status');
      return status ? JSON.parse(status) : { isConnected: false };
    } catch (error) {
      console.error('Error getting calendar sync status:', error);
      return { isConnected: false };
    }
  }

  async setSyncStatus(status: CalendarSyncStatus): Promise<void> {
    try {
      await AsyncStorage.setItem('google_calendar_sync_status', JSON.stringify(status));
    } catch (error) {
      console.error('Error setting calendar sync status:', error);
    }
  }

  async connect(): Promise<boolean> {
    try {
      console.log('🔗 CONNECTING TO GOOGLE CALENDAR...');
      
      // Check if we have valid client IDs configured
      const clientId = this.getClientId();
      
      if (clientId.includes('YOUR_') || clientId === '') {
        // Development mode: Simulate connection
        console.log('Development mode: Simulating Google Calendar connection');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Create mock sync status
        const mockStatus: CalendarSyncStatus = {
          isConnected: true,
          lastSync: new Date().toISOString(),
          calendars: [
            {
              id: 'primary',
              summary: 'Primary Calendar',
              primary: true,
              accessRole: 'owner'
            }
          ],
          accessToken: 'mock_access_token',
          refreshToken: 'mock_refresh_token'
        };
        
        await this.setSyncStatus(mockStatus);
        console.log('✅ SUCCESS: Mock Google Calendar connected');
        return true;
      }

      // Production mode: Use real Google OAuth
      console.log('Production mode: Using real Google Calendar OAuth');
      
      // Create auth request with calendar scopes
      this.request = new AuthSession.AuthRequest({
        clientId: clientId,
        scopes: [
          'https://www.googleapis.com/auth/calendar.readonly',
          'https://www.googleapis.com/auth/calendar.events.readonly'
        ],
        redirectUri: GOOGLE_CALENDAR_REDIRECT_URI,
        responseType: AuthSession.ResponseType.Code,
        extraParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      });

      // Get auth URL
      const authUrl = await this.request.makeAuthUrlAsync(GOOGLE_CALENDAR_DISCOVERY);
      
      // Present auth session
      const result = await this.request.promptAsync(GOOGLE_CALENDAR_DISCOVERY, {
        showInRecents: true,
      });

      if (result.type === 'success' && result.params.code) {
        // Exchange code for tokens
        const tokenResult = await AuthSession.exchangeCodeAsync(
          {
            clientId: clientId,
            code: result.params.code,
            redirectUri: GOOGLE_CALENDAR_REDIRECT_URI,
            extraParams: {
              code_verifier: this.request.codeVerifier || '',
            },
          },
          GOOGLE_CALENDAR_DISCOVERY
        );

        if (tokenResult.accessToken) {
          // Get user's calendars
          const calendars = await this.getCalendars(tokenResult.accessToken);
          
          // Create sync status
          const syncStatus: CalendarSyncStatus = {
            isConnected: true,
            lastSync: new Date().toISOString(),
            calendars: calendars,
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken,
          };
          
          await this.setSyncStatus(syncStatus);
          console.log('✅ SUCCESS: Google Calendar connected');
          return true;
        }
      }

      console.log('❌ FAILED: Google Calendar connection failed');
      return false;
    } catch (error) {
      console.error('❌ ERROR: Google Calendar connection error:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    try {
      console.log('🔌 DISCONNECTING FROM GOOGLE CALENDAR...');
      
      // Clear sync status
      await this.setSyncStatus({ isConnected: false });
      
      // Clear stored tokens
      await AsyncStorage.removeItem('google_calendar_sync_status');
      
      console.log('✅ SUCCESS: Google Calendar disconnected');
    } catch (error) {
      console.error('❌ ERROR: Error disconnecting from Google Calendar:', error);
    }
  }

  async getEvents(startDate: string, endDate: string): Promise<GoogleCalendarEvent[]> {
    try {
      const status = await this.getSyncStatus();
      
      if (!status.isConnected || !status.accessToken) {
        console.log('⚠️ WARNING: Google Calendar not connected');
        return [];
      }

      // In development mode, return mock events
      if (status.accessToken === 'mock_access_token') {
        console.log('Development mode: Returning mock calendar events');
        return this.getMockEvents(startDate, endDate);
      }

      // Production mode: Fetch real events
      console.log('Production mode: Fetching real calendar events');
      
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        `timeMin=${startDate}T00:00:00Z&timeMax=${endDate}T23:59:59Z&` +
        `singleEvents=true&orderBy=startTime`,
        {
          headers: {
            'Authorization': `Bearer ${status.accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch events: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('❌ ERROR: Error fetching calendar events:', error);
      return [];
    }
  }

  private async getCalendars(accessToken: string): Promise<GoogleCalendar[]> {
    try {
      const response = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch calendars: ${response.status}`);
      }

      const data = await response.json();
      return data.items || [];
    } catch (error) {
      console.error('❌ ERROR: Error fetching calendars:', error);
      return [];
    }
  }

  private getMockEvents(startDate: string, endDate: string): GoogleCalendarEvent[] {
    // Generate mock events for development
    const mockEvents: GoogleCalendarEvent[] = [
      {
        id: 'mock_event_1',
        summary: 'Team Meeting',
        description: 'Weekly team sync',
        start: {
          dateTime: `${startDate}T10:00:00Z`
        },
        end: {
          dateTime: `${startDate}T11:00:00Z`
        },
        location: 'Conference Room A',
        reminders: {
          useDefault: true
        }
      },
      {
        id: 'mock_event_2',
        summary: 'Lunch with Client',
        description: 'Discuss project requirements',
        start: {
          dateTime: `${startDate}T12:30:00Z`
        },
        end: {
          dateTime: `${startDate}T13:30:00Z`
        },
        location: 'Downtown Restaurant',
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'popup', minutes: 15 }
          ]
        }
      }
    ];

    return mockEvents;
  }

  private getClientId(): string {
    if (Platform.OS === 'ios') {
      return GOOGLE_CALENDAR_CLIENT_ID.ios;
    } else if (Platform.OS === 'android') {
      return GOOGLE_CALENDAR_CLIENT_ID.android;
    } else {
      return GOOGLE_CALENDAR_CLIENT_ID.web;
    }
  }
}

export const googleCalendarService = GoogleCalendarService.getInstance(); 