import React from 'react';
import Svg, { Line, Polyline } from 'react-native-svg';

interface TextIconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

export default function TextIcon({ 
  size = 24, 
  color = 'currentColor', 
  strokeWidth = 2 
}: TextIconProps) {
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
      <Polyline points="4 7 4 4 20 4 20 7" />
      <Line x1="9" x2="15" y1="20" y2="20" />
      <Line x1="12" x2="12" y1="4" y2="20" />
    </Svg>
  );
}
