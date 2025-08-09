import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CheckIcon } from '@/components/ui/CheckIcon';
import { StarIcon } from '@/components/ui/StarIcon';
import { TargetIcon } from '@/components/ui/TargetIcon';
import { TopBar } from '@/components/ui/TopBar';
import { SensoryColors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/contexts/GuestModeContext';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { AuthService } from '@/services/authService';

interface UserStats {
  tasksCompleted: number;
  streakDays: number;
  totalNotes: number;
  goalsAchieved: number;
  minutesMeditated: number;
  pomodoroSessions: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { mode } = useSensoryMode();
  const { isGuestMode } = useGuestMode();
  const { session } = useAuth();
  const colors = SensoryColors[mode];

  const [userProfile, setUserProfile] = useState<any>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    tasksCompleted: 0,
    streakDays: 0,
    totalNotes: 0,
    goalsAchieved: 0,
    minutesMeditated: 0,
    pomodoroSessions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      
      if (isGuestMode) {
        // Mock data for guest mode
        setUserProfile({
          full_name: 'Guest User',
          email: 'guest@kindframe.app',
          avatar_url: null,
          sensory_mode: mode,
        });
        setUserStats({
          tasksCompleted: 12,
          streakDays: 3,
          totalNotes: 8,
          goalsAchieved: 2,
          minutesMeditated: 45,
          pomodoroSessions: 6,
        });
      } else {
        const currentUser = await AuthService.getCurrentUser();
        if (currentUser) {
          setUserProfile(currentUser);
          // Load actual stats from database
          // TODO: Implement real stats loading from database
          setUserStats({
            tasksCompleted: 0,
            streakDays: 0,
            totalNotes: 0,
            goalsAchieved: 0,
            minutesMeditated: 0,
            pomodoroSessions: 0,
          });
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      Alert.alert('Error', 'Failed to load profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = () => {
    Alert.alert('Edit Profile', 'Profile editing will be available in the next update!');
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
              value={userStats.tasksCompleted}
              color="#10b981"
            />
            <StatCard 
              icon={<StarIcon size={20} color="#f59e0b" />}
              label="Streak Days"
              value={userStats.streakDays}
              color="#f59e0b"
            />
            <StatCard 
              icon={<TargetIcon size={20} color="#8b5cf6" />}
              label="Goals Met"
              value={userStats.goalsAchieved}
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
          
          {!isGuestMode && (
            <TouchableOpacity 
              style={[styles.actionButton, styles.logoutButton, { borderColor: '#ef4444' }]}
              onPress={handleLogout}
            >
              <Text style={[styles.actionButtonText, { color: '#ef4444' }]}>Logout</Text>
              <Text style={[styles.actionButtonIcon, { color: '#ef4444' }]}>→</Text>
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
