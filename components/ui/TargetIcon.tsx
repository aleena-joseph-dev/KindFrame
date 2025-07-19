import React from 'react';
import Svg, { Circle } from 'react-native-svg';

interface TargetIconProps {
  size?: number;
  color?: string;
}

export const TargetIcon: React.FC<TargetIconProps> = ({ 
  size = 24, 
  color = '#6b7260' 
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="12" r="6" stroke={color} strokeWidth="2" />
      <Circle cx="12" cy="12" r="2" stroke={color} strokeWidth="2" />
    </Svg>
  );
}; 