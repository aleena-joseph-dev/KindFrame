import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AudioIcon from '@/components/ui/AudioIcon';
import BreakDownIcon from '@/components/ui/BreakDownIcon';
import { OptionsCard } from '@/components/ui/OptionsCard';
import { PopupBg } from '@/components/ui/PopupBg';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';

import { TopBar } from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestData } from '@/contexts/GuestDataContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { AIService } from '@/services/aiService';
import { DataService } from '@/services/dataService';
import { QuickJotService } from '@/services/quickJotService';

interface QuickJotEntry {
  id: string;
  content: string;
  type: 'note' | 'todo' | 'task' | 'journal' | 'memory' | 'dump';
  createdAt: Date;
  category?: string;
}

export default function QuickJotScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack, resetStack } = usePreviousScreen();
    const { session } = useAuth();
  const { 
    savePendingAction,
    hasUnsavedData,
    triggerSaveWorkModal
  } = useGuestData();
  
  // Check if user is in guest mode
  const isGuestMode = !session;
  const [thoughts, setThoughts] = useState('');
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiSubtasks, setAiSubtasks] = useState<string[]>([]);
  const [isAILoading, setIsAILoading] = useState(false);
  const [detailLevel, setDetailLevel] = useState<'few' | 'many'>('few');

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('quick-jot');

    // Check if user came through guest mode authentication flow
    // If so, reset the navigation stack to ensure proper back navigation
    const checkGuestModeFlow = async () => {
      try {
        const resetNavigationStack = await AsyncStorage.getItem('reset_navigation_stack');
        if (resetNavigationStack === 'true') {
          console.log('🎯 QUICK-JOT: User came through guest mode flow, resetting navigation stack');

          // Clear the flag first
          await AsyncStorage.removeItem('reset_navigation_stack');

          // Reset the navigation stack to ensure proper back navigation
          // The user should be able to go back: quick-jot -> menu -> home
          resetStack();
          console.log('🎯 QUICK-JOT: Navigation stack reset for guest mode flow');

          // Add the current screen to the reset stack
          addToStack('quick-jot');
        }
      } catch (error) {
        console.error('🎯 QUICK-JOT: Error checking guest mode flow:', error);
      }
    };

    checkGuestModeFlow();
  }, [addToStack]);

  // Cleanup function to stop any animations when component unmounts
  useEffect(() => {
    return () => {
      // Stop any ongoing animations when leaving the screen
      setIsRecording(false);
      setIsProcessing(false);
    };
  }, []);

  const handleVoiceInput = () => {
    // Mock voice recording functionality
    const mockTranscription = "This is a mock transcription of voice input. You can edit this text as needed.";
    setThoughts(mockTranscription);
  };

  const handleSave = () => {
    if (!thoughts.trim()) {
      return;
    }
    setShowSaveOptions(true);
  };

  const handleAIBreakdown = async () => {
    if (!thoughts.trim()) {
      return;
    }

    // For now, AI breakdown is available for all users
    setIsAILoading(true);
    try {
      const result = await AIService.getTaskBreakdown(thoughts.trim(), detailLevel);

      if (result.success && result.formattedBreakdown) {
        // Replace the input text with the formatted breakdown
        setThoughts(result.formattedBreakdown);
        setAiSubtasks(result.subtasks);
        console.log('✅ AI breakdown successful:', result.subtasks.length, 'subtasks');
      } else {
        console.error('❌ AI breakdown failed:', result.error);
        // You could show a toast or alert here
      }
    } catch (error) {
      console.error('❌ AI breakdown error:', error);
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSaveSubtasksAsTodos = async () => {
    if (!aiSubtasks.length) {
      Alert.alert('Error', 'No subtasks to save');
      return;
    }

    try {
      setIsAILoading(true);
      
      // If user is in guest mode, show save work modal
      if (isGuestMode) {
        const actionData = {
          type: 'quick-jot' as const,
          page: '/quick-jot',
          data: {
            thoughts: thoughts,
            aiSubtasks: aiSubtasks,
            detailLevel: detailLevel
          },
          timestamp: Date.now(),
          formState: {
            thoughts,
            aiSubtasks,
            detailLevel
          }
        };
        
        console.log('🎯 QUICK-JOT: Starting to save entry for guest user');
        // Save to local storage first and wait for it to complete
        await savePendingAction(actionData);
        console.log('🎯 QUICK-JOT: Entry data saved to local storage');
        
        // Then show the save work modal
        console.log('🎯 QUICK-JOT: Showing save work modal');
        triggerSaveWorkModal('quick-jot', actionData);
        return;
      }

      // For authenticated users, save to database
      for (const subtask of aiSubtasks) {
        await DataService.createTodo({
          title: subtask,
          description: subtask,
          is_completed: false,
          priority: 'medium',
          category: 'personal'
        });
      }
      
      // Mark that the user has used Quick Jot
      const quickJotResult = await QuickJotService.markQuickJotUsed();
      if (quickJotResult.success) {
        console.log('🎯 QUICK JOT: Successfully tracked Quick Jot usage');
      } else {
        console.warn('🎯 QUICK JOT: Failed to track usage:', quickJotResult.error);
      }
      
      setAiSubtasks([]);
      setThoughts('');
      console.log('✅ All subtasks saved as todos');
      Alert.alert('Success', 'Quick Jot tasks saved successfully!');
    } catch (error) {
      console.error('Error saving quick jot tasks:', error);
      Alert.alert('Error', 'Failed to save tasks');
    } finally {
      setIsAILoading(false);
    }
  };

  const handleSaveIndividualSubtask = async (subtask: string, type: QuickJotEntry['type']) => {
    try {
      // For authenticated users, save to database based on type
      if (type === 'todo') {
        await DataService.createTodo({
          title: subtask,
          description: subtask,
          is_completed: false,
          priority: 'medium',
          category: 'personal'
        });
      } else if (type === 'note') {
        await DataService.createNote({
          title: subtask,
          content: subtask,
          category: 'personal'
        });
      }
      Alert.alert('Success', `Subtask saved as ${getTypeDisplayName(type)}!`);
    } catch (error) {
      console.error('Error saving individual subtask:', error);
      Alert.alert('Error', 'Failed to save subtask');
    }
  };

  const handleSaveAllSubtasks = async (type: QuickJotEntry['type']) => {
    try {
      // Save each subtask as the specified type
      for (const subtask of aiSubtasks) {
        if (type === 'todo') {
          await DataService.createTodo({
            title: subtask,
            description: subtask,
            is_completed: false,
            priority: 'medium',
            category: 'personal'
          });
        } else if (type === 'note') {
          await DataService.createNote({
            title: subtask,
            content: subtask,
            category: 'personal'
          });
        }
      }
      Alert.alert('Success', `All subtasks saved as ${getTypeDisplayName(type)}!`);
      setAiSubtasks([]); // Clear subtasks after saving all
    } catch (error) {
      console.error('Error saving all subtasks:', error);
      Alert.alert('Error', 'Failed to save all subtasks');
    }
  };

  const handleSaveAsType = async (type: QuickJotEntry['type']) => {
    try {
      if (type === 'todo') {
        // Navigate to todo review screen with the quick jot text
        setShowSaveOptions(false);
        router.push({
          pathname: '/(tabs)/todo-review',
          params: { quickJotText: thoughts.trim() }
        });
        return;
      }

      const entry: QuickJotEntry = {
        id: Date.now().toString(),
        content: thoughts.trim(),
        type,
        createdAt: new Date(),
      };

      // If user is in guest mode, show save work modal
      if (isGuestMode) {
        const actionData = {
          type: 'quick-jot' as const,
          page: '/quick-jot',
          data: entry,
          timestamp: Date.now(),
          formState: {
            thoughts,
            aiSubtasks,
            detailLevel
          }
        };
        
        console.log('🎯 QUICK-JOT: Starting to save as type for guest user');
        // Save to local storage first and wait for it to complete
        await savePendingAction(actionData);
        console.log('🎯 QUICK-JOT: Entry data saved to local storage');
        
        // Then show the save work modal
        console.log('🎯 QUICK-JOT: Showing save work modal');
        triggerSaveWorkModal('quick-jot', actionData);
        setShowSaveOptions(false);
        return;
      }

      // For authenticated users, save to database based on type
      if (type === 'task') {
        await DataService.createTodo({
          title: entry.content,
          description: entry.content,
          is_completed: false,
          priority: 'medium',
          category: 'personal'
        });
      } else if (type === 'note') {
        await DataService.createNote({
          title: entry.content,
          content: entry.content,
          category: 'personal'
        });
      } else if (type === 'journal') {
        await DataService.createJournalEntry({
          content: entry.content,
          mood: 'neutral'
        });
      } else if (type === 'memory') {
        await DataService.createCoreMemory({
          title: entry.content,
          description: entry.content
        });
      }

      // Mark that the user has used Quick Jot
      const quickJotResult = await QuickJotService.markQuickJotUsed();
      if (quickJotResult.success) {
        console.log('🎯 QUICK JOT: Successfully tracked Quick Jot usage');
      } else {
        console.warn('🎯 QUICK JOT: Failed to track usage:', quickJotResult.error);
      }

      setThoughts('');
      setShowSaveOptions(false);
      
      console.log(`✅ Quick jot saved as ${getTypeDisplayName(type)}`);
      router.back();
    } catch (error) {
      console.error('Error saving quick jot:', error);
    }
  };

  const getTypeDisplayName = (type: QuickJotEntry['type']) => {
    switch (type) {
      case 'note': return 'a Note';
      case 'todo': return 'a To-Do List';
      case 'task': return 'a Task';
      case 'journal': return 'a Journal Entry';
      case 'memory': return 'a Core Memory';
      case 'dump': return 'a Quick Jot Note';
      default: return 'an Entry';
    }
  };

  const handleInfo = () => {
    console.log('Info button pressed'); // Debug log
    console.log('Quick Jot: This is a quiet space to release thoughts or emotions without judgment. Write freely, then choose how to save or use your thoughts. Perfect for brain dumps, ideas, or emotional processing.');
  };



  const handleQuickJotBack = () => {
    if (thoughts.trim()) {
      // In guest mode, show popup instead of auto-saving
      if (isGuestMode && !session) {
        // promptSignIn(); // This function is no longer used here
        return;
      }
    }
    handleBack();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Quick Jot" onBack={handleQuickJotBack} onInfo={handleInfo} />

      {/* Main Content */}
      <View style={styles.content}>
        <TextInput
          style={[
            styles.thoughtsInput,
            {
              backgroundColor: colors.surface,
              color: colors.text,
              borderColor: colors.border,
            },
          ]}
          placeholder="Write your thoughts here..."
          placeholderTextColor={colors.textSecondary}
          value={thoughts}
          onChangeText={setThoughts}
          multiline
          textAlignVertical="top"
          autoFocus
        />
      </View>

      {/* Bottom Bar */}
      <View style={[styles.bottomBar, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.audioButton, { backgroundColor: colors.buttonBackground }]}
          onPress={handleVoiceInput}
        >
          <AudioIcon size={24} color={colors.buttonText} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.aiButton,
            {
              backgroundColor: colors.primary,
              opacity: isAILoading ? 0.6 : 1,
            },
          ]}
          onPress={handleAIBreakdown}
          disabled={!thoughts.trim() || isAILoading}
        >
          <BreakDownIcon size={24} color={colors.background} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.saveButton,
            {
              backgroundColor: colors.buttonBackground,
            },
          ]}
          onPress={handleSave}
          disabled={!thoughts.trim()}
        >
          <Text style={[styles.saveIcon, { color: colors.buttonText }]}>✓</Text>
        </TouchableOpacity>
      </View>

      {/* Save Options Modal */}
      <PopupBg
        visible={showSaveOptions}
        onRequestClose={() => setShowSaveOptions(false)}
        size="large"
        color={colors.surface}
        showSkip={false}
        closeOnOutsideTap={true}
      >
        {/* Main Content Container - Child of PopupBg */}
        <View style={[styles.popupContent, { width: '100%' }]}>
          {/* Title Section - Child of Content */}
          <View style={styles.popupTitleSection}>
            <Text style={[styles.modalTitle, { 
              color: colors.text,
              fontSize: getResponsiveSize(18, 20, 24)
            }]}>
              How would you like to save your thoughts?
            </Text>
          </View>

          {/* Options Grid Section - Child of Content */}
          <View style={styles.saveOptionsGrid}>
            <View style={styles.saveOptionsRow}>
              <OptionsCard
                title="Create To-Do List"
                color={colors.surface}
                borderColor={colors.border}
                size="small"
                style={{ width: '45%', marginHorizontal: '2.5%', marginVertical: 8 }}
                onPress={() => handleSaveAsType('todo')}
              />
              <OptionsCard
                title="Save as Task"
                color={colors.surface}
                borderColor={colors.border}
                size="small"
                style={{ width: '45%', marginHorizontal: '2.5%', marginVertical: 8 }}
                onPress={() => handleSaveAsType('task')}
              />
            </View>
            <View style={styles.saveOptionsRow}>
              <OptionsCard
                title="Save as Note"
                color={colors.surface}
                borderColor={colors.border}
                size="small"
                style={{ width: '45%', marginHorizontal: '2.5%', marginVertical: 8 }}
                onPress={() => handleSaveAsType('note')}
              />
              <OptionsCard
                title="Save as Journal Entry"
                color={colors.surface}
                borderColor={colors.border}
                size="small"
                style={{ width: '45%', marginHorizontal: '2.5%', marginVertical: 8 }}
                onPress={() => handleSaveAsType('journal')}
              />
            </View>
          </View>

          {/* Cancel Button Section - Child of Content */}
          <View style={styles.cancelButtonSection}>
            <TouchableOpacity
              style={[styles.cancelButton, { 
                borderColor: colors.border,
                width: vw(80),
                paddingVertical: getResponsiveSize(10, 12, 14)
              }]}
              onPress={() => setShowSaveOptions(false)}
            >
              <Text style={[styles.cancelButtonText, { 
                color: colors.textSecondary,
                fontSize: getResponsiveSize(14, 16, 18)
              }]}>
                Cancel
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </PopupBg>



      {/* Save Work Modal */}
      {/* This component is not defined in the original file, so it will be removed or commented out */}
      {/* <SaveWorkModal
        visible={showSaveWorkModal}
        onClose={closeSaveWorkModal}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onSkip={handleSkip}
        onSignInLink={handleSignInLink}
      /> */}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
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
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  thoughtsInput: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    textAlignVertical: 'top',
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  audioButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomIcon: {
    fontSize: 20,
  },
  saveButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveIcon: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  aiButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },


  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginBottom: 20,
    width: '100%',
  },

  saveOptionsList: {
    width: '100%',
    marginBottom: 20,
  },
  saveOptionsGrid: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  saveOptionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 0,
  },
  cancelButton: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginTop: 8,
    width: '90%',
    alignSelf: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    width: '100%',
  },
  popupContent: {
    alignItems: 'center',
    padding: 12,
  },
  popupTitleSection: {
    width: '100%',
    marginBottom: 12,
  },
  cancelButtonSection: {
    width: '100%',
    marginTop: 4,
  },
}); 