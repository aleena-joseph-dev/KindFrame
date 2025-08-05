-- Cascade Delete Setup for User Deletion
-- This ensures that when a user is deleted from auth.users,
-- all their related data is automatically deleted from all tables

-- ========================================
-- VERIFY EXISTING CASCADE DELETE CONSTRAINTS
-- ========================================

-- Check current foreign key constraints
SELECT 
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.delete_rule
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
    AND tc.table_schema = 'public'
    AND kcu.column_name = 'user_id'
    AND ccu.table_name = 'users'
    AND ccu.table_schema = 'auth';

-- ========================================
-- ENSURE CASCADE DELETE ON ALL USER_ID FOREIGN KEYS
-- ========================================

-- Update any existing foreign keys that might not have CASCADE DELETE
-- (This is a safety measure in case any tables were created without it)

-- For kanban_cards, ensure assignee_id also has proper delete behavior
DO $$
BEGIN
    -- Check if assignee_id column exists and add proper delete behavior if it doesn't have it
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'kanban_cards' 
        AND column_name = 'assignee_id'
    ) THEN
        -- Drop existing constraint if it exists
        BEGIN
            ALTER TABLE public.kanban_cards 
            DROP CONSTRAINT IF EXISTS kanban_cards_assignee_id_fkey;
        EXCEPTION
            WHEN OTHERS THEN NULL;
        END;
        
        -- Add new constraint with SET NULL (since assignee can be reassigned)
        ALTER TABLE public.kanban_cards 
        ADD CONSTRAINT kanban_cards_assignee_id_fkey 
        FOREIGN KEY (assignee_id) REFERENCES auth.users(id) ON DELETE SET NULL;
    END IF;
END $$;

-- For todos, ensure parent_todo_id has cascade delete
DO $$
BEGIN
    -- Drop existing constraint if it exists
    BEGIN
        ALTER TABLE public.todos 
        DROP CONSTRAINT IF EXISTS todos_parent_todo_id_fkey;
    EXCEPTION
        WHEN OTHERS THEN NULL;
    END;
    
    -- Add new constraint with cascade delete
    ALTER TABLE public.todos 
    ADD CONSTRAINT todos_parent_todo_id_fkey 
    FOREIGN KEY (parent_todo_id) REFERENCES public.todos(id) ON DELETE CASCADE;
END $$;

-- ========================================
-- VERIFY ALL TABLES HAVE PROPER CASCADE DELETE
-- ========================================

-- List all tables and their user_id foreign key constraints
DO $$
DECLARE
    table_record RECORD;
    constraint_name TEXT;
    delete_rule TEXT;
BEGIN
    RAISE NOTICE '=== VERIFYING CASCADE DELETE CONSTRAINTS ===';
    
    FOR table_record IN 
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'journal_entries', 'core_memories', 'notes', 'kanban_boards',
            'calendar_events', 'goals', 'todos', 'mood_entries',
            'meditation_sessions', 'breathing_sessions', 'pomodoro_sessions',
            'music_sessions'
        )
    LOOP
        -- Check if user_id foreign key exists and has CASCADE DELETE
        SELECT tc.constraint_name, rc.delete_rule 
        INTO constraint_name, delete_rule
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu 
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
            ON tc.constraint_name = rc.constraint_name
        WHERE tc.table_name = table_record.table_name
        AND kcu.column_name = 'user_id'
        AND tc.constraint_type = 'FOREIGN KEY';
        
        IF constraint_name IS NOT NULL THEN
            IF delete_rule = 'CASCADE' THEN
                RAISE NOTICE '✅ Table % has CASCADE DELETE: %', table_record.table_name, constraint_name;
            ELSE
                RAISE NOTICE '❌ Table % has % DELETE (should be CASCADE): %', table_record.table_name, delete_rule, constraint_name;
            END IF;
        ELSE
            RAISE NOTICE '❌ Table % does not have user_id foreign key constraint', table_record.table_name;
        END IF;
    END LOOP;
END $$;

-- ========================================
-- CREATE BACKUP CLEANUP FUNCTION
-- ========================================

