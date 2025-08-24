import { supabase } from '@/lib/supabase';

export interface MoodEntry {
  id?: string;
  user_id: string;
  timestamp: string;
  mood_value: {
    body: number;
    mind: number;
  };
}

export interface MoodServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class MoodService {
  /**
   * Save a mood entry to the database
   */
  static async saveMoodEntry(moodEntry: Omit<MoodEntry, 'id'>): Promise<MoodServiceResult<MoodEntry>> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .insert([moodEntry])
        .select()
        .single();

      if (error) {
        console.error('Error saving mood entry:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as MoodEntry,
      };
    } catch (error) {
      console.error('Exception saving mood entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get mood entries for a user
   */
  static async getMoodEntries(userId: string, limit: number = 50): Promise<MoodServiceResult<MoodEntry[]>> {
    try {
      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .order('timestamp', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching mood entries:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as MoodEntry[],
      };
    } catch (error) {
      console.error('Exception fetching mood entries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Get today's mood entries for a user
   */
  static async getTodayMoodEntries(userId: string): Promise<MoodServiceResult<MoodEntry[]>> {
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();

      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('timestamp', startOfDay)
        .lte('timestamp', endOfDay)
        .order('timestamp', { ascending: false });

      if (error) {
        console.error('Error fetching today\'s mood entries:', error);
        return {
          success: false,
          error: error.message,
        };
      }

      return {
        success: true,
        data: data as MoodEntry[],
      };
    } catch (error) {
      console.error('Exception fetching today\'s mood entries:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
