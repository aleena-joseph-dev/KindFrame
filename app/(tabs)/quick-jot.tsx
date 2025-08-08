import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AudioIcon from '@/components/ui/AudioIcon';
import BreakDownIcon from '@/components/ui/BreakDownIcon';
import { OptionsCard } from '@/components/ui/OptionsCard';
import { PopupBg } from '@/components/ui/PopupBg';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { SaveWorkModal } from '@/components/ui/SaveWorkModal';
import { TopBar } from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestData } from '@/hooks/useGuestData';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { AIService } from '@/services/aiService';
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
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  const { 
    isGuestMode, 
    createQuickJot, 
    promptSignIn, 
    showSaveWorkModal, 
    closeSaveWorkModal,
    handleGoogleSignIn,
    handleEmailSignIn,
    handleSkip,
    handleSignInLink
  } = useGuestData();
  const { session } = useAuth();
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

          // Check if user is in guest mode and show popup
      if (isGuestMode && !session) {
        promptSignIn();
        return;
      }

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
    try {
      // Save each subtask as a todo
      for (const subtask of aiSubtasks) {
        await createQuickJot({
          content: subtask,
          type: 'todo',
          category: 'AI Generated'
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
      // You could show a success message here
    } catch (error) {
      console.error('❌ Error saving subtasks:', error);
    }
  };

  const handleSaveIndividualSubtask = async (subtask: string, type: QuickJotEntry['type']) => {
    try {
      await createQuickJot({
        content: subtask,
        type,
        category: 'AI Generated'
      });
      
      console.log('✅ Individual subtask saved:', subtask, 'as', type);
      // You could show a success message here
    } catch (error) {
      console.error('❌ Error saving individual subtask:', error);
    }
  };

  const handleSaveAllSubtasks = async (type: QuickJotEntry['type']) => {
    try {
      // Save each subtask as the specified type
      for (const subtask of aiSubtasks) {
        await createQuickJot({
          content: subtask,
          type,
          category: 'AI Generated'
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
      console.log('✅ All subtasks saved as', type);
      // You could show a success message here
    } catch (error) {
      console.error('❌ Error saving all subtasks as', type, ':', error);
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

      // Check if user is in guest mode and show popup
      if (isGuestMode && !session) {
        promptSignIn();
        setShowSaveOptions(false);
        return;
      }

      // Use guest data hook for saving
      await createQuickJot(entry);

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
        promptSignIn();
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
      <SaveWorkModal
        visible={showSaveWorkModal}
        onClose={closeSaveWorkModal}
        onGoogleSignIn={handleGoogleSignIn}
        onEmailSignIn={handleEmailSignIn}
        onSkip={handleSkip}
        onSignInLink={handleSignInLink}
      />
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