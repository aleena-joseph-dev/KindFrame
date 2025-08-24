// Pomodoro Settings Modal Component
// Modal for configuring timer, sound, theme, and notification settings

import { useThemeColors } from '@/hooks/useThemeColors';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useEffect, useState, useRef } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export interface PomodoroSettings {
  pomo_min: number;
  short_break_min: number;
  long_break_min: number;
  long_break_interval: number;
  auto_start_breaks: boolean;
  auto_start_pomodoros: boolean;
  hour_format: '12h' | '24h';
  alarm_sound?: string;
  alarm_volume: number;
  tick_sound?: string;
  tick_volume: number;
  dark_mode_when_running: boolean;
  compact_window: boolean;
  reminder_before_min: number;
}

interface SettingsModalProps {
  isVisible: boolean;
  onClose: () => void;
  settings: PomodoroSettings;
  onSettingsChange: (settings: PomodoroSettings) => void;
}

export default function SettingsModal({
  isVisible,
  onClose,
  settings,
  onSettingsChange,
}: SettingsModalProps) {
  const { colors } = useThemeColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [localSettings, setLocalSettings] = useState<PomodoroSettings>(settings);
  const [hasChanges, setHasChanges] = useState(false);

  const snapPoints = React.useMemo(() => ['90%'], []);

  // Handle modal visibility changes
  useEffect(() => {
    if (isVisible) {
      console.log('⚙️ SettingsModal: Presenting modal');
      bottomSheetRef.current?.present();
    } else {
      console.log('⚙️ SettingsModal: Dismissing modal');
      bottomSheetRef.current?.dismiss();
    }
  }, [isVisible]);

  useEffect(() => {
    setLocalSettings(settings);
    setHasChanges(false);
  }, [settings]);

  const handleSettingChange = (key: keyof PomodoroSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = () => {
    onSettingsChange(localSettings);
    setHasChanges(false);
    onClose();
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert(
        'Discard Changes?',
        'You have unsaved changes. Are you sure you want to discard them?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          { text: 'Discard', style: 'destructive', onPress: onClose },
        ]
      );
    } else {
      onClose();
    }
  };

  const renderNumberInput = (
    label: string,
    key: keyof PomodoroSettings,
    min: number,
    max: number,
    unit: string = 'min'
  ) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.numberInputContainer}>
        <TouchableOpacity
          style={[
            styles.numberButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {
            const current = localSettings[key] as number;
            if (current > min) {
              handleSettingChange(key, current - 1);
            }
          }}
        >
          <Text style={[styles.numberButtonText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.numberValue, { color: colors.text }]}>
          {localSettings[key]}{unit}
        </Text>
        <TouchableOpacity
          style={[
            styles.numberButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {
            const current = localSettings[key] as number;
            if (current < max) {
              handleSettingChange(key, current + 1);
            }
          }}
        >
          <Text style={[styles.numberButtonText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderSwitch = (label: string, key: keyof PomodoroSettings) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <Switch
        value={localSettings[key] as boolean}
        onValueChange={(value) => handleSettingChange(key, value)}
        trackColor={{ false: colors.border, true: colors.topBarBackground + '40' }}
        thumbColor={localSettings[key] ? colors.topBarBackground : colors.textSecondary}
      />
    </View>
  );

  const renderDropdown = (
    label: string,
    key: keyof PomodoroSettings,
    options: { value: any; label: string }[]
  ) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.dropdownContainer}>
        {options.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.dropdownOption,
              {
                backgroundColor:
                  localSettings[key] === option.value
                    ? colors.topBarBackground
                    : colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => handleSettingChange(key, option.value)}
          >
            <Text
              style={[
                styles.dropdownOptionText,
                {
                  color:
                    localSettings[key] === option.value
                      ? colors.background
                      : colors.text,
                },
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderSlider = (
    label: string,
    key: keyof PomodoroSettings,
    min: number,
    max: number,
    unit: string = '%'
  ) => (
    <View style={styles.settingRow}>
      <Text style={[styles.settingLabel, { color: colors.text }]}>{label}</Text>
      <View style={styles.sliderContainer}>
        <TouchableOpacity
          style={[
            styles.sliderButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {
            const current = localSettings[key] as number;
            if (current > min) {
              handleSettingChange(key, current - 10);
            }
          }}
        >
          <Text style={[styles.sliderButtonText, { color: colors.text }]}>−</Text>
        </TouchableOpacity>
        <Text style={[styles.sliderValue, { color: colors.text }]}>
          {localSettings[key]}{unit}
        </Text>
        <TouchableOpacity
          style={[
            styles.sliderButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
          onPress={() => {
            const current = localSettings[key] as number;
            if (current < max) {
              handleSettingChange(key, current + 10);
            }
          }}
        >
          <Text style={[styles.sliderButtonText, { color: colors.text }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <BottomSheetModal
      ref={bottomSheetRef}
      index={isVisible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={(index) => {
        if (index === -1) {
          onClose();
        }
      }}
      onDismiss={onClose}
      backgroundStyle={{ backgroundColor: colors.background }}
    >
      <BottomSheetView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Pomodoro Settings</Text>
          <TouchableOpacity onPress={handleCancel} style={styles.closeButton}>
            <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.content} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Timer Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Timer</Text>
            {renderNumberInput('Pomodoro', 'pomo_min', 1, 60)}
            {renderNumberInput('Short Break', 'short_break_min', 1, 30)}
            {renderNumberInput('Long Break', 'long_break_min', 1, 60)}
            {renderNumberInput('Long Break Interval', 'long_break_interval', 1, 10, '')}
            {renderSwitch('Auto-start Breaks', 'auto_start_breaks')}
            {renderSwitch('Auto-start Pomodoros', 'auto_start_pomodoros')}
          </View>

          {/* Sound Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Sound</Text>
            {renderDropdown('Alarm Sound', 'alarm_sound', [
              { value: 'classic', label: 'Classic' },
              { value: 'bell', label: 'Bell' },
              { value: 'kitchen', label: 'Kitchen' },
              { value: 'digital', label: 'Digital' },
            ])}
            {renderSlider('Alarm Volume', 'alarm_volume', 0, 100)}
            {renderDropdown('Tick Sound', 'tick_sound', [
              { value: 'none', label: 'None' },
              { value: 'tick', label: 'Tick' },
              { value: 'click', label: 'Click' },
            ])}
            {renderSlider('Tick Volume', 'tick_volume', 0, 100)}
          </View>

          {/* Theme Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Theme</Text>
            {renderDropdown('Hour Format', 'hour_format', [
              { value: '12h', label: '12-hour' },
              { value: '24h', label: '24-hour' },
            ])}
            {renderSwitch('Dark Mode When Running', 'dark_mode_when_running')}
            {renderSwitch('Compact Window', 'compact_window')}
          </View>

          {/* Notifications Section */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notifications</Text>
            {renderDropdown('Reminder Before', 'reminder_before_min', [
              { value: 0, label: 'None' },
              { value: 5, label: '5 minutes' },
              { value: 10, label: '10 minutes' },
              { value: 15, label: '15 minutes' },
              { value: 30, label: '30 minutes' },
              { value: 60, label: '1 hour' },
            ])}
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={[
              styles.cancelButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
            onPress={handleCancel}
          >
            <Text style={[styles.cancelButtonText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.saveButton,
              {
                backgroundColor: hasChanges ? colors.topBarBackground : colors.border,
              },
            ]}
            onPress={handleSave}
            disabled={!hasChanges}
          >
            <Text
              style={[
                styles.saveButtonText,
                { color: hasChanges ? colors.background : colors.textSecondary },
              ]}
            >
              Save
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingBottom: 20, // Add padding to the bottom of the scrollable content
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  numberButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  numberButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  numberValue: {
    fontSize: 16,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  dropdownContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 60,
    alignItems: 'center',
  },
  dropdownOptionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  sliderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sliderButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sliderButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  sliderValue: {
    fontSize: 14,
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
