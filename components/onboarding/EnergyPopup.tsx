import React, { useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface EnergyPopupProps {
  visible: boolean;
  onClose: () => void;
  onNext: (energyLevel: number) => void;
  onSkip?: () => void;
  defaultEnergyLevel?: number;
}

export const EnergyPopup: React.FC<EnergyPopupProps> = ({ 
  visible, 
  onClose, 
  onNext,
  onSkip,
  defaultEnergyLevel = 5
}) => {
  const [energyLevel, setEnergyLevel] = useState(defaultEnergyLevel);

  const handleNext = () => {
    onNext(energyLevel);
  };

  const handleSkip = () => {
    if (onSkip) {
      onSkip();
    } else {
      onClose();
    }
  };

  const getEnergyDescription = (level: number) => {
    if (level <= 2) return { text: "I'm exhausted", emoji: "😴" };
    if (level <= 4) return { text: "I'm tired", emoji: "😔" };
    if (level <= 6) return { text: "I'm okay", emoji: "😐" };
    if (level <= 8) return { text: "I'm feeling pretty good", emoji: "😊" };
    return { text: "I'm super excited", emoji: "🤩" };
  };

  const energyDescription = getEnergyDescription(energyLevel);

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
            <Text style={styles.title}>How's Your Energy Today?</Text>
            <Text style={styles.subtitle}>
              This helps us tailor your experience to your current state
            </Text>
            
            <View style={styles.energyContainer}>
              <View style={styles.energyLabels}>
                <Text style={styles.energyLabel}>Exhausted</Text>
                <Text style={styles.energyLabel}>Energized</Text>
              </View>
              
              <View style={styles.sliderContainer}>
                <View style={styles.sliderTrack}>
                  <View 
                    style={[
                      styles.sliderThumb, 
                      { left: `${(energyLevel / 10) * 100}%` }
                    ]} 
                  />
                </View>
                
                <View style={styles.energyNumbers}>
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                    <TouchableOpacity
                      key={num}
                      style={styles.energyNumber}
                      onPress={() => setEnergyLevel(num)}
                    >
                      <Text style={[
                        styles.energyNumberText, 
                        { color: energyLevel === num ? '#8b9a8b' : '#9ca3af' }
                      ]}>
                        {num}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              
              <View style={styles.energyFeedback}>
                <Text style={styles.energyEmoji}>
                  {energyDescription.emoji}
                </Text>
                <Text style={styles.energyFeedbackText}>
                  {energyDescription.text}
                </Text>
              </View>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.skipButton}
                onPress={handleSkip}
                activeOpacity={0.7}
              >
                <Text style={styles.skipButtonText}>Skip</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.nextButton}
                onPress={handleNext}
                activeOpacity={0.8}
              >
                <Text style={styles.nextButtonText}>Get Started</Text>
              </TouchableOpacity>
            </View>
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
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 22,
  },
  energyContainer: {
    marginBottom: 32,
  },
  energyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  energyLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
  },
  sliderContainer: {
    marginBottom: 20,
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f3f4f6',
    position: 'relative',
    marginBottom: 12,
  },
  sliderThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#8b9a8b',
    position: 'absolute',
    top: -8,
    marginLeft: -10,
  },
  energyNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  energyNumber: {
    padding: 4,
  },
  energyNumberText: {
    fontSize: 12,
    fontWeight: '500',
  },
  energyFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    gap: 8,
  },
  energyEmoji: {
    fontSize: 24,
  },
  energyFeedbackText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1f2937',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  skipButtonText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  nextButton: {
    backgroundColor: '#8b9a8b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  nextButtonText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
}); 