import React, { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface MenuIconProps {
  size?: number;
  color?: string;
  isAnimating?: boolean;
}

export default function MenuIcon({ size = 24, color = '#3B82F6', isAnimating = false }: MenuIconProps) {
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isAnimating) {
      // Create sequence of 6 rotations with pauses
      const createRotationSequence = () => {
        const sequence = [];
        
        for (let i = 0; i < 6; i++) { // Changed from 4 to 6
          // Rotate 90 degrees in 0.5 seconds
          sequence.push(
            Animated.timing(rotation, {
              toValue: (i + 1) * 90,
              duration: 500,
              useNativeDriver: true,
            })
          );
          
          // Add 0.5 second pause (except after the last rotation)
          if (i < 5) { // Changed from 3 to 5
            sequence.push(
              Animated.timing(rotation, {
                toValue: (i + 1) * 90, // Keep the same value for pause
                duration: 500,
                useNativeDriver: true,
              })
            );
          }
        }
        
        return Animated.sequence(sequence);
      };
      
      const animation = createRotationSequence();
      animation.start();

      // Return cleanup function to stop animation
      return () => {
        animation.stop();
        rotation.stopAnimation();
        // Set to completed state (360 degrees = full rotation)
        rotation.setValue(360);
      };
    } else {
      // Stop animation when isAnimating becomes false
      rotation.stopAnimation();
      // Set to completed state (360 degrees = full rotation)
      rotation.setValue(360);
    }
  }, [isAnimating, rotation]);

  const animatedPlusStyle = {
    transform: [{
      rotate: rotation.interpolate({
        inputRange: [0, 360],
        outputRange: ['0deg', '360deg']
      })
    }]
  };

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Static folder icon */}
      <Svg width={size} height={size} viewBox="0 0 32 32" fill="none" style={{ position: 'absolute' }}>
        <Path
          d="M13 5H5C3.34315 5 2 6.34315 2 8V24C2 25.6569 3.34315 27 5 27H27C28.6569 27 30 25.6569 30 24V11C30 9.34315 28.6569 8 27 8H15L13 5Z"
          fill={color}
          stroke={color}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
      
      {/* Animated plus sign */}
      <Animated.View style={[animatedPlusStyle, { position: 'absolute', width: size, height: size }]}>
        <Svg width={size} height={size} viewBox="0 0 32 32" fill="none">
          <Path
            d="M16 13V19M13 16H19"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
} 