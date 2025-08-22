/**
 * VU Meter Component for Microphone Input Level Display
 */
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface VUMeterProps {
  level: number; // 0-100
  isActive: boolean;
  style?: any;
}

export function VUMeter({ level, isActive, style }: VUMeterProps) {
  const { colors } = useThemeColors();
  const { getResponsiveSize } = useViewport();

  if (!isActive) {
    return null;
  }

  // Calculate how many bars to show (out of 20)
  const barCount = 20;
  const activeBars = Math.round((level / 100) * barCount);

  return (
    <View style={[styles.container, style]}>
      <Text style={[styles.label, { color: colors.textSecondary, fontSize: getResponsiveSize(10, 11, 12) }]}>
        MIC
      </Text>
      <View style={styles.meterContainer}>
        {Array.from({ length: barCount }, (_, index) => {
          const isActive = index < activeBars;
          let barColor = colors.border;
          
          if (isActive) {
            if (index < barCount * 0.6) {
              barColor = '#22c55e'; // Green for normal levels
            } else if (index < barCount * 0.8) {
              barColor = '#f59e0b'; // Yellow for high levels
            } else {
              barColor = '#ef4444'; // Red for very high levels
            }
          }

          return (
            <View
              key={index}
              style={[
                styles.bar,
                {
                  backgroundColor: barColor,
                  opacity: isActive ? 1 : 0.3,
                }
              ]}
            />
          );
        })}
      </View>
      <Text style={[styles.levelText, { color: colors.textSecondary, fontSize: getResponsiveSize(8, 9, 10) }]}>
        {level || 0}%
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  label: {
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  meterContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 20,
    gap: 1,
  },
  bar: {
    width: 2,
    minHeight: 2,
    maxHeight: 20,
    height: 20,
    borderRadius: 1,
  },
  levelText: {
    marginTop: 2,
    fontWeight: '500',
  },
});
