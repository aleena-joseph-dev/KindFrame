// Enhanced Pomodoro Screen
// Main screen that integrates all pomodoro components

import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AddOrLinkItemSheet, { LinkableItem } from '@/components/pomodoro/AddOrLinkItemSheet';
import ModeTabs from '@/components/pomodoro/ModeTabs';
import SettingsModal, { PomodoroSettings } from '@/components/pomodoro/SettingsModal';
import TasksPanel from '@/components/pomodoro/TasksPanel';
import TimerCard from '@/components/pomodoro/TimerCard';
import TopBar from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { usePomodoroTimer } from '@/hooks/usePomodoroTimer';
import { useThemeColors } from '@/hooks/useThemeColors';
import { formatTime } from '@/lib/pomodoro/format';
import { PomodoroSessionsStorage, PomodoroSettingsStorage } from '@/lib/pomodoro/storage';
import { PomodoroTask } from '@/lib/pomodoro/types';
import { DataService } from '@/services/dataService';

export default function PomodoroScreen() {
  const { colors } = useThemeColors();
  const { session, loading: authLoading } = useAuth();
  const router = useRouter();
  
  console.log('PomodoroScreen: Component rendered, session:', session?.user?.id ? `ID: ${session.user.id}` : 'No session', 'authLoading:', authLoading);
  
  const [showAddOrLinkSheet, setShowAddOrLinkSheet] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [tasks, setTasks] = useState<PomodoroTask[]>([]);
  const [currentTask, setCurrentTask] = useState<PomodoroTask | null>(null);
  const [totalCompletedToday, setTotalCompletedToday] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Default settings
  const [settings, setSettings] = useState<PomodoroSettings>({
    pomo_min: 25,
    short_break_min: 5,
    long_break_min: 15,
    long_break_interval: 4,
    auto_start_breaks: false,
    auto_start_pomodoros: false,
    hour_format: '24h',
    alarm_sound: 'classic',
    alarm_volume: 50,
    tick_sound: 'none',
    tick_volume: 0,
    dark_mode_when_running: false,
    compact_window: false,
    reminder_before_min: 0,
  });

  // Define handlers before using them in usePomodoroTimer
  const handleSessionComplete = useCallback(async (mode: 'focus' | 'short_break' | 'long_break', duration: number) => {
    try {
      console.log('Session completed:', mode, duration);
      
      // Update current task if one is active
      if (currentTask && mode === 'focus') {
        setTasks(prev => {
          const updatedTasks = prev.map(task =>
            task.id === currentTask.id
              ? { ...task, completedPomos: task.completedPomos + 1 }
              : task
          );
          
          // Check if task is completed
          const updatedTask = updatedTasks.find(t => t.id === currentTask.id);
          if (updatedTask && updatedTask.completedPomos >= updatedTask.estPomos) {
            return updatedTasks.map(task =>
              task.id === currentTask.id
                ? { ...task, isCompleted: true, isActive: false }
                : task
            );
          }
          return updatedTasks;
        });
        
        // Check if we need to clear current task
        setCurrentTask(prev => {
          if (!prev) return null;
          
          const updatedTask = tasks.find(t => t.id === prev.id);
          if (updatedTask && updatedTask.completedPomos >= updatedTask.estPomos) {
            return null;
          }
          return prev;
        });
      }

      // Reload total completed count
      await loadTotalCompletedToday();

      // Show completion message
      const modeText = mode === 'focus' ? 'Pomodoro' : mode === 'short_break' ? 'Short Break' : 'Long Break';
      Alert.alert('Session Complete!', `${modeText} session completed successfully.`);
    } catch (error) {
      console.error('Error handling session completion:', error);
    }
  }, [currentTask, tasks]);

  const handleModeChange = useCallback((newMode: 'focus' | 'short_break' | 'long_break') => {
    // This will be set in the usePomodoroTimer hook
  }, []);

  const {
    mode,
    timeLeft,
    isRunning,
    isPaused,
    focusCount,
    start,
    pause,
    resume,
    skip,
    changeMode,
    setLinkedItem,
    resetFocusCount,
    reset,
  } = usePomodoroTimer({ 
    settings,
    onSessionComplete: handleSessionComplete,
    onModeChange: handleModeChange,
  });

  // Update handleModeChange to use the changeMode function
  const handleModeChangeCallback = useCallback((newMode: 'focus' | 'short_break' | 'long_break') => {
    console.log('🔄 Mode change requested:', newMode);
    console.log('changeMode function available:', !!changeMode);
    changeMode(newMode);
  }, [changeMode]);

  // Add debugging for timer functions
  const handleStart = useCallback(() => {
    console.log('🎯 START button pressed!');
    console.log('Current state:', { isRunning, isPaused, mode });
    console.log('Timer functions available:', { start: !!start, pause: !!pause, resume: !!resume });
    start();
  }, [start, isRunning, isPaused, mode]);

  const handlePause = useCallback(() => {
    console.log('⏸️ PAUSE button pressed!');
    console.log('Current state:', { isRunning, isPaused, mode });
    pause();
  }, [pause, isRunning, isPaused, mode]);

  const handleResume = useCallback(() => {
    console.log('▶️ RESUME button pressed!');
    console.log('Current state:', { isRunning, isPaused, mode });
    resume();
  }, [resume, isRunning, isPaused, mode]);

  const handleSkip = useCallback(() => {
    console.log('⏭️ SKIP button pressed!');
    console.log('Current state:', { isRunning, isPaused, mode });
    skip();
  }, [skip, isRunning, isPaused, mode]);

  const handleReset = useCallback(() => {
    console.log('🔄 RESET button pressed!');
    console.log('Current state:', { isRunning, isPaused, mode });
    reset();
  }, [reset, isRunning, isPaused, mode]);

  // Load initial data
  useEffect(() => {
    if (session?.user?.id) {
      console.log('User loaded, calling loadInitialData for user:', session.user.id);
      loadInitialData();
    } else {
      console.log('No user yet, waiting...');
    }
  }, [session?.user?.id]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadSettings(),
        loadTasks(),
        loadTotalCompletedToday(),
      ]);
    } catch (error) {
      console.error('Error loading initial data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = async () => {
    if (!session?.user?.id) return;

    try {
      console.log('Loading settings for user:', session.user.id);
      const savedSettings = await PomodoroSettingsStorage.getSettings(session.user.id);
      console.log('Retrieved settings:', savedSettings);
      if (savedSettings) {
        setSettings(savedSettings);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const loadTasks = async () => {
    try {
      // TODO: Load tasks from Pomodoro storage
      // For now, start with empty tasks list
      setTasks([]);
      setCurrentTask(null);
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const loadTotalCompletedToday = async () => {
    if (!session?.user?.id) return;

    try {
      console.log('Loading total completed sessions for user:', session.user.id);
      const sessions = await PomodoroSessionsStorage.getTodaySessions(session.user.id);
      console.log('Retrieved sessions:', sessions);
      const completedCount = sessions.filter(s => s.mode === 'focus' && !s.was_skipped).length;
      console.log('Calculated completed count:', completedCount);
      setTotalCompletedToday(completedCount);
    } catch (error) {
      console.error('Error loading total completed:', error);
      setTotalCompletedToday(0);
    }
  };

  const handleTaskToggle = useCallback((taskId: string) => {
    setTasks(prev => prev.map(task => 
      task.id === taskId 
        ? { ...task, isCompleted: !task.isCompleted }
        : task
    ));
  }, []);

  const handleTaskActivate = useCallback((taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Deactivate all other tasks
    setTasks(prev => prev.map(t => ({
      ...t,
      isActive: t.id === taskId
    })));

    // Set as current task
    setCurrentTask(task);

    // Link to timer
    setLinkedItem({
      type: task.type,
      id: task.id,
      title: task.title,
      estPomos: task.estPomos,
    });

    // Reset timer to focus mode if not already
    if (mode !== 'focus') {
      changeMode('focus');
    }
  }, [tasks, mode, changeMode, setLinkedItem]);

  const handleAddOrLink = useCallback(() => {
    console.log('🔗 Add or Link button pressed!');
    console.log('Current state:', { showAddOrLinkSheet, showSettingsModal });
    setShowAddOrLinkSheet(true);
  }, [showAddOrLinkSheet, showSettingsModal]);

  const handleTaskOptions = useCallback((taskId: string) => {
    if (taskId === 'header') {
      // Header options
      Alert.alert(
        'Task List Options',
        'What would you like to do?',
        [
          { text: 'Clear Completed', onPress: () => clearCompletedTasks() },
          { text: 'Reset All', onPress: () => resetAllTasks() },
          { text: 'Reset Focus Count', onPress: () => resetFocusCount() },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    } else {
      // Individual task options
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        Alert.alert(
          'Task Options',
          `Options for "${task.title}"`,
          [
            { text: 'Edit', onPress: () => editTask(task) },
            { text: 'Unlink', onPress: () => unlinkTask(taskId) },
            { text: 'Delete', style: 'destructive', onPress: () => deleteTask(taskId) },
            { text: 'Cancel', style: 'cancel' },
          ]
        );
      }
    }
  }, [tasks, resetFocusCount]);

  const clearCompletedTasks = () => {
    setTasks(prev => prev.filter(task => !task.isCompleted));
  };

  const resetAllTasks = () => {
    Alert.alert(
      'Reset All Tasks?',
      'This will reset all Pomodoro counts. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            setTasks(prev => prev.map(task => ({
              ...task,
              completedPomos: 0,
              isCompleted: false
            })));
            setTotalCompletedToday(0);
          }
        },
      ]
    );
  };

  const editTask = (task: PomodoroTask) => {
    // TODO: Implement task editing
    Alert.alert('Edit Task', 'Task editing not implemented yet');
  };

  const unlinkTask = (taskId: string) => {
    Alert.alert(
      'Unlink Task?',
      'This will remove the task from your Pomodoro list but keep it in your main task list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Unlink', 
          style: 'destructive',
          onPress: () => {
            setTasks(prev => prev.filter(task => task.id !== taskId));
            if (currentTask?.id === taskId) {
              setCurrentTask(null);
              setLinkedItem(null);
            }
          }
        },
      ]
    );
  };

  const deleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task?',
      'This will permanently delete the task. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: () => {
            setTasks(prev => prev.filter(task => task.id !== taskId));
            if (currentTask?.id === taskId) {
              setCurrentTask(null);
              setLinkedItem(null);
            }
          }
        },
      ]
    );
  };

  const handleLinkItem = useCallback(async (item: LinkableItem, estimatedPomodoros: number) => {
    try {
      console.log('🔗 Linking item:', item, 'with', estimatedPomodoros, 'pomodoros');
      
      // Create new Pomodoro task from linked item
      const newTask: PomodoroTask = {
        id: `${item.type}-${item.id}`,
        title: item.title,
        type: item.type as 'task' | 'todo' | 'event',
        estPomos: estimatedPomodoros,
        completedPomos: 0,
        isActive: false,
        isCompleted: false,
      };

      console.log('Created new task:', newTask);
      setTasks(prev => [...prev, newTask]);
      Alert.alert('Success', `Linked "${item.title}" to your Pomodoro list`);
    } catch (error) {
      console.error('Error linking item:', error);
      Alert.alert('Error', 'Failed to link item. Please try again.');
    }
  }, []);

  const handleCreateTask = useCallback(async (title: string, estimatedPomodoros: number, notes?: string) => {
    try {
      console.log('➕ Creating new task:', { title, estimatedPomodoros, notes });
      console.log('User session:', session?.user?.id);
      
      // Create new task in database
      const result = await DataService.createTodo({
        title,
        description: notes,
        due_date: null,
        priority: 'medium',
        category: 'work',
        tags: ['pomodoro'],
      });

      console.log('DataService result:', result);

      if (!result.success || !result.data) {
        throw new Error(result.error || 'Failed to create todo');
      }

      // Since createTodo uses .single(), data should be a single Todo object
      const todo = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!todo) {
        throw new Error('No todo data returned');
      }

      console.log('Created todo:', todo);

      // Add to Pomodoro tasks
      const newTask: PomodoroTask = {
        id: `todo-${todo.id}`,
        title,
        type: 'todo',
        estPomos: estimatedPomodoros,
        completedPomos: 0,
        isActive: false,
        isCompleted: false,
      };

      console.log('Adding to Pomodoro tasks:', newTask);
      setTasks(prev => [...prev, newTask]);
      Alert.alert('Success', `Created new task "${title}"`);
    } catch (error) {
      console.error('Error creating task:', error);
      Alert.alert('Error', 'Failed to create task. Please try again.');
    }
  }, [session?.user?.id]);

  const handleSettingsChange = useCallback(async (newSettings: PomodoroSettings) => {
    if (!session?.user?.id) {
      console.log('❌ No user session for settings change');
      return;
    }
    
    try {
      console.log('⚙️ Saving settings for user:', session.user.id);
      console.log('New settings:', newSettings);
      
      // Save settings to database
      await PomodoroSettingsStorage.updateSettings(session.user.id, newSettings);
      console.log('✅ Settings saved successfully');
      
      setSettings(newSettings);
      Alert.alert('Success', 'Settings saved successfully!');
    } catch (error) {
      console.error('❌ Error saving settings:', error);
      Alert.alert('Error', 'Failed to save settings. Please try again.');
    }
  }, [session?.user?.id]);

  const handleSettingsPress = useCallback(() => {
    console.log('⚙️ Settings button pressed!');
    console.log('Current state:', { showSettingsModal, session: !!session?.user });
    setShowSettingsModal(true);
  }, [showSettingsModal, session?.user]);

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar
          title="Pomodoro"
          onBack={() => {}}
          showSettings={true}
          onSettingsPress={handleSettingsPress}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading authentication...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar
          title="Pomodoro"
          onBack={() => {}}
          showSettings={true}
          onSettingsPress={handleSettingsPress}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Please sign in to use Pomodoro</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar
          title="Pomodoro"
          onBack={() => {}}
          showSettings={true}
          onSettingsPress={handleSettingsPress}
        />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <BottomSheetModalProvider>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar
          title="Pomodoro"
          onBack={() => router.back()}
          onSettingsPress={handleSettingsPress}
        />

        <ModeTabs currentMode={mode} onModeChange={handleModeChangeCallback} />

        <TimerCard
          timeRemaining={formatTime(timeLeft)}
          mode={mode}
          isRunning={isRunning}
          isPaused={isPaused}
          onStart={handleStart}
          onPause={handlePause}
          onResume={handleResume}
          onSkip={handleSkip}
          onReset={handleReset}
          currentTask={currentTask ? {
            title: currentTask.title,
            completedPomodoros: currentTask.completedPomos,
            estimatedPomodoros: currentTask.estPomos,
          } : undefined}
          totalCompletedToday={totalCompletedToday}
        />

        <TasksPanel
          tasks={tasks}
          onTaskToggle={handleTaskToggle}
          onTaskActivate={handleTaskActivate}
          onAddOrLink={handleAddOrLink}
          onTaskOptions={handleTaskOptions}
        />

        <AddOrLinkItemSheet
          isVisible={showAddOrLinkSheet}
          onClose={() => setShowAddOrLinkSheet(false)}
          onLinkItem={handleLinkItem}
          onCreateTask={handleCreateTask}
        />

        <SettingsModal
          isVisible={showSettingsModal}
          onClose={() => setShowSettingsModal(false)}
          settings={settings}
          onSettingsChange={handleSettingsChange}
        />
      </SafeAreaView>
    </BottomSheetModalProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '500',
  },
}); 