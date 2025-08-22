import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import {
    TimeBlock,
    dateFromISO,
    formatDateTime,
    formatReminderTime
} from '@/lib/dateTimeHelpers';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface AIResultItem {
  title: string;
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  due?: TimeBlock;
  reminder?: { iso?: string; lead_minutes?: number };
  start?: TimeBlock;
  end?: TimeBlock;
  all_day?: boolean;
  location?: string;
  attendees?: string[];
}

interface AIResultCardProps {
  item: AIResultItem;
  type: 'TASK' | 'TODO' | 'EVENT';
  confidence: number;
  onEdit: (item: AIResultItem) => void;
  onSave: (item: AIResultItem) => void;
}

const AIResultCard = React.memo<AIResultCardProps>(({ 
  item, 
  type, 
  confidence, 
  onEdit, 
  onSave 
}) => {
  const { colors } = useThemeColors();
  const { getResponsiveSize } = useViewport();

  // Safety check for required props
  if (!item || !item.title) {
    console.warn('AIResultCard: Missing required item or title');
    return null;
  }

  // Debug logging to see what data we're receiving
  console.log('AIResultCard render:', { type, title: item.title, item });

  const getTypeColor = () => {
    switch (type) {
      case 'TASK': return '#BFA7FF';
      case 'EVENT': return '#B7EBC8';
      case 'TODO': return '#A7D0FF';
      default: return colors.border;
    }
  };

  const getPriorityColor = () => {
    switch (item.priority) {
      case 'high': return '#EF4444';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.textSecondary;
    }
  };

  const renderTimeInfo = () => {
    if (type === 'EVENT') {
      if (item.all_day && item.start) {
        const dateStr = dateFromISO(item.start.iso);
        if (!dateStr) return null;
        
        return (
          <View style={styles.timeRow}>
            <Icon name="calendar-blank" size={16} color={colors.textSecondary} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              All-day · {dateStr}
            </Text>
          </View>
        );
      }
      
      if (item.start) {
        const timeStr = formatDateTime(item.start);
        const endStr = item.end ? formatDateTime(item.end) : '';
        
        if (!timeStr) return null;
        
        return (
          <View style={styles.timeRow}>
            <Icon name="clock-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {timeStr}
            </Text>
            {endStr && (
              <Text style={[styles.timeText, { color: colors.textSecondary }]}>
                {` - ${endStr}`}
              </Text>
            )}
          </View>
        );
      }
      
      return (
        <View style={styles.timeRow}>
          <Icon name="clock-outline" size={16} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={[styles.timeText, { color: colors.textSecondary, opacity: 0.5 }]}>
            Time?
          </Text>
        </View>
      );
    }
    
    if (type === 'TASK' || type === 'TODO') {
      if (item.due) {
        const dueStr = formatDateTime(item.due);
        if (!dueStr) return null;
        
        return (
          <View style={styles.timeRow}>
            <Icon name="calendar-blank" size={16} color={colors.textSecondary} />
            <Text style={[styles.timeText, { color: colors.textSecondary }]}>
              {dueStr}
            </Text>
          </View>
        );
      }
      
      return (
        <View style={styles.timeRow}>
          <Icon name="calendar-blank" size={16} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={[styles.timeText, { color: colors.textSecondary, opacity: 0.5 }]}>
            Date?
          </Text>
        </View>
      );
    }
    
    return null;
  };

  const renderReminderInfo = () => {
    if (type === 'TASK' && item.reminder?.iso) {
      const reminderText = formatReminderTime(item.reminder.iso, item.reminder.lead_minutes);
      if (!reminderText) return null;
      
      return (
        <View style={styles.timeRow}>
          <Icon name="bell-outline" size={16} color={colors.primary} />
          <Text style={[styles.timeText, { color: colors.primary }]}>
            {reminderText}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderLocationInfo = () => {
    if (type === 'EVENT' && item.location) {
      if (!item.location.trim()) return null;
      
      return (
        <View style={styles.timeRow}>
          <Icon name="map-marker-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.timeText, { color: colors.textSecondary }]}>
            {item.location}
          </Text>
        </View>
      );
    }
    return null;
  };

  const renderMissingFields = () => {
    const missing = [];
    
    if (type === 'EVENT' && !item.start) {
      missing.push('Start time');
    }
    if (type === 'EVENT' && !item.end) {
      missing.push('End time');
    }
    if (type === 'TASK' && !item.due) {
      missing.push('Due date');
    }
    if (type === 'EVENT' && !item.location) {
      missing.push('Location');
    }
    
    if (missing.length > 0) {
      return (
        <View style={styles.missingFields}>
          {missing.map((field, index) => (
            <View key={index} style={[styles.missingChip, { backgroundColor: colors.border }]}>
              <Text style={[styles.missingChipText, { color: colors.textSecondary }]}>
                {field}?
              </Text>
            </View>
          ))}
        </View>
      );
    }
    
    return null;
  };

  return (
    <View style={[styles.card, { borderLeftColor: getTypeColor() }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.typeContainer}>
          <View style={[styles.typeChip, { backgroundColor: getTypeColor() }]}>
            <Text style={[styles.typeText, { color: '#000' }]}>
              {type}
            </Text>
          </View>
          <Text style={[styles.confidenceText, { color: colors.textSecondary }]}>
            {confidence}% confidence
          </Text>
        </View>
        
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(item)}
          accessibilityRole="button"
          accessibilityLabel="Edit item"
        >
          <Icon name="pencil" size={18} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Title */}
      <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
        {item.title}
      </Text>

      {/* Time Information */}
      {renderTimeInfo()}
      {renderReminderInfo()}
      {renderLocationInfo()}

      {/* Missing Fields */}
      {renderMissingFields()}

      {/* Tags */}
      {item.tags && item.tags.length > 0 && (
        <View style={styles.tagsContainer}>
          {item.tags
            .filter(tag => tag && tag.trim().length > 0)
            .map((tag, index) => (
              <View key={index} style={[styles.tagChip, { backgroundColor: colors.border }]}>
                <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                  {tag.trim()}
                </Text>
              </View>
            ))}
        </View>
      )}

      {/* Priority */}
      {item.priority && item.priority !== 'medium' && ['low', 'medium', 'high'].includes(item.priority) && (
        <View style={styles.priorityContainer}>
          <View style={[styles.priorityChip, { backgroundColor: getPriorityColor() }]}>
            <Text style={[styles.priorityText, { color: '#FFF' }]}>
              {item.priority.toUpperCase()}
            </Text>
          </View>
        </View>
      )}

      {/* Notes Preview */}
      {item.notes && item.notes.trim().length > 0 && (
        <Text style={[styles.notesPreview, { color: colors.textSecondary }]} numberOfLines={2}>
          {item.notes.trim()}
        </Text>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  typeContainer: {
    flex: 1,
  },
  typeChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 22,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  missingFields: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  missingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  missingChipText: {
    fontSize: 12,
    fontWeight: '500',
    opacity: 0.7,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityContainer: {
    marginBottom: 12,
  },
  priorityChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  notesPreview: {
    fontSize: 14,
    lineHeight: 20,
    fontStyle: 'italic',
  },
});

AIResultCard.displayName = 'AIResultCard';

export default AIResultCard;
