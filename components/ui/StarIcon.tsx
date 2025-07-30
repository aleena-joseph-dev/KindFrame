import React from 'react';
import Svg, { Path } from 'react-native-svg';

interface StarIconProps {
  size?: number;
  color?: string;
}

export const StarIcon: React.FC<StarIconProps> = ({ size = 24, color = '#000' }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2L15.09 8.26L22 9L16.5 14.14L17.82 21.02L12 17.77L6.18 21.02L7.5 14.14L2 9L8.91 8.26L12 2Z"
        fill={color}
      />
    </Svg>
  );
}; 