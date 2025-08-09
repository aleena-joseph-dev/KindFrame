import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InfoIcon from '@/components/ui/InfoIcon';
import { NotesIcon } from '@/components/ui/NotesIcon';
import ProfileIcon from '@/components/ui/ProfileIcon';
import SettingsIcon from '@/components/ui/SettingsIcon';
import { TopBar } from '@/components/ui/TopBar';
import { SensoryColors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/contexts/GuestModeContext';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { AuthService } from '@/services/authService';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setMode } = useSensoryMode();
  const { isGuestMode } = useGuestMode();
  const { session } = useAuth();
  const colors = SensoryColors[mode];

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = useState(false);

  const handleBack = () => {
    router.back();
  };

  const handleModeChange = (newMode: string) => {
    setMode(newMode as any);
    Alert.alert('Mode Changed', `Switched to ${newMode} sensory mode`);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              router.replace('/(auth)/signin');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action cannot be undone. All your data will be permanently deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert('Feature Coming Soon', 'Account deletion will be available in the next update.');
          },
        },
      ]
    );
  };

  const handleManageIntegrations = () => {
    Alert.alert('Integrations', 'Integration management will be available in the next update!');
  };

  const handleContactSupport = () => {
    Alert.alert('Contact Support', 'Support contact will be available in the next update!');
  };

  const handleAbout = () => {
    Alert.alert(
      'About KindFrame',
      'Version 1.0.0\n\nA neurodivergent-friendly productivity app designed to help you manage tasks, notes, and goals in a calm, supportive environment.',
      [{ text: 'OK' }]
    );
  };

  const SettingsSection = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title}</Text>
      <View style={[styles.sectionContent, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {children}
      </View>
    </View>
  );

  const SettingsRow = ({ 
    icon, 
    label, 
    value, 
    onPress, 
    showArrow = true, 
    showSwitch = false, 
    switchValue = false, 
    onSwitchChange,
    isDestructive = false 
  }: {
    icon?: React.ReactNode;
    label: string;
    value?: string;
    onPress?: () => void;
    showArrow?: boolean;
    showSwitch?: boolean;
    switchValue?: boolean;
    onSwitchChange?: (value: boolean) => void;
    isDestructive?: boolean;
  }) => (
    <TouchableOpacity 
      style={[styles.settingsRow, { borderBottomColor: colors.border }]}
      onPress={onPress}
      disabled={showSwitch}
    >
      <View style={styles.settingsRowLeft}>
        {icon && <View style={styles.settingsIcon}>{icon}</View>}
        <View>
          <Text style={[styles.settingsLabel, { color: isDestructive ? '#ef4444' : colors.text }]}>
            {label}
          </Text>
          {value && (
            <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
              {value}
            </Text>
          )}
        </View>
      </View>
      
      <View style={styles.settingsRowRight}>
        {showSwitch && (
          <Switch
            value={switchValue}
            onValueChange={onSwitchChange}
            trackColor={{ false: colors.border, true: colors.primary + '40' }}
            thumbColor={switchValue ? colors.primary : colors.textSecondary}
          />
        )}
        {showArrow && !showSwitch && (
          <Text style={[styles.settingsArrow, { color: colors.textSecondary }]}>→</Text>
        )}
      </View>
    </TouchableOpacity>
  );

  const ModeSelector = () => (
    <View style={styles.modeSelector}>
      {['low', 'medium', 'high', 'normal'].map((modeOption) => (
        <TouchableOpacity
          key={modeOption}
          style={[
            styles.modeButton,
            {
              backgroundColor: mode === modeOption ? colors.primary : colors.background,
              borderColor: colors.border,
            }
          ]}
          onPress={() => handleModeChange(modeOption)}
        >
          <Text style={[
            styles.modeButtonText,
            { color: mode === modeOption ? colors.buttonText : colors.text }
          ]}>
            {modeOption.charAt(0).toUpperCase() + modeOption.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Settings" onBack={handleBack} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Account Settings */}
        <SettingsSection title="Account">
          <SettingsRow
            icon={<ProfileIcon size={20} color={colors.textSecondary} />}
            label="Profile"
            value="Edit your profile information"
            onPress={() => router.push('/profile')}
          />
          {!isGuestMode && (
            <>
              <SettingsRow
                icon={<SettingsIcon size={20} color={colors.textSecondary} />}
                label="Account Settings"
                value="Manage your account"
                onPress={() => Alert.alert('Coming Soon', 'Account settings will be available in the next update!')}
              />
              <SettingsRow
                label="Logout"
                onPress={handleLogout}
                showArrow={true}
                isDestructive={true}
              />
              <SettingsRow
                label="Delete Account"
                onPress={handleDeleteAccount}
                showArrow={true}
                isDestructive={true}
              />
            </>
          )}
        </SettingsSection>

        {/* App Preferences */}
        <SettingsSection title="App Preferences">
          <View style={styles.settingsRow}>
            <View style={styles.settingsRowLeft}>
              <Text style={[styles.settingsLabel, { color: colors.text }]}>Sensory Mode</Text>
              <Text style={[styles.settingsValue, { color: colors.textSecondary }]}>
                Choose your preferred sensory experience
              </Text>
            </View>
          </View>
          <ModeSelector />
          
          <SettingsRow
            label="Notifications"
            value="Reminders and updates"
            showSwitch={true}
            switchValue={notificationsEnabled}
            onSwitchChange={setNotificationsEnabled}
          />
          <SettingsRow
            label="Sound Effects"
            value="Button clicks and feedback"
            showSwitch={true}
            switchValue={soundEnabled}
            onSwitchChange={setSoundEnabled}
          />
          <SettingsRow
            label="Auto-Save"
            value="Automatically save your work"
            showSwitch={true}
            switchValue={autoSaveEnabled}
            onSwitchChange={setAutoSaveEnabled}
          />
          <SettingsRow
            label="Dark Mode"
            value="Coming soon"
            showSwitch={true}
            switchValue={darkModeEnabled}
            onSwitchChange={setDarkModeEnabled}
          />
        </SettingsSection>

        {/* Integrations */}
        <SettingsSection title="Integrations">
          <SettingsRow
            icon={<NotesIcon size={20} color={colors.textSecondary} />}
            label="Google Calendar"
            value="Sync your calendar events"
            onPress={handleManageIntegrations}
          />
          <SettingsRow
            icon={<NotesIcon size={20} color={colors.textSecondary} />}
            label="Notion"
            value="Connect your Notion workspace"
            onPress={handleManageIntegrations}
          />
          <SettingsRow
            label="Manage All Integrations"
            value="View and manage connected accounts"
            onPress={handleManageIntegrations}
          />
        </SettingsSection>

        {/* Support & About */}
        <SettingsSection title="Support & About">
          <SettingsRow
            icon={<InfoIcon size={20} color={colors.textSecondary} />}
            label="Help & Support"
            value="Get help with using KindFrame"
            onPress={handleContactSupport}
          />
          <SettingsRow
            icon={<InfoIcon size={20} color={colors.textSecondary} />}
            label="About KindFrame"
            value="Version 1.0.0"
            onPress={handleAbout}
          />
          <SettingsRow
            label="Privacy Policy"
            value="How we protect your data"
            onPress={() => Alert.alert('Coming Soon', 'Privacy policy will be available in the next update!')}
          />
          <SettingsRow
            label="Terms of Service"
            value="App usage terms"
            onPress={() => Alert.alert('Coming Soon', 'Terms of service will be available in the next update!')}
          />
        </SettingsSection>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  sectionContent: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  settingsRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingsIcon: {
    marginRight: 12,
    width: 20,
    alignItems: 'center',
  },
  settingsLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  settingsValue: {
    fontSize: 14,
    marginTop: 2,
  },
  settingsRowRight: {
    alignItems: 'center',
  },
  settingsArrow: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modeSelector: {
    flexDirection: 'row',
    padding: 12,
    justifyContent: 'space-between',
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
