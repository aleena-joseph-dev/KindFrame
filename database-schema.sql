-- KindFrame Database Schema
-- This file reflects the actual working database structure
-- user_profiles table references auth.users directly (no intermediate public.users table)

-- Create user_profiles table for extended user data
CREATE TABLE IF NOT EXISTS public.user_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  sensory_mode TEXT CHECK (sensory_mode IN ('low', 'medium', 'high')) DEFAULT 'low',
  preferences JSONB DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  quick_jot BOOLEAN DEFAULT false
);

-- Enable RLS on user_profiles table
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON public.user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON public.user_profiles(email);

-- Add unique constraint on user_id (already primary key, but explicit for clarity)
ALTER TABLE public.user_profiles ADD CONSTRAINT IF NOT EXISTS user_profiles_user_id_unique UNIQUE (user_id);

-- RLS Policies for user_profiles table

-- Users can read their own profile data
CREATE POLICY "Users can view own profile data" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own profile data
CREATE POLICY "Users can update own profile data" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can insert their own profile data
CREATE POLICY "Users can insert own profile data" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users cannot delete their own profile data (handled by auth.users cascade)
CREATE POLICY "Users cannot delete own profile data" ON public.user_profiles
  FOR DELETE USING (false);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, email, full_name, avatar_url, sensory_mode, preferences, settings)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    'low',
    '{}',
    '{}'
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to automatically create user profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- Comments for documentation
COMMENT ON TABLE public.user_profiles IS 'Extended user profile data that references auth.users directly';
COMMENT ON COLUMN public.user_profiles.user_id IS 'Primary key and foreign key to auth.users(id)';
COMMENT ON COLUMN public.user_profiles.email IS 'User email (copied from auth.users for convenience)';
COMMENT ON COLUMN public.user_profiles.sensory_mode IS 'User sensory preference: low, medium, or high';
COMMENT ON COLUMN public.user_profiles.preferences IS 'JSONB field for user preferences';
COMMENT ON COLUMN public.user_profiles.settings IS 'JSONB field for app settings including nickname, mode, etc.';
COMMENT ON COLUMN public.user_profiles.quick_jot IS 'Boolean flag for quick jot feature';