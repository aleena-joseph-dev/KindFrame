import { useThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { StyleSheet, TouchableOpacity, View, ViewStyle } from 'react-native';

interface PaginationButtonProps {
  onPress: () => void;
  size?: 'big' | 'medium' | 'small';
  style?: ViewStyle;
  disabled?: boolean;
}

export function PaginationButton({ onPress, size = 'medium', style, disabled }: PaginationButtonProps) {
  const { colors } = useThemeColors();
  const sizes = { big: 64, medium: 48, small: 36 };
  const dotSizes = { big: 10, medium: 7, small: 5 };
  const btnSize = sizes[size];
  const dotSize = dotSizes[size];
  return (
    <TouchableOpacity
      style={[styles.button, { width: btnSize, height: btnSize, borderRadius: btnSize / 2 }, style]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={styles.dotsRow}>
        {[0, 1, 2].map(i => (
          <View
            key={i}
            style={{
              width: dotSize,
              height: dotSize,
              borderRadius: dotSize / 2,
              backgroundColor: colors.text,
              marginHorizontal: dotSize / 3,
            }}
          />
        ))}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
}); 