import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    StyleSheet,
    Text,
    TouchableOpacity,
    Vibration,
    View,
} from 'react-native';
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface PomodoroSession {
  id: string;
  type: 'work' | 'shortBreak' | 'longBreak';
  duration: number;
  completedAt: Date;
}

export default function PomodoroScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 minutes in seconds
  const [currentMode, setCurrentMode] = useState<'work' | 'shortBreak' | 'longBreak'>('work');
  const [completedSessions, setCompletedSessions] = useState<PomodoroSession[]>([]);
  const [totalWorkTime, setTotalWorkTime] = useState(0);
  
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animationValue = useSharedValue(0);

  const timerConfig = {
    work: 25 * 60, // 25 minutes
    shortBreak: 5 * 60, // 5 minutes
    longBreak: 15 * 60, // 15 minutes
  };

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('pomodoro');
  }, [addToStack]);

  useEffect(() => {
    loadSessions();
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleTimerComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused]);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('pomodoro_sessions');
      const savedTotalTime = await AsyncStorage.getItem('pomodoro_total_work_time');
      
      if (savedSessions) {
        setCompletedSessions(JSON.parse(savedSessions));
      }
      if (savedTotalTime) {
        setTotalWorkTime(parseInt(savedTotalTime));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSession = async (session: PomodoroSession) => {
    try {
      const updatedSessions = [...completedSessions, session];
      await AsyncStorage.setItem('pomodoro_sessions', JSON.stringify(updatedSessions));
      setCompletedSessions(updatedSessions);
      
      if (session.type === 'work') {
        const newTotalTime = totalWorkTime + session.duration;
        await AsyncStorage.setItem('pomodoro_total_work_time', newTotalTime.toString());
        setTotalWorkTime(newTotalTime);
      }
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    animationValue.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  };

  const handlePause = () => {
    setIsPaused(true);
    animationValue.value = withTiming(0, { duration: 300 });
  };

  const handleResume = () => {
    setIsPaused(false);
    animationValue.value = withRepeat(
      withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  };

  const handleStop = () => {
    setIsRunning(false);
    setIsPaused(false);
    setTimeLeft(timerConfig[currentMode]);
    animationValue.value = withTiming(0, { duration: 300 });
  };

  const handleModeChange = (mode: 'work' | 'shortBreak' | 'longBreak') => {
    if (isRunning) {
      Alert.alert(
        'Timer Running',
        'Please stop the current timer before changing modes.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setCurrentMode(mode);
    setTimeLeft(timerConfig[mode]);
  };

  const handleTimerComplete = () => {
    setIsRunning(false);
    setIsPaused(false);
    
    // Vibrate to notify user
    Vibration.vibrate([0, 500, 200, 500]);
    
    const session: PomodoroSession = {
      id: Date.now().toString(),
      type: currentMode,
      duration: timerConfig[currentMode],
      completedAt: new Date(),
    };
    
    saveSession(session);
    
    Alert.alert(
      'Session Complete!',
      `${currentMode === 'work' ? 'Work session' : 'Break session'} completed. Great job!`,
      [
        { text: 'OK', onPress: () => {
          // Auto-switch to next mode
          if (currentMode === 'work') {
            const nextMode = completedSessions.filter(s => s.type === 'work').length % 4 === 3 ? 'longBreak' : 'shortBreak';
            handleModeChange(nextMode);
          } else {
            handleModeChange('work');
          }
        }},
      ]
    );
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getModeColor = (mode: string) => {
    switch (mode) {
      case 'work': return '#ff6b6b';
      case 'shortBreak': return '#4ecdc4';
      case 'longBreak': return '#45b7d1';
      default: return colors.text;
    }
  };

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: animationValue.value,
    };
  });

  const getTodaySessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return completedSessions.filter(session => {
      const sessionDate = new Date(session.completedAt);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  };

  const todaySessions = getTodaySessions();
  const todayWorkSessions = todaySessions.filter(s => s.type === 'work').length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Pomodoro Timer" onBack={() => handleBack()} showSettings={true} />

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <Animated.View style={[styles.timerCircle, { borderColor: getModeColor(currentMode) }, animatedStyle]}>
          <Text style={[styles.timerText, { color: colors.text }]}>
            {formatTime(timeLeft)}
          </Text>
          <Text style={[styles.modeText, { color: colors.textSecondary }]}>
            {currentMode === 'work' ? 'Work Time' : currentMode === 'shortBreak' ? 'Short Break' : 'Long Break'}
          </Text>
        </Animated.View>
      </View>

      {/* Mode Selection */}
      <View style={styles.modeContainer}>
        {(['work', 'shortBreak', 'longBreak'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.modeButton,
              { 
                backgroundColor: currentMode === mode ? getModeColor(mode) : colors.surface,
                borderColor: colors.border 
              }
            ]}
            onPress={() => handleModeChange(mode)}
          >
            <Text style={[
              styles.modeButtonText,
              { color: currentMode === mode ? '#fff' : colors.text }
            ]}>
              {mode === 'work' ? 'Work' : mode === 'shortBreak' ? 'Short Break' : 'Long Break'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Controls */}
      <View style={styles.controlsContainer}>
        {!isRunning ? (
          <TouchableOpacity
            style={[styles.controlButton, styles.startButton, { backgroundColor: colors.buttonBackground }]}
            onPress={handleStart}
          >
            <Text style={[styles.controlButtonText, { color: colors.buttonText }]}>Start</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.controlRow}>
            {isPaused ? (
              <TouchableOpacity
                style={[styles.controlButton, styles.resumeButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleResume}
              >
                <Text style={[styles.controlButtonText, { color: colors.buttonText }]}>Resume</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, styles.pauseButton, { borderColor: colors.border }]}
                onPress={handlePause}
              >
                <Text style={[styles.controlButtonText, { color: colors.text }]}>Pause</Text>
              </TouchableOpacity>
            )}
            
            <TouchableOpacity
              style={[styles.controlButton, styles.stopButton, { borderColor: colors.border }]}
              onPress={handleStop}
            >
              <Text style={[styles.controlButtonText, { color: colors.text }]}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.statsTitle, { color: colors.text }]}>Today's Progress</Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>{todayWorkSessions}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Sessions</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {Math.floor(totalWorkTime / 60)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Minutes</Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.text }]}>
              {Math.floor((totalWorkTime / 60) / 25)}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pomodoros</Text>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  timerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  timerCircle: {
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modeText: {
    fontSize: 16,
    fontWeight: '500',
  },
  modeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modeButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  controlsContainer: {
    paddingHorizontal: 40,
    paddingVertical: 20,
  },
  controlRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  controlButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 120,
  },
  startButton: {
    width: '100%',
  },
  pauseButton: {
    borderWidth: 1,
    flex: 1,
    marginRight: 8,
  },
  resumeButton: {
    flex: 1,
    marginRight: 8,
  },
  stopButton: {
    borderWidth: 1,
    flex: 1,
    marginLeft: 8,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  statsContainer: {
    margin: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
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
    fontSize: 14,
    fontWeight: '500',
  },
}); 