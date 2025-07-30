import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeadphonesIcon } from '@/components/ui/HeadphonesIcon';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface ZoneOutSession {
  id: string;
  type: 'journal' | 'breathing' | 'memory' | 'music' | 'meditation';
  duration: number; // in minutes
  completedAt: Date;
  notes?: string;
}

export default function ZoneOutScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  
  const [sessions, setSessions] = useState<ZoneOutSession[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('zone-out');
  }, [addToStack]);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const savedSessions = await AsyncStorage.getItem('zone_out_sessions');
      if (savedSessions) {
        setSessions(JSON.parse(savedSessions));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const saveSession = async (session: ZoneOutSession) => {
    try {
      const updatedSessions = [...sessions, session];
      await AsyncStorage.setItem('zone_out_sessions', JSON.stringify(updatedSessions));
      setSessions(updatedSessions);
    } catch (error) {
      console.error('Error saving session:', error);
    }
  };

  const handleInfo = () => {
    Alert.alert(
      'Zone Out Area',
      'A safe space for sensory regulation and mental decompression. Choose activities that help you find calm and focus. No pressure, no judgment - just what works for you.',
      [{ text: 'OK' }]
    );
  };

  const handleActivitySelect = (activity: string) => {
    setSelectedActivity(activity);
    
    // Create a session record
    const session: ZoneOutSession = {
      id: Date.now().toString(),
      type: activity as ZoneOutSession['type'],
      duration: 0, // Will be updated when activity completes
      completedAt: new Date(),
    };
    
    saveSession(session);
    
    // Show activity-specific guidance
    switch (activity) {
      case 'journal':
        router.push('/(tabs)/notes');
        break;
      case 'breathing':
        router.push('/(tabs)/breathe');
        break;
      case 'memory':
        router.push('/(tabs)/core-memory');
        break;
      case 'music':
        router.push('/(tabs)/music');
        break;
      case 'meditation':
        router.push('/(tabs)/meditation');
        break;
    }
  };

  const handleStartActivity = (activity: string) => {
    // For now, just show a completion message
    // In a real app, this would start the actual activity
    setTimeout(() => {
      Alert.alert(
        'Activity Complete',
        `Great job! You've completed your ${activity} session. How do you feel now?`,
        [
          { text: 'Better', onPress: () => setSelectedActivity(null) },
          { text: 'Same', onPress: () => setSelectedActivity(null) },
          { text: 'Need More', onPress: () => handleActivitySelect(activity) }
        ]
      );
    }, 2000);
  };

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'journal': return '#ff6b6b';
      case 'breathing': return '#4ecdc4';
      case 'memory': return '#ffa502';
      case 'music': return '#45b7d1';
      case 'meditation': return '#2ed573';
      default: return colors.text;
    }
  };

  const getActivityDescription = (activity: string) => {
    switch (activity) {
      case 'journal': return 'Write freely without judgment';
      case 'breathing': return 'Guided breathing exercises';
      case 'memory': return 'Relive positive moments';
      case 'music': return 'Calming sounds and rhythms';
      case 'meditation': return 'Mindful breathing focus';
      default: return '';
    }
  };

  const activities = [
    { id: 'journal', title: 'Journal', description: 'Write freely without judgment' },
    { id: 'breathing', title: 'Breath With Me', description: 'Guided breathing exercises' },
    { id: 'memory', title: 'Core Memory', description: 'Relive positive moments' },
    { id: 'music', title: 'Music', description: 'Calming sounds and rhythms' },
    { id: 'meditation', title: 'Meditation', description: 'Mindful breathing focus' },
  ];

  const getTodaySessions = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return sessions.filter(session => {
      const sessionDate = new Date(session.completedAt);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate.getTime() === today.getTime();
    });
  };

  const todaySessions = getTodaySessions();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Zone Out Area" onBack={() => handleBack()} onInfo={handleInfo} />

      {/* Welcome Message */}
      <View style={styles.welcomeContainer}>
        <Text style={[styles.welcomeTitle, { color: colors.text }]}>
          Find Your Calm
        </Text>
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Choose an activity that helps you regulate and decompress. No pressure, no judgment.
        </Text>
      </View>

      {/* Activities Grid */}
      <ScrollView style={styles.activitiesContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.activitiesGrid}>
          {activities.map((activity) => (
            <TouchableOpacity
              key={activity.id}
              style={[styles.activityCard, { 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border 
              }]}
              onPress={() => handleActivitySelect(activity.id)}
            >
              <View style={[styles.activityIcon, { backgroundColor: getActivityColor(activity.id) }]}>
                <HeadphonesIcon size={32} color="#fff" />
              </View>
              <Text style={[styles.activityTitle, { color: colors.text }]}>
                {activity.title}
              </Text>
              <Text style={[styles.activityDescription, { color: colors.textSecondary }]}>
                {activity.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Today's Progress */}
        {todaySessions.length > 0 && (
          <View style={[styles.progressContainer, { backgroundColor: colors.surface }]}>
            <Text style={[styles.progressTitle, { color: colors.text }]}>
              Today's Sessions
            </Text>
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {todaySessions.length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Sessions
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statNumber, { color: colors.text }]}>
                  {Math.floor(todaySessions.reduce((total, session) => total + session.duration, 0))}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  Minutes
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tips Section */}
        <View style={[styles.tipsContainer, { backgroundColor: colors.surface }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>
            Remember
          </Text>
          <View style={styles.tipsList}>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • There's no "right way" to zone out
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • Start with just a few minutes
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • You can stop anytime - no pressure
            </Text>
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              • What works today might be different tomorrow
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  activitiesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  activityCard: {
    width: '48%',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 140,
  },
  activityIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  activityDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
  },
  progressContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  progressTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  tipsContainer: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  tipsList: {
    paddingHorizontal: 10,
  },
  tipText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
}); 