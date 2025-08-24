import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { MonthDayData } from '@/lib/insights/types';
import { getMoodLabelColor } from '@/lib/insights/colors';

interface MonthHeatmapProps {
  data: MonthDayData[];
  onDayPress?: (day: MonthDayData) => void;
}

const MonthHeatmap: React.FC<MonthHeatmapProps> = ({ data, onDayPress }) => {
  const { colors } = useThemeColors();
  const screenWidth = Dimensions.get('window').width;
  const cellSize = (screenWidth - 60) / 7; // 7 days per week

  // Group data by week
  const weeks: MonthDayData[][] = [];
  let currentWeek: MonthDayData[] = [];
  
  data.forEach((day, index) => {
    currentWeek.push(day);
    if (currentWeek.length === 7 || index === data.length - 1) {
      weeks.push([...currentWeek]);
      currentWeek = [];
    }
  });

  const getCellColor = (day: MonthDayData) => {
    if (!day.mood_label) return colors.surface;
    return getMoodLabelColor(day.mood_label);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.getDate();
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.chartTitle, { color: colors.text }]}>
        Monthly Mood Overview
      </Text>
      
      {/* Weekday headers */}
      <View style={styles.weekdayHeaders}>
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
          <Text key={day} style={[styles.weekdayHeader, { color: colors.textSecondary }]}>
            {day}
          </Text>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {weeks.map((week, weekIndex) => (
          <View key={weekIndex} style={styles.weekRow}>
            {week.map((day, dayIndex) => (
              <TouchableOpacity
                key={`${weekIndex}-${dayIndex}`}
                style={[
                  styles.calendarCell,
                  {
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getCellColor(day),
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => onDayPress?.(day)}
                disabled={!onDayPress}
              >
                <Text style={[styles.cellText, { color: colors.text }]}>
                  {formatDate(day.date)}
                </Text>
                {day.count > 0 && (
                  <View style={styles.entryIndicator}>
                    <Text style={[styles.entryCount, { color: colors.background }]}>
                      {day.count}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
      
      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: getMoodLabelColor('positive') }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Positive</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: getMoodLabelColor('neutral') }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Neutral</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendSwatch, { backgroundColor: getMoodLabelColor('negative') }]} />
          <Text style={[styles.legendText, { color: colors.text }]}>Negative</Text>
        </View>
      </View>
      
      {data.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No mood entries for this month
          </Text>
        </View>
      )}
    </View>
  );
};

export default MonthHeatmap;

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
  weekdayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayHeader: {
    width: (Dimensions.get('window').width - 60) / 7,
    textAlign: 'center',
    fontSize: 10,
    fontWeight: '500',
  },
  calendarGrid: {
    marginBottom: 16,
  },
  weekRow: {
    flexDirection: 'row',
    marginBottom: 2,
  },
  calendarCell: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2,
    borderRadius: 4,
    position: 'relative',
  },
  cellText: {
    fontSize: 10,
    fontWeight: '500',
  },
  entryIndicator: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
    minWidth: 16,
    alignItems: 'center',
  },
  entryCount: {
    fontSize: 8,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
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
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
