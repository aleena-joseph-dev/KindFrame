import React from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

interface TutorialCompletionPopupProps {
  visible: boolean;
  onSkip: () => void;
}

export const TutorialCompletionPopup: React.FC<TutorialCompletionPopupProps> = ({
  visible,
  onSkip,
}) => {
  const { colors } = useThemeColors();
  const router = useRouter();

  const handleQuickJotPress = () => {
    onSkip(); // Close the popup
    router.push('/quick-jot'); // Navigate to quick jot screen
  };

  const handleSkipPress = () => {
    onSkip(); // Close the popup
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, { backgroundColor: 'rgba(0, 0, 0, 0.8)' }]}>
      <View style={[styles.popup, { backgroundColor: colors.surface }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            🎉 You're ready to go!
          </Text>
        </View>

        {/* Message */}
        <View style={styles.messageContainer}>
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            Get started by creating a task using Quick Jot
          </Text>
        </View>

        {/* Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.quickJotButton, { backgroundColor: colors.primary }]}
            onPress={handleQuickJotPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.quickJotButtonText, { color: colors.background }]}>
              Quick Jot
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.skipButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={handleSkipPress}
            activeOpacity={0.8}
          >
            <Text style={[styles.skipButtonText, { color: colors.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  popup: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  messageContainer: {
    marginBottom: 24,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  buttonContainer: {
    gap: 12,
  },
  quickJotButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  quickJotButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  skipButton: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
