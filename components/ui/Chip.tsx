import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface ChipProps {
  icon: string;
  label: string;
  muted?: boolean;
  onPress?: () => void;
  variant?: 'default' | 'priority' | 'reminder' | 'location';
  size?: 'small' | 'medium';
}

export default function Chip({ 
  icon, 
  label, 
  muted = false, 
  onPress, 
  variant = 'default',
  size = 'medium'
}: ChipProps) {
  const { colors } = useThemeColors();
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'priority':
        return {
          backgroundColor: muted ? colors.border : getPriorityColor(label),
          borderColor: muted ? colors.border : getPriorityColor(label),
          textColor: muted ? colors.textSecondary : '#FFFFFF'
        };
      case 'reminder':
        return {
          backgroundColor: muted ? colors.border : colors.accent,
          borderColor: muted ? colors.border : colors.accent,
          textColor: muted ? colors.textSecondary : colors.text
        };
      case 'location':
        return {
          backgroundColor: muted ? colors.border : colors.secondary,
          borderColor: muted ? colors.border : colors.secondary,
          textColor: muted ? colors.textSecondary : colors.text
        };
      default:
        return {
          backgroundColor: muted ? colors.border : colors.surface,
          borderColor: muted ? colors.border : colors.border,
          textColor: muted ? colors.textSecondary : colors.text
        };
    }
  };
  
  const getPriorityColor = (priority: string): string => {
    switch (priority.toLowerCase()) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.border;
    }
  };
  
  const variantStyles = getVariantStyles();
  const isInteractive = !!onPress;
  
  const chipStyles = [
    styles.chip,
    styles[size],
    {
      backgroundColor: variantStyles.backgroundColor,
      borderColor: variantStyles.borderColor,
      opacity: muted ? 0.6 : 1
    },
    isInteractive && styles.interactive
  ];
  
  const textStyles = [
    styles.label,
    styles[`${size}Text`],
    { color: variantStyles.textColor }
  ];
  
  const iconStyles = [
    styles.icon,
    styles[`${size}Icon`],
    { color: variantStyles.textColor }
  ];
  
  const content = (
    <View style={styles.content}>
      <Icon name={icon as any} size={size === 'small' ? 12 : 14} style={iconStyles} />
      <Text style={textStyles} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  
  if (onPress) {
    return (
      <Pressable 
        style={chipStyles} 
        onPress={onPress}
        hitSlop={8}
        android_ripple={{ color: colors.border, borderless: false }}
      >
        {content}
      </Pressable>
    );
  }
  
  return (
    <View style={chipStyles}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    maxWidth: 120,
  },
  small: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 12,
  },
  medium: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  interactive: {
    // Add subtle shadow for interactive chips
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  icon: {
    marginRight: 2,
  },
  smallIcon: {
    marginRight: 2,
  },
  mediumIcon: {
    marginRight: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  smallText: {
    fontSize: 10,
  },
  mediumText: {
    fontSize: 12,
  },
});
