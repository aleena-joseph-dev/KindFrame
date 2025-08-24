import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InfoIcon from '@/components/ui/InfoIcon';
import { NotesIcon } from '@/components/ui/NotesIcon';
import ProfileIcon from '@/components/ui/ProfileIcon';
import SettingsIcon from '@/components/ui/SettingsIcon';
import TopBar from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/contexts/GuestModeContext';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function SettingsScreen() {
  const router = useRouter();
  const { mode, setMode } = useSensoryMode();
  const { session, signOut } = useAuth();
  const { colors } = useThemeColors();
  const { isGuestMode } = useGuestMode();

  // Local session state for immediate updates
  const [localSession, setLocalSession] = useState(session);

  // Monitor session changes for debugging
  useEffect(() => {
    console.log('🔐 SETTINGS: Session changed:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      isGuestMode
    });
    setLocalSession(session);
  }, [session, isGuestMode]);

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
    console.log('🔐 SETTINGS: Logout requested');
    console.log('🔐 SETTINGS: Current session:', session?.user?.id);
    console.log('🔐 SETTINGS: Local session:', localSession?.user?.id);
    console.log('🔐 SETTINGS: Is guest mode:', isGuestMode);
    
    // Cross-platform confirmation
    let confirmed = false;
    
    if (Platform.OS === 'web') {
      // Web: use window.confirm
      confirmed = window.confirm('Are you sure you want to logout?');
    } else {
      // Native: use Alert.alert with Promise
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Logout',
          'Are you sure you want to logout?',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Logout', style: 'destructive', onPress: () => resolve(true) }
          ]
        );
      });
    }
    
    if (!confirmed) {
      console.log('🔐 SETTINGS: Logout cancelled by user');
      return;
    }
    
    try {
      console.log('🔐 SETTINGS: Starting logout process...');
      console.log('🔐 SETTINGS: About to call signOut()...');
      
      // Immediately clear local session state
      setLocalSession(null);
      console.log('🔐 SETTINGS: Local session cleared immediately');
      
      // Call signOut from AuthContext
      await signOut();
      console.log('🔐 SETTINGS: SignOut completed successfully');
      console.log('🔐 SETTINGS: Session after signOut:', session?.user?.id);
      console.log('🔐 SETTINGS: Local session after signOut:', localSession?.user?.id);
      
      // Force navigation immediately
      console.log('🔐 SETTINGS: Force navigating to signin screen...');
      
      // Try navigation methods
      try {
        console.log('🔐 SETTINGS: Trying router.replace...');
        router.replace('/(auth)/signin');
        console.log('🔐 SETTINGS: router.replace completed');
      } catch (error1) {
        console.log('🔐 SETTINGS: router.replace failed, trying router.push...');
        try {
          router.push('/(auth)/signin');
          console.log('🔐 SETTINGS: router.push completed');
        } catch (error2) {
          console.log('🔐 SETTINGS: router.push failed, trying window.location...');
          if (typeof window !== 'undefined') {
            window.location.href = '/(auth)/signin';
            console.log('🔐 SETTINGS: window.location completed');
          } else {
            console.error('❌ SETTINGS: All navigation methods failed');
            alert('Logout completed but navigation failed. Please manually navigate to signin.');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ SETTINGS: Error during logout:', error);
      // Even if signOut fails, try to navigate away
      try {
        console.log('🔐 SETTINGS: Trying navigation despite signOut error...');
        router.replace('/(auth)/signin');
      } catch (navError) {
        console.error('❌ SETTINGS: Navigation also failed:', navError);
        alert('Failed to logout and navigate. Please manually navigate to signin.');
      }
    }
  };

  // Simple direct logout function
  const forceLogout = async () => {
    console.log('🔐 SETTINGS: Force logout initiated...');
    
    // Cross-platform confirmation
    let confirmed = false;
    
    if (Platform.OS === 'web') {
      // Web: use window.confirm
      confirmed = window.confirm('Force logout? This will bypass normal logout process.');
    } else {
      // Native: use Alert.alert with Promise
      confirmed = await new Promise((resolve) => {
        Alert.alert(
          'Force Logout',
          'Force logout? This will bypass normal logout process.',
          [
            { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
            { text: 'Force Logout', style: 'destructive', onPress: () => resolve(true) }
          ]
        );
      });
    }
    
    if (!confirmed) {
      console.log('🔐 SETTINGS: Force logout cancelled by user');
      return;
    }
    
    try {
      // Clear local state immediately
      setLocalSession(null);
      console.log('🔐 SETTINGS: Local state cleared');
      
      // Try to call Supabase signOut directly
      if (typeof window !== 'undefined' && (window as any).supabase) {
        console.log('🔐 SETTINGS: Calling Supabase signOut directly...');
        const { error } = await (window as any).supabase.auth.signOut();
        if (error) {
          console.error('❌ SETTINGS: Direct Supabase signOut error:', error);
        } else {
          console.log('✅ SETTINGS: Direct Supabase signOut successful');
        }
      }
      
      // Force navigation regardless of signOut result
      console.log('🔐 SETTINGS: Force navigating to signin...');
      if (typeof window !== 'undefined') {
        window.location.href = '/(auth)/signin';
        console.log('🔐 SETTINGS: window.location navigation initiated');
      } else {
        router.replace('/(auth)/signin');
        console.log('🔐 SETTINGS: router navigation initiated');
      }
      
    } catch (error) {
      console.error('❌ SETTINGS: Force logout error:', error);
      // Last resort - try to navigate anyway
      try {
        if (typeof window !== 'undefined') {
          window.location.href = '/(auth)/signin';
        } else {
          router.replace('/(auth)/signin');
        }
      } catch (navError) {
        console.error('❌ SETTINGS: All navigation methods failed:', navError);
        alert('Please manually navigate to signin page.');
      }
    }
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
          {localSession?.user && (
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
                label="Force Logout (Debug)"
                onPress={forceLogout}
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
