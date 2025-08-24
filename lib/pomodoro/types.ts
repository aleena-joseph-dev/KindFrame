// Pomodoro System Types
// This file contains all the TypeScript types for the enhanced Pomodoro feature

export type LinkedRef = { 
  type: 'task' | 'todo' | 'event'; 
  id: string; 
  title: string | null; 
  estPomos?: number; 
};

export type PomodoroMode = 'focus' | 'short_break' | 'long_break';

export type PomodoroState = 'idle' | 'running' | 'paused' | 'completed';

export type HourFormat = '24h' | '12h';

export interface PomodoroSettings {
  pomo_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_interval: number;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  hour_format: HourFormat;
  alarm_sound?: string;
  alarm_volume: number;
  tick_sound?: string;
  tick_volume: number;
  dark_mode_when_running: boolean;
  compact_window: boolean;
  reminder_before_min: number;
}

export interface SessionDraft {
  linked_type?: LinkedRef['type'];
  linked_id?: string;
  mode: PomodoroMode;
  started_at: string;
  ended_at?: string;
  duration_sec?: number;
  was_skipped?: boolean;
  est_pomos_at_start?: number;
  client_id: string;
}

export interface PomodoroTask {
  id: string;
  type: 'task' | 'todo' | 'event';
  title: string;
  description?: string;
  estPomos: number;
  completedPomos: number;
  isActive: boolean;
  isCompleted: boolean;
  linkedRef?: LinkedRef;
}

export interface TimerState {
  mode: PomodoroMode;
  state: PomodoroState;
  timeLeft: number; // in seconds
  totalTime: number; // in seconds
  focusCount: number;
  startedAt?: Date;
  pausedAt?: Date;
  pausedOffset: number; // total paused time in seconds
}

export interface NotificationConfig {
  reminder_before_min: number;
  alarm_sound?: string;
  alarm_volume: number;
  tick_sound?: string;
  tick_volume: number;
}

// Database types matching Supabase schema
export interface PomodoroSettingsRow {
  id: string;
  user_id: string;
  pomo_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_interval: number;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  hour_format: HourFormat;
  alarm_sound?: string;
  alarm_volume: number;
  tick_sound?: string;
  tick_volume: number;
  dark_mode_when_running: boolean;
  compact_window: boolean;
  reminder_before_min: number;
  updated_at: string;
}

export interface PomodoroSessionRow {
  id: string;
  user_id: string;
  linked_type?: 'task' | 'todo' | 'event';
  linked_id?: string;
  mode: PomodoroMode;
  started_at: string;
  ended_at?: string;
  duration_sec?: number;
  was_skipped: boolean;
  est_pomos_at_start?: number;
  created_at: string;
}

// Search result types for linking existing items
export interface SearchableItem {
  id: string;
  type: 'task' | 'todo' | 'event';
  title: string;
  description?: string;
  category?: string;
  tags?: string[];
  due_date?: string;
  priority?: string;
  created_at: string;
}

// Offline queue types
export interface OfflineQueueItem {
  id: string;
  payload: SessionDraft;
  created_at: string;
  retry_count: number;
  max_retries: number;
}

// Sound configuration
export interface SoundConfig {
  name: string;
  file: string;
  displayName: string;
}

export const AVAILABLE_SOUNDS: SoundConfig[] = [
  { name: 'classic', file: 'classic.mp3', displayName: 'Classic Bell' },
  { name: 'kitchen', file: 'kitchen.mp3', displayName: 'Kitchen Timer' },
  { name: 'gentle', file: 'gentle.mp3', displayName: 'Gentle Chime' },
  { name: 'digital', file: 'digital.mp3', displayName: 'Digital Beep' },
];

export const AVAILABLE_TICK_SOUNDS: SoundConfig[] = [
  { name: 'none', file: '', displayName: 'No Sound' },
  { name: 'tick', file: 'tick.mp3', displayName: 'Clock Tick' },
  { name: 'click', file: 'click.mp3', displayName: 'Soft Click' },
];
