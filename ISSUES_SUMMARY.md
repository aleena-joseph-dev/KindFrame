# KindFrame App - Critical Issues Summary

## Overview

The app has persistent database and data flow issues that prevent proper nickname storage and mode selection. Multiple attempts to fix individual symptoms have failed because the underlying database operations are fundamentally broken.

## Critical Issues

### 1. Database Profile Creation/Update Failures

**Error**: `PGRST116` - "The result contains 0 rows"
**Impact**: User profiles are not being created or updated in the database
**Evidence**: Console logs show "Supabase update error: {code: 'PGRST116', details: 'The result contains 0 rows'}"
**Location**: `services/authService.ts` - `updateUserProfile` method

### 2. Wrong Nickname Display

**Problem**: Welcome message shows "Aleena Joseph" instead of user-input "Aleena"
**Expected**: "hey Aleena, welcome to kindframe"
**Current**: Shows email-derived name instead of popup input
**Evidence**: Console log "Using nickname for welcome message: Aleena Joseph"
**Location**: `app/(tabs)/index.tsx` - `loadUserDataAndDetectVisit` function

### 3. Mode Selection Auto-Reverting

**Problem**: Selected mode (e.g., "relax") automatically changes back to "Normal"
**Evidence**: Console shows "mode: 'normal'" being saved instead of selected mode
**Impact**: UI and dropdown revert to default mode after selection
**Location**: Mode selection logic in onboarding flow

### 4. Foreign Key Constraint Errors

**Error**: `23503` - "Key (user_id)=... is not present in table 'users'"
**Impact**: Database operations fail due to missing user records
**Evidence**: Previous error logs showed foreign key violations

### 5. Email NOT NULL Constraint Errors

**Error**: `23502` - "null value in column 'email' violates not-null constraint"
**Impact**: Profile creation fails when email is not provided
**Evidence**: Database schema requires email but it's not being passed correctly

## Technical Details

### Database Schema Issues

- `user_profiles` table references `auth.users` but user creation/update flow is broken
- Email field is NOT NULL but not being provided during profile creation
- Foreign key constraints failing due to missing user records

### Data Flow Problems

1. **Onboarding Flow**: Nickname from popup not being saved to database
2. **Profile Creation**: `AuthService.updateUserProfile` fails to create profiles
3. **Data Retrieval**: `getCurrentUser` not returning updated profile data
4. **Mode Persistence**: Selected mode not being saved or retrieved correctly

### Code Locations

- **Database Operations**: `services/authService.ts` lines 639-760
- **Nickname Logic**: `app/(tabs)/index.tsx` lines 100-140
- **Mode Selection**: `app/(tabs)/index.tsx` lines 446-460
- **Onboarding**: `app/(tabs)/index.tsx` lines 459-520

## Required Fixes

### 1. Database Schema & Operations

- Fix user profile creation in `AuthService.updateUserProfile`
- Ensure email is properly passed during profile creation
- Fix foreign key constraint issues
- Verify database schema matches code expectations

### 2. Nickname Storage & Retrieval

- Ensure nickname from popup is saved to `user_profiles.settings.nickname`
- Fix nickname retrieval to prioritize user input over email data
- Verify welcome message uses correct nickname source

### 3. Mode Selection Persistence

- Fix mode saving during onboarding completion
- Ensure selected mode persists in database
- Fix mode retrieval and application to UI

### 4. Data Flow Verification

- Verify `getCurrentUser` returns updated profile data
- Ensure profile updates actually persist to database
- Fix timing issues between profile creation and updates

## Testing Requirements

1. **Nickname Test**: Type "Aleena" in popup → should show "hey Aleena, welcome to kindframe"
2. **Mode Test**: Select "relax" mode → should stay selected, not revert to "Normal"
3. **Database Test**: Verify profile creation and updates work without errors
4. **Persistence Test**: Restart app → nickname and mode should persist

## Console Logs to Monitor

- "Using nickname for welcome message: [should be user input]"
- "Selected mode: [should match user selection]"
- "User profile created/updated successfully"
- No `PGRST116`, `23502`, or `23503` errors

## Priority Order

1. **Fix database profile creation** (root cause)
2. **Fix nickname storage/retrieval**
3. **Fix mode selection persistence**
4. **Test and verify all flows**

## Notes for Developer

- The current approach of fixing individual symptoms has failed
- Need to address the root database issues first
- Consider database reset if schema issues persist
- Focus on making database operations work before UI fixes
