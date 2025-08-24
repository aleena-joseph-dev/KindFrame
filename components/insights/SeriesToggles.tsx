import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { SeriesSelection } from '@/lib/insights/types';

interface SeriesTogglesProps {
  selectedSeries: SeriesSelection[];
  onSeriesChange: (series: SeriesSelection[]) => void;
}

const SeriesToggles: React.FC<SeriesTogglesProps> = ({ selectedSeries, onSeriesChange }) => {
  const { colors } = useThemeColors();

  const series: SeriesSelection[] = ['mind', 'body', 'both'];

  const handleSeriesToggle = (series: SeriesSelection) => {
    if (series === 'both') {
      // If "both" is selected, select both mind and body
      onSeriesChange(['mind', 'body']);
    } else {
      let newSelection: SeriesSelection[];
      if (selectedSeries.includes(series)) {
        // Remove the series
        newSelection = selectedSeries.filter(s => s !== series);
        // If removing mind or body and "both" was implied, remove "both"
        if (newSelection.length === 1 && newSelection[0] !== 'both') {
          newSelection = [newSelection[0]];
        }
      } else {
        // Add the series
        newSelection = [...selectedSeries.filter(s => s !== 'both'), series];
        // If both mind and body are selected, show as "both"
        if (newSelection.includes('mind') && newSelection.includes('body')) {
          newSelection = ['both'];
        }
      }
      onSeriesChange(newSelection);
    }
  };

  const isSelected = (series: SeriesSelection) => {
    if (series === 'both') {
      return selectedSeries.includes('both') || 
             (selectedSeries.includes('mind') && selectedSeries.includes('body'));
    }
    return selectedSeries.includes(series);
  };

  return (
    <View style={styles.container}>
      {series.map((s) => (
        <TouchableOpacity
          key={s}
          style={[
            styles.seriesButton,
            {
              backgroundColor: isSelected(s) ? colors.topBarBackground : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => handleSeriesToggle(s)}
        >
          <Text
            style={[
              styles.seriesText,
              {
                color: isSelected(s) ? colors.background : colors.text,
                textTransform: 'capitalize',
              },
            ]}
          >
            {s}
          </Text>
        </TouchableOpacity>
      ))}
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.topBarBackground }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Mind</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: colors.secondary }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Body</Text>
        </View>
      </View>
    </View>
  );
};

export default SeriesToggles;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  seriesButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  seriesText: {
    fontSize: 12,
    fontWeight: '500',
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginLeft: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendSwatch: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '400',
  },
});
