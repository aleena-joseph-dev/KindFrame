import { Fonts, FontSizes } from '@/constants/Fonts';
import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

interface TextProps extends RNTextProps {
  variant?: 'light' | 'regular' | 'medium' | 'bold';
  size?: keyof typeof FontSizes;
  children: React.ReactNode;
}

export function Text({ 
  variant = 'regular', 
  size = 'base', 
  style, 
  children, 
  ...props 
}: TextProps) {
  const fontFamily = Fonts.funnelDisplay[variant];
  const fontSize = FontSizes[size];

  return (
    <RNText
      style={[
        styles.text,
        {
          fontFamily,
          fontSize,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </RNText>
  );
}

const styles = StyleSheet.create({
  text: {
    // Base text styles
  },
}); 