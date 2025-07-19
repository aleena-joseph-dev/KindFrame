import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface ToggleButtonProps {
  isOn: boolean;
  onToggle: () => void;
  size?: number;
  color?: string;
}

export const ToggleButton: React.FC<ToggleButtonProps> = ({ 
  isOn, 
  onToggle, 
  size = 24, 
  color = '#6b7260' 
}) => {
  const PowerIcon = () => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path 
        d="M12 2v10" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      <Path 
        d="M18.4 6.6a9 9 0 1 1-12.77.04" 
        stroke={color} 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
    </Svg>
  );

  return (
    <TouchableOpacity 
      style={[
        styles.toggleButton, 
        { 
          backgroundColor: isOn ? '#8b9a8b' : '#f3f4f6',
          borderColor: isOn ? '#8b9a8b' : '#e5e7eb'
        }
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <PowerIcon />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  toggleButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 3,
  },
}); 