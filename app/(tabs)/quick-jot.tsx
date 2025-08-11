import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
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
import { TranscriptionService, type UploadProgress } from '@/services/transcriptionService';

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
  
  // Enhanced audio/speech-to-text state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [extractedTasks, setExtractedTasks] = useState<any[]>([]);
  
  // Web Speech API state
  const [webSpeechAPI, setWebSpeechAPI] = useState<any>(null);
  const [isWebSpeechSupported, setIsWebSpeechSupported] = useState(false);
  
  // Animation values for recording indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize audio session and Web Speech API
  useEffect(() => {
    const initializeAudio = async () => {
      if (Platform.OS === 'web') {
        // Initialize Web Speech API for web
        console.log('🎤 AUDIO: Initializing Web Speech API...');
        const api = TranscriptionService.initializeWebSpeechAPI(
          (text, isFinal) => {
            if (isFinal && text.trim()) {
              console.log('🎤 WEB SPEECH: Final result:', text);
              setTranscriptionText(text);
              setShowTranscriptionModal(true);
            } else if (text.trim()) {
              console.log('🎤 WEB SPEECH: Interim result:', text);
              // Optionally show interim results in UI
            }
          },
          (error) => {
            console.error('🎤 WEB SPEECH: Error:', error);
            Alert.alert('Speech Recognition Error', error);
            setIsRecording(false);
          }
        );
        
        setWebSpeechAPI(api);
        setIsWebSpeechSupported(api.isSupported);
        
        if (api.isSupported) {
          console.log('✅ AUDIO: Web Speech API initialized');
        } else {
          console.log('⚠️ AUDIO: Web Speech API not supported, falling back to file recording');
        }
      } else {
        // Initialize Expo Audio for native platforms
        try {
          console.log('🎤 AUDIO: Initializing audio session...');
          await Audio.setAudioModeAsync({
            allowsRecordingIOS: false,
            playsInSilentModeIOS: true,
            shouldDuckAndroid: true,
            playThroughEarpieceAndroid: false,
            staysActiveInBackground: false,
          });
          console.log('✅ AUDIO: Audio session initialized');
        } catch (error) {
          console.error('❌ AUDIO: Failed to initialize audio session:', error);
        }
      }
    };

    initializeAudio();
  }, []);

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

  // Enhanced voice input with real speech-to-text
  const startRecording = async () => {
    try {
      console.log('🎤 AUDIO: Checking permissions...');
      console.log('🎤 AUDIO: Current permission status:', permissionResponse?.status);
      
      if (permissionResponse?.status !== 'granted') {
        console.log('🎤 AUDIO: Requesting microphone permission...');
        const permission = await requestPermission();
        console.log('🎤 AUDIO: Permission response:', permission);
        
        if (permission.status !== 'granted') {
          Alert.alert(
            'Microphone Permission Required', 
            'Please enable microphone access in your device settings to use voice recording.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => console.log('Open settings') }
            ]
          );
          return;
        }
      }

      console.log('🎤 AUDIO: Setting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
        staysActiveInBackground: false,
      });

      console.log('🎤 AUDIO: Creating recording...');
      const recording = new Audio.Recording();
      await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await recording.startAsync();
      
      setRecording(recording);
      setIsRecording(true);
      setRecordingDuration(0);
      setTranscriptionText('');

      // Start recording animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Start recording timer
      recordingTimer.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

      console.log('✅ AUDIO: Recording started successfully');
      
    } catch (err) {
      console.error('❌ AUDIO: Failed to start recording:', err);
      setIsRecording(false);
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      // Reset animation
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      Alert.alert(
        'Recording Error', 
        `Failed to start recording: ${err instanceof Error ? err.message : 'Unknown error'}. Please check microphone permissions and try again.`
      );
    }
  };

  const stopRecording = async () => {
    console.log('🎤 AUDIO: Stopping recording...');
    setIsRecording(false);
    
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }

    // Stop animation
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);

    if (!recording) {
      console.log('❌ AUDIO: No recording to stop');
      return;
    }

    try {
      console.log('🎤 AUDIO: Stopping and unloading recording...');
      await recording.stopAndUnloadAsync();
      
      console.log('🎤 AUDIO: Resetting audio mode...');
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });

      const uri = recording.getURI();
      console.log('✅ AUDIO: Recording stopped and stored at:', uri);
      
      setRecording(null);
      
      if (uri) {
        setIsTranscribing(true);
        console.log('🎤 AUDIO: Starting speech-to-text conversion...');
        
        // Process audio transcription
        await processAudioTranscription(uri);
      } else {
        console.log('❌ AUDIO: No audio URI found, skipping transcription');
        Alert.alert('Recording Error', 'No audio was recorded. Please try again.');
      }
      
    } catch (error) {
      console.error('❌ AUDIO: Error stopping recording:', error);
      Alert.alert('Error', `Failed to stop recording: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsTranscribing(false);
      setRecording(null);
    }
  };

  const processAudioTranscription = async (audioUri: string | null) => {
    if (!audioUri) {
      console.log('❌ AUDIO: No audio URI provided');
      setIsTranscribing(false);
      return;
    }

    try {
      console.log('🎤 AUDIO: Processing transcription for:', audioUri);
      setUploadProgress({ progress: 0, stage: 'uploading', message: 'Starting...' });
      
      const result = await TranscriptionService.processAudioFile(
        audioUri,
        (progress) => setUploadProgress(progress)
      );

      if (result.success && result.cleanedText) {
        console.log('✅ AUDIO: Transcription successful');
        setTranscriptionText(result.cleanedText);
        
        // Store extracted tasks if any
        if (result.tasks && result.tasks.length > 0) {
          setExtractedTasks(result.tasks);
          console.log('🎯 AUDIO: Found', result.tasks.length, 'tasks in transcription');
        }
        
        setShowTranscriptionModal(true);
      } else {
        console.error('❌ AUDIO: Transcription failed:', result.error);
        Alert.alert(
          'Transcription Error', 
          result.error || 'Failed to convert speech to text. Please try again.'
        );
      }
      
    } catch (error) {
      console.error('❌ AUDIO: Speech-to-text error:', error);
      Alert.alert('Transcription Error', 'Failed to convert speech to text. Please try again.');
    } finally {
      setIsTranscribing(false);
      setUploadProgress(null);
    }
  };



  const handleVoiceInput = async () => {
    if (isRecording) {
      if (Platform.OS === 'web' && webSpeechAPI && isWebSpeechSupported) {
        // Stop Web Speech API
        console.log('🎤 WEB SPEECH: Stopping...');
        webSpeechAPI.stop();
        setIsRecording(false);
        
        // Stop animation
        pulseAnim.stopAnimation();
        pulseAnim.setValue(1);
        
        if (recordingTimer.current) {
          clearInterval(recordingTimer.current);
          recordingTimer.current = null;
        }
        
        // Process the text if we have any
        if (transcriptionText.trim()) {
          setIsTranscribing(true);
          const result = await TranscriptionService.processText(transcriptionText);
          
          if (result.success && result.tasks && result.tasks.length > 0) {
            setExtractedTasks(result.tasks);
            console.log('🎯 WEB SPEECH: Found', result.tasks.length, 'tasks in text');
          }
          
          setIsTranscribing(false);
        }
      } else {
        await stopRecording();
      }
    } else {
      if (Platform.OS === 'web' && webSpeechAPI && isWebSpeechSupported) {
        // Start Web Speech API
        console.log('🎤 WEB SPEECH: Starting...');
        try {
          webSpeechAPI.start();
          setIsRecording(true);
          setRecordingDuration(0);
          setTranscriptionText('');
          
          // Start recording animation
          Animated.loop(
            Animated.sequence([
              Animated.timing(pulseAnim, {
                toValue: 1.3,
                duration: 1000,
                useNativeDriver: true,
              }),
              Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
              }),
            ])
          ).start();

          // Start recording timer
          recordingTimer.current = setInterval(() => {
            setRecordingDuration(prev => prev + 1);
          }, 1000);
          
        } catch (error) {
          console.error('🎤 WEB SPEECH: Failed to start:', error);
          Alert.alert('Speech Recognition Error', 'Failed to start speech recognition');
        }
      } else {
        await startRecording();
      }
    }
  };

  const acceptTranscription = () => {
    setThoughts(prev => prev + (prev ? ' ' : '') + transcriptionText);
    setShowTranscriptionModal(false);
    setTranscriptionText('');
  };

  const editTranscription = () => {
    setShowTranscriptionModal(false);
    setThoughts(prev => prev + (prev ? ' ' : '') + transcriptionText);
    // Focus will be automatically set to the text input
  };

  const discardTranscription = () => {
    setShowTranscriptionModal(false);
    setTranscriptionText('');
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
      
      // Navigate directly to the appropriate feature screen
      navigateToFeatureScreen(type);
    } catch (error) {
      console.error('Error saving quick jot:', error);
    }
  };

  const navigateToFeatureScreen = (type: QuickJotEntry['type']) => {
    const routes = {
      'task': '/(tabs)/todo',
      'todo': '/(tabs)/todo', 
      'note': '/(tabs)/notes',
      'journal': '/(tabs)/notes', // Journal entries go to notes
      'memory': '/(tabs)/core-memory',
      'dump': '/(tabs)/notes' // Default to notes
    };

    const targetRoute = routes[type] || '/(tabs)/notes';
    console.log(`🎯 QUICK-JOT: Navigating to ${targetRoute} after saving ${type}`);
    router.push(targetRoute as any);
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
        <View style={[styles.inputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <TextInput
            style={[
              styles.thoughtsInput,
              {
                color: colors.text,
                flex: 1,
              },
            ]}
            placeholder="Write your thoughts here or tap the microphone to speak..."
            placeholderTextColor={colors.textSecondary}
            value={thoughts}
            onChangeText={setThoughts}
            multiline
            textAlignVertical="top"
            autoFocus
          />
          
          {/* Microphone Icon next to input */}
          <TouchableOpacity
            style={[
              styles.microphoneButton,
              {
                backgroundColor: isRecording ? '#ef4444' : colors.primary,
              }
            ]}
            onPress={handleVoiceInput}
            disabled={isTranscribing}
          >
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <AudioIcon 
                size={20} 
                color={isRecording ? '#ffffff' : colors.buttonText} 
              />
            </Animated.View>
          </TouchableOpacity>
        </View>

        {/* Recording Status */}
        {isRecording && (
          <View style={[styles.recordingStatus, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.recordingIndicator}>
              <View style={[styles.recordingDot, { backgroundColor: '#ef4444' }]} />
              <Text style={[styles.recordingText, { color: colors.text }]}>
                Recording... {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <Text style={[styles.recordingHint, { color: colors.textSecondary }]}>
              Tap microphone again to stop
            </Text>
          </View>
        )}

        {/* Transcribing Status */}
        {isTranscribing && (
          <View style={[styles.transcribingStatus, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {uploadProgress ? (
              <>
                <Text style={[styles.transcribingText, { color: colors.text }]}>
                  {uploadProgress.message}
                </Text>
                <View style={[styles.progressBarContainer, { backgroundColor: colors.background }]}>
                  <View 
                    style={[
                      styles.progressBar, 
                      { 
                        backgroundColor: colors.primary,
                        width: `${uploadProgress.progress}%`
                      }
                    ]} 
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {uploadProgress.progress}% • {uploadProgress.stage}
                </Text>
              </>
            ) : (
              <>
                <Text style={[styles.transcribingText, { color: colors.text }]}>
                  Converting speech to text...
                </Text>
                <View style={styles.transcribingDots}>
                  <Text style={[styles.transcribingDot, { color: colors.primary }]}>●</Text>
                  <Text style={[styles.transcribingDot, { color: colors.primary }]}>●</Text>
                  <Text style={[styles.transcribingDot, { color: colors.primary }]}>●</Text>
                </View>
              </>
            )}
          </View>
        )}
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

      {/* Speech-to-Text Transcription Modal */}
      <PopupBg
        visible={showTranscriptionModal}
        onRequestClose={() => setShowTranscriptionModal(false)}
        size="large"
        color={colors.surface}
        showSkip={false}
        closeOnOutsideTap={false}
      >
        <View style={[styles.popupContent, { width: '100%' }]}>
          {/* Title Section */}
          <View style={styles.popupTitleSection}>
            <Text style={[styles.modalTitle, { 
              color: colors.text,
              fontSize: getResponsiveSize(18, 20, 24)
            }]}>
              Speech Transcription
            </Text>
          </View>

          {/* Transcription Text */}
          <View style={[styles.transcriptionContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
            <Text style={[styles.transcriptionLabel, { color: colors.textSecondary }]}>
              Transcribed Text:
            </Text>
            <Text style={[styles.transcriptionText, { color: colors.text }]}>
              {transcriptionText}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.transcriptionActions}>
            <TouchableOpacity
              style={[styles.transcriptionButton, styles.discardButton, { borderColor: '#ef4444' }]}
              onPress={discardTranscription}
            >
              <Text style={[styles.transcriptionButtonText, { color: '#ef4444' }]}>
                Discard
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.transcriptionButton, styles.editButton, { borderColor: colors.primary }]}
              onPress={editTranscription}
            >
              <Text style={[styles.transcriptionButtonText, { color: colors.primary }]}>
                Edit
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.transcriptionButton, styles.acceptButton, { backgroundColor: colors.primary }]}
              onPress={acceptTranscription}
            >
              <Text style={[styles.transcriptionButtonText, { color: colors.buttonText }]}>
                Accept
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.transcriptionHint, { color: colors.textSecondary }]}>
            Accept to add to your text, Edit to modify before adding, or Discard to remove.
          </Text>
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
  
  // New styles for enhanced audio input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  microphoneButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  recordingStatus: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  recordingHint: {
    fontSize: 14,
    textAlign: 'center',
  },
  transcribingStatus: {
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  transcribingText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  transcribingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  transcribingDot: {
    fontSize: 18,
    opacity: 0.7,
  },
  progressBarContainer: {
    width: '100%',
    height: 6,
    borderRadius: 3,
    marginVertical: 8,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
    transition: 'width 0.3s ease',
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 4,
  },
  
  // Transcription modal styles
  transcriptionContainer: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
  },
  transcriptionLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  transcriptionText: {
    fontSize: 16,
    lineHeight: 24,
  },
  transcriptionActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  transcriptionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  discardButton: {
    backgroundColor: 'transparent',
  },
  editButton: {
    backgroundColor: 'transparent',
  },
  acceptButton: {
    borderWidth: 0,
  },
  transcriptionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  transcriptionHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
}); 