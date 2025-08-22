import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface InfoIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function InfoIcon({ 
  size = 24, 
  color = 'currentColor', 
  strokeWidth = 2 
}: InfoIconProps) {
  return (
    <Svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke={color} 
      strokeWidth={strokeWidth} 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <Circle cx="12" cy="12" r="10" />
      <Path d="M12 16v-4" />
      <Path d="M12 8h.01" />
    </Svg>
  );
}