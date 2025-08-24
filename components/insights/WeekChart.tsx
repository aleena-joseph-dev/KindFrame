import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { WeekdayData, SeriesSelection } from '@/lib/insights/types';
import { getChartColors } from '@/lib/insights/colors';

interface WeekChartProps {
  data: WeekdayData[];
  selectedSeries: SeriesSelection[];
}

const WeekChart: React.FC<WeekChartProps> = ({ data, selectedSeries }) => {
  const { colors } = useThemeColors();
  const chartColors = getChartColors(colors);
  const screenWidth = Dimensions.get('window').width;

  // Add debugging to see what we're receiving
  console.log('🔍 WEEKCHART DEBUG: WeekChart received data:', data);
  console.log('🔍 WEEKCHART DEBUG: WeekChart received selectedSeries:', selectedSeries);
  console.log('🔍 WEEKCHART DEBUG: Screen width:', screenWidth);
  console.log('🔍 WEEKCHART DEBUG: Colors loaded:', colors ? 'Yes' : 'No');

  // Check if we have data
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Weekly Mood Trends
        </Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            📊 No weekly data available
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
            Complete more mood entries to see weekly trends
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>
        Weekly Mood Trends (Test Mode)
      </Text>
      
      <View style={styles.testContainer}>
        <Text style={[styles.testText, { color: colors.text }]}>
          Data received: {data.length} weekdays
        </Text>
        <Text style={[styles.testText, { color: colors.text }]}>
          Selected series: {selectedSeries.join(', ')}
        </Text>
        <Text style={styles.testText, { color: colors.text }}>
          Screen width: {screenWidth}
        </Text>
        <Text style={styles.testText, { color: colors.text }}>
          Colors loaded: {colors ? 'Yes' : 'No'}
        </Text>
        
        {/* Show sample data */}
        <Text style={[styles.testText, { color: colors.text, marginTop: 16 }]}>
          Sample data:
        </Text>
        {data.slice(0, 3).map((day, index) => (
          <Text key={index} style={[styles.testText, { color: colors.textSecondary, fontSize: 12 }]}>
            {day.day}: Mind={day.mind || 'N/A'}, Body={day.body || 'N/A'}
          </Text>
        ))}
      </View>
    </View>
  );
};

export default WeekChart;

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 12,
    marginTop: 8,
  },
  testContainer: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    width: '90%',
    alignItems: 'center',
  },
  testText: {
    fontSize: 14,
    marginBottom: 8,
  },
});
