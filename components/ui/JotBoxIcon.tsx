import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface JotBoxIconProps {
  size?: number;
}

export default function JotBoxIcon({ size = 24 }: JotBoxIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 2H18C18.5523 2 19 2.44772 19 3V21C19 21.5523 18.5523 22 18 22H6C5.44772 22 5 21.5523 5 21V3C5 2.44772 5.44772 2 6 2Z"
        fill="white"
        stroke="#64748B"
        strokeWidth="2"
      />
      {/* Writing lines on the notepad */}
      <Path
        d="M8 6H12M8 9H14M8 12H11"
        stroke="#94A3B8"
        strokeWidth="1"
        strokeLinecap="round"
      />
      {/* Lightning bolt for quick action */}
      <Path
        d="M13.5 3L10 10H14L10.5 17L14 10H10L13.5 3Z"
        fill="#F59E0B"
        stroke="#D97706"
        strokeWidth="2"
        strokeLinejoin="round"
      />
    </Svg>
  );
} 