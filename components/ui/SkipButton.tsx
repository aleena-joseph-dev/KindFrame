import { useThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';

interface SkipButtonProps {
  onPress: () => void;
  size?: 'big' | 'medium' | 'small';
  style?: ViewStyle;
  disabled?: boolean;
  label?: string;
}

export function SkipButton({ onPress, size = 'medium', style, disabled, label = 'Skip' }: SkipButtonProps) {
  const { colors } = useThemeColors();
  const fontSizes = { big: 20, medium: 16, small: 14 };
  const fontSize = fontSizes[size];
  return (
    <TouchableOpacity
      style={[styles.button, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={{ fontSize, color: colors.textSecondary, fontWeight: '500' }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
}); 