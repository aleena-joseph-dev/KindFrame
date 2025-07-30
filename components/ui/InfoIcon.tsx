import React from 'react';
import Svg, { Circle, Text } from 'react-native-svg';

interface InfoIconProps {
  size?: number;
  color?: string;
}

export default function InfoIcon({ size = 24, color = '#64748B' }: InfoIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeWidth="2"
        fill="none"
      />
      <Text
        x="12"
        y="16"
        fontSize="14"
        fontStyle="italic"
        fontWeight="bold"
        textAnchor="middle"
        fill={color}
        fontFamily="serif"
      >
        i
      </Text>
    </Svg>
  );
} 