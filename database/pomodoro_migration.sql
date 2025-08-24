-- Pomodoro System Migration
-- This migration handles the existing pomodoro_sessions table and creates the new enhanced schema

-- ========================================
-- DROP EXISTING POMODORO SESSIONS TABLE
-- ========================================
-- First, drop the existing table since it has a completely different schema
DROP TABLE IF EXISTS public.pomodoro_sessions CASCADE;

-- ========================================
-- POMODORO SETTINGS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.pomodoro_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pomo_min INTEGER NOT NULL DEFAULT 25,
  short_break_min INTEGER NOT NULL DEFAULT 5,
  long_break_min INTEGER NOT NULL DEFAULT 15,
  long_break_interval INTEGER NOT NULL DEFAULT 4,
  auto_start_breaks BOOLEAN NOT NULL DEFAULT false,
  auto_start_pomodoros BOOLEAN NOT NULL DEFAULT false,
  hour_format TEXT NOT NULL DEFAULT '24h' CHECK (hour_format IN ('24h', '12h')),
  alarm_sound TEXT,
  alarm_volume INTEGER NOT NULL DEFAULT 50 CHECK (alarm_volume >= 0 AND alarm_volume <= 100),
  tick_sound TEXT,
  tick_volume INTEGER NOT NULL DEFAULT 0 CHECK (tick_volume >= 0 AND tick_volume <= 100),
  dark_mode_when_running BOOLEAN NOT NULL DEFAULT false,
  compact_window BOOLEAN NOT NULL DEFAULT false,
  reminder_before_min INTEGER NOT NULL DEFAULT 0 CHECK (reminder_before_min >= 0 AND reminder_before_min <= 60),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id) -- Add unique constraint for ON CONFLICT
);

-- ========================================
-- ENHANCED POMODORO SESSIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_type TEXT CHECK (linked_type IN ('task', 'todo', 'event')) NULL,
  linked_id UUID NULL,                  -- references the selected table row
  mode TEXT NOT NULL CHECK (mode IN ('focus', 'short_break', 'long_break')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER,
  was_skipped BOOLEAN NOT NULL DEFAULT false,
  est_pomos_at_start INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ========================================
-- ADD FOREIGN KEY CONSTRAINTS FOR LINKED_ID
-- ========================================
-- Add foreign key constraints for linked_id based on linked_type
-- Note: These are conditional constraints that will be enforced by triggers

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================
CREATE INDEX IF NOT EXISTS idx_pomodoro_settings_user_id ON public.pomodoro_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_user_id ON public.pomodoro_sessions(user_id, started_at);
CREATE INDEX IF NOT EXISTS idx_pomodoro_sessions_linked ON public.pomodoro_sessions(linked_type, linked_id);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================
ALTER TABLE public.pomodoro_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pomodoro_sessions ENABLE ROW LEVEL SECURITY;

-- Pomodoro settings policies
CREATE POLICY "Users can view own pomodoro settings" ON public.pomodoro_settings
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pomodoro settings" ON public.pomodoro_settings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pomodoro settings" ON public.pomodoro_settings
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own pomodoro settings" ON public.pomodoro_settings
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

-- ========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS AND DURATION_CALCULATION
-- ========================================
-- Check if the function exists, if not create it
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to calculate duration_sec when ended_at is set
CREATE OR REPLACE FUNCTION public.calculate_pomodoro_duration()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.ended_at IS NOT NULL AND NEW.started_at IS NOT NULL THEN
        NEW.duration_sec = EXTRACT(EPOCH FROM (NEW.ended_at - NEW.started_at));
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Function to validate linked_id based on linked_type
CREATE OR REPLACE FUNCTION public.validate_pomodoro_linked_item()
RETURNS TRIGGER AS $$
BEGIN
    -- Only validate if both linked_type and linked_id are set
    IF NEW.linked_type IS NOT NULL AND NEW.linked_id IS NOT NULL THEN
        CASE NEW.linked_type
            WHEN 'task' THEN
                -- Check if task exists in kanban_cards table
                IF NOT EXISTS (SELECT 1 FROM public.kanban_cards WHERE id = NEW.linked_id) THEN
                    RAISE EXCEPTION 'Referenced task does not exist';
                END IF;
            WHEN 'todo' THEN
                -- Check if todo exists in todos table
                IF NOT EXISTS (SELECT 1 FROM public.todos WHERE id = NEW.linked_id) THEN
                    RAISE EXCEPTION 'Referenced todo does not exist';
                END IF;
            WHEN 'event' THEN
                -- Check if event exists in calendar_events table
                IF NOT EXISTS (SELECT 1 FROM public.calendar_events WHERE id = NEW.linked_id) THEN
                    RAISE EXCEPTION 'Referenced event does not exist';
                END IF;
        END CASE;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers
CREATE TRIGGER update_pomodoro_settings_updated_at
  BEFORE UPDATE ON public.pomodoro_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER calculate_pomodoro_duration
  BEFORE INSERT OR UPDATE ON public.pomodoro_sessions
  FOR EACH ROW EXECUTE FUNCTION public.calculate_pomodoro_duration();

CREATE TRIGGER validate_pomodoro_linked_item
  BEFORE INSERT OR UPDATE ON public.pomodoro_sessions
  FOR EACH ROW EXECUTE FUNCTION public.validate_pomodoro_linked_item();

-- ========================================
-- GRANT PERMISSIONS (MORE GRANULAR)
-- ========================================
-- Grant specific permissions instead of ALL
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pomodoro_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pomodoro_sessions TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- INSERT DEFAULT SETTINGS FOR EXISTING USERS
-- ========================================
-- This will create default pomodoro settings for all existing users
DO $$
DECLARE
    user_count INTEGER;
    inserted_count INTEGER;
BEGIN
    -- Count existing users
    SELECT COUNT(*) INTO user_count FROM auth.users;
    
    -- Insert default settings
    INSERT INTO public.pomodoro_settings (user_id, pomo_min, short_break_min, long_break_min, long_break_interval, auto_start_breaks, auto_start_pomodoros, hour_format, alarm_volume, tick_volume, dark_mode_when_running, compact_window, reminder_before_min)
    SELECT 
      id as user_id,
      25 as pomo_min,
      5 as short_break_min,
      15 as long_break_min,
      4 as long_break_interval,
      false as auto_start_breaks,
      false as auto_start_pomodoros,
      '24h' as hour_format,
      50 as alarm_volume,
      0 as tick_volume,
      false as dark_mode_when_running,
      false as compact_window,
      0 as reminder_before_min
    FROM auth.users
    WHERE id NOT IN (SELECT user_id FROM public.pomodoro_settings)
    ON CONFLICT (user_id) DO NOTHING;
    
    -- Get count of inserted records
    GET DIAGNOSTICS inserted_count = ROW_COUNT;
    
    -- Log the results
    RAISE NOTICE 'Pomodoro migration completed: % users processed, % new settings created', user_count, inserted_count;
END $$;
