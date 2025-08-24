import { PaginationButton } from '@/components/ui/OptionsButton';
import { PopupBg } from '@/components/ui/PopupBg';
import { useAuth } from '@/contexts/AuthContext';
import { useViewport } from '@/hooks/useViewport';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { MoodService } from '@/services/moodService';

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
  const [isSaving, setIsSaving] = useState(false);
  const { vw, vh, getResponsiveSize } = useViewport();
  const { session } = useAuth();

  const handleNext = async () => {
    if (!session?.user?.id) {
      // If no user session, just proceed without saving
      onNext(energyLevel);
      return;
    }

    setIsSaving(true);
    
    try {
      // Save mood entry to database with both body and mind as the same energy level
      const moodEntry = {
        user_id: session.user.id,
        timestamp: new Date().toISOString(),
        mood_value: {
          body: energyLevel,
          mind: energyLevel,
        },
      };

      const result = await MoodService.saveMoodEntry(moodEntry);
      
      if (result.success) {
        console.log('✅ Onboarding mood entry saved successfully:', result.data);
      } else {
        console.error('❌ Failed to save onboarding mood entry:', result.error);
        // Continue with onboarding even if saving fails
      }
    } catch (error) {
      console.error('❌ Exception saving onboarding mood entry:', error);
      // Continue with onboarding even if saving fails
    } finally {
      setIsSaving(false);
      onNext(energyLevel);
    }
  };

  const getEnergyDescription = (level: number) => {
    if (level <= 2) return { text: 'Very Low Energy', emoji: '😴' };
    if (level <= 4) return { text: 'Low Energy', emoji: '😕' };
    if (level <= 6) return { text: 'Moderate Energy', emoji: '😐' };
    if (level <= 8) return { text: 'Good Energy', emoji: '😊' };
    return { text: 'High Energy', emoji: '😃' };
  };

  const energyDescription = getEnergyDescription(energyLevel);

  return (
    <PopupBg
      visible={visible}
      onRequestClose={onClose}
      size="medium"
      color="#fff"
      showSkip={true}
      closeOnOutsideTap={true}
      onSkip={onSkip}
    >
      {/* Main Content Container - Child of PopupBg */}
      <View style={[styles.content, { width: '100%' }]}>
        {/* Title Section - Child of Content */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontSize: getResponsiveSize(20, 24, 28) }]}>
            How's Your Energy Today?
          </Text>
          <Text style={[styles.subtitle, { fontSize: getResponsiveSize(14, 16, 18) }]}>
            This helps us tailor your experience to your current state
          </Text>
        </View>

        {/* Energy Slider Section - Child of Content */}
        <View style={styles.energySection}>
          {/* Energy Labels - Child of Energy Section */}
          <View style={styles.energyLabels}>
            <Text style={[styles.energyLabel, { fontSize: getResponsiveSize(10, 12, 14) }]}>
              Exhausted
            </Text>
            <Text style={[styles.energyLabel, { fontSize: getResponsiveSize(10, 12, 14) }]}>
              Energized
            </Text>
          </View>

          {/* Slider Container - Child of Energy Section */}
          <View style={styles.sliderContainer}>
            {/* Slider Track - Child of Slider Container */}
            <View style={styles.sliderTrack}>
              <View 
                style={[
                  styles.sliderThumb, 
                  { left: `${(energyLevel / 10) * 100}%` }
                ]} 
              />
            </View>

            {/* Energy Numbers - Child of Slider Container */}
            <View style={styles.energyNumbers}>
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <TouchableOpacity
                  key={num}
                  style={styles.energyNumber}
                  onPress={() => setEnergyLevel(num)}
                >
                  <Text style={[
                    styles.energyNumberText, 
                    { 
                      color: energyLevel === num ? '#8b9a8b' : '#9ca3af',
                      fontSize: getResponsiveSize(10, 12, 14)
                    }
                  ]}>
                    {num}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Energy Feedback - Child of Energy Section */}
          <View style={styles.energyFeedback}>
            <Text style={[styles.energyEmoji, { fontSize: getResponsiveSize(20, 24, 28) }]}>
              {energyDescription.emoji}
            </Text>
            <Text style={[styles.energyFeedbackText, { fontSize: getResponsiveSize(14, 16, 18) }]}>
              {energyDescription.text}
            </Text>
          </View>
        </View>

        {/* Button Section - Child of Content */}
        <View style={styles.buttonSection}>
          <TouchableOpacity
            style={[styles.nextButton, { 
              width: vw(80),
              paddingVertical: getResponsiveSize(10, 12, 14),
              opacity: isSaving ? 0.6 : 1,
            }]}
            onPress={handleNext}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <Text style={[styles.nextButtonText, { fontSize: getResponsiveSize(14, 16, 18) }]}>
              {isSaving ? 'Saving...' : 'Continue'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pagination Section - Child of Content */}
        <View style={styles.paginationSection}>
          <PaginationButton 
            onPress={() => {/* TODO: handle pagination */}} 
            size="big" 
            style={{ alignSelf: 'center', marginTop: 16 }} 
          />
        </View>
      </View>
    </PopupBg>
  );
};

const styles = StyleSheet.create({
  content: {
    padding: 24,
    alignItems: 'center',
    width: '100%',
  },
  titleSection: {
    alignItems: 'center',
    width: '100%',
    marginBottom: 8,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 32,
    color: '#6b7280',
    lineHeight: 22,
    width: '100%',
  },
  energySection: {
    marginBottom: 12,
    width: '100%',
    alignItems: 'center',
  },
  energyLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    width: '90%',
  },
  energyLabel: {
    fontWeight: '500',
    color: '#6b7280',
    textAlign: 'center',
    flex: 1,
  },
  sliderContainer: {
    marginBottom: 20,
    width: '90%',
    alignItems: 'center',
  },
  sliderTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#f3f4f6',
    position: 'relative',
    marginBottom: 12,
    width: '100%',
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
    width: '100%',
  },
  energyNumber: {
    padding: 4,
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  energyNumberText: {
    fontWeight: '500',
    textAlign: 'center',
  },
  energyFeedback: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#f9fafb',
    marginTop: 8,
    marginBottom: 8,
    width: '90%',
  },
  energyEmoji: {
    textAlign: 'center',
  },
  energyFeedbackText: {
    fontWeight: '500',
    color: '#1f2937',
    textAlign: 'center',
    flex: 1,
  },
  buttonSection: {
    flexDirection: 'column',
    alignItems: 'center',
    width: '100%',
    marginTop: 0,
  },
  nextButton: {
    backgroundColor: '#8b9a8b',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 0,
    width: '90%',
    alignItems: 'center',
  },
  nextButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    textAlign: 'center',
  },
  paginationSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
}); 