import React from 'react';
import { TouchableOpacity, StyleSheet, Text } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface TutorialButtonProps {
  onPress: () => void;
  hasCompletedTutorial: boolean;
}

export const TutorialButton: React.FC<TutorialButtonProps> = ({ 
  onPress, 
  hasCompletedTutorial 
}) => {
  const { colors } = useThemeColors();

  if (hasCompletedTutorial) {
    return null; // Don't show button if tutorial is completed
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: colors.primary,
          borderColor: colors.primary,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.text, { color: colors.background }]}>
        🎯 Tutorial
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    top: 60,
    right: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    zIndex: 1000,
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
  },
});
