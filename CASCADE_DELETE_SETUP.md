# Cascade Delete Setup for User Deletion

## Overview

This setup ensures that when a user is deleted from Supabase Auth (`auth.users`), all their related data is automatically deleted from all tables in your database.

## Current Status

✅ **Your database schema already has the correct setup!**

All tables in `database/main_features_schema.sql` already include:

```sql
user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
```

This means cascade delete is already configured.

## How to Apply the Setup

### Option 1: Apply via Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `database/cascade_delete_setup.sql`
4. Click **Run** to execute the script

### Option 2: Apply via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push
```

### Option 3: Apply via Migration

```bash
# Create a new migration
supabase migration new cascade_delete_setup

# Edit the migration file and paste the SQL content
# Then apply
supabase db push
```

## What the Setup Does

### 1. **Verifies Existing Constraints**

- Checks all tables for proper `user_id` foreign key constraints
- Confirms they have `ON DELETE CASCADE` behavior

### 2. **Ensures Proper Delete Behavior**

- Updates `kanban_cards.assignee_id` to use `ON DELETE SET NULL` (since assignees can be reassigned)
- Updates `todos.parent_todo_id` to use `ON DELETE CASCADE` (since parent todos should be deleted with children)

### 3. **Creates Backup Functions**

- `cleanup_user_data(user_uuid)` - Manual cleanup function as backup
- `test_cascade_delete(user_uuid)` - Test function to verify data exists

### 4. **Provides Verification**

- Shows which tables have proper cascade delete
- Reports any missing or incorrect constraints

## Tables Covered

When a user is deleted, the following data is automatically deleted:

1. **Journal Entries** (`journal_entries`)
2. **Core Memories** (`core_memories`)
3. **Notes** (`notes`)
4. **Kanban Boards** (`kanban_boards`) + their cards (`kanban_cards`)
5. **Calendar Events** (`calendar_events`)
6. **Goals** (`goals`)
7. **Todos** (`todos`)
8. **Mood Entries** (`mood_entries`)
9. **Meditation Sessions** (`meditation_sessions`)
10. **Breathing Sessions** (`breathing_sessions`)
11. **Pomodoro Sessions** (`pomodoro_sessions`)
12. **Music Sessions** (`music_sessions`)

## Testing the Setup

### 1. **Check Current Constraints**

Run this query in Supabase SQL Editor:

```sql
SELECT
    tc.table_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'user_id'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth';
```

### 2. **Test with a Sample User**

```sql
-- Create a test user (if needed)
INSERT INTO auth.users (id, email) VALUES ('test-uuid', 'test@example.com');

-- Add some test data
INSERT INTO public.notes (user_id, title, content) VALUES ('test-uuid', 'Test Note', 'Test content');

-- Test the cleanup function
SELECT cleanup_user_data('test-uuid');
```

### 3. **Verify Cascade Delete**

```sql
-- Count user's data
SELECT test_cascade_delete('test-uuid');

-- Delete the user (this should trigger cascade delete)
DELETE FROM auth.users WHERE id = 'test-uuid';

-- Verify all data is gone
SELECT COUNT(*) FROM public.notes WHERE user_id = 'test-uuid';
-- Should return 0
```

## Important Notes

### ⚠️ **Irreversible Action**

- User deletion is **permanent and irreversible**
- All user data will be **permanently deleted**
- Make sure to backup any important data before testing

### 🔒 **Security**

- The cascade delete happens automatically at the database level
- No application code is needed to handle data cleanup
- Row Level Security (RLS) policies ensure users can only access their own data

### 🛡️ **Backup Function**

- The `cleanup_user_data()` function is provided as a backup
- It can be called manually if needed
- It provides detailed logging of what was deleted

## Troubleshooting

### If Cascade Delete Doesn't Work

1. **Check Foreign Key Constraints**

   ```sql
   SELECT * FROM information_schema.referential_constraints
   WHERE constraint_schema = 'public';
   ```

2. **Verify Table Structure**

   ```sql
   \d+ public.journal_entries
   \d+ public.notes
   -- etc.
   ```

3. **Check for Errors**
   - Look for constraint violations
   - Verify user exists before deletion
   - Check for any triggers that might interfere

### Common Issues

1. **Missing Foreign Key Constraints**

   - Run the setup script to add missing constraints

2. **Wrong Delete Rule**

   - The setup script will fix incorrect delete rules

3. **Permission Issues**
   - Ensure the database user has proper permissions
   - Check RLS policies don't interfere

## Summary

✅ **Your database is already properly configured for cascade delete**
✅ **All user data will be automatically deleted when a user is removed**
✅ **No additional application code is needed**
✅ **The setup script provides verification and backup functions**

The cascade delete functionality is built into your database schema and will work automatically when users are deleted from Supabase Auth.
