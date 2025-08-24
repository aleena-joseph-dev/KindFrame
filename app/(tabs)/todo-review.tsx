import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import TopBar from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { AIService } from '@/services/aiService';
import { QuickJotService } from '@/services/quickJotService';

interface TodoTask {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  createdAt: Date;
}

export default function TodoReviewScreen() {
  const router = useRouter();
  const { brainDumpText, quickJotText } = useLocalSearchParams<{ brainDumpText: string; quickJotText: string }>();
  const { mode, colors } = useThemeColors();
  const { addToStack, handleBack } = usePreviousScreen();
  
  const [generatedTasks, setGeneratedTasks] = useState<TodoTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('todo-review');
  }, [addToStack]);

  useEffect(() => {
    const textToProcess = quickJotText || brainDumpText;
    if (textToProcess) {
      generateTasks(textToProcess);
    }
  }, [quickJotText, brainDumpText]);

  const generateTasks = async (text: string) => {
    try {
      setIsLoading(true);
      const result = await AIService.getTaskBreakdown(text || '', 'few');
      
      if (result.success && result.subtasks) {
        // Convert the AI response to TodoTask format
        const tasks: TodoTask[] = result.subtasks.map((subtask, index) => ({
          id: `task-${index}-${Date.now()}`,
          title: subtask,
          completed: false,
          priority: 'medium' as const,
          createdAt: new Date()
        }));
        setGeneratedTasks(tasks);
      } else {
        console.error('Failed to generate tasks:', result.error);
        Alert.alert('Error', 'Failed to generate tasks from your thoughts.');
      }
    } catch (error) {
      console.error('Error generating tasks:', error);
      Alert.alert('Error', 'Failed to generate tasks from your thoughts.');
    } finally {
      setIsLoading(false);
    }
  };

  const saveTasksToTodoDatabase = async () => {
    try {
      setIsSaving(true);
      
      // Get existing tasks
      const existingTasks = await AsyncStorage.getItem('todoTasks');
      const currentTasks = existingTasks ? JSON.parse(existingTasks) : [];
      
      // Add new tasks
      const updatedTasks = [...currentTasks, ...generatedTasks];
      
      // Save to todo database
      await AsyncStorage.setItem('todoTasks', JSON.stringify(updatedTasks));
      
      // Mark that the user has used Quick Jot
      const quickJotResult = await QuickJotService.markQuickJotUsed();
      if (quickJotResult.success) {
        console.log('🎯 QUICK JOT: Successfully tracked Quick Jot usage from todo review');
      } else {
        console.warn('🎯 QUICK JOT: Failed to track usage from todo review:', quickJotResult.error);
      }
      
      // Redirect back to Quick Jot screen
      console.log('✅ Tasks saved successfully, redirecting to Quick Jot');
      router.push('/(tabs)/quick-jot');
    } catch (error) {
      console.error('Error saving tasks:', error);
      Alert.alert('Error', 'Failed to save tasks to your todo list.');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setGeneratedTasks(prev =>
      prev.map(task =>
        task.id === taskId ? { ...task, completed: !task.completed } : task
      )
    );
  };

  const deleteTask = (taskId: string) => {
    setGeneratedTasks(prev => prev.filter(task => task.id !== taskId));
  };

  const startEditing = (task: TodoTask) => {
    setEditingTaskId(task.id);
    setEditText(task.title);
  };

  const saveEdit = () => {
    if (editingTaskId && editText.trim()) {
      setGeneratedTasks(prev =>
        prev.map(task =>
          task.id === editingTaskId ? { ...task, title: editText.trim() } : task
        )
      );
    }
    setEditingTaskId(null);
    setEditText('');
  };

  const cancelEdit = () => {
    setEditingTaskId(null);
    setEditText('');
  };

  const renderTask = ({ item }: { item: TodoTask }) => (
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
          
          {editingTaskId === item.id ? (
            <TextInput
              style={[styles.editInput, { color: colors.text }]}
              value={editText}
              onChangeText={setEditText}
              onBlur={saveEdit}
              onSubmitEditing={saveEdit}
              autoFocus
            />
          ) : (
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
          )}
        </View>
      </View>
      
      <View style={styles.taskActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => startEditing(item)}
        >
          <Text style={[styles.actionText, { color: colors.buttonText }]}>Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.textSecondary }]}
          onPress={() => deleteTask(item.id)}
        >
          <Text style={[styles.actionText, { color: colors.surface }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            🤖 AI is analyzing your thoughts...
          </Text>
          <Text style={[styles.loadingSubtext, { color: colors.textSecondary }]}>
            Extracting tasks and organizing them for you
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}> 
      <TopBar title="Review Tasks" onBack={() => handleBack()} onInfo={() => {/* TODO: Show info modal */}} />

      {/* Instructions */}
      <View style={styles.instructions}>
        <Text style={[styles.instructionsTitle, { color: colors.text }]}>
          AI-Generated Tasks
        </Text>
        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
          Review and edit the tasks below, then save them to your todo list.
        </Text>
      </View>

      {/* Task List */}
      <FlatList
        data={generatedTasks}
        renderItem={renderTask}
        keyExtractor={item => item.id}
        style={styles.taskList}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No tasks were generated from your thoughts.
            </Text>
          </View>
        }
      />

      {/* Save Button */}
      {generatedTasks.length > 0 && (
        <View style={styles.saveContainer}>
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: isSaving ? colors.textSecondary : colors.button,
              },
            ]}
            onPress={saveTasksToTodoDatabase}
            disabled={isSaving}
          >
            <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
              {isSaving ? 'Saving...' : `Save ${generatedTasks.length} Tasks`}
            </Text>
          </TouchableOpacity>
        </View>
      )}
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
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerRight: {
    width: 40,
    alignItems: 'flex-end',
  },
  taskCount: {
    fontSize: 14,
    fontWeight: '600',
  },
  instructions: {
    padding: 20,
    paddingBottom: 10,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
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
  editInput: {
    fontSize: 16,
    flex: 1,
    padding: 0,
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
  taskActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '600',
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  saveContainer: {
    padding: 20,
    paddingTop: 10,
  },
  saveButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 