import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView, PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/ui/CheckIcon';
import { ClockIcon } from '@/components/ui/ClockIcon';
import { KanbanIcon } from '@/components/ui/KanbanIcon';
import { NotesIcon } from '@/components/ui/NotesIcon';
import { TargetIcon } from '@/components/ui/TargetIcon';
import TopBar from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { DataService } from '@/services/dataService';

interface TodaysTask {
  id: string;
  title: string;
  type: 'note' | 'todo' | 'kanban' | 'goal' | 'pomodoro' | 'event';
  tag?: string;
  tagColor?: string;
  dueTime?: string;
  createdAt: string;
  isActive?: boolean;
  description?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimatedDuration?: number; // in minutes
  isCompleted?: boolean;
  isOverdue?: boolean;
  isUpcoming?: boolean;
}

export default function TodaysFocusScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { session } = useAuth();

  const [tasks, setTasks] = useState<TodaysTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    loadTodaysData();
  }, []);

  const loadTodaysData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!session?.user) {
        setError('User not authenticated');
        return;
      }

      // Get today's date range
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      // Fetch data from various services
      const [todosResult, goalsResult, notesResult, memoriesResult, eventsResult] = await Promise.all([
        DataService.getTodos(false), // Get incomplete todos
        DataService.getGoals('active'), // Get active goals
        DataService.getNotes(20, 0), // Get recent notes
        DataService.getCoreMemories(10, 0), // Get recent memories
        DataService.getCalendarEvents(50, 0) // Get calendar events
      ]);

      let todaysTasks: TodaysTask[] = [];

      // Process todos - prioritize those due today
      if (todosResult.success && todosResult.data) {
        const todos = Array.isArray(todosResult.data) ? todosResult.data : [todosResult.data];
        todos.forEach(todo => {
          const isDueToday = todo.due_date && new Date(todo.due_date) >= startOfDay && new Date(todo.due_date) <= endOfDay;
          const isOverdue = todo.due_date && new Date(todo.due_date) < startOfDay;
          
          if (isDueToday || isOverdue) {
            todaysTasks.push({
              id: todo.id,
              title: todo.title,
              type: 'todo',
              tag: todo.category || 'Task',
              tagColor: getTagColor(todo.category || 'Task'),
              dueTime: todo.due_date ? formatTime(todo.due_date) : undefined,
              createdAt: todo.created_at,
              description: todo.description,
              priority: todo.priority || 'medium',
              estimatedDuration: 30, // Default duration
              isCompleted: todo.is_completed || false,
              isOverdue: isOverdue,
            });
          }
        });
      }

      // Process goals - prioritize those with deadlines today
      if (goalsResult.success && goalsResult.data) {
        const goals = Array.isArray(goalsResult.data) ? goalsResult.data : [goalsResult.data];
        goals.forEach(goal => {
          const isDueToday = goal.deadline && new Date(goal.deadline) >= startOfDay && new Date(goal.deadline) <= endOfDay;
          const isOverdue = goal.deadline && new Date(goal.deadline) < startOfDay;
          
          if (isDueToday || isOverdue) {
            todaysTasks.push({
              id: goal.id,
              title: goal.title,
              type: 'goal',
              tag: goal.category || 'Goal',
              tagColor: getTagColor(goal.category || 'Goal'),
              dueTime: goal.deadline ? formatTime(goal.deadline) : undefined,
              createdAt: goal.created_at,
              description: goal.description,
              priority: goal.priority || 'medium',
              estimatedDuration: 60, // Default duration for goals
              isCompleted: goal.status === 'completed',
              isOverdue: isOverdue,
            });
          }
        });
      }

      // Process calendar events for today
      if (eventsResult.success && eventsResult.data) {
        const events = Array.isArray(eventsResult.data) ? eventsResult.data : [eventsResult.data];
        events.forEach(event => {
          const eventStart = new Date(event.start_time);
          const isToday = eventStart >= startOfDay && eventStart <= endOfDay;
          
          if (isToday) {
            todaysTasks.push({
              id: event.id,
              title: event.title,
              type: 'event',
              tag: 'Event',
              tagColor: '#8b5cf6',
              dueTime: formatTime(event.start_time),
              createdAt: event.created_at,
              description: event.description,
              priority: 'medium',
              estimatedDuration: event.end_time && event.start_time ? 
                Math.round((new Date(event.end_time).getTime() - new Date(event.start_time).getTime()) / (1000 * 60)) : 
                60,
              isCompleted: false,
              isOverdue: false,
            });
          }
        });
      }

      // If no today-specific items, show some upcoming items (next 2-3 days)
      if (todaysTasks.length === 0) {
        const upcomingStart = new Date(today);
        upcomingStart.setDate(today.getDate() + 1);
        const upcomingEnd = new Date(today);
        upcomingEnd.setDate(today.getDate() + 3);

        // Add upcoming todos
        if (todosResult.success && todosResult.data) {
          const todos = Array.isArray(todosResult.data) ? todosResult.data : [todosResult.data];
          todos.forEach(todo => {
            if (todo.due_date) {
              const dueDate = new Date(todo.due_date);
              if (dueDate >= upcomingStart && dueDate <= upcomingEnd) {
                todaysTasks.push({
                  id: todo.id,
                  title: todo.title,
                  type: 'todo',
                  tag: todo.category || 'Task',
                  tagColor: getTagColor(todo.category || 'Task'),
                  dueTime: formatTime(todo.due_date),
                  createdAt: todo.created_at,
                  description: todo.description,
                  priority: todo.priority || 'medium',
                  estimatedDuration: 30,
                  isCompleted: todo.is_completed || false,
                  isOverdue: false,
                  isUpcoming: true,
                });
              }
            }
          });
        }

        // Add upcoming goals
        if (goalsResult.success && goalsResult.data) {
          const goals = Array.isArray(goalsResult.data) ? goalsResult.data : [goalsResult.data];
          goals.forEach(goal => {
            if (goal.deadline) {
              const deadline = new Date(goal.deadline);
              if (deadline >= upcomingStart && deadline <= upcomingEnd) {
                todaysTasks.push({
                  id: goal.id,
                  title: goal.title,
                  type: 'goal',
                  tag: goal.category || 'Goal',
                  tagColor: getTagColor(goal.category || 'Goal'),
                  dueTime: formatTime(goal.deadline),
                  createdAt: goal.created_at,
                  description: goal.description,
                  priority: goal.priority || 'medium',
                  estimatedDuration: 60,
                  isCompleted: goal.status === 'completed',
                  isOverdue: false,
                  isUpcoming: true,
                });
              }
            }
          });
        }

        // Limit upcoming items to 2-3
        todaysTasks = todaysTasks.slice(0, 3);
      }

      // Sort by priority, overdue status, and due time
      todaysTasks.sort((a, b) => {
        // First: overdue items
        if (a.isOverdue && !b.isOverdue) return -1;
        if (!a.isOverdue && b.isOverdue) return 1;
        
        // Second: priority
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority] || 1;
        const bPriority = priorityOrder[b.priority] || 1;
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        // Third: due time (earlier first)
        if (a.dueTime && b.dueTime) {
          return new Date(a.dueTime).getTime() - new Date(b.dueTime).getTime();
        }
        
        // Fourth: creation time (newer first)
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setTasks(todaysTasks);
    } catch (err) {
      console.error('Error loading today\'s data:', err);
      setError('Failed to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getTagColor = (tag: string): string => {
    const colorMap: { [key: string]: string } = {
      'Work': '#8b5cf6',
      'Personal': '#3b82f6',
      'Health': '#ef4444',
      'Wellness': '#f59e0b',
      'Goal': '#10b981',
      'Task': '#6b7280',
      'Note': '#8b5cf6',
      'Memory': '#ec4899',
      'Meeting': '#f59e0b',
      'Project': '#8b5cf6',
    };
    return colorMap[tag] || '#6b7280';
  };

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
    } catch {
      return '';
    }
  };

  const handleTaskPress = (task: TodaysTask) => {
    // Navigate to appropriate screen based on task type
    switch (task.type) {
      case 'todo':
        // Navigate to todo screen and potentially highlight the specific todo
        router.push('/(tabs)/todo');
        break;
      case 'goal':
        // Navigate to goals screen and potentially highlight the specific goal
        router.push('/(tabs)/goals');
        break;
      case 'note':
        // Navigate to notes screen and potentially highlight the specific note
        router.push('/(tabs)/notes');
        break;
      case 'kanban':
        // Navigate to kanban screen and potentially highlight the specific card
        router.push('/(tabs)/kanban');
        break;
      case 'pomodoro':
        // Navigate to pomodoro screen
        router.push('/(tabs)/pomodoro');
        break;
      case 'event':
        // Navigate to calendar screen and potentially highlight the specific event
        router.push('/(tabs)/calendar');
        break;
      default:
        router.push('/(tabs)/todo');
    }
  };

  const handleRefresh = () => {
    loadTodaysData();
  };

  const handleAddNewTask = () => {
    router.push('/(tabs)/quick-jot');
  };

  const handleBack = () => {
    router.back();
  };

  const handleCompleteTask = (taskId: string) => {
    setTasks(prev => 
      prev.map(task => 
        task.id === taskId 
          ? { ...task, isCompleted: !task.isCompleted }
          : task
      )
    );
  };

  const handleDeleteTask = (taskId: string) => {
    Alert.alert(
      'Delete Task',
      'Are you sure you want to remove this task from today\'s focus?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setTasks(prev => prev.filter(task => task.id !== taskId));
          },
        },
      ]
    );
  };

  const getTaskIcon = (type: TodaysTask['type']) => {
    const iconProps = { size: 20, color: colors.textSecondary };
    switch (type) {
      case 'note':
        return <NotesIcon {...iconProps} />;
      case 'todo':
        return <CheckIcon {...iconProps} />;
      case 'kanban':
        return <KanbanIcon {...iconProps} />;
      case 'goal':
        return <TargetIcon {...iconProps} />;
      case 'pomodoro':
        return <ClockIcon {...iconProps} />;
      default:
        return null;
    }
  };

  const getPriorityColor = (priority: TodaysTask['priority']) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return colors.textSecondary;
    }
  };

  const formatDuration = (minutes?: number) => {
    if (!minutes) return '';
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
  };

  // Drag and drop handlers (simplified for React Native)
  const handleDragStart = (taskId: string) => {
    setDraggedTask(taskId);
  };

  const handleDragOver = (index: number) => {
    setDragOverIndex(index);
  };

  const handleDrop = (targetIndex: number) => {
    if (draggedTask) {
      const draggedIndex = tasks.findIndex(task => task.id === draggedTask);
      if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
        const newTasks = [...tasks];
        const [draggedItem] = newTasks.splice(draggedIndex, 1);
        newTasks.splice(targetIndex, 0, draggedItem);
        setTasks(newTasks);
      }
    }
    setDraggedTask(null);
    setDragOverIndex(null);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      const newTasks = [...tasks];
      [newTasks[index], newTasks[index - 1]] = [newTasks[index - 1], newTasks[index]];
      setTasks(newTasks);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < tasks.length - 1) {
      const newTasks = [...tasks];
      [newTasks[index], newTasks[index + 1]] = [newTasks[index + 1], newTasks[index]];
      setTasks(newTasks);
    }
  };

  const getTotalDuration = () => {
    return tasks.reduce((total, task) => total + (task.estimatedDuration || 0), 0);
  };

  const getCompletedCount = () => {
    return tasks.filter(task => task.isCompleted).length;
  };

  // Enhanced drag and drop component
  const DraggableTaskItem = ({ task, index }: { task: TodaysTask; index: number }) => {
    const translateY = useSharedValue(0);
    const scale = useSharedValue(1);
    const zIndex = useSharedValue(0);

    const gestureHandler = useAnimatedGestureHandler({
      onStart: (_, context: any) => {
        context.startY = translateY.value;
        scale.value = withSpring(1.05);
        zIndex.value = 999;
        runOnJS(setDraggedTask)(task.id);
      },
      onActive: (event, context) => {
        translateY.value = context.startY + event.translationY;
        // Determine drop target based on gesture position
        const dropIndex = Math.round(event.translationY / 80) + index;
        if (dropIndex !== index && dropIndex >= 0 && dropIndex < tasks.length) {
          runOnJS(setDragOverIndex)(dropIndex);
        }
      },
      onEnd: (event) => {
        const dropIndex = Math.round(event.translationY / 80) + index;
        if (dropIndex !== index && dropIndex >= 0 && dropIndex < tasks.length) {
          runOnJS(handleDrop)(dropIndex);
        }
        
        translateY.value = withSpring(0);
        scale.value = withSpring(1);
        zIndex.value = 0;
        runOnJS(setDraggedTask)(null);
        runOnJS(setDragOverIndex)(null);
      },
    });

    const animatedStyle = useAnimatedStyle(() => {
      return {
        transform: [
          { translateY: translateY.value },
          { scale: scale.value },
        ],
        zIndex: zIndex.value,
      };
    });

    return (
      <PanGestureHandler onGestureEvent={gestureHandler}>
        <Animated.View
          style={[
            animatedStyle,
            styles.taskItem,
            {
              backgroundColor: task.isCompleted ? colors.background : colors.surface,
              borderColor: task.isActive ? colors.primary : colors.border,
              borderWidth: task.isActive ? 2 : 1,
              opacity: task.isCompleted ? 0.6 : 1,
            },
            dragOverIndex === index && styles.dragOver
          ]}
        >
          {/* Drag Handle */}
          <View style={styles.dragHandle}>
            <View style={[styles.dragDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.dragDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.dragDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.dragDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.dragDot, { backgroundColor: colors.textSecondary }]} />
            <View style={[styles.dragDot, { backgroundColor: colors.textSecondary }]} />
          </View>

          {/* Task Content */}
          <TouchableOpacity 
            style={styles.taskContent}
            onPress={() => handleTaskPress(task)}
          >
            <View style={styles.taskHeader}>
              <View style={styles.taskMeta}>
                {getTaskIcon(task.type)}
                {task.tag && (
                  <View style={[styles.taskTag, { backgroundColor: task.tagColor || colors.border }]}>
                    <Text style={[styles.taskTagText, { color: '#ffffff' }]}>
                      {task.tag}
                    </Text>
                  </View>
                )}
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(task.priority) }]} />
              </View>
              
              {task.dueTime && (
                <Text style={[styles.taskTime, { color: colors.textSecondary }]}>
                  {task.dueTime}
                </Text>
              )}
            </View>

            <Text style={[
              styles.taskTitle,
              { 
                color: task.isCompleted ? colors.textSecondary : colors.text,
                textDecorationLine: task.isCompleted ? 'line-through' : 'none'
              }
            ]}>
              {task.title}
            </Text>

            {task.description && (
              <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                {task.description}
              </Text>
            )}

            {task.estimatedDuration && (
              <Text style={[styles.taskDuration, { color: colors.textSecondary }]}>
                Estimated: {formatDuration(task.estimatedDuration)}
              </Text>
            )}
          </TouchableOpacity>

          {/* Task Actions */}
          <View style={styles.taskActions}>
            {/* Complete Button */}
            <TouchableOpacity
              style={[styles.actionButton, { 
                backgroundColor: task.isCompleted ? colors.primary : colors.background 
              }]}
              onPress={() => handleCompleteTask(task.id)}
            >
              <Text style={[styles.actionButtonText, { 
                color: task.isCompleted ? colors.buttonText : colors.text 
              }]}>
                {task.isCompleted ? '✓' : '○'}
              </Text>
            </TouchableOpacity>

            {/* Delete Button */}
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: '#fef2f2' }]}
              onPress={() => handleDeleteTask(task.id)}
            >
              <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>×</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </PanGestureHandler>
    );
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar title="Today's Focus" onBack={handleBack} />
      
      {/* Header Stats */}
      <View style={[styles.headerStats, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{tasks.length}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Tasks</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{getCompletedCount()}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Completed</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: colors.text }]}>{formatDuration(getTotalDuration())}</Text>
          <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Time</Text>
        </View>
      </View>

      {/* Tasks List */}
      <ScrollView style={styles.tasksList} showsVerticalScrollIndicator={false}>
        <View style={styles.tasksContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading today's focus...</Text>
            </View>
          ) : error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: colors.text }]}>{error}</Text>
            </View>
          ) : tasks.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No tasks for today. Add some to get started!
              </Text>
              <TouchableOpacity 
                style={[styles.addTaskButton, { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={handleAddNewTask}
              >
                <Text style={[styles.addTaskText, { color: colors.buttonText }]}>+ Add Your First Task</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Show today's tasks */}
              {tasks.filter(task => !task.isUpcoming).length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.text }]}>Today's Tasks</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                      Tap to open • Drag to reorder
                    </Text>
                  </View>
                  {tasks.filter(task => !task.isUpcoming).map((task, index) => (
                    <DraggableTaskItem key={task.id} task={task} index={index} />
                  ))}
                </>
              )}
              
              {/* Show upcoming tasks if any */}
              {tasks.filter(task => task.isUpcoming).length > 0 && (
                <>
                  <View style={styles.sectionHeader}>
                    <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Upcoming</Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                      Next few days
                    </Text>
                  </View>
                  {tasks.filter(task => task.isUpcoming).map((task, index) => (
                    <DraggableTaskItem key={task.id} task={task} index={index} />
                  ))}
                </>
              )}
            </>
          )}

          {/* Add New Task Button */}
          <TouchableOpacity 
            style={[styles.addTaskButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleAddNewTask}
          >
            <Text style={[styles.addTaskText, { color: colors.primary }]}>+ Add New Task</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 20,
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
  },
  tasksList: {
    flex: 1,
  },
  tasksContainer: {
    padding: 20,
  },
  taskItem: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'flex-start',
  },
  dragOver: {
    transform: [{ scale: 1.02 }],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  dragHandle: {
    width: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignContent: 'center',
    marginRight: 12,
    paddingVertical: 8,
  },
  dragDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    margin: 1,
  },
  taskContent: {
    flex: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  taskMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  taskTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginLeft: 8,
  },
  taskTagText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priorityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
  },
  taskTime: {
    fontSize: 12,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  taskDuration: {
    fontSize: 12,
  },
  taskActions: {
    alignItems: 'center',
    marginLeft: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addTaskButton: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    marginTop: 16,
  },
  addTaskText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  sectionHeader: {
    marginBottom: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
  },
});
