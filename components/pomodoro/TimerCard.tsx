// Pomodoro Timer Card Component
// Displays the countdown timer and primary controls

import { useThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface TimerCardProps {
  timeRemaining: string;
  mode: 'focus' | 'short_break' | 'long_break';
  isRunning: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onSkip: () => void;
  onReset?: () => void;
  currentTask?: {
    title: string;
    completedPomodoros: number;
    estimatedPomodoros: number;
  };
  totalCompletedToday: number;
}

export default function TimerCard({
  timeRemaining,
  mode,
  isRunning,
  isPaused,
  onStart,
  onPause,
  onResume,
  onSkip,
  onReset,
  currentTask,
  totalCompletedToday,
}: TimerCardProps) {
  const { colors } = useThemeColors();

  const getModeText = () => {
    switch (mode) {
      case 'focus':
        return 'Work Time';
      case 'short_break':
        return 'Short Break';
      case 'long_break':
        return 'Long Break';
      default:
        return 'Work Time';
    }
  };

  const getPrimaryButtonText = () => {
    if (!isRunning && !isPaused) return 'START';
    if (isPaused) return 'RESUME';
    return 'PAUSE';
  };

  const handlePrimaryButtonPress = () => {
    if (!isRunning && !isPaused) {
      onStart();
    } else if (isPaused) {
      onResume();
    } else {
      onPause();
    }
  };

  return (
    <View style={styles.container}>
      {/* Session Count Display */}
      <View style={styles.sessionCountContainer}>
        <View style={styles.sessionCountContent}>
          <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
            <Path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              fill={colors.topBarBackground}
            />
          </Svg>
          <Text style={[styles.sessionCountText, { color: colors.textSecondary }]}>
            {totalCompletedToday} completed today
          </Text>
        </View>
      </View>

      {/* Current Task Display */}
      {currentTask && (
        <View style={styles.currentTaskContainer}>
          <Text style={[styles.currentTaskText, { color: colors.text }]}>
            #{totalCompletedToday + 1} {currentTask.title}
          </Text>
        </View>
      )}

      {/* Timer Display */}
      <View style={styles.timerContainer}>
        <View style={[
          styles.timerBox,
          {
            backgroundColor: colors.surface + '80', // Faded background
            borderColor: colors.border,
            shadowColor: colors.topBarBackground,
          },
        ]}>
          <Text style={[styles.timeText, { color: colors.text }]}>
            {timeRemaining}
          </Text>
          <Text style={[styles.modeText, { color: colors.textSecondary }]}>
            {getModeText()}
          </Text>
        </View>
      </View>

      {/* Control Buttons */}
      <View style={styles.controlsContainer}>
        {/* Primary Button */}
        <TouchableOpacity
          style={[
            styles.primaryButton,
            { backgroundColor: colors.topBarBackground },
          ]}
          onPress={handlePrimaryButtonPress}
          activeOpacity={0.8}
        >
          <Text style={[styles.primaryButtonText, { color: colors.background }]}>
            {getPrimaryButtonText()}
          </Text>
        </TouchableOpacity>

        {/* Secondary Button (Skip) */}
        {(isRunning || isPaused) && (
          <TouchableOpacity
            style={[
              styles.secondaryButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={onSkip}
            activeOpacity={0.8}
          >
            <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
              SKIP
            </Text>
          </TouchableOpacity>
        )}

        {/* Reset Button (for debugging) */}
        {onReset && (
          <TouchableOpacity
            style={[
              styles.resetButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={onReset}
            activeOpacity={0.8}
          >
            <Text style={[styles.resetButtonText, { color: colors.textSecondary }]}>
              RESET
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  sessionCountContainer: {
    marginBottom: 16,
    alignItems: 'center',
  },
  sessionCountContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sessionCountText: {
    fontSize: 16,
    fontWeight: '500',
  },
  currentTaskContainer: {
    marginBottom: 24,
    alignItems: 'center',
  },
  currentTaskText: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  timerBox: {
    paddingVertical: 40,
    paddingHorizontal: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
    minWidth: 200,
    minHeight: 120,
  },
  timeText: {
    fontSize: 64,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'SpaceMono-Regular',
  },
  modeText: {
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
  },
  controlsContainer: {
    alignItems: 'center',
    gap: 16,
  },
  primaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    minWidth: 160,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
