import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CalendarIcon } from '@/components/ui/CalendarIcon';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { ClockIcon } from '@/components/ui/ClockIcon';
import { HeadphonesIcon } from '@/components/ui/HeadphonesIcon';
import { HomeIcon } from '@/components/ui/HomeIcon';
import { KanbanIcon } from '@/components/ui/KanbanIcon';
import { NotesIcon } from '@/components/ui/NotesIcon';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { SmileIcon } from '@/components/ui/SmileIcon';
import { TargetIcon } from '@/components/ui/TargetIcon';
import TopBar from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';

export default function MenuScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { navigationStack, addToStack, removeFromStack, getCurrentScreen, getPreviousScreen, handleBack } = usePreviousScreen();

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    console.log('Menu screen mounting, adding to stack');
    addToStack('menu');
  }, [addToStack]);

  // Monitor navigation stack changes
  useEffect(() => {
    console.log('Menu screen - Current navigation stack:', navigationStack);
    console.log('Menu screen - Current screen:', getCurrentScreen());
    console.log('Menu screen - Previous screen:', getPreviousScreen());
  }, [navigationStack, getCurrentScreen, getPreviousScreen]);

  // Cleanup function to stop any animations when component unmounts
  useEffect(() => {
    return () => {
      console.log('Menu screen unmounting');
      // Stop any ongoing animations when leaving the screen
      // This ensures clean state when returning to the screen
    };
  }, []);

  const handleBackPress = () => {
    console.log('Menu back button pressed - going directly to home');
    // Simple direct navigation to home
    router.push('/(tabs)');
  };

  const handleFeaturePress = (feature: string) => {
    if (feature === 'Notes') {
      router.push('/(tabs)/notes');
    } else if (feature === 'Kanban') {
      router.push('/(tabs)/kanban');
    } else if (feature === 'Pomodoro') {
      router.push('/(tabs)/pomodoro');
    } else if (feature === 'Calendar') {
      router.push('/(tabs)/calendar');
    } else if (feature === 'Goals') {
      router.push('/(tabs)/goals');
    } else if (feature === 'Todos') {
      router.push('/(tabs)/todo');
    } else if (feature === 'Zone Out') {
      router.push('/(tabs)/zone-out');
    } else if (feature === 'Profile') {
      router.push('/profile');
    } else {
      Alert.alert('Feature Coming Soon', `${feature} will be available in the next update!`);
    }
  };

  const menuOptions = [
    { id: 'notes', title: 'Notes', icon: <View><NotesIcon size={32} color={colors.icon} /></View>, bgColor: colors.cardBackground },
    { id: 'kanban', title: 'Kanban', icon: <View><KanbanIcon size={32} color={colors.icon} /></View>, bgColor: colors.cardBackground },
    { id: 'pomodoro', title: 'Pomodoro', icon: <View><ClockIcon size={32} color={colors.icon} /></View>, bgColor: colors.cardBackground },
    { id: 'calendar', title: 'Calendar', icon: <View><CalendarIcon size={32} color={colors.icon} /></View>, bgColor: colors.cardBackground },
    { id: 'goals', title: 'Goals', icon: <View><TargetIcon size={32} color={colors.icon} /></View>, bgColor: colors.cardBackground },
    { id: 'todos', title: 'Todos', icon: <View><CheckIcon size={32} color={colors.icon} /></View>, bgColor: colors.cardBackground },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="My Tools" onBack={handleBackPress} />

      <View style={styles.menuGrid}>
        {menuOptions.map((option) => (
          <TouchableOpacity
            key={option.id}
            style={[styles.menuCard, { backgroundColor: option.bgColor }]}
            onPress={() => handleFeaturePress(option.title)}
          >
            {option.icon}
            <Text style={styles.menuCardText}>{option.title}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.bottomNav, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.centerIcons}>
          <TouchableOpacity style={styles.centerIconBtn} onPress={() => handleFeaturePress('Zone Out')}>
            <View><HeadphonesIcon size={28} color={colors.icon} /></View>
            <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Zone Out</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.centerIconBtn} onPress={() => router.push('/(tabs)/mood-tracker')}>
            <View><SmileIcon size={28} color={colors.icon} /></View>
            <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Mood Tracker</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.centerIconBtn} onPress={() => router.push('/(tabs)')}>
            <View><HomeIcon size={28} color={colors.icon} /></View>
            <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  menuGrid: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  menuCard: {
    width: '30%',
    aspectRatio: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: 16,
  },
  menuCardText: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    textAlign: 'center',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    boxShadow: '0 -2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  centerIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  centerIconBtn: {
    padding: 4,
    alignItems: 'center',
  },
  bottomNavText: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
}); 