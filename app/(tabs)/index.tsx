import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EnergyPopup } from '@/components/onboarding/EnergyPopup';
import { NicknamePopup } from '@/components/onboarding/NicknamePopup';
import { OnboardingPopup } from '@/components/onboarding/OnboardingPopup';
import { BrainIcon } from '@/components/ui/BrainIcon';
import { CalendarIcon } from '@/components/ui/CalendarIcon';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { ClockIcon } from '@/components/ui/ClockIcon';
import { HeadphonesIcon } from '@/components/ui/HeadphonesIcon';
import { KanbanIcon } from '@/components/ui/KanbanIcon';
import { NotesIcon } from '@/components/ui/NotesIcon';
import { SearchIcon } from '@/components/ui/SearchIcon';
import { SmileIcon } from '@/components/ui/SmileIcon';
import { TargetIcon } from '@/components/ui/TargetIcon';
import { ThemeDropdown } from '@/components/ui/ThemeDropdown';
import { ToggleSwitch } from '@/components/ui/ToggleSwitch';
import { SensoryColors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';

interface FeatureItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  isVisible: boolean;
}

interface OnboardingData {
  nickname: string;
  mode: string;
  energyLevel: number;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    nickname: 'Alex',
    mode: 'normal',
    energyLevel: 5,
  });
  
  // Onboarding flow state
  const [showNicknamePopup, setShowNicknamePopup] = useState(false);
  const [showModePopup, setShowModePopup] = useState(false);
  const [showEnergyPopup, setShowEnergyPopup] = useState(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  
  const [sensoryMode, setSensoryMode] = useState<'low' | 'medium' | 'high'>('low');
  const [searchQuery, setSearchQuery] = useState('');

  const [features, setFeatures] = useState<FeatureItem[]>([
    {
      id: 'view-my-day',
      title: 'View My Day',
      icon: <CalendarIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'add-goals',
      title: 'Add Goals',
      icon: <TargetIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'pomodoro-timer',
      title: 'Pomodoro Timer',
      icon: <ClockIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'todo-list',
      title: 'To-Do List',
      icon: <CheckIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'notes',
      title: 'Notes',
      icon: <NotesIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'kanban-board',
      title: 'Kanban Board',
      icon: <KanbanIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
  ]);

  useEffect(() => {
    checkOnboardingStatus();
  }, []);

  const checkOnboardingStatus = async () => {
    try {
      const completed = await AsyncStorage.getItem('hasCompletedOnboarding');
      if (!completed) {
        // Start onboarding flow
        setShowNicknamePopup(true);
      } else {
        setHasCompletedOnboarding(true);
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  };

  const handleNicknameNext = (nickname: string) => {
    setOnboardingData(prev => ({ ...prev, nickname }));
    setShowNicknamePopup(false);
    setShowModePopup(true);
  };

  const handleNicknameSkip = () => {
    setShowNicknamePopup(false);
    setShowModePopup(true);
  };

  const handleModeSelect = (modeId: string) => {
    setOnboardingData(prev => ({ ...prev, mode: modeId }));
    setShowModePopup(false);
    setShowEnergyPopup(true);
  };

  const handleModeSkip = () => {
    setShowModePopup(false);
    setShowEnergyPopup(true);
  };

  const handleEnergyNext = (energyLevel: number) => {
    setOnboardingData(prev => ({ ...prev, energyLevel }));
    completeOnboarding();
  };

  const handleEnergySkip = () => {
    completeOnboarding();
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('hasCompletedOnboarding', 'true');
      await AsyncStorage.setItem('onboardingData', JSON.stringify(onboardingData));
      setHasCompletedOnboarding(true);
      setShowEnergyPopup(false);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
    }
  };

  const handleFeaturePress = (feature: string) => {
    Alert.alert('Feature Coming Soon', `${feature} will be available in the next update!`);
  };

  const handleThemeChange = (theme: 'low' | 'medium' | 'high') => {
    setSensoryMode(theme);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
    console.log('Searching for:', query);
  };

  const handleFeatureToggle = (featureId: string) => {
    setFeatures(prevFeatures => 
      prevFeatures.map(feature => 
        feature.id === featureId 
          ? { ...feature, isVisible: !feature.isVisible }
          : feature
      )
    );
  };

  const handleProfilePress = async () => {
    try {
      // Clear all user data
      await AsyncStorage.multiRemove([
        'userToken',
        'userData',
        'hasCompletedOnboarding',
        'onboardingData'
      ]);
      
      // Navigate to signin page
      router.replace('/signin');
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout. Please try again.');
    }
  };

  const visibleFeatures = features.filter(feature => feature.isVisible);
  const colors = SensoryColors[sensoryMode];

  // Update icon colors based on current theme
  const getFeatureIcon = (feature: FeatureItem) => {
    const iconProps = { size: 32, color: colors.icon };
    switch (feature.id) {
      case 'view-my-day':
        return <CalendarIcon {...iconProps} />;
      case 'add-goals':
        return <TargetIcon {...iconProps} />;
      case 'pomodoro-timer':
        return <ClockIcon {...iconProps} />;
      case 'todo-list':
        return <CheckIcon {...iconProps} />;
      case 'notes':
        return <NotesIcon {...iconProps} />;
      case 'kanban-board':
        return <KanbanIcon {...iconProps} />;
      default:
        return feature.icon;
    }
  };

  // Create rows for the grid layout - always maintain 2 columns
  const createGridRows = () => {
    const rows = [];
    for (let i = 0; i < visibleFeatures.length; i += 2) {
      const row = visibleFeatures.slice(i, i + 2);
      rows.push(row);
    }
    return rows;
  };

  const gridRows = createGridRows();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Top Bar */}
      <View style={[styles.topBar, { backgroundColor: colors.topBarBackground }]}>
        <View style={styles.topBarContent}>
          <Text style={[styles.logo, { color: colors.text }]}>KindFrame</Text>
          <View style={styles.topBarRight}>
            <ThemeDropdown 
              currentTheme={sensoryMode}
              onThemeChange={handleThemeChange}
              colors={colors}
            />
            <TouchableOpacity 
              style={[styles.profileButton, { backgroundColor: colors.profileBackground }]}
              onPress={handleProfilePress}
            >
              <Text style={[styles.profileCharacter, { color: colors.profilePhoto }]}>👤</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>
          <SearchIcon size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tasks, notes, features..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Welcome Section */}
        <View style={styles.welcomeSection}>
        </View>

        {/* Feature Grid */}
        <View style={styles.featureGridContainer}>
          <View style={styles.featureGrid}>
            {gridRows.map((row, rowIndex) => (
              <View key={rowIndex} style={styles.featureRow}>
                {row.map((feature) => (
                  <View key={feature.id} style={[styles.featureCard, { backgroundColor: colors.cardBackground }]}>
                    {/* Toggle Switch - Top Right Corner */}
                    <View style={styles.cardToggleContainer}>
                      <ToggleSwitch 
                        isOn={feature.isVisible}
                        onToggle={() => handleFeatureToggle(feature.id)}
                        size="small"
                        color={colors.buttonBackground}
                      />
                    </View>
                    
                    {/* Feature Content */}
                    <TouchableOpacity 
                      style={styles.featureContent}
                      onPress={() => handleFeaturePress(feature.title)}
                    >
                      {getFeatureIcon(feature)}
                      <Text style={[styles.featureTitle, { color: colors.text }]}>
                        {feature.title}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {/* Add empty space to maintain grid structure if odd number of items */}
                {row.length === 1 && <View style={styles.emptyCard} />}
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Bottom Footer */}
      <View style={[styles.bottomFooter, { backgroundColor: colors.cardBackground }]}>
        <TouchableOpacity 
          style={styles.footerItem}
          onPress={() => handleFeaturePress('Mood Tracker')}
        >
          <SmileIcon size={24} color={colors.icon} />
          <Text style={[styles.footerText, { color: colors.text }]}>Mood</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerItem}
          onPress={() => handleFeaturePress('Zone Out')}
        >
          <HeadphonesIcon size={24} color={colors.icon} />
          <Text style={[styles.footerText, { color: colors.text }]}>Zone Out</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.footerItem}
          onPress={() => handleFeaturePress('Brain Dump')}
        >
          <BrainIcon size={24} color={colors.icon} />
          <Text style={[styles.footerText, { color: colors.text }]}>Brain Dump</Text>
        </TouchableOpacity>
      </View>

      {/* Onboarding Popups */}
      <NicknamePopup
        visible={showNicknamePopup}
        onClose={() => setShowNicknamePopup(false)}
        onNext={handleNicknameNext}
        onSkip={handleNicknameSkip}
        defaultNickname={onboardingData.nickname}
      />

      <OnboardingPopup
        visible={showModePopup}
        onClose={() => setShowModePopup(false)}
        onSkip={handleModeSkip}
        onModeSelect={handleModeSelect}
      />

      <EnergyPopup
        visible={showEnergyPopup}
        onClose={() => setShowEnergyPopup(false)}
        onNext={handleEnergyNext}
        onSkip={handleEnergySkip}
        defaultEnergyLevel={onboardingData.energyLevel}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileCharacter: {
    fontSize: 20,
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  featureGridContainer: {
    marginBottom: 20,
  },
  featureGrid: {
    gap: 16,
  },
  featureRow: {
    flexDirection: 'row',
    gap: 16,
  },
  featureCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
    position: 'relative',
  },
  emptyCard: {
    flex: 1,
    aspectRatio: 1,
  },
  cardToggleContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  footerItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
