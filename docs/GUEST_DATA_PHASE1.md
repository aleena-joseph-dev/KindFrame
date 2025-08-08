# Guest Data Persistence - Phase 1 Implementation

## Overview

Phase 1 implements the foundational components for guest mode data persistence, including database schema updates, local storage management, and global state management.

## Components Implemented

### 1. Database Schema Update

- **File**: `supabase/migrations/20241215000001_modify_mood_entries_table.sql`
- **Purpose**: Simplifies the `mood_entries` table to only include essential fields
- **Changes**:
  - Removes unnecessary columns
  - Keeps only: `id`, `user_id`, `timestamp`, `mood_value` (JSONB with `body` and `mind` fields)
  - Adds proper RLS policies
  - Includes documentation comments

### 2. Database Types Update

- **File**: `lib/supabase.ts`
- **Purpose**: Updates TypeScript types to match the new `mood_entries` schema
- **Changes**:
  - Added `mood_entries` table type definition
  - Includes `Row`, `Insert`, and `Update` types
  - Properly typed `mood_value` as `{ body: number; mind: number }`

### 3. Guest Data Service

- **File**: `services/guestDataService.ts`
- **Purpose**: Manages local storage operations for guest data
- **Features**:
  - **Pending Actions**: Store/replace actions for tasks, notes, events, etc.
  - **Mood Entries**: Accumulate mood changes over time
  - **Mode Selection**: Store the last selected sensory mode
  - **Utility Methods**: Check for unsaved data, clear all data, etc.
- **Storage Strategy**:
  - Most recent attempt for Goals, Kanban tasks, Core Memory, Journal, Notes, Calendar events, Todos
  - All mood changes are accumulated
  - Last updated value of mode selection

### 4. Guest Data Context

- **File**: `contexts/GuestDataContext.tsx`
- **Purpose**: Provides global state management for guest data
- **Features**:
  - **State Management**: Tracks pending actions, mood entries, mode selection
  - **Sync Operations**: Automatically syncs data to database after sign-in
  - **Navigation**: Redirects users to original pages after sign-in
  - **Error Handling**: Silent fallback to cached data on sync failures
- **Integration**:
  - Uses `useAuth` to detect sign-in events
  - Uses `useRouter` for navigation
  - Integrates with Supabase for database operations

### 5. App Layout Integration

- **File**: `app/_layout.tsx`
- **Purpose**: Wraps the app with `GuestDataProvider`
- **Changes**:
  - Added `GuestDataProvider` import
  - Wrapped the app with the provider in the correct position in the provider hierarchy

## Key Features

### Data Persistence

- **Local Storage**: All guest data is stored in `AsyncStorage`
- **Automatic Sync**: Data is automatically synced to database after sign-in
- **Error Recovery**: Failed syncs keep local data for retry

### User Experience

- **Seamless Flow**: Users can continue working as guests and sync later
- **No Data Loss**: All work is preserved locally until sync
- **Automatic Redirect**: Users are taken back to their original page after sign-in

### Error Handling

- **Silent Fallback**: Sync failures don't interrupt user experience
- **Retry Mechanism**: Local data is preserved for future sync attempts
- **Graceful Degradation**: App continues to work even if sync fails

## Usage

### For Guest Users

1. Use the app normally - all data is stored locally
2. When trying to save/create data, the `SaveWorkModal` appears
3. Choose to sign up/sign in or continue as guest
4. After sign-in, data is automatically synced to database

### For Developers

```typescript
import { useGuestData } from "@/contexts/GuestDataContext";

const { savePendingAction, saveMoodEntry, saveModeSelection, hasUnsavedData } =
  useGuestData();
```

## Next Steps (Phase 2)

- Integrate guest data functionality into individual screens
- Implement the save work flow in each feature
- Add loading states during sync
- Test the complete user flow

## Manual Database Migration

Apply the following SQL migration manually in your Supabase dashboard:

```sql
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
```
