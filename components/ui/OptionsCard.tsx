import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';

interface OptionsCardProps {
  icon?: React.ReactNode;
  title: string;
  subtitle?: string;
  color?: string; // Card background color
  borderColor?: string;
  iconBgColor?: string;
  size?: 'small' | 'medium' | 'large';
  style?: ViewStyle;
  onPress?: () => void;
  children?: React.ReactNode;
}

const CARD_SIZES = {
  small: 100,
  medium: 140,
  large: 180,
};

export function OptionsCard({
  icon,
  title,
  subtitle,
  color = '#fff',
  borderColor = 'rgba(0,0,0,0.06)',
  iconBgColor = 'rgba(0,0,0,0.04)',
  size = 'medium',
  style,
  onPress,
  children,
}: OptionsCardProps) {
  const cardSize = CARD_SIZES[size];
  return (
    <TouchableOpacity
      style={[
        styles.card,
        {
          backgroundColor: color,
          borderColor,
          width: cardSize,
          minHeight: cardSize,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.85 : 1}
      disabled={!onPress}
    >
      {icon && (
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>{icon}</View>
      )}
      <Text style={styles.title}>{title}</Text>
      {/* Only render subtitle if it is a non-empty string */}
      {typeof subtitle === 'string' && subtitle.length > 0 && <Text style={styles.subtitle}>{subtitle}</Text>}
      {children}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  iconContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1f2937',
    lineHeight: 18,
  },
  subtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
}); 