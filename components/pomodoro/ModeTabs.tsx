// Pomodoro Mode Tabs Component
// Pill segmented control for switching between timer modes

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ModeTabsProps {
  currentMode: 'focus' | 'short_break' | 'long_break';
  onModeChange: (mode: 'focus' | 'short_break' | 'long_break') => void;
}

export default function ModeTabs({ currentMode, onModeChange }: ModeTabsProps) {
  const { colors } = useThemeColors();

  const modes = [
    { key: 'focus', label: 'Pomodoro' },
    { key: 'short_break', label: 'Short Break' },
    { key: 'long_break', label: 'Long Break' },
  ] as const;

  return (
    <View style={styles.container}>
      <View style={[styles.tabsContainer, { backgroundColor: colors.surface }]}>
        {modes.map((mode) => {
          const isActive = currentMode === mode.key;
          return (
            <TouchableOpacity
              key={mode.key}
              style={[
                styles.tab,
                isActive && [
                  styles.activeTab,
                  { backgroundColor: colors.topBarBackground },
                ],
              ]}
              onPress={() => {
                console.log('Mode tab pressed:', mode.key);
                onModeChange(mode.key);
              }}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? colors.background : colors.textSecondary,
                  },
                ]}
              >
                {mode.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  tabsContainer: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});
