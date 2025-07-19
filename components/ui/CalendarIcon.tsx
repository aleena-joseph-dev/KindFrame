import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface CalendarIconProps {
  size?: number;
  color?: string;
}

export const CalendarIcon: React.FC<CalendarIconProps> = ({ 
  size = 24, 
  color = '#6b7260' 
}) => {
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        {/* Calendar outline */}
        <Path 
          d="M8 2v4" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <Path 
          d="M16 2v4" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
        <Rect 
          width="18" 
          height="18" 
          x="3" 
          y="4" 
          rx="2" 
          stroke={color} 
          strokeWidth="2" 
          fill="none" 
        />
        <Path 
          d="M3 10h18" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round" 
        />
      </Svg>
      
      {/* Prominent "17" number as overlay */}
      <Text
        style={{
          position: 'absolute',
          bottom: 2,
          left: 0,
          right: 0,
          textAlign: 'center',
          fontSize: size * 0.3,
          fontWeight: 'bold',
          color: color,
        }}
      >
        17
      </Text>
    </View>
  );
}; 