import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { SensoryColors } from '@/constants/Colors';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import BackIcon from './BackIcon';
import InfoIcon from './InfoIcon';
import SettingsIcon from './SettingsIcon';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  onInfo?: () => void;
  syncButton?: {
    label: string;
    onPress: () => void;
    isConnected: boolean;
  };
  showSettings?: boolean;
}

export default function TopBar({ 
  title, 
  onBack, 
  onInfo, 
  syncButton,
  showSettings = false 
}: TopBarProps) {
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: colors.topBarBackground }]}> 
      <TouchableOpacity
        style={styles.sideButton}
        onPress={() => {
          if (onBack) {
            onBack();
          } else {
            router.back();
          }
        }}
        accessibilityLabel="Back"
        accessibilityRole="button"
        accessibilityHint="Go back to previous screen"
        activeOpacity={0.7}
        accessible={true}
        accessibilityLiveRegion="polite"
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <BackIcon size={24} color={colors.text} />
      </TouchableOpacity>
      <View style={styles.titleContainer}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {onInfo && (
          <TouchableOpacity
            style={[styles.infoButton, { backgroundColor: colors.surface }]}
            onPress={onInfo}
            accessibilityLabel="Info"
            accessibilityRole="button"
          >
            <InfoIcon size={24} color={colors.text} />
          </TouchableOpacity>
        )}
        {syncButton && (
          <TouchableOpacity
            style={[
              styles.syncButton, 
              { 
                backgroundColor: syncButton.isConnected ? '#4CAF50' : colors.buttonBackground,
                borderColor: colors.border 
              }
            ]}
            onPress={() => {
              syncButton.onPress();
            }}
            accessibilityLabel={syncButton.label}
            accessibilityRole="button"
          >
            <Text style={[
              styles.syncButtonText, 
              { color: syncButton.isConnected ? '#fff' : colors.buttonText }
            ]}>
              {syncButton.label}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* Right side - Settings button (no logout functionality) */}
      {showSettings && (
        <TouchableOpacity
          style={styles.sideButton}
          onPress={() => {
            router.push('/settings');
          }}
          accessibilityLabel="Settings"
          accessibilityRole="button"
          accessibilityHint="Open settings"
          activeOpacity={0.7}
          accessible={true}
          accessibilityLiveRegion="polite"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <SettingsIcon size={24} color={colors.text} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: '#0001',
    elevation: 2,
    zIndex: 10,
  },
  sideButton: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    flexShrink: 1,
    letterSpacing: 0.5,
  },
  infoButton: {
    marginLeft: 8,
    padding: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  syncButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  syncButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
}); 