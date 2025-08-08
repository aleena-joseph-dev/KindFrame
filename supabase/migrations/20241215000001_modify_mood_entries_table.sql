-- Modify mood_entries table to only keep essential fields
-- Remove unnecessary columns and keep only: id, user_id, timestamp, mood_value

-- First, drop the existing table if it exists
DROP TABLE IF EXISTS mood_entries;

-- Create the new mood_entries table with only required fields
CREATE TABLE mood_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  mood_value JSONB NOT NULL CHECK (mood_value ? 'body' AND mood_value ? 'mind')
);

-- Add RLS policy
ALTER TABLE mood_entries ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to see only their own mood entries
CREATE POLICY "Users can view own mood entries" ON mood_entries
  FOR SELECT USING (auth.uid() = user_id);

-- Policy to allow users to insert their own mood entries
CREATE POLICY "Users can insert own mood entries" ON mood_entries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy to allow users to update their own mood entries
CREATE POLICY "Users can update own mood entries" ON mood_entries
  FOR UPDATE USING (auth.uid() = user_id);

-- Policy to allow users to delete their own mood entries
CREATE POLICY "Users can delete own mood entries" ON mood_entries
  FOR DELETE USING (auth.uid() = user_id);

-- Add comment for documentation
COMMENT ON TABLE mood_entries IS 'Stores user mood entries with body and mind values';
COMMENT ON COLUMN mood_entries.mood_value IS 'JSONB object containing body and mind mood values (e.g., {"body": 5, "mind": 3})';
