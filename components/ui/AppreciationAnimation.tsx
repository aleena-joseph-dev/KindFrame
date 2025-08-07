import React, { useEffect } from 'react';
import { View, StyleSheet, Text, Dimensions } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

const { width, height } = Dimensions.get('window');

interface AppreciationAnimationProps {
  visible: boolean;
  onComplete: () => void;
}

export const AppreciationAnimation: React.FC<AppreciationAnimationProps> = ({
  visible,
  onComplete,
}) => {
  const { colors } = useThemeColors();

  useEffect(() => {
    if (visible) {
      // Show animation for 2 seconds then hide
      const timer = setTimeout(() => {
        onComplete();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [visible, onComplete]);

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
      {/* Simple confetti effect using colored squares */}
      {Array.from({ length: 20 }, (_, index) => (
        <View
          key={index}
          style={[
            styles.confetti,
            {
              left: Math.random() * width,
              top: Math.random() * height,
              backgroundColor: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA502', '#2ED573', '#FF9FF3'][
                Math.floor(Math.random() * 6)
              ],
            },
          ]}
        />
      ))}

      {/* Success message */}
      <View style={styles.messageContainer}>
        <Text style={[styles.message, { color: colors.background }]}>
          🎉 Welcome to KindFrame!
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 3000,
    pointerEvents: 'none',
  },
  confetti: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 2,
  },
  messageContainer: {
    position: 'absolute',
    top: height * 0.4,
    left: 20,
    right: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  message: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
});
