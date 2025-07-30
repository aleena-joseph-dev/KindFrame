import { useThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface BackButtonProps {
  onPress: () => void;
  size?: 'big' | 'medium' | 'small';
  style?: ViewStyle;
  disabled?: boolean;
}

export function BackButton({ onPress, size = 'medium', style, disabled }: BackButtonProps) {
  const { colors } = useThemeColors();
  const sizes = { big: 64, medium: 48, small: 36 };
  const fontSizes = { big: 36, medium: 28, small: 20 };
  const btnSize = sizes[size];
  const fontSize = fontSizes[size];
  return (
    <TouchableOpacity
      style={[styles.button, { backgroundColor: colors.buttonBackground, width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Text style={{ fontSize, color: colors.text }}>{'‹'}</Text>
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