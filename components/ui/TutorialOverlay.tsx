import { useThemeColors } from '@/hooks/useThemeColors';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

interface TutorialStep {
  id: string;
  title: string;
  tooltip: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  tooltipPosition: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  visible: boolean;
  onComplete: () => void;
  onSkip: () => void;
  componentPositions?: {
    quickJot: { x: number; y: number; width: number; height: number };
    menu: { x: number; y: number; width: number; height: number };
    todaysFocus: { x: number; y: number; width: number; height: number };
    zoneOut: { x: number; y: number; width: number; height: number };
    moodTracker: { x: number; y: number; width: number; height: number };
  };
  onStepChange?: (stepIndex: number) => void;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 'quick-jot',
    title: 'Quick Jot',
    tooltip: 'AI: Capture quick thoughts and convert them to tasks',
    position: { x: width - 70, y: height * 0.8, width: 50, height: 50 }, // Bottom-right square icon (blue document with lightning bolt)
    tooltipPosition: 'top',
  },
  {
    id: 'menu',
    title: 'Menu',
    tooltip: 'Create tasks using your preferred tool',
    position: { x: 20, y: height * 0.8, width: 50, height: 50 }, // Bottom-left square icon (blue folder with plus)
    tooltipPosition: 'top',
  },
  {
    id: 'todays-focus',
    title: "Today's Focus",
    tooltip: 'Relevant tasks will be visible here',
    position: { x: 20, y: 280, width: width - 40, height: 120 }, // Fallback position - will be overridden by actual measurement
    tooltipPosition: 'bottom',
  },
  {
    id: 'zone-out',
    title: 'Zone Out Area',
    tooltip: 'Relax and unwind here',
    position: { x: 30, y: height * 0.9, width: 60, height: 30 }, // Headphones icon in bottom nav (left side)
    tooltipPosition: 'top',
  },
  {
    id: 'mood-tracker',
    title: 'Mood Tracker',
    tooltip: 'Check-in your energy levels anytime',
    position: { x: width * 0.4, y: height * 0.9, width: 60, height: 30 }, // Smiling face icon in bottom nav (middle)
    tooltipPosition: 'top',
  },
];

