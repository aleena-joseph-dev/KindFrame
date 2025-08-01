-- Add Notion-specific columns to users table
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS notion_user_id TEXT,
ADD COLUMN IF NOT EXISTS notion_access_token TEXT,
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'email';

-- Add index for Notion user ID lookups
CREATE INDEX IF NOT EXISTS idx_users_notion_user_id ON public.users(notion_user_id);

-- Add unique constraint to prevent duplicate Notion users
ALTER TABLE public.users 
ADD CONSTRAINT unique_notion_user_id UNIQUE (notion_user_id); 