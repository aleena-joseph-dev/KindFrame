import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { DataService } from '@/services/dataService';

interface GuestData {
  guestId: string;
  notes: any[];
  todos: any[];
  coreMemories: any[];
  goals: any[];
  journalEntries: any[];
  moodEntries: any[];
  calendarEvents: any[];
  kanbanBoards: any[];
  meditationSessions: any[];
  breathingSessions: any[];
  pomodoroSessions: any[];
  musicSessions: any[];
  quickJots: any[];
  zoneOutSessions: any[];
  todoReviews: any[];
  createdAt: string;
  lastUpdated: string;
}

interface GuestModeContextType {
  isGuestMode: boolean;
  guestData: GuestData | null;
  guestId: string | null;
  initializeGuestMode: () => Promise<void>;
  saveGuestData: (dataType: keyof GuestData, data: any) => Promise<void>;
  migrateGuestDataToUser: (userId: string) => Promise<void>;
  clearGuestData: () => Promise<void>;
  exitGuestMode: () => Promise<void>;
}

const GuestModeContext = createContext<GuestModeContextType | undefined>(undefined);

export function GuestModeProvider({ children }: { children: React.ReactNode }) {
  const [isGuestMode, setIsGuestMode] = useState(false);
  const [guestData, setGuestData] = useState<GuestData | null>(null);
  const [guestId, setGuestId] = useState<string | null>(null);

  // Initialize guest mode on app start
  useEffect(() => {
    checkGuestMode();
  }, []);

  const checkGuestMode = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // No authenticated session, check if we have guest data
        const existingGuestData = await AsyncStorage.getItem('guestData');
        
        if (existingGuestData) {
          const parsedData = JSON.parse(existingGuestData);
          setGuestData(parsedData);
          setGuestId(parsedData.guestId);
          setIsGuestMode(true);
          console.log('🔍 Guest mode restored with existing data');
        } else {
          // No guest data, initialize new guest mode
          await initializeGuestMode();
        }
      } else {
        // User is authenticated, not in guest mode
        setIsGuestMode(false);
        setGuestData(null);
        setGuestId(null);
        console.log('🔍 User authenticated, guest mode disabled');
      }
    } catch (error) {
      console.error('Error checking guest mode:', error);
      // Fallback to guest mode if there's an error
      await initializeGuestMode();
    }
  };

  const initializeGuestMode = async () => {
    try {
      const newGuestId = `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const initialGuestData: GuestData = {
        guestId: newGuestId,
        notes: [],
        todos: [],
        coreMemories: [],
        goals: [],
        journalEntries: [],
        moodEntries: [],
        calendarEvents: [],
        kanbanBoards: [],
        meditationSessions: [],
        breathingSessions: [],
        pomodoroSessions: [],
        musicSessions: [],
        quickJots: [],
        zoneOutSessions: [],
        todoReviews: [],
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString()
      };

      await AsyncStorage.setItem('guestData', JSON.stringify(initialGuestData));
      
      setGuestData(initialGuestData);
      setGuestId(newGuestId);
      setIsGuestMode(true);
      
      console.log('🔍 Guest mode initialized with ID:', newGuestId);
    } catch (error) {
      console.error('Error initializing guest mode:', error);
    }
  };

  const saveGuestData = async (dataType: keyof GuestData, data: any) => {
    if (!guestData) return;

    try {
      const updatedGuestData = {
        ...guestData,
        [dataType]: data,
        lastUpdated: new Date().toISOString()
      };

      await AsyncStorage.setItem('guestData', JSON.stringify(updatedGuestData));
      setGuestData(updatedGuestData);
      
      console.log(`🔍 Guest data saved for ${dataType}:`, data.length || 1, 'items');
    } catch (error) {
      console.error('Error saving guest data:', error);
    }
  };

  const migrateGuestDataToUser = async (userId: string) => {
    if (!guestData) {
      console.log('🔍 No guest data to migrate');
      return;
    }

    try {
      console.log('🔍 Starting guest data migration for user:', userId);
      
      // Migrate each data type to the user's account
      const migrationPromises = [];

      // Notes
      if (guestData.notes.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.notes.map(note => 
            DataService.createNote({
              title: note.title,
              content: note.content,
              category: note.category || 'personal',
              tags: note.tags || []
            })
          ))
        );
      }

      // Todos
      if (guestData.todos.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.todos.map(todo => 
            DataService.createTodo({
              title: todo.title,
              description: todo.description,
              is_completed: todo.is_completed || false,
              due_date: todo.due_date,
              priority: todo.priority || 'medium',
              category: todo.category || 'personal',
              tags: todo.tags || []
            })
          ))
        );
      }

      // Core Memories
      if (guestData.coreMemories.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.coreMemories.map(memory => 
            DataService.createCoreMemory({
              title: memory.title,
              description: memory.description,
              memory_date: memory.memory_date,
              photo_url: memory.photo_url,
              tags: memory.tags || [],
              importance_level: memory.importance_level || 5,
              is_favorite: memory.is_favorite || false
            })
          ))
        );
      }

      // Goals
      if (guestData.goals.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.goals.map(goal => 
            DataService.createGoal({
              title: goal.title,
              description: goal.description,
              category: goal.category || 'personal',
              target_date: goal.target_date,
              deadline: goal.deadline,
              progress_percentage: goal.progress_percentage || 0,
              status: goal.status || 'not_started',
              priority: goal.priority || 'medium',
              tags: goal.tags || []
            })
          ))
        );
      }

      // Journal Entries
      if (guestData.journalEntries.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.journalEntries.map(entry => 
            DataService.createJournalEntry({
              content: entry.content,
              title: entry.title,
              mood: entry.mood,
              mood_intensity: entry.mood_intensity,
              tags: entry.tags || [],
              is_private: entry.is_private || false
            })
          ))
        );
      }

      // Mood Entries
      if (guestData.moodEntries.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.moodEntries.map(entry => 
            DataService.createMoodEntry({
              mood: entry.mood,
              intensity: entry.intensity,
              notes: entry.notes,
              activities: entry.activities || [],
              weather: entry.weather,
              sleep_hours: entry.sleep_hours,
              exercise_minutes: entry.exercise_minutes,
              recorded_at: entry.recorded_at
            })
          ))
        );
      }

      // Calendar Events
      if (guestData.calendarEvents.length > 0) {
        migrationPromises.push(
          Promise.all(guestData.calendarEvents.map(event => 
            DataService.createCalendarEvent({
              title: event.title,
              description: event.description,
              start_time: event.start_time,
              end_time: event.end_time,
              all_day: event.all_day || false,
              location: event.location,
              color: event.color,
              is_recurring: event.is_recurring || false,
              recurrence_rule: event.recurrence_rule
            })
          ))
        );
      }

      // Execute all migrations
      await Promise.all(migrationPromises);
      
      console.log('🔍 Guest data migration completed successfully');
      
      // Clear guest data after successful migration
      await clearGuestData();
      
    } catch (error) {
      console.error('Error migrating guest data:', error);
      throw error;
    }
  };

  const clearGuestData = async () => {
    try {
      await AsyncStorage.removeItem('guestData');
      setGuestData(null);
      setGuestId(null);
      setIsGuestMode(false);
      console.log('🔍 Guest data cleared');
    } catch (error) {
      console.error('Error clearing guest data:', error);
    }
  };

  const exitGuestMode = async () => {
    await clearGuestData();
  };

  const value: GuestModeContextType = {
    isGuestMode,
    guestData,
    guestId,
    initializeGuestMode,
    saveGuestData,
    migrateGuestDataToUser,
    clearGuestData,
    exitGuestMode
  };

  return (
    <GuestModeContext.Provider value={value}>
      {children}
    </GuestModeContext.Provider>
  );
}

export function useGuestMode() {
  const context = useContext(GuestModeContext);
  if (context === undefined) {
    throw new Error('useGuestMode must be used within a GuestModeProvider');
  }
  return context;
} 