export const TutorialOverlay: React.FC<TutorialOverlayProps> = ({
  visible,
  onComplete,
  onSkip,
  componentPositions,
  onStepChange,
}) => {
  const { colors } = useThemeColors();
  const [currentStep, setCurrentStep] = useState(0);

  console.log('🎯 TUTORIAL OVERLAY: visible =', visible, 'currentStep =', currentStep);

  // Reset step and call onStepChange when tutorial first becomes visible
  const [hasInitialized, setHasInitialized] = useState(false);
  
  useEffect(() => {
    if (visible && !hasInitialized) {
      console.log('🎯 TUTORIAL OVERLAY: Tutorial first became visible, resetting to step 0');
      setCurrentStep(0);
      setHasInitialized(true);
      // Small delay to ensure state is updated before calling onStepChange
      setTimeout(() => {
        onStepChange?.(0);
      }, 0);
    } else if (!visible) {
      setHasInitialized(false);
    }
  }, [visible, hasInitialized, onStepChange]);

  if (!visible) return null;

  const currentStepData = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    console.log('🎯 TUTORIAL OVERLAY: handleNext called, currentStep =', currentStep);
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      const nextStep = currentStep + 1;
      console.log('🎯 TUTORIAL OVERLAY: Moving to next step:', nextStep);
      setCurrentStep(nextStep);
      console.log('🎯 TUTORIAL OVERLAY: Calling onStepChange with step:', nextStep);
      onStepChange?.(nextStep);
    } else {
      console.log('🎯 TUTORIAL OVERLAY: Tutorial complete');
      onComplete();
    }
  };

  const handleSkip = () => {
    onSkip();
  };

  // Get actual component position or fallback to default
  const getComponentPosition = (stepId: string) => {
    if (componentPositions) {
      switch (stepId) {
        case 'quick-jot':
          return componentPositions.quickJot;
        case 'menu':
          return componentPositions.menu;
        case 'todays-focus':
          return componentPositions.todaysFocus;
        case 'zone-out':
          return componentPositions.zoneOut;
        case 'mood-tracker':
          return componentPositions.moodTracker;
        default:
          return TUTORIAL_STEPS.find(step => step.id === stepId)?.position || { x: 0, y: 0, width: 0, height: 0 };
      }
    }
    return TUTORIAL_STEPS.find(step => step.id === stepId)?.position || { x: 0, y: 0, width: 0, height: 0 };
  };

  // Calculate highlight position centered on the actual component (1.2x bigger)
  const getHighlightPosition = () => {
    const position = getComponentPosition(currentStepData.id);
    const scale = 1.2;
    const newWidth = position.width * scale;
    const newHeight = position.height * scale;
    
    // Calculate center of actual component
    const componentCenterX = position.x + position.width / 2;
    const componentCenterY = position.y + position.height / 2;
    
    // Position highlight so its center matches the component's center
    return {
      left: componentCenterX - newWidth / 2,
      top: componentCenterY - newHeight / 2,
      width: newWidth,
      height: newHeight,
    };
  };

  const getTooltipPosition = () => {
    const { tooltipPosition } = currentStepData;
    const tooltipWidth = 200;
    const tooltipHeight = 80;
    const margin = currentStepData.id === 'quick-jot' ? 40 : 20; // Increased margin for Quick Jot
    
    // Get the highlight position to position tooltip relative to it
    const highlight = getHighlightPosition();
    
    let tooltipLeft: number;
    let tooltipTop: number;
    
    switch (tooltipPosition) {
      case 'top':
        tooltipLeft = highlight.left + highlight.width / 2 - tooltipWidth / 2;
        tooltipTop = highlight.top - tooltipHeight - margin;
        break;
      case 'bottom':
        tooltipLeft = highlight.left + highlight.width / 2 - tooltipWidth / 2;
        tooltipTop = highlight.top + highlight.height + margin;
        break;
      case 'left':
        tooltipLeft = highlight.left - tooltipWidth - margin;
        tooltipTop = highlight.top + highlight.height / 2 - tooltipHeight / 2;
        break;
      case 'right':
        tooltipLeft = highlight.left + highlight.width + margin;
        tooltipTop = highlight.top + highlight.height / 2 - tooltipHeight / 2;
        break;
      default:
        tooltipLeft = highlight.left + highlight.width / 2 - tooltipWidth / 2;
        tooltipTop = highlight.top + highlight.height + margin;
    }
    
    // Ensure tooltip doesn't go off screen - handle wide components
    if (highlight.width > width - 2 * margin) {
      // For wide components like Today's Focus, center the tooltip
      tooltipLeft = (width - tooltipWidth) / 2;
    } else {
      tooltipLeft = Math.max(margin, Math.min(tooltipLeft, width - tooltipWidth - margin));
    }
    tooltipTop = Math.max(margin, Math.min(tooltipTop, height - tooltipHeight - margin));
    
    return { left: tooltipLeft, top: tooltipTop };
  };

  const getNextButtonPosition = () => {
    const tooltipPos = getTooltipPosition();
    const buttonWidth = 120;
    const buttonHeight = 50;
    const gap = 20;
    
    // Special positioning for Today's Focus step
    if (currentStepData.id === 'todays-focus') {
      return {
        left: tooltipPos.left + 100 - buttonWidth / 2, // Center below tooltip
        top: tooltipPos.top + 80 + gap + 15, // Below tooltip with extra gap (80 is tooltip height + 15 extra)
      };
    }
    
    // Default positioning for other steps
    return {
      left: tooltipPos.left + 100 - buttonWidth / 2, // Center above tooltip
      top: tooltipPos.top - buttonHeight - gap, // Above tooltip with gap
    };
  };

  const highlightPosition = getHighlightPosition();
  const tooltipPosition = getTooltipPosition();
  const nextButtonPosition = getNextButtonPosition();

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

      {/* Highlight Area for Current Feature - Centered and 1.2x bigger */}
      <View
        style={[
          styles.highlight,
          {
            left: highlightPosition.left,
            top: highlightPosition.top,
            width: highlightPosition.width,
            height: highlightPosition.height,
            borderColor: colors.primary,
            zIndex: 2006, // Above overlay and other elements
          },
        ]}
      />

      {/* Tooltip positioned near the feature */}
      <View
        style={[
          styles.tooltip,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            left: tooltipPosition.left,
            top: tooltipPosition.top,
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

      {/* Navigation - Positioned based on step */}
      <View
        style={[
          styles.navigation,
          {
            left: nextButtonPosition.left,
            top: nextButtonPosition.top,
          },
        ]}
      >
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
  highlight: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    zIndex: 2006, // Above overlay and other elements
  },
  tooltip: {
    position: 'absolute',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    width: 200,
    zIndex: 2007, // Above highlight
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  tooltipTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 14,
    lineHeight: 20,
  },
  navigation: {
    position: 'absolute',
    zIndex: 2008, // Above tooltip
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
