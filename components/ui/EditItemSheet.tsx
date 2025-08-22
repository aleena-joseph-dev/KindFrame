import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import {
    formatDateTime, TimeBlock, validateEventTimes,
    validateReminderTime
} from '@/lib/dateTimeHelpers';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import Modal from 'react-native-modal';
import { AIResultItem } from './AIResultCard';

interface EditItemSheetProps {
  isVisible: boolean;
  item: AIResultItem | null;
  type: 'TASK' | 'TODO' | 'EVENT';
  onClose: () => void;
  onSave: (item: AIResultItem) => void;
}

const EditItemSheet: React.FC<EditItemSheetProps> = ({
  isVisible,
  item,
  type,
  onClose,
  onSave,
}) => {
  const { colors } = useThemeColors();
  const { getResponsiveSize } = useViewport();
  
  const [formData, setFormData] = useState<AIResultItem>({
    title: '',
    notes: '',
    tags: [],
    priority: 'medium',
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showDatePicker, setShowDatePicker] = useState<'start' | 'end' | 'due' | 'reminder' | null>(null);
  const [tempDate, setTempDate] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({ ...item });
      setErrors({});
    }
  }, [item]);

  const updateFormData = useCallback((field: keyof AIResultItem, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const updateTimeBlock = useCallback((field: 'start' | 'end' | 'due' | 'reminder', value: Date) => {
    const iso = value.toISOString();
    
    if (field === 'reminder') {
      setFormData(prev => ({
        ...prev,
        reminder: { ...prev.reminder, iso }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: { iso, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }
      }));
    }
    
    setShowDatePicker(null);
  }, []);

  const updateTags = useCallback((tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
    updateFormData('tags', tags);
  }, [updateFormData]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Event-specific validation
    if (type === 'EVENT') {
      if (formData.start?.iso && formData.end?.iso) {
        const timeError = validateEventTimes(formData.start, formData.end);
        if (timeError) {
          newErrors.end = timeError;
        }
      }
    }

    // Task reminder validation
    if (type === 'TASK' && formData.reminder?.iso && formData.due?.iso) {
      const reminderError = validateReminderTime(formData.reminder.iso, formData.due.iso);
      if (reminderError) {
        newErrors.reminder = reminderError;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, type]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, onSave, onClose]);

  const renderDatePicker = () => {
    if (!showDatePicker) return null;

    return (
      <DateTimePicker
        value={tempDate}
        mode="datetime"
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(event, selectedDate) => {
          if (selectedDate) {
            setTempDate(selectedDate);
          }
          if (Platform.OS === 'android') {
            setShowDatePicker(null);
            if (selectedDate) {
              updateTimeBlock(showDatePicker, selectedDate);
            }
          }
        }}
      />
    );
  };

  const renderTimeField = (field: 'start' | 'end' | 'due', label: string) => {
    const timeBlock = formData[field] as TimeBlock;
    const hasValue = timeBlock?.iso;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>{label}</Text>
        <TouchableOpacity
          style={[styles.timeButton, { 
            backgroundColor: hasValue ? colors.primary : colors.border,
            borderColor: hasValue ? colors.primary : colors.border 
          }]}
          onPress={() => {
            if (hasValue) {
              setTempDate(new Date(timeBlock.iso!));
            }
            setShowDatePicker(field);
          }}
        >
          <Icon 
            name="calendar" 
            size={16} 
            color={hasValue ? '#FFF' : colors.textSecondary} 
          />
          <Text style={[styles.timeButtonText, { 
            color: hasValue ? '#FFF' : colors.textSecondary 
          }]}>
            {hasValue ? formatDateTime(timeBlock) : `Set ${label.toLowerCase()}`}
          </Text>
        </TouchableOpacity>
        {errors[field] && (
          <Text style={[styles.errorText, { color: '#EF4444' }]}>
            {errors[field]}
          </Text>
        )}
      </View>
    );
  };

  const renderReminderField = () => {
    if (type !== 'TASK') return null;
    
    const hasReminder = formData.reminder?.iso;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Reminder</Text>
        <TouchableOpacity
          style={[styles.timeButton, { 
            backgroundColor: hasReminder ? colors.primary : colors.border,
            borderColor: hasReminder ? colors.primary : colors.border 
          }]}
          onPress={() => {
            if (hasReminder) {
              setTempDate(new Date(formData.reminder!.iso!));
            }
            setShowDatePicker('reminder');
          }}
        >
          <Icon 
            name="bell" 
            size={16} 
            color={hasReminder ? '#FFF' : colors.textSecondary} 
          />
          <Text style={[styles.timeButtonText, { 
            color: hasReminder ? '#FFF' : colors.textSecondary 
          }]}>
            {hasReminder ? formatDateTime(formData.reminder) : 'Set reminder'}
          </Text>
        </TouchableOpacity>
        {errors.reminder && (
          <Text style={[styles.errorText, { color: '#EF4444' }]}>
            {errors.reminder}
          </Text>
        )}
      </View>
    );
  };

  const renderPriorityField = () => {
    const priorities = ['low', 'medium', 'high'] as const;
    
    return (
      <View style={styles.fieldContainer}>
        <Text style={[styles.fieldLabel, { color: colors.text }]}>Priority</Text>
        <View style={styles.priorityContainer}>
          {priorities.map((priority) => (
            <TouchableOpacity
              key={priority}
              style={[
                styles.priorityButton,
                {
                  backgroundColor: formData.priority === priority ? colors.primary : colors.border,
                  borderColor: formData.priority === priority ? colors.primary : colors.border,
                },
              ]}
              onPress={() => updateFormData('priority', priority)}
            >
              <Text
                style={[
                  styles.priorityButtonText,
                  {
                    color: formData.priority === priority ? '#FFF' : colors.textSecondary,
                  },
                ]}
              >
                {priority.charAt(0).toUpperCase() + priority.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  if (!item) return null;

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      propagateSwipe
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>
            Edit {type}
          </Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: errors.title ? '#EF4444' : colors.border,
                },
              ]}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
              placeholder="Enter title"
              placeholderTextColor={colors.textSecondary}
            />
            {errors.title && (
              <Text style={[styles.errorText, { color: '#EF4444' }]}>
                {errors.title}
              </Text>
            )}
          </View>

          {/* Notes */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[
                styles.textArea,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={formData.notes}
              onChangeText={(text) => updateFormData('notes', text)}
              placeholder="Add notes..."
              placeholderTextColor={colors.textSecondary}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* Tags */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.text }]}>Tags</Text>
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor: colors.surface,
                  color: colors.text,
                  borderColor: colors.border,
                },
              ]}
              value={formData.tags?.join(', ') || ''}
              onChangeText={updateTags}
              placeholder="Enter tags separated by commas"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* Priority */}
          {renderPriorityField()}

          {/* Time Fields */}
          {type === 'EVENT' && (
            <>
              {renderTimeField('start', 'Start Time')}
              {renderTimeField('end', 'End Time')}
            </>
          )}

          {(type === 'TASK' || type === 'TODO') && (
            renderTimeField('due', 'Due Date')
          )}

          {/* Reminder */}
          {renderReminderField()}

          {/* Location */}
          {type === 'EVENT' && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Location</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.location}
                onChangeText={(text) => updateFormData('location', text)}
                placeholder="Enter location"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}

          {/* Attendees */}
          {type === 'EVENT' && (
            <View style={styles.fieldContainer}>
              <Text style={[styles.fieldLabel, { color: colors.text }]}>Attendees</Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.surface,
                    color: colors.text,
                    borderColor: colors.border,
                  },
                ]}
                value={formData.attendees?.join(', ') || ''}
                onChangeText={(text) => {
                  const attendees = text.split(',').map(email => email.trim()).filter(Boolean);
                  updateFormData('attendees', attendees);
                }}
                placeholder="Enter email addresses separated by commas"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          )}
        </ScrollView>

        {/* Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.button, styles.cancelButton, { borderColor: colors.border }]}
            onPress={onClose}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: colors.text }]}>Cancel</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button,
              styles.saveButton,
              { backgroundColor: colors.primary },
              isLoading && { opacity: 0.6 }
            ]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={[styles.buttonText, { color: '#FFF' }]}>
              {isLoading ? 'Saving...' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Date Picker */}
        {renderDatePicker()}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'flex-end',
    margin: 0,
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    padding: 4,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  priorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  cancelButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  saveButton: {
    borderWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditItemSheet;
