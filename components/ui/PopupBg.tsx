import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface PopupBgProps {
  visible: boolean;
  onRequestClose: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  showSkip?: boolean;
  closeOnOutsideTap?: boolean;
  onSkip?: () => void;
  children: React.ReactNode;
}

export function PopupBg({
  visible,
  onRequestClose,
  size = 'medium',
  color,
  showSkip = true,
  closeOnOutsideTap = true,
  onSkip,
  children,
}: PopupBgProps) {
  const { colors } = useThemeColors();
  const { vw, vh } = useViewport();
  const popupColor = color || colors.surface;

  // Strictly responsive popup sizes based on viewport
  const getPopupWidth = () => {
    switch (size) {
      case 'small':
        return vw(85); // 85vw
      case 'medium':
        return vw(92); // 92vw
      case 'large':
        return vw(98); // 98vw
      default:
        return vw(92);
    }
  };

  const handleOverlayPress = () => {
    if (closeOnOutsideTap) onRequestClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={handleOverlayPress}
        />
        <View style={[
          styles.container,
          {
            backgroundColor: popupColor,
            width: getPopupWidth(),
            minWidth: vw(260 / 414 * 100),
            maxWidth: vw(98),
            maxHeight: vh(85),
            paddingHorizontal: vw(5),
            paddingVertical: vh(3),
          },
        ]}>
          {children}
          {showSkip && (
            <View style={styles.skipContainer}>
              <TouchableOpacity onPress={onSkip}>
                <Text style={styles.skipButton}>Skip</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 0,
  },
  container: {
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  skipContainer: {
    marginTop: 4,
    alignItems: 'center',
  },
  skipButton: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
    paddingVertical: 0,
    paddingHorizontal: 24,
  },
}); 