import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD format
  time?: string; // HH:MM format
  type: 'task' | 'goal' | 'reminder' | 'event';
  completed?: boolean;
  createdAt: Date;
}

interface DayData {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  events: CalendarEvent[];
}

export default function CalendarScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [newEventTitle, setNewEventTitle] = useState('');
  const [newEventDescription, setNewEventDescription] = useState('');
  const [newEventDate, setNewEventDate] = useState('');
  const [newEventTime, setNewEventTime] = useState('');
  const [newEventType, setNewEventType] = useState<'task' | 'goal' | 'reminder' | 'event'>('event');

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('calendar');
  }, [addToStack]);

  useEffect(() => {
    loadEvents();
  }, []);

  useEffect(() => {
    const today = new Date();
    const todayString = formatDateForStorage(today);
    setSelectedDate(todayString);
  }, []);

  const loadEvents = async () => {
    try {
      const savedEvents = await AsyncStorage.getItem('calendar_events');
      if (savedEvents) {
        setEvents(JSON.parse(savedEvents));
      }
    } catch (error) {
      console.error('Error loading events:', error);
    }
  };

  const saveEvents = async (updatedEvents: CalendarEvent[]) => {
    try {
      await AsyncStorage.setItem('calendar_events', JSON.stringify(updatedEvents));
    } catch (error) {
      console.error('Error saving events:', error);
    }
  };

  const formatDateForStorage = (date: Date): string => {
    return date.toISOString().split('T')[0];
  };

  const formatDateForDisplay = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getDaysInMonth = (date: Date): DayData[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const endDate = new Date(lastDay);
    endDate.setDate(endDate.getDate() + (6 - lastDay.getDay()));
    
    const days: DayData[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dateString = formatDateForStorage(currentDate);
      const dayEvents = events.filter(event => event.date === dateString);
      
      days.push({
        date: dateString,
        dayNumber: currentDate.getDate(),
        isCurrentMonth: currentDate.getMonth() === month,
        isToday: dateString === formatDateForStorage(new Date()),
        events: dayEvents,
      });
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return days;
  };

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleAddEvent = () => {
    if (!newEventTitle.trim() || !newEventDate) {
      Alert.alert('Missing Information', 'Please enter a title and select a date.');
      return;
    }

    const newEvent: CalendarEvent = {
      id: Date.now().toString(),
      title: newEventTitle.trim(),
      description: newEventDescription.trim() || undefined,
      date: newEventDate,
      time: newEventTime || undefined,
      type: newEventType,
      completed: false,
      createdAt: new Date(),
    };

    const updatedEvents = [...events, newEvent];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    
    setNewEventTitle('');
    setNewEventDescription('');
    setNewEventDate('');
    setNewEventTime('');
    setNewEventType('event');
    setShowAddEvent(false);
  };

  const handleToggleEvent = (eventId: string) => {
    const updatedEvents = events.map(event =>
      event.id === eventId ? { ...event, completed: !event.completed } : event
    );
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  };

  const handleDeleteEvent = (eventId: string) => {
    Alert.alert(
      'Delete Event',
      'Are you sure you want to delete this event?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedEvents = events.filter(event => event.id !== eventId);
            setEvents(updatedEvents);
            saveEvents(updatedEvents);
          },
        },
      ]
    );
  };

  const handlePreviousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'task': return '#ff6b6b';
      case 'goal': return '#4ecdc4';
      case 'reminder': return '#ffa502';
      case 'event': return '#45b7d1';
      default: return colors.text;
    }
  };

  const getSelectedDateEvents = () => {
    return events.filter(event => event.date === selectedDate);
  };

  const days = getDaysInMonth(currentDate);
  const selectedDateEvents = getSelectedDateEvents();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Calendar" onBack={() => handleBack()} showSettings={true} />

      {/* Month Navigation */}
      <View style={styles.monthContainer}>
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border }]}
          onPress={handlePreviousMonth}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>‹</Text>
        </TouchableOpacity>
        
        <Text style={[styles.monthText, { color: colors.text }]}>
          {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>
        
        <TouchableOpacity
          style={[styles.navButton, { borderColor: colors.border }]}
          onPress={handleNextMonth}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Calendar Grid */}
      <View style={styles.calendarContainer}>
        {/* Day Headers */}
        <View style={styles.dayHeaders}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <Text key={day} style={[styles.dayHeader, { color: colors.textSecondary }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Calendar Days */}
        <View style={styles.daysGrid}>
          {days.map((day) => (
            <TouchableOpacity
              key={day.date}
              style={[
                styles.dayCell,
                { 
                  backgroundColor: day.date === selectedDate ? colors.buttonBackground : 'transparent',
                  borderColor: colors.border 
                }
              ]}
              onPress={() => handleDateSelect(day.date)}
            >
              <Text style={[
                styles.dayNumber,
                { 
                  color: day.date === selectedDate ? colors.buttonText : 
                         day.isToday ? '#ff6b6b' :
                         day.isCurrentMonth ? colors.text : colors.textSecondary 
                }
              ]}>
                {day.dayNumber}
              </Text>
              
              {/* Event Indicators */}
              {day.events.length > 0 && (
                <View style={styles.eventIndicators}>
                  {day.events.slice(0, 3).map((event, index) => (
                    <View
                      key={event.id}
                      style={[
                        styles.eventIndicator,
                        { backgroundColor: getEventTypeColor(event.type) }
                      ]}
                    />
                  ))}
                  {day.events.length > 3 && (
                    <Text style={[styles.moreEvents, { color: colors.textSecondary }]}>
                      +{day.events.length - 3}
                    </Text>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Selected Date Events */}
      {selectedDate && (
        <View style={[styles.eventsContainer, { backgroundColor: colors.surface }]}>
          <View style={styles.eventsHeader}>
            <Text style={[styles.eventsTitle, { color: colors.text }]}>
              {formatDateForDisplay(selectedDate)}
            </Text>
            <TouchableOpacity
              style={[styles.addEventButton, { backgroundColor: colors.buttonBackground }]}
              onPress={() => setShowAddEvent(true)}
            >
              <Text style={[styles.addEventButtonText, { color: colors.buttonText }]}>+</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.eventsList} showsVerticalScrollIndicator={false}>
            {selectedDateEvents.length === 0 ? (
              <Text style={[styles.noEventsText, { color: colors.textSecondary }]}>
                No events for this date
              </Text>
            ) : (
              selectedDateEvents.map((event) => (
                <View
                  key={event.id}
                  style={[styles.eventItem, { 
                    backgroundColor: colors.cardBackground,
                    borderColor: colors.border 
                  }]}
                >
                  <View style={styles.eventHeader}>
                    <View style={[styles.eventTypeIndicator, { backgroundColor: getEventTypeColor(event.type) }]} />
                    <Text style={[styles.eventTitle, { color: colors.text }]}>
                      {event.title}
                    </Text>
                    <TouchableOpacity
                      style={styles.deleteEventButton}
                      onPress={() => handleDeleteEvent(event.id)}
                    >
                      <Text style={[styles.deleteEventButtonText, { color: colors.textSecondary }]}>×</Text>
                    </TouchableOpacity>
                  </View>
                  
                  {event.description && (
                    <Text style={[styles.eventDescription, { color: colors.textSecondary }]}>
                      {event.description}
                    </Text>
                  )}
                  
                  {event.time && (
                    <Text style={[styles.eventTime, { color: colors.textSecondary }]}>
                      {event.time}
                    </Text>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.completeButton, { 
                      backgroundColor: event.completed ? '#2ed573' : colors.buttonBackground 
                    }]}
                    onPress={() => handleToggleEvent(event.id)}
                  >
                    <Text style={[styles.completeButtonText, { color: colors.buttonText }]}>
                      {event.completed ? 'Completed' : 'Mark Complete'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </ScrollView>
        </View>
      )}

      {/* Add Event Modal */}
      {showAddEvent && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Event</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Event title"
              placeholderTextColor={colors.textSecondary}
              value={newEventTitle}
              onChangeText={setNewEventTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newEventDescription}
              onChangeText={setNewEventDescription}
              multiline
              numberOfLines={3}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Date (YYYY-MM-DD)"
              placeholderTextColor={colors.textSecondary}
              value={newEventDate}
              onChangeText={setNewEventDate}
            />
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Time (HH:MM) - optional"
              placeholderTextColor={colors.textSecondary}
              value={newEventTime}
              onChangeText={setNewEventTime}
            />
            
            <View style={styles.typeContainer}>
              <Text style={[styles.typeLabel, { color: colors.text }]}>Type:</Text>
              <View style={styles.typeButtons}>
                {(['task', 'goal', 'reminder', 'event'] as const).map((type) => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeButton,
                      { 
                        backgroundColor: newEventType === type ? getEventTypeColor(type) : colors.cardBackground,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setNewEventType(type)}
                  >
                    <Text style={[
                      styles.typeButtonText,
                      { color: newEventType === type ? '#fff' : colors.text }
                    ]}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddEvent(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addEventButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddEvent}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Add Event</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  monthContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  monthText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  calendarContainer: {
    paddingHorizontal: 20,
  },
  dayHeaders: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayHeader: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 8,
  },
  daysGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  dayNumber: {
    fontSize: 16,
    fontWeight: '500',
  },
  eventIndicators: {
    flexDirection: 'row',
    marginTop: 2,
  },
  eventIndicator: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginHorizontal: 1,
  },
  moreEvents: {
    fontSize: 10,
    marginLeft: 2,
  },
  eventsContainer: {
    flex: 1,
    margin: 20,
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  eventsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  addEventButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addEventButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventsList: {
    flex: 1,
  },
  noEventsText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  eventItem: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  eventHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventTypeIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  eventTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  deleteEventButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteEventButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  eventDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  eventTime: {
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '500',
  },
  completeButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
  },
  completeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  typeContainer: {
    marginBottom: 20,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  typeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  typeButton: {
    width: '48%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  typeButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  addEventButtonModal: {
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 