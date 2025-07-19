import { SensoryColors } from '@/constants/Colors';
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TextStyle,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  sensoryTheme?: 'low' | 'medium' | 'high';
}

export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  style,
  textStyle,
  sensoryTheme = 'low',
}: ButtonProps) {
  const colors = SensoryColors[sensoryTheme];

  const getButtonStyle = (): ViewStyle => {
    const baseStyle: ViewStyle = {
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      paddingHorizontal: 24,
      minHeight: 48,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    };

    if (disabled) {
      return {
        ...baseStyle,
        backgroundColor: '#E9ECEF',
        opacity: 0.6,
      };
    }

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          backgroundColor: '#98aa8b', // Sage green color
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'secondary':
        return {
          ...baseStyle,
          backgroundColor: '#98aa8b', // Sage green color
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
          elevation: 3,
        };
      case 'outline':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          borderColor: '#98aa8b', // Sage green color for border
          borderWidth: 1,
        };
      default:
        return baseStyle;
    }
  };

  const getTextStyle = (): TextStyle => {
    const baseTextStyle: TextStyle = {
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    };

    if (disabled) {
      return {
        ...baseTextStyle,
        color: '#6C757D',
      };
    }

    switch (variant) {
      case 'outline':
        return {
          ...baseTextStyle,
          color: '#98aa8b', // Sage green color for text
        };
      default:
        return {
          ...baseTextStyle,
          color: '#000000', // Black text on sage green background
        };
    }
  };

  return (
    <TouchableOpacity
      style={[styles.button, getButtonStyle(), style]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'outline' ? '#98aa8b' : '#000000'}
        />
      ) : (
        <Text style={[getTextStyle(), textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    // Base button styles are handled in getButtonStyle
  },
}); 