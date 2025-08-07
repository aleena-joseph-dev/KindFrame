import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/contexts/GuestModeContext';
import { DataService } from '@/services/dataService';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export function useGuestData() {
  const { isGuestMode, guestData, saveGuestData, migrateGuestDataToUser } = useGuestMode();
  const router = useRouter();
  const { session } = useAuth();
  const [isMigrating, setIsMigrating] = useState(false);
  const [showSaveWorkModal, setShowSaveWorkModal] = useState(false);

  // Generic function to handle data operations with guest mode fallback
  const handleDataOperation = async <T>(
    operation: () => Promise<T>,
    guestDataKey: keyof typeof guestData,
    guestDataItem?: any
  ): Promise<T | null> => {
    try {
      if (isGuestMode && !session) {
        // In guest mode and not authenticated, save to local storage
        if (guestDataItem) {
          const currentData = guestData?.[guestDataKey] || [];
          const updatedData = [...currentData, guestDataItem];
          await saveGuestData(guestDataKey, updatedData);
        }
        // Return a mock success result for guest mode
        return { success: true, data: guestDataItem } as any;
      } else {
        // User is authenticated, perform database operation
        return await operation();
      }
    } catch (error) {
      console.error('Error in data operation:', error);
      throw error;
    }
  };

  // Function to prompt user to sign in when they try to save data in guest mode
  const promptSignIn = () => {
    // Only show the modal if user is in guest mode and not authenticated
    if (isGuestMode && !session) {
      setShowSaveWorkModal(true);
    }
  };

  const closeSaveWorkModal = () => {
    setShowSaveWorkModal(false);
  };

  const handleGoogleSignIn = () => {
    closeSaveWorkModal();
    router.push('/(auth)/signup');
  };

  const handleEmailSignIn = () => {
    closeSaveWorkModal();
    router.push('/(auth)/signup');
  };

  const handleSkip = () => {
    closeSaveWorkModal();
  };

  const handleSignInLink = () => {
    closeSaveWorkModal();
    router.push('/(auth)/signin');
  };

  // Function to migrate guest data after successful sign up
  const migrateDataAfterSignUp = async (userId: string) => {
    if (!isGuestMode || !guestData) {
      return;
    }

    try {
      setIsMigrating(true);
      console.log('🔍 Migrating guest data after sign up...');
      await migrateGuestDataToUser(userId);
      console.log('🔍 Guest data migration completed');
    } catch (error) {
      console.error('Error migrating guest data:', error);
      throw error;
    } finally {
      setIsMigrating(false);
    }
  };

  // Specific data operation functions
  const createNote = async (noteData: any) => {
    return handleDataOperation(
      () => DataService.createNote(noteData),
      'notes',
      {
        ...noteData,
        id: `guest_note_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  };

  const createTodo = async (todoData: any) => {
    return handleDataOperation(
      () => DataService.createTodo(todoData),
      'todos',
      {
        ...todoData,
        id: `guest_todo_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  };

  const createCoreMemory = async (memoryData: any) => {
    return handleDataOperation(
      () => DataService.createCoreMemory(memoryData),
      'coreMemories',
      {
        ...memoryData,
        id: `guest_memory_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  };

  const createGoal = async (goalData: any) => {
    return handleDataOperation(
      () => DataService.createGoal(goalData),
      'goals',
      {
        ...goalData,
        id: `guest_goal_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  };

  const createJournalEntry = async (entryData: any) => {
    return handleDataOperation(
      () => DataService.createJournalEntry(entryData),
      'journalEntries',
      {
        ...entryData,
        id: `guest_journal_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  };

  const createMoodEntry = async (entryData: any) => {
    return handleDataOperation(
      () => DataService.createMoodEntry(entryData),
      'moodEntries',
      {
        ...entryData,
        id: `guest_mood_${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    );
  };

  const createCalendarEvent = async (eventData: any) => {
    return handleDataOperation(
      () => DataService.createCalendarEvent(eventData),
      'calendarEvents',
      {
        ...eventData,
        id: `guest_event_${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    );
  };

  const createQuickJot = async (jotData: any) => {
    return handleDataOperation(
      () => Promise.resolve({ success: true, data: jotData }), // Placeholder for quick jot
      'quickJots',
      {
        ...jotData,
        id: `guest_jot_${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    );
  };

  const createZoneOutSession = async (sessionData: any) => {
    return handleDataOperation(
      () => Promise.resolve({ success: true, data: sessionData }), // Placeholder for zone out
      'zoneOutSessions',
      {
        ...sessionData,
        id: `guest_zoneout_${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    );
  };

  const createTodoReview = async (reviewData: any) => {
    return handleDataOperation(
      () => Promise.resolve({ success: true, data: reviewData }), // Placeholder for todo review
      'todoReviews',
      {
        ...reviewData,
        id: `guest_review_${Date.now()}`,
        createdAt: new Date().toISOString()
      }
    );
  };

  // Function to get guest data for a specific type
  const getGuestData = (dataType: keyof typeof guestData) => {
    return guestData?.[dataType] || [];
  };

  // Delete functions for guest mode compatibility
  const deleteCoreMemory = async (memoryId: string) => {
    console.log('🔍 useGuestData.deleteCoreMemory START');
    console.log('Memory ID:', memoryId);
    console.log('isGuestMode:', isGuestMode);
    console.log('session exists:', !!session);
    console.log('Full session:', session);
    
    try {
      if (isGuestMode && !session) {
        console.log('📱 Deleting from guest mode (local storage)');
        // In guest mode, remove from local storage
        const currentData = guestData?.coreMemories || [];
        console.log('Current guest data count:', currentData.length);
        const updatedData = currentData.filter((memory: any) => memory.id !== memoryId);
        console.log('Updated guest data count:', updatedData.length);
        await saveGuestData('coreMemories', updatedData);
        console.log('✅ Guest mode delete successful');
        return { success: true };
      } else {
        console.log('🌐 Deleting from database via DataService');
        console.log('About to call DataService.deleteCoreMemory...');
        // User is authenticated, perform database operation
        const result = await DataService.deleteCoreMemory(memoryId);
        console.log('DataService.deleteCoreMemory result:', result);
        console.log('🔍 useGuestData.deleteCoreMemory END');
        return result;
      }
    } catch (error) {
      console.error('❌ Error in useGuestData.deleteCoreMemory:', error);
      console.log('🔍 useGuestData.deleteCoreMemory END WITH ERROR');
      return { success: false, error: error.message };
    }
  };

  const deleteNote = async (noteId: string) => {
    try {
      if (isGuestMode && !session) {
        // In guest mode, remove from local storage
        const currentData = guestData?.notes || [];
        const updatedData = currentData.filter((note: any) => note.id !== noteId);
        await saveGuestData('notes', updatedData);
        return { success: true };
      } else {
        // User is authenticated, perform database operation
        return await DataService.deleteNote(noteId);
      }
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }
  };

  const deleteCalendarEvent = async (eventId: string) => {
    try {
      if (isGuestMode && !session) {
        // In guest mode, remove from local storage
        const currentData = guestData?.calendarEvents || [];
        const updatedData = currentData.filter((event: any) => event.id !== eventId);
        await saveGuestData('calendarEvents', updatedData);
        return { success: true };
      } else {
        // User is authenticated, perform database operation
        return await DataService.deleteCalendarEvent(eventId);
      }
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { success: false, error: error.message };
    }
  };

  return {
    isGuestMode,
    isMigrating,
    guestData,
    createNote,
    createTodo,
    createCoreMemory,
    createGoal,
    createJournalEntry,
    createMoodEntry,
    createCalendarEvent,
    createQuickJot,
    createZoneOutSession,
    createTodoReview,
    deleteCoreMemory,
    deleteNote,
    deleteCalendarEvent,
    getGuestData,
    promptSignIn,
    closeSaveWorkModal,
    showSaveWorkModal,
    handleGoogleSignIn,
    handleEmailSignIn,
    handleSkip,
    handleSignInLink,
    migrateDataAfterSignUp
  };
} 