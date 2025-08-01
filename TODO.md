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

### **Task 4: Google Calendar Integration** ✅ **COMPLETED**
- [x] **Placement**: Calendar Screen (Home → Menu → Calendar)
- [x] **Trigger**: Sync button in top HUD
- [x] **UI**: "Sync" button in top bar
- [x] **Actions**: Direct OAuth initiation on button click
- [x] **OAuth Setup**: Google Calendar API integration
- [x] **Database**: Store calendar sync status and tokens
- [x] **UI Components**: Sync button in TopBar component

### **Task 5: Google Keep/Notes Integration** ✅ **COMPLETED**
- [x] **Placement**: Notes Screen (Home → Menu → Notes)
- [x] **Trigger**: Sync button in top HUD
- [x] **UI**: "Sync" button in top bar
- [x] **Actions**: Direct OAuth initiation on button click
- [x] **OAuth Setup**: Google Keep API integration
- [x] **Database**: Store notes sync status and tokens
- [x] **UI Components**: Sync button in TopBar component

### **Task 6: Implementation Details**
- [ ] **OAuth flow setup** for Google APIs
- [ ] **Database schema updates** for sync status
- [ ] **Edge functions** for OAuth callbacks
- [ ] **Error handling** and retry mechanisms

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
3. ✅ **Task 3 completed** - Welcome message system implemented
4. **Start Task 4**: Google Calendar integration
5. **Start Task 5**: Google Keep/Notes integration
6. Test each implementation
7. Commit and push after each successful task
8. Move to next task only after confirmation

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