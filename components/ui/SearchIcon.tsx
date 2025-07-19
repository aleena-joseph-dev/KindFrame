import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

interface SearchIconProps {
  size?: number;
  color?: string;
}

export const SearchIcon: React.FC<SearchIconProps> = ({ 
  size = 24, 
  color = '#6b7260' 
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="11" cy="11" r="8" stroke={color} strokeWidth="2" />
      <Path d="m21 21-4.35-4.35" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}; 