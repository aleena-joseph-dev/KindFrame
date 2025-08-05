-- Main App Features Database Schema
-- This schema includes all tables for the KindFrame app features

-- ========================================
-- JOURNAL ENTRIES
-- ========================================
CREATE TABLE IF NOT EXISTS public.journal_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  mood TEXT CHECK (mood IN ('happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'neutral', 'stressed', 'grateful', 'frustrated')),
  mood_intensity INTEGER CHECK (mood_intensity >= 1 AND mood_intensity <= 10),
  tags TEXT[] DEFAULT '{}',
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CORE MEMORIES
-- ========================================
CREATE TABLE IF NOT EXISTS public.core_memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  memory_date DATE,
  photo_url TEXT,
  tags TEXT[] DEFAULT '{}',
  importance_level INTEGER CHECK (importance_level >= 1 AND importance_level <= 5) DEFAULT 3,
  is_favorite BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- NOTES
-- ========================================
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  category TEXT CHECK (category IN ('personal', 'work', 'ideas', 'journal', 'learning', 'other')) DEFAULT 'personal',
  tags TEXT[] DEFAULT '{}',
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  sync_source TEXT, -- 'local', 'google_keep', 'notion', etc.
  external_id TEXT, -- ID from external service (Google Keep, Notion, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- KANBAN BOARDS
-- ========================================
CREATE TABLE IF NOT EXISTS public.kanban_boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#4285f4',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- KANBAN CARDS
-- ========================================
CREATE TABLE IF NOT EXISTS public.kanban_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES public.kanban_boards(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT CHECK (status IN ('todo', 'in_progress', 'done', 'backlog')) DEFAULT 'todo',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  due_date TIMESTAMP WITH TIME ZONE,
  position INTEGER DEFAULT 0,
  tags TEXT[] DEFAULT '{}',
  assignee_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- CALENDAR EVENTS
-- ========================================
CREATE TABLE IF NOT EXISTS public.calendar_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  all_day BOOLEAN DEFAULT false,
  location TEXT,
  color TEXT DEFAULT '#4285f4',
  is_recurring BOOLEAN DEFAULT false,
  recurrence_rule TEXT, -- RRULE format for recurring events
  sync_source TEXT, -- 'local', 'google_calendar', 'outlook', etc.
  external_id TEXT, -- ID from external service
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- GOALS
-- ========================================
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT CHECK (category IN ('personal', 'work', 'health', 'learning', 'financial', 'social', 'other')) DEFAULT 'personal',
  target_date DATE,
  deadline DATE,
  progress_percentage INTEGER CHECK (progress_percentage >= 0 AND progress_percentage <= 100) DEFAULT 0,
  status TEXT CHECK (status IN ('not_started', 'in_progress', 'completed', 'paused', 'cancelled')) DEFAULT 'not_started',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  tags TEXT[] DEFAULT '{}',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TODOS
-- ========================================
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  is_completed BOOLEAN DEFAULT false,
  due_date TIMESTAMP WITH TIME ZONE,
  priority TEXT CHECK (priority IN ('low', 'medium', 'high', 'urgent')) DEFAULT 'medium',
  category TEXT CHECK (category IN ('personal', 'work', 'health', 'shopping', 'learning', 'other')) DEFAULT 'personal',
  tags TEXT[] DEFAULT '{}',
  parent_todo_id UUID REFERENCES public.todos(id), -- For subtasks
  sync_source TEXT, -- 'local', 'google_tasks', 'notion', etc.
  external_id TEXT, -- ID from external service
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MOOD TRACKING
-- ========================================
CREATE TABLE IF NOT EXISTS public.mood_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL CHECK (mood IN ('happy', 'sad', 'angry', 'anxious', 'excited', 'calm', 'neutral', 'stressed', 'grateful', 'frustrated')),
  intensity INTEGER CHECK (intensity >= 1 AND intensity <= 10),
  notes TEXT,
  activities TEXT[], -- Array of activities that influenced the mood
  weather TEXT,
  sleep_hours DECIMAL(3,1),
  exercise_minutes INTEGER,
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MEDITATION SESSIONS
-- ========================================
CREATE TABLE IF NOT EXISTS public.meditation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  meditation_type TEXT CHECK (meditation_type IN ('mindfulness', 'breathing', 'loving_kindness', 'body_scan', 'transcendental', 'zen', 'other')),
  notes TEXT,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  completed BOOLEAN DEFAULT true,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- BREATHING SESSIONS
-- ========================================
CREATE TABLE IF NOT EXISTS public.breathing_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  duration_minutes INTEGER NOT NULL,
  breathing_pattern TEXT CHECK (breathing_pattern IN ('4-7-8', 'box_breathing', 'alternate_nostril', 'deep_breathing', 'custom')),
  inhale_seconds INTEGER DEFAULT 4,
  hold_seconds INTEGER DEFAULT 7,
  exhale_seconds INTEGER DEFAULT 8,
  cycles_completed INTEGER,
  notes TEXT,
  mood_before INTEGER CHECK (mood_before >= 1 AND mood_before <= 10),
  mood_after INTEGER CHECK (mood_after >= 1 AND mood_after <= 10),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- POMODORO SESSIONS
-- ========================================
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_title TEXT,
  work_duration_minutes INTEGER DEFAULT 25,
  break_duration_minutes INTEGER DEFAULT 5,
  long_break_duration_minutes INTEGER DEFAULT 15,
  cycles_completed INTEGER DEFAULT 0,
  total_work_time_minutes INTEGER DEFAULT 0,
  total_break_time_minutes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('work', 'short_break', 'long_break', 'completed', 'interrupted')) DEFAULT 'work',
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- MUSIC SESSIONS
-- ========================================
CREATE TABLE IF NOT EXISTS public.music_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  playlist_name TEXT,
  genre TEXT,
  mood TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Journal entries indexes
CREATE INDEX IF NOT EXISTS idx_journal_entries_user_id ON public.journal_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_journal_entries_created_at ON public.journal_entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_journal_entries_mood ON public.journal_entries(mood);
CREATE INDEX IF NOT EXISTS idx_journal_entries_tags ON public.journal_entries USING GIN(tags);

-- Core memories indexes
CREATE INDEX IF NOT EXISTS idx_core_memories_user_id ON public.core_memories(user_id);
CREATE INDEX IF NOT EXISTS idx_core_memories_memory_date ON public.core_memories(memory_date DESC);
CREATE INDEX IF NOT EXISTS idx_core_memories_importance ON public.core_memories(importance_level DESC);
CREATE INDEX IF NOT EXISTS idx_core_memories_tags ON public.core_memories USING GIN(tags);

-- Notes indexes
CREATE INDEX IF NOT EXISTS idx_notes_user_id ON public.notes(user_id);
CREATE INDEX IF NOT EXISTS idx_notes_category ON public.notes(category);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON public.notes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_sync_source ON public.notes(sync_source, external_id);
CREATE INDEX IF NOT EXISTS idx_notes_tags ON public.notes USING GIN(tags);

-- Kanban indexes
CREATE INDEX IF NOT EXISTS idx_kanban_boards_user_id ON public.kanban_boards(user_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_board_id ON public.kanban_cards(board_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_status ON public.kanban_cards(status);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_position ON public.kanban_cards(position);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_due_date ON public.kanban_cards(due_date);

-- Calendar indexes
CREATE INDEX IF NOT EXISTS idx_calendar_events_user_id ON public.calendar_events(user_id);
CREATE INDEX IF NOT EXISTS idx_calendar_events_start_time ON public.calendar_events(start_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_end_time ON public.calendar_events(end_time);
CREATE INDEX IF NOT EXISTS idx_calendar_events_sync_source ON public.calendar_events(sync_source, external_id);

-- Goals indexes
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_status ON public.goals(status);
CREATE INDEX IF NOT EXISTS idx_goals_deadline ON public.goals(deadline);
CREATE INDEX IF NOT EXISTS idx_goals_category ON public.goals(category);
CREATE INDEX IF NOT EXISTS idx_goals_tags ON public.goals USING GIN(tags);

-- Todos indexes
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_is_completed ON public.todos(is_completed);
CREATE INDEX IF NOT EXISTS idx_todos_due_date ON public.todos(due_date);
CREATE INDEX IF NOT EXISTS idx_todos_category ON public.todos(category);
CREATE INDEX IF NOT EXISTS idx_todos_sync_source ON public.todos(sync_source, external_id);
CREATE INDEX IF NOT EXISTS idx_todos_tags ON public.todos USING GIN(tags);

-- Mood tracking indexes
CREATE INDEX IF NOT EXISTS idx_mood_entries_user_id ON public.mood_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_mood_entries_recorded_at ON public.mood_entries(recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mood_entries_mood ON public.mood_entries(mood);

-- Meditation indexes
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_user_id ON public.meditation_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_started_at ON public.meditation_sessions(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_meditation_sessions_type ON public.meditation_sessions(meditation_type);

-- Breathing indexes
CREATE INDEX IF NOT EXISTS idx_breathing_sessions_user_id ON public.breathing_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_breathing_sessions_started_at ON public.breathing_sessions(started_at DESC);

-- Pomodoro indexes
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_started_at ON public.pomodoro_sessions(started_at DESC);

-- Music indexes
CREATE INDEX IF NOT EXISTS idx_music_sessions_user_id ON public.music_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_music_sessions_started_at ON public.music_sessions(started_at DESC);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.core_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kanban_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mood_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meditation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.breathing_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.music_sessions ENABLE ROW LEVEL SECURITY;

-- Journal entries policies
CREATE POLICY "Users can view own journal entries" ON public.journal_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own journal entries" ON public.journal_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own journal entries" ON public.journal_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own journal entries" ON public.journal_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Core memories policies
CREATE POLICY "Users can view own core memories" ON public.core_memories
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own core memories" ON public.core_memories
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own core memories" ON public.core_memories
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own core memories" ON public.core_memories
  FOR DELETE USING (auth.uid() = user_id);

-- Notes policies
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = user_id);

-- Kanban boards policies
CREATE POLICY "Users can view own kanban boards" ON public.kanban_boards
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own kanban boards" ON public.kanban_boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own kanban boards" ON public.kanban_boards
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own kanban boards" ON public.kanban_boards
  FOR DELETE USING (auth.uid() = user_id);

-- Kanban cards policies (users can only access cards from their own boards)
CREATE POLICY "Users can view own kanban cards" ON public.kanban_cards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can insert own kanban cards" ON public.kanban_cards
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can update own kanban cards" ON public.kanban_cards
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );
CREATE POLICY "Users can delete own kanban cards" ON public.kanban_cards
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.kanban_boards 
      WHERE id = board_id AND user_id = auth.uid()
    )
  );

-- Calendar events policies
CREATE POLICY "Users can view own calendar events" ON public.calendar_events
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own calendar events" ON public.calendar_events
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calendar events" ON public.calendar_events
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calendar events" ON public.calendar_events
  FOR DELETE USING (auth.uid() = user_id);

-- Goals policies
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id);

-- Todos policies
CREATE POLICY "Users can view own todos" ON public.todos
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON public.todos
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON public.todos
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON public.todos
  FOR DELETE USING (auth.uid() = user_id);

-- Mood entries policies
CREATE POLICY "Users can view own mood entries" ON public.mood_entries
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own mood entries" ON public.mood_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own mood entries" ON public.mood_entries
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own mood entries" ON public.mood_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Meditation sessions policies
CREATE POLICY "Users can view own meditation sessions" ON public.meditation_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meditation sessions" ON public.meditation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meditation sessions" ON public.meditation_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meditation sessions" ON public.meditation_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Breathing sessions policies
CREATE POLICY "Users can view own breathing sessions" ON public.breathing_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own breathing sessions" ON public.breathing_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own breathing sessions" ON public.breathing_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own breathing sessions" ON public.breathing_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Pomodoro sessions policies
CREATE POLICY "Users can view own pomodoro sessions" ON public.pomodoro_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pomodoro sessions" ON public.pomodoro_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pomodoro sessions" ON public.pomodoro_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pomodoro sessions" ON public.pomodoro_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- Music sessions policies
CREATE POLICY "Users can view own music sessions" ON public.music_sessions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own music sessions" ON public.music_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own music sessions" ON public.music_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own music sessions" ON public.music_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ========================================

-- Create triggers for all tables that need updated_at
CREATE TRIGGER update_journal_entries_updated_at
  BEFORE UPDATE ON public.journal_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_core_memories_updated_at
  BEFORE UPDATE ON public.core_memories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_boards_updated_at
  BEFORE UPDATE ON public.kanban_boards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kanban_cards_updated_at
  BEFORE UPDATE ON public.kanban_cards
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON public.goals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_todos_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON public.journal_entries TO authenticated;
GRANT ALL ON public.core_memories TO authenticated;
GRANT ALL ON public.notes TO authenticated;
GRANT ALL ON public.kanban_boards TO authenticated;
GRANT ALL ON public.kanban_cards TO authenticated;
GRANT ALL ON public.calendar_events TO authenticated;
GRANT ALL ON public.goals TO authenticated;
GRANT ALL ON public.todos TO authenticated;
GRANT ALL ON public.mood_entries TO authenticated;
GRANT ALL ON public.meditation_sessions TO authenticated;
GRANT ALL ON public.breathing_sessions TO authenticated;
GRANT ALL ON public.pomodoro_sessions TO authenticated;
GRANT ALL ON public.music_sessions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated; 