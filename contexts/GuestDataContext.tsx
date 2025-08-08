import { supabase } from '@/lib/supabase';
import { GuestDataService, MoodEntry, PendingAction } from '@/services/guestDataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

interface GuestDataContextType {
  // State
  pendingActions: PendingAction[];
  moodEntries: MoodEntry[];
  modeSelection: string | null;
  isSyncing: boolean;
  hasUnsavedData: boolean;
  
  // SaveWorkModal state
  showSaveWorkModal: boolean;
  currentActionType: PendingAction['type'] | null;
  currentActionData: PendingAction | null;
  
  // Pre-filled form state
  showPrefilledForm: boolean;
  prefilledFormData: PendingAction | null;
  
  // Actions
  savePendingAction: (action: PendingAction) => Promise<void>;
  clearPendingActions: () => Promise<void>;
  saveMoodEntry: (entry: MoodEntry) => Promise<void>;
  clearMoodEntries: () => Promise<void>;
  saveModeSelection: (mode: string) => Promise<void>;
  clearModeSelection: () => Promise<void>;
  
  // SaveWorkModal actions
  triggerSaveWorkModal: (actionType: PendingAction['type'], actionData: PendingAction) => void;
  closeSaveWorkModal: () => void;
  handleSaveWorkSkip: () => void;
  handleSaveWorkSignIn: () => void;
  handleSaveWorkSignUp: () => void;
  
  // Pre-filled form actions
  showPrefilledFormForAction: (action: PendingAction) => void;
  clearPrefilledForm: () => void;
  
  // Home screen sign up handling
  handleSignUpFromHomeScreen: () => Promise<void>;
  
  // Sync and Navigation
  syncGuestDataToDatabase: () => Promise<void>;
  redirectToOriginalPage: (action: PendingAction) => void;
}

const GuestDataContext = createContext<GuestDataContextType | undefined>(undefined);

export const useGuestData = () => {
  const context = useContext(GuestDataContext);
  if (!context) {
    throw new Error('useGuestData must be used within a GuestDataProvider');
  }
  return context;
};

interface GuestDataProviderProps {
  children: React.ReactNode;
}

