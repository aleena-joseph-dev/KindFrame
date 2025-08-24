import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InfoModal from '@/components/ui/InfoModal';
import TopBar from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

// Custom SVG Icon Components
const BookOpenIcon = ({ size = 24, color = '#000000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
  </svg>
);

const WindIcon = ({ size = 24, color = '#000000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.7 7.7a2.5 2.5 0 1 1 1.8 4.3H2"></path>
    <path d="M9.6 4.6A2 2 0 1 1 11 8H2"></path>
    <path d="M12.6 19.4A2 2 0 1 0 14 16H2"></path>
  </svg>
);

const HeartIcon = ({ size = 24, color = '#000000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path>
  </svg>
);

const MusicIcon = ({ size = 24, color = '#000000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 18V5l12-2v13"></path>
    <circle cx="6" cy="18" r="3"></circle>
    <circle cx="18" cy="16" r="3"></circle>
  </svg>
);

const BrainIcon = ({ size = 24, color = '#000000' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"></path>
    <path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"></path>
    <path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"></path>
    <path d="M17.599 6.5a3 3 0 0 0 .399-1.375"></path>
    <path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"></path>
    <path d="M3.477 10.896a4 4 0 0 1 .585-.396"></path>
    <path d="M19.938 10.5a4 4 0 0 1 .585.396"></path>
    <path d="M6 18a4 4 0 0 1-1.967-.516"></path>
    <path d="M19.967 17.484A4 4 0 0 1 18 18"></path>
  </svg>
);

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
  
  const [sessions, setSessions] = useState<ZoneOutSession[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    // The usePreviousScreen hook is removed, so this line is removed.
    // If navigation stack management is needed, it should be re-implemented.
  }, []);

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
    setShowInfoModal(true);
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
      <TopBar 
        title="Zone Out Area" 
        onBack={() => router.back()} 
        showInfo={true}
        onInfo={handleInfo} 
      />

      {/* Welcome Message */}
      <View style={[styles.welcomeContainer, { 
        backgroundColor: Platform.OS === 'ios' ? 'rgba(139, 92, 246, 0.08)' : 'rgba(139, 92, 246, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.1)'
      }]}>
        {/* Decorative background element */}
        <View style={{
          position: 'absolute',
          top: -20,
          right: -20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          opacity: 0.6,
        }} />
        <View style={{
          position: 'absolute',
          bottom: -15,
          left: -15,
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: 'rgba(139, 92, 246, 0.08)',
          opacity: 0.4,
        }} />
        
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
                backgroundColor: Platform.OS === 'ios' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(255, 255, 255, 0.9)',
                borderWidth: 1,
                borderColor: 'rgba(139, 92, 246, 0.1)'
              }]}
              onPress={() => handleActivitySelect(activity.id)}
              activeOpacity={0.8}
            >
                              <View style={[styles.activityIcon, { 
                  backgroundColor: colors.topBarBackground,
                  borderWidth: 2,
                  borderColor: `${colors.background}40`
                }]}>
                  {activity.id === 'journal' && <BookOpenIcon size={32} color={colors.background} />}
                  {activity.id === 'breathing' && <WindIcon size={32} color={colors.background} />}
                  {activity.id === 'memory' && <HeartIcon size={32} color={colors.background} />}
                  {activity.id === 'music' && <MusicIcon size={32} color={colors.background} />}
                  {activity.id === 'meditation' && <BrainIcon size={32} color={colors.background} />}
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
          <View style={[styles.progressContainer, { 
            backgroundColor: Platform.OS === 'ios' ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.05)',
            borderWidth: 1,
            borderColor: 'rgba(16, 185, 129, 0.1)'
          }]}>
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
        <View style={[styles.tipsContainer, { 
          backgroundColor: Platform.OS === 'ios' ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.05)',
          borderWidth: 1,
          borderColor: 'rgba(245, 158, 11, 0.1)'
        }]}>
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

      {/* Info Modal */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Zone Out Area Guide"
        sections={[
          {
            title: "Purpose",
            content: "The Zone Out Area is your safe space for sensory regulation and mental decompression. Choose activities that help you find calm and focus when you need a break."
          },
          {
            title: "Available Activities",
            content: "Journal for free writing, Breathing exercises for regulation, Core Memory for positive reflection, Music for auditory comfort, and Meditation for mindful focus."
          }
        ]}
        tips={[
          "Start with just a few minutes",
          "You can stop anytime - no pressure", 
          "What works today might be different tomorrow"
        ]}
        description="This space is designed to help you regulate your nervous system and find your center when you're feeling overwhelmed or need a mental break."
      />
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
    marginBottom: 16,
    backgroundColor: 'rgba(139, 92, 246, 0.05)', // Light purple background
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
    overflow: 'hidden',
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
    opacity: 0.9,
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
    borderRadius: 16,
    borderWidth: 0,
    alignItems: 'center',
    marginBottom: 16,
    minHeight: 140,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
    transform: [{ scale: 1 }],
  },
  activityCardPressed: {
    transform: [{ scale: 0.98 }],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 8,
  },
  activityIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    transform: [{ scale: 1 }],
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  activityDescription: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
    opacity: 0.8,
  },
  progressContainer: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: 24,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
    padding: 24,
    borderRadius: 16,
    borderWidth: 0,
    marginBottom: 24,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
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
  popupContent: {
    padding: 20,
    alignItems: 'center',
  },
  popupTitle: {
    fontWeight: 'bold',
    marginBottom: 10,
  },
  suggestionButton: {
    backgroundColor: '#2563eb',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
}); 