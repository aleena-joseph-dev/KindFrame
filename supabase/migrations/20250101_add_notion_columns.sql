-- Add Notion-specific columns to user_profiles table
-- Note: user_profiles is the main table that references auth.users directly
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS notion_user_id TEXT,
ADD COLUMN IF NOT EXISTS notion_access_token TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';

-- Add index for Notion user ID lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_notion_user_id ON public.user_profiles(notion_user_id);

-- Add unique constraint to prevent duplicate Notion users
ALTER TABLE public.user_profiles 
ADD CONSTRAINT unique_notion_user_id UNIQUE (notion_user_id); 