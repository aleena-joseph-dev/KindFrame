import { PaginationButton } from '@/components/ui/OptionsButton';
import { OptionsCard } from '@/components/ui/OptionsCard';
import { PopupBg } from '@/components/ui/PopupBg';
import { useViewport } from '@/hooks/useViewport';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  const { vw, vh, getResponsiveSize } = useViewport();

  const modeOptions: ModeOption[] = [
    {
      id: 'calm',
      title: 'Calm & Low Sensory',
      subtitle: '',
      icon: <Text style={{fontSize: 24}}>🌿</Text>,
      backgroundColor: 'rgba(139, 154, 139, 0.1)',
      borderColor: 'rgba(139, 154, 139, 0.125)',
      iconBackgroundColor: 'rgba(139, 154, 139, 0.125)',
      iconColor: '#8b9a8b',
    },
    {
      id: 'highEnergy',
      title: 'High Energy',
      subtitle: '',
      icon: <Text style={{fontSize: 24}}>⚖️</Text>,
      backgroundColor: 'rgba(220, 38, 38, 0.1)',
      borderColor: 'rgba(220, 38, 38, 0.125)',
      iconBackgroundColor: 'rgba(220, 38, 38, 0.125)',
      iconColor: '#dc2626',
    },
    {
      id: 'normal',
      title: 'Normal',
      subtitle: '',
      icon: <Text style={{fontSize: 24}}>🎨</Text>,
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      borderColor: 'rgba(59, 130, 246, 0.125)',
      iconBackgroundColor: 'rgba(59, 130, 246, 0.125)',
      iconColor: '#3b82f6',
    },
    {
      id: 'relax',
      title: 'Relax & Restore',
      subtitle: '',
      icon: <Text style={{fontSize: 24}}>🔄</Text>,
      backgroundColor: 'rgba(107, 33, 168, 0.1)',
      borderColor: 'rgba(107, 33, 168, 0.125)',
      iconBackgroundColor: 'rgba(107, 33, 168, 0.125)',
      iconColor: '#6b21a8',
    },
  ];

  const handleModeSelect = (modeId: string) => {
    console.log('Selected mode:', modeId);
    onModeSelect?.(modeId);
  };

  const handleSkip = () => {
    onSkip?.();
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
    <PopupBg
      visible={visible}
      onRequestClose={onClose}
      size="large"
      color="#fff"
      showSkip={true}
      closeOnOutsideTap={true}
      onSkip={handleSkip}
    >
      {/* Main Content Container - Child of PopupBg */}
      <View style={[styles.content, { width: '100%' }]}>
        {/* Title Section - Child of Content */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { fontSize: getResponsiveSize(20, 24, 28) }]}>
            Choose Your Mode
          </Text>
          <Text style={[styles.subtitle, { fontSize: getResponsiveSize(14, 16, 18) }]}>
            Select the experience that works best for you
          </Text>
        </View>

        {/* Grid Section - Child of Content */}
        <View style={styles.gridSection}>
          {gridRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.gridRow}>
              {row.map((mode) => (
                <OptionsCard
                  key={mode.id}
                  icon={mode.icon}
                  title={mode.title}
                  subtitle={mode.subtitle}
                  color={mode.backgroundColor}
                  borderColor={mode.borderColor}
                  iconBgColor={mode.iconBackgroundColor}
                  size="small"
                  style={{ width: '45%', marginHorizontal: '2.5%', marginVertical: 4 }}
                  onPress={() => handleModeSelect(mode.id)}
                />
              ))}
            </View>
          ))}
        </View>

        {/* Pagination Section - Child of Content */}
        <View style={styles.paginationSection}>
          <PaginationButton 
            onPress={() => {/* TODO: handle options */}} 
            size="big" 
            style={{ alignSelf: 'center', marginTop: 16 }} 
          />
        </View>
      </View>
    </PopupBg>
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
    padding: 12,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
    color: '#1f2937',
    width: '100%',
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: 8,
    color: '#6b7280',
    lineHeight: 22,
    width: '100%',
  },
  gridSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 0,
    marginBottom: 0,
  },
  gridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 0,
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
  paginationSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 4,
  },
}); 