import { SensoryColors } from '@/constants/Colors';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { useRouter } from 'expo-router';
import React from 'react';
import { Alert, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { AuthService } from '@/services/authService';
import BackIcon from './BackIcon';
import InfoIcon from './InfoIcon';
import SettingsIcon from './SettingsIcon';

interface TopBarProps {
  title: string;
  onBack?: () => void;
  onInfo?: () => void;
  showSettings?: boolean;
  showSync?: boolean;
  onSync?: () => void;
  syncLoading?: boolean;
}

export function TopBar({ title, onBack, onInfo, showSettings = false, showSync = false, onSync, syncLoading = false }: TopBarProps) {
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];
  const router = useRouter();

  const handleLogout = async () => {
    console.log('Logout button clicked');
    
    // For web, use a simpler approach without Alert
    if (Platform.OS === 'web') {
      console.log('Web platform detected, proceeding with logout...');
      try {
        await AuthService.signOut();
        console.log('SignOut completed, redirecting to signin...');
        router.replace('/(auth)/signin');
      } catch (error) {
        console.error('Logout error:', error);
        // For web, we'll just redirect anyway
        router.replace('/(auth)/signin');
      }
    } else {
      // For mobile, use Alert
      Alert.alert(
        'Logout',
        'Are you sure you want to logout?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Logout',
            style: 'destructive',
            onPress: async () => {
              console.log('User confirmed logout, starting signOut process...');
              try {
                await AuthService.signOut();
                console.log('SignOut completed, redirecting to signin...');
                router.replace('/(auth)/signin');
              } catch (error) {
                console.error('Logout error:', error);
                Alert.alert('Error', 'Failed to logout. Please try again.');
              }
            },
          },
        ]
      );
    }
  };

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
      </View>
      {/* Right side - Sync button or Settings/Logout button */}
      {showSync ? (
        <TouchableOpacity
          style={[
            styles.sideButton,
            { backgroundColor: colors.buttonBackground }
          ]}
          onPress={onSync}
          disabled={syncLoading}
          accessibilityLabel="Sync"
          accessibilityRole="button"
          accessibilityHint="Sync with Google services"
          activeOpacity={0.7}
          accessible={true}
          accessibilityLiveRegion="polite"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.syncButtonText, { color: colors.buttonText }]}>
            {syncLoading ? 'Syncing...' : 'Sync'}
          </Text>
        </TouchableOpacity>
      ) : (
        <TouchableOpacity
          style={[
            styles.sideButton,
            showSettings && { backgroundColor: 'rgba(255, 0, 0, 0.1)' } // Add red background for debugging
          ]}
          onPress={() => {
            console.log('Settings button clicked, showSettings:', showSettings);
            if (showSettings) {
              handleLogout();
            }
          }}
          accessibilityLabel={showSettings ? "Settings" : ""}
          accessibilityRole={showSettings ? "button" : undefined}
          accessibilityHint={showSettings ? "Open settings and logout options" : undefined}
          activeOpacity={0.7}
          accessible={showSettings}
          accessibilityLiveRegion="polite"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          {showSettings && (
            <>
              <SettingsIcon size={24} color={colors.text} />
              <Text style={{ fontSize: 8, color: 'red' }}>LOGOUT</Text>
            </>
          )}
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
  syncButtonText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
}); 