import React, { useEffect, useRef } from 'react';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface SimpleAnimatedIconProps {
  size?: number;
  isAnimating?: boolean;
}

export default function SimpleAnimatedIcon({ size = 24, isAnimating = false }: SimpleAnimatedIconProps) {
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isAnimating) {
      // Rotation animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(rotationAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(rotationAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Scale animation
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Reset animations
      rotationAnim.setValue(0);
      scaleAnim.setValue(1);
    }
  }, [isAnimating]);

  const spin = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={{
        transform: [
          { rotate: spin },
          { scale: scaleAnim }
        ]
      }}
    >
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
          fill="#F59E0B"
          stroke="#D97706"
          strokeWidth="2"
        />
      </Svg>
    </Animated.View>
  );
} 