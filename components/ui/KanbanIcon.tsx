import React from 'react';
import Svg, { Rect } from 'react-native-svg';

interface KanbanIconProps {
  size?: number;
  color?: string;
}

export const KanbanIcon: React.FC<KanbanIconProps> = ({ 
  size = 24, 
  color = '#6b7260' 
}) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Rect width="18" height="18" x="3" y="3" rx="2" ry="2" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Rect width="3" height="9" x="7" y="7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <Rect width="3" height="5" x="14" y="7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}; 