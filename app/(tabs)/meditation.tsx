import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import { usePreviousScreen } from '../../components/ui/PreviousScreenContext';
import { TopBar } from '../../components/ui/TopBar';
import { SensoryColors } from '../../constants/Colors';
import { useSensoryMode } from '../../contexts/SensoryModeContext';

interface MeditationSession {
  id: string;
  title: string;
  duration: number; // in minutes
  description: string;
  category: 'beginner' | 'focus' | 'relaxation' | 'sleep';
  instructions: string[];
}

interface MeditationProgress {
  totalSessions: number;
  totalMinutes: number;
  thisWeek: number;
  lastSession?: string;
}

const MEDITATION_SESSIONS: MeditationSession[] = [
  {
    id: '1',
    title: '5-Minute Calm',
    duration: 5,
    description: 'Quick breathing exercise for instant calm',
    category: 'beginner',
    instructions: [
      'Find a comfortable position',
      'Close your eyes gently',
      'Take a deep breath in',
      'Exhale slowly',
      'Continue breathing naturally'
    ]
  },
  {
    id: '2',
    title: 'Focus Reset',
    duration: 10,
    description: 'Clear your mind and improve concentration',
    category: 'focus',
    instructions: [
      'Sit with your back straight',
      'Focus on your breath',
      'When thoughts arise, gently return to breathing',
      'Stay present in this moment'
    ]
  },
  {
    id: '3',
    title: 'Evening Unwind',
    duration: 15,
    description: 'Gentle body scan for deep relaxation',
    category: 'relaxation',
    instructions: [
      'Lie down comfortably',
      'Scan your body from head to toe',
      'Release tension in each area',
      'Feel your body becoming lighter'
    ]
  },
  {
    id: '4',
    title: 'Sleep Preparation',
    duration: 20,
    description: 'Mindful preparation for restful sleep',
    category: 'sleep',
    instructions: [
      'Dim the lights',
      'Focus on your breathing',
      'Let go of today\'s thoughts',
      'Drift into peaceful sleep'
    ]
  },
  {
    id: '5',
    title: 'Mindful Walking',
    duration: 8,
    description: 'Walking meditation for grounding',
    category: 'beginner',
    instructions: [
      'Walk slowly and deliberately',
      'Feel each step on the ground',
      'Notice your surroundings',
      'Stay present in movement'
    ]
  },
  {
    id: '6',
    title: 'Loving Kindness',
    duration: 12,
    description: 'Cultivate compassion and self-love',
    category: 'relaxation',
    instructions: [
      'Send love to yourself',
      'Extend love to loved ones',
      'Include all beings in your heart',
      'Feel the warmth of compassion'
    ]
  }
];

const BACKGROUND_SOUNDS = [
  { id: 'rain', name: 'Rain', icon: '🌧️' },
  { id: 'forest', name: 'Forest', icon: '🌲' },
  { id: 'ocean', name: 'Ocean', icon: '🌊' },
  { id: 'white-noise', name: 'White Noise', icon: '🔇' },
  { id: 'none', name: 'None', icon: '🔇' }
];

const DAILY_TIPS = [
  'Mindfulness is simply being present in the moment.',
  'You don\'t need to clear your mind, just observe your thoughts.',
  'Even 5 minutes of meditation can make a difference.',
  'Be kind to yourself during meditation - there\'s no perfect way.',
  'Meditation is a practice, not a performance.',
  'Your breath is always available as an anchor to the present.',
  'Thoughts are like clouds - they come and go.',
  'Start where you are, not where you think you should be.'
];

