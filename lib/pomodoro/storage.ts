// Pomodoro Storage Layer
// This file handles all Supabase CRUD operations and offline queue management

import { supabase } from '@/lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    OfflineQueueItem,
    PomodoroSessionRow,
    PomodoroSettings,
    PomodoroSettingsRow,
    SearchableItem,
    SessionDraft
} from './types';

const STORAGE_KEYS = {
  OFFLINE_QUEUE: 'pomodoro:offline_queue',
  SETTINGS_CACHE: 'pomodoro:settings_cache',
  SESSIONS_CACHE: 'pomodoro:sessions_cache',
} as const;

/**
 * Pomodoro Settings Storage
 */
export class PomodoroSettingsStorage {
  /**
   * Get user's pomodoro settings
   */
  static async getSettings(userId: string): Promise<PomodoroSettings | null> {
    try {
      // Try to get from cache first
      const cached = await this.getCachedSettings();
      if (cached) return cached;

      const { data, error } = await supabase
        .from('pomodoro_settings')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error) {
        console.error('Error fetching pomodoro settings:', error);
        return null;
      }

      if (!data) {
        // Create default settings if none exist
        return await this.createDefaultSettings(userId);
      }

      const settings = this.mapRowToSettings(data);
      await this.cacheSettings(settings);
      return settings;
    } catch (error) {
      console.error('Error in getSettings:', error);
      return null;
    }
  }

  /**
   * Update pomodoro settings
   */
  static async updateSettings(userId: string, settings: Partial<PomodoroSettings>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pomodoro_settings')
        .upsert({
          user_id: userId,
          ...settings,
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.error('Error updating pomodoro settings:', error);
        return false;
      }

      // Update cache
      const currentSettings = await this.getSettings(userId);
      if (currentSettings) {
        await this.cacheSettings({ ...currentSettings, ...settings });
      }

      return true;
    } catch (error) {
      console.error('Error in updateSettings:', error);
      return false;
    }
  }

  /**
   * Create default settings for a user
   */
  private static async createDefaultSettings(userId: string): Promise<PomodoroSettings> {
    const defaultSettings: PomodoroSettings = {
      pomo_min: 25,
      short_break_min: 5,
      long_break_min: 15,
      long_break_interval: 4,
      auto_start_breaks: false,
      auto_start_pomodoros: false,
      hour_format: '24h',
      alarm_volume: 50,
      tick_volume: 0,
      dark_mode_when_running: false,
      compact_window: false,
      reminder_before_min: 0,
    };

    await this.updateSettings(userId, defaultSettings);
    return defaultSettings;
  }

  /**
   * Map database row to settings object
   */
  private static mapRowToSettings(row: PomodoroSettingsRow): PomodoroSettings {
    return {
      pomo_min: row.pomo_min,
      short_break_min: row.short_break_min,
      long_break_min: row.long_break_min,
      long_break_interval: row.long_break_interval,
      auto_start_breaks: row.auto_start_breaks,
      auto_start_pomodoros: row.auto_start_pomodoros,
      hour_format: row.hour_format,
      alarm_sound: row.alarm_sound,
      alarm_volume: row.alarm_volume,
      tick_sound: row.tick_sound,
      tick_volume: row.tick_volume,
      dark_mode_when_running: row.dark_mode_when_running,
      compact_window: row.compact_window,
      reminder_before_min: row.reminder_before_min,
    };
  }

  /**
   * Cache settings locally
   */
  private static async cacheSettings(settings: PomodoroSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SETTINGS_CACHE, JSON.stringify(settings));
    } catch (error) {
      console.error('Error caching settings:', error);
    }
  }

  /**
   * Get cached settings
   */
  private static async getCachedSettings(): Promise<PomodoroSettings | null> {
    try {
      const cached = await AsyncStorage.getItem(STORAGE_KEYS.SETTINGS_CACHE);
      return cached ? JSON.parse(cached) : null;
    } catch (error) {
      console.error('Error getting cached settings:', error);
      return null;
    }
  }
}

/**
 * Pomodoro Sessions Storage
 */
