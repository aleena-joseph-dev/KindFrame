import { supabase } from '@/lib/supabase';

// Type definitions for our database tables
export interface JournalEntry {
  id: string;
  user_id: string;
  title?: string;
  content: string;
  mood?: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'calm' | 'neutral' | 'stressed' | 'grateful' | 'frustrated';
  mood_intensity?: number;
  tags?: string[];
  is_private?: boolean;
  created_at: string;
  updated_at: string;
}

export interface CoreMemory {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  memory_date?: string;
  photo_url?: string;
  tags?: string[];
  importance_level?: number;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content?: string;
  category?: 'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other';
  tags?: string[];
  is_pinned?: boolean;
  is_archived?: boolean;
  sync_source?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

export interface KanbanBoard {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  color?: string;
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface KanbanCard {
  id: string;
  board_id: string;
  title: string;
  description?: string;
  status?: 'todo' | 'in_progress' | 'done' | 'backlog';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  due_date?: string;
  position?: number;
  tags?: string[];
  assignee_id?: string;
  created_at: string;
  updated_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  all_day?: boolean;
  location?: string;
  color?: string;
  is_recurring?: boolean;
  recurrence_rule?: string;
  sync_source?: string;
  external_id?: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category?: 'personal' | 'work' | 'health' | 'learning' | 'financial' | 'social' | 'other';
  target_date?: string;
  deadline?: string;
  progress_percentage?: number;
  status?: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  tags?: string[];
  is_archived?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Todo {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  is_completed?: boolean;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: 'personal' | 'work' | 'health' | 'shopping' | 'learning' | 'other';
  tags?: string[];
  parent_todo_id?: string;
  sync_source?: string;
  external_id?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface MoodEntry {
  id: string;
  user_id: string;
  mood: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'calm' | 'neutral' | 'stressed' | 'grateful' | 'frustrated';
  intensity?: number;
  notes?: string;
  activities?: string[];
  weather?: string;
  sleep_hours?: number;
  exercise_minutes?: number;
  recorded_at: string;
  created_at: string;
}

export interface MeditationSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  meditation_type?: 'mindfulness' | 'breathing' | 'loving_kindness' | 'body_scan' | 'transcendental' | 'zen' | 'other';
  notes?: string;
  mood_before?: number;
  mood_after?: number;
  completed?: boolean;
  started_at: string;
  ended_at: string;
  created_at: string;
}

export interface BreathingSession {
  id: string;
  user_id: string;
  duration_minutes: number;
  breathing_pattern?: '4-7-8' | 'box_breathing' | 'alternate_nostril' | 'deep_breathing' | 'custom';
  inhale_seconds?: number;
  hold_seconds?: number;
  exhale_seconds?: number;
  cycles_completed?: number;
  notes?: string;
  mood_before?: number;
  mood_after?: number;
  started_at: string;
  ended_at: string;
  created_at: string;
}

export interface PomodoroSession {
  id: string;
  user_id: string;
  task_title?: string;
  work_duration_minutes?: number;
  break_duration_minutes?: number;
  long_break_duration_minutes?: number;
  cycles_completed?: number;
  total_work_time_minutes?: number;
  total_break_time_minutes?: number;
  status?: 'work' | 'short_break' | 'long_break' | 'completed' | 'interrupted';
  notes?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

export interface MusicSession {
  id: string;
  user_id: string;
  playlist_name?: string;
  genre?: string;
  mood?: string;
  duration_minutes?: number;
  notes?: string;
  started_at: string;
  ended_at?: string;
  created_at: string;
}

// Generic result type for all operations
export interface DataResult<T> {
  success: boolean;
  data?: T | T[];
  error?: string;
  count?: number;
}

export class DataService {
  // ========================================
  // JOURNAL ENTRIES
  // ========================================
  
  static async createJournalEntry(entry: Omit<JournalEntry, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<JournalEntry>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('journal_entries')
        .insert({
          ...entry,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating journal entry:', error);
      return { success: false, error: error.message };
    }
  }

  static async getJournalEntries(limit = 50, offset = 0): Promise<DataResult<JournalEntry>> {
    try {
      const { data, error, count } = await supabase
        .from('journal_entries')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching journal entries:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateJournalEntry(id: string, updates: Partial<JournalEntry>): Promise<DataResult<JournalEntry>> {
    try {
      const { data, error } = await supabase
        .from('journal_entries')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating journal entry:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteJournalEntry(id: string): Promise<DataResult<void>> {
    try {
      const { error } = await supabase
        .from('journal_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting journal entry:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // CORE MEMORIES
  // ========================================
  
  static async createCoreMemory(memory: Omit<CoreMemory, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<CoreMemory>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('core_memories')
        .insert({
          ...memory,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating core memory:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCoreMemories(limit = 50, offset = 0): Promise<DataResult<CoreMemory>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error, count } = await supabase
        .from('core_memories')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching core memories:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteCoreMemory(id: string): Promise<DataResult<void>> {
    console.log('=== DataService.deleteCoreMemory START ===');
    console.log('Memory ID to delete:', id);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user ID:', user?.id);
      console.log('Full user object:', user);
      
      if (!user) {
        console.log('❌ No user found, returning error');
        return { success: false, error: 'User not authenticated' };
      }

      console.log('✅ User authenticated, attempting delete...');
      console.log('Delete query: id =', id, 'AND user_id =', user.id);
      
      const { error } = await supabase
        .from('core_memories')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      console.log('Supabase delete result error:', error);
      console.log('Error details:', error?.message, error?.details, error?.hint);
      
      if (error) {
        console.log('❌ Delete failed with error:', error);
        throw error;
      }
      
      console.log('✅ Delete successful');
      console.log('=== DataService.deleteCoreMemory END ===');
      return { success: true };
    } catch (error) {
      console.error('❌ Exception in deleteCoreMemory:', error);
      console.log('=== DataService.deleteCoreMemory END WITH ERROR ===');
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // NOTES
  // ========================================
  
  static async createNote(note: Omit<Note, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<Note>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('notes')
        .insert({
          ...note,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating note:', error);
      return { success: false, error: error.message };
    }
  }

  static async getNotes(limit = 50, offset = 0, category?: string): Promise<DataResult<Note>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      let query = supabase
        .from('notes')
        .select('*', { count: 'exact' })
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      const { data, error, count } = await query.range(offset, offset + limit - 1);

      if (error) throw error;
      return { success: true, data, count };
    } catch (error) {
      console.error('Error fetching notes:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateNote(id: string, updates: Partial<Note>): Promise<DataResult<Note>> {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating note:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteNote(id: string): Promise<DataResult<void>> {
    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting note:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // KANBAN BOARDS
  // ========================================
  
  static async createKanbanBoard(board: Omit<KanbanBoard, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<KanbanBoard>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('kanban_boards')
        .insert({
          ...board,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating kanban board:', error);
      return { success: false, error: error.message };
    }
  }

  static async getKanbanBoards(): Promise<DataResult<KanbanBoard>> {
    try {
      const { data, error } = await supabase
        .from('kanban_boards')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching kanban boards:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // KANBAN CARDS
  // ========================================
  
  static async createKanbanCard(card: Omit<KanbanCard, 'id' | 'created_at' | 'updated_at'>): Promise<DataResult<KanbanCard>> {
    try {
      const { data, error } = await supabase
        .from('kanban_cards')
        .insert(card)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating kanban card:', error);
      return { success: false, error: error.message };
    }
  }

  static async getKanbanCards(boardId: string): Promise<DataResult<KanbanCard>> {
    try {
      const { data, error } = await supabase
        .from('kanban_cards')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching kanban cards:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // CALENDAR EVENTS
  // ========================================
  
  static async createCalendarEvent(event: Omit<CalendarEvent, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<CalendarEvent>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          ...event,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  static async getCalendarEvents(startDate?: string, endDate?: string): Promise<DataResult<CalendarEvent>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      let query = supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('start_time', { ascending: true });

      if (startDate && endDate) {
        query = query.gte('start_time', startDate).lte('end_time', endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateCalendarEvent(id: string, updates: Partial<CalendarEvent>): Promise<DataResult<CalendarEvent>> {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  static async deleteCalendarEvent(id: string): Promise<DataResult<void>> {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // GOALS
  // ========================================
  
  static async createGoal(goal: Omit<Goal, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<Goal>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('goals')
        .insert({
          ...goal,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating goal:', error);
      return { success: false, error: error.message };
    }
  }

  static async getGoals(status?: string): Promise<DataResult<Goal>> {
    try {
      let query = supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching goals:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // TODOS
  // ========================================
  
  static async createTodo(todo: Omit<Todo, 'id' | 'user_id' | 'created_at' | 'updated_at'>): Promise<DataResult<Todo>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('todos')
        .insert({
          ...todo,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating todo:', error);
      return { success: false, error: error.message };
    }
  }

  static async getTodos(isCompleted?: boolean): Promise<DataResult<Todo>> {
    try {
      let query = supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false });

      if (isCompleted !== undefined) {
        query = query.eq('is_completed', isCompleted);
      }

      const { data, error } = await query;

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching todos:', error);
      return { success: false, error: error.message };
    }
  }

  static async updateTodo(id: string, updates: Partial<Todo>): Promise<DataResult<Todo>> {
    try {
      const { data, error } = await supabase
        .from('todos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error updating todo:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MOOD TRACKING
  // ========================================
  
  static async createMoodEntry(entry: Omit<MoodEntry, 'id' | 'user_id' | 'created_at'>): Promise<DataResult<MoodEntry>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('mood_entries')
        .insert({
          ...entry,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating mood entry:', error);
      return { success: false, error: error.message };
    }
  }

  static async getMoodEntries(days = 7): Promise<DataResult<MoodEntry>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('mood_entries')
        .select('*')
        .gte('recorded_at', startDate.toISOString())
        .order('recorded_at', { ascending: false });

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error fetching mood entries:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MEDITATION SESSIONS
  // ========================================
  
  static async createMeditationSession(session: Omit<MeditationSession, 'id' | 'user_id' | 'created_at'>): Promise<DataResult<MeditationSession>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('meditation_sessions')
        .insert({
          ...session,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating meditation session:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // BREATHING SESSIONS
  // ========================================
  
  static async createBreathingSession(session: Omit<BreathingSession, 'id' | 'user_id' | 'created_at'>): Promise<DataResult<BreathingSession>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('breathing_sessions')
        .insert({
          ...session,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating breathing session:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // POMODORO SESSIONS
  // ========================================
  
  static async createPomodoroSession(session: Omit<PomodoroSession, 'id' | 'user_id' | 'created_at'>): Promise<DataResult<PomodoroSession>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('pomodoro_sessions')
        .insert({
          ...session,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating pomodoro session:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // MUSIC SESSIONS
  // ========================================
  
  static async createMusicSession(session: Omit<MusicSession, 'id' | 'user_id' | 'created_at'>): Promise<DataResult<MusicSession>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const { data, error } = await supabase
        .from('music_sessions')
        .insert({
          ...session,
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;
      return { success: true, data };
    } catch (error) {
      console.error('Error creating music session:', error);
      return { success: false, error: error.message };
    }
  }

  // ========================================
  // DATA SYNCHRONIZATION
  // ========================================
  
  // Sync Google Keep notes to local database
  static async syncGoogleKeepNotes(keepNotes: any[]): Promise<DataResult<Note>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      const syncedNotes: Note[] = [];

      for (const keepNote of keepNotes) {
        // Check if note already exists
        const { data: existingNote } = await supabase
          .from('notes')
          .select('id')
          .eq('external_id', keepNote.id)
          .eq('sync_source', 'google_keep')
          .single();

        if (existingNote) {
          // Update existing note
          const { data: updatedNote } = await supabase
            .from('notes')
            .update({
              title: keepNote.title,
              content: keepNote.content,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingNote.id)
            .select()
            .single();

          if (updatedNote) syncedNotes.push(updatedNote);
        } else {
          // Create new note
          const { data: newNote } = await supabase
            .from('notes')
            .insert({
              title: keepNote.title,
              content: keepNote.content,
              category: 'personal',
              sync_source: 'google_keep',
              external_id: keepNote.id,
              user_id: user.id
            })
            .select()
            .single();

          if (newNote) syncedNotes.push(newNote);
        }
      }

      return { success: true, data: syncedNotes };
    } catch (error) {
      console.error('Error syncing Google Keep notes:', error);
      return { success: false, error: error.message };
    }
  }

  // Sync Google Calendar events to local database
  static async syncGoogleCalendarEvents(calendarEvents: any[]): Promise<DataResult<CalendarEvent>> {
    try {
      console.log('🔍 Starting Google Calendar sync...');
      console.log('🔍 Number of events to sync:', calendarEvents.length);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('🔍 Auth error:', authError);
        return { success: false, error: `Authentication error: ${authError.message}` };
      }
      
      if (!user) {
        console.error('🔍 No user found in session');
        return { success: false, error: 'User not authenticated' };
      }
      
      console.log('🔍 User authenticated:', user.email);

      const syncedEvents: CalendarEvent[] = [];

      for (const event of calendarEvents) {
        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('external_id', event.id)
          .eq('sync_source', 'google_calendar')
          .single();

        if (existingEvent) {
          // Update existing event
          const { data: updatedEvent } = await supabase
            .from('calendar_events')
            .update({
              title: event.title,
              description: event.description,
              start_time: event.start_time,
              end_time: event.end_time,
              location: event.location,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingEvent.id)
            .select()
            .single();

          if (updatedEvent) syncedEvents.push(updatedEvent);
        } else {
          // Create new event
          const { data: newEvent } = await supabase
            .from('calendar_events')
            .insert({
              title: event.title,
              description: event.description,
              start_time: event.start_time,
              end_time: event.end_time,
              location: event.location,
              sync_source: 'google_calendar',
              external_id: event.id,
              user_id: user.id
            })
            .select()
            .single();

          if (newEvent) syncedEvents.push(newEvent);
        }
      }

      return { success: true, data: syncedEvents };
    } catch (error) {
      console.error('Error syncing Google Calendar events:', error);
      return { success: false, error: error.message };
    }
  }

  // Get user's data summary for dashboard
  static async getUserDataSummary(): Promise<DataResult<any>> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Get counts for different data types
      const [
        { count: journalCount },
        { count: notesCount },
        { count: goalsCount },
        { count: todosCount },
        { count: completedTodosCount },
        { count: moodEntriesCount }
      ] = await Promise.all([
        supabase.from('journal_entries').select('*', { count: 'exact', head: true }),
        supabase.from('notes').select('*', { count: 'exact', head: true }),
        supabase.from('goals').select('*', { count: 'exact', head: true }),
        supabase.from('todos').select('*', { count: 'exact', head: true }),
        supabase.from('todos').select('*', { count: 'exact', head: true }).eq('is_completed', true),
        supabase.from('mood_entries').select('*', { count: 'exact', head: true })
      ]);

      return {
        success: true,
        data: {
          journalCount: journalCount || 0,
          notesCount: notesCount || 0,
          goalsCount: goalsCount || 0,
          todosCount: todosCount || 0,
          completedTodosCount: completedTodosCount || 0,
          moodEntriesCount: moodEntriesCount || 0
        }
      };
    } catch (error) {
      console.error('Error getting user data summary:', error);
      return { success: false, error: error.message };
    }
  }

  // Search user content across all tables
  static async searchUserContent(query: string): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return [];
      }

      const searchTerm = `%${query.toLowerCase()}%`;
      const results: any[] = [];

      // Search todos
      const { data: todos } = await supabase
        .from('todos')
        .select('id, title, description, due_date, priority, category')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10);

      if (todos) {
        results.push(...todos.map(todo => ({
          id: todo.id,
          type: 'todo' as const,
          title: todo.title,
          content: todo.description,
          dueDate: todo.due_date,
          priority: todo.priority,
        })));
      }

      // Search notes
      const { data: notes } = await supabase
        .from('notes')
        .select('id, title, content, category')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},content.ilike.${searchTerm}`)
        .limit(10);

      if (notes) {
        results.push(...notes.map(note => ({
          id: note.id,
          type: 'note' as const,
          title: note.title,
          content: note.content,
        })));
      }

      // Search goals
      const { data: goals } = await supabase
        .from('goals')
        .select('id, title, description, category, target_date')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10);

      if (goals) {
        results.push(...goals.map(goal => ({
          id: goal.id,
          type: 'goal' as const,
          title: goal.title,
          content: goal.description,
          dueDate: goal.target_date,
        })));
      }

      // Search calendar events
      const { data: events } = await supabase
        .from('calendar_events')
        .select('id, title, description, start_time')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10);

      if (events) {
        results.push(...events.map(event => ({
          id: event.id,
          type: 'event' as const,
          title: event.title,
          content: event.description,
          dueDate: event.start_time,
        })));
      }

      // Search kanban cards
      const { data: kanbanCards } = await supabase
        .from('kanban_cards')
        .select('id, title, description, priority, due_date')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10);

      if (kanbanCards) {
        results.push(...kanbanCards.map(card => ({
          id: card.id,
          type: 'task' as const,
          title: card.title,
          content: card.description,
          dueDate: card.due_date,
          priority: card.priority,
        })));
      }

      // Search core memories
      const { data: memories } = await supabase
        .from('core_memories')
        .select('id, title, description')
        .eq('user_id', user.id)
        .or(`title.ilike.${searchTerm},description.ilike.${searchTerm}`)
        .limit(10);

      if (memories) {
        results.push(...memories.map(memory => ({
          id: memory.id,
          type: 'memory' as const,
          title: memory.title,
          content: memory.description,
        })));
      }

      return results;
    } catch (error) {
      console.error('Error searching user content:', error);
      return [];
    }
  }
} 