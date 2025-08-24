import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import DayChart from '@/components/insights/DayChart';
import MonthHeatmap from '@/components/insights/MonthHeatmap';
import PeriodSwitcher from '@/components/insights/PeriodSwitcher';
import SeriesToggles from '@/components/insights/SeriesToggles';
import StatsStrip from '@/components/insights/StatsStrip';
import WeekChart from '@/components/insights/WeekChart';
import TopBar from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { bucketByHour, bucketByMonthDay, bucketByWeekday, calcStats } from '@/lib/insights/moodAgg';
import { fetchMoodEntriesForPeriod } from '@/lib/insights/moodQuery';
import { MoodEntry, Period, SeriesSelection } from '@/lib/insights/types';

const STORAGE_KEYS = {
  PERIOD: 'mood_insights_period',
  SERIES: 'mood_insights_series',
};

export default function MoodInsightsScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { session, loading: authLoading } = useAuth();
  
  const [period, setPeriod] = useState<Period>('day');
  const [selectedSeries, setSelectedSeries] = useState<SeriesSelection[]>(['both']);
  const [moodEntries, setMoodEntries] = useState<MoodEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add comprehensive logging
  console.log('🔍 INSIGHTS DEBUG: Component rendered');
  console.log('🔍 INSIGHTS DEBUG: session:', session);
  console.log('🔍 INSIGHTS DEBUG: authLoading:', authLoading);
  console.log('🔍 INSIGHTS DEBUG: period:', period);
  console.log('🔍 INSIGHTS DEBUG: selectedSeries:', selectedSeries);
  console.log('🔍 INSIGHTS DEBUG: moodEntries length:', moodEntries.length);
  console.log('🔍 INSIGHTS DEBUG: loading:', loading);
  console.log('🔍 INSIGHTS DEBUG: error:', error);

  // Load user preferences from storage
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        const savedPeriod = await AsyncStorage.getItem(STORAGE_KEYS.PERIOD);
        const savedSeries = await AsyncStorage.getItem(STORAGE_KEYS.SERIES);
        
        if (savedPeriod) {
          setPeriod(savedPeriod as Period);
          console.log('🔍 INSIGHTS DEBUG: Loaded saved period:', savedPeriod);
        }
        if (savedSeries) {
          const parsedSeries = JSON.parse(savedSeries) as SeriesSelection[];
          setSelectedSeries(parsedSeries);
          console.log('🔍 INSIGHTS DEBUG: Loaded saved series:', parsedSeries);
        }
      } catch (error) {
        console.error('🔍 INSIGHTS ERROR: Failed to load preferences:', error);
      }
    };

    loadPreferences();
  }, []);

  // Load mood data
  useEffect(() => {
    const loadMoodData = async () => {
      if (!session?.user?.id) {
        console.log('🔍 INSIGHTS DEBUG: No user session, skipping data load');
        return;
      }

      try {
        console.log('🔍 INSIGHTS DEBUG: Loading mood data for user:', session.user.id);
        setLoading(true);
        setError(null);

        const data = await fetchMoodEntriesForPeriod({
          userId: session.user.id,
          period,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });

        console.log('🔍 INSIGHTS DEBUG: Fetched mood data:', data);
        setMoodEntries(data);
      } catch (err) {
        console.error('🔍 INSIGHTS ERROR: Failed to load mood data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load mood data');
      } finally {
        setLoading(false);
        console.log('🔍 INSIGHTS DEBUG: Data loading completed');
      }
    };

    loadMoodData();
  }, [session?.user?.id, period]);

  // Save preferences when they change
  useEffect(() => {
    const savePreferences = async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.PERIOD, period);
        await AsyncStorage.setItem(STORAGE_KEYS.SERIES, JSON.stringify(selectedSeries));
        console.log('🔍 INSIGHTS DEBUG: Saved preferences - period:', period, 'series:', selectedSeries);
      } catch (error) {
        console.error('🔍 INSIGHTS ERROR: Failed to save preferences:', error);
      }
    };

    savePreferences();
  }, [period, selectedSeries]);

  // Process data for charts
  const chartData = useMemo(() => {
    console.log('🔍 INSIGHTS DEBUG: Processing chart data');
    console.log('🔍 INSIGHTS DEBUG: Raw mood entries:', moodEntries);
    
    if (moodEntries.length === 0) {
      console.log('🔍 INSIGHTS DEBUG: No mood entries, returning empty data');
      return {
        hourly: [],
        weekly: [],
        monthly: [],
        stats: {
          avgMind: 0,
          avgBody: 0,
          mindBodyDelta: 0,
          mostVolatileDay: null,
          bestDay: null,
          streak: 0,
        },
      };
    }

    try {
      const hourly = bucketByHour(moodEntries);
      const weekly = bucketByWeekday(moodEntries);
      const monthly = bucketByMonthDay(moodEntries);
      const stats = calcStats(moodEntries);

      console.log('🔍 INSIGHTS DEBUG: Processed chart data:', {
        hourly: hourly.length,
        weekly: weekly.length,
        monthly: monthly.length,
        stats,
      });

      return { hourly, weekly, monthly, stats };
    } catch (error) {
      console.error('🔍 INSIGHTS ERROR: Failed to process chart data:', error);
      return {
        hourly: [],
        weekly: [],
        monthly: [],
        stats: {
          avgMind: 0,
          avgBody: 0,
          mindBodyDelta: 0,
          mostVolatileDay: null,
          bestDay: null,
          streak: 0,
        },
      };
    }
  }, [moodEntries]);

  const handlePeriodChange = useCallback((newPeriod: Period) => {
    console.log('🔍 INSIGHTS DEBUG: Period changed from', period, 'to', newPeriod);
    setPeriod(newPeriod);
  }, [period]);

  const handleSeriesChange = useCallback((newSeries: SeriesSelection[]) => {
    console.log('🔍 INSIGHTS DEBUG: Series changed from', selectedSeries, 'to', newSeries);
    setSelectedSeries(newSeries);
  }, [selectedSeries]);

  const handleFilterPress = () => {
    Alert.alert(
      'Filter Options',
      'Filter functionality coming soon!\n\nTimezone: Device default\nWeek starts: Monday\nTags: Not available yet',
      [{ text: 'OK' }]
    );
  };

  const handleDayPress = (day: any) => {
    // TODO: Show bottom sheet with day details
    Alert.alert(
      'Day Details',
      `Date: ${day.date}\nMind: ${day.mind?.toFixed(1) || 'N/A'}\nBody: ${day.body?.toFixed(1) || 'N/A'}\nEntries: ${day.count}`,
      [{ text: 'OK' }]
    );
  };

  // Add logging for render conditions
  if (authLoading) {
    console.log('🔍 INSIGHTS DEBUG: Rendering loading state (auth)');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar title="Mood Insights" onBack={() => router.back()} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.topBarBackground} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!session?.user) {
    console.log('🔍 INSIGHTS DEBUG: Rendering no session state');
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar title="Mood Insights" onBack={() => router.back()} />
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: colors.text }]}>
            Please sign in to view mood insights
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  console.log('🔍 INSIGHTS DEBUG: Rendering main content');
  console.log('🔍 INSIGHTS DEBUG: Chart data ready:', !!chartData);
  console.log('🔍 INSIGHTS DEBUG: DayChart will receive:', {
    data: chartData.hourly,
    selectedSeries,
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Mood Insights" onBack={() => router.back()} />
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Mood Breakdown
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your mind and body energy over time
          </Text>
        </View>

        <PeriodSwitcher
          selectedPeriod={period}
          onPeriodChange={handlePeriodChange}
        />

        <SeriesToggles
          selectedSeries={selectedSeries}
          onSeriesChange={handleSeriesChange}
        />

        <StatsStrip stats={chartData.stats} />

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.topBarBackground} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading mood data...
            </Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: colors.text }]}>
              {error}
            </Text>
            <TouchableOpacity
              style={[styles.retryButton, { backgroundColor: colors.topBarBackground }]}
              onPress={() => {
                console.log('🔍 INSIGHTS DEBUG: Retry button pressed');
                // Reload data
                setError(null);
                setLoading(true);
              }}
            >
              <Text style={[styles.retryButtonText, { color: colors.background }]}>
                Retry
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {period === 'day' && (
              <DayChart
                data={chartData.hourly}
                selectedSeries={selectedSeries}
              />
            )}
            {period === 'week' && (
              <WeekChart
                data={chartData.weekly}
                selectedSeries={selectedSeries}
              />
            )}
            {period === 'month' && (
              <MonthHeatmap
                data={chartData.monthly}
                onDayPress={(day) => {
                  console.log('🔍 INSIGHTS DEBUG: Day pressed:', day);
                }}
              />
            )}
          </>
        )}
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
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 22,
  },
  controls: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    gap: 16,
  },
  controlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  },
  filterIcon: {
    fontSize: 16,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorContainer: {
    padding: 40,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyEmoji: {
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
