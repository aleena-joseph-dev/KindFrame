import React, { useEffect, useRef } from 'react';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface AnimatedJotBoxIconProps {
  size?: number;
  isAnimating?: boolean;
  isCompleted?: boolean;
  color?: string;
}

const NUM_LINES = 7;
const LINE_START_X = 7;
const LINE_END_X = 17;
const LINE_Y_START = 5.5;
const LINE_Y_END = 18.5;
const LINE_LENGTH = LINE_END_X - LINE_START_X;

export default function AnimatedJotBoxIcon({ size = 24, isAnimating = false, isCompleted = false, color = '#64748B' }: AnimatedJotBoxIconProps) {
  // Create shared values for each line
  const line1 = useSharedValue(1);
  const line2 = useSharedValue(1);
  const line3 = useSharedValue(1);
  const line4 = useSharedValue(1);
  const line5 = useSharedValue(1);
  
  // Create animated props for each line
  const animatedLine1Props = useAnimatedProps(() => ({
    strokeDasharray: `${LINE_LENGTH}`,
    strokeDashoffset: line1.value * LINE_LENGTH,
  }));
  const animatedLine2Props = useAnimatedProps(() => ({
    strokeDasharray: `${LINE_LENGTH}`,
    strokeDashoffset: line2.value * LINE_LENGTH,
  }));
  const animatedLine3Props = useAnimatedProps(() => ({
    strokeDasharray: `${LINE_LENGTH}`,
    strokeDashoffset: line3.value * LINE_LENGTH,
  }));
  const animatedLine4Props = useAnimatedProps(() => ({
    strokeDasharray: `${LINE_LENGTH}`,
    strokeDashoffset: line4.value * LINE_LENGTH,
  }));
  const animatedLine5Props = useAnimatedProps(() => ({
    strokeDasharray: `${LINE_LENGTH}`,
    strokeDashoffset: line5.value * LINE_LENGTH,
  }));
  
  // Store lines in an array for easier access
  const linesRef = useRef([line1, line2, line3, line4, line5]);
  const animatedLinePropsRef = useRef([animatedLine1Props, animatedLine2Props, animatedLine3Props, animatedLine4Props, animatedLine5Props]);
  
  const lightningOpacity = useSharedValue(1);
  const animatedLightningProps = useAnimatedProps(() => ({ opacity: lightningOpacity.value }));

  // Helper to animate lines sequentially
  function animateLinesSequentially(index = 0) {
    if (index >= NUM_LINES) return;
    
    // Animate all lines with different delays from the start
    linesRef.current.forEach((line, i) => {
      line.value = 1; // Reset to start position
      line.value = withDelay(i * 1200, withTiming(0, { duration: 1000, easing: Easing.out(Easing.ease) }));
    });
  }

  // Helper to set all lines to completed state
  function setLinesToCompleted() {
    linesRef.current.forEach((progress) => {
      progress.value = 0; // Set to completed state (no dash offset)
    });
  }

  useEffect(() => {
    if (isAnimating) {
      // Lightning flash animation
      lightningOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 600 }),
          withTiming(1, { duration: 600 })
        ),
        -1,
        true
      );
      // Reset all lines to hidden, then animate sequentially
      linesRef.current.forEach((progress) => {
        progress.value = 1;
      });
      animateLinesSequentially(0);
    } else if (isCompleted) {
      // Show completed state
      lightningOpacity.value = withTiming(1, { duration: 300 });
      setLinesToCompleted();
    } else {
      // Reset lightning, keep lines in initial state
      lightningOpacity.value = withTiming(1, { duration: 300 });
      // Reset all lines to initial state
      linesRef.current.forEach((progress) => {
        progress.value = 1;
      });
    }

    // Cleanup function to stop animations when component unmounts
    return () => {
      // Stop all animations immediately
      lightningOpacity.value = withTiming(1, { duration: 0 });
      linesRef.current.forEach((line) => {
        line.value = withTiming(0, { duration: 0 }); // Set to completed state (no dash offset)
      });
      // Always set to completed state when unmounting
      setLinesToCompleted();
    };
  }, [isAnimating, isCompleted]);

  // Calculate vertical spacing for lines
  const lineYs = Array.from({ length: NUM_LINES }, (_, i) =>
    LINE_Y_START + ((LINE_Y_END - LINE_Y_START) * i) / (NUM_LINES - 1)
  );

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Notepad background */}
      <Path
        d="M6 2H18C18.5523 2 19 2.44772 19 3V21C19 21.5523 18.5523 22 18 22H6C5.44772 22 5 21.5523 5 21V3C5 2.44772 5.44772 2 6 2Z"
        fill="white"
        stroke={color}
        strokeWidth="2"
      />
      {/* Animated writing lines */}
      {lineYs.map((y, i) => (
        <AnimatedPath
          key={i}
          d={`M${LINE_START_X} ${y}H${LINE_END_X}`}
          stroke={color}
          strokeWidth="1.2"
          strokeLinecap="round"
          animatedProps={animatedLinePropsRef.current[i]}
        />
      ))}
      {/* Animated lightning bolt */}
      <AnimatedPath
        d="M13.5 3L10 10H14L10.5 17L14 10H10L13.5 3Z"
        fill="#FFE135"
        stroke="#FFE135"
        strokeWidth="2"
        strokeLinejoin="round"
        animatedProps={animatedLightningProps}
      />
    </Svg>
  );
} 