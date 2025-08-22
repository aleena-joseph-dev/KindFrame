import React from 'react';
import Svg, { Line, Path } from 'react-native-svg';

interface MicIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function MicIcon({ 
  size = 24, 
  color = 'currentColor', 
  strokeWidth = 2 
}: MicIconProps) {
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
      <Path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
      <Path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <Line x1="12" x2="12" y1="19" y2="22" />
    </Svg>
  );
}
