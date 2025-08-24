import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';
import { Period } from '@/lib/insights/types';

interface PeriodSwitcherProps {
  selectedPeriod: Period;
  onPeriodChange: (period: Period) => void;
}

const PeriodSwitcher: React.FC<PeriodSwitcherProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const { colors } = useThemeColors();

  const periods: Period[] = ['day', 'week', 'month'];

  return (
    <View style={styles.container}>
      {periods.map((period) => (
        <TouchableOpacity
          key={period}
          style={[
            styles.periodButton,
            {
              backgroundColor: selectedPeriod === period ? colors.topBarBackground : colors.surface,
              borderColor: colors.border,
            },
          ]}
          onPress={() => onPeriodChange(period)}
        >
          <Text
            style={[
              styles.periodText,
              {
                color: selectedPeriod === period ? colors.background : colors.text,
                textTransform: 'capitalize',
              },
            ]}
          >
            {period}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default PeriodSwitcher;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    borderRadius: 8,
    padding: 2,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 2,
  },
  periodText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
