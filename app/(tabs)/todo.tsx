import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Alert,
    FlatList,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';

import { TopBar } from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestData } from '@/contexts/GuestDataContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { fetchUserTodos } from '@/lib/dataService';

interface TodoTask {
  id: string;
  title: string;
  completed: boolean;
  category: {
    name: string;
    emoji: string;
  };
  createdAt: Date;
  priority?: 'low' | 'medium' | 'high';
  reminder?: Date;
  tags?: string[];
}

// Helper to generate a unique ID
function generateUniqueId(prefix = 'task') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

// Helper to get category emoji
function getCategoryEmoji(category: string): string {
  const emojiMap: { [key: string]: string } = {
    'personal': '👤',
    'work': '💼',
    'health': '💪',
    'shopping': '🛒',
    'learning': '📚',
    'other': '📝'
  };
  return emojiMap[category] || '📝';
}

// Helper to get visible tasks
function getVisibleTasks(tasks: TodoTask[], hideCompleted: boolean) {
  return hideCompleted ? tasks.filter(task => !task.completed) : tasks;
}

export default function TodoScreen() {
  const { mode, colors } = useThemeColors();
  const { addToStack, handleBack, resetStack } = usePreviousScreen();
  const { session } = useAuth();
  const { 
    savePendingAction,
    hasUnsavedData,
    triggerSaveWorkModal
  } = useGuestData();
  
  // Check if user is in guest mode
  const isGuestMode = !session;
  const [tasks, setTasks] = useState<TodoTask[]>([]);
  const [newTaskText, setNewTaskText] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());
  // Removed unused state variables

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('todo');

    // Check if user came through guest mode authentication flow
    // If so, reset the navigation stack to ensure proper back navigation
    const checkGuestModeFlow = async () => {
      try {
        const resetNavigationStack = await AsyncStorage.getItem('reset_navigation_stack');
        if (resetNavigationStack === 'true') {
          console.log('🎯 TODO: User came through guest mode flow, resetting navigation stack');

          // Clear the flag first
          await AsyncStorage.removeItem('reset_navigation_stack');

          // Reset the navigation stack to ensure proper back navigation
          // The user should be able to go back: todo -> menu -> home
          resetStack();
          console.log('🎯 TODO: Navigation stack reset for guest mode flow');

          // Add the current screen to the reset stack
          addToStack('todo');
        }
      } catch (error) {
        console.error('🎯 TODO: Error checking guest mode flow:', error);
      }
    };

    checkGuestModeFlow();
  }, [addToStack]);

  // Cleanup function to stop any animations when component unmounts
  useEffect(() => {
    return () => {
      // Stop any ongoing animations when leaving the screen
      // This ensures clean state when returning to the screen
    };
  }, []);

  // Sample tasks based on the wireframe
  const sampleTasks: TodoTask[] = [
    {
      id: '1',
      title: 'Study',
      completed: false,
      category: { name: 'read', emoji: '📚' },
      createdAt: new Date(),
    },
    {
      id: '2',
      title: 'Morning workout',
      completed: false,
      category: { name: 'health', emoji: '💪' },
      createdAt: new Date(),
    },
    {
      id: '3',
      title: 'Call mom',
      completed: false,
      category: { name: 'family', emoji: '📞' },
      createdAt: new Date(),
    },
    {
      id: '4',
      title: 'Buy groceries',
      completed: true,
      category: { name: 'errands', emoji: '🛒' },
      createdAt: new Date(),
    },
    {
      id: '5',
      title: 'Prepare presentation',
      completed: false,
      category: { name: 'work', emoji: '💼' },
      createdAt: new Date(),
    },
    {
      id: '6',
      title: 'Evening walk',
      completed: false,
      category: { name: 'sleep', emoji: '🌙' },
      createdAt: new Date(),
    },
  ];

  const [hideCompleted, setHideCompleted] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const hideCompletedRef = useRef(hideCompleted);

  useEffect(() => {
    hideCompletedRef.current = hideCompleted;
  }, [hideCompleted]);

  useEffect(() => {
    loadTasks();
  }, []);

  // Reload tasks when screen comes into focus (e.g., after saving from AI breakdown)
  useFocusEffect(
    useCallback(() => {
      if (session?.user?.id) {
        console.log('🎯 TODO: Screen focused, reloading todos from database');
        loadTasks();
      }
    }, [session?.user?.id])
  );

  const loadTasks = async () => {
    try {
      if (isGuestMode) {
        // Guest mode: load from AsyncStorage
        const savedTasks = await AsyncStorage.getItem('todoTasks');
        if (savedTasks) {
          setTasks(JSON.parse(savedTasks));
        } else {
          // Load sample tasks for first time
          setTasks(sampleTasks);
          await AsyncStorage.setItem('todoTasks', JSON.stringify(sampleTasks));
        }
      } else if (session?.user?.id) {
        // Authenticated user: fetch from database
        setLoading(true);
        console.log('🎯 TODO: Fetching todos from database for user:', session.user.id);
        const databaseTodos = await fetchUserTodos(session.user.id);
        
        // Convert database todos to local format
        const convertedTasks: TodoTask[] = databaseTodos.map(dbTodo => ({
          id: dbTodo.id,
          title: dbTodo.title,
          completed: dbTodo.is_completed || false,
          category: {
            name: dbTodo.category || 'personal',
            emoji: getCategoryEmoji(dbTodo.category || 'personal')
          },
          createdAt: dbTodo.created_at ? new Date(dbTodo.created_at) : new Date(),
          priority: dbTodo.priority || 'medium',
          reminder: dbTodo.due_date ? new Date(dbTodo.due_date) : undefined,
          tags: dbTodo.tags || []
        }));
        
        console.log('🎯 TODO: Converted', databaseTodos.length, 'database todos to', convertedTasks.length, 'local tasks');
        setTasks(convertedTasks);
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
      if (isGuestMode) {
        setTasks(sampleTasks);
      }
    } finally {
      setLoading(false);
    }
  };

  const saveTasks = async (updatedTasks: TodoTask[]) => {
    try {
      await AsyncStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTasks();
    setRefreshing(false);
  };

  const toggleTask = (taskId: string) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
    console.log('Task toggled:', taskId, 'New completed status:', updatedTasks.find(t => t.id === taskId)?.completed);
  };

  const addTask = async () => {
    if (!newTaskText.trim()) {
      return;
    }

    try {
      // If user is in guest mode, show save work modal
      if (isGuestMode) {
        const actionData = {
          type: 'todo' as const,
          page: '/todo',
          data: {
            title: newTaskText.trim(),
            description: newTaskText.trim(),
            is_completed: false,
            priority: 'medium',
            category: 'personal'
          },
          timestamp: Date.now(),
          formState: {
            newTaskText
          }
        };
        
        console.log('🎯 TODO: Starting to save task for guest user');
        // Save to local storage first and wait for it to complete
        await savePendingAction(actionData);
        console.log('🎯 TODO: Task data saved to local storage');
        
        // Then show the save work modal
        console.log('🎯 TODO: Showing save work modal');
        triggerSaveWorkModal('todo', actionData);
        return;
      }

      // For authenticated users, save to database
      const newTask: TodoTask = {
        id: generateUniqueId('todo'),
        title: newTaskText.trim(),
        completed: false,
        category: { name: 'general', emoji: '📝' },
        createdAt: new Date(),
        priority: 'medium'
      };

      const updatedTasks = [newTask, ...tasks];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      setNewTaskText('');
    } catch (error) {
      console.error('Error creating todo:', error);
      Alert.alert('Error', 'Failed to create todo');
    }
  };

  const deleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to delete this task?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            setTasks(updatedTasks);
            saveTasks(updatedTasks);
          },
        },
      ]
    );
  };

  const clearCompleted = () => {
    Alert.alert(
      'Clear Completed',
      'Are you sure you want to clear all completed tasks?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const updatedTasks = tasks.filter(task => !task.completed);
            setTasks(updatedTasks);
            saveTasks(updatedTasks);
          },
        },
      ]
    );
  };

  const clearAllTasks = () => {
    if (Platform.OS === 'web') {
      if (!window.confirm('Are you sure you want to delete all visible tasks? This cannot be undone.')) {
        return;
      }
      setTasks(prevTasks => {
        const visibleTasks = getVisibleTasks(prevTasks, hideCompletedRef.current);
        const visibleIds = new Set(visibleTasks.map(t => t.id));
        const remainingTasks = prevTasks.filter(task => !visibleIds.has(task.id));
        AsyncStorage.setItem('todoTasks', JSON.stringify(remainingTasks));
        return remainingTasks;
      });
    } else {
      Alert.alert(
        'Clear All Tasks',
        'Are you sure you want to delete all visible tasks? This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Clear All',
            style: 'destructive',
            onPress: () => {
              setTasks(prevTasks => {
                const visibleTasks = getVisibleTasks(prevTasks, hideCompletedRef.current);
                const visibleIds = new Set(visibleTasks.map(t => t.id));
                const remainingTasks = prevTasks.filter(task => !visibleIds.has(task.id));
                AsyncStorage.setItem('todoTasks', JSON.stringify(remainingTasks));
                return remainingTasks;
              });
            },
          },
        ]
      );
    }
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (direction === 'prev') {
      newDate.setDate(newDate.getDate() - 1);
    } else {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else {
      return date.toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Filter tasks based on completion status first, then limit to first 3 if not showing all
  // const incompleteTasks = tasks.filter(task => !task.completed);
  // const completedTasks = tasks.filter(task => task.completed);
  
  // const displayedTasks = showCompleted 
  //   ? (showAllTasks ? completedTasks : completedTasks.slice(0, 3))
  //   : (showAllTasks ? incompleteTasks : incompleteTasks.slice(0, 3));
  // const completedCount = tasks.filter(task => task.completed).length;

  // New logic: show all tasks in original order, with optional hide completed toggle
  const completedTasks = tasks.filter(task => task.completed === true);
  const incompleteTasks = tasks.filter(task => task.completed === false);
  const displayedTasks = getVisibleTasks(tasks, hideCompleted);
  
  console.log('Total tasks:', tasks.length, 'Completed tasks:', completedTasks.length, 'Incomplete tasks:', incompleteTasks.length, 'Displayed tasks:', displayedTasks.length, 'Hide completed:', hideCompleted);

  const renderTask = ({ item }: { item: any }) => {
    console.log('Rendering task:', item.title, 'completed:', item.completed);
    return (
      <View style={[styles.taskCard, { backgroundColor: colors.surface }]}> 
        <View style={styles.taskContent}>
          <View style={styles.taskLeft}>
            <TouchableOpacity
              style={[
                styles.checkbox,
                {
                  backgroundColor: item.completed ? colors.button : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => toggleTask(item.id)}
            >
              {item.completed && (
                <Text style={[styles.checkmark, { color: colors.buttonText }]}>✓</Text>
              )}
            </TouchableOpacity>
            <Text
              style={[
                styles.taskTitle,
                {
                  color: item.completed ? colors.textSecondary : colors.text,
                  textDecorationLine: item.completed ? 'line-through' : 'none',
                },
              ]}
            >
              {item.title} {item.priority === 'low' && !item.title.toLowerCase().includes('optional') ? '(optional)' : ''}
            </Text>
          </View>
          <View style={styles.taskRight}>
            {item.category && item.category.emoji && (
              <Text style={styles.categoryEmoji}>{item.category.emoji}</Text>
            )}
            {item.category && item.category.name && (
              <Text style={[styles.categoryLabel, { color: colors.textSecondary }]}> 
                {item.category.name}
              </Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <TopBar title="To-Do List" onBack={() => handleBack()} onInfo={() => {/* TODO: Show info modal */}} showSettings={true} />
      {/* Top Buttons */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, gap: 12 }}>
        <TouchableOpacity
          style={{ backgroundColor: colors.buttonBackground, padding: 10, borderRadius: 8 }}
          onPress={clearAllTasks}
        >
          <Text style={{ color: colors.buttonText, fontWeight: '600' }}>Clear All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{ backgroundColor: colors.buttonBackground, padding: 10, borderRadius: 8 }}
          onPress={() => {
            const newHideCompleted = !hideCompleted;
            setHideCompleted(newHideCompleted);
            console.log('Hide completed toggled to:', newHideCompleted);
            console.log('Tasks with completed=true:', tasks.filter(t => t.completed === true).length);
          }}
        >
          <Text style={{ color: colors.buttonText, fontWeight: '600' }}>{hideCompleted ? 'Show Completed' : 'Hide Completed'}</Text>
        </TouchableOpacity>
      </View>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate('prev')}
        >
          <Text style={[styles.navIcon, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.text }]}>
            {formatDate(currentDate)}
          </Text>
          <TouchableOpacity style={styles.infoButton}>
            <Text style={[styles.infoIcon, { color: colors.textSecondary }]}>i</Text>
          </TouchableOpacity>
        </View>
        
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigateDate('next')}
        >
          <Text style={[styles.navIcon, { color: colors.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Task List */}
      <FlatList
        data={displayedTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        style={styles.taskList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No tasks for today. Add one below!
            </Text>
          </View>
        }
      />

      {/* View All / Filter Options */}
      {/* (Removed: no longer needed) */}

      {/* New Task Input */}
      <View style={[styles.inputContainer, { backgroundColor: colors.surface }]}>
        <TextInput
          style={[styles.taskInput, { color: colors.text }]}
          placeholder="Write a task..."
          placeholderTextColor={colors.textSecondary}
          value={newTaskText}
          onChangeText={setNewTaskText}
          onSubmitEditing={addTask}
          returnKeyType="done"
        />
        <View style={styles.inputActions}>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: colors.textSecondary }]}>🕐</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: colors.textSecondary }]}>🏷️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton}>
            <Text style={[styles.actionIcon, { color: colors.textSecondary }]}>⋯</Text>
          </TouchableOpacity>
        </View>
      </View>
      

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  infoButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  taskCard: {
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkmark: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    flex: 1,
  },
  taskRight: {
    alignItems: 'center',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  viewOptions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  viewButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  clearButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  clearButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taskInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
  },
  inputActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionIcon: {
    fontSize: 16,
  },
}); 