import React from 'react';
import Svg, { Path, Polyline } from 'react-native-svg';

interface HomeIconProps {
  size?: number;
  color?: string;
}

export const HomeIcon: React.FC<HomeIconProps> = ({ size = 24, color = '#3b82f6' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="9 22 9 12 15 12 15 22"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}; 