import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/ui/CheckIcon';
import { StarIcon } from '@/components/ui/StarIcon';
import { TargetIcon } from '@/components/ui/TargetIcon';
import TopBar from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { useThemeColors } from '@/hooks/useThemeColors';

interface UserStats {
  totalTodos: number;
  completedTodos: number;
  totalNotes: number;
  totalGoals: number;
  completedGoals: number;
  totalMemories: number;
  totalKanbanCards: number;
  totalCalendarEvents: number;
  totalPomodoroSessions: number;
  totalBreathingSessions: number;
  totalMeditationSessions: number;
  totalMusicSessions: number;
  totalMoodEntries: number;
  totalQuickJots: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { mode } = useSensoryMode();
  const { session, signOut } = useAuth();
  const { colors } = useThemeColors();
  
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userStats, setUserStats] = useState<UserStats>({
    totalTodos: 0,
    completedTodos: 0,
    totalNotes: 0,
    totalGoals: 0,
    completedGoals: 0,
    totalMemories: 0,
    totalKanbanCards: 0,
    totalCalendarEvents: 0,
    totalPomodoroSessions: 0,
    totalBreathingSessions: 0,
    totalMeditationSessions: 0,
    totalMusicSessions: 0,
    totalMoodEntries: 0,
    totalQuickJots: 0,
  });

  useEffect(() => {
    loadUserProfile();
  }, []);

  // Monitor session changes for debugging
  useEffect(() => {
    console.log('🔐 PROFILE: Session changed:', {
      hasSession: !!session,
      userId: session?.user?.id,
      userEmail: session?.user?.email
    });
  }, [session]);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      // For now, use mock data until we implement proper data loading
      setUserProfile({
        full_name: session?.user?.email?.split('@')[0] || 'User',
        email: session?.user?.email || 'No email',
        avatar_url: null,
        sensory_mode: mode,
      });
      
      setUserStats({
        totalTodos: 12,
        completedTodos: 8,
        totalNotes: 15,
        totalGoals: 5,
        completedGoals: 2,
        totalMemories: 3,
        totalKanbanCards: 20,
        totalCalendarEvents: 8,
        totalPomodoroSessions: 25,
        totalBreathingSessions: 18,
        totalMeditationSessions: 12,
        totalMusicSessions: 10,
        totalMoodEntries: 30,
        totalQuickJots: 45,
      });
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be available in the next update!');
  };

  const handleLogout = async () => {
    console.log('🔐 PROFILE: Logout requested');
    console.log('🔐 PROFILE: Current session:', session?.user?.id);
    
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
      console.log('🔐 PROFILE: Logout cancelled by user');
      return;
    }
    
    try {
      console.log('🔐 PROFILE: Starting logout process...');
      
      // Call signOut from AuthContext
      await signOut();
      console.log('🔐 PROFILE: SignOut completed successfully');
      
      // Navigate to signin screen with fallback
      console.log('🔐 PROFILE: Navigating to signin screen...');
      try {
        router.replace('/(auth)/signin');
        console.log('🔐 PROFILE: router.replace completed');
      } catch (navError) {
        console.error('❌ PROFILE: Navigation error, trying fallback:', navError);
        // Fallback navigation
        try {
          router.push('/(auth)/signin');
          console.log('🔐 PROFILE: Fallback navigation completed');
        } catch (fallbackError) {
          console.error('❌ PROFILE: Fallback navigation also failed:', fallbackError);
          if (typeof window !== 'undefined') {
            window.location.href = '/(auth)/signin';
            console.log('🔐 PROFILE: window.location fallback completed');
          } else {
            alert('Logout completed but navigation failed. Please manually navigate to signin.');
          }
        }
      }
      
    } catch (error) {
      console.error('❌ PROFILE: Error during logout:', error);
      alert('Failed to logout. Please try again.');
    }
  };

  const handleBack = () => {
    router.back();
  };

  const getModeDisplayName = (modeKey: string) => {
    const modes = {
      low: 'Low Sensory',
      medium: 'Medium Sensory', 
      high: 'High Sensory',
      normal: 'Normal',
    };
    return modes[modeKey as keyof typeof modes] || modeKey;
  };

  const StatCard = ({ icon, label, value, color }: { 
    icon: React.ReactNode; 
    label: string; 
    value: number; 
    color: string; 
  }) => (
    <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: color + '20' }]}>
        {icon}
      </View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar title="Profile" onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading profile...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Profile" onBack={handleBack} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={[styles.profileHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <View style={styles.avatarContainer}>
            {userProfile?.avatar_url ? (
              <Image 
                source={{ uri: userProfile.avatar_url }} 
                style={styles.avatar}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.avatarPlaceholder, { backgroundColor: colors.primary }]}>
                <Text style={[styles.avatarText, { color: colors.buttonText }]}>
                  {userProfile?.full_name?.charAt(0)?.toUpperCase() || '?'}
                </Text>
              </View>
            )}
          </View>
          
          <View style={styles.profileInfo}>
            <Text style={[styles.userName, { color: colors.text }]}>
              {userProfile?.full_name || 'Unknown User'}
            </Text>
            <Text style={[styles.userEmail, { color: colors.textSecondary }]}>
              {userProfile?.email || 'No email'}
            </Text>
            <View style={[styles.modeChip, { backgroundColor: colors.primary + '20', borderColor: colors.primary }]}>
              <Text style={[styles.modeText, { color: colors.primary }]}>
                {getModeDisplayName(userProfile?.sensory_mode || mode)}
              </Text>
            </View>
          </View>
          
          <TouchableOpacity 
            style={[styles.editButton, { backgroundColor: colors.primary }]}
            onPress={handleEditProfile}
          >
            <Text style={[styles.editButtonText, { color: colors.buttonText }]}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Stats</Text>
          
          <View style={styles.statsGrid}>
            <StatCard 
              icon={<CheckIcon size={20} color="#10b981" />}
              label="Tasks Done"
              value={userStats.completedTodos}
              color="#10b981"
            />
            <StatCard 
              icon={<StarIcon size={20} color="#f59e0b" />}
              label="Streak Days"
              value={userStats.completedGoals}
              color="#f59e0b"
            />
            <StatCard 
              icon={<TargetIcon size={20} color="#8b5cf6" />}
              label="Goals Met"
              value={userStats.completedGoals}
              color="#8b5cf6"
            />
            <StatCard 
              icon={<CheckIcon size={20} color="#3b82f6" />}
              label="Notes"
              value={userStats.totalNotes}
              color="#3b82f6"
            />
          </View>
        </View>

        {/* Account Actions */}
        <View style={styles.actionsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Account</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => router.push('/settings')}
          >
            <Text style={[styles.actionButtonText, { color: colors.text }]}>Settings & Preferences</Text>
            <Text style={[styles.actionButtonIcon, { color: colors.textSecondary }]}>→</Text>
          </TouchableOpacity>
          
          {session?.user && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton, { borderColor: '#ef4444' }]}
              onPress={handleLogout}
            >
              <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Logout</Text>
            </TouchableOpacity>
          )}
        </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 24,
  },
  avatarContainer: {
    marginRight: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  profileInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 8,
  },
  modeChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  editButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  actionsSection: {
    marginBottom: 24,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  logoutButton: {
    backgroundColor: '#fef2f2',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  actionButtonIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
