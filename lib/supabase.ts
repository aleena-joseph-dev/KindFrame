import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dlenuyofztbvhzmdfiek.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsZW51eW9menRidmh6bWRmaWVrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NjY2NDMsImV4cCI6MjA2OTQ0MjY0M30.vyeTP56KuHKJlpcH-n8L8qFKxQrrvVSSi30S0P2Gv5A';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          user_id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          sensory_mode: 'low' | 'medium' | 'high';
          preferences: any;
          settings: any;
          quick_jot: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          sensory_mode?: 'low' | 'medium' | 'high';
          preferences?: any;
          settings?: any;
          quick_jot?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          sensory_mode?: 'low' | 'medium' | 'high';
          preferences?: any;
          settings?: any;
          quick_jot?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      journal_entries: {
        Row: {
          id: string;
          user_id: string;
          title: string | null;
          content: string;
          mood: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'calm' | 'neutral' | 'stressed' | 'grateful' | 'frustrated' | null;
          mood_intensity: number | null;
          tags: string[] | null;
          is_private: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          content: string;
          mood?: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'calm' | 'neutral' | 'stressed' | 'grateful' | 'frustrated' | null;
          mood_intensity?: number | null;
          tags?: string[] | null;
          is_private?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string | null;
          content?: string;
          mood?: 'happy' | 'sad' | 'angry' | 'anxious' | 'excited' | 'calm' | 'neutral' | 'stressed' | 'grateful' | 'frustrated' | null;
          mood_intensity?: number | null;
          tags?: string[] | null;
          is_private?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      core_memories: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          memory_date: string | null;
          photo_url: string | null;
          tags: string[] | null;
          importance_level: number | null;
          is_favorite: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          memory_date?: string | null;
          photo_url?: string | null;
          tags?: string[] | null;
          importance_level?: number | null;
          is_favorite?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          memory_date?: string | null;
          photo_url?: string | null;
          tags?: string[] | null;
          importance_level?: number | null;
          is_favorite?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          content: string | null;
          category: 'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other' | null;
          tags: string[] | null;
          is_pinned: boolean | null;
          is_archived: boolean | null;
          sync_source: string | null;
          external_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          content?: string | null;
          category?: 'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other' | null;
          tags?: string[] | null;
          is_pinned?: boolean | null;
          is_archived?: boolean | null;
          sync_source?: string | null;
          external_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          content?: string | null;
          category?: 'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other' | null;
          tags?: string[] | null;
          is_pinned?: boolean | null;
          is_archived?: boolean | null;
          sync_source?: string | null;
          external_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      kanban_boards: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          color: string | null;
          is_archived: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          color?: string | null;
          is_archived?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          color?: string | null;
          is_archived?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      kanban_cards: {
        Row: {
          id: string;
          board_id: string;
          title: string;
          description: string | null;
          status: 'todo' | 'in_progress' | 'done' | 'backlog' | null;
          priority: 'low' | 'medium' | 'high' | 'urgent' | null;
          due_date: string | null;
          position: number | null;
          tags: string[] | null;
          assignee_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          board_id: string;
          title: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'backlog' | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
          due_date?: string | null;
          position?: number | null;
          tags?: string[] | null;
          assignee_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          board_id?: string;
          title?: string;
          description?: string | null;
          status?: 'todo' | 'in_progress' | 'done' | 'backlog' | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
          due_date?: string | null;
          position?: number | null;
          tags?: string[] | null;
          assignee_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      calendar_events: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          start_time: string;
          end_time: string;
          all_day: boolean | null;
          location: string | null;
          color: string | null;
          is_recurring: boolean | null;
          recurrence_rule: string | null;
          sync_source: string | null;
          external_id: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          start_time: string;
          end_time: string;
          all_day?: boolean | null;
          location?: string | null;
          color?: string | null;
          is_recurring?: boolean | null;
          recurrence_rule?: string | null;
          sync_source?: string | null;
          external_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          start_time?: string;
          end_time?: string;
          all_day?: boolean | null;
          location?: string | null;
          color?: string | null;
          is_recurring?: boolean | null;
          recurrence_rule?: string | null;
          sync_source?: string | null;
          external_id?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      goals: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          category: 'personal' | 'work' | 'health' | 'learning' | 'financial' | 'social' | 'other' | null;
          target_date: string | null;
          deadline: string | null;
          progress_percentage: number | null;
          status: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled' | null;
          priority: 'low' | 'medium' | 'high' | 'urgent' | null;
          tags: string[] | null;
          is_archived: boolean | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          category?: 'personal' | 'work' | 'health' | 'learning' | 'financial' | 'social' | 'other' | null;
          target_date?: string | null;
          deadline?: string | null;
          progress_percentage?: number | null;
          status?: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled' | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
          tags?: string[] | null;
          is_archived?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          category?: 'personal' | 'work' | 'health' | 'learning' | 'financial' | 'social' | 'other' | null;
          target_date?: string | null;
          deadline?: string | null;
          progress_percentage?: number | null;
          status?: 'not_started' | 'in_progress' | 'completed' | 'paused' | 'cancelled' | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
          tags?: string[] | null;
          is_archived?: boolean | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      todos: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          description: string | null;
          is_completed: boolean | null;
          due_date: string | null;
          priority: 'low' | 'medium' | 'high' | 'urgent' | null;
          category: 'personal' | 'work' | 'health' | 'shopping' | 'learning' | 'other' | null;
          tags: string[] | null;
          parent_todo_id: string | null;
          sync_source: string | null;
          external_id: string | null;
          completed_at: string | null;
          created_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title: string;
          description?: string | null;
          is_completed?: boolean | null;
          due_date?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
          category?: 'personal' | 'work' | 'health' | 'shopping' | 'learning' | 'other' | null;
          tags?: string[] | null;
          parent_todo_id?: string | null;
          sync_source?: string | null;
          external_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          title?: string;
          description?: string | null;
          is_completed?: boolean | null;
          due_date?: string | null;
          priority?: 'low' | 'medium' | 'high' | 'urgent' | null;
          category?: 'personal' | 'work' | 'health' | 'shopping' | 'learning' | 'other' | null;
          tags?: string[] | null;
          parent_todo_id?: string | null;
          sync_source?: string | null;
          external_id?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
      };
      meditation_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration_minutes: number;
          meditation_type: 'mindfulness' | 'breathing' | 'loving_kindness' | 'body_scan' | 'transcendental' | 'zen' | 'other' | null;
          notes: string | null;
          mood_before: number | null;
          mood_after: number | null;
          completed: boolean | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          duration_minutes: number;
          meditation_type?: 'mindfulness' | 'breathing' | 'loving_kindness' | 'body_scan' | 'transcendental' | 'zen' | 'other' | null;
          notes?: string | null;
          mood_before?: number | null;
          mood_after?: number | null;
          completed?: boolean | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          duration_minutes?: number;
          meditation_type?: 'mindfulness' | 'breathing' | 'loving_kindness' | 'body_scan' | 'transcendental' | 'zen' | 'other' | null;
          notes?: string | null;
          mood_before?: number | null;
          mood_after?: number | null;
          completed?: boolean | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
      };
      breathing_sessions: {
        Row: {
          id: string;
          user_id: string;
          duration_minutes: number;
          breathing_pattern: '4-7-8' | 'box_breathing' | 'alternate_nostril' | 'deep_breathing' | 'custom' | null;
          inhale_seconds: number | null;
          hold_seconds: number | null;
          exhale_seconds: number | null;
          cycles_completed: number | null;
          notes: string | null;
          mood_before: number | null;
          mood_after: number | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          duration_minutes: number;
          breathing_pattern?: '4-7-8' | 'box_breathing' | 'alternate_nostril' | 'deep_breathing' | 'custom' | null;
          inhale_seconds?: number | null;
          hold_seconds?: number | null;
          exhale_seconds?: number | null;
          cycles_completed?: number | null;
          notes?: string | null;
          mood_before?: number | null;
          mood_after?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          duration_minutes?: number;
          breathing_pattern?: '4-7-8' | 'box_breathing' | 'alternate_nostril' | 'deep_breathing' | 'custom' | null;
          inhale_seconds?: number | null;
          hold_seconds?: number | null;
          exhale_seconds?: number | null;
          cycles_completed?: number | null;
          notes?: string | null;
          mood_before?: number | null;
          mood_after?: number | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
      };
      pomodoro_sessions: {
        Row: {
          id: string;
          user_id: string;
          task_title: string | null;
          work_duration_minutes: number | null;
          break_duration_minutes: number | null;
          long_break_duration_minutes: number | null;
          cycles_completed: number | null;
          total_work_time_minutes: number | null;
          total_break_time_minutes: number | null;
          status: 'work' | 'short_break' | 'long_break' | 'completed' | 'interrupted' | null;
          notes: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          task_title?: string | null;
          work_duration_minutes?: number | null;
          break_duration_minutes?: number | null;
          long_break_duration_minutes?: number | null;
          cycles_completed?: number | null;
          total_work_time_minutes?: number | null;
          total_break_time_minutes?: number | null;
          status?: 'work' | 'short_break' | 'long_break' | 'completed' | 'interrupted' | null;
          notes?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          task_title?: string | null;
          work_duration_minutes?: number | null;
          break_duration_minutes?: number | null;
          long_break_duration_minutes?: number | null;
          cycles_completed?: number | null;
          total_work_time_minutes?: number | null;
          total_break_time_minutes?: number | null;
          status?: 'work' | 'short_break' | 'long_break' | 'completed' | 'interrupted' | null;
          notes?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
      };
      music_sessions: {
        Row: {
          id: string;
          user_id: string;
          playlist_name: string | null;
          genre: string | null;
          mood: string | null;
          duration_minutes: number | null;
          notes: string | null;
          started_at: string | null;
          ended_at: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          playlist_name?: string | null;
          genre?: string | null;
          mood?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          playlist_name?: string | null;
          genre?: string | null;
          mood?: string | null;
          duration_minutes?: number | null;
          notes?: string | null;
          started_at?: string | null;
          ended_at?: string | null;
          created_at?: string | null;
        };
      };
      mood_entries: {
        Row: {
          id: string;
          user_id: string;
          timestamp: string;
          mood_value: { body: number; mind: number };
        };
        Insert: {
          id?: string;
          user_id: string;
          timestamp?: string;
          mood_value: { body: number; mind: number };
        };
        Update: {
          id?: string;
          user_id?: string;
          timestamp?: string;
          mood_value?: { body: number; mind: number };
        };
      };
      audio_uploads: {
        Row: {
          id: string;
          user_id: string;
          storage_path: string;
          duration_seconds: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          storage_path: string;
          duration_seconds?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          storage_path?: string;
          duration_seconds?: number | null;
          created_at?: string;
        };
      };
      transcripts: {
        Row: {
          id: string;
          user_id: string;
          source: 'web' | 'electron' | 'android' | 'ios' | null;
          storage_path: string | null;
          raw_text: string | null;
          cleaned_text: string | null;
          provider: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          source?: 'web' | 'electron' | 'android' | 'ios' | null;
          storage_path?: string | null;
          raw_text?: string | null;
          cleaned_text?: string | null;
          provider?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          source?: 'web' | 'electron' | 'android' | 'ios' | null;
          storage_path?: string | null;
          raw_text?: string | null;
          cleaned_text?: string | null;
          provider?: any;
          created_at?: string;
        };
      };
      task_extractions: {
        Row: {
          id: string;
          transcript_id: string;
          user_id: string;
          task_text: string;
          due_at: string | null;
          priority: number | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          transcript_id: string;
          user_id: string;
          task_text: string;
          due_at?: string | null;
          priority?: number | null;
          tags?: string[] | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          transcript_id?: string;
          user_id?: string;
          task_text?: string;
          due_at?: string | null;
          priority?: number | null;
          tags?: string[] | null;
          created_at?: string;
        };
      };
    };
  };
}; 