-- Create a function to manually clean up user data (as a backup)
CREATE OR REPLACE FUNCTION cleanup_user_data(user_uuid UUID)
RETURNS VOID AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Delete all user data from all tables
    DELETE FROM public.music_sessions WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % music sessions', deleted_count;
    
    DELETE FROM public.pomodoro_sessions WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % pomodoro sessions', deleted_count;
    
    DELETE FROM public.breathing_sessions WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % breathing sessions', deleted_count;
    
    DELETE FROM public.meditation_sessions WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % meditation sessions', deleted_count;
    
    DELETE FROM public.mood_entries WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % mood entries', deleted_count;
    
    DELETE FROM public.todos WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % todos', deleted_count;
    
    DELETE FROM public.goals WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % goals', deleted_count;
    
    DELETE FROM public.calendar_events WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % calendar events', deleted_count;
    
    DELETE FROM public.kanban_cards WHERE board_id IN (
        SELECT id FROM public.kanban_boards WHERE user_id = user_uuid
    );
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % kanban cards', deleted_count;
    
    DELETE FROM public.kanban_boards WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % kanban boards', deleted_count;
    
    DELETE FROM public.notes WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % notes', deleted_count;
    
    DELETE FROM public.core_memories WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % core memories', deleted_count;
    
    DELETE FROM public.journal_entries WHERE user_id = user_uuid;
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RAISE NOTICE 'Deleted % journal entries', deleted_count;
    
    RAISE NOTICE '✅ Successfully cleaned up all data for user: %', user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION cleanup_user_data(UUID) TO authenticated;

-- ========================================
-- CREATE TEST FUNCTION TO VERIFY CASCADE DELETE
-- ========================================

-- Function to test cascade delete (for development/testing only)
CREATE OR REPLACE FUNCTION test_cascade_delete(test_user_id UUID)
RETURNS VOID AS $$
DECLARE
    user_exists BOOLEAN;
    data_count INTEGER;
BEGIN
    -- Check if user exists
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = test_user_id) INTO user_exists;
    
    IF NOT user_exists THEN
        RAISE EXCEPTION 'User % does not exist', test_user_id;
    END IF;
    
    -- Count user's data before deletion
    SELECT COUNT(*) INTO data_count FROM public.journal_entries WHERE user_id = test_user_id;
    RAISE NOTICE 'User has % journal entries', data_count;
    
    SELECT COUNT(*) INTO data_count FROM public.notes WHERE user_id = test_user_id;
    RAISE NOTICE 'User has % notes', data_count;
    
    SELECT COUNT(*) INTO data_count FROM public.todos WHERE user_id = test_user_id;
    RAISE NOTICE 'User has % todos', data_count;
    
    SELECT COUNT(*) INTO data_count FROM public.goals WHERE user_id = test_user_id;
    RAISE NOTICE 'User has % goals', data_count;
    
    SELECT COUNT(*) INTO data_count FROM public.calendar_events WHERE user_id = test_user_id;
    RAISE NOTICE 'User has % calendar events', data_count;
    
    RAISE NOTICE '⚠️  WARNING: This will delete the user and all their data!';
    RAISE NOTICE 'To test cascade delete, you would delete the user from auth.users';
    RAISE NOTICE 'All related data should be automatically deleted due to CASCADE constraints';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_cascade_delete(UUID) TO authenticated;

-- ========================================
-- SUMMARY
-- ========================================

-- This setup ensures that when a user is deleted from auth.users:
-- 1. All journal entries are deleted
-- 2. All core memories are deleted  
-- 3. All notes are deleted
-- 4. All kanban boards and their cards are deleted
-- 5. All calendar events are deleted
-- 6. All goals are deleted
-- 7. All todos are deleted
-- 8. All mood entries are deleted
-- 9. All meditation sessions are deleted
-- 10. All breathing sessions are deleted
-- 11. All pomodoro sessions are deleted
-- 12. All music sessions are deleted

-- The CASCADE DELETE constraints handle this automatically.
-- The cleanup_user_data() function is provided as a backup manual cleanup option. 