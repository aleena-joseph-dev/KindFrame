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
          id: string;
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
          id?: string;
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
          id?: string;
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
    };
  };
}; 