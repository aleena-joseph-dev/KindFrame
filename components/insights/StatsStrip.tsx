import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MoodStats } from '@/lib/insights/types';

interface StatsStripProps {
  stats: MoodStats;
}

const StatsStrip: React.FC<StatsStripProps> = ({ stats }) => {
  const { colors } = useThemeColors();

  // Add debugging to see what we're receiving
  console.log('🔍 STATS DEBUG: StatsStrip received stats:', stats);
  console.log('🔍 STATS DEBUG: Stats type:', typeof stats);
  console.log('🔍 STATS DEBUG: Stats keys:', stats ? Object.keys(stats) : 'undefined');
  console.log('🔍 STATS DEBUG: Individual values:', {
    avgMind: stats?.avgMind,
    avgBody: stats?.avgBody,
    deltaAvg: stats?.deltaAvg,
    mostVolatileDay: stats?.mostVolatileDay,
    bestDay: stats?.bestDay,
    streakDays: stats?.streakDays,
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const formatNumber = (value: number | null | undefined) => {
    console.log('🔍 STATS DEBUG: formatNumber called with:', value, 'type:', typeof value);
    
    if (value === null || value === undefined) {
      console.log('🔍 STATS DEBUG: Value is null/undefined, returning 0.0');
      return '0.0';
    }
    
    if (isNaN(value)) {
      console.log('🔍 STATS DEBUG: Value is NaN, returning 0.0');
      return '0.0';
    }
    
    if (typeof value !== 'number') {
      console.log('🔍 STATS DEBUG: Value is not a number, returning 0.0');
      return '0.0';
    }
    
    try {
      const result = value.toFixed(1);
      console.log('🔍 STATS DEBUG: Successfully formatted:', value, 'to:', result);
      return result;
    } catch (error) {
      console.error('🔍 STATS ERROR: Failed to format value:', value, 'error:', error);
      return '0.0';
    }
  };

  const statCards = [
    {
      title: 'Avg Mind',
      value: formatNumber(stats.avgMind),
      icon: '🧠',
    },
    {
      title: 'Avg Body',
      value: formatNumber(stats.avgBody),
      icon: '💓',
    },
    {
      title: 'Mind-Body Δ',
      value: formatNumber(stats.deltaAvg),
      icon: '📈',
    },
    {
      title: 'Most Volatile',
      value: formatDate(stats.mostVolatileDay),
      icon: '📊',
    },
    {
      title: 'Best Day',
      value: formatDate(stats.bestDay),
      icon: '📅',
    },
    {
      title: 'Streak',
      value: `${formatNumber(stats.streakDays)} days`,
      icon: '🔥',
    },
  ];

  return (
    <View style={styles.container}>
      {statCards.map((stat, index) => (
        <View
          key={index}
          style={[
            styles.statCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.statHeader}>
            <Text style={styles.statIcon}>{stat.icon}</Text>
            <Text style={[styles.statTitle, { color: colors.textSecondary }]}>
              {stat.title}
            </Text>
          </View>
          <Text style={[styles.statValue, { color: colors.text }]}>
            {stat.value}
          </Text>
        </View>
      ))}
    </View>
  );
};

export default StatsStrip;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  statCard: {
    width: '47%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statIcon: {
    fontSize: 16,
  },
  statTitle: {
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
});
