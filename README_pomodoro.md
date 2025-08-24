# KindFrame Pomodoro System

## Overview

The KindFrame Pomodoro System is a professional-grade productivity timer that integrates seamlessly with the app's existing task management system. It provides a focused, distraction-free environment for deep work sessions with intelligent break management.

## Features

### 🎯 Core Timer Functionality

- **Three Timer Modes**: Focus (Pomodoro), Short Break, Long Break
- **Smart Auto-advancement**: Automatically switches between modes based on user preferences
- **Background-safe Timing**: Accurate timing even when the app is in the background
- **Session Persistence**: Saves and restores timer state across app sessions

### 🔗 Task Integration

- **Create New Items**: Add tasks, todos, or events directly from the Pomodoro screen
- **Link Existing Items**: Connect existing todos, goals, or calendar events to focus sessions
- **Progress Tracking**: Visual indicators showing completed vs. estimated pomodoros
- **Active Focus**: Only one task can be actively focused on at a time

### ⚙️ Customizable Settings

- **Timer Durations**: Customize focus, short break, and long break lengths
- **Auto-start Options**: Automatically start breaks or pomodoros
- **Long Break Intervals**: Set how many focus sessions before a long break
- **Sound Preferences**: Choose alarm sounds and volumes
- **Theme Options**: 12/24 hour format, dark mode when running
- **Notification Settings**: Reminder notifications before session end

### 📱 User Experience

- **Modern UI**: Clean, intuitive interface following KindFrame's design system
- **Responsive Design**: Adapts to different screen sizes and orientations
- **Accessibility**: Proper ARIA roles and screen reader support
- **Cross-platform**: Works on both web and native platforms

## Architecture

### Components Structure

```
components/pomodoro/
├── ModeTabs.tsx          # Timer mode selection (Focus/Short Break/Long Break)
├── TimerCard.tsx         # Main timer display and controls
├── TasksPanel.tsx        # Task list and management
├── AddOrLinkItemSheet.tsx # Bottom sheet for adding/linking items
└── SettingsModal.tsx     # Settings configuration modal

components/common/
└── Chip.tsx              # Reusable pill component for UI elements

hooks/
└── usePomodoroTimer.ts   # Timer state machine and logic

lib/pomodoro/
├── types.ts              # TypeScript type definitions
├── format.ts             # Time formatting utilities
└── storage.ts            # Supabase database operations
```

### Data Flow

1. **Timer State**: Managed by `usePomodoroTimer` hook with state machine
2. **Settings**: Stored in Supabase `pomodoro_settings` table
3. **Sessions**: Logged to `pomodoro_sessions` table with linked item references
4. **Tasks**: Integrated with existing `todos`, `goals`, and `calendar_events` tables

## Database Schema

### pomodoro_settings

```sql
CREATE TABLE pomodoro_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pomo_min INTEGER NOT NULL DEFAULT 25,
  short_break_min INTEGER NOT NULL DEFAULT 5,
  long_break_min INTEGER NOT NULL DEFAULT 15,
  long_break_interval INTEGER NOT NULL DEFAULT 4,
  auto_start_breaks BOOLEAN NOT NULL DEFAULT false,
  auto_start_pomodoros BOOLEAN NOT NULL DEFAULT false,
  hour_format TEXT NOT NULL DEFAULT '24h',
  alarm_sound TEXT,
  alarm_volume INTEGER NOT NULL DEFAULT 50,
  tick_sound TEXT,
  tick_volume INTEGER NOT NULL DEFAULT 0,
  dark_mode_when_running BOOLEAN NOT NULL DEFAULT false,
  compact_window BOOLEAN NOT NULL DEFAULT false,
  reminder_before_min INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### pomodoro_sessions

```sql
CREATE TABLE pomodoro_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  linked_type TEXT CHECK (linked_type IN ('task','todo','event')),
  linked_id UUID,
  mode TEXT NOT NULL CHECK (mode IN ('focus','short_break','long_break')),
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER,
  was_skipped BOOLEAN NOT NULL DEFAULT false,
  est_pomos_at_start INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

## Usage

### Starting a Focus Session

1. Navigate to the Pomodoro tab
2. Select "Focus" mode (default)
3. Optionally link an existing task or create a new one
4. Press "START" to begin the timer
5. Focus on your work until the timer completes

