# TODO List - User Onboarding & Welcome Messages

## 🎯 **Current Sprint: User Experience Enhancement**

### **Task 1: Email to Name Extraction & Onboarding** ✅ **COMPLETED**

- [x] **Extract name from email** on login
- [x] **Show in onboarding popup** as editable name field
- [x] **Store as nickname** in users table on continue/skip
- [x] **Reference as username** throughout the app

### **Task 2: User Visit Type Detection** ✅ **COMPLETED**

- [x] **Implement visit type logic**:
  - First-time ever (no account data)
  - Returning after long gap (>7 days)
  - Regular frequent use
- [x] **Add user data flags** for tracking
- [x] **Store last-login timestamp**

### **Task 3: Welcome Message System** 🔄 **IN PROGRESS**

- [x] **First-time users**: "Welcome to KindFrame!" or "Hey, [name], let's explore KindFrame"
- [x] **Returning users**: "Welcome back [name]!" (minimal)
- [x] **Regular users**: Minimal or no greeting
- [x] **Position**: Below search bar, above today's focus
- [x] **Auto-dismiss**: After session 1 in a day

### **Task 4: Neurodivergent-Friendly Design**

- [ ] **Subtle welcome messages** (avoid overwhelming)
- [ ] **Concise, low-key greetings**
- [ ] **Minimal text for returning/regular users**
- [ ] **Single-line greetings** where appropriate

### **Task 5: Implementation Details**

- [ ] **Home screen controller** logic
- [ ] **User data loading** after authentication
- [ ] **Session tracking** for auto-dismiss
- [ ] **Database schema updates** for nickname field

---

## 📋 **Completed Tasks**

- ✅ Notion OAuth integration with Edge Functions
- ✅ User authentication flow
- ✅ Database setup and migrations
- ✅ **Task 1: Email to Name Extraction & Onboarding**
- ✅ **Task 2: User Visit Type Detection**

---

## 🔄 **Next Steps**

1. ✅ **Task 1 completed** - Email name extraction working
2. ✅ **Task 2 completed** - Visit type detection implemented
3. **Start Task 3**: Welcome message system (partially done)
4. Test each implementation
5. Commit and push after each successful task
6. Move to next task only after confirmation

## 📝 **Task 2 Implementation Details**

- ✅ Created `utils/visitTypeDetector.ts` with visit detection logic
- ✅ Added visit tracking with timestamps and visit counts
- ✅ Implemented welcome message generation based on visit type
- ✅ Added session-based welcome message display (once per day)
- ✅ Integrated visit detection into home screen lifecycle
- ✅ Added database updates for visit tracking
- ✅ Positioned welcome message below search bar, above focus card

## 📝 **Task 1 Implementation Details**

- ✅ Created `utils/nameExtractor.ts` with email parsing logic
- ✅ Updated `AuthService.signUp()` and `AuthService.signIn()` to extract nicknames
- ✅ Modified `NicknamePopup` to load extracted nickname from AsyncStorage
- ✅ Updated home screen to store nickname in database during onboarding
- ✅ Added proper error handling and fallbacks

## Google Calendar OAuth Integration

### Step 1: Use supabase.auth.signInWithOAuth with Calendar scopes

- [x] Update calendar screen to use `supabase.auth.signInWithOAuth` with calendar scopes
- [x] Add `redirectTo: window.location.origin + '/auth-callback'` parameter
- [x] Remove AuthService dependency and use direct Supabase OAuth
- [ ] Test OAuth flow from calendar page

### Step 2: Handle /auth-callback properly

- [x] Update auth callback to handle calendar OAuth redirects
- [x] Ensure session.provider_token is available after OAuth
- [x] Redirect back to calendar page after successful OAuth

### Step 3: Handle existing session + new token

- [x] Update calendar screen to use session.provider_token
- [x] Fetch Google Calendar events using provider_token
- [x] Update UI to show connected status
- [ ] Handle token refresh if needed

### UI Flow Implementation

- [x] User clicks "Connect Google Calendar" button in calendar tab
- [x] Call supabase.auth.signInWithOAuth with calendar scope
- [x] User completes Google OAuth
- [x] Auth-callback page loads and session is updated
- [x] Use session.provider_token to access calendar events
- [ ] Display calendar events in the main app

## Current Status

- ✅ Step 1: Completed - Implemented proper Supabase OAuth pattern
- ✅ Step 2: Completed - Updated auth callback to handle calendar redirects
- ✅ Step 3: Completed - Updated calendar screen to use session.provider_token
- 🔄 Ready for testing: Test the complete OAuth flow from calendar page
