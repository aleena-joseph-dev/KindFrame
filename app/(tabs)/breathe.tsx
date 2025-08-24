import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import TopBar from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import React, { useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, TouchableOpacity, useWindowDimensions, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import InfoModal from '@/components/ui/InfoModal';

const INHALE_DURATION = 4000;
const HOLD_DURATION = 7000;
const EXHALE_DURATION = 8000;
const COUNTDOWN_DURATION = 1000; // 1 second per count

const PHASES = [
  { key: 'inhale', label: 'Breathe in', duration: INHALE_DURATION },
  { key: 'hold', label: 'Hold', duration: HOLD_DURATION },
  { key: 'exhale', label: 'Breathe out', duration: EXHALE_DURATION },
];

export default function BreatheScreen() {
  const { colors } = useThemeColors();
  const { handleBack, addToStack } = usePreviousScreen();
  const { width, height } = useWindowDimensions();
  const [isRunning, setIsRunning] = useState(false);
  const [isCountdown, setIsCountdown] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [phaseTimer, setPhaseTimer] = useState<number | null>(null);
  const [phaseCount, setPhaseCount] = useState<number | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const fillAnim = useRef(new Animated.Value(0)).current;
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  React.useEffect(() => {
    addToStack('breathe');
    return () => stopBreathing();
  }, [addToStack]);

  React.useEffect(() => {
    if (isRunning) startPhase(phaseIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isRunning, phaseIndex]);

  React.useEffect(() => {
    // Clean up timer on unmount
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startCountdown = () => {
    setIsCountdown(true);
    setCountdown(3);
    setPhaseCount(null);
    if (timerRef.current) clearInterval(timerRef.current);
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          setIsCountdown(false);
          setIsRunning(true);
          return 3;
        }
        return prev - 1;
      });
    }, COUNTDOWN_DURATION);
    timerRef.current = countdownInterval;
  };

  const startPhase = (index: number) => {
    const phase = PHASES[index];
    let count = null;
    let max = null;
    if (phase.key === 'inhale') {
      count = 1;
      max = 4;
    } else if (phase.key === 'hold') {
      count = 7;
      max = 1;
    } else if (phase.key === 'exhale') {
      count = 1;
      max = 8;
    }
    setPhaseCount(count);
    if (timerRef.current) clearInterval(timerRef.current);
    if (phase.key === 'inhale') {
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: phase.duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start(() => nextPhase());
      // Count up 1-4
      let t = 1;
      timerRef.current = setInterval(() => {
        setPhaseCount(c => {
          if (c !== null && c < 4) return c + 1;
          return c;
        });
        t++;
        if (t > 4) clearInterval(timerRef.current!);
      }, 1000);
    } else if (phase.key === 'hold') {
      Animated.timing(fillAnim, {
        toValue: 1,
        duration: phase.duration,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start(() => nextPhase());
      // Count down 7-1
      let t = 7;
      timerRef.current = setInterval(() => {
        setPhaseCount(c => {
          if (c !== null && c > 1) return c - 1;
          return c;
        });
        t--;
        if (t < 2) clearInterval(timerRef.current!);
      }, 1000);
    } else if (phase.key === 'exhale') {
      Animated.timing(fillAnim, {
        toValue: 0,
        duration: phase.duration,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start(() => {
        setCycleCount(c => c + 1);
        nextPhase();
      });
      // Count up 1-8
      let t = 1;
      timerRef.current = setInterval(() => {
        setPhaseCount(c => {
          if (c !== null && c < 8) return c + 1;
          return c;
        });
        t++;
        if (t > 8) clearInterval(timerRef.current!);
      }, 1000);
    }
  };

  const nextPhase = () => {
    setPhaseIndex(prev => {
      const next = (prev + 1) % PHASES.length;
      return next;
    });
  };

  const startBreathing = () => {
    setShowSummary(false);
    setCycleCount(0);
    setPhaseIndex(0);
    setPhaseCount(null);
    startCountdown();
  };

  const stopBreathing = () => {
    setIsRunning(false);
    setIsCountdown(false);
    fillAnim.stopAnimation();
    setShowSummary(true);
    setPhaseCount(null);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const handleInfo = () => {
    setShowInfoModal(true);
  };

  const currentPhase = PHASES[phaseIndex];
  const circleSize = Math.min(width, height) * 0.6;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>  
      <TopBar 
        title="Breathe With Me" 
        onBack={() => handleBack()} 
        showInfo={true}
        onInfo={handleInfo} 
      />
      <View style={styles.content}>
        <View style={styles.instructionsBox}>
          <Text style={[styles.instructions, { color: colors.text, fontSize: 22 }]} accessibilityLiveRegion="polite">
            {showSummary ? 'Session Complete' : isCountdown ? countdown.toString() : currentPhase.label}
          </Text>
          {/* Timer display for each phase */}
          {!showSummary && !isCountdown && phaseCount !== null && (
            <Text style={[styles.phaseCount, { color: colors.textSecondary, fontSize: 32, marginTop: 8 }]}
              accessibilityLiveRegion="polite">
              {currentPhase.key === 'hold' ? phaseCount : phaseCount}
            </Text>
          )}
        </View>
        <View style={[styles.circleContainer, { height: circleSize, width: circleSize }]}>  
          <View style={[styles.circleBg, { 
            backgroundColor: colors.cardBackground, 
            width: circleSize, 
            height: circleSize, 
            borderRadius: circleSize / 2 
          }]} />
          <Animated.View
            style={[
              styles.circleFill,
              {
                backgroundColor: colors.primary,
                width: circleSize,
                height: circleSize,
                borderRadius: circleSize / 2,
                opacity: 0.7,
                position: 'absolute',
                top: 0,
                left: 0,
                transform: [
                  {
                    scale: fillAnim.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }),
                  },
                ],
              },
            ]}
          />
        </View>
        <View style={styles.controls}>
          {!isRunning && !isCountdown && (
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonBackground }]} onPress={startBreathing} accessibilityRole="button">
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>{showSummary ? 'Start Again' : 'Start'}</Text>
            </TouchableOpacity>
          )}
          {isRunning && (
            <TouchableOpacity style={[styles.button, { backgroundColor: colors.buttonBackground }]} onPress={stopBreathing} accessibilityRole="button">
              <Text style={[styles.buttonText, { color: colors.buttonText }]}>Stop</Text>
            </TouchableOpacity>
          )}
        </View>
        {showSummary && cycleCount > 0 && (
          <View style={styles.summaryBox}>
            <Text style={[styles.summaryText, { color: colors.text }]}>Great job!</Text>
            <Text style={[styles.summaryText, { color: colors.textSecondary }]}>{`You did ${cycleCount} cycle${cycleCount === 1 ? '' : 's'}!`}</Text>
          </View>
        )}
      </View>
      
      {/* Info Modal */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Breathing Exercise Guide"
        sections={[
          {
            title: "Purpose",
            content: "Breathing exercises help regulate your nervous system, reduce stress, and bring you back to the present moment. This guided breathing pattern follows a 4-4-4 rhythm."
          },
          {
            title: "How to Use",
            content: "Tap the circle to start. Follow the visual cues: expand on inhale, hold steady, and contract on exhale. Focus on your breath and let go of other thoughts."
          }
        ]}
        tips={[
          "Find a comfortable position",
          "Close your eyes if it helps you focus",
          "Don't force your breath - let it flow naturally",
          "Practice regularly for best results"
        ]}
        description="Breathing exercises are one of the most effective ways to activate your parasympathetic nervous system and find calm in moments of stress or overwhelm."
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  instructionsBox: {
    marginBottom: 24,
    alignItems: 'center',
  },
  instructions: {
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  circleBg: {
    position: 'absolute',
    opacity: 0.25,
  },
  circleFill: {
    position: 'absolute',
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 24,
  },
  button: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 24,
    marginHorizontal: 8,
    marginTop: 8,
    elevation: 2,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  summaryBox: {
    alignItems: 'center',
    marginTop: 24,
  },
  summaryText: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 6,
  },
  phaseCount: {
    fontWeight: 'bold',
  },
}); 