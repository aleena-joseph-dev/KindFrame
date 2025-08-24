import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Animated, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import BreakDownIcon from '@/components/ui/BreakDownIcon';
import InfoIcon from '@/components/ui/InfoIcon';
import MicIcon from '@/components/ui/MicIcon';
import { PopupBg } from '@/components/ui/PopupBg';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import TextIcon from '@/components/ui/TextIcon';
import { VUMeter } from '@/components/ui/VUMeter';

import { useAuth } from '@/contexts/AuthContext';
import { useGuestData } from '@/contexts/GuestDataContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { useWebSpeech } from '@/lib/useWebSpeech';
import { DataService } from '@/services/dataService';
import { QuickJotService } from '@/services/quickJotService';
import { TranscriptionService, type UploadProgress } from '@/services/transcriptionService';
import { AnyItem, EventItem, TaskItem, TodoItem } from '../../lib/types';

interface QuickJotEntry {
  id: string;
  content: string;
  type: 'note' | 'todo' | 'task' | 'journal' | 'memory' | 'dump';
  createdAt: Date;
  category?: string;
}

// Reset Icon SVG Component
const ResetIcon = ({ size = 20, color = '#000000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
    <path d="M3 3v5h5"></path>
  </svg>
);

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
  const [thoughts, setThoughts] = useState<string>('');
  
  // Safe setter for thoughts to prevent non-string values
  const setThoughtsSafe = (value: string | ((prev: string) => string)) => {
    if (typeof value === 'function') {
      setThoughts(prev => {
        const result = value(prev);
        // Ensure the result is a valid string and doesn't contain problematic characters
        if (typeof result === 'string') {
          // Clean the string to prevent any potential text node issues
          return result.replace(/[^\w\s\n.,!?-]/g, '').trim();
        }
        return '';
      });
    } else {
      // Clean the input string to prevent any potential text node issues
      const cleanValue = typeof value === 'string' ? value.replace(/[^\w\s\n.,!?-]/g, '').trim() : '';
      setThoughts(cleanValue);
    }
  };
  const [showSaveOptions, setShowSaveOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const [isAILoading, setIsAILoading] = useState(false);

  const [inputMode, setInputMode] = useState<'text' | 'audio'>('text');
  const [showInfoModal, setShowInfoModal] = useState(false);

  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  
  // Session-based recording state
  const [recordingSession, setRecordingSession] = useState({
    isActive: false, // Whether we're in an active recording session
    isPaused: true,  // Whether recording is currently paused
    totalDuration: 0, // Total time recorded in this session
    segmentCount: 0  // Number of recording segments in this session
  });
  
  // Enhanced audio/speech-to-text state
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [transcriptionText, setTranscriptionText] = useState('');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [showTranscriptionModal, setShowTranscriptionModal] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);

  const [aiBreakdownItems, setAiBreakdownItems] = useState<any[]>([]);
  const [isAiBreakdownLoading, setIsAiBreakdownLoading] = useState(false);
  
  // Enhanced Web Speech API using custom hook
  const [hasUserStoppedRecording, setHasUserStoppedRecording] = useState(false);
  const userStoppedRecordingRef = useRef(false);
  
  // Memoized callbacks to prevent infinite re-renders
  const onInterim = useCallback((text: string) => {
    console.log('🎤 WEB SPEECH: Interim result:', text);
    // Optionally show interim results in UI
  }, []);

  const onFinal = useCallback(async (text: string) => {
    console.log('🎤 WEB SPEECH: Final result:', text);
    
    if (text && text.trim()) {
      const trimmedText = text.trim();
      
      // Check if user has already stopped recording
      if (userStoppedRecordingRef.current) {
        console.log('🎤 DEBUG: User already stopped recording, storing transcription for processing');
        // Store the transcription text for processing in stopRecording
        setTranscriptionText(trimmedText);
        currentTranscriptionRef.current = trimmedText;
      } else {
        // Store the transcription text but don't process it yet
        // It will only be processed when user stops recording
        setTranscriptionText(trimmedText);
        currentTranscriptionRef.current = trimmedText; // Store in ref for immediate access
        console.log('🎤 SESSION: Transcription stored, waiting for user to stop recording');
        console.log('🎤 DEBUG: Stored transcriptionText:', trimmedText);
        console.log('🎤 DEBUG: Stored in ref length:', currentTranscriptionRef.current.length);
      }
    } else {
      console.log('🎤 DEBUG: Empty or invalid transcription result:', text);
    }
  }, []);

  const onError = useCallback((error: string) => {
    console.error('🎤 WEB SPEECH: Error:', error);
    Alert.alert('Speech Recognition Error', error);
    setIsRecording(false);
  }, []);

  // Enhanced Web Speech with context-aware transcription
  const webSpeech = useWebSpeech({
    lang: "en-IN", // Default to en-IN as specified
    onInterim,
    onFinal,
    onError,
    keepAlive: true,
    enableMicConstraints: true
  });
  
  // Ensure webSpeech is properly initialized
  useEffect(() => {
    if (webSpeech && typeof webSpeech.isSupported === 'boolean') {
      console.log('🎤 DEBUG: webSpeech initialized successfully:', webSpeech.isSupported);
    } else {
      console.log('🎤 DEBUG: webSpeech not properly initialized:', webSpeech);
    }
  }, [webSpeech]);
  
  // Animation values for recording indicator
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const recordingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const segmentStartTime = useRef<number>(0);
  const currentTranscriptionRef = useRef<string>('');

  // Initialize audio session for native platforms only
  useEffect(() => {
    const initializeAudio = async () => {
      if (Platform.OS !== 'web') {
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
      setRecordingDuration(recordingSession.totalDuration); // Start from session duration
      // Don't clear transcription text when resuming - it will be processed when stopping

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
        // Update session state for native recording
        const segmentDuration = Math.floor((Date.now() - segmentStartTime.current) / 1000);
        setRecordingSession(prev => ({
          ...prev,
          isPaused: true,
          totalDuration: prev.totalDuration + segmentDuration
        }));
        
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
        
        // Directly append transcription to text
        appendTranscriptionToText(result.cleanedText);
        
        // Log extracted tasks if any (for debugging)
        if (result.tasks && result.tasks.items && result.tasks.items.length > 0) {
          console.log('🎯 AUDIO: Found', result.tasks.items.length, 'items in transcription');
        }
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
      // Stop current recording segment
      await stopRecordingSegment();
    } else {
      // Start new recording segment or resume session
      await startRecordingSegment();
    }
  };

  const startRecordingSegment = async () => {
    console.log('🎤 SESSION: Starting recording segment...');
    
    // Update session state
    setRecordingSession(prev => ({
      ...prev,
      isActive: true,
      isPaused: false,
      segmentCount: prev.segmentCount + 1
    }));
    
    segmentStartTime.current = Date.now();
    
    if (Platform.OS === 'web' && webSpeech && webSpeech.isSupported) {
      // Start Web Speech API
      try {
        userStoppedRecordingRef.current = false;
        setHasUserStoppedRecording(false);
        if (webSpeech && typeof webSpeech.start === 'function') {
          await webSpeech.start();
        }
        setIsRecording(true);
        // Don't clear transcription text when resuming - it will be processed when stopping
        
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

        // Start segment timer (starts from current session duration)
        setRecordingDuration(recordingSession.totalDuration);
        recordingTimer.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        
      } catch (error) {
        console.error('🎤 WEB SPEECH: Failed to start:', error);
        Alert.alert('Speech Recognition Error', 'Failed to start speech recognition');
      }
    } else {
      // For native recording, we need to update session state here too
      setRecordingSession(prev => ({
        ...prev,
        isActive: true,
        isPaused: false,
        segmentCount: prev.segmentCount + 1
      }));
      
      segmentStartTime.current = Date.now();
      await startRecording();
    }
  };

  const stopRecordingSegment = async () => {
    console.log('🎤 SESSION: Stopping recording segment...');
    console.log('🎤 DEBUG: Before stopping - transcriptionText state:', transcriptionText);
    console.log('🎤 DEBUG: Before stopping - transcriptionText ref:', currentTranscriptionRef.current);
    console.log('🎤 DEBUG: Before stopping - ref trim():', currentTranscriptionRef.current.trim());
    console.log('🎤 DEBUG: Before stopping - ref length:', currentTranscriptionRef.current.length);
    
    // Calculate segment duration
    const segmentDuration = Math.floor((Date.now() - segmentStartTime.current) / 1000);
    
    // Update session state (pause but keep session active)
    setRecordingSession(prev => ({
      ...prev,
      isPaused: true,
      totalDuration: prev.totalDuration + segmentDuration
    }));
    
    if (Platform.OS === 'web' && webSpeech && webSpeech.isSupported) {
      userStoppedRecordingRef.current = true;
      setHasUserStoppedRecording(true);
      
      setIsRecording(false);
      
      // Stop animation
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
      
      if (recordingTimer.current) {
        clearInterval(recordingTimer.current);
        recordingTimer.current = null;
      }
      
      // IMPORTANT: Stop speech recognition first, then wait for final result
      console.log('🎤 DEBUG: Stopping speech recognition...');
      if (webSpeech && typeof webSpeech.stop === 'function') {
        webSpeech.stop();
      }
      
      // Wait for any pending final results (give it a reasonable timeout)
      console.log('🎤 DEBUG: Waiting for final transcription result...');
      let finalTranscription = '';
      let attempts = 0;
      const maxAttempts = 10; // Wait up to 1 second
      
      while (attempts < maxAttempts && !finalTranscription) {
        await new Promise(resolve => setTimeout(resolve, 100)); // Wait 100ms
        attempts++;
        
        // Check if we got a final result
        const currentTranscription = currentTranscriptionRef.current?.trim() || transcriptionText.trim();
        if (currentTranscription && currentTranscription.length > 0) {
          finalTranscription = currentTranscription;
          console.log('🎤 DEBUG: Got final transcription after waiting:', finalTranscription);
          break;
        }
        
        console.log(`🎤 DEBUG: Waiting for transcription... attempt ${attempts}/${maxAttempts}`);
      }
      
      // Process the transcription if we got one
      if (finalTranscription) {
        console.log('🎤 SESSION: User stopped recording, processing transcription');
        console.log('🎤 DEBUG: Processing text:', finalTranscription);
        await processTranscription(finalTranscription);
        // Clear both ref and state after processing
        currentTranscriptionRef.current = '';
        setTranscriptionText('');
      } else {
        console.log('🎤 SESSION: No transcription text received after waiting');
        console.log('🎤 DEBUG: Final check - ref:', currentTranscriptionRef.current);
        console.log('🎤 DEBUG: Final check - state:', transcriptionText);
      }
    } else {
      await stopRecording();
    }
  };

  const appendTranscriptionToText = (transcribedText: string) => {
    if (!transcribedText || !transcribedText.trim()) return;
    
    console.log('🎤 DEBUG: appendTranscriptionToText called with:', transcribedText);
    console.log('🎤 DEBUG: Current thoughts length:', thoughts.length);
    
    // Clean the transcribed text to prevent any potential text node issues
    const cleanTranscribedText = transcribedText.replace(/[^\w\s\n.,!?-]/g, '').trim();
    
    setThoughtsSafe(prev => {
      // Ensure both prev and transcribedText are valid strings
      const safePrev = typeof prev === 'string' ? prev : '';
      const safeTranscribed = cleanTranscribedText;
      
      if (!safeTranscribed) return safePrev;
      
      const newThoughts = !safePrev.trim() ? safeTranscribed : safePrev + '\n' + safeTranscribed;
      console.log('🎤 DEBUG: New thoughts length:', newThoughts.length);
      return newThoughts;
    });
    
    setTranscriptionText('');
    userStoppedRecordingRef.current = false;
    setHasUserStoppedRecording(false);
    
    console.log('🎤 DEBUG: Transcription appended successfully');
    
    // Note: Do NOT switch modes - preserve user's chosen mode
  };

  const resetRecordingSession = () => {
    setRecordingSession({
      isActive: false,
      isPaused: true,
      totalDuration: 0,
      segmentCount: 0
    });
    setRecordingDuration(0);
  };

  const processTranscription = async (text: string) => {
    if (!text || !text.trim()) return;
    
    console.log('🎤 SESSION: Processing transcription:', text);
    console.log('🎤 DEBUG: Text length:', text.length);
    console.log('🎤 DEBUG: Text trimmed:', text.trim());
    
    // Clean the text to prevent any potential text node issues
    const cleanText = text.replace(/[^\w\s\n.,!?-]/g, '').trim();
    
    // Simply append transcription to text - AI breakdown happens when user clicks the button
    console.log('🎤 DEBUG: Appending transcription to text...');
    appendTranscriptionToText(cleanText);
  };

  const handleSave = () => {
    if (!safeTextContent(thoughts)) {
      return;
    }
    
    // Always show simplified save options modal (Journal or Note)
    setShowSaveOptions(true);
  };

  const handleAIBreakdown = async () => {
    if (!safeTextContent(thoughts)) {
      return;
    }
    
    // Prevent duplicate calls
    if (isAiBreakdownLoading) {
      console.log('🎤 DEBUG: AI breakdown already in progress, ignoring duplicate call');
      return;
    }
    
    console.log('🎤 DEBUG: handleAIBreakdown called with thoughts:', thoughts);
    console.log('🎤 DEBUG: Clean text for AI:', getCleanTextForAI(thoughts));
    
    setIsAiBreakdownLoading(true);
    
    try {
      // Try Edge Function with optimized timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout (reduced from 8s)
      
      try {
        const response = await fetch(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/ai-breakdown`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            polishedText: getCleanTextForAI(thoughts),
            tz: "Asia/Kolkata"
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        
        console.log('🎤 DEBUG: Edge Function response status:', response.status);
        console.log('🎤 DEBUG: Edge Function response ok:', response.ok);
        
        if (response.ok) {
          const result = await response.json();
          console.log('🎤 DEBUG: Edge Function result:', result);
          console.log('🎤 DEBUG: Result has tasks:', !!result.tasks);
          console.log('🎤 DEBUG: Result has todos:', !!result.todos);
          console.log('🎤 DEBUG: Result has events:', !!result.events);
          
          if (result.tasks || result.todos || result.events) {
            // Convert the new API structure to our existing format
            const convertedItems = convertBreakdownToItems(result);
            console.log('🎤 DEBUG: Setting AI breakdown items:', convertedItems);
            setAiBreakdownItems(convertedItems);
            
            // Structure the data properly for the results page
            const structuredData = {
              tasks: convertedItems.filter(item => item.type === 'task'),
              todos: convertedItems.filter(item => item.type === 'todo'),
              events: convertedItems.filter(item => item.type === 'event')
            };
            
            console.log('🎤 DEBUG: Structured data for results page:', structuredData);
            console.log('🎤 DEBUG: Tasks count:', structuredData.tasks.length);
            console.log('🎤 DEBUG: Todos count:', structuredData.todos.length);
            console.log('🎤 DEBUG: Events count:', structuredData.events.length);
            console.log('🎤 DEBUG: All converted items types:', convertedItems.map(item => ({ title: item.title, type: item.type })));
            
            // Navigate to results page
            console.log('🎤 DEBUG: Navigating to AI breakdown results page');
            router.push({
              pathname: '/(tabs)/ai-breakdown-results',
              params: { items: JSON.stringify(structuredData) }
            });
            console.log('✅ AI Breakdown Edge Function successful:', convertedItems.length, 'items');
            return;
          } else {
            console.log('🎤 DEBUG: Edge Function returned empty results, falling back to client-side');
          }
        } else {
          console.log('🎤 DEBUG: Edge Function response not ok, status:', response.status);
        }
      } catch (edgeError) {
        clearTimeout(timeoutId);
        if (edgeError.name === 'AbortError') {
          console.log('⏰ Edge Function timeout (5s), using client-side breakdown');
        } else {
          console.log('❌ Edge Function error, using client-side breakdown:', edgeError.message);
        }
      }
      
      // Fallback to enhanced client-side breakdown
      console.log('🔄 Using enhanced client-side breakdown as fallback');
      console.log('🎤 DEBUG: About to call performMockBreakdown with:', getCleanTextForAI(thoughts));
      
      const mockItems = performMockBreakdown(getCleanTextForAI(thoughts));
      console.log('🎤 DEBUG: performMockBreakdown returned:', mockItems);
      
      setAiBreakdownItems(mockItems);
      
      // Structure the data properly for the results page
      const structuredData = {
        tasks: mockItems.filter(item => item.type === 'task'),
        todos: mockItems.filter(item => item.type === 'todo'),
        events: mockItems.filter(item => item.type === 'event')
      };
      
      console.log('🎤 DEBUG: Structured data for results page (fallback):', structuredData);
      
      router.push({
        pathname: '/(tabs)/ai-breakdown-results',
        params: { items: JSON.stringify(structuredData) }
      });
      console.log('✅ Enhanced breakdown successful:', mockItems.length, 'items');
      
    } catch (error) {
      console.error('❌ AI breakdown error:', error);
      console.log('🔄 Using enhanced client-side breakdown as fallback');
      console.log('🎤 DEBUG: About to call performMockBreakdown with:', getCleanTextForAI(thoughts));
      
      const mockItems = performMockBreakdown(getCleanTextForAI(thoughts));
      console.log('🎤 DEBUG: performMockBreakdown returned:', mockItems);
      
      setAiBreakdownItems(mockItems);
      
      // Structure the data properly for the results page
      const structuredData = {
        tasks: mockItems.filter(item => item.type === 'task'),
        todos: mockItems.filter(item => item.type === 'todo'),
        events: mockItems.filter(item => item.type === 'event')
      };
      
      console.log('🎤 DEBUG: Structured data for results page (fallback):', structuredData);
      
      router.push({
        pathname: '/(tabs)/ai-breakdown-results',
        params: { items: JSON.stringify(structuredData) }
      });
      console.log('✅ Enhanced breakdown successful:', mockItems.length, 'items');
    } finally {
      setIsAiBreakdownLoading(false);
    }
  };

  // Enhanced category detection with more sophisticated patterns
  const determineCategory = (text: string): string => {
    const lowerText = text.toLowerCase();
    
    // Work & Professional
    if (lowerText.includes('work') || lowerText.includes('office') || lowerText.includes('job') || 
        lowerText.includes('meeting') || lowerText.includes('project') || lowerText.includes('client') ||
        lowerText.includes('deadline') || lowerText.includes('presentation') || lowerText.includes('report') ||
        lowerText.includes('email') || lowerText.includes('call') || lowerText.includes('conference')) {
      return 'work';
    }
    
    // Home & Family
    else if (lowerText.includes('home') || lowerText.includes('house') || lowerText.includes('family') || 
             lowerText.includes('kids') || lowerText.includes('children') || lowerText.includes('spouse') ||
             lowerText.includes('kitchen') || lowerText.includes('bedroom') || lowerText.includes('garden') ||
             lowerText.includes('cleaning') || lowerText.includes('laundry') || lowerText.includes('cooking')) {
      return 'home';
    }
    
    // Health & Wellness
    else if (lowerText.includes('health') || lowerText.includes('doctor') || lowerText.includes('exercise') || 
             lowerText.includes('gym') || lowerText.includes('workout') || lowerText.includes('diet') ||
             lowerText.includes('medicine') || lowerText.includes('appointment') || lowerText.includes('checkup') ||
             lowerText.includes('yoga') || lowerText.includes('meditation') || lowerText.includes('sleep')) {
      return 'health';
    }
    
    // Shopping & Retail
    else if (lowerText.includes('shopping') || lowerText.includes('buy') || lowerText.includes('purchase') || 
             lowerText.includes('store') || lowerText.includes('mall') || lowerText.includes('online') ||
             lowerText.includes('amazon') || lowerText.includes('groceries') || lowerText.includes('clothes') ||
             lowerText.includes('electronics') || lowerText.includes('gift')) {
      return 'shopping';
    }
    
    // Finance & Money
    else if (lowerText.includes('finance') || lowerText.includes('money') || lowerText.includes('bill') || 
             lowerText.includes('bank') || lowerText.includes('payment') || lowerText.includes('budget') ||
             lowerText.includes('investment') || lowerText.includes('savings') || lowerText.includes('credit') ||
             lowerText.includes('loan') || lowerText.includes('tax') || lowerText.includes('insurance')) {
      return 'finance';
    }
    
    // Travel & Transportation
    else if (lowerText.includes('travel') || lowerText.includes('trip') || lowerText.includes('vacation') || 
             lowerText.includes('flight') || lowerText.includes('hotel') || lowerText.includes('car') ||
             lowerText.includes('train') || lowerText.includes('bus') || lowerText.includes('airport') ||
             lowerText.includes('booking') || lowerText.includes('reservation') || lowerText.includes('destination')) {
      return 'travel';
    }
    
    // Education & Learning
    else if (lowerText.includes('study') || lowerText.includes('learn') || lowerText.includes('course') || 
             lowerText.includes('book') || lowerText.includes('reading') || lowerText.includes('school') ||
             lowerText.includes('university') || lowerText.includes('class') || lowerText.includes('homework') ||
             lowerText.includes('research') || lowerText.includes('skill')) {
      return 'education';
    }
    
    // Social & Relationships
    else if (lowerText.includes('friend') || lowerText.includes('party') || lowerText.includes('dinner') || 
             lowerText.includes('date') || lowerText.includes('birthday') || lowerText.includes('celebration') ||
             lowerText.includes('visit') || lowerText.includes('chat') || lowerText.includes('message') ||
             lowerText.includes('social') || lowerText.includes('network')) {
      return 'social';
    }
    
    // Technology & Digital
    else if (lowerText.includes('computer') || lowerText.includes('phone') || lowerText.includes('app') || 
             lowerText.includes('software') || lowerText.includes('update') || lowerText.includes('backup') ||
             lowerText.includes('password') || lowerText.includes('internet') || lowerText.includes('website') ||
             lowerText.includes('digital') || lowerText.includes('tech')) {
      return 'technology';
    }
    
    // Personal Development
    else if (lowerText.includes('goal') || lowerText.includes('plan') || lowerText.includes('improve') || 
             lowerText.includes('habit') || lowerText.includes('routine') || lowerText.includes('motivation') ||
             lowerText.includes('success') || lowerText.includes('achievement') || lowerText.includes('challenge') ||
             lowerText.includes('growth') || lowerText.includes('mindset')) {
      return 'personal';
    }
    
    else {
      return 'personal';
    }
  };

  // Helper function to fix tags based on content
  const fixTags = (title: string, originalTags: string[]) => {
    if (!title || typeof title !== 'string') {
      return originalTags || [];
    }
    
    const lowerTitle = title.toLowerCase();
    const tags = [...(originalTags || [])];
    
    // Remove 'Casual' tag for professional items
    if (lowerTitle.includes('doctor') || 
        lowerTitle.includes('appointment') || 
        lowerTitle.includes('meeting') ||
        lowerTitle.includes('work') ||
        lowerTitle.includes('business') ||
        lowerTitle.includes('professional') ||
        lowerTitle.includes('client') ||
        lowerTitle.includes('patient') ||
        lowerTitle.includes('customer')) {
      // Remove 'Casual' if present
      const casualIndex = tags.indexOf('Casual');
      if (casualIndex > -1) {
        tags.splice(casualIndex, 1);
      }
      // Add 'Professional' if not present
      if (!tags.includes('Professional')) {
        tags.push('Professional');
      }
    }
    
    return tags;
  };

  // Convert AI breakdown to structured items
  const convertBreakdownToItems = (breakdown: any) => {
    console.log('🎤 DEBUG: convertBreakdownToItems called with:', breakdown);
    
    if (!breakdown || typeof breakdown !== 'object') {
      console.log('🎤 DEBUG: Invalid breakdown, returning empty array');
      return [];
    }
    
    const items: AnyItem[] = [];
    
    // Process tasks - respect AI's categorization
    if (breakdown.tasks && Array.isArray(breakdown.tasks)) {
      console.log('🎤 DEBUG: Processing', breakdown.tasks.length, 'tasks from AI');
      breakdown.tasks.forEach((task: any, index: number) => {
        if (!task || typeof task !== 'object') return;
        
        console.log('🎤 DEBUG: Processing task:', task);
        console.log('🎤 DEBUG: Task text field:', task.text);
        console.log('🎤 DEBUG: Task title field:', task.title);
        console.log('🎤 DEBUG: Task description field:', task.description);
        
        // Fix: Use the correct field for title - AI sends 'text' not 'title'
        const title = task.text || task.title || task.description || `Task ${index + 1}`;
        console.log('🎤 DEBUG: Final title for task:', title);
        
        const fixedTags = fixTags(title, task.tags || []);
        // Respect AI's categorization - don't override with determineItemType
        const itemType = 'task';
        console.log('🎤 DEBUG: Keeping AI categorization as task for:', title);
        
        const { targetDate, targetTime, whenText, isoString } = setDefaultDateTime(task, itemType);
        
        const taskItem: TaskItem = {
          type: 'task',
          title: title.trim(),
          notes: task.notes || task.text || task.description || '',
          priority: task.priority || 'normal',
          tags: fixedTags,
          due: {
            date: targetDate,
            time: targetTime,
            iso: isoString,
            when_text: whenText,
            tz: 'Asia/Kolkata'
          }
        };
        items.push(taskItem);
        console.log('🎤 DEBUG: Added task item:', taskItem);
      });
    }
    
    // Process todos - respect AI's categorization
    if (breakdown.todos && Array.isArray(breakdown.todos)) {
      console.log('🎤 DEBUG: Processing', breakdown.todos.length, 'todos from AI');
      breakdown.todos.forEach((todo: any, index: number) => {
        if (!todo || typeof todo !== 'object') return;
        
        console.log('🎤 DEBUG: Processing todo:', todo);
        console.log('🎤 DEBUG: Todo text field:', todo.text);
        console.log('🎤 DEBUG: Todo title field:', todo.title);
        console.log('🎤 DEBUG: Todo description field:', todo.description);
        
        // Fix: Use the correct field for title - AI sends 'text' not 'title'
        const title = todo.text || todo.title || todo.description || `Todo ${index + 1}`;
        console.log('🎤 DEBUG: Final title for todo:', title);
        
        const fixedTags = fixTags(title, todo.tags || []);
        // Respect AI's categorization - don't override with determineItemType
        const itemType = 'todo';
        console.log('🎤 DEBUG: Keeping AI categorization as todo for:', title);
        
        const { targetDate, targetTime, whenText, isoString } = setDefaultDateTime(todo, itemType);
        
        const todoItem: TodoItem = {
          type: 'todo',
          title: title.trim(),
          notes: todo.notes || todo.text || todo.description || '',
          priority: todo.priority || 'normal',
          tags: fixedTags,
          due: {
            date: targetDate,
            time: targetTime,
            iso: isoString,
            when_text: whenText,
            tz: 'Asia/Kolkata'
          }
        };
        items.push(todoItem);
        console.log('🎤 DEBUG: Added todo item:', todoItem);
      });
    }
    
    // Process events - respect AI's categorization
    if (breakdown.events && Array.isArray(breakdown.events)) {
      console.log('🎤 DEBUG: Processing', breakdown.events.length, 'events from AI');
      breakdown.events.forEach((event: any, index: number) => {
        if (!event || typeof event !== 'object') return;
        
        console.log('🎤 DEBUG: Processing event:', event);
        console.log('🎤 DEBUG: Event text field:', event.text);
        console.log('🎤 DEBUG: Event title field:', event.title);
        console.log('🎤 DEBUG: Event description field:', event.description);
        
        // Fix: Use the correct field for title - AI sends 'text' not 'title'
        const title = event.text || event.title || event.description || `Event ${index + 1}`;
        console.log('🎤 DEBUG: Final title for event:', title);
        
        const fixedTags = fixTags(title, event.tags || []);
        // Respect AI's categorization - don't override with determineItemType
        const itemType = 'event';
        console.log('🎤 DEBUG: Keeping AI categorization as event for:', title);
        
        const { targetDate, targetTime, whenText, isoString } = setDefaultDateTime(event, itemType);
        
        const eventItem: EventItem = {
          type: 'event',
          title: title.trim(),
          notes: event.notes || event.text || event.description || '',
          priority: event.priority || 'normal',
          tags: fixedTags,
          start: {
            date: targetDate,
            time: targetTime,
            iso: isoString,
            when_text: whenText,
            tz: 'Asia/Kolkata'
          },
          end: {
            date: targetDate,
            time: targetTime,
            iso: isoString,
            when_text: whenText,
            tz: 'Asia/Kolkata'
          }
        };
        items.push(eventItem);
        console.log('🎤 DEBUG: Added event item:', eventItem);
      });
    }
    
    console.log('🎤 DEBUG: convertBreakdownToItems returning items:', items);
    console.log('🎤 DEBUG: Final item types:', items.map(item => ({ title: item.title, type: item.type })));
    return items;
  };

  // Enhanced fallback breakdown function for better results
  const performMockBreakdown = (text: string) => {
    console.log('🎤 DEBUG: performMockBreakdown called with text:', text);
    console.log('🎤 DEBUG: Text length:', text.length);
    console.log('🎤 DEBUG: Text type:', typeof text);
    
    const items = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    console.log('🎤 DEBUG: Split sentences:', sentences);
    
    for (const sentence of sentences) {
      const trimmedSentence = sentence.trim();
      if (trimmedSentence.length < 5) continue;

      const lowerSentence = trimmedSentence.toLowerCase();
      
      // Enhanced task detection with more sophisticated patterns
      if (lowerSentence.includes('need to') || 
          lowerSentence.includes('have to') || 
          lowerSentence.includes('must') ||
          lowerSentence.includes('should') ||
          lowerSentence.includes('want to') ||
          lowerSentence.includes('plan to') ||
          lowerSentence.includes('gotta') ||
          lowerSentence.includes('going to') ||
          lowerSentence.includes('intend to') ||
          lowerSentence.includes('aim to') ||
          lowerSentence.includes('hope to') ||
          lowerSentence.includes('wish to') ||
          lowerSentence.includes('desire to') ||
          lowerSentence.includes('strive to') ||
          lowerSentence.includes('commit to') ||
          lowerSentence.includes('decide to') ||
          lowerSentence.includes('choose to') ||
          lowerSentence.includes('agree to') ||
          lowerSentence.includes('promise to')) {
        
        // Enhanced priority detection
        let priority = 'medium';
        let confidence = 0.9;
        
        // High priority indicators
        if (lowerSentence.includes('urgent') || 
            lowerSentence.includes('asap') || 
            lowerSentence.includes('immediately') ||
            lowerSentence.includes('now') ||
            lowerSentence.includes('today') ||
            lowerSentence.includes('deadline') ||
            lowerSentence.includes('critical') ||
            lowerSentence.includes('emergency') ||
            lowerSentence.includes('priority') ||
            lowerSentence.includes('important') ||
            lowerSentence.includes('essential')) {
          priority = 'high';
          confidence = 0.95;
        } 
        // Low priority indicators
        else if (lowerSentence.includes('later') || 
                 lowerSentence.includes('someday') || 
                 lowerSentence.includes('maybe') ||
                 lowerSentence.includes('eventually') ||
                 lowerSentence.includes('when possible') ||
                 lowerSentence.includes('if time') ||
                 lowerSentence.includes('optional')) {
          priority = 'low';
          confidence = 0.85;
        }
        
        const itemType = determineItemType(trimmedSentence, [determineCategory(lowerSentence)]);
        const taskItem = {
          type: itemType,
          title: trimmedSentence,
          notes: trimmedSentence,
          priority: priority,
          tags: [determineCategory(lowerSentence)],
          due: itemType === 'event' ? null : {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          },
          start: itemType === 'event' ? {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          } : null,
          end: itemType === 'event' ? {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          } : null
        };
        items.push(setDefaultDateTime(taskItem, itemType));
      } 
      // Enhanced event detection with time and activity patterns
      else if (lowerSentence.includes('meeting') || 
               lowerSentence.includes('appointment') || 
               lowerSentence.includes('call') ||
               lowerSentence.includes('visit') ||
               lowerSentence.includes('go to') ||
               lowerSentence.includes('attend') ||
               lowerSentence.includes('schedule') ||
               lowerSentence.includes('tomorrow') ||
               lowerSentence.includes('today') ||
               lowerSentence.includes('next week') ||
               lowerSentence.includes('at ') ||
               lowerSentence.includes('on ') ||
               lowerSentence.includes('this evening') ||
               lowerSentence.includes('tonight') ||
               lowerSentence.includes('morning') ||
               lowerSentence.includes('afternoon') ||
               lowerSentence.includes('evening') ||
               lowerSentence.includes('weekend') ||
               lowerSentence.includes('monday') ||
               lowerSentence.includes('tuesday') ||
               lowerSentence.includes('wednesday') ||
               lowerSentence.includes('thursday') ||
               lowerSentence.includes('friday') ||
               lowerSentence.includes('saturday') ||
               lowerSentence.includes('sunday') ||
               lowerSentence.includes('january') ||
               lowerSentence.includes('february') ||
               lowerSentence.includes('march') ||
               lowerSentence.includes('april') ||
               lowerSentence.includes('may') ||
               lowerSentence.includes('june') ||
               lowerSentence.includes('july') ||
               lowerSentence.includes('august') ||
               lowerSentence.includes('september') ||
               lowerSentence.includes('october') ||
               lowerSentence.includes('november') ||
               lowerSentence.includes('december') ||
               lowerSentence.includes('party') ||
               lowerSentence.includes('celebration') ||
               lowerSentence.includes('dinner') ||
               lowerSentence.includes('lunch') ||
               lowerSentence.includes('breakfast') ||
               lowerSentence.includes('conference') ||
               lowerSentence.includes('workshop') ||
               lowerSentence.includes('seminar') ||
               lowerSentence.includes('webinar') ||
               lowerSentence.includes('interview') ||
               lowerSentence.includes('date') ||
               lowerSentence.includes('wedding') ||
               lowerSentence.includes('birthday') ||
               lowerSentence.includes('anniversary') ||
               lowerSentence.includes('doctor') ||
               lowerSentence.includes('medical') ||
               lowerSentence.includes('clinic') ||
               lowerSentence.includes('hospital') ||
               lowerSentence.includes('therapy') ||
               lowerSentence.includes('consultation') ||
               lowerSentence.includes('checkup') ||
               lowerSentence.includes('examination') ||
               lowerSentence.includes('procedure') ||
               lowerSentence.includes('surgery') ||
               lowerSentence.includes('treatment') ||
               lowerSentence.includes('session') ||
               lowerSentence.includes('class') ||
               lowerSentence.includes('lesson') ||
               lowerSentence.includes('training') ||
               lowerSentence.includes('workshop') ||
               lowerSentence.includes('lecture') ||
               lowerSentence.includes('presentation') ||
               lowerSentence.includes('demo') ||
               lowerSentence.includes('show') ||
               lowerSentence.includes('concert') ||
               lowerSentence.includes('movie') ||
               lowerSentence.includes('theater') ||
               lowerSentence.includes('museum') ||
               lowerSentence.includes('exhibition') ||
               lowerSentence.includes('tour') ||
               lowerSentence.includes('trip') ||
               lowerSentence.includes('flight') ||
               lowerSentence.includes('train') ||
               lowerSentence.includes('bus') ||
               lowerSentence.includes('car') ||
               lowerSentence.includes('drive') ||
               lowerSentence.includes('walk') ||
               lowerSentence.includes('run') ||
               lowerSentence.includes('exercise') ||
               lowerSentence.includes('workout') ||
               lowerSentence.includes('gym') ||
               lowerSentence.includes('yoga') ||
               lowerSentence.includes('meditation') ||
               lowerSentence.includes('massage') ||
               lowerSentence.includes('spa') ||
               lowerSentence.includes('salon') ||
               lowerSentence.includes('haircut') ||
               lowerSentence.includes('manicure') ||
               lowerSentence.includes('pedicure') ||
               lowerSentence.includes('facial') ||
               lowerSentence.includes('waxing') ||
               lowerSentence.includes('tattoo') ||
               lowerSentence.includes('piercing')) {
        
        // Determine if it's a recurring event
        let isRecurring = false;
        if (lowerSentence.includes('every') || 
            lowerSentence.includes('weekly') || 
            lowerSentence.includes('monthly') ||
            lowerSentence.includes('daily') ||
            lowerSentence.includes('bi-weekly') ||
            lowerSentence.includes('quarterly') ||
            lowerSentence.includes('annually')) {
          isRecurring = true;
        }
        
        const itemType = determineItemType(trimmedSentence, [determineCategory(lowerSentence)]);
        const eventItem = {
          type: itemType,
          title: trimmedSentence,
          notes: trimmedSentence,
          tags: [determineCategory(lowerSentence)],
          due: itemType === 'event' ? null : {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          },
          start: itemType === 'event' ? {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          } : null,
          end: itemType === 'event' ? {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          } : null
        };
        items.push(setDefaultDateTime(eventItem, itemType));
      } 
      // Enhanced todo detection with more actionable patterns
      else if (lowerSentence.includes('buy') || 
               lowerSentence.includes('get') || 
               lowerSentence.includes('find') ||
               lowerSentence.includes('check') ||
               lowerSentence.includes('review') ||
               lowerSentence.includes('update') ||
               lowerSentence.includes('order') ||
               lowerSentence.includes('purchase') ||
               lowerSentence.includes('clean') ||
               lowerSentence.includes('organize') ||
               lowerSentence.includes('fix') ||
               lowerSentence.includes('repair') ||
               lowerSentence.includes('install') ||
               lowerSentence.includes('download') ||
               lowerSentence.includes('upload') ||
               lowerSentence.includes('backup') ||
               lowerSentence.includes('sync') ||
               lowerSentence.includes('configure') ||
               lowerSentence.includes('setup') ||
               lowerSentence.includes('arrange') ||
               lowerSentence.includes('sort') ||
               lowerSentence.includes('pack') ||
               lowerSentence.includes('unpack') ||
               lowerSentence.includes('move') ||
               lowerSentence.includes('transfer') ||
               lowerSentence.includes('copy') ||
               lowerSentence.includes('print') ||
               lowerSentence.includes('scan') ||
               lowerSentence.includes('email') ||
               lowerSentence.includes('text') ||
               lowerSentence.includes('call') ||
               lowerSentence.includes('message') ||
               lowerSentence.includes('book') ||
               lowerSentence.includes('reserve') ||
               lowerSentence.includes('cancel') ||
               lowerSentence.includes('confirm') ||
               lowerSentence.includes('verify') ||
               lowerSentence.includes('test') ||
               lowerSentence.includes('try') ||
               lowerSentence.includes('experiment') ||
               lowerSentence.includes('research') ||
               lowerSentence.includes('investigate') ||
               lowerSentence.includes('explore') ||
               lowerSentence.includes('discover') ||
               lowerSentence.includes('create') ||
               lowerSentence.includes('make') ||
               lowerSentence.includes('build') ||
               lowerSentence.includes('design') ||
               lowerSentence.includes('plan') ||
               lowerSentence.includes('prepare') ||
               lowerSentence.includes('cook') ||
               lowerSentence.includes('bake') ||
               lowerSentence.includes('wash') ||
               lowerSentence.includes('fold') ||
               lowerSentence.includes('iron') ||
               lowerSentence.includes('mow') ||
               lowerSentence.includes('water') ||
               lowerSentence.includes('plant') ||
               lowerSentence.includes('harvest')) {
        
        // Enhanced priority detection for todos
        let priority = 'medium';
        let confidence = 0.8;
        
        if (lowerSentence.includes('urgent') || 
            lowerSentence.includes('asap') || 
            lowerSentence.includes('critical') ||
            lowerSentence.includes('emergency') ||
            lowerSentence.includes('broken') ||
            lowerSentence.includes('leaking') ||
            lowerSentence.includes('out of') ||
            lowerSentence.includes('empty') ||
            lowerSentence.includes('expired')) {
          priority = 'high';
          confidence = 0.9;
        } else if (lowerSentence.includes('someday') || 
                   lowerSentence.includes('maybe') ||
                   lowerSentence.includes('if possible') ||
                   lowerSentence.includes('nice to have') ||
                   lowerSentence.includes('optional')) {
          priority = 'low';
          confidence = 0.7;
        }
        
        const itemType = determineItemType(trimmedSentence, [determineCategory(lowerSentence)]);
        const todoItem = {
          type: itemType,
          title: trimmedSentence,
          notes: trimmedSentence,
          priority: priority,
          tags: [determineCategory(lowerSentence)],
          due: itemType === 'event' ? null : {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          },
          start: itemType === 'event' ? {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          } : null,
          end: itemType === 'event' ? {
            date: null,
            time: null,
            iso: null,
            when_text: null,
            tz: 'Asia/Kolkata'
          } : null
        };
        items.push(setDefaultDateTime(todoItem, itemType));
      } 
      // Enhanced note detection with more cognitive patterns
      else if (lowerSentence.includes('remember') || 
               lowerSentence.includes('note') || 
               lowerSentence.includes('think') ||
               lowerSentence.includes('idea') || 
               lowerSentence.includes('thought') ||
               lowerSentence.includes('feel') ||
               lowerSentence.includes('believe') ||
               lowerSentence.includes('wonder') ||
               lowerSentence.includes('hope') ||
               lowerSentence.includes('wish') ||
               lowerSentence.includes('realize') ||
               lowerSentence.includes('understand') ||
               lowerSentence.includes('learn') ||
               lowerSentence.includes('discover') ||
               lowerSentence.includes('notice') ||
               lowerSentence.includes('observe') ||
               lowerSentence.includes('realize') ||
               lowerSentence.includes('imagine') ||
               lowerSentence.includes('dream') ||
               lowerSentence.includes('fantasize') ||
               lowerSentence.includes('reflect') ||
               lowerSentence.includes('consider') ||
               lowerSentence.includes('evaluate') ||
               lowerSentence.includes('analyze') ||
               lowerSentence.includes('examine') ||
               lowerSentence.includes('study') ||
               lowerSentence.includes('research') ||
               lowerSentence.includes('investigate') ||
               lowerSentence.includes('explore') ||
               lowerSentence.includes('experience') ||
               lowerSentence.includes('enjoy') ||
               lowerSentence.includes('love') ||
               lowerSentence.includes('hate') ||
               lowerSentence.includes('fear') ||
               lowerSentence.includes('worry') ||
               lowerSentence.includes('concern') ||
               lowerSentence.includes('excite') ||
               lowerSentence.includes('inspire') ||
               lowerSentence.includes('motivate') ||
               lowerSentence.includes('encourage') ||
               lowerSentence.includes('support') ||
               lowerSentence.includes('help') ||
               lowerSentence.includes('assist') ||
               lowerSentence.includes('guide') ||
               lowerSentence.includes('teach') ||
               lowerSentence.includes('share') ||
               lowerSentence.includes('connect') ||
               lowerSentence.includes('relate') ||
               lowerSentence.includes('compare') ||
               lowerSentence.includes('contrast') ||
               lowerSentence.includes('similar') ||
               lowerSentence.includes('different') ||
               lowerSentence.includes('better') ||
               lowerSentence.includes('worse') ||
               lowerSentence.includes('improve') ||
               lowerSentence.includes('change') ||
               lowerSentence.includes('grow') ||
               lowerSentence.includes('develop') ||
               lowerSentence.includes('evolve') ||
               lowerSentence.includes('progress') ||
               lowerSentence.includes('succeed') ||
               lowerSentence.includes('achieve') ||
               lowerSentence.includes('accomplish') ||
               lowerSentence.includes('complete') ||
               lowerSentence.includes('finish') ||
               lowerSentence.includes('start') ||
               lowerSentence.includes('begin') ||
               lowerSentence.includes('continue') ||
               lowerSentence.includes('stop') ||
               lowerSentence.includes('end') ||
               lowerSentence.includes('pause') ||
               lowerSentence.includes('resume') ||
               lowerSentence.includes('repeat') ||
               lowerSentence.includes('practice') ||
               lowerSentence.includes('train') ||
               lowerSentence.includes('exercise') ||
               lowerSentence.includes('workout') ||
               lowerSentence.includes('meditate') ||
               lowerSentence.includes('breathe') ||
               lowerSentence.includes('relax') ||
               lowerSentence.includes('rest') ||
               lowerSentence.includes('sleep') ||
               lowerSentence.includes('wake') ||
               lowerSentence.includes('dream') ||
               lowerSentence.includes('nightmare') ||
               lowerSentence.includes('memory') ||
               lowerSentence.includes('forget') ||
               lowerSentence.includes('recall') ||
               lowerSentence.includes('remind') ||
               lowerSentence.includes('suggest') ||
               lowerSentence.includes('recommend') ||
               lowerSentence.includes('advise') ||
               lowerSentence.includes('warn') ||
               lowerSentence.includes('caution') ||
               lowerSentence.includes('alert') ||
               lowerSentence.includes('inform') ||
               lowerSentence.includes('tell') ||
               lowerSentence.includes('say') ||
               lowerSentence.includes('speak') ||
               lowerSentence.includes('talk') ||
               lowerSentence.includes('discuss') ||
               lowerSentence.includes('debate') ||
               lowerSentence.includes('argue') ||
               lowerSentence.includes('agree') ||
               lowerSentence.includes('disagree') ||
               lowerSentence.includes('compromise') ||
               lowerSentence.includes('negotiate') ||
               lowerSentence.includes('bargain') ||
               lowerSentence.includes('trade') ||
               lowerSentence.includes('exchange') ||
               lowerSentence.includes('swap') ||
               lowerSentence.includes('replace') ||
               lowerSentence.includes('substitute') ||
               lowerSentence.includes('alternative') ||
               lowerSentence.includes('option') ||
               lowerSentence.includes('choice') ||
               lowerSentence.includes('decision') ||
               lowerSentence.includes('select') ||
               lowerSentence.includes('pick') ||
               lowerSentence.includes('choose') ||
               lowerSentence.includes('prefer') ||
               lowerSentence.includes('like') ||
               lowerSentence.includes('dislike') ||
               lowerSentence.includes('enjoy') ||
               lowerSentence.includes('appreciate') ||
               lowerSentence.includes('value') ||
               lowerSentence.includes('treasure') ||
               lowerSentence.includes('cherish') ||
               lowerSentence.includes('protect') ||
               lowerSentence.includes('defend') ||
               lowerSentence.includes('guard') ||
               lowerSentence.includes('secure') ||
               lowerSentence.includes('safe') ||
               lowerSentence.includes('dangerous') ||
               lowerSentence.includes('risky') ||
               lowerSentence.includes('careful') ||
               lowerSentence.includes('cautious') ||
               lowerSentence.includes('brave') ||
               lowerSentence.includes('courageous') ||
               lowerSentence.includes('fearless') ||
               lowerSentence.includes('confident') ||
               lowerSentence.includes('sure') ||
               lowerSentence.includes('certain') ||
               lowerSentence.includes('doubt') ||
               lowerSentence.includes('question') ||
               lowerSentence.includes('ask') ||
               lowerSentence.includes('wonder') ||
               lowerSentence.includes('curious') ||
               lowerSentence.includes('interested') ||
               lowerSentence.includes('excited') ||
               lowerSentence.includes('thrilled') ||
               lowerSentence.includes('amazed') ||
               lowerSentence.includes('surprised') ||
               lowerSentence.includes('shocked') ||
               lowerSentence.includes('stunned') ||
               lowerSentence.includes('impressed') ||
               lowerSentence.includes('proud') ||
               lowerSentence.includes('satisfied') ||
               lowerSentence.includes('content') ||
               lowerSentence.includes('happy') ||
               lowerSentence.includes('joyful') ||
               lowerSentence.includes('cheerful') ||
               lowerSentence.includes('glad') ||
               lowerSentence.includes('pleased') ||
               lowerSentence.includes('delighted') ||
               lowerSentence.includes('ecstatic') ||
               lowerSentence.includes('elated') ||
               lowerSentence.includes('overjoyed') ||
               lowerSentence.includes('blessed') ||
               lowerSentence.includes('fortunate') ||
               lowerSentence.includes('lucky') ||
               lowerSentence.includes('grateful') ||
               lowerSentence.includes('thankful') ||
               lowerSentence.includes('appreciative') ||
               lowerSentence.includes('blessed') ||
               lowerSentence.includes('fortunate') ||
               lowerSentence.includes('lucky') ||
               lowerSentence.includes('grateful') ||
               lowerSentence.includes('thankful') ||
               lowerSentence.includes('appreciative')) {
        
        // Enhanced confidence scoring for notes
        let confidence = 0.75;
        if (lowerSentence.includes('important') || 
            lowerSentence.includes('key') || 
            lowerSentence.includes('essential') ||
            lowerSentence.includes('critical') ||
            lowerSentence.includes('vital') ||
            lowerSentence.includes('crucial')) {
          confidence = 0.9;
        } else if (lowerSentence.includes('maybe') || 
                   lowerSentence.includes('possibly') ||
                   lowerSentence.includes('perhaps') ||
                   lowerSentence.includes('might') ||
                   lowerSentence.includes('could') ||
                   lowerSentence.includes('would')) {
          confidence = 0.6;
        }
        
        items.push({
          type: 'note',
          title: trimmedSentence,
          description: trimmedSentence,
          category: determineCategory(lowerSentence),
          confidence: confidence
        });
      } 
      // Fallback for longer meaningful sentences
      else if (trimmedSentence.length > 20) {
        items.push({
          type: 'note',
          title: trimmedSentence.substring(0, 80) + (trimmedSentence.length > 80 ? '...' : ''),
          description: trimmedSentence,
          confidence: 0.6
        });
      }
    }

    // If no items found, create a general note
    if (items.length === 0) {
      items.push({
        type: 'note',
        title: text.substring(0, 80) + (text.length > 80 ? '...' : ''),
        description: text,
        confidence: 0.5
      });
    }

    // Sort items by confidence (highest first)
    items.sort((a, b) => b.confidence - a.confidence);

    console.log('🎤 DEBUG: performMockBreakdown returning items:', items);
    console.log('🎤 DEBUG: Items count:', items.length);

    return items;
  };



  const handleSaveIndividualSubtask = async (subtask: string, type: QuickJotEntry['type']) => {
    try {
      // For authenticated users, save to database based on type
      if (type === 'todo' || type === 'task') {
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
      
      // Show success message
      setSavedCount(1);
      setShowSavedMessage(true);
      
      // Reset the Quick Jot screen to clean state
      handleRefresh();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSavedMessage(false);
        setSavedCount(0);
      }, 3000);
      
      console.log(`✅ Individual subtask saved as ${getTypeDisplayName(type)}`);
    } catch (error) {
      console.error('Error saving individual item:', error);
      Alert.alert('Error', 'Failed to save item');
    }
  };

  const handleSaveAllSubtasks = async (type: QuickJotEntry['type']) => {
    try {
      // Save each breakdown item as the specified type
      for (const item of aiBreakdownItems) {
        if (type === 'todo') {
          await DataService.createTodo({
            title: item.title,
            description: item.description || item.title,
            is_completed: false,
            priority: item.priority || 'medium',
            category: item.category || 'personal'
          });
        } else if (type === 'note') {
          await DataService.createNote({
            title: item.title,
            content: item.description || item.title,
            category: item.category || 'personal'
          });
        }
      }
      
      // Show success message
      setSavedCount(aiBreakdownItems.length);
      setShowSavedMessage(true);
      
      // Reset the Quick Jot screen to clean state
      handleRefresh();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSavedMessage(false);
        setSavedCount(0);
      }, 3000);
      
      console.log(`✅ All ${aiBreakdownItems.length} items saved as ${getTypeDisplayName(type)}`);
    } catch (error) {
      console.error('Error saving all breakdown items:', error);
      Alert.alert('Error', 'Failed to save all items');
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
            thoughts
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
      resetRecordingSession(); // Reset recording session after saving
      
      console.log(`✅ Quick jot saved as ${getTypeDisplayName(type)}`);
      
      // Show success message
      setSavedCount(1);
      setShowSavedMessage(true);
      
      // Reset the Quick Jot screen to clean state and stay here
      handleRefresh();
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSavedMessage(false);
        setSavedCount(0);
      }, 3000);
      
      // Show success message (optional)
      console.log('🔄 Quick Jot screen reset and ready for new input');
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
    setShowInfoModal(true);
  };

  const handleRefresh = () => {
    // Clear all input and reset state
    setThoughts('');
    setTranscriptionText('');
    setAiBreakdownItems([]);
    setIsAiBreakdownLoading(false);
    setIsRecording(false);
    setIsTranscribing(false);
    setRecordingDuration(0);
    setInputMode('text');
    setShowSaveOptions(false);
    setShowInfoModal(false);
    setShowTranscriptionModal(false);
    setIsProcessing(false);
    setHasUserStoppedRecording(false);
    
    // Reset recording session
    setRecordingSession({
      isActive: false,
      isPaused: true,
      totalDuration: 0,
      segmentCount: 0
    });
    
    // Clear any ongoing processes
    if (recordingTimer.current) {
      clearInterval(recordingTimer.current);
      recordingTimer.current = null;
    }
    
    // Reset animation
    if (pulseAnim) {
      pulseAnim.stopAnimation();
      pulseAnim.setValue(1);
    }
    
    // Clear recording
    setRecording(null);
    setUploadProgress(null);
    
    // Reset refs
    userStoppedRecordingRef.current = false;
    currentTranscriptionRef.current = '';
    segmentStartTime.current = 0;
    
    console.log('🔄 Quick Jot refreshed - all inputs cleared');
  };



  const handleQuickJotBack = () => {
    if (safeTextContent(thoughts)) {
      // In guest mode, show popup instead of auto-saving
      if (isGuestMode && !session) {
        // promptSignIn(); // This function is no longer used here
        return;
      }
    }
    handleBack();
  };

  // Pre-calculate time strings to prevent text node issues
  const sessionTimeString = `${Math.floor((recordingSession.totalDuration || 0) / 60).toString().padStart(2, '0')}:${((recordingSession.totalDuration || 0) % 60).toString().padStart(2, '0')}`;
  const recordingTimeString = `${Math.floor((recordingDuration || 0) / 60).toString().padStart(2, '0')}:${((recordingDuration || 0) % 60).toString().padStart(2, '0')}`;
  const progressWidth = uploadProgress ? uploadProgress.progress : 0;
  const progressText = uploadProgress ? `${uploadProgress.progress}% • ${uploadProgress.stage}` : '';
  
  // Debug logging to track thoughts state
  console.log('🎤 DEBUG: Thoughts state type:', typeof thoughts, 'value:', thoughts);
  console.log('🎤 DEBUG: webSpeech object:', webSpeech);
  
  // Helper function to safely render text content for display
  const safeTextContent = (text: any): string => {
    if (typeof text === 'string') {
      // Only remove truly problematic characters, preserve all letters and common punctuation
      const cleaned = text.replace(/[^\w\s\n.,!?\-()]/g, '').trim();
      console.log('🎤 DEBUG: safeTextContent input:', text, 'output:', cleaned);
      return cleaned;
    }
    console.log('🎤 DEBUG: safeTextContent non-string input:', text);
    return '';
  };
  
  // Helper function to get clean text for AI processing (less aggressive sanitization)
  const getCleanTextForAI = (text: any): string => {
    if (typeof text === 'string') {
      // Only remove control characters and truly problematic symbols, preserve all letters
      const cleaned = text.replace(/[\x00-\x1F\x7F]/g, '').trim();
      console.log('🎤 DEBUG: getCleanTextForAI input:', text, 'output:', cleaned);
      return cleaned;
    }
    return '';
  };

  // Helper function to set default dates and times
  const setDefaultDateTime = (item: any, type: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    // Parse AI's when_time field if available
    let targetDate = today;
    let targetTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    let whenText = 'today';
    
    // PRIORITY 1: Use AI's parsed when_time if available
    if (item.when_time) {
      console.log('🎯 DEBUG: Parsing AI when_time:', item.when_time, 'type:', typeof item.when_time);
      
      // Handle different when_time formats from AI
      if (typeof item.when_time === 'string') {
        // Format: "43000 PM" (HHMMSS format) or "16:00" (24-hour) or "2:00 PM" (12-hour)
        console.log('🎯 DEBUG: Processing string when_time:', item.when_time);
        
        // Check if it's in HHMMSS format (like "43000 PM")
        const hhmmssMatch = item.when_time.match(/^(\d{1,2})(\d{2})(\d{2})\s*(AM|PM)?$/i);
        if (hhmmssMatch) {
          const hourPart = parseInt(hhmmssMatch[1]);
          const minutePart = parseInt(hhmmssMatch[2]);
          const secondPart = parseInt(hhmmssMatch[3]);
          const period = hhmmssMatch[4]?.toUpperCase();
          
          console.log('🎯 DEBUG: Parsed HHMMSS time parts:', { hourPart, minutePart, secondPart, period });
          
          if (hourPart >= 1 && hourPart <= 12 && minutePart >= 0 && minutePart <= 59) {
            // Convert to 24-hour format
            let hours24 = hourPart;
            
            // Handle AM/PM conversion
            if (period === 'PM' && hourPart !== 12) {
              hours24 = hourPart + 12; // 1-11 PM becomes 13-23
            } else if (period === 'AM' && hourPart === 12) {
              hours24 = 0; // 12 AM becomes 00
            }
            
            targetTime = `${hours24.toString().padStart(2, '0')}:${minutePart.toString().padStart(2, '0')}`;
            console.log('🎯 DEBUG: Converted HHMMSS to 24-hour format:', targetTime);
          }
        } else {
          // Check if it's already in 24-hour format (HH:MM)
          const time24Match = item.when_time.match(/^(\d{1,2}):(\d{2})$/);
          if (time24Match) {
            const hours = parseInt(time24Match[1]);
            const minutes = time24Match[2];
            
            if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
              targetTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
              console.log('🎯 DEBUG: Already 24-hour format, using as-is:', targetTime);
            }
          } else {
            // Check if it's in 12-hour format (H:MM AM/PM)
            const time12Match = item.when_time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (time12Match) {
              let hours = parseInt(time12Match[1]);
              const minutes = time12Match[2];
              const period = time12Match[3]?.toUpperCase();
              
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              
              targetTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
              console.log('🎯 DEBUG: Converted 12-hour to 24-hour:', targetTime);
            }
          }
        }
      } else if (typeof item.when_time === 'number') {
        // Legacy format: 103000 (HHMMSS format)
        const timeStr = item.when_time.toString().padStart(6, '0');
        const hourPart = parseInt(timeStr.substring(0, 2));
        const minutePart = parseInt(timeStr.substring(2, 4));
        const secondPart = parseInt(timeStr.substring(4, 6));
        
        console.log('🎯 DEBUG: Parsed legacy time parts:', { hourPart, minutePart, secondPart });
        
        if (hourPart >= 1 && hourPart <= 12 && minutePart >= 0 && minutePart <= 59) {
          // Convert to 24-hour format
          let hours24 = hourPart;
          
          // Since AI sends PM, we need to convert to 24-hour
          if (hourPart === 12) {
            hours24 = 12; // 12 PM stays 12
          } else {
            hours24 = hourPart + 12; // 1-11 PM becomes 13-23
          }
          
          targetTime = `${hours24.toString().padStart(2, '0')}:${minutePart.toString().padStart(2, '0')}`;
          console.log('🎯 DEBUG: Converted legacy to 24-hour format:', targetTime);
        }
      }
    }
    
    // PRIORITY 2: Use AI's when_text for date if available
    if (item.when_text) {
      const whenTextLower = item.when_text.toLowerCase();
      console.log('🎯 DEBUG: Parsing AI when_text:', item.when_text);
      
      if (whenTextLower.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        targetDate = tomorrow.toISOString().split('T')[0];
        whenText = 'tomorrow';
        console.log('🎯 DEBUG: Set date to tomorrow:', targetDate);
      } else if (whenTextLower.includes('day after tomorrow')) {
        const dayAfterTomorrow = new Date();
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
        targetDate = dayAfterTomorrow.toISOString().split('T')[0];
        whenText = 'day after tomorrow';
        console.log('🎯 DEBUG: Set date to day after tomorrow:', targetDate);
      } else if (whenTextLower.includes('next week')) {
        const nextWeek = new Date();
        nextWeek.setDate(nextWeek.getDate() + 7);
        targetDate = nextWeek.toISOString().split('T')[0];
        whenText = 'next week';
        console.log('🎯 DEBUG: Set date to next week:', targetDate);
      } else if (whenTextLower.includes('next monday') || whenTextLower.includes('next mon')) {
        const nextMonday = new Date();
        const currentDay = nextMonday.getDay();
        const daysToAdd = (1 - currentDay + 7) % 7;
        nextMonday.setDate(nextMonday.getDate() + daysToAdd);
        targetDate = nextMonday.toISOString().split('T')[0];
        whenText = 'next monday';
        console.log('🎯 DEBUG: Set date to next monday:', targetDate);
      } else if (whenTextLower.includes('next tuesday') || whenTextLower.includes('next tue')) {
        const nextTuesday = new Date();
        const currentDay = nextTuesday.getDay();
        const daysToAdd = (2 - currentDay + 7) % 7;
        nextTuesday.setDate(nextTuesday.getDate() + daysToAdd);
        targetDate = nextTuesday.toISOString().split('T')[0];
        whenText = 'next tuesday';
        console.log('🎯 DEBUG: Set date to next tuesday:', targetDate);
      } else if (whenTextLower.includes('next wednesday') || whenTextLower.includes('next wed')) {
        const nextWednesday = new Date();
        const currentDay = nextWednesday.getDay();
        const daysToAdd = (3 - currentDay + 7) % 7;
        nextWednesday.setDate(nextWednesday.getDate() + daysToAdd);
        targetDate = nextWednesday.toISOString().split('T')[0];
        whenText = 'next wednesday';
        console.log('🎯 DEBUG: Set date to next wednesday:', targetDate);
      } else if (whenTextLower.includes('next thursday') || whenTextLower.includes('next thu')) {
        const nextThursday = new Date();
        const currentDay = nextThursday.getDay();
        const daysToAdd = (4 - currentDay + 7) % 7;
        nextThursday.setDate(nextThursday.getDate() + daysToAdd);
        targetDate = nextThursday.toISOString().split('T')[0];
        whenText = 'next thursday';
        console.log('🎯 DEBUG: Set date to next thursday:', targetDate);
      } else if (whenTextLower.includes('next friday') || whenTextLower.includes('next fri')) {
        const nextFriday = new Date();
        const currentDay = nextFriday.getDay();
        const daysToAdd = (5 - currentDay + 7) % 7;
        nextFriday.setDate(nextFriday.getDate() + daysToAdd);
        targetDate = nextFriday.toISOString().split('T')[0];
        whenText = 'next friday';
        console.log('🎯 DEBUG: Set date to next friday:', targetDate);
      } else if (whenTextLower.includes('next saturday') || whenTextLower.includes('next sat')) {
        const nextSaturday = new Date();
        const currentDay = nextSaturday.getDay();
        const daysToAdd = (6 - currentDay + 7) % 7;
        nextSaturday.setDate(nextSaturday.getDate() + daysToAdd);
        targetDate = nextSaturday.toISOString().split('T')[0];
        whenText = 'next saturday';
        console.log('🎯 DEBUG: Set date to next saturday:', targetDate);
      } else if (whenTextLower.includes('next sunday') || whenTextLower.includes('next sun')) {
        const nextSunday = new Date();
        const currentDay = nextSunday.getDay();
        const daysToAdd = (0 - currentDay + 7) % 7;
        nextSunday.setDate(nextSunday.getDate() + daysToAdd);
        targetDate = nextSunday.toISOString().split('T')[0];
        whenText = 'next sunday';
        console.log('🎯 DEBUG: Set date to next sunday:', targetDate);
      } else if (whenTextLower.includes('today')) {
        targetDate = today;
        whenText = 'today';
        console.log('🎯 DEBUG: Set date to today:', targetDate);
      }
    }
    
    // PRIORITY 3: Fallback to parsing title if AI didn't provide time
    if (!item.when_time && item.title) {
      const title = item.title.toLowerCase();
      console.log('🎯 DEBUG: No AI when_time, parsing title for time:', title);
      
      // Check for specific time expressions in title
      if (title.includes('at 2:00') || title.includes('at 2:00 pm') || title.includes('at 2 pm')) {
        targetTime = '14:00';
      } else if (title.includes('at 3:00') || title.includes('at 3:00 pm') || title.includes('at 3 pm')) {
        targetTime = '15:00';
      } else if (title.includes('at 4:00') || title.includes('at 4:00 pm') || title.includes('at 4 pm')) {
        targetTime = '16:00';
      } else if (title.includes('at 5:00') || title.includes('at 5:00 pm') || title.includes('at 5 pm')) {
        targetTime = '17:00';
      } else if (title.includes('at 6:00') || title.includes('at 6:00 pm') || title.includes('at 6 pm')) {
        targetTime = '18:00';
      } else if (title.includes('at 7:00') || title.includes('at 7:00 pm') || title.includes('at 7 pm')) {
        targetTime = '19:00';
      } else if (title.includes('at 8:00') || title.includes('at 8:00 pm') || title.includes('at 8 pm')) {
        targetTime = '20:00';
      } else if (title.includes('at 9:00') || title.includes('at 9:00 pm') || title.includes('at 9 pm')) {
        targetTime = '21:00';
      } else if (title.includes('at 10:00') || title.includes('at 10:00 pm') || title.includes('at 10 pm')) {
        targetTime = '22:00';
      } else if (title.includes('at 11:00') || title.includes('at 11:00 pm') || title.includes('at 11 pm')) {
        targetTime = '23:00';
      } else if (title.includes('at 12:00') || title.includes('at 12:00 pm') || title.includes('at noon')) {
        targetTime = '12:00';
      } else if (title.includes('at 1:00') || title.includes('at 1:00 pm') || title.includes('at 1 pm')) {
        targetTime = '13:00';
      } else if (title.includes('at 12:00 am') || title.includes('at midnight')) {
        targetTime = '00:00';
      } else if (title.includes('at 1:00 am') || title.includes('at 1 am')) {
        targetTime = '01:00';
      } else if (title.includes('at 2:00 am') || title.includes('at 2 am')) {
        targetTime = '02:00';
      } else if (title.includes('at 3:00 am') || title.includes('at 3 am')) {
        targetTime = '03:00';
      } else if (title.includes('at 4:00 am') || title.includes('at 4 am')) {
        targetTime = '04:00';
      } else if (title.includes('at 5:00 am') || title.includes('at 5 am')) {
        targetTime = '05:00';
      } else if (title.includes('at 6:00 am') || title.includes('at 6 am')) {
        targetTime = '06:00';
      } else if (title.includes('at 7:00 am') || title.includes('at 7 am')) {
        targetTime = '07:00';
      } else if (title.includes('at 8:00 am') || title.includes('at 8 am')) {
        targetTime = '08:00';
      } else if (title.includes('at 9:00 am') || title.includes('at 9 am')) {
        targetTime = '09:00';
      } else if (title.includes('at 10:00 am') || title.includes('at 10 am')) {
        targetTime = '10:00';
      } else if (title.includes('at 11:00 am') || title.includes('at 11 am')) {
        targetTime = '11:00';
      }
    }
    
    // Create ISO string for the target date and time
    const targetDateTime = new Date(`${targetDate}T${targetTime}:00`);
    const isoString = targetDateTime.toISOString();
    
    console.log('🎯 DEBUG: Final parsed datetime:', { targetDate, targetTime, whenText, isoString });
    
    if (type === 'todo') {
      // Todos should have today's date by default, or parsed date
      if (!item.due?.date && !item.due?.iso) {
        item.due = {
          date: targetDate,
          time: targetTime,
          iso: isoString,
          when_text: whenText,
          tz: 'Asia/Kolkata'
        };
      }
    } else if (type === 'event') {
      // Events should have start time if missing
      if (!item.start?.date && !item.start?.iso) {
        item.start = {
          date: targetDate,
          time: targetTime,
          iso: isoString,
          when_text: whenText,
          tz: 'Asia/Kolkata'
        };
      }
      // Set end time to 1 hour after start if missing
      if (!item.end?.date && !item.end?.iso) {
        const endDateTime = new Date(targetDateTime.getTime() + 60 * 60 * 1000); // +1 hour
        item.end = {
          date: endDateTime.toISOString().split('T')[0],
          time: endDateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
          iso: endDateTime.toISOString(),
          when_text: `${whenText} +1 hour`,
          tz: 'Asia/Kolkata'
        };
      }
    } else if (type === 'task') {
      // Tasks can have due date if specified, otherwise optional
      if (item.due?.when_text && !item.due?.date && !item.due?.iso) {
        // Parse relative time expressions
        const whenText = item.due.when_text.toLowerCase();
        if (whenText.includes('today')) {
          item.due.date = targetDate;
          item.due.time = targetTime;
          item.due.iso = isoString;
        } else if (whenText.includes('tomorrow')) {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          item.due.date = tomorrow.toISOString().split('T')[0];
          item.due.time = targetTime;
          item.due.iso = tomorrow.toISOString().split('T')[0] + 'T' + targetTime + ':00';
        }
      }
    }
    
    return { targetDate, targetTime, whenText, isoString };
  };

  // Enhanced categorization logic
  const determineItemType = (title: string, tags: string[]) => {
    if (!title || typeof title !== 'string') {
      return 'todo'; // Default fallback
    }
    
    const lowerTitle = title.toLowerCase();
    
    // Events - things that happen at specific times
    if (lowerTitle.includes('appointment') || 
        lowerTitle.includes('meeting') || 
        lowerTitle.includes('call') ||
        lowerTitle.includes('visit') ||
        lowerTitle.includes('go to') ||
        lowerTitle.includes('attend') ||
        lowerTitle.includes('schedule') ||
        lowerTitle.includes('party') ||
        lowerTitle.includes('celebration') ||
        lowerTitle.includes('dinner') ||
        lowerTitle.includes('lunch') ||
        lowerTitle.includes('breakfast') ||
        lowerTitle.includes('conference') ||
        lowerTitle.includes('workshop') ||
        lowerTitle.includes('seminar') ||
        lowerTitle.includes('webinar') ||
        lowerTitle.includes('interview') ||
        lowerTitle.includes('date') ||
        lowerTitle.includes('wedding') ||
        lowerTitle.includes('birthday') ||
        lowerTitle.includes('anniversary') ||
        lowerTitle.includes('doctor') ||
        lowerTitle.includes('medical') ||
        lowerTitle.includes('clinic') ||
        lowerTitle.includes('hospital') ||
        lowerTitle.includes('therapy') ||
        lowerTitle.includes('consultation') ||
        lowerTitle.includes('checkup') ||
        lowerTitle.includes('examination') ||
        lowerTitle.includes('procedure') ||
        lowerTitle.includes('surgery') ||
        lowerTitle.includes('treatment') ||
        lowerTitle.includes('session') ||
        lowerTitle.includes('class') ||
        lowerTitle.includes('lesson') ||
        lowerTitle.includes('training') ||
        lowerTitle.includes('workshop') ||
        lowerTitle.includes('lecture') ||
        lowerTitle.includes('presentation') ||
        lowerTitle.includes('demo') ||
        lowerTitle.includes('show') ||
        lowerTitle.includes('concert') ||
        lowerTitle.includes('movie') ||
        lowerTitle.includes('theater') ||
        lowerTitle.includes('museum') ||
        lowerTitle.includes('exhibition') ||
        lowerTitle.includes('tour') ||
        lowerTitle.includes('trip') ||
        lowerTitle.includes('flight') ||
        lowerTitle.includes('train') ||
        lowerTitle.includes('bus') ||
        lowerTitle.includes('car') ||
        lowerTitle.includes('drive') ||
        lowerTitle.includes('walk') ||
        lowerTitle.includes('run') ||
        lowerTitle.includes('exercise') ||
        lowerTitle.includes('workout') ||
        lowerTitle.includes('gym') ||
        lowerTitle.includes('yoga') ||
        lowerTitle.includes('meditation') ||
        lowerTitle.includes('massage') ||
        lowerTitle.includes('spa') ||
        lowerTitle.includes('salon') ||
        lowerTitle.includes('haircut') ||
        lowerTitle.includes('manicure') ||
        lowerTitle.includes('pedicure') ||
        lowerTitle.includes('facial') ||
        lowerTitle.includes('waxing') ||
        lowerTitle.includes('tattoo') ||
        lowerTitle.includes('piercing')) {
      return 'event';
    }
    
    // Tasks - work-related activities
    if (lowerTitle.includes('complete') || 
        lowerTitle.includes('finish') || 
        lowerTitle.includes('work on') ||
        lowerTitle.includes('develop') ||
        lowerTitle.includes('build') ||
        lowerTitle.includes('create') ||
        lowerTitle.includes('design') ||
        lowerTitle.includes('plan') ||
        lowerTitle.includes('prepare') ||
        lowerTitle.includes('review') ||
        lowerTitle.includes('update') ||
        lowerTitle.includes('fix') ||
        lowerTitle.includes('repair') ||
        lowerTitle.includes('install') ||
        lowerTitle.includes('configure') ||
        lowerTitle.includes('setup') ||
        lowerTitle.includes('organize') ||
        lowerTitle.includes('arrange') ||
        lowerTitle.includes('sort') ||
        lowerTitle.includes('pack') ||
        lowerTitle.includes('move') ||
        lowerTitle.includes('transfer') ||
        lowerTitle.includes('copy') ||
        lowerTitle.includes('print') ||
        lowerTitle.includes('scan') ||
        lowerTitle.includes('email') ||
        lowerTitle.includes('text') ||
        lowerTitle.includes('message') ||
        lowerTitle.includes('book') ||
        lowerTitle.includes('reserve') ||
        lowerTitle.includes('cancel') ||
        lowerTitle.includes('confirm') ||
        lowerTitle.includes('verify') ||
        lowerTitle.includes('test') ||
        lowerTitle.includes('try') ||
        lowerTitle.includes('experiment') ||
        lowerTitle.includes('research') ||
        lowerTitle.includes('investigate') ||
        lowerTitle.includes('explore') ||
        lowerTitle.includes('discover') ||
        lowerTitle.includes('make') ||
        lowerTitle.includes('cook') ||
        lowerTitle.includes('bake') ||
        lowerTitle.includes('wash') ||
        lowerTitle.includes('fold') ||
        lowerTitle.includes('iron') ||
        lowerTitle.includes('mow') ||
        lowerTitle.includes('water') ||
        lowerTitle.includes('plant') ||
        lowerTitle.includes('harvest')) {
      return 'task';
    }
    
    // Todos - personal/errand activities
    if (lowerTitle.includes('buy') || 
        lowerTitle.includes('get') || 
        lowerTitle.includes('find') ||
        lowerTitle.includes('check') ||
        lowerTitle.includes('order') ||
        lowerTitle.includes('purchase') ||
        lowerTitle.includes('clean') ||
        lowerTitle.includes('call') ||
        lowerTitle.includes('go for') ||
        lowerTitle.includes('go to') ||
        lowerTitle.includes('visit')) {
      return 'todo';
    }
    
    // Default to task for professional items, todo for casual
    return tags.includes('Professional') ? 'task' : 'todo';
  };

  // Helper function to check if text content exists (for JSX rendering)
  const hasTextContent = (text: any): boolean => {
    if (typeof text === 'string') {
      return text.trim().length > 0;
    }
    return false;
  };

  // Helper function to convert 24-hour time to 12-hour format
  function convert24To12Hour(time24: string): string {
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Custom Header */}
      <View style={[styles.header, { backgroundColor: colors.topBarBackground }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleQuickJotBack}
        >
          <Text style={[styles.backIcon, { color: colors.background }]}>←</Text>
        </TouchableOpacity>
        
        <Text style={[styles.title, { color: colors.background }]}>Quick Jot</Text>
        
        <TouchableOpacity
          style={styles.infoButton}
          onPress={handleInfo}
        >
          <InfoIcon size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      {/* Success Message */}
      {showSavedMessage && (
        <View style={[styles.successMessage, { backgroundColor: colors.primary }]}>
          <Text style={[styles.successMessageText, { color: colors.background }]}>
            ✅ Saved {savedCount} item{savedCount !== 1 ? 's' : ''} successfully!
          </Text>
        </View>
      )}

      {/* Mode Toggle Buttons */}
      <View style={[styles.modeToggleContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.modeToggleButton,
            {
              backgroundColor: inputMode === 'text' ? colors.topBarBackground : colors.surface,
              opacity: isRecording ? 0.5 : 1, // Dim when recording
            }
          ]}
          onPress={() => setInputMode('text')}
          disabled={isRecording} // Disable when recording
        >
          <TextIcon 
            size={16} 
            color={inputMode === 'text' ? colors.background : colors.text} 
          />
          <Text style={[
            styles.modeToggleText, 
            { color: inputMode === 'text' ? colors.background : colors.text }
          ]}>
            Text
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.modeToggleButton,
            {
              backgroundColor: inputMode === 'audio' ? colors.topBarBackground : colors.surface,
            }
          ]}
          onPress={() => setInputMode('audio')}
        >
          <MicIcon 
            size={16} 
            color={inputMode === 'audio' ? colors.background : colors.text} 
          />
          <Text style={[
            styles.modeToggleText, 
            { color: inputMode === 'audio' ? colors.background : colors.text }
          ]}>
            Audio
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area */}
      <View style={[styles.mainContent, { backgroundColor: colors.surface }]}>
        {inputMode === 'text' ? (
          <TextInput
            style={[
              styles.textInput,
              {
                color: colors.text,
                backgroundColor: colors.surface,
              },
            ]}
            placeholder="Start jotting down your thoughts..."
            placeholderTextColor={colors.textSecondary}
            value={safeTextContent(thoughts)}
            onChangeText={setThoughtsSafe}
            multiline
            textAlignVertical="top"
            autoFocus
          />
        ) : (
          <View style={styles.audioInputContainer}>
            {!isRecording ? (
              <>
                {/* Show text input when not recording */}
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.surface,
                      padding: 20,
                      borderRadius: 16,
                      borderWidth: 1,
                      borderColor: colors.border,
                      width: '90%',
                      minHeight: 200,
                    },
                  ]}
                  placeholder="Your speech to audio text will appear here..."
                  placeholderTextColor={colors.textSecondary}
                  value={safeTextContent(thoughts)}
                  onChangeText={setThoughtsSafe}
                  multiline
                  textAlignVertical="top"
                />
                
                {/* Bottom section with mic button and session info */}
                <View style={styles.audioBottomSection}>
                                  <TouchableOpacity
                  style={[
                    styles.largeMicButton,
                    { backgroundColor: colors.primary }
                  ]}
                  onPress={handleVoiceInput}
                  disabled={isTranscribing}
                >
                    <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                      <MicIcon size={48} color={colors.background} />
                    </Animated.View>
                  </TouchableOpacity>
                  <Text style={[styles.audioHintText, { color: colors.text }]}>
                    Tap to record more audio
                  </Text>
                  
                  {/* Show session timer if we have an active session */}
                  {recordingSession.isActive && (
                    <Text style={[styles.sessionTimer, { color: colors.textSecondary }]}>
                      Session: {sessionTimeString}
                    </Text>
                  )}
                </View>
              </>
            ) : (
              <>
                <TouchableOpacity
                  style={[
                    styles.largeMicButton,
                    styles.recordingMicButton,
                    { backgroundColor: '#ef4444' }
                  ]}
                  onPress={handleVoiceInput}
                >
                  <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                    <MicIcon size={48} color="#ffffff" />
                  </Animated.View>
                </TouchableOpacity>
                
                <Text style={[styles.recordingHintText, { color: colors.text }]}>
                  Recording... Tap to stop
                </Text>
                
                <Text style={[styles.recordingTimer, { color: colors.text }]}>
                  {recordingTimeString}
                </Text>
                
                {Platform.OS === 'web' && webSpeech && (
                  <View style={styles.vuMeterContainer}>
                    <VUMeter 
                      level={webSpeech?.vuMeter?.level || 0} 
                      isActive={webSpeech?.vuMeter?.isActive || false}
                    />
                  </View>
                )}
                
                <View style={styles.recordingStatusContainer}>
                  <View style={[styles.recordingStatusDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.recordingStatusText, { color: colors.text }]}>
                    Recording in progress
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* Transcribing Status */}
        {isTranscribing && (
          <View style={[styles.transcribingOverlay, { backgroundColor: colors.surface }]}>
            {uploadProgress ? (
              <>
                <Text style={[styles.transcribingText, { color: colors.text }]}>
                  {uploadProgress?.message || 'Processing...'}
                </Text>
                <View style={[styles.progressBarContainer, { backgroundColor: colors.background }]}>
                                  <View 
                  style={[
                    styles.progressBar, 
                    { 
                      backgroundColor: colors.primary,
                      width: progressWidth
                    }
                  ]} 
                />
                </View>
                <Text style={[styles.progressText, { color: colors.textSecondary }]}>
                  {progressText}
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

      {/* Done Button with AI Option */}
      <View style={[styles.doneButtonContainer, { backgroundColor: colors.background }]}>
        {hasTextContent(thoughts) && (
          <TouchableOpacity
            style={[
              styles.aiBreakdownButton,
              {
                backgroundColor: colors.secondary,
                marginBottom: 12,
              },
            ]}
            onPress={handleAIBreakdown}
            disabled={!hasTextContent(thoughts) || isAiBreakdownLoading}
          >
            <BreakDownIcon size={20} color={colors.background} />
            <Text style={[styles.aiBreakdownButtonText, { color: colors.background }]}>
              {isAiBreakdownLoading ? 'Processing...' : 'AI Breakdown'}
            </Text>
          </TouchableOpacity>
        )}
        
        {/* Refresh Button */}
        <TouchableOpacity
          style={[
            styles.refreshButton,
            {
              backgroundColor: 'transparent',
              borderWidth: 2,
              borderColor: 'rgb(107, 91, 78)',
              marginBottom: 12,
            },
          ]}
          onPress={handleRefresh}
        >
          <ResetIcon size={16} color="rgb(107, 91, 78)" />
          <Text style={[styles.refreshButtonText, { color: 'rgb(107, 91, 78)' }]}>
            Reset
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.doneButton,
            {
              backgroundColor: colors.primary,
              opacity: hasTextContent(thoughts) ? 1 : 0.5,
            },
          ]}
          onPress={handleSave}
          disabled={!hasTextContent(thoughts)}
        >
          <Text style={[styles.doneButtonText, { color: colors.background }]}>
            ✓ Done
          </Text>
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
              fontSize: getResponsiveSize(20, 22, 26),
              textAlign: 'center'
            }]}>
              How would you like to save your thoughts?
            </Text>
            <Text style={[styles.modalSubtitle, { 
              color: colors.textSecondary,
              fontSize: getResponsiveSize(14, 15, 16),
              textAlign: 'center',
              marginTop: 8
            }]}>
              Choose the best way to organize your ideas
            </Text>
          </View>

          {/* Enhanced Options Section - Child of Content */}
          <View style={styles.saveOptionsGrid}>
            <TouchableOpacity
              style={[styles.saveOptionCard, { 
                backgroundColor: colors.surface,
                borderColor: colors.primary,
                borderWidth: 2
              }]}
              onPress={() => handleSaveAsType('journal')}
            >
              <View style={styles.saveOptionContent}>
                <Text style={[styles.saveOptionTitle, { color: colors.text }]}>
                  📔 Journal Entry
                </Text>
                <Text style={[styles.saveOptionDescription, { color: colors.textSecondary }]}>
                  Perfect for personal reflections and daily thoughts
                </Text>
              </View>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.saveOptionCard, { 
                backgroundColor: colors.surface,
                borderColor: colors.secondary,
                borderWidth: 2
              }]}
              onPress={() => handleSaveAsType('note')}
            >
              <View style={styles.saveOptionContent}>
                <Text style={[styles.saveOptionTitle, { color: colors.text }]}>
                  📝 Note
                </Text>
                <Text style={[styles.saveOptionDescription, { color: colors.textSecondary }]}>
                  Great for quick ideas and general information
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Enhanced Cancel Button Section - Child of Content */}
          <View style={styles.cancelButtonSection}>
            <TouchableOpacity
              style={[styles.cancelButton, { 
                backgroundColor: colors.background,
                borderColor: colors.border,
                borderWidth: 1
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

      {/* Note: Transcription modal removed - transcriptions now append directly to text */}

      {/* Info Modal */}
      <PopupBg
        visible={showInfoModal}
        onRequestClose={() => setShowInfoModal(false)}
        size="medium"
        color={colors.surface}
        showSkip={false}
        closeOnOutsideTap={true}
      >
        <View style={[styles.popupContent, { width: '100%' }]}>
          <View style={styles.popupTitleSection}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              How to use Quick Jot
            </Text>
          </View>

          <View style={[styles.infoContent, { marginBottom: 20 }]}>
            <Text style={[styles.infoSectionTitle, { color: colors.text }]}>Text Mode</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Type your thoughts directly into the text area. Perfect for quick notes and ideas.
            </Text>

            <Text style={[styles.infoSectionTitle, { color: colors.text, marginTop: 16 }]}>Audio Mode</Text>
            <Text style={[styles.infoText, { color: colors.textSecondary }]}>
              Tap the microphone to start recording. Your voice will be converted to text automatically.
            </Text>

            <Text style={[styles.infoSectionTitle, { color: colors.text, marginTop: 16 }]}>Tips</Text>
            <Text style={[styles.infoTip, { color: colors.textSecondary }]}>• Switch between modes anytime</Text>
            <Text style={[styles.infoTip, { color: colors.textSecondary }]}>• Tap "Done" to save your note</Text>
            <Text style={[styles.infoTip, { color: colors.textSecondary }]}>• Recording shows a live timer</Text>
            
            <Text style={[styles.infoDescription, { color: colors.textSecondary, marginTop: 16 }]}>
              This is a quiet space to release thoughts or emotions without judgment. Write freely, then choose how to save or use your thoughts. Perfect for brain dumps, ideas, or emotional processing.
            </Text>
          </View>

          <View style={styles.cancelButtonSection}>
            <TouchableOpacity
              style={[styles.cancelButton, { borderColor: colors.border }]}
              onPress={() => setShowInfoModal(false)}
            >
              <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
                Got it
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
  
  // Header styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 64,
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
  
  // Mode toggle styles
  modeToggleContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  modeToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    minWidth: 100,
    justifyContent: 'center',
  },
  modeToggleText: {
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Main content styles
  mainContent: {
    flex: 1,
    margin: 20,
    borderRadius: 16,
    padding: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 18,
    lineHeight: 26,
    textAlignVertical: 'top',
  },
  
  // Audio input styles
  audioInputContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 20,
    paddingVertical: 20,
  },
  audioBottomSection: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    width: '100%',
  },
  largeMicButton: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  recordingMicButton: {
    // Additional styles for recording state if needed
  },
  audioHintText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  sessionTimer: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },
  recordingHintText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  recordingTimer: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    letterSpacing: 2,
  },
  vuMeterContainer: {
    marginVertical: 16,
  },
  vuMeterPlaceholder: {
    fontSize: 14,
    textAlign: 'center',
  },
  recordingStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
  },
  recordingStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  recordingStatusText: {
    fontSize: 16,
    fontWeight: '500',
  },
  
  // Done button styles
  doneButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  aiBreakdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  aiBreakdownButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  doneButton: {
    paddingVertical: 16,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  
  // Transcribing overlay styles
  transcribingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 16,
  },
  transcribingText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  transcribingDots: {
    flexDirection: 'row',
    gap: 8,
  },
  transcribingDot: {
    fontSize: 24,
    opacity: 0.7,
  },
  progressBarContainer: {
    width: '100%',
    height: 8,
    borderRadius: 4,
    marginVertical: 16,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },

  // Modal styles (kept from original)
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    textAlignVertical: 'center',
    marginBottom: 20,
    width: '100%',
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
    marginBottom: 16,
  },
  saveOptionsList: {
    width: '100%',
    marginBottom: 20,
  },
  saveOptionsGrid: {
    width: '100%',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 20,
    gap: 16,
  },
  saveOptionCard: {
    width: '100%',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 80,
  },
  saveOptionContent: {
    width: '100%',
  },
  saveOptionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  saveOptionDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666',
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
  
  // Info modal styles
  infoContent: {
    width: '100%',
  },
  infoSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 4,
  },
  infoTip: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 2,
  },
  infoDescription: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  
  // AI Breakdown modal styles
  aiBreakdownContent: {
    width: '100%',
    maxHeight: 400,
  },
  aiBreakdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  aiBreakdownItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  aiBreakdownItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  aiBreakdownItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  aiBreakdownItemType: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  aiBreakdownItemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  aiBreakdownItemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  aiBreakdownItemNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    width: 24,
    textAlign: 'center',
  },
  aiBreakdownItemText: {
    fontSize: 16,
    lineHeight: 22,
    flex: 1,
  },
  aiBreakdownItemActions: {
    flexDirection: 'row',
    gap: 8,
  },
  aiItemActionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  aiItemActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  aiBreakdownActions: {
    width: '100%',
    marginTop: 8,
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
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 20,
    gap: 8,
  },
  refreshButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  successMessage: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  successMessageText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 