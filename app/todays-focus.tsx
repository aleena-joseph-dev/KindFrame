import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
import { TopBar } from '@/components/ui/TopBar';
import { SensoryColors } from '@/constants/Colors';
import { useSensoryMode } from '@/contexts/SensoryModeContext';

interface TodaysTask {
  id: string;
  title: string;
  type: 'note' | 'todo' | 'kanban' | 'goal' | 'pomodoro';
  tag?: string;
  tagColor?: string;
  dueTime?: string;
  createdAt: string;
  isActive?: boolean;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration?: number; // in minutes
  isCompleted?: boolean;
}

export default function TodaysFocusScreen() {
  const router = useRouter();
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];

  // Sample tasks data - in real implementation, this would come from state management or database
  const [tasks, setTasks] = useState<TodaysTask[]>([
    {
      id: '1',
      title: 'Morning meditation',
      type: 'pomodoro',
      tag: 'Wellness',
      tagColor: '#ef4444',
      dueTime: '7:00 AM',
      createdAt: new Date().toISOString(),
      isActive: true,
      description: '15-minute mindfulness session',
      priority: 'high',
      estimatedDuration: 15,
      isCompleted: false,
    },
    {
      id: '2',
      title: 'Review project goals',
      type: 'goal',
      tag: 'Work',
      tagColor: '#8b5cf6',
      dueTime: '8:00 AM',
      createdAt: new Date().toISOString(),
      description: 'Check quarterly objectives and milestones',
      priority: 'high',
      estimatedDuration: 30,
      isCompleted: false,
    },
    {
      id: '3',
      title: 'Write daily journal',
      type: 'note',
      tag: 'Personal',
      tagColor: '#3b82f6',
      dueTime: '9:00 AM',
      createdAt: new Date().toISOString(),
      description: 'Reflect on yesterday and plan today',
      priority: 'medium',
      estimatedDuration: 20,
      isCompleted: false,
    },
    {
      id: '4',
      title: 'Team sync meeting',
      type: 'kanban',
      tag: 'Meeting',
      tagColor: '#f59e0b',
      dueTime: '10:00 AM',
      createdAt: new Date().toISOString(),
      description: 'Weekly team standup and updates',
      priority: 'high',
      estimatedDuration: 45,
      isCompleted: false,
    },
    {
      id: '5',
      title: 'Complete task assignments',
      type: 'todo',
      tag: 'Work',
      tagColor: '#10b981',
      dueTime: '2:00 PM',
      createdAt: new Date().toISOString(),
      description: 'Finish pending items from sprint backlog',
      priority: 'medium',
      estimatedDuration: 90,
      isCompleted: false,
    },
  ]);

  const [draggedTask, setDraggedTask] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleBack = () => {
    router.back();
  };

  const handleTaskPress = (task: TodaysTask) => {
    const routes = {
      note: '/(tabs)/notes',
      todo: '/(tabs)/todo',
      kanban: '/(tabs)/kanban',
      goal: '/(tabs)/goals',
      pomodoro: '/(tabs)/pomodoro'
    };

    router.push(routes[task.type] as any);
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

  const handleAddNewTask = () => {
    // This would open the task creation modal
    Alert.alert('Add Task', 'Task creation will open the same modal as home screen!');
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
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Tasks for Today</Text>
            <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
              Drag to reorder • Tap to open
            </Text>
          </View>

          {tasks.map((task, index) => (
            <DraggableTaskItem key={task.id} task={task} index={index} />
          ))}

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
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
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
});
