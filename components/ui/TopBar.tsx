import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import BackIcon from './BackIcon';
import { HomeIcon } from './HomeIcon';
import InfoIcon from './InfoIcon';
import SettingsIcon from './SettingsIcon';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  onInfo?: () => void;
  showSettings?: boolean;
  onSettingsPress?: () => void;
  showInfo?: boolean;
  showHome?: boolean;
  syncButton?: {
    label: string;
    onPress: () => void;
    isConnected?: boolean;
  };
}

export default function TopBar({
  title,
  onBack,
  onInfo,
  showSettings = false,
  onSettingsPress,
  showInfo = false,
  showHome = false,
  syncButton,
}: TopBarProps) {
  const router = useRouter();
  const { colors } = useThemeColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.topBarBackground }]}>
      {/* Left side - Back button */}
      {onBack ? (
        <TouchableOpacity
          style={styles.sideButton}
          onPress={onBack}
          accessibilityLabel="Go back"
        >
          <BackIcon size={24} color={colors.background} />
        </TouchableOpacity>
      ) : (
        <View style={styles.sideButton} />
      )}

      {/* Center - Title */}
      <Text style={[styles.title, { color: colors.background }]} numberOfLines={1}>
        {title}
      </Text>

      {/* Right side - Info button, Sync button, Home button, Settings button, or empty space */}
      <View style={styles.rightSection}>
        {showInfo && onInfo && (
          <TouchableOpacity
            style={styles.infoButton}
            onPress={onInfo}
            accessibilityLabel="Information"
          >
            <InfoIcon size={20} color={colors.background} />
          </TouchableOpacity>
        )}
        
        {syncButton && (
          <TouchableOpacity
            style={[
              styles.syncButton,
              { 
                backgroundColor: syncButton.isConnected ? colors.background : colors.background,
                borderColor: colors.background
              }
            ]}
            onPress={syncButton.onPress}
            accessibilityLabel={syncButton.label}
          >
            <Text style={[
              styles.syncButtonIcon,
              { color: syncButton.isConnected ? colors.topBarBackground : colors.topBarBackground }
            ]}>
              {syncButton.isConnected ? '✓' : '↻'}
            </Text>
            <Text style={[
              styles.syncButtonLabel,
              { color: syncButton.isConnected ? colors.topBarBackground : colors.topBarBackground }
            ]}>
              {syncButton.label}
            </Text>
          </TouchableOpacity>
        )}
        
        {showHome && (
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => router.push('/')}
            accessibilityLabel="Go to home"
          >
            <HomeIcon size={24} color={colors.background} />
          </TouchableOpacity>
        )}
        
        {showSettings && !syncButton && !showHome && (
          <TouchableOpacity
            style={styles.sideButton}
            onPress={() => {
              if (onSettingsPress) {
                onSettingsPress();
              } else {
                router.push('/settings');
              }
            }}
            accessibilityLabel="Settings"
          >
            <SettingsIcon size={24} color={colors.background} />
          </TouchableOpacity>
        )}
        
        {!showInfo && !showSettings && !syncButton && !showHome && <View style={styles.sideButton} />}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    height: 64,
  },
  sideButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  infoButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  syncButton: {
    width: 80,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'column',
  },
  syncButtonIcon: {
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 16,
  },
  syncButtonLabel: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 12,
    marginTop: 2,
  },
});
