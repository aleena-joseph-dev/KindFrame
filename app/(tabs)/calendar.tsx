import { AuthService } from '@/services/authService';
import { DataService, CalendarEvent as DatabaseCalendarEvent } from '@/services/dataService';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { useSession, useSessionContext, useSupabaseClient } from '@supabase/auth-helpers-react';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:MM format
  type: 'task' | 'goal' | 'reminder' | 'event';
  completed?: boolean;
  createdAt: Date;
  // Additional fields for database compatibility
  start_time?: string;
  end_time?: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  sync_source?: string;
  external_id?: string;
}

interface DayData {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export default function CalendarScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  const session = useSession();
  const supabase = useSupabaseClient();
  const { isLoading: authLoading } = useSessionContext();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventType, setNewEventType] = useState<'task' | 'goal' | 'reminder' | 'event'>('event');
  const [showGoogleCalendarSync, setShowGoogleCalendarSync] = useState(false);
  const [isGoogleCalendarConnected, setIsGoogleCalendarConnected] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('calendar');
  }, [addToStack]);

  useEffect(() => {
    loadEvents();
    checkGoogleCalendarConnection();
    
    // Debug: Check all localStorage tokens
    const keepToken = localStorage.getItem('google_keep_token');
    const calendarToken = localStorage.getItem('google_calendar_token');
    const providerToken = localStorage.getItem('google_provider_token');
    
    console.log('🔍 DEBUG: Token status in localStorage:');
    console.log('🔍 DEBUG: google_keep_token exists:', !!keepToken);
    console.log('🔍 DEBUG: google_calendar_token exists:', !!calendarToken);
    console.log('🔍 DEBUG: google_provider_token exists:', !!providerToken);
  }, [session, currentDate]); // Re-check when session or currentDate changes

  // Load synced Google Calendar events when connection status changes
  useEffect(() => {
    if (isGoogleCalendarConnected) {
      setShowSyncSuccess(true);
      
      // Refresh session to ensure it's properly established
      const refreshSession = async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession();
          if (error) {
            console.error('🔍 Session refresh error:', error);
          } else {
            console.log('🔍 Session refreshed successfully');
          }
        } catch (error) {
          console.error('🔍 Error refreshing session:', error);
        }
      };
      
      refreshSession();
    }
  }, [isGoogleCalendarConnected]);

  useEffect(() => {
    const today = new Date();
    const todayString = formatDateForStorage(today);
    setSelectedDate(todayString);
  }, []);

  const loadEvents = async () => {
    try {
      // Get current month's start and end dates
      const currentMonthStart = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const currentMonthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
      
      const result = await DataService.getCalendarEvents(
        currentMonthStart.toISOString(),
        currentMonthEnd.toISOString()
      );
      
      if (result.success && result.data) {
        // Convert database events to local event format
        const convertedEvents = (result.data as DatabaseCalendarEvent[]).map(dbEvent => ({
          id: dbEvent.id,
          title: dbEvent.title,
          description: dbEvent.description,
          date: new Date(dbEvent.start_time).toISOString().split('T')[0], // YYYY-MM-DD format
          time: new Date(dbEvent.start_time).toTimeString().slice(0, 5), // HH:MM format
          type: 'event' as const, // Default type for database events
          completed: false,
          createdAt: new Date(dbEvent.created_at),
          start_time: dbEvent.start_time,
          end_time: dbEvent.end_time,
          all_day: dbEvent.all_day,
          location: dbEvent.location,
          color: dbEvent.color,
          sync_source: dbEvent.sync_source,
          external_id: dbEvent.external_id
        }));
        setEvents(convertedEvents);
      } else {
        console.error('Error loading events:', result.error);
        setEvents([]);
      }
    } catch (error) {
      console.error('Error loading events:', error);
      setEvents([]);
    }
  };

  const saveEvents = async (updatedEvents: CalendarEvent[]) => {
    try {
      // This function is now handled by individual CRUD operations
      // We'll update the database directly in handleAddEvent, handleUpdateEvent, etc.
      console.log('Events saved to database');
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };

  const formatDateForStorage = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Google Calendar Integration
  const checkGoogleCalendarConnection = async () => {
    try {
      console.log('Checking Google Calendar connection...');
      console.log('🔍 Current session:', session);
      console.log('🔍 Session user:', session?.user);
      
      // Get provider token from localStorage (Calendar-specific)
      const providerToken = localStorage.getItem('google_calendar_token');
      console.log('🔍 Provider token exists:', !!providerToken);
      console.log('🔍 Provider token from localStorage:', providerToken ? providerToken.substring(0, 20) + '...' : 'NO TOKEN');
      
      // Check if user has a Supabase session and provider token
      if (session && session.user && providerToken) {
        console.log('✅ User authenticated with Google Calendar access');
        console.log('🔍 User email:', session.user.email);
        setIsGoogleCalendarConnected(true);
        
        // If connected, fetch events with a small delay to ensure session is ready
        setTimeout(() => {
          fetchGoogleCalendarEvents();
        }, 1000);
      } else if (session && session.user) {
        console.log('✅ User authenticated but no Google Calendar access yet');
        console.log('🔍 User email:', session.user.email);
        setIsGoogleCalendarConnected(false);
      } else {
        console.log('❌ No Supabase session found - user needs to authenticate first');
        setIsGoogleCalendarConnected(false);
      }
    } catch (error) {
      console.error('Error checking Google Calendar connection:', error);
      setIsGoogleCalendarConnected(false);
    }
  };

  const handleGoogleCalendarSync = () => {
    if (isGoogleCalendarConnected) {
      // If already connected, refresh the calendar
      handleRefreshCalendar();
    } else {
      setShowGoogleCalendarSync(true);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    try {
      console.log('🔍 Connect button clicked!');
      console.log('🔍 Supabase client:', supabase);
      console.log('🔍 Current session:', session);
      
      if (!supabase) {
        console.error('❌ Supabase client is undefined!');
        return;
      }
      
      if (!supabase.auth) {
        console.error('❌ Supabase auth is undefined!');
        return;
      }
      
      setShowGoogleCalendarSync(false);
      
      console.log('🔍 About to call supabase.auth.signInWithOAuth...');
      console.log('🔍 This will authenticate user and request Google Calendar access');
      console.log('🔍 Current URL:', window.location.href);
      console.log('🔍 Redirect URL:', window.location.origin + '/auth-callback');
      
      // Use Supabase OAuth with Calendar scopes
      // Force consent screen to ensure we get the right scopes
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar.readonly',
          redirectTo: window.location.origin + '/auth-callback?state=calendar',
          queryParams: {
            prompt: 'consent', // Force consent screen even if user is already authenticated
            access_type: 'offline'
          }
        },
      });
      
      console.log('🔍 OAuth response data:', data);
      console.log('🔍 OAuth response error:', error);
      
      if (error) {
        console.error('Google OAuth error:', error);
      } else {
        console.log('🔍 OAuth initiated successfully!');
        console.log('🔍 User will be redirected to Google OAuth...');
        console.log('🔍 OAuth URL:', data?.url);
      }
      
      // The OAuth flow will redirect to auth-callback
    } catch (error) {
      console.error('Error connecting Google Calendar:', error);
    }
  };

  const handleLaterGoogleCalendar = () => {
    setShowGoogleCalendarSync(false);
  };

  const handleRefreshCalendar = async () => {
    try {
      console.log('🔍 Refreshing calendar events...');
      
      // Reload events from database
      await loadEvents();
      
      // If Google Calendar is connected, also refresh from Google
      if (isGoogleCalendarConnected) {
        await fetchGoogleCalendarEvents();
      }
      
      console.log('🔍 Calendar events refreshed successfully');
    } catch (error) {
      console.error('Error refreshing calendar events:', error);
    }
  };

  // Fetch Google Calendar events using session.provider_token
  const fetchGoogleCalendarEvents = async () => {
    try {
      console.log('🔍 Fetching Google Calendar events using AuthService...');
      
      // Use AuthService to fetch Google Calendar events
      const events = await AuthService.fetchGoogleCalendarEvents();
      
      console.log('🔍 Fetched Google Calendar events count:', events.length);
      
      // Sync events to database using DataService
      try {
        const syncResult = await DataService.syncGoogleCalendarEvents(events);
        if (syncResult.success) {
          const syncedEvents = syncResult.data as DatabaseCalendarEvent[];
          console.log('✅ Google Calendar events synced to database:', syncedEvents?.length || 0);
          // Reload events from database to show synced events
          await loadEvents();
        } else {
          console.error('❌ Failed to sync Google Calendar events:', syncResult.error);
          
          // Handle authentication error specifically
          if (syncResult.error === 'User not authenticated') {
            console.log('🔍 Authentication error detected, retrying in 2 seconds...');
            setTimeout(async () => {
              try {
                const retryResult = await DataService.syncGoogleCalendarEvents(events);
                if (retryResult.success) {
                  const syncedEvents = retryResult.data as DatabaseCalendarEvent[];
                  console.log('✅ Google Calendar events synced to database (retry):', syncedEvents?.length || 0);
                  await loadEvents();
                } else {
                  console.error('❌ Retry failed:', retryResult.error);
                }
              } catch (retryError) {
                console.error('❌ Retry error:', retryError);
              }
            }, 2000);
          }
        }
      } catch (syncError) {
        console.error('❌ Error syncing Google Calendar events:', syncError);
      }
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      
      // If the API call fails, it might mean the token is invalid or has wrong scopes
      if (error.message) {
        if (error.message.includes('No Google Calendar access token found')) {
          console.log('🔍 Token not found, setting connection to false');
          setIsGoogleCalendarConnected(false);
          // Clear the invalid token
          localStorage.removeItem('google_calendar_token');
        } else if (error.message.includes('insufficient_scope') || error.message.includes('insufficientPermissions')) {
          console.log('🔍 Token has insufficient scopes, clearing and re-authenticating');
          setIsGoogleCalendarConnected(false);
          // Clear the token with wrong scopes
          localStorage.removeItem('google_calendar_token');
          console.log('🔍 Scope error: Token doesn\'t have Calendar permissions');
        }
      }
    }
  };

  const getDaysInMonth = (date: Date): DayData[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: DayData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = formatDateForStorage(currentDate);
      const dayEvents = events.filter(event => event.date === dateString);
      
      days.push({
        date: dateString,
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dateString === formatDateForStorage(new Date()),
        events: dayEvents,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleAddEvent = async () => {
    if (!newEventTitle.trim() || !newEventDate) {
      return;
    }

    try {
      // Convert local date/time to ISO strings for database
      const startDateTime = newEventTime 
        ? new Date(`${newEventDate}T${newEventTime}:00`)
        : new Date(`${newEventDate}T00:00:00`);
      
      const endDateTime = new Date(startDateTime);
      endDateTime.setHours(endDateTime.getHours() + 1); // Default 1 hour duration

      const result = await DataService.createCalendarEvent({
        title: newEventTitle.trim(),
        description: newEventDescription.trim() || undefined,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
        all_day: !newEventTime, // All day if no time specified
        color: getEventTypeColor(newEventType)
      });

      if (result.success && result.data) {
        const dbEvent = result.data as DatabaseCalendarEvent;
        const newEvent: CalendarEvent = {
          id: dbEvent.id,
          title: dbEvent.title,
          description: dbEvent.description,
          date: new Date(dbEvent.start_time).toISOString().split('T')[0],
          time: new Date(dbEvent.start_time).toTimeString().slice(0, 5),
          type: newEventType,
          completed: false,
          createdAt: new Date(dbEvent.created_at),
          start_time: dbEvent.start_time,
          end_time: dbEvent.end_time,
          all_day: dbEvent.all_day,
          location: dbEvent.location,
          color: dbEvent.color,
          sync_source: dbEvent.sync_source,
          external_id: dbEvent.external_id
        };

        const updatedEvents = [...events, newEvent];
        setEvents(updatedEvents);
        
        setNewEventTitle('');
        setNewEventDescription('');
        setNewEventDate('');
        setNewEventTime('');
        setNewEventType('event');
        setShowAddEvent(false);
      } else {
        console.error('Failed to create event:', result.error);
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleToggleEvent = (eventId: string) => {
    const updatedEvents = events.map(event =>
      event.id === eventId ? { ...event, completed: !event.completed } : event
    );
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  const handleDeleteEvent = (eventId: string) => {
    const deleteEvent = async () => {
      try {
        const result = await DataService.deleteCalendarEvent(eventId);
        
        if (result.success) {
          const updatedEvents = events.filter(event => event.id !== eventId);
          setEvents(updatedEvents);
        } else {
          console.error('Failed to delete event:', result.error);
        }
      } catch (error) {
        console.error('Error deleting event:', error);
      }
    };
    
    deleteEvent();
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return '#ff6b6b';
      case 'goal': return '#4ecdc4';
      case 'reminder': return '#ffa502';
      case 'event': return '#45b7d1';
      default: return colors.text;
    }
  };

  const getSelectedDateEvents = () => {
    return events.filter(event => event.date === selectedDate);
  };

  const days = getDaysInMonth(currentDate);
  const selectedDateEvents = getSelectedDateEvents();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar 
        title="Calendar" 
        onBack={() => handleBack()} 
        showSettings={true}
        syncButton={{
          label: "Sync Calendar",
          onPress: handleGoogleCalendarSync,
          isConnected: isGoogleCalendarConnected
        }}
      />
      
      {/* Sync Success Banner */}
      {showSyncSuccess && (
        <View style={[styles.successBanner, { backgroundColor: colors.primary }]}>
          <Text style={[styles.successText, { color: colors.background }]}>
            ✅ Google Calendar synced successfully! Your events are now available.
          </Text>
          <TouchableOpacity 
            onPress={() => setShowSyncSuccess(false)}
            style={styles.closeButton}
          >
            <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Reconnect Button (shown when connected but sync fails) */}
      {isGoogleCalendarConnected && (
        <View style={[styles.reconnectBanner, { backgroundColor: colors.surface }]}>
          <Text style={[styles.reconnectText, { color: colors.text }]}>
            Having sync issues? Try reconnecting to Google Calendar.
          </Text>
          <TouchableOpacity 
            onPress={() => {
              localStorage.removeItem('google_calendar_token');
              setIsGoogleCalendarConnected(false);
              setShowGoogleCalendarSync(true);
            }}
            style={[styles.reconnectButton, { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.reconnectButtonText, { color: colors.background }]}>
              Reconnect
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Month Navigation */}
      <View style={styles.monthContainer}>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border }]}
          onPress={handlePreviousMonth}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        
        <Text style={[styles.monthText, { color: colors.text }]}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border }]}
          onPress={handleNextMonth}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarContainer}>
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={[styles.dayHeader, { color: colors.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Days */}
        <View style={styles.daysGrid}>
          {days.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayCell,
                { 
                  backgroundColor: day.date === selectedDate ? colors.buttonBackground : 'transparent',
                  borderColor: colors.border 
                }
              ]}
              onPress={() => handleDateSelect(day.date)}
            >
              <Text style={[
                styles.dayNumber,
                { 
                  color: day.date === selectedDate ? colors.buttonText : 
                         day.isToday ? '#ff6b6b' :
                         day.isCurrentMonth ? colors.text : colors.textSecondary 
                }
              ]}>
                {day.dayNumber}
              </Text>
              
              {/* Event Indicators */}
              {day.events.length > 0 && (
                <View style={styles.eventIndicators}>
                  {day.events.slice(0, 3).map((event, index) => (
                    <View
                      key={event.id}
                      style={[
                        styles.eventIndicator,
                        { backgroundColor: getEventTypeColor(event.type) }
                      ]}
                    />
                  ))}
                  {day.events.length > 3 && (
                    <Text style={[styles.moreEvents, { color: colors.textSecondary }]}>
                      +{day.events.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected Date Events */}
      {selectedDate && (
        <View style={[styles.eventsContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.eventsHeader}>
            <Text style={[styles.eventsTitle, { color: colors.text }]}>
              {formatDateForDisplay(selectedDate)}
            </Text>
            <TouchableOpacity
              style={[styles.addEventButton, { backgroundColor: colors.buttonBackground }]}
              onPress={() => setShowAddEvent(true)}
            >
              <Text style={[styles.addEventButtonText, { color: colors.buttonText }]}>+</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
            {selectedDateEvents.length === 0 ? (
              <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                No events for this date
              </Text>
            ) : (
              selectedDateEvents.map((event) => (
                <View
                  key={event.id}
                  style={[styles.eventItem, { 
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border 
                  }]}
                >
                  <View style={styles.eventHeader}>
                    <View style={[styles.eventTypeIndicator, { backgroundColor: getEventTypeColor(event.type) }]} />
                    <Text style={[styles.eventTitle, { color: colors.text }]}>
                      {event.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteEventButton}
                      onPress={() => handleDeleteEvent(event.id)}
                    >
                      <Text style={[styles.deleteEventButtonText, { color: colors.textSecondary }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {event.description && (
                    <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>
                      {event.description}
                    </Text>
                  )}
                  
                  {event.time && (
                    <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                      {event.time}
                    </Text>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.completeButton, { 
                      backgroundColor: event.completed ? '#2ed573' : colors.buttonBackground 
                    }]}
                    onPress={() => handleToggleEvent(event.id)}
                  >
                    <Text style={[styles.completeButtonText, { color: colors.buttonText }]}>
                      {event.completed ? 'Completed' : 'Mark Complete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Google Calendar Sync Modal */}
      {showGoogleCalendarSync && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sync Google Calendar</Text>
            <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
              Sync your Google Calendar to see events here. Sync now?
            </Text>
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.connectButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleConnectGoogleCalendar}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Connect</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.laterButton, { borderColor: colors.border }]}
                onPress={handleLaterGoogleCalendar}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Later</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Event</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Event title"
              placeholderTextColor={colors.textSecondary}
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newEventDescription}
              onChangeText={setNewEventDescription}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              value={newEventDate}
              onChangeText={setNewEventDate}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Time (HH:MM) - optional"
              placeholderTextColor={colors.textSecondary}
              value={newEventTime}
              onChangeText={setNewEventTime}
            />
            
            <View style={styles.typeContainer}>
              <Text style={[styles.typeLabel, { color: colors.text }]}>Type:</Text>
              <View style={styles.typeButtons}>
                {(['task', 'goal', 'reminder', 'event'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: newEventType === type ? getEventTypeColor(type) : colors.cardBackground,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setNewEventType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      { color: newEventType === type ? '#fff' : colors.text }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddEvent(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addEventButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddEvent}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Add Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  calendarContainer: {
    paddingHorizontal: 20,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventIndicators: {
    flexDirection: 'row',
    marginTop: 2,
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreEvents: {
    fontSize: 10,
    marginLeft: 2,
  },
  eventsContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addEventButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEventButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventsList: {
    flex: 1,
  },
  noEventsText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  eventItem: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteEventButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteEventButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  completeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    marginBottom: 20,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeButton: {
    width: '48%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  addEventButtonModal: {
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  connectButton: {
    flex: 1,
  },
  laterButton: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  reconnectBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  reconnectText: {
    fontSize: 14,
    flex: 1,
    marginRight: 12,
  },
  reconnectButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  reconnectButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 