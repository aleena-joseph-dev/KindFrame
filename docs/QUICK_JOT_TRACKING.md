# Quick Jot Tracking Feature

## Overview

This feature tracks when users create tasks using the Quick Jot functionality. It adds a `quick_jot` field to the `user_profiles` table to track whether a user has used Quick Jot to create tasks.

## Database Changes

### Migration File

- **File**: `supabase/migrations/20241215000000_add_quick_jot_field_to_user_profiles.sql`
- **Changes**: Adds `quick_jot` BOOLEAN field with DEFAULT FALSE

```sql
ALTER TABLE user_profiles
ADD COLUMN quick_jot BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN user_profiles.quick_jot IS 'Tracks whether user has created a task using Quick Jot feature';
```

### TypeScript Types

Updated `lib/supabase.ts` to include the new field in the database types.

## Implementation

### QuickJotService

- **File**: `services/quickJotService.ts`
- **Purpose**: Handles all Quick Jot tracking functionality

#### Methods:

1. **`markQuickJotUsed()`**: Sets `quick_jot` to `true` for authenticated users
2. **`hasUsedQuickJot()`**: Checks if user has used Quick Jot before
3. **`resetQuickJotStatus()`**: Resets `quick_jot` to `false` (for testing)

### Integration Points

The tracking is integrated into the following functions:

1. **Quick Jot Screen** (`app/(tabs)/quick-jot.tsx`):

   - `handleSaveAsType()`: When saving any type of entry
   - `handleSaveSubtasksAsTodos()`: When saving AI-generated subtasks as todos
   - `handleSaveAllSubtasks()`: When saving all subtasks as a specific type

2. **Todo Review Screen** (`app/(tabs)/todo-review.tsx`):
   - `saveTasksToTodoDatabase()`: When saving tasks to the todo database

## Guest User Handling

- **Guest users**: Always return `false` for `hasUsedQuickJot()` since they don't have user profiles
- **Tracking**: `markQuickJotUsed()` returns success for guest users (no error, just skips the update)
- **Behavior**: Guest users can use Quick Jot normally, but their usage isn't tracked

## Usage Examples

### Check if user has used Quick Jot

```typescript
import { QuickJotService } from "@/services/quickJotService";

const hasUsed = await QuickJotService.hasUsedQuickJot();
console.log("User has used Quick Jot:", hasUsed);
```

### Mark Quick Jot as used

```typescript
const result = await QuickJotService.markQuickJotUsed();
if (result.success) {
  console.log("Quick Jot usage tracked successfully");
} else {
  console.error("Failed to track usage:", result.error);
}
```

### Reset for testing

```typescript
const result = await QuickJotService.resetQuickJotStatus();
if (result.success) {
  console.log("Quick Jot status reset successfully");
}
```

## Testing

### Manual Testing Steps

1. **Apply the migration** to your Supabase database
2. **Create a new user** or use an existing one
3. **Use Quick Jot** to create any type of entry
4. **Check the database** to verify `quick_jot` is set to `true`
5. **Test guest mode** to ensure it works without errors

### Database Verification

```sql
-- Check if a user has used Quick Jot
SELECT user_id, email, quick_jot
FROM user_profiles
WHERE user_id = 'your-user-id';

-- Check all users who have used Quick Jot
SELECT user_id, email, quick_jot
FROM user_profiles
WHERE quick_jot = true;
```

## Notes

- The field defaults to `false` for all existing users
- Guest users are handled gracefully (no errors, just no tracking)
- All Quick Jot usage is tracked regardless of the entry type (note, todo, task, etc.)
- The tracking happens automatically when users save entries through the Quick Jot interface
