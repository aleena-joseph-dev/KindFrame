import { useThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { StyleSheet, TouchableOpacity, ViewStyle } from 'react-native';
import { CheckIcon } from './CheckIcon';

interface SubmitButtonProps {
  onPress: () => void;
  size?: 'big' | 'medium' | 'small';
  style?: ViewStyle;
  disabled?: boolean;
}

export function SubmitButton({ onPress, size = 'medium', style, disabled }: SubmitButtonProps) {
  const { colors } = useThemeColors();
  const sizes = { big: 64, medium: 48, small: 36 };
  const iconSizes = { big: 36, medium: 28, small: 20 };
  const btnSize = sizes[size];
  const iconSize = iconSizes[size];
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.button, width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <CheckIcon size={iconSize} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
}); 