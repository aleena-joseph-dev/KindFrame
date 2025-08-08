import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestData } from '@/contexts/GuestDataContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface KanbanTask {
  id: string;
  title: string;
  description?: string;
  column: 'todo' | 'inProgress' | 'done';
  createdAt: Date;
  priority?: 'low' | 'medium' | 'high';
}

interface KanbanColumn {
  id: 'todo' | 'inProgress' | 'done';
  title: string;
  color: string;
}

export default function KanbanScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack, resetStack } = usePreviousScreen();
  const { session } = useAuth();
  const { 
    savePendingAction,
    triggerSaveWorkModal
  } = useGuestData();
  
  // Check if user is in guest mode
  const isGuestMode = !session;

  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'low' | 'medium' | 'high'>('medium');

  const columns: KanbanColumn[] = [
    { id: 'todo', title: 'To Do', color: '#ff6b6b' },
    { id: 'inProgress', title: 'In Progress', color: '#4ecdc4' },
    { id: 'done', title: 'Done', color: '#45b7d1' },
  ];

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('kanban');

    // Check if user came through guest mode authentication flow
    // If so, reset the navigation stack to ensure proper back navigation
    const checkGuestModeFlow = async () => {
      try {
        const resetNavigationStack = await AsyncStorage.getItem('reset_navigation_stack');
        if (resetNavigationStack === 'true') {
          console.log('🎯 KANBAN: User came through guest mode flow, resetting navigation stack');

          // Clear the flag first
          await AsyncStorage.removeItem('reset_navigation_stack');

          // Reset the navigation stack to ensure proper back navigation
          // The user should be able to go back: kanban -> menu -> home
          resetStack();
          console.log('🎯 KANBAN: Navigation stack reset for guest mode flow');

          // Add the current screen to the reset stack
          addToStack('kanban');
        }
      } catch (error) {
        console.error('🎯 KANBAN: Error checking guest mode flow:', error);
      }
    };

    checkGuestModeFlow();
  }, [addToStack]);

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      const savedTasks = await AsyncStorage.getItem('kanban_tasks');
      if (savedTasks) {
        setTasks(JSON.parse(savedTasks));
      }
    } catch (error) {
      console.error('Error loading tasks:', error);
    }
  };

  const saveTasks = async (updatedTasks: KanbanTask[]) => {
    try {
      await AsyncStorage.setItem('kanban_tasks', JSON.stringify(updatedTasks));
    } catch (error) {
      console.error('Error saving tasks:', error);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    try {
      // If user is in guest mode, show save work modal
      if (isGuestMode) {
        const actionData = {
          type: 'kanban-task' as const,
          page: '/kanban',
          data: {
            title: newTaskTitle.trim(),
            description: newTaskDescription.trim() || '',
            column: 'todo',
            priority: newTaskPriority
          },
          timestamp: Date.now(),
          formState: {
            newTaskTitle,
            newTaskDescription,
            newTaskPriority
          }
        };
        
        console.log('🎯 KANBAN: Starting to save task for guest user');
        // Save to local storage first and wait for it to complete
        await savePendingAction(actionData);
        console.log('🎯 KANBAN: Task data saved to local storage');
        
        // Then show the save work modal
        console.log('🎯 KANBAN: Showing save work modal');
        triggerSaveWorkModal('kanban-task', actionData);
        return;
      }

      // For authenticated users, save to local storage (placeholder)
      const newTask: KanbanTask = {
        id: Date.now().toString(),
        title: newTaskTitle.trim(),
        description: newTaskDescription.trim() || undefined,
        column: 'todo',
        createdAt: new Date(),
        priority: newTaskPriority,
      };

      const updatedTasks = [...tasks, newTask];
      setTasks(updatedTasks);
      saveTasks(updatedTasks);
      
      setNewTaskTitle('');
      setNewTaskDescription('');
      setNewTaskPriority('medium');
      setShowAddTask(false);
    } catch (error) {
      console.error('Error creating kanban task:', error);
      Alert.alert('Error', 'Failed to create task');
    }
  };

  const handleMoveTask = (taskId: string, newColumn: KanbanTask['column']) => {
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, column: newColumn } : task
    );
    setTasks(updatedTasks);
    saveTasks(updatedTasks);
  };

  const handleDeleteTask = (taskId: string) => {
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

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getTasksForColumn = (columnId: string) => {
    return tasks.filter(task => task.column === columnId);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Kanban Board" onBack={() => handleBack()} showSettings={true} />

      {/* Add Task Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => setShowAddTask(true)}
        >
          <Text style={[styles.addButtonText, { color: colors.buttonText }]}>+ Add Task</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban Board */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.boardContainer}
        contentContainerStyle={styles.boardContent}
      >
        {columns.map((column) => (
          <View key={column.id} style={[styles.column, { backgroundColor: colors.surface }]}>
            <View style={[styles.columnHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.columnTitle, { color: colors.text }]}>
                {column.title}
              </Text>
              <Text style={[styles.taskCount, { color: colors.textSecondary }]}>
                {getTasksForColumn(column.id).length}
              </Text>
            </View>
            
            <ScrollView style={styles.taskList} showsVerticalScrollIndicator={false}>
              {getTasksForColumn(column.id).map((task) => (
                <View
                  key={task.id}
                  style={[styles.taskCard, { 
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border 
                  }]}
                >
                  <View style={styles.taskHeader}>
                    <View style={[styles.priorityIndicator, { backgroundColor: getPriorityColor(task.priority || 'medium') }]} />
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteTask(task.id)}
                    >
                      <Text style={[styles.deleteButtonText, { color: colors.textSecondary }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                  
                  <Text style={[styles.taskTitle, { color: colors.text }]}>
                    {task.title}
                  </Text>
                  
                  {task.description && (
                    <Text style={[styles.taskDescription, { color: colors.textSecondary }]}>
                      {task.description}
                    </Text>
                  )}
                  
                  <View style={styles.taskActions}>
                    {column.id !== 'todo' && (
                      <TouchableOpacity
                        style={[styles.moveButton, { backgroundColor: colors.buttonBackground }]}
                        onPress={() => handleMoveTask(task.id, 'todo')}
                      >
                        <Text style={[styles.moveButtonText, { color: colors.buttonText }]}>←</Text>
                      </TouchableOpacity>
                    )}
                    
                    {column.id !== 'done' && (
                      <TouchableOpacity
                        style={[styles.moveButton, { backgroundColor: colors.buttonBackground }]}
                        onPress={() => handleMoveTask(task.id, column.id === 'todo' ? 'inProgress' : 'done')}
                      >
                        <Text style={[styles.moveButtonText, { color: colors.buttonText }]}>→</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        ))}
      </ScrollView>

      {/* Add Task Modal */}
      {showAddTask && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Task</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Task title"
              placeholderTextColor={colors.textSecondary}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newTaskDescription}
              onChangeText={setNewTaskDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.priorityContainer}>
              <Text style={[styles.priorityLabel, { color: colors.text }]}>Priority:</Text>
              <View style={styles.priorityButtons}>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      { 
                        backgroundColor: newTaskPriority === priority ? getPriorityColor(priority) : colors.cardBackground,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setNewTaskPriority(priority)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: newTaskPriority === priority ? '#fff' : colors.text }
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddTask(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addTaskButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddTask}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Add Task</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  boardContainer: {
    flex: 1,
  },
  boardContent: {
    paddingHorizontal: 20,
  },
  column: {
    width: 280,
    marginRight: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  columnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  taskCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskList: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  taskCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deleteButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  taskDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  taskActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moveButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  moveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  priorityContainer: {
    marginBottom: 20,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  addTaskButton: {
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 