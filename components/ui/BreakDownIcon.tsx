import React from 'react';
import Svg, { Path, Circle } from 'react-native-svg';

interface BreakDownIconProps {
  size?: number;
  color?: string;
}

export default function BreakDownIcon({ size = 24, color = '#000' }: BreakDownIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      {/* Main sparkle/star shape */}
      <Path
        d="M12 2L13.09 8.26L20 9L13.09 9.74L12 16L10.91 9.74L4 9L10.91 8.26L12 2Z"
        fill={color}
      />
      {/* Small sparkles around */}
      <Circle cx="6" cy="6" r="1" fill={color} opacity="0.7" />
      <Circle cx="18" cy="6" r="1" fill={color} opacity="0.7" />
      <Circle cx="6" cy="18" r="1" fill={color} opacity="0.7" />
      <Circle cx="18" cy="18" r="1" fill={color} opacity="0.7" />
    </Svg>
  );
} 