export const GuestDataProvider: React.FC<GuestDataProviderProps> = ({ children }) => {
  const { session } = useAuth();
  const router = useRouter();
  
  // State
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [modeSelection, setModeSelection] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasUnsavedData, setHasUnsavedData] = useState(false);

  // SaveWorkModal state
  const [showSaveWorkModal, setShowSaveWorkModal] = useState(false);
  const [currentActionType, setCurrentActionType] = useState<PendingAction['type'] | null>(null);
  const [currentActionData, setCurrentActionData] = useState<PendingAction | null>(null);

  // Pre-filled form state
  const [showPrefilledForm, setShowPrefilledForm] = useState(false);
  const [prefilledFormData, setPrefilledFormData] = useState<PendingAction | null>(null);

  // Load guest data on mount
  useEffect(() => {
    loadGuestData();
  }, []);

  // Check for unsaved data when user signs in
  useEffect(() => {
    if (session) {
      checkForUnsavedData();
    }
  }, [session]);

  const loadGuestData = async () => {
    try {
      const [actions, entries, mode] = await Promise.all([
        GuestDataService.getPendingActions(),
        GuestDataService.getMoodEntries(),
        GuestDataService.getModeSelection(),
      ]);
      
      setPendingActions(actions);
      setMoodEntries(entries);
      setModeSelection(mode);
      
      // Also set hasUnsavedData based on loaded data
      const hasData = actions.length > 0 || entries.length > 0 || mode !== null;
      setHasUnsavedData(hasData);
      
      console.log('🎯 GUEST DATA: Loaded guest data:', {
        actions: actions.length,
        entries: entries.length,
        mode,
        hasUnsavedData: hasData,
      });
    } catch (error) {
      console.error('🎯 GUEST DATA: Error loading guest data:', error);
    }
  };

  const checkForUnsavedData = async () => {
    try {
      const hasData = await GuestDataService.hasUnsavedData();
      setHasUnsavedData(hasData);
      console.log('🎯 GUEST DATA: Checked for unsaved data:', hasData);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error checking for unsaved data:', error);
    }
  };

  const savePendingAction = async (action: PendingAction) => {
    try {
      console.log('🎯 GUEST DATA: Starting to save pending action:', action.type);
      await GuestDataService.savePendingAction(action);
      console.log('🎯 GUEST DATA: Successfully saved to GuestDataService');
      
      setPendingActions(prev => [...prev, action]);
      setHasUnsavedData(true);
      console.log('🎯 GUEST DATA: Updated context state for pending action:', action.type);
      
      // Verify the data was actually saved
      const savedActions = await GuestDataService.getPendingActions();
      console.log('🎯 GUEST DATA: Verified saved actions count:', savedActions.length);
      console.log('🎯 GUEST DATA: Verified saved actions:', savedActions.map(a => a.type));
      
      // Check hasUnsavedData
      const hasData = await GuestDataService.hasUnsavedData();
      console.log('🎯 GUEST DATA: Verified hasUnsavedData:', hasData);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error saving pending action:', error);
    }
  };

  const clearPendingActions = async () => {
    try {
      await GuestDataService.clearPendingActions();
      setPendingActions([]);
      setHasUnsavedData(false);
      console.log('🎯 GUEST DATA: Cleared pending actions');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing pending actions:', error);
    }
  };

  const saveMoodEntry = async (entry: MoodEntry) => {
    try {
      await GuestDataService.saveMoodEntry(entry);
      setMoodEntries(prev => [...prev, entry]);
      console.log('🎯 GUEST DATA: Saved mood entry');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error saving mood entry:', error);
    }
  };

  const clearMoodEntries = async () => {
    try {
      await GuestDataService.clearMoodEntries();
      setMoodEntries([]);
      console.log('🎯 GUEST DATA: Cleared mood entries');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing mood entries:', error);
    }
  };

  const saveModeSelection = async (mode: string) => {
    try {
      await GuestDataService.saveModeSelection(mode);
      setModeSelection(mode);
      console.log('🎯 GUEST DATA: Saved mode selection:', mode);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error saving mode selection:', error);
    }
  };

  const clearModeSelection = async () => {
    try {
      await GuestDataService.clearModeSelection();
      setModeSelection(null);
      console.log('🎯 GUEST DATA: Cleared mode selection');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing mode selection:', error);
    }
  };

  // Enhanced sync that includes redirect to original page
  const syncGuestDataToDatabaseAndRedirect = async () => {
    try {
      setIsSyncing(true);
      
      // Get all guest data
      const guestData = await GuestDataService.getAllGuestData();
      
      if (!guestData.pendingActions.length && !guestData.moodEntries.length && !guestData.modeSelection) {
        console.log('🎯 GUEST DATA: No data to sync');
        return;
      }

      // Get session directly from Supabase instead of relying on context
      let userId = session?.user?.id;
      let retryCount = 0;
      const maxRetries = 5;
      
      while (!userId && retryCount < maxRetries) {
        console.log(`🎯 GUEST DATA: Waiting for user ID... (attempt ${retryCount + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        // Try to get session directly from Supabase
        try {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          userId = currentSession?.user?.id;
          console.log(`🎯 GUEST DATA: Direct Supabase session check - userId:`, userId);
        } catch (error) {
          console.log(`🎯 GUEST DATA: Error getting session from Supabase:`, error);
        }
        
        // Also try context session as fallback
        if (!userId) {
          userId = session?.user?.id;
        }
        
        retryCount++;
      }
      
      if (!userId) {
        console.error('🎯 GUEST DATA: No user ID available for sync after retries');
        return;
      }
      
      console.log('🎯 GUEST DATA: User ID available for sync:', userId);

      // Sync pending actions first
      if (guestData.pendingActions.length > 0) {
        console.log('🎯 GUEST DATA: Syncing pending actions:', guestData.pendingActions.length);
        
        for (const action of guestData.pendingActions) {
          try {
            switch (action.type) {
              case 'note':
                await supabase.from('notes').insert({
                  user_id: userId,
                  title: action.data.title,
                  content: action.data.content,
                  category: action.data.category
                });
                break;
              case 'todo':
                await supabase.from('todos').insert({
                  user_id: userId,
                  title: action.data.title,
                  description: action.data.description,
                  is_completed: action.data.is_completed,
                  priority: action.data.priority,
                  category: action.data.category
                });
                break;
              case 'calendar-event':
                await supabase.from('calendar_events').insert({
                  user_id: userId,
                  title: action.data.title,
                  description: action.data.description,
                  start_time: action.data.start_time,
                  end_time: action.data.end_time,
                  all_day: action.data.all_day,
                  color: action.data.color
                });
                break;
              case 'core-memory':
                await supabase.from('core_memories').insert({
                  user_id: userId,
                  title: action.data.title,
                  description: action.data.description,
                  memory_date: action.data.memory_date,
                  photo_url: action.data.photo_url,
                  tags: action.data.tags,
                  importance_level: action.data.importance_level,
                  is_favorite: action.data.is_favorite
                });
                break;
              case 'goal':
                await supabase.from('goals').insert({
                  user_id: userId,
                  title: action.data.title,
                  description: action.data.description,
                  target_date: action.data.target_date,
                  priority: action.data.priority,
                  category: action.data.category,
                  status: action.data.status
                });
                break;
              case 'kanban-task':
                await supabase.from('kanban_cards').insert({
                  board_id: 'default', // You might want to handle this differently
                  title: action.data.title,
                  description: action.data.description,
                  status: action.data.status,
                  priority: action.data.priority,
                  assignee_id: action.data.assignee,
                  due_date: action.data.due_date
                });
                break;
              case 'quick-jot':
                // Handle quick-jot based on the entry type
                if (action.data.type === 'task') {
                  await supabase.from('todos').insert({
                    user_id: userId,
                    title: action.data.content,
                    description: action.data.content,
                    is_completed: false,
                    priority: 'medium',
                    category: 'personal'
                  });
                } else if (action.data.type === 'note') {
                  await supabase.from('notes').insert({
                    user_id: userId,
                    title: action.data.content,
                    content: action.data.content,
                    category: 'personal'
                  });
                } else if (action.data.type === 'journal') {
                  await supabase.from('journal_entries').insert({
                    user_id: userId,
                    content: action.data.content,
                    mood: 'neutral'
                  });
                } else if (action.data.type === 'memory') {
                  await supabase.from('core_memories').insert({
                    user_id: userId,
                    title: action.data.content,
                    description: action.data.content
                  });
                }
                break;
            }
          } catch (error) {
            console.error(`🎯 GUEST DATA: Error syncing ${action.type}:`, error);
          }
        }
        
        await clearPendingActions();
      }

      // Sync mood entries
      if (guestData.moodEntries.length > 0) {
        const moodInserts = guestData.moodEntries.map(entry => ({
          user_id: userId,
          timestamp: entry.timestamp,
          mood_value: entry.mood_value
        }));

        const { error: moodError } = await supabase
          .from('mood_entries')
          .insert(moodInserts);
        
        if (moodError) {
          console.error('🎯 GUEST DATA: Error syncing mood entries:', moodError);
        } else {
          console.log('🎯 GUEST DATA: Synced mood entries:', moodInserts.length);
          await clearMoodEntries();
        }
      }
      
      // Sync mode selection
      if (guestData.modeSelection) {
        const { error: modeError } = await supabase
          .from('user_profiles')
          .upsert({
            user_id: userId,
            sensory_mode: guestData.modeSelection as 'low' | 'medium' | 'high',
            updated_at: new Date().toISOString(),
          });
        
        if (modeError) {
          console.error('🎯 GUEST DATA: Error syncing mode selection:', modeError);
        } else {
          console.log('🎯 GUEST DATA: Synced mode selection:', guestData.modeSelection);
          await clearModeSelection();
        }
      }
      
      // Update last saved timestamp
      await GuestDataService.updateLastSavedTimestamp();
      
      console.log('🎯 GUEST DATA: Sync completed successfully');
      
      // Clear the unsaved data flag after successful sync
      setHasUnsavedData(false);
      
      // Don't redirect immediately - let the auth callback handle the proper flow
      // The auth callback will check for onboarding status and redirect accordingly
      console.log('🎯 GUEST DATA: Sync completed, letting auth callback handle redirect');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error during sync:', error);
      // Silent fallback - keep local data for retry
    } finally {
      setIsSyncing(false);
    }
  };

  const redirectToOriginalPage = (action: PendingAction) => {
    console.log('🎯 GUEST DATA: Redirecting to original page:', action.page);
    
    // Reset navigation stack to ensure proper back navigation after guest mode flow
    // The user should be able to go back from notes -> menu -> home
    console.log('🎯 GUEST DATA: Resetting navigation stack for proper back navigation');
    
    // Use push to maintain proper navigation stack
    // The navigation stack will be rebuilt when the user lands on the page
    router.push(action.page as any);
  };

  // SaveWorkModal actions
  const triggerSaveWorkModal = (actionType: PendingAction['type'], actionData: PendingAction) => {
    console.log('🎯 GUEST DATA: Triggering save work modal for:', actionType);
    console.log('🎯 GUEST DATA: Action data:', actionData);
    
    // Verify data is in AsyncStorage before showing modal
    GuestDataService.hasUnsavedData().then(hasData => {
      console.log('🎯 GUEST DATA: Before showing modal - hasUnsavedData:', hasData);
    });
    
    setCurrentActionType(actionType);
    setCurrentActionData(actionData);
    setShowSaveWorkModal(true);
  };

  const closeSaveWorkModal = () => {
    console.log('🎯 GUEST DATA: Closing save work modal');
    setShowSaveWorkModal(false);
    setCurrentActionType(null);
    setCurrentActionData(null);
  };

  const handleSaveWorkSkip = async () => {
    console.log('🎯 GUEST DATA: User chose to skip, showing pre-filled form');
    if (currentActionData) {
      // Show the pre-filled form instead of saving to local storage
      showPrefilledFormForAction(currentActionData);
    }
    closeSaveWorkModal();
  };

  const handleSaveWorkSignIn = async () => {
    console.log('🎯 GUEST DATA: User chose to sign in');
    // Set a flag to indicate user came through SaveWorkModal
    await AsyncStorage.setItem('came_through_save_work_modal', 'true');
    console.log('🎯 [SAVEWORK DEBUG] Set came_through_save_work_modal flag to "true"');
    // Verify the flag was set
    const flagValue = await AsyncStorage.getItem('came_through_save_work_modal');
    console.log('🎯 [SAVEWORK DEBUG] Verified flag value after setting:', flagValue);
    closeSaveWorkModal();
    router.push('/(auth)/signin');
  };

  const handleSaveWorkSignUp = async () => {
    console.log('🎯 GUEST DATA: User chose to sign up');
    // Set a flag to indicate user came through SaveWorkModal
    await AsyncStorage.setItem('came_through_save_work_modal', 'true');
    console.log('🎯 [SAVEWORK DEBUG] Set came_through_save_work_modal flag to "true"');
    // Verify the flag was set
    const flagValue = await AsyncStorage.getItem('came_through_save_work_modal');
    console.log('🎯 [SAVEWORK DEBUG] Verified flag value after setting:', flagValue);
    closeSaveWorkModal();
    router.push('/(auth)/signup');
  };

  // Pre-filled form actions
  const showPrefilledFormForAction = (action: PendingAction) => {
    console.log('🎯 GUEST DATA: Showing prefilled form for action:', action.type);
    setPrefilledFormData(action);
    setShowPrefilledForm(true);
  };

  const clearPrefilledForm = () => {
    console.log('🎯 GUEST DATA: Clearing prefilled form');
    setPrefilledFormData(null);
    setShowPrefilledForm(false);
  };

  // Handle sign up from home screen (discard task data, keep mode/mood)
  const handleSignUpFromHomeScreen = async () => {
    console.log('🎯 GUEST DATA: User signed up from home screen, clearing task data but keeping mode/mood');
    try {
      // Clear only task-related pending actions
      const taskActions = pendingActions.filter(action => 
        ['note', 'todo', 'event', 'core-memory', 'goal', 'kanban-card', 'quick-jot'].includes(action.type)
      );
      
      // Keep mode selection and mood entries
      await GuestDataService.clearPendingActions();
      setPendingActions([]);
      setHasUnsavedData(false);
      
      console.log('🎯 GUEST DATA: Cleared task data, kept mode/mood data');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing task data:', error);
    }
  };

  const value: GuestDataContextType = {
    // State
    pendingActions,
    moodEntries,
    modeSelection,
    isSyncing,
    hasUnsavedData,
    
    // SaveWorkModal state
    showSaveWorkModal,
    currentActionType,
    currentActionData,
    
    // Pre-filled form state
    showPrefilledForm,
    prefilledFormData,
    
    // Actions
    savePendingAction,
    clearPendingActions,
    saveMoodEntry,
    clearMoodEntries,
    saveModeSelection,
    clearModeSelection,
    
    // SaveWorkModal actions
    triggerSaveWorkModal,
    closeSaveWorkModal,
    handleSaveWorkSkip,
    handleSaveWorkSignIn,
    handleSaveWorkSignUp,
    
    // Pre-filled form actions
    showPrefilledFormForAction,
    clearPrefilledForm,
    
    // Home screen sign up handling
    handleSignUpFromHomeScreen,
    
    // Sync and Navigation
    syncGuestDataToDatabase: syncGuestDataToDatabaseAndRedirect,
    redirectToOriginalPage,
  };

  return (
    <GuestDataContext.Provider value={value}>
      {children}
    </GuestDataContext.Provider>
  );
};