export class PomodoroSessionsStorage {
  /**
   * Save a pomodoro session
   */
  static async saveSession(session: SessionDraft): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          user_id: (await supabase.auth.getUser()).data.user?.id,
          linked_type: session.linked_type,
          linked_id: session.linked_id,
          mode: session.mode,
          started_at: session.started_at,
          ended_at: session.ended_at,
          duration_sec: session.duration_sec,
          was_skipped: session.was_skipped || false,
          est_pomos_at_start: session.est_pomos_at_start,
        });

      if (error) {
        console.error('Error saving pomodoro session:', error);
        // Add to offline queue if save fails
        await this.addToOfflineQueue(session);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in saveSession:', error);
      await this.addToOfflineQueue(session);
      return false;
    }
  }

  /**
   * Get user's pomodoro sessions
   */
  static async getSessions(userId: string, limit = 50): Promise<PomodoroSessionRow[]> {
    try {
      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .order('started_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching pomodoro sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getSessions:', error);
      return [];
    }
  }

  /**
   * Get today's sessions
   */
  static async getTodaySessions(userId: string): Promise<PomodoroSessionRow[]> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .select('*')
        .eq('user_id', userId)
        .gte('started_at', today.toISOString())
        .lt('started_at', tomorrow.toISOString())
        .order('started_at', { ascending: false });

      if (error) {
        console.error('Error fetching today\'s sessions:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getTodaySessions:', error);
      return [];
    }
  }

  /**
   * Add session to offline queue
   */
  private static async addToOfflineQueue(session: SessionDraft): Promise<void> {
    try {
      const queueItem: OfflineQueueItem = {
        id: `${Date.now()}-${Math.random()}`,
        payload: session,
        created_at: new Date().toISOString(),
        retry_count: 0,
        max_retries: 3,
      };

      const existingQueue = await this.getOfflineQueue();
      existingQueue.push(queueItem);
      
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(existingQueue));
    } catch (error) {
      console.error('Error adding to offline queue:', error);
    }
  }

  /**
   * Get offline queue
   */
  private static async getOfflineQueue(): Promise<OfflineQueueItem[]> {
    try {
      const queue = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
      return queue ? JSON.parse(queue) : [];
    } catch (error) {
      console.error('Error getting offline queue:', error);
      return [];
    }
  }

  /**
   * Process offline queue
   */
  static async processOfflineQueue(): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      if (queue.length === 0) return;

      const processedItems: string[] = [];
      const failedItems: OfflineQueueItem[] = [];

      for (const item of queue) {
        try {
          const success = await this.saveSession(item.payload);
          if (success) {
            processedItems.push(item.id);
          } else {
            item.retry_count++;
            if (item.retry_count < item.max_retries) {
              failedItems.push(item);
            }
          }
        } catch (error) {
          console.error('Error processing offline queue item:', error);
          item.retry_count++;
          if (item.retry_count < item.max_retries) {
            failedItems.push(item);
          }
        }
      }

      // Update queue with remaining failed items
      await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(failedItems));

      console.log(`Processed ${processedItems.length} offline items, ${failedItems.length} remaining`);
    } catch (error) {
      console.error('Error processing offline queue:', error);
    }
  }
}

/**
 * Search and Link Storage
 */
export class PomodoroLinkStorage {
  /**
   * Search for items to link (todos, goals, calendar events)
   */
  static async searchLinkableItems(query: string, userId: string): Promise<SearchableItem[]> {
    try {
      const results: SearchableItem[] = [];

      // Search todos
      const { data: todos } = await supabase
        .from('todos')
        .select('id, title, description, category, tags, due_date, priority, created_at')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .limit(20);

      if (todos) {
        results.push(...todos.map(todo => ({
          ...todo,
          type: 'todo' as const,
        })));
      }

      // Search goals
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title, description, category, tags, deadline, priority, created_at')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .limit(20);

      if (goals) {
        results.push(...goals.map(goal => ({
          ...goal,
          type: 'task' as const,
          due_date: goal.deadline,
        })));
      }

      // Search calendar events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, location, created_at')
        .eq('user_id', userId)
        .ilike('title', `%${query}%`)
        .limit(20);

      if (events) {
        results.push(...events.map(event => ({
          ...event,
          type: 'event' as const,
          due_date: event.start_time,
          category: 'calendar',
          priority: 'medium',
        })));
      }

      // Sort by relevance (exact matches first, then by creation date)
      return results.sort((a, b) => {
        const aExact = a.title.toLowerCase().includes(query.toLowerCase());
        const bExact = b.title.toLowerCase().includes(query.toLowerCase());
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } catch (error) {
      console.error('Error searching linkable items:', error);
      return [];
    }
  }

  /**
   * Get all linkable items for a user
   */
  static async getAllLinkableItems(userId: string): Promise<SearchableItem[]> {
    try {
      const results: SearchableItem[] = [];

      // Get todos
      const { data: todos } = await supabase
        .from('todos')
        .select('id, title, description, category, tags, due_date, priority, created_at')
        .eq('user_id', userId)
        .eq('is_completed', false)
        .order('created_at', { ascending: false })
        .limit(50);

      if (todos) {
        results.push(...todos.map(todo => ({
          ...todo,
          type: 'todo' as const,
        })));
      }

      // Get goals
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title, description, category, tags, deadline, priority, created_at')
        .eq('user_id', userId)
        .not('status', 'eq', 'completed')
        .order('created_at', { ascending: false })
        .limit(50);

      if (goals) {
        results.push(...goals.map(goal => ({
          ...goal,
          type: 'task' as const,
          due_date: goal.deadline,
        })));
      }

      // Get upcoming calendar events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time, end_time, location, created_at')
        .eq('user_id', userId)
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true })
        .limit(50);

      if (events) {
        results.push(...events.map(event => ({
          ...event,
          type: 'event' as const,
          due_date: event.start_time,
          category: 'calendar',
          priority: 'medium',
        })));
      }

      return results;
    } catch (error) {
      console.error('Error getting all linkable items:', error);
      return [];
    }
  }
}
