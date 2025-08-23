import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useDerivedUI } from '@/lib/heuristics';
import Chip from './Chip';

export interface AIResultItem {
  title: string;
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  due?: { iso?: string; date?: string; time?: string; tz?: string; when_text?: string };
  reminder?: { iso?: string; lead_minutes?: number };
  start?: { iso?: string; date?: string; time?: string; tz?: string; when_text?: string };
  end?: { iso?: string; date?: string; time?: string; tz?: string; when_text?: string };
  all_day?: boolean;
  location?: string;
  attendees?: string[];
  type?: 'task' | 'todo' | 'event';
  confidence?: number;
}

interface AIResultCardProps {
  item: AIResultItem;
  type: 'TASK' | 'TODO' | 'EVENT';
  onEdit: (item: AIResultItem) => void;
  onQuickUpdate: (item: AIResultItem, field: 'date' | 'time' | 'reminder', value: string) => void;
  onConvertType?: (item: AIResultItem, newType: 'task' | 'todo' | 'event') => void;
  isSelected?: boolean;
  onToggleSelect?: (item: AIResultItem) => void;
}

const AIResultCard = React.memo<AIResultCardProps>(({ 
  item, 
  type, 
  onEdit, 
  onQuickUpdate,
  onConvertType,
  isSelected = false,
  onToggleSelect
}) => {
  const { colors } = useThemeColors();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time'>('date');
  const [showReminderMenu, setShowReminderMenu] = useState(false);

  // Safety check for required props
  if (!item || !item.title) {
    console.warn('AIResultCard: Missing required item or title');
    return null;
  }

  // Use heuristics to derive UI metadata
  const meta = useDerivedUI(item);

  // Ensure todo has today's date if missing
  React.useEffect(() => {
    if (type === 'TODO' && item.due && !item.due.date) {
      // Set today's date for todos without a date
      const today = new Date();
      const isoDate = today.toISOString().split('T')[0];
      onQuickUpdate(item, 'date', isoDate);
    }
  }, [item, type, onQuickUpdate]);

  const getTypeColor = () => {
    switch (type) {
      case 'TASK': return colors.accent; // Purple
      case 'EVENT': return colors.secondary; // Green
      case 'TODO': return colors.link; // Blue
      default: return colors.border;
    }
  };

  const getTypeLabel = () => {
    switch (type) {
      case 'TASK': return 'TASK';
      case 'EVENT': return 'EVENT';
      case 'TODO': return 'TODO';
      default: return 'ITEM';
    }
  };

  // Get time field based on type
  const timeField = type === 'EVENT' ? item.start : item.due;
  const timezone = timeField?.tz || 'Asia/Kolkata';

  // Simplified date/time calculation and formatting
  const { displayDate, displayTime, formattedDate, formattedTime } = React.useMemo(() => {
    let date = null;
    let time = null;
    let formattedDate = null;
    let formattedTime = null;

    // Use timeField data directly - this is our single source of truth
    if (timeField?.date) {
      date = timeField.date;
      formattedDate = timeField.date;
    } else if (timeField?.iso) {
      try {
        const dateObj = new Date(timeField.iso);
        if (!isNaN(dateObj.getTime())) {
          date = dateObj.toLocaleDateString();
          formattedDate = dateObj.toLocaleDateString();
        }
      } catch (e) {
        console.warn('Failed to parse ISO date:', timeField.iso);
      }
    }

    if (timeField?.time) {
      // Prioritize display_time (12-hour format) if available, otherwise use time (24-hour format)
      if (timeField.display_time) {
        time = timeField.display_time;
        formattedTime = timeField.display_time;
      } else {
        time = timeField.time;
        formattedTime = timeField.time;
      }
    } else if (timeField?.iso) {
      try {
        const dateObj = new Date(timeField.iso);
        if (!isNaN(dateObj.getTime())) {
          time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          formattedTime = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        }
      } catch (e) {
        console.warn('Failed to parse ISO time:', timeField.iso);
      }
    }

    // Handle relative time expressions from when_text as fallback
    if (timeField?.when_text && !date) {
      const whenText = timeField.when_text.toLowerCase();
      if (whenText.includes('today')) {
        const today = new Date();
        formattedDate = today.toLocaleDateString();
        date = formattedDate;
      } else if (whenText.includes('tomorrow')) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        formattedDate = tomorrow.toLocaleDateString();
        date = formattedDate;
      } else if (whenText.includes('next')) {
        // Handle "next monday", "next friday", etc.
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        for (let i = 0; i < days.length; i++) {
          if (whenText.includes(days[i])) {
            const today = new Date();
            const targetDay = i;
            const currentDay = today.getDay();
            let daysToAdd = targetDay - currentDay;
            if (daysToAdd <= 0) daysToAdd += 7;
            const nextDate = new Date();
            nextDate.setDate(today.getDate() + daysToAdd);
            formattedDate = nextDate.toLocaleDateString();
            date = formattedDate;
            break;
          }
        }
      }
    }

    console.log('🎯 DEBUG: Date/time calculation for item:', item.title, {
      timeField,
      date,
      time,
      formattedDate,
      formattedTime
    });

    return { displayDate: date, displayTime: time, formattedDate, formattedTime };
  }, [timeField, item.title]);

  const displayReminder = item.reminder?.lead_minutes;

  // Normalize priority for display (convert 'medium' to 'normal')
  const displayPriority = item.priority === 'medium' ? 'normal' : item.priority;

  // Helper functions to get tags (with type compatibility)
  const getCategoryTagSafe = (item: AIResultItem): string | null => {
    if (!item.tags || item.tags.length === 0) return null;
    const categoryTag = item.tags.find(tag => 
      tag === 'Casual' || tag === 'Professional'
    );
    return categoryTag || null;
  };

  const getDomainTagsSafe = (item: AIResultItem): string[] => {
    if (!item.tags || item.tags.length === 0) return [];
    return item.tags.filter(tag => 
      tag !== 'Casual' && tag !== 'Professional'
    );
  };

  const handleDatePress = useCallback(() => {
    console.log('🎯 DEBUG: Date pressed for item:', item.title);
    console.log('🎯 DEBUG: Current showDatePicker state:', showDatePicker);
    console.log('🎯 DEBUG: Current datePickerMode state:', datePickerMode);
    setDatePickerMode('date');
    setShowDatePicker(true);
    console.log('🎯 DEBUG: Set showDatePicker to true, datePickerMode to date');
  }, [item.title, showDatePicker, datePickerMode]);

  const handleTimePress = useCallback(() => {
    console.log('🎯 DEBUG: Time pressed for item:', item.title);
    console.log('🎯 DEBUG: Current showDatePicker state:', showDatePicker);
    console.log('🎯 DEBUG: Current datePickerMode state:', datePickerMode);
    if (meta.allDay) {
      console.log('🎯 DEBUG: Item is all-day, not showing time picker');
      return;
    }
    setDatePickerMode('time');
    setShowDatePicker(true);
    console.log('🎯 DEBUG: Set showDatePicker to true, datePickerMode to time');
  }, [item.title, showDatePicker, datePickerMode, meta.allDay]);

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    console.log('🎯 DEBUG: Date/Time picker changed:', event.type, selectedDate);
    setShowDatePicker(false);
    if (selectedDate && event.type === 'set') {
      if (datePickerMode === 'date') {
        const isoDate = selectedDate.toISOString().split('T')[0];
        console.log('🎯 DEBUG: Updating date to:', isoDate);
        onQuickUpdate(item, 'date', isoDate);
      } else {
        // For time, we need to preserve the existing date and just update the time
        const timeString = selectedDate.toLocaleTimeString([], { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        });
        console.log('🎯 DEBUG: Updating time to:', timeString);
        onQuickUpdate(item, 'time', timeString);
      }
    }
  }, [datePickerMode, item, onQuickUpdate]);

  const handleReminderPress = useCallback(() => {
    setShowReminderMenu(true);
  }, []);

  const handleReminderSelect = useCallback((minutes: number | null) => {
    setShowReminderMenu(false);
    if (minutes === null) {
      // Remove reminder
      if (item.reminder) {
        const updated = { ...item, reminder: { ...item.reminder, lead_minutes: undefined } };
        onQuickUpdate(updated, 'reminder', '');
      }
    } else {
      // Set reminder
      const updated = { 
        ...item, 
        reminder: { ...item.reminder, lead_minutes: minutes } 
      };
      onQuickUpdate(updated, 'reminder', minutes.toString());
    }
  }, [item, onQuickUpdate]);

  const handleConvertType = useCallback((newType: 'task' | 'todo' | 'event') => {
    if (onConvertType) {
      onConvertType(item, newType);
    }
  }, [item, onConvertType]);

  const handleCheckboxPress = useCallback(() => {
    console.log('🎯 DEBUG: Checkbox pressed for item:', item.title);
    if (onToggleSelect) {
      onToggleSelect(item);
    }
  }, [item, onToggleSelect]);

  // Platform-aware date picker component
  const PlatformDatePicker = ({ 
    visible, 
    mode, 
    value, 
    onChange, 
    onClose 
  }: {
    visible: boolean;
    mode: 'date' | 'time' | 'datetime';
    value: Date;
    onChange: (event: any, selectedDate?: Date) => void;
    onClose: () => void;
  }) => {
    if (!visible) return null;

    if (Platform.OS === 'web') {
      // Web: Use HTML input elements
      return (
        <View style={styles.webDatePickerOverlay}>
          <View style={styles.webDatePickerContainer}>
            <Text style={[styles.webDatePickerTitle, { color: colors.text }]}>
              Select {mode === 'date' ? 'Date' : mode === 'time' ? 'Time' : 'Date & Time'}
            </Text>
            
            {mode === 'date' || mode === 'datetime' ? (
              <input
                type="date"
                value={value.toISOString().split('T')[0]}
                onChange={(e) => {
                  const newDate = new Date(e.target.value);
                  newDate.setHours(value.getHours(), value.getMinutes());
                  onChange({ type: 'set' }, newDate);
                  onClose();
                }}
                style={styles.webDateInput}
              />
            ) : null}
            
            {mode === 'time' || mode === 'datetime' ? (
              <input
                type="time"
                value={value.toTimeString().slice(0, 5)}
                onChange={(e) => {
                  const [hours, minutes] = e.target.value.split(':');
                  const newDate = new Date(value);
                  newDate.setHours(parseInt(hours), parseInt(minutes));
                  onChange({ type: 'set' }, newDate);
                  onClose();
                }}
                style={styles.webTimeInput}
              />
            ) : null}
            
            <Pressable style={styles.webDatePickerButton} onPress={onClose}>
              <Text style={[styles.webDatePickerButtonText, { color: colors.background }]}>
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      );
    }

    // Native: Use DateTimePicker
    return (
      <DateTimePicker
        value={value}
        mode={mode}
        display="default"
        onChange={onChange}
      />
    );
  };

  const tempDate = React.useMemo(() => {
    if (datePickerMode === 'date') {
      if (timeField?.iso) {
        return new Date(timeField.iso);
      } else if (displayDate) {
        // Try to parse the date string
        const parsed = new Date(displayDate);
        return isNaN(parsed.getTime()) ? new Date() : parsed;
      }
    } else if (datePickerMode === 'time') {
      if (timeField?.iso) {
        return new Date(timeField.iso);
      } else if (displayTime) {
        // Try to parse the time string
        const [hours, minutes] = displayTime.split(':').map(Number);
        const now = new Date();
        now.setHours(hours || 0, minutes || 0, 0, 0);
        return now;
      }
    }
    return new Date();
  }, [datePickerMode, timeField?.iso, displayDate, displayTime]);

  return (
    <View style={[styles.container, { borderColor: getTypeColor() }]}>
      {/* Header with type and checkbox */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <View style={[styles.typeBadge, { backgroundColor: getTypeColor() }]}>
            <Text style={styles.typeText}>{getTypeLabel()}</Text>
          </View>
        </View>
        
        <View style={styles.headerActions}>
          <Pressable
            style={[styles.checkbox, { borderColor: colors.border }]}
            onPress={handleCheckboxPress}
          >
            {isSelected && (
              <Icon 
                name="check" 
                size={16} 
                color={colors.buttonText || '#FFFFFF'} 
              />
            )}
          </Pressable>
          
          <Pressable
            style={styles.editButton}
            onPress={() => onEdit(item)}
          >
            <Icon name="pencil" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Notes */}
      {item.notes && (
        <Text style={[styles.notes, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.notes}
        </Text>
      )}

      {/* Chips Row */}
      <View style={styles.chipsContainer}>
        {/* Category Chip */}
        {getCategoryTagSafe(item) && (
          <Chip
            icon="tag"
            label={getCategoryTagSafe(item)!}
            variant="default"
            size="small"
          />
        )}

        {/* Domain Tags */}
        {getDomainTagsSafe(item).slice(0, 2).map((tag, index) => (
          <Chip
            key={index}
            icon="tag-outline"
            label={tag}
            variant="default"
            size="small"
            muted
          />
        ))}

        {/* Priority Chip */}
        {displayPriority && displayPriority !== 'normal' && (
          <Chip
            icon="flag"
            label={displayPriority.toUpperCase()}
            variant="priority"
            size="small"
          />
        )}

        {/* Reminder Chip */}
        {displayReminder && (
          <Chip
            icon="bell-outline"
            label={`${displayReminder}m`}
            variant="reminder"
            size="small"
            onPress={handleReminderPress}
          />
        )}

        {/* All Day Chip */}
        {meta.allDay && (
          <Chip
            icon="calendar-blank"
            label="All Day"
            variant="default"
            size="small"
            muted
          />
        )}
      </View>

      {/* Convert Type Menu */}
      {onConvertType && (
        <View style={styles.convertMenu}>
          <Text style={[styles.convertLabel, { color: colors.textSecondary }]}>
            Convert to:
          </Text>
          <View style={styles.convertButtons}>
            {type !== 'TODO' && (
              <Pressable
                style={[styles.convertButton, { borderColor: colors.border }]}
                onPress={() => handleConvertType('todo')}
              >
                <Text style={[styles.convertButtonText, { color: colors.text }]}>To-do</Text>
              </Pressable>
            )}
            {type !== 'TASK' && (
              <Pressable
                style={[styles.convertButton, { borderColor: colors.border }]}
                onPress={() => handleConvertType('task')}
              >
                <Text style={[styles.convertButtonText, { color: colors.text }]}>Task</Text>
              </Pressable>
            )}
            {type !== 'EVENT' && (
              <Pressable
                style={[styles.convertButton, { borderColor: colors.border }]}
                onPress={() => handleConvertType('event')}
              >
                <Text style={[styles.convertButtonText, { color: colors.text }]}>Event</Text>
              </Pressable>
            )}
          </View>
        </View>
      )}

      {/* Time and Date Display - Bottom Right */}
      <View style={styles.timeDateContainer}>
        {/* Date Display */}
        {displayDate ? (
          <Pressable
            style={({ pressed }) => [
              styles.timeDateItem, 
              { 
                borderColor: colors.border,
                backgroundColor: pressed ? colors.border : 'rgba(255, 255, 255, 0.9)',
                opacity: pressed ? 0.8 : 1
              }
            ]}
            onPress={handleDatePress}
          >
            <Icon name="calendar" size={14} color={colors.textSecondary} />
            <Text style={[styles.timeDateText, { color: colors.textSecondary }]}>
              {formattedDate || displayDate}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.timeDateItem, 
              { 
                borderColor: colors.border, 
                opacity: pressed ? 0.8 : 0.6,
                backgroundColor: pressed ? colors.border : 'rgba(255, 255, 255, 0.9)'
              }
            ]}
            onPress={handleDatePress}
          >
            <Icon name="calendar-plus" size={14} color={colors.textSecondary} />
            <Text style={[styles.timeDateText, { color: colors.textSecondary }]}>
              dd-mm-yy
            </Text>
          </Pressable>
        )}
        
        {/* Time Display */}
        {displayTime ? (
          <Pressable
            style={({ pressed }) => [
              styles.timeDateItem, 
              { 
                borderColor: colors.border,
                backgroundColor: pressed ? colors.border : 'rgba(255, 255, 255, 0.9)',
                opacity: pressed ? 0.8 : 1
              }
            ]}
            onPress={handleTimePress}
          >
            <Icon name="clock-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.timeDateText, { color: colors.textSecondary }]}>
              {formattedTime || displayTime}
            </Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.timeDateItem, 
              { 
                borderColor: colors.border, 
                opacity: pressed ? 0.8 : 0.6,
                backgroundColor: pressed ? colors.border : 'rgba(255, 255, 255, 0.9)'
              }
            ]}
            onPress={handleTimePress}
          >
            <Icon name="clock-plus" size={14} color={colors.textSecondary} />
            <Text style={[styles.timeDateText, { color: colors.textSecondary }]}>
              --:--
            </Text>
          </Pressable>
        )}
      </View>

      {/* Reminder Menu */}
      {showReminderMenu && (
        <View style={[styles.reminderMenu, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Text style={[styles.reminderMenuTitle, { color: colors.text }]}>Set Reminder</Text>
          {[5, 10, 15, 30, 60].map((mins) => (
            <Pressable
              key={mins}
              style={styles.reminderOption}
              onPress={() => handleReminderSelect(mins)}
            >
              <Text style={[styles.reminderOptionText, { color: colors.text }]}>
                {mins} minutes before
              </Text>
            </Pressable>
          ))}
          <Pressable
            style={styles.reminderOption}
            onPress={() => handleReminderSelect(null)}
          >
            <Text style={[styles.reminderOptionText, { color: colors.textSecondary }]}>
              No reminder
            </Text>
          </Pressable>
        </View>
      )}

      {/* Date/Time Picker */}
      <PlatformDatePicker
        visible={showDatePicker}
        mode={datePickerMode}
        value={tempDate}
        onChange={handleDateChange}
        onClose={() => setShowDatePicker(false)}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  typeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    minWidth: 24,
    minHeight: 24,
  },
  editButton: {
    padding: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    lineHeight: 22,
  },
  notes: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  convertMenu: {
    marginTop: 8,
  },
  convertLabel: {
    fontSize: 12,
    marginBottom: 8,
  },
  convertButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  convertButton: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderColor: '#E5E7EB',
  },
  convertButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  reminderMenu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    minWidth: 150,
    zIndex: 1000,
  },
  reminderMenuTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  reminderOption: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  reminderOptionText: {
    fontSize: 14,
  },
  timeDateContainer: {
    position: 'absolute',
    bottom: 16,
    right: 16,
    flexDirection: 'row',
    gap: 8,
  },
  timeDateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
  },
  timeDateText: {
    fontSize: 12,
    fontWeight: '500',
  },
  webDatePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  webDatePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    alignItems: 'center',
  },
  webDatePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  webDateInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  webTimeInput: {
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    fontSize: 16,
    marginBottom: 15,
  },
  webDatePickerButton: {
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  webDatePickerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default AIResultCard;
