import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

interface ToggleSwitchProps {
  isOn: boolean;
  onToggle: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  isOn, 
  onToggle, 
  size = 'medium',
  color = '#8b9a8b'
}) => {
  const getSize = () => {
    switch (size) {
      case 'small':
        return { width: 32, height: 18, knobSize: 14 };
      case 'large':
        return { width: 48, height: 26, knobSize: 22 };
      default:
        return { width: 40, height: 22, knobSize: 18 };
    }
  };

  const { width, height, knobSize } = getSize();
  const knobOffset = isOn ? width - knobSize - 2 : 2;

  return (
    <TouchableOpacity 
      style={[
        styles.track, 
        { 
          width, 
          height, 
          backgroundColor: isOn ? color : '#e5e7eb',
          borderRadius: height / 2,
        }
      ]}
      onPress={onToggle}
      activeOpacity={0.8}
    >
      <View 
        style={[
          styles.knob, 
          { 
            width: knobSize, 
            height: knobSize, 
            borderRadius: knobSize / 2,
            transform: [{ translateX: knobOffset }]
          }
        ]} 
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  track: {
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  knob: {
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
}); 