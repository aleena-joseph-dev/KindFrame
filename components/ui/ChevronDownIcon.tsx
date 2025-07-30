import React from 'react';
import { Animated } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ChevronIconProps {
  size?: number;
  color?: string;
  isExpanded?: boolean;
  animated?: boolean;
}

export const ChevronIcon: React.FC<ChevronIconProps> = ({ 
  size = 24, 
  color = '#6b7280',
  isExpanded = false,
  animated = true
}) => {
  const rotateAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (animated) {
      Animated.timing(rotateAnim, {
        toValue: isExpanded ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isExpanded, animated, rotateAnim]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <Animated.View style={{ transform: [{ rotate }] }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M6 9l6 6 6-6"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </Animated.View>
  );
};

// Keep the old name for backward compatibility
export const ChevronDownIcon = ChevronIcon; 