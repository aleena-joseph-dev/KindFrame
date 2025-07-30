import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

interface FilmIconProps {
  size?: number;
  color?: string;
}

export const FilmIcon: React.FC<FilmIconProps> = ({ size = 24, color = '#000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect
        x="2"
        y="3"
        width="20"
        height="18"
        rx="2"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M7 3V21"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M17 3V21"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M2 9H22"
        stroke={color}
        strokeWidth="2"
      />
      <Path
        d="M2 15H22"
        stroke={color}
        strokeWidth="2"
      />
    </Svg>
  );
}; 