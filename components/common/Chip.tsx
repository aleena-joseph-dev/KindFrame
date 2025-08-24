// Common Chip Component
// A simple pill component with icon and label

import { useThemeColors } from '@/hooks/useThemeColors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  onPress?: () => void;
  variant?: 'default' | 'outlined' | 'filled';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  selected?: boolean;
  style?: ViewStyle;
}

export function Chip({ 
  label, 
  icon, 
  onPress, 
  variant = 'default', 
  size = 'medium',
  disabled = false,
  selected = false,
  style
}: ChipProps) {
  const { colors } = useThemeColors();
  
  const isTouchable = onPress && !disabled;
  const Component = isTouchable ? TouchableOpacity : View;
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: 1,
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          borderColor: selected ? colors.primary : colors.border,
          borderWidth: 1,
        };
      default:
        return {
          backgroundColor: selected ? colors.primary : colors.surface,
          borderColor: colors.border,
          borderWidth: 1,
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'small':
        return {
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12,
        };
      case 'large':
        return {
          paddingHorizontal: 16,
          paddingVertical: 8,
          borderRadius: 20,
        };
      default: // medium
        return {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
        };
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default: // medium
        return 14;
    }
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      ...getVariantStyles(),
      ...getSizeStyles(),
      opacity: disabled ? 0.5 : 1,
    },
    text: {
      fontSize: getTextSize(),
      fontWeight: '500',
      color: selected ? '#fff' : colors.text,
      textAlign: 'center',
    },
    iconContainer: {
      marginRight: icon ? 6 : 0,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });

  const handlePress = () => {
    if (isTouchable && !disabled) {
      onPress();
    }
  };

  return (
    <Component style={[styles.container, style]} onPress={handlePress} disabled={disabled}>
      {icon && (
        <View style={styles.iconContainer}>
          {icon}
        </View>
      )}
      <Text style={styles.text}>{label}</Text>
    </Component>
  );
}
