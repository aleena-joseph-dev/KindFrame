-- Add quickJot field to user_profiles table
ALTER TABLE user_profiles 
ADD COLUMN quick_jot BOOLEAN DEFAULT FALSE;

-- Add comment for documentation
COMMENT ON COLUMN user_profiles.quick_jot IS 'Tracks whether user has created a task using Quick Jot feature';
