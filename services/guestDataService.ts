import AsyncStorage from '@react-native-async-storage/async-storage';

// Types for guest data
export interface PendingAction {
  type: 'calendar-event' | 'todo' | 'note' | 'core-memory' | 'goal' | 'kanban-task' | 'quick-jot';
  page: string;
  data: any;
  timestamp: number;
  formState?: any; // Store form state for restoration
}

export interface MoodEntry {
  timestamp: number;
  mood_value: { body: number; mind: number };
}

export interface GuestData {
  pendingActions: PendingAction[];
  moodEntries: MoodEntry[];
  modeSelection?: string;
  lastSavedTimestamp?: number;
}

// Storage keys
const STORAGE_KEYS = {
  PENDING_ACTIONS: 'guest_pending_actions',
  MOOD_ENTRIES: 'guest_mood_entries',
  MODE_SELECTION: 'guest_mode_selection',
  LAST_SAVED_TIMESTAMP: 'guest_last_saved_timestamp',
} as const;

export class GuestDataService {
  // Pending Actions Management
  static async savePendingAction(action: PendingAction): Promise<void> {
    try {
      const existingActions = await this.getPendingActions();
      
      // Replace any existing action of the same type
      const filteredActions = existingActions.filter(a => a.type !== action.type);
      const updatedActions = [...filteredActions, action];
      
      await AsyncStorage.setItem(STORAGE_KEYS.PENDING_ACTIONS, JSON.stringify(updatedActions));
      console.log('🎯 GUEST DATA: Saved pending action:', action.type);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error saving pending action:', error);
    }
  }

  static async getPendingActions(): Promise<PendingAction[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.PENDING_ACTIONS);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('🎯 GUEST DATA: Error getting pending actions:', error);
      return [];
    }
  }

  static async clearPendingActions(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.PENDING_ACTIONS);
      console.log('🎯 GUEST DATA: Cleared pending actions');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing pending actions:', error);
    }
  }

  // Mood Entries Management
  static async saveMoodEntry(moodEntry: MoodEntry): Promise<void> {
    try {
      const existingEntries = await this.getMoodEntries();
      const updatedEntries = [...existingEntries, moodEntry];
      
      await AsyncStorage.setItem(STORAGE_KEYS.MOOD_ENTRIES, JSON.stringify(updatedEntries));
      console.log('🎯 GUEST DATA: Saved mood entry');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error saving mood entry:', error);
    }
  }

  static async getMoodEntries(): Promise<MoodEntry[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.MOOD_ENTRIES);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('🎯 GUEST DATA: Error getting mood entries:', error);
      return [];
    }
  }

  static async clearMoodEntries(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MOOD_ENTRIES);
      console.log('🎯 GUEST DATA: Cleared mood entries');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing mood entries:', error);
    }
  }

  // Mode Selection Management
  static async saveModeSelection(mode: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.MODE_SELECTION, mode);
      console.log('🎯 GUEST DATA: Saved mode selection:', mode);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error saving mode selection:', error);
    }
  }

  static async getModeSelection(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(STORAGE_KEYS.MODE_SELECTION);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error getting mode selection:', error);
      return null;
    }
  }

  static async clearModeSelection(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.MODE_SELECTION);
      console.log('🎯 GUEST DATA: Cleared mode selection');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing mode selection:', error);
    }
  }

  // Utility Methods
  static async hasUnsavedData(): Promise<boolean> {
    try {
      const [pendingActions, moodEntries, modeSelection] = await Promise.all([
        this.getPendingActions(),
        this.getMoodEntries(),
        this.getModeSelection(),
      ]);
      
      return pendingActions.length > 0 || moodEntries.length > 0 || modeSelection !== null;
    } catch (error) {
      console.error('🎯 GUEST DATA: Error checking for unsaved data:', error);
      return false;
    }
  }

  static async getAllGuestData(): Promise<GuestData> {
    try {
      const [pendingActions, moodEntries, modeSelection, lastSavedTimestamp] = await Promise.all([
        this.getPendingActions(),
        this.getMoodEntries(),
        this.getModeSelection(),
        this.getLastSavedTimestamp(),
      ]);
      
      return {
        pendingActions,
        moodEntries,
        modeSelection: modeSelection || undefined,
        lastSavedTimestamp,
      };
    } catch (error) {
      console.error('🎯 GUEST DATA: Error getting all guest data:', error);
      return {
        pendingActions: [],
        moodEntries: [],
      };
    }
  }

  static async clearAllGuestData(): Promise<void> {
    try {
      await Promise.all([
        this.clearPendingActions(),
        this.clearMoodEntries(),
        this.clearModeSelection(),
        this.clearLastSavedTimestamp(),
      ]);
      console.log('🎯 GUEST DATA: Cleared all guest data');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing all guest data:', error);
    }
  }

  static async updateLastSavedTimestamp(): Promise<void> {
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_SAVED_TIMESTAMP, timestamp.toString());
      console.log('🎯 GUEST DATA: Updated last saved timestamp');
    } catch (error) {
      console.error('🎯 GUEST DATA: Error updating last saved timestamp:', error);
    }
  }

  static async getLastSavedTimestamp(): Promise<number | undefined> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SAVED_TIMESTAMP);
      return data ? parseInt(data, 10) : undefined;
    } catch (error) {
      console.error('🎯 GUEST DATA: Error getting last saved timestamp:', error);
      return undefined;
    }
  }

  private static async clearLastSavedTimestamp(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEYS.LAST_SAVED_TIMESTAMP);
    } catch (error) {
      console.error('🎯 GUEST DATA: Error clearing last saved timestamp:', error);
    }
  }
}