export default function MeditationScreen() {
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];
  const { addToStack, handleBack } = usePreviousScreen();
  
  // State
  const [selectedSession, setSelectedSession] = useState<MeditationSession | null>(null);
  const [isMeditating, setIsMeditating] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [currentInstruction, setCurrentInstruction] = useState(0);
  const [selectedBackground, setSelectedBackground] = useState('none');
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progress, setProgress] = useState<MeditationProgress>({
    totalSessions: 0,
    totalMinutes: 0,
    thisWeek: 0
  });
  
  // Refs
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const instructionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Animated values
  const breathingScale = useSharedValue(1);
  const breathingOpacity = useSharedValue(0.7);
  const waveOffset = useSharedValue(0);
  
  useEffect(() => {
    addToStack('meditation');
    loadProgress();
  }, []);
  
  // Breathing animation
  useEffect(() => {
    if (isMeditating && !isPaused) {
      breathingScale.value = withRepeat(
        withSequence(
          withTiming(1.2, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
      
      breathingOpacity.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.7, { duration: 4000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );
    } else {
      breathingScale.value = withTiming(1, { duration: 500 });
      breathingOpacity.value = withTiming(0.7, { duration: 500 });
    }
  }, [isMeditating, isPaused]);
  
  // Wave animation
  useEffect(() => {
    if (isMeditating && !isPaused) {
      waveOffset.value = withRepeat(
        withTiming(100, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true
      );
    } else {
      waveOffset.value = withTiming(0, { duration: 500 });
    }
  }, [isMeditating, isPaused]);
  
  // Timer effect
  useEffect(() => {
    if (isMeditating && !isPaused && timeRemaining > 0) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            stopMeditation();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isMeditating, isPaused, timeRemaining]);
  
  // Instruction timer
  useEffect(() => {
    if (isMeditating && !isPaused && selectedSession) {
      const instructionDuration = (selectedSession.duration * 60) / selectedSession.instructions.length;
      instructionTimerRef.current = setInterval(() => {
        setCurrentInstruction(prev => {
          if (prev >= selectedSession.instructions.length - 1) {
            return prev;
          }
          return prev + 1;
        });
      }, instructionDuration * 1000);
    } else {
      if (instructionTimerRef.current) {
        clearInterval(instructionTimerRef.current);
        instructionTimerRef.current = null;
      }
    }
    
    return () => {
      if (instructionTimerRef.current) {
        clearInterval(instructionTimerRef.current);
      }
    };
  }, [isMeditating, isPaused, selectedSession]);
  
  const loadProgress = async () => {
    try {
      const stored = await AsyncStorage.getItem('meditationProgress');
      if (stored) {
        setProgress(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading meditation progress:', error);
    }
  };
  
  const saveProgress = async (newProgress: MeditationProgress) => {
    try {
      await AsyncStorage.setItem('meditationProgress', JSON.stringify(newProgress));
      setProgress(newProgress);
    } catch (error) {
      console.error('Error saving meditation progress:', error);
    }
  };
  
  const startMeditation = () => {
    if (!selectedSession) return;
    
    setIsMeditating(true);
    setIsPaused(false);
    setTimeRemaining(selectedSession.duration * 60);
    setCurrentInstruction(0);
  };
  
  const pauseMeditation = () => {
    setIsPaused(true);
  };
  
  const resumeMeditation = () => {
    setIsPaused(false);
  };
  
  const stopMeditation = () => {
    setIsMeditating(false);
    setIsPaused(false);
    setTimeRemaining(0);
    setCurrentInstruction(0);
    setSelectedSession(null);
    
    // Update progress
    if (selectedSession) {
      const newProgress = {
        ...progress,
        totalSessions: progress.totalSessions + 1,
        totalMinutes: progress.totalMinutes + selectedSession.duration,
        thisWeek: progress.thisWeek + 1,
        lastSession: new Date().toISOString()
      };
      saveProgress(newProgress);
    }
  };
  
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  const getDailyTip = () => {
    const today = new Date().getDate();
    return DAILY_TIPS[today % DAILY_TIPS.length];
  };
  
  const breathingAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: breathingScale.value }],
      opacity: breathingOpacity.value,
    };
  });
  
  const waveAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: waveOffset.value }],
    };
  });
  
  const renderSessionCard = (session: MeditationSession) => (
    <TouchableOpacity
      key={session.id}
      style={[styles.sessionCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => {
        setSelectedSession(session);
        setShowSessionModal(true);
      }}
    >
      <View style={styles.sessionHeader}>
        <Text style={[styles.sessionTitle, { color: colors.text }]}>
          {session.title}
        </Text>
        <Text style={[styles.sessionDuration, { color: colors.primary }]}>
          {session.duration} min
        </Text>
      </View>
      <Text style={[styles.sessionDescription, { color: colors.textSecondary }]}>
        {session.description}
      </Text>
      <View style={[styles.categoryTag, { backgroundColor: colors.primary + '20' }]}>
        <Text style={[styles.categoryText, { color: colors.primary }]}>
          {session.category}
        </Text>
      </View>
    </TouchableOpacity>
  );
  
  const renderMeditationModal = () => (
    <Modal
      visible={isMeditating}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <LinearGradient
        colors={[colors.background, colors.cardBackground]}
        style={styles.meditationContainer}
      >
        <TopBar
          title="Meditation"
          onBack={stopMeditation}
        />
        
        <View style={styles.meditationContent}>
          {/* Breathing Circle */}
          <View style={styles.breathingContainer}>
            <Animated.View style={[styles.breathingCircle, breathingAnimatedStyle]}>
              <View style={[styles.innerCircle, { backgroundColor: colors.primary }]} />
            </Animated.View>
          </View>
          
          {/* Timer */}
          <Text style={[styles.timer, { color: colors.text }]}>
            {formatTime(timeRemaining)}
          </Text>
          
          {/* Current Instruction */}
          {selectedSession && (
            <View style={styles.instructionContainer}>
              <Text style={[styles.instructionText, { color: colors.text }]}>
                {selectedSession.instructions[currentInstruction]}
              </Text>
              <Text style={[styles.instructionProgress, { color: colors.textSecondary }]}>
                {currentInstruction + 1} of {selectedSession.instructions.length}
              </Text>
            </View>
          )}
          
          {/* Controls */}
          <View style={styles.meditationControls}>
            {isPaused ? (
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: colors.primary }]}
                onPress={resumeMeditation}
              >
                <Text style={[styles.controlButtonText, { color: colors.buttonText }]}>
                  Resume
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={pauseMeditation}
              >
                <Text style={[styles.controlButtonText, { color: colors.text }]}>
                  Pause
                </Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: '#ef4444' }]}
              onPress={stopMeditation}
            >
              <Text style={[styles.controlButtonText, { color: colors.buttonText }]}>
                Stop
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>
    </Modal>
  );
  
  const renderSessionModal = () => (
    <Modal
      visible={showSessionModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.sessionModalContainer, { backgroundColor: colors.background }]}>
        <TopBar
          title="Session Details"
          onBack={() => setShowSessionModal(false)}
        />
        
        {selectedSession && (
          <ScrollView style={styles.sessionModalContent}>
            <Text style={[styles.sessionModalTitle, { color: colors.text }]}>
              {selectedSession.title}
            </Text>
            
            <Text style={[styles.sessionModalDuration, { color: colors.primary }]}>
              {selectedSession.duration} minutes
            </Text>
            
            <Text style={[styles.sessionModalDescription, { color: colors.textSecondary }]}>
              {selectedSession.description}
            </Text>
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Background Sound
            </Text>
            <View style={styles.backgroundOptions}>
              {BACKGROUND_SOUNDS.map(sound => (
                <TouchableOpacity
                  key={sound.id}
                  style={[
                    styles.backgroundOption,
                    {
                      backgroundColor: selectedBackground === sound.id ? colors.primary : colors.surface,
                      borderColor: colors.border
                    }
                  ]}
                  onPress={() => setSelectedBackground(sound.id)}
                >
                  <Text style={[styles.backgroundIcon, { color: colors.text }]}>
                    {sound.icon}
                  </Text>
                  <Text style={[
                    styles.backgroundText,
                    { color: selectedBackground === sound.id ? colors.buttonText : colors.text }
                  ]}>
                    {sound.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Instructions
            </Text>
            {selectedSession.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionItem}>
                <Text style={[styles.instructionNumber, { color: colors.primary }]}>
                  {index + 1}
                </Text>
                <Text style={[styles.instructionItemText, { color: colors.text }]}>
                  {instruction}
                </Text>
              </View>
            ))}
            
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={() => {
                setShowSessionModal(false);
                startMeditation();
              }}
            >
              <Text style={[styles.startButtonText, { color: colors.buttonText }]}>
                Start Meditation
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
  
  const renderProgressModal = () => (
    <Modal
      visible={showProgress}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.progressModalContainer, { backgroundColor: colors.background }]}>
        <TopBar
          title="Your Progress"
          onBack={() => setShowProgress(false)}
        />
        
        <ScrollView style={styles.progressModalContent}>
          <View style={styles.progressCard}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              This Week
            </Text>
            <Text style={[styles.progressNumber, { color: colors.primary }]}>
              {progress.thisWeek}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              sessions
            </Text>
          </View>
          
          <View style={styles.progressCard}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Total Sessions
            </Text>
            <Text style={[styles.progressNumber, { color: colors.primary }]}>
              {progress.totalSessions}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              completed
            </Text>
          </View>
          
          <View style={styles.progressCard}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Total Minutes
            </Text>
            <Text style={[styles.progressNumber, { color: colors.primary }]}>
              {progress.totalMinutes}
            </Text>
            <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
              minutes
            </Text>
          </View>
          
          {progress.lastSession && (
            <View style={styles.lastSessionCard}>
              <Text style={[styles.lastSessionTitle, { color: colors.text }]}>
                Last Session
              </Text>
              <Text style={[styles.lastSessionDate, { color: colors.textSecondary }]}>
                {new Date(progress.lastSession).toLocaleDateString()}
              </Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
  
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar
        title="Meditation"
        onBack={() => handleBack()}
      />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Daily Tip */}
        <View style={[styles.tipCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.tipTitle, { color: colors.text }]}>
            Today's Tip
          </Text>
          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
            {getDailyTip()}
          </Text>
        </View>
        
        {/* Progress Summary */}
        <View style={[styles.progressSummary, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: colors.text }]}>
              You've meditated {progress.thisWeek} times this week
            </Text>
            <Text style={[styles.progressSubtext, { color: colors.textSecondary }]}>
              {progress.totalMinutes} total minutes
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.progressButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowProgress(true)}
          >
            <Text style={[styles.progressButtonText, { color: colors.buttonText }]}>
              View Progress
            </Text>
          </TouchableOpacity>
        </View>
        
        {/* Sessions */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Guided Sessions
        </Text>
        
        <View style={styles.sessionsGrid}>
          {MEDITATION_SESSIONS.map(session => (
            <View key={session.id}>
              {renderSessionCard(session)}
            </View>
          ))}
        </View>
      </ScrollView>
      
      {renderMeditationModal()}
      {renderSessionModal()}
      {renderProgressModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  tipCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
  },
  tipTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  tipText: {
    fontSize: 16,
    lineHeight: 24,
  },
  progressSummary: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressInfo: {
    flex: 1,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  progressSubtext: {
    fontSize: 14,
  },
  progressButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  progressButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 16,
  },
  sessionsGrid: {
    gap: 16,
  },
  sessionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  sessionDuration: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  sessionDescription: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 12,
  },
  categoryTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '500' as const,
    textTransform: 'capitalize',
  },
  meditationContainer: {
    flex: 1,
  },
  meditationContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  breathingContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  breathingCircle: {
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  innerCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  timer: {
    fontSize: 48,
    fontWeight: '700' as const,
    marginBottom: 40,
  },
  instructionContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  instructionText: {
    fontSize: 20,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionProgress: {
    fontSize: 14,
  },
  meditationControls: {
    flexDirection: 'row' as const,
    gap: 16,
  },
  controlButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  sessionModalContainer: {
    flex: 1,
  },
  sessionModalContent: {
    padding: 20,
  },
  sessionModalTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  sessionModalDuration: {
    fontSize: 18,
    fontWeight: '600' as const,
    marginBottom: 16,
  },
  sessionModalDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  backgroundOptions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 12,
    marginBottom: 24,
  },
  backgroundOption: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    minWidth: 80,
  },
  backgroundIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  backgroundText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  instructionItem: {
    flexDirection: 'row' as const,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  instructionNumber: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginRight: 12,
    minWidth: 20,
  },
  instructionItemText: {
    fontSize: 16,
    lineHeight: 24,
    flex: 1,
  },
  startButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 24,
  },
  startButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  progressModalContainer: {
    flex: 1,
  },
  progressModalContent: {
    padding: 20,
  },
  progressCard: {
    padding: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    alignItems: 'center',
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  progressNumber: {
    fontSize: 32,
    fontWeight: '700' as const,
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 14,
  },
  lastSessionCard: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  lastSessionTitle: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  lastSessionDate: {
    fontSize: 14,
  },
}); 