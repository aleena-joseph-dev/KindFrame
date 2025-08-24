// Pomodoro Timer Hook
// This hook manages the timer state machine and provides background-safe timing

import { minutesToSeconds } from '@/lib/pomodoro/format';
import { PomodoroSessionsStorage } from '@/lib/pomodoro/storage';
import { PomodoroMode, PomodoroSettings, PomodoroState, TimerState } from '@/lib/pomodoro/types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

const STORAGE_KEYS = {
  TIMER_STATE: 'pomodoro:timer_state',
  FOCUS_COUNT: 'pomodoro:focus_count',
} as const;

interface UsePomodoroTimerProps {
  settings: PomodoroSettings;
  onSessionComplete?: (mode: PomodoroMode, duration: number) => void;
  onModeChange?: (mode: PomodoroMode) => void;
}

export function usePomodoroTimer({ 
  settings, 
  onSessionComplete, 
  onModeChange 
}: UsePomodoroTimerProps) {
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>({
    mode: 'focus',
    state: 'idle',
    timeLeft: minutesToSeconds(settings.pomo_min),
    totalTime: minutesToSeconds(settings.pomo_min),
    focusCount: 0,
    startedAt: undefined,
    pausedAt: undefined,
    pausedOffset: 0,
  });

  // Active linked item
  const [linkedItem, setLinkedItem] = useState<{ type: 'task' | 'todo' | 'event'; id: string; title: string | null; estPomos?: number } | null>(null);

  // Refs for background-safe timing
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  const backgroundStartTimeRef = useRef<number>(Date.now());
  const backgroundPausedOffsetRef = useRef<number>(0);

  // Load saved state on mount
  useEffect(() => {
    loadSavedState();
  }, []);

  // Save state when it changes
  useEffect(() => {
    saveTimerState();
  }, [timerState]);

  // Update timer state when settings change
  useEffect(() => {
    if (timerState.state === 'idle') {
      setTimerState(prev => ({
        ...prev,
        timeLeft: minutesToSeconds(settings.pomo_min),
        totalTime: minutesToSeconds(settings.pomo_min),
      }));
    }
  }, [settings.pomo_min, settings.short_break_min, settings.long_break_min, timerState.state]);

  // Handle app state changes (foreground/background)
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground
        handleAppForeground();
      } else if (nextAppState.match(/inactive|background/)) {
        // App went to background
        handleAppBackground();
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
  }, [timerState.state]);

  // Timer interval effect
  useEffect(() => {
    if (timerState.state === 'running') {
      intervalRef.current = setInterval(() => {
        updateTimer();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState.state]);

  // Load saved timer state
  const loadSavedState = async () => {
    try {
      const savedState = await AsyncStorage.getItem(STORAGE_KEYS.TIMER_STATE);
      const savedFocusCount = await AsyncStorage.getItem(STORAGE_KEYS.FOCUS_COUNT);
      
      if (savedState) {
        const parsed = JSON.parse(savedState);
        // Only restore if the session was started today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const savedDate = new Date(parsed.startedAt || 0);
        savedDate.setHours(0, 0, 0, 0);
        
        if (savedDate.getTime() === today.getTime()) {
          setTimerState(prev => ({
            ...prev,
            ...parsed,
            startedAt: parsed.startedAt ? new Date(parsed.startedAt) : undefined,
            pausedAt: parsed.pausedAt ? new Date(parsed.pausedAt) : undefined,
          }));
        }
      }
      
      if (savedFocusCount) {
        setTimerState(prev => ({
          ...prev,
          focusCount: parseInt(savedFocusCount, 10),
        }));
      }
    } catch (error) {
      console.error('Error loading saved timer state:', error);
    }
  };

  // Save timer state
  const saveTimerState = async () => {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.TIMER_STATE, JSON.stringify({
        mode: timerState.mode,
        state: timerState.state,
        timeLeft: timerState.timeLeft,
        totalTime: timerState.totalTime,
        focusCount: timerState.focusCount,
        startedAt: timerState.startedAt?.toISOString(),
        pausedAt: timerState.pausedAt?.toISOString(),
        pausedOffset: timerState.pausedOffset,
      }));
      
      await AsyncStorage.setItem(STORAGE_KEYS.FOCUS_COUNT, timerState.focusCount.toString());
    } catch (error) {
      console.error('Error saving timer state:', error);
    }
  };

  // Handle app going to background
  const handleAppBackground = () => {
    if (timerState.state === 'running') {
      backgroundStartTimeRef.current = Date.now();
      backgroundPausedOffsetRef.current = timerState.pausedOffset;
    }
  };

  // Handle app coming to foreground
  const handleAppForeground = () => {
    if (timerState.state === 'running' && timerState.startedAt) {
      const now = Date.now();
      const backgroundTime = now - backgroundStartTimeRef.current;
      const newPausedOffset = backgroundPausedOffsetRef.current + backgroundTime;
      
      setTimerState(prev => ({
        ...prev,
        pausedOffset: newPausedOffset,
      }));
    }
  };

  // Update timer countdown
  const updateTimer = () => {
    setTimerState(prev => {
      if (prev.state !== 'running' || !prev.startedAt) return prev;

      const now = Date.now();
      const elapsed = Math.floor((now - prev.startedAt.getTime() - prev.pausedOffset) / 1000);
      const newTimeLeft = Math.max(0, prev.totalTime - elapsed);

      if (newTimeLeft <= 0) {
        // Timer completed
        handleTimerComplete(prev.mode, prev.totalTime);
        return {
          ...prev,
          timeLeft: 0,
          state: 'completed' as PomodoroState,
        };
      }

      return {
        ...prev,
        timeLeft: newTimeLeft,
      };
    });
  };

  // Handle timer completion
  const handleTimerComplete = async (mode: PomodoroMode, duration: number) => {
    try {
      // Save session to database
      const sessionDraft = {
        mode,
        started_at: timerState.startedAt?.toISOString() || new Date().toISOString(),
        ended_at: new Date().toISOString(),
        duration_sec: duration,
        was_skipped: false,
        linked_type: linkedItem?.type,
        linked_id: linkedItem?.id,
        est_pomos_at_start: linkedItem?.estPomos,
        client_id: `${Date.now()}-${Math.random()}`,
      };

      await PomodoroSessionsStorage.saveSession(sessionDraft);

      // Call completion callback
      onSessionComplete?.(mode, duration);

      // Auto-advance to next mode
      if (mode === 'focus') {
        const newFocusCount = timerState.focusCount + 1;
        const shouldTakeLongBreak = newFocusCount % settings.long_break_interval === 0;
        const nextMode: PomodoroMode = shouldTakeLongBreak ? 'long_break' : 'short_break';
        
        if (settings.auto_start_breaks) {
          changeMode(nextMode);
          start();
        } else {
          changeMode(nextMode);
        }
      } else if (settings.auto_start_pomodoros) {
        changeMode('focus');
        start();
      } else {
        changeMode('focus');
      }
    } catch (error) {
      console.error('Error handling timer completion:', error);
    }
  };

  // Start timer
  const start = useCallback(() => {
    console.log('usePomodoroTimer: start called, current state:', timerState.state);
    if (timerState.state === 'idle') {
      const now = new Date();
      console.log('usePomodoroTimer: starting timer from idle state');
      setTimerState(prev => ({
        ...prev,
        state: 'running',
        startedAt: now,
        pausedAt: undefined,
        pausedOffset: 0,
      }));
    } else if (timerState.state === 'paused') {
      const now = new Date();
      const pauseDuration = now.getTime() - (timerState.pausedAt?.getTime() || 0);
      console.log('usePomodoroTimer: resuming timer from paused state');
      setTimerState(prev => ({
        ...prev,
        state: 'running',
        pausedAt: undefined,
        pausedOffset: prev.pausedOffset + pauseDuration,
      }));
    }
  }, [timerState.state, timerState.pausedAt]);

  // Pause timer
  const pause = useCallback(() => {
    console.log('usePomodoroTimer: pause called, current state:', timerState.state);
    if (timerState.state === 'running') {
      const now = new Date();
      console.log('usePomodoroTimer: pausing timer');
      setTimerState(prev => ({
        ...prev,
        state: 'paused',
        pausedAt: now,
      }));
    }
  }, [timerState.state]);

  // Resume timer
  const resume = useCallback(() => {
    console.log('usePomodoroTimer: resume called, current state:', timerState.state);
    if (timerState.state === 'paused') {
      start();
    }
  }, [timerState.state, start]);

  // Stop timer
  const stop = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      state: 'idle',
      timeLeft: prev.totalTime,
      startedAt: undefined,
      pausedAt: undefined,
      pausedOffset: 0,
    }));
  }, []);

  // Skip current session
  const skip = useCallback(async () => {
    if (timerState.state === 'running' || timerState.state === 'paused') {
      try {
        // Save skipped session
        const sessionDraft = {
          mode: timerState.mode,
          started_at: timerState.startedAt?.toISOString() || new Date().toISOString(),
          ended_at: new Date().toISOString(),
          duration_sec: timerState.totalTime - timerState.timeLeft,
          was_skipped: true,
          linked_type: linkedItem?.type,
          linked_id: linkedItem?.id,
          est_pomos_at_start: linkedItem?.estPomos,
          client_id: `${Date.now()}-${Math.random()}`,
        };

        await PomodoroSessionsStorage.saveSession(sessionDraft);

        // Reset timer
        stop();
      } catch (error) {
        console.error('Error skipping session:', error);
      }
    }
  }, [timerState, linkedItem, stop]);

  // Change mode
  const changeMode = useCallback((newMode: PomodoroMode) => {
    if (timerState.state !== 'idle' && timerState.state !== 'completed') {
      // Can't change mode while timer is running or paused
      console.log('usePomodoroTimer: cannot change mode from state:', timerState.state);
      return;
    }

    let newTimeLeft: number;
    switch (newMode) {
      case 'focus':
        newTimeLeft = minutesToSeconds(settings.pomo_min);
        break;
      case 'short_break':
        newTimeLeft = minutesToSeconds(settings.short_break_min);
        break;
      case 'long_break':
        newTimeLeft = minutesToSeconds(settings.long_break_min);
        break;
      default:
        newTimeLeft = minutesToSeconds(settings.pomo_min);
    }

    console.log('usePomodoroTimer: changing mode to', newMode, 'with time', newTimeLeft);
    setTimerState(prev => ({
      ...prev,
      mode: newMode,
      timeLeft: newTimeLeft,
      totalTime: newTimeLeft,
      state: 'idle', // Reset to idle state when changing modes
      startedAt: undefined,
      pausedAt: undefined,
      pausedOffset: 0,
    }));

    onModeChange?.(newMode);
  }, [timerState.state, settings, onModeChange]);

  // Set linked item
  const setLinkedItemRef = useCallback((item: { type: 'task' | 'todo' | 'event'; id: string; title: string | null; estPomos?: number } | null) => {
    setLinkedItem(item);
  }, []);

  // Reset focus count
  const resetFocusCount = useCallback(() => {
    setTimerState(prev => ({
      ...prev,
      focusCount: 0,
    }));
  }, []);

  // Reset timer to idle state
  const reset = useCallback(() => {
    console.log('usePomodoroTimer: resetting timer to idle state');
    setTimerState(prev => ({
      ...prev,
      state: 'idle',
      timeLeft: prev.totalTime,
      startedAt: undefined,
      pausedAt: undefined,
      pausedOffset: 0,
    }));
  }, []);

  // Get current progress percentage
  const getProgressPercentage = () => {
    if (timerState.totalTime <= 0) return 0;
    return Math.max(0, Math.min(100, ((timerState.totalTime - timerState.timeLeft) / timerState.totalTime) * 100));
  };

  // Check if timer is active
  const isActive = timerState.state === 'running' || timerState.state === 'paused';

  // Check if timer is running
  const isRunning = timerState.state === 'running';

  // Check if timer is paused
  const isPaused = timerState.state === 'paused';

  // Check if timer is idle
  const isIdle = timerState.state === 'idle';

  // Check if timer is completed
  const isCompleted = timerState.state === 'completed';

  return {
    // State
    timerState,
    linkedItem,
    
    // Actions
    start,
    pause,
    resume,
    stop,
    skip,
    changeMode,
    setLinkedItem: setLinkedItemRef,
    resetFocusCount,
    reset,
    
    // Computed values
    getProgressPercentage,
    isActive,
    isRunning,
    isPaused,
    isIdle,
    isCompleted,
    
    // Current values
    mode: timerState.mode,
    timeLeft: timerState.timeLeft,
    totalTime: timerState.totalTime,
    focusCount: timerState.focusCount,
  };
}
