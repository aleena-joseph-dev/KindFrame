import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  Dimensions,
} from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  tooltip: string;
}

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'quick-jot',
    title: 'Quick Jot',
    tooltip: 'AI: Capture quick thoughts and convert them to tasks',
  },
  {
    id: 'menu',
    title: 'Menu',
    tooltip: 'Create tasks using your preferred tool',
  },
  {
    id: 'todays-focus',
    title: "Today's Focus",
    tooltip: 'Relevant tasks will be visible here',
  },
  {
    id: 'zone-out',
    title: 'Zone Out Area',
    tooltip: 'Relax and unwind here',
  },
  {
    id: 'mood-tracker',
    title: 'Mood Tracker',
    tooltip: 'Check-in your energy levels anytime',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  visible,
  onComplete,
  onSkip,
}) => {
  const { colors } = useThemeColors();
  const [currentStep, setCurrentStep] = useState(0);

  if (!visible) return null;

  const currentStepData = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  return (
    <View style={[styles.overlay, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]}>
      {/* Skip Button */}
      <TouchableOpacity
        style={[
          styles.skipButton,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
        onPress={handleSkip}
      >
        <Text style={[styles.skipButtonText, { color: colors.text }]}>
          Skip
        </Text>
      </TouchableOpacity>

      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: colors.background }]}>
          {currentStep + 1}/{TUTORIAL_STEPS.length}
        </Text>
      </View>

      {/* Tooltip */}
      <View
        style={[
          styles.tooltip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
          },
        ]}
      >
        <Text style={[styles.tooltipTitle, { color: colors.text }]}>
          {currentStepData.title}
        </Text>
        <Text style={[styles.tooltipText, { color: colors.textSecondary }]}>
          {currentStepData.tooltip}
        </Text>
      </View>

      {/* Navigation */}
      <View style={styles.navigation}>
        <TouchableOpacity
          style={[
            styles.navButton,
            {
              backgroundColor: colors.buttonBackground,
            },
          ]}
          onPress={handleNext}
        >
          <Text style={[styles.navButtonText, { color: colors.buttonText }]}>
            {currentStep === TUTORIAL_STEPS.length - 1 ? 'Finish' : 'Next'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Start/End Messages */}
      {currentStep === 0 && (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: colors.background }]}>
            Quick Intro
          </Text>
        </View>
      )}
      
      {currentStep === TUTORIAL_STEPS.length - 1 && (
        <View style={styles.messageContainer}>
          <Text style={[styles.messageText, { color: colors.background }]}>
            You're ready to go!
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2000,
  },
  skipButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    zIndex: 2001,
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 2001,
  },
  progressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  tooltip: {
    position: 'absolute',
    bottom: height * 0.3,
    left: 20,
    right: 20,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    zIndex: 2003,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 16,
    lineHeight: 22,
  },
  navigation: {
    position: 'absolute',
    bottom: height * 0.2,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 2003,
  },
  navButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 120,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  messageContainer: {
    position: 'absolute',
    top: height * 0.2,
    left: 20,
    right: 20,
    alignItems: 'center',
    zIndex: 2003,
  },
  messageText: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});
