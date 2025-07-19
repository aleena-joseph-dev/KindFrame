import React from 'react';
import Svg, { Circle, Polyline } from 'react-native-svg';

interface ClockIconProps {
  size?: number;
  color?: string;
}

export const ClockIcon: React.FC<ClockIconProps> = ({ 
  size = 24, 
  color = '#6b7260' 
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Polyline points="12 6 12 12 16 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}; 