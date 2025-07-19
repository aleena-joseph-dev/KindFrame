import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CloudRainIcon } from '@/components/ui/CloudRainIcon';
import { HomeIcon } from '@/components/ui/HomeIcon';
import { LeafIcon } from '@/components/ui/LeafIcon';
import { ZapIcon } from '@/components/ui/ZapIcon';

interface OnboardingPopupProps {
  visible: boolean;
  onClose: () => void;
  onSkip?: () => void;
  onModeSelect?: (modeId: string) => void;
}

interface ModeOption {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  backgroundColor: string;
  borderColor: string;
  iconBackgroundColor: string;
  iconColor: string;
}

export const OnboardingPopup: React.FC<OnboardingPopupProps> = ({ 
  visible, 
  onClose, 
  onSkip,
  onModeSelect 
}) => {
  const modeOptions: ModeOption[] = [
    {
      id: 'calm-low-sensory',
      title: 'Calm & Low Sensory',
      subtitle: 'Soft, muted colors for reduced stimulation',
      icon: <LeafIcon size={24} color="#8b9a8b" />,
      backgroundColor: '#f0f4f0',
      borderColor: 'rgba(139, 154, 139, 0.125)',
      iconBackgroundColor: 'rgba(139, 154, 139, 0.125)',
      iconColor: '#8b9a8b',
    },
    {
      id: 'hyper-focus-boost',
      title: 'Hyper Focus Boost',
      subtitle: 'High contrast for enhanced concentration',
      icon: <ZapIcon size={24} color="#dc2626" />,
      backgroundColor: '#fef2f2',
      borderColor: 'rgba(220, 38, 38, 0.125)',
      iconBackgroundColor: 'rgba(220, 38, 38, 0.125)',
      iconColor: '#dc2626',
    },
    {
      id: 'normal',
      title: 'Normal',
      subtitle: 'Balanced colors for everyday use',
      icon: <HomeIcon size={24} color="#3b82f6" />,
      backgroundColor: '#eff6ff',
      borderColor: 'rgba(59, 130, 246, 0.125)',
      iconBackgroundColor: 'rgba(59, 130, 246, 0.125)',
      iconColor: '#3b82f6',
    },
    {
      id: 'dont-want-to-human',
      title: "I Don't Want To Human Today",
      subtitle: 'Gentle, comforting tones for difficult days',
      icon: <CloudRainIcon size={24} color="#6b21a8" />,
      backgroundColor: '#faf5ff',
      borderColor: 'rgba(107, 33, 168, 0.125)',
      iconBackgroundColor: 'rgba(107, 33, 168, 0.125)',
      iconColor: '#6b21a8',
    },
  ];

  const handleModeSelect = (modeId: string) => {
    if (onModeSelect) {
      onModeSelect(modeId);
    } else {
      console.log('Selected mode:', modeId);
      onClose();
    }
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  // Create 2x2 grid layout
  const createGridRows = () => {
    const rows = [];
    for (let i = 0; i < modeOptions.length; i += 2) {
      const row = modeOptions.slice(i, i + 2);
      rows.push(row);
    }
    return rows;
  };

  const gridRows = createGridRows();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <SafeAreaView style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Choose Your Mode</Text>
            <Text style={styles.subtitle}>Select the experience that works best for you</Text>
            
            <View style={styles.gridContainer}>
              {gridRows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.gridRow}>
                  {row.map((mode) => (
                    <TouchableOpacity
                      key={mode.id}
                      style={[
                        styles.modeCard,
                        {
                          backgroundColor: mode.backgroundColor,
                          borderColor: mode.borderColor,
                        }
                      ]}
                      onPress={() => handleModeSelect(mode.id)}
                      activeOpacity={0.8}
                    >
                      <View style={[
                        styles.iconContainer,
                        { backgroundColor: mode.iconBackgroundColor }
                      ]}>
                        {mode.icon}
                      </View>
                      <Text style={styles.modeTitle}>{mode.title}</Text>
                      <Text style={styles.modeSubtitle}>{mode.subtitle}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ))}
            </View>

            {/* Skip Button */}
            <TouchableOpacity
              style={styles.skipButton}
              onPress={handleSkip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipButtonText}>Skip</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    margin: 20,
    maxWidth: 400,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  content: {
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#6b7280',
    lineHeight: 22,
  },
  gridContainer: {
    gap: 12,
    marginBottom: 24,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
    color: '#1f2937',
    lineHeight: 18,
  },
  modeSubtitle: {
    fontSize: 12,
    textAlign: 'center',
    color: '#6b7280',
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  skipButton: {
    alignSelf: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
}); 