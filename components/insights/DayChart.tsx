import { useThemeColors } from '@/hooks/useThemeColors';
import { getChartColors } from '@/lib/insights/colors';
import { HourlyData, SeriesSelection } from '@/lib/insights/types';
import React from 'react';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

interface DayChartProps {
  data: HourlyData[];
  selectedSeries: SeriesSelection[];
}

const DayChart: React.FC<DayChartProps> = ({ data, selectedSeries }) => {
  console.log('🔍 DAYCHART DEBUG: Component rendered');
  console.log('🔍 DAYCHART DEBUG: Props received:', { data, selectedSeries });
  console.log('🔍 DAYCHART DEBUG: Data type:', typeof data);
  console.log('🔍 DAYCHART DEBUG: Data length:', data?.length);
  console.log('🔍 DAYCHART DEBUG: Selected series type:', typeof selectedSeries);
  console.log('🔍 DAYCHART DEBUG: Selected series:', selectedSeries);
  
  const { colors } = useThemeColors();
  console.log('🔍 DAYCHART DEBUG: Colors hook result:', colors);
  
  const chartColors = getChartColors(colors);
  console.log('🔍 DAYCHART DEBUG: Chart colors:', chartColors);
  
  const screenWidth = Dimensions.get('window').width;
  console.log('🔍 DAYCHART DEBUG: Screen width:', screenWidth);

  // Custom theme for Victory charts
  const customTheme = {
    axis: {
      style: {
        axis: { stroke: chartColors.axis },
        tickLabels: { fill: chartColors.axis, fontSize: 10 },
        grid: { stroke: chartColors.grid, strokeDasharray: '5,5' },
      },
    },
  };
  console.log('🔍 DAYCHART DEBUG: Custom theme:', customTheme);

  // Prepare data for Victory charts
  const chartData = data.map(hour => ({
    hour: hour.hour,
    mind: hour.mind,
    body: hour.body,
    x: hour.hour,
    y: 0, // Will be set per series
  }));
  console.log('🔍 DAYCHART DEBUG: Prepared chart data:', chartData);

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  const shouldShowMind = selectedSeries.includes('mind') || selectedSeries.includes('both');
  const shouldShowBody = selectedSeries.includes('body') || selectedSeries.includes('both');
  console.log('🔍 DAYCHART DEBUG: Should show mind:', shouldShowMind);
  console.log('🔍 DAYCHART DEBUG: Should show body:', shouldShowBody);

  console.log('🔍 DAYCHART DEBUG: About to render JSX');
  
  try {
    // TEMPORARY: Simple text display instead of Victory chart
    return (
      <View style={styles.container}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Hourly Mood Trends (Test Mode)
        </Text>
        
        <View style={styles.testContainer}>
          <Text style={[styles.testText, { color: colors.text }]}>
            Data received: {data.length} entries
          </Text>
          <Text style={[styles.testText, { color: colors.text }]}>
            Selected series: {selectedSeries.join(', ')}
          </Text>
          <Text style={[styles.testText, { color: colors.text }]}>
            Screen width: {screenWidth}
          </Text>
          <Text style={[styles.testText, { color: colors.text }]}>
            Colors loaded: {colors ? 'Yes' : 'No'}
          </Text>
        </View>
        
        {data.length === 0 && (
          <View style={styles.emptyState}>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No mood entries for today
            </Text>
          </View>
        )}
      </View>
    );
  } catch (error) {
    console.error('🔍 DAYCHART ERROR: Failed to render:', error);
    return (
      <View style={styles.container}>
        <Text style={[styles.chartTitle, { color: colors.text }]}>
          Error rendering chart
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          {error instanceof Error ? error.message : 'Unknown error'}
        </Text>
      </View>
    );
  }
};

export default DayChart;

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
  testContainer: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 10,
    marginBottom: 20,
  },
  testText: {
    fontSize: 14,
    marginBottom: 5,
  },
});