### Managing Tasks

- **Add New**: Tap "＋ Add or Link" → "Create New" tab
- **Link Existing**: Tap "＋ Add or Link" → "Link Existing" tab
- **Set Active**: Tap on a task to make it your current focus
- **Track Progress**: See completed vs. estimated pomodoros for each task

### Customizing Settings

1. Tap the settings icon (gear) in the top-right corner
2. Adjust timer durations, auto-start preferences, sounds, and themes
3. Changes are automatically saved to your profile

## Technical Implementation

### Timer Hook (`usePomodoroTimer`)

- **State Machine**: idle → running → paused → completed
- **Background Safety**: Uses `AppState` to handle foreground/background transitions
- **Persistent State**: Saves timer state to AsyncStorage for session restoration
- **Auto-advancement**: Intelligently switches modes based on completion and settings

### Storage Layer

- **Supabase Integration**: Direct database operations with RLS policies
- **Offline Queue**: Sessions are queued if network is unavailable
- **Caching**: Settings and recent sessions cached locally for performance
- **Error Handling**: Graceful fallbacks and user feedback

### Component Architecture

- **Modular Design**: Each component has a single responsibility
- **Props Interface**: Clean, typed interfaces for component communication
- **Theme Integration**: Uses KindFrame's sensory theme system
- **Responsive Layout**: Flexbox-based layouts that adapt to content

## Testing

### Manual Testing Checklist

- [ ] Timer starts, pauses, resumes, and stops correctly
- [ ] Mode switching works (Focus ↔ Short Break ↔ Long Break)
- [ ] Auto-advancement follows user preferences
- [ ] Background timing remains accurate
- [ ] Task creation and linking functions properly
- [ ] Settings are saved and restored correctly
- [ ] Offline functionality works as expected

### Automated Testing

- Timer state transitions
- Settings persistence
- Database operations
- Component rendering
- User interactions

## Performance Considerations

### Optimization Strategies

- **Debounced Settings**: 300ms debounce on setting changes to reduce database writes
- **Lazy Loading**: Components load only when needed
- **Efficient Re-renders**: Timer updates only affect countdown display
- **Background Processing**: Offline queue processing happens in background

### Memory Management

- **Cleanup**: Timer intervals properly cleared on unmount
- **State Persistence**: Minimal data stored in memory, rest in AsyncStorage
- **Component Lifecycle**: Proper cleanup of subscriptions and timers

## Future Enhancements

### Planned Features

- **Sound System**: Local audio files for alarms and ticking
- **Notification System**: Push notifications for session completion
- **Statistics Dashboard**: Detailed productivity analytics
- **Team Features**: Shared pomodoro sessions and team productivity tracking
- **Integration APIs**: Webhook support for external service integration

### Technical Improvements

- **Web Workers**: Move timer logic to web workers for better performance
- **Service Workers**: Offline-first approach with service worker caching
- **Real-time Updates**: WebSocket integration for live collaboration
- **Advanced Analytics**: Machine learning insights for productivity optimization

## Troubleshooting

### Common Issues

1. **Timer Drift**: Ensure app stays in foreground or check background app refresh settings
2. **Settings Not Saving**: Verify internet connection and Supabase authentication
3. **Tasks Not Linking**: Check that items exist in the respective tables
4. **Sound Not Playing**: Verify device volume and notification permissions

### Debug Information

- Timer state logged to console
- Database operations logged with error details
- Component lifecycle events tracked
- Performance metrics available in development mode

## Contributing

### Development Setup

1. Install dependencies: `npm install`
2. Set up Supabase project and environment variables
3. Run database migrations: `npm run db:migrate`
4. Start development server: `npm start`

### Code Standards

- **TypeScript**: Strict mode enabled, all types properly defined
- **ESLint**: Follow project linting rules
- **Component Structure**: Follow established patterns for new components
- **Testing**: Write tests for new functionality
- **Documentation**: Update README for significant changes

### Pull Request Process

1. Create feature branch from `main`
2. Implement changes with proper testing
3. Update documentation as needed
4. Submit PR with clear description of changes
5. Address review feedback
6. Merge after approval and CI passing

## License

This pomodoro system is part of the KindFrame project and follows the same licensing terms.
