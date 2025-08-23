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
    View
} from 'react-native';
import Modal from 'react-native-modal';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { AIResultItem } from './AIResultCard';

interface EditItemSheetProps {
  isVisible: boolean;
  item: AIResultItem | null;
  type: 'TASK' | 'TODO' | 'EVENT';
  onClose: () => void;
  onSave: (item: AIResultItem) => void;
}

const TAG_SUGGESTIONS = [
  'Shopping', 'Errands', 'Health', 'Fitness', 'Work', 'Study', 
  'Finance', 'Home', 'Family', 'Friends'
];

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
  const [datePickerMode, setDatePickerMode] = useState<'date' | 'time' | 'datetime'>('date');
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      console.log('🎯 DEBUG: EditItemSheet initializing with item:', item);
      // Ensure all fields are properly initialized
      const initializedItem = {
        title: item.title || '',
        notes: item.notes || '',
        tags: item.tags || [],
        priority: item.priority || 'medium',
        due: item.due || null,
        start: item.start || null,
        end: item.end || null,
        reminder: item.reminder || null,
        location: item.location || '',
        attendees: item.attendees || [],
        all_day: item.all_day || false,
        confidence: item.confidence || 0.8,
        type: item.type || 'todo'
      };
      console.log('🎯 DEBUG: EditItemSheet initialized item:', initializedItem);
      setFormData(initializedItem);
      setErrors({});
    }
  }, [item]);

  const updateFormData = useCallback((field: keyof AIResultItem, value: any) => {
    console.log('🎯 DEBUG: updateFormData called with field:', field, 'value:', value);
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  }, [errors]);

  const updateTimeBlock = useCallback((field: 'start' | 'end' | 'due' | 'reminder', value: Date) => {
    console.log('🎯 DEBUG: updateTimeBlock called with field:', field, 'value:', value);
    const iso = value.toISOString();
    
    if (field === 'reminder') {
      setFormData(prev => ({
        ...prev,
        reminder: { ...prev.reminder, iso }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: { 
          ...prev[field], 
          iso, 
          tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
          date: value.toLocaleDateString(),
          time: value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      }));
    }
    
    setShowDatePicker(null);
  }, []);

  const updateTags = useCallback((tagsString: string) => {
    const tags = tagsString.split(',').map(tag => tag.trim()).filter(Boolean);
    updateFormData('tags', tags);
  }, [updateFormData]);

  const toggleTag = useCallback((tag: string) => {
    setFormData(prev => {
      const currentTags = prev.tags || [];
      const newTags = currentTags.includes(tag)
        ? currentTags.filter(t => t !== tag)
        : [...currentTags, tag];
      return { ...prev, tags: newTags };
    });
  }, []);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    // Event-specific validation
    if (type === 'EVENT') {
      if (formData.start?.iso && formData.end?.iso) {
        const startTime = new Date(formData.start.iso);
        const endTime = new Date(formData.end.iso);
        
        if (endTime <= startTime) {
          newErrors.end = 'End time must be after start time';
        }
      }
      
      if (formData.end?.iso && !formData.start?.iso) {
        newErrors.start = 'Start time is required when end time is set';
      }
    }

    // Reminder validation
    if (formData.reminder?.iso) {
      const reminderTime = new Date(formData.reminder.iso);
      const targetTime = formData.due?.iso || formData.start?.iso;
      
      if (targetTime) {
        const target = new Date(targetTime);
        if (reminderTime >= target) {
          newErrors.reminder = 'Reminder must be before the due/start time';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, type]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      Alert.alert('Validation Error', 'Please fix the errors before saving');
      return;
    }

    setIsLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item');
    } finally {
      setIsLoading(false);
    }
  }, [formData, onSave, onClose, validateForm]);

  const renderTagSuggestions = () => (
    <View style={styles.tagSuggestions}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Quick Tags</Text>
      <View style={styles.tagChips}>
        {TAG_SUGGESTIONS.map(tag => (
          <TouchableOpacity
            key={tag}
            style={[
              styles.tagChip,
              { 
                backgroundColor: (formData.tags || []).includes(tag) 
                  ? colors.primary 
                  : colors.border 
              }
            ]}
            onPress={() => toggleTag(tag)}
          >
            <Text style={[
              styles.tagChipText,
              { 
                color: (formData.tags || []).includes(tag) 
                  ? colors.buttonText 
                  : colors.text 
              }
            ]}>
              {tag}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderDateTimeSection = () => {
    if (type === 'EVENT') {
      return (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Event Details</Text>
          
          {/* Start Date */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              console.log('🎯 DEBUG: Start date pressed, current start:', formData.start);
              const startDate = formData.start?.iso ? new Date(formData.start.iso) : new Date();
              console.log('🎯 DEBUG: Setting tempDate to:', startDate);
              setTempDate(startDate);
              setDatePickerMode('date');
              setShowDatePicker('start');
            }}
          >
            <Icon name="calendar" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateRowText, { color: colors.text }]}>
              {formData.start?.date || 'Set start date'}
            </Text>
          </TouchableOpacity>
          
          {/* Start Time */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              console.log('🎯 DEBUG: Start time pressed, current start:', formData.start);
              const startDate = formData.start?.iso ? new Date(formData.start.iso) : new Date();
              console.log('🎯 DEBUG: Setting tempDate to:', startDate);
              setTempDate(startDate);
              setDatePickerMode('time');
              setShowDatePicker('start');
            }}
          >
            <Icon name="clock" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateRowText, { color: colors.text }]}>
              {formData.start?.time || (formData.start?.iso ? new Date(formData.start.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Set start time')}
            </Text>
          </TouchableOpacity>
          
          {/* End Date */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              console.log('🎯 DEBUG: End date pressed, current end:', formData.end);
              const endDate = formData.end?.iso ? new Date(formData.end.iso) : new Date();
              console.log('🎯 DEBUG: Setting tempDate to:', endDate);
              setTempDate(endDate);
              setDatePickerMode('date');
              setShowDatePicker('end');
            }}
          >
            <Icon name="calendar" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateRowText, { color: colors.text }]}>
              {formData.end?.date || 'Set end date'}
            </Text>
          </TouchableOpacity>
          
          {/* End Time */}
          <TouchableOpacity
            style={styles.dateRow}
            onPress={() => {
              console.log('🎯 DEBUG: End time pressed, current end:', formData.end);
              const endDate = formData.end?.iso ? new Date(formData.end.iso) : new Date();
              console.log('🎯 DEBUG: Setting tempDate to:', endDate);
              setTempDate(endDate);
              setDatePickerMode('time');
              setShowDatePicker('end');
            }}
          >
            <Icon name="clock" size={20} color={colors.textSecondary} />
            <Text style={[styles.dateRowText, { color: colors.text }]}>
              {formData.end?.time || (formData.end?.iso ? new Date(formData.end.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Set end time')}
            </Text>
          </TouchableOpacity>
          
          {/* All-day toggle */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => updateFormData('all_day', !formData.all_day)}
          >
            <Icon name="calendar-blank" size={20} color={colors.textSecondary} />
            <Text style={[styles.toggleRowText, { color: colors.text }]}>
              All-day event
            </Text>
            <View style={[
              styles.toggle,
              { backgroundColor: formData.all_day ? colors.primary : colors.border }
            ]}>
              <View style={[
                styles.toggleThumb,
                { 
                  transform: [{ translateX: formData.all_day ? 16 : 0 }],
                  backgroundColor: colors.surface
                }
              ]} />
            </View>
          </TouchableOpacity>
          
          {/* Location */}
          <View style={styles.inputRow}>
            <Icon name="map-marker" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Location (optional)"
              placeholderTextColor={colors.textSecondary}
              value={formData.location || ''}
              onChangeText={(text) => updateFormData('location', text)}
            />
          </View>
          
          {/* Attendees */}
          <View style={styles.inputRow}>
            <Icon name="account-group" size={20} color={colors.textSecondary} />
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Attendees (comma separated)"
              placeholderTextColor={colors.textSecondary}
              value={formData.attendees?.join(', ') || ''}
              onChangeText={(text) => updateFormData('attendees', text.split(',').map(t => t.trim()).filter(Boolean))}
            />
          </View>
        </View>
      );
    }
    
    // Task/Todo section
    return (
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Due Date & Time</Text>
        
        {/* Due Date */}
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => {
            console.log('🎯 DEBUG: Due date pressed, current due:', formData.due);
            const dueDate = formData.due?.iso ? new Date(formData.due.iso) : new Date();
            console.log('🎯 DEBUG: Setting tempDate to:', dueDate);
            setTempDate(dueDate);
            setDatePickerMode('date');
            setShowDatePicker('due');
          }}
        >
          <Icon name="calendar" size={20} color={colors.textSecondary} />
          <Text style={[styles.dateRowText, { color: colors.text }]}>
            {formData.due?.date || 'Set due date'}
          </Text>
        </TouchableOpacity>
        
        {/* Due Time */}
        <TouchableOpacity
          style={styles.dateRow}
          onPress={() => {
            console.log('🎯 DEBUG: Due time pressed, current due:', formData.due);
            const dueDate = formData.due?.iso ? new Date(formData.due.iso) : new Date();
            console.log('🎯 DEBUG: Setting tempDate to:', dueDate);
            setTempDate(dueDate);
            setDatePickerMode('time');
            setShowDatePicker('due');
          }}
        >
          <Icon name="clock" size={20} color={colors.textSecondary} />
          <Text style={[styles.dateRowText, { color: colors.text }]}>
            {formData.due?.time || (formData.due?.iso ? new Date(formData.due.iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Set due time')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderReminderSection = () => (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Reminder</Text>
      
      <TouchableOpacity
        style={styles.dateRow}
        onPress={() => {
          setTempDate(formData.reminder?.iso ? new Date(formData.reminder.iso) : new Date());
          setDatePickerMode('datetime');
          setShowDatePicker('reminder');
        }}
      >
        <Icon name="bell" size={20} color={colors.textSecondary} />
        <Text style={[styles.dateRowText, { color: colors.text }]}>
          {formData.reminder?.iso ? new Date(formData.reminder.iso).toLocaleDateString() : 'Set reminder'}
        </Text>
      </TouchableOpacity>
      
      {errors.reminder && (
        <Text style={[styles.errorText, { color: '#EF4444' }]}>
          {errors.reminder}
        </Text>
      )}
    </View>
  );

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
            
            <TouchableOpacity style={styles.webDatePickerButton} onPress={onClose}>
              <Text style={[styles.webDatePickerButtonText, { color: colors.background }]}>
                Cancel
              </Text>
            </TouchableOpacity>
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

  const handleDateChange = useCallback((event: any, selectedDate?: Date) => {
    if (selectedDate && event.type === 'set') {
      updateTimeBlock(showDatePicker!, selectedDate);
    } else {
      setShowDatePicker(null);
    }
  }, [showDatePicker, updateTimeBlock]);

  return (
    <Modal
      isVisible={isVisible}
      onBackdropPress={onClose}
      onSwipeComplete={onClose}
      swipeDirection="down"
      style={styles.modal}
      propagateSwipe
    >
      <View style={[styles.container, { backgroundColor: colors.surface }]}>
        {/* Handle */}
        <View style={[styles.handle, { backgroundColor: colors.border }]} />
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Edit</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="close" size={24} color={colors.textSecondary} />
          </TouchableOpacity>
        </View>
        
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Title */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Title *</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter title"
              placeholderTextColor={colors.textSecondary}
              value={formData.title}
              onChangeText={(text) => updateFormData('title', text)}
            />
            {errors.title && (
              <Text style={[styles.errorText, { color: '#EF4444' }]}>
                {errors.title}
              </Text>
            )}
          </View>
          
          {/* Notes */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <TextInput
              style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
              placeholder="Add notes (optional)"
              placeholderTextColor={colors.textSecondary}
              value={formData.notes || ''}
              onChangeText={(text) => updateFormData('notes', text)}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>
          
          {/* Tags */}
          {renderTagSuggestions()}
          
          {/* Custom Tags Input */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Custom Tags</Text>
            <TextInput
              style={[styles.textInput, { color: colors.text, borderColor: colors.border }]}
              placeholder="Enter tags separated by commas"
              placeholderTextColor={colors.textSecondary}
              value={(formData.tags || []).join(', ')}
              onChangeText={updateTags}
            />
          </View>
          
          {/* Priority (Task/Todo only) */}
          {(type === 'TASK' || type === 'TODO') && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Priority</Text>
              <View style={styles.priorityRow}>
                {(['low', 'medium', 'high'] as const).map(priority => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      { 
                        backgroundColor: formData.priority === priority ? colors.primary : colors.border,
                        borderColor: colors.border
                      }
                    ]}
                    onPress={() => updateFormData('priority', priority)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { 
                        color: formData.priority === priority ? colors.buttonText : colors.text 
                      }
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
          
          {/* Date & Time Section */}
          {renderDateTimeSection()}
          
          {/* Reminder Section */}
          {renderReminderSection()}
        </ScrollView>
        
        {/* Save Button */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
            disabled={isLoading}
          >
            <Text style={[styles.saveButtonText, { color: colors.buttonText }]}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Date/Time Picker */}
      <PlatformDatePicker
        visible={showDatePicker !== null}
        mode={datePickerMode}
        value={tempDate}
        onChange={handleDateChange}
        onClose={() => setShowDatePicker(null)}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: '60%',
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    position: 'relative',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  closeButton: {
    position: 'absolute',
    right: 20,
    padding: 4,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    minHeight: 80,
  },
  tagSuggestions: {
    marginBottom: 24,
  },
  tagChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagChipText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priorityRow: {
    flexDirection: 'row',
    gap: 8,
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  dateRowText: {
    fontSize: 16,
    flex: 1,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  toggleRowText: {
    fontSize: 16,
    flex: 1,
  },
  toggle: {
    width: 40,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
    gap: 12,
  },
  footer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  saveButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 14,
    marginTop: 4,
    fontStyle: 'italic',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
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
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 5,
    marginBottom: 15,
  },
  webTimeInput: {
    width: '100%',
    padding: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 5,
    marginBottom: 15,
  },
  webDatePickerButton: {
    backgroundColor: '#007BFF',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 5,
  },
  webDatePickerButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default EditItemSheet;
