import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AIResultCard, { AIResultItem } from '@/components/ui/AIResultCard';
import BottomSaveBar from '@/components/ui/BottomSaveBar';
import EditItemSheet from '@/components/ui/EditItemSheet';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { convertItem } from '@/lib/convert';
import { enqueueSave, getQueueStats, watchConnectivity } from '@/lib/offlineQueue';
import { saveItems } from '@/lib/persist';

interface AIBreakdownResults {
  tasks: AIResultItem[];
  todos: AIResultItem[];
  events: AIResultItem[];
}

export default function AIBreakdownResultsScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { session } = useAuth();
  const params = useLocalSearchParams();
  
  // Check if user is in guest mode
  const isGuestMode = !session;
  
  const [items, setItems] = useState<AIBreakdownResults>({ tasks: [], todos: [], events: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' } | null>(null);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [offlineQueueStats, setOfflineQueueStats] = useState<{ pendingCount: number; totalRetries: number }>({ pendingCount: 0, totalRetries: 0 });
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [savedCount, setSavedCount] = useState(0);

  // Parse items from route params
  React.useEffect(() => {
    try {
      if (params.items) {
        console.log('🎤 DEBUG: Raw params.items:', params.items);
        const parsedItems = JSON.parse(params.items as string);
        console.log('🎤 DEBUG: Parsed items:', parsedItems);
        
        // Now we expect the correct structure: { tasks: [], todos: [], events: [] }
        if (parsedItems && (parsedItems.tasks || parsedItems.todos || parsedItems.events)) {
          console.log('🎤 DEBUG: Setting items with correct structure:', parsedItems);
          
          // Process items to ensure proper structure and defaults
          const processedItems = processItemsForDisplay(parsedItems);
          setItems(processedItems);
        } else {
          console.error('Invalid items format:', parsedItems);
          Alert.alert('Error', 'Invalid AI breakdown results format');
        }
      }
    } catch (error) {
      console.error('Failed to parse AI breakdown items:', error);
      Alert.alert('Error', 'Failed to load AI breakdown results');
    }
  }, [params.items]);

  // Process items for display (ensure todos have dates, compute relative times)
  const processItemsForDisplay = useCallback((rawItems: any): AIBreakdownResults => {
    const processed = { ...rawItems };
    
    // Ensure all items have proper date/time structure
    const processItemDateTime = (item: AIResultItem) => {
      console.log('🎯 DEBUG: Processing item for display:', {
        title: item.title,
        type: item.type,
        due: item.due,
        start: item.start,
        end: item.end
      });
      
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      const currentTime = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
      
      // For todos, ensure they have a due date ONLY if completely missing
      if (item.type === 'todo' && (!item.due || (!item.due.date && !item.due.iso && !item.due.when_text))) {
        console.log('🎯 DEBUG: Adding default due date for todo:', item.title);
        if (!item.due) item.due = {};
        item.due.date = today;
        item.due.time = currentTime;
        item.due.iso = new Date(`${today}T${currentTime}:00`).toISOString();
        item.due.when_text = 'today';
        item.due.tz = 'Asia/Kolkata';
      } else if (item.type === 'todo' && item.due) {
        console.log('🎯 DEBUG: Preserving existing due date for todo:', item.title, item.due);
      }
      
      // For events, ensure they have start and end times ONLY if completely missing
      if (item.type === 'event') {
        if (!item.start || (!item.start.date && !item.start.iso && !item.start.when_text)) {
          console.log('🎯 DEBUG: Adding default start time for event:', item.title);
          if (!item.start) item.start = {};
          item.start.date = today;
          item.start.time = currentTime;
          item.start.iso = new Date(`${today}T${currentTime}:00`).toISOString();
          item.start.when_text = 'today';
          item.start.tz = 'Asia/Kolkata';
        } else {
          console.log('🎯 DEBUG: Preserving existing start time for event:', item.title, item.start);
        }
        
        if (!item.end || (!item.end.date && !item.end.iso && !item.end.when_text)) {
          console.log('🎯 DEBUG: Adding default end time for event:', item.title);
          if (!item.end) item.end = {};
          const startTime = item.start.iso ? new Date(item.start.iso) : new Date(`${today}T${currentTime}:00`);
          const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // +1 hour
          item.end.date = endTime.toISOString().split('T')[0];
          item.end.time = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
          item.end.iso = endTime.toISOString();
          item.end.when_text = 'today +1 hour';
          item.end.tz = 'Asia/Kolkata';
        } else {
          console.log('🎯 DEBUG: Preserving existing end time for event:', item.title, item.end);
        }
      }
      
      // For tasks, ensure they have a due date ONLY if completely missing
      if (item.type === 'task' && (!item.due || (!item.due.date && !item.due.iso && !item.due.when_text))) {
        console.log('🎯 DEBUG: Adding default due date for task:', item.title);
        if (!item.due) item.due = {};
        item.due.date = today;
        item.due.time = currentTime;
        item.due.iso = new Date(`${today}T${currentTime}:00`).toISOString();
        item.due.when_text = 'today';
        item.due.tz = 'Asia/Kolkata';
      } else if (item.type === 'task' && item.due) {
        console.log('🎯 DEBUG: Preserving existing due date for task:', item.title, item.due);
      }
      
      console.log('🎯 DEBUG: Final processed item:', {
        title: item.title,
        type: item.type,
        due: item.due,
        start: item.start,
        end: item.end
      });
      
      return item;
    };
    
    // Process each category
    if (processed.tasks) {
      processed.tasks = processed.tasks.map(processItemDateTime);
    }
    if (processed.todos) {
      processed.todos = processed.todos.map(processItemDateTime);
    }
    if (processed.events) {
      processed.events = processed.events.map(processItemDateTime);
    }
    
    console.log('🎯 DEBUG: Processed items for display:', processed);
    return processed;
  }, []);

  const allItems = useMemo(() => {
    const result: Array<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT'; uniqueId: string }> = [];
    
    // Add null checks and default to empty arrays
    const tasks = items.tasks || [];
    const todos = items.todos || [];
    const events = items.events || [];
    
    console.log('🎤 DEBUG: allItems - Current items state:', items);
    console.log('🎤 DEBUG: allItems - Processing items:', { tasks, todos, events });
    console.log('🎤 DEBUG: allItems - Tasks length:', tasks.length);
    console.log('🎤 DEBUG: allItems - Todos length:', todos.length);
    console.log('🎤 DEBUG: allItems - Events length:', events.length);
    
    let globalIndex = 0;
    tasks.forEach((task, index) => {
      // Skip items without titles
      if (!task.title || task.title.trim() === '') return;
      
      // Generate unique ID for each item
      const uniqueId = `task-${globalIndex}-${task.title.trim()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🎤 DEBUG: Adding task:', { ...task, uniqueId });
      result.push({ item: task, type: 'TASK', uniqueId });
      globalIndex++;
    });
    todos.forEach((todo, index) => {
      // Skip items without titles
      if (!todo.title || todo.title.trim() === '') return;
      
      // Generate unique ID for each item
      const uniqueId = `todo-${globalIndex}-${todo.title.trim()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🎤 DEBUG: Adding todo:', { ...todo, uniqueId });
      result.push({ item: todo, type: 'TODO', uniqueId });
      globalIndex++;
    });
    events.forEach((event, index) => {
      // Skip items without titles
      if (!event.title || event.title.trim() === '') return;
      
      // Generate unique ID for each item
      const uniqueId = `event-${globalIndex}-${event.title.trim()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      console.log('🎤 DEBUG: Adding event:', { ...event, uniqueId });
      result.push({ item: event, type: 'EVENT', uniqueId });
      globalIndex++;
    });
    
    console.log('🎤 DEBUG: allItems - Final result:', result);
    console.log('🎤 DEBUG: allItems - Final result length:', result.length);
    
    return result;
  }, [items]);

  // Debug selection state changes
  React.useEffect(() => {
    console.log('🎯 DEBUG: Selection state changed:', {
      selectedCount: selectedItems.size,
      totalItems: allItems.length,
      selectedItems: Array.from(selectedItems)
    });
  }, [selectedItems, allItems.length]);

  // Monitor offline queue
  useEffect(() => {
    const updateQueueStats = async () => {
      const stats = await getQueueStats();
      setOfflineQueueStats({
        pendingCount: stats.pendingCount,
        totalRetries: stats.totalRetries
      });
    };

    updateQueueStats();
    const interval = setInterval(updateQueueStats, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Setup connectivity monitoring
  useEffect(() => {
    const unsubscribe = watchConnectivity(
      async (queuedItems) => {
        try {
          // Only process items that were explicitly queued for offline processing
          // This should NOT save all items automatically
          if (queuedItems && queuedItems.length > 0) {
            console.log('📱 Offline: Processing queued items:', queuedItems.length);
            // The offline queue should handle its own processing
            // We don't call saveItems here as it would save everything
          }
          console.log('📱 Offline: Successfully processed queued items');
        } catch (error) {
          console.error('📱 Offline: Failed to process queued items:', error);
        }
      },
      (stats) => {
        console.log('📱 Offline: Queue updated:', stats);
        setOfflineQueueStats({
          pendingCount: stats.total - stats.failed,
          totalRetries: 0
        });
      }
    );

    return unsubscribe;
  }, []);

  const handleEditItem = useCallback((item: AIResultItem, type: 'TASK' | 'TODO' | 'EVENT') => {
    setEditingItem({ item, type });
    setIsEditSheetVisible(true);
  }, []);

  const handleQuickUpdate = useCallback((item: AIResultItem, field: 'date' | 'time' | 'reminder', value: string) => {
    console.log('🔄 Quick update:', { item: item.title, field, value, itemType: item.type });
    
    setItems(prevItems => {
      const updated = { ...prevItems };
      
      // Find and update the item in the appropriate array
      const updateArray = (array: AIResultItem[]) => {
        return array.map(i => {
          if (i.title === item.title) {
            const updatedItem = { ...i };
            
            if (field === 'date' || field === 'time') {
              // Check if this is an event type item
              if (item.start && item.end) {
                // This is an event, update start time
                const currentStart = { ...i.start };
                currentStart[field] = value;
                
                // Update ISO string if we have both date and time
                if (currentStart.date && currentStart.time) {
                  try {
                    const dateTime = new Date(`${currentStart.date}T${currentStart.time}:00`);
                    currentStart.iso = dateTime.toISOString();
                  } catch (e) {
                    console.warn('Failed to create ISO string for start time:', e);
                  }
                }
                
                updatedItem.start = currentStart;
              } else {
                // This is a task or todo, update due time
                const currentDue = { ...i.due };
                currentDue[field] = value;
                
                // Update ISO string if we have both date and time
                if (currentDue.date && currentDue.time) {
                  try {
                    const dateTime = new Date(`${currentDue.date}T${currentDue.time}:00`);
                    currentDue.iso = dateTime.toISOString();
                  } catch (e) {
                    console.warn('Failed to create ISO string for due time:', e);
                  }
                }
                
                updatedItem.due = currentDue;
              }
            } else if (field === 'reminder') {
              if (value === '') {
                updatedItem.reminder = undefined;
              } else {
                updatedItem.reminder = { ...i.reminder, lead_minutes: parseInt(value) };
              }
            }
            
            return updatedItem;
          }
          return i;
        });
      };
      
      // Determine which array to update based on the item structure
      let targetType = item.type;
      if (!targetType) {
        // Fallback: try to determine type from the item structure
        if (item.start && item.end) targetType = 'event';
        else if (item.due) targetType = 'todo';
        else targetType = 'task';
      }
      
      // Normalize the type to lowercase for comparison
      const normalizedType = targetType.toLowerCase();
      
      if (normalizedType === 'task') {
        updated.tasks = updateArray(updated.tasks);
      } else if (normalizedType === 'todo') {
        updated.todos = updateArray(updated.todos);
      } else if (normalizedType === 'event') {
        updated.events = updateArray(updated.events);
      }
      
      return updated;
    });
  }, []);

  const handleConvertType = useCallback((item: AIResultItem, newType: 'task' | 'todo' | 'event') => {
    console.log('🔄 Converting item:', { from: item.type, to: newType, title: item.title });
    
    // Convert the item using our conversion utility
    const convertedItem = convertItem(item as any, newType);
    
    setItems(prevItems => {
      const updated = { ...prevItems };
      
      // Remove from old array
      if (item.type === 'task') {
        updated.tasks = updated.tasks.filter(t => t.title !== item.title);
      } else if (item.type === 'todo') {
        updated.todos = updated.todos.filter(t => t.title !== item.title);
      } else if (item.type === 'event') {
        updated.events = updated.events.filter(e => e.title !== item.title);
      }
      
      // Add to new array
      if (newType === 'task') {
        updated.tasks.push(convertedItem as AIResultItem);
      } else if (newType === 'todo') {
        updated.todos.push(convertedItem as AIResultItem);
      } else if (newType === 'event') {
        updated.events.push(convertedItem as AIResultItem);
      }
      
      return updated;
    });
    
    // Clear selection for this item
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      newSet.delete(`${newType}-${item.title}-${JSON.stringify(item).length}`);
      return newSet;
    });
  }, []);

  const handleToggleSelect = useCallback((item: AIResultItem, type: 'TASK' | 'TODO' | 'EVENT', uniqueId: string) => {
    const key = uniqueId;
    
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
        console.log('🎯 DEBUG: Deselected item:', item.title, 'New count:', newSet.size);
      } else {
        newSet.add(key);
        console.log('🎯 DEBUG: Selected item:', item.title, 'New count:', newSet.size);
      }
      return newSet;
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    const allKeys = allItems.map(({ uniqueId }) => uniqueId);
    
    if (selectedItems.size === allItems.length) {
      // Deselect all
      setSelectedItems(new Set());
      console.log('🎯 DEBUG: Deselected all items');
    } else {
      // Select all
      setSelectedItems(new Set(allKeys));
      console.log('🎯 DEBUG: Selected all items:', allKeys.length);
    }
  }, [allItems, selectedItems.size]);

  const handleSaveSelected = useCallback(async () => {
    if (selectedItems.size === 0) {
      Alert.alert('No Selection', 'Please select at least one item to save.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Get selected items
      const selectedItemsArray = allItems
        .filter(({ uniqueId }) => selectedItems.has(uniqueId))
        .map(({ item }) => item);

      console.log('💾 Saving selected items:', selectedItemsArray.length);
      
      if (isGuestMode) {
        // In guest mode, save to local storage
        console.log('💾 Guest mode: Saving to local storage');
        
        try {
          // Get existing guest items
          const existingGuestItems = await AsyncStorage.getItem('guest_ai_breakdown_items');
          const guestItems = existingGuestItems ? JSON.parse(existingGuestItems) : [];
          
          // Add new items with guest IDs
          const newGuestItems = selectedItemsArray.map(item => ({
            ...item,
            id: `guest-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            guest_timestamp: Date.now()
          }));
          
          // Save to local storage
          await AsyncStorage.setItem('guest_ai_breakdown_items', JSON.stringify([...guestItems, ...newGuestItems]));
          
          // Store count before clearing selection
          setSavedCount(selectedItemsArray.length);
          
          // Show saved message and redirect
          setTimeout(() => {
            setShowSavedMessage(true);
            setTimeout(() => {
              setShowSavedMessage(false);
              router.push('/(tabs)/quick-jot');
            }, 2000);
          }, 500);
          
          // Clear selection
          setSelectedItems(new Set());
          
        } catch (guestSaveError) {
          console.error('💾 Failed to save to guest storage:', guestSaveError);
          Alert.alert('Error', 'Failed to save items locally. Please try again.');
        }
      } else {
        // Authenticated user: try to save directly first
        await saveItems(selectedItemsArray as any);
        
        // Store count before clearing selection
        setSavedCount(selectedItemsArray.length);
        
        // Show saved message and redirect
        setTimeout(() => {
          setShowSavedMessage(true);
          setTimeout(() => {
            setShowSavedMessage(false);
            router.push('/(tabs)/quick-jot');
          }, 2000);
        }, 500);
        
        // Clear selection on success
        setSelectedItems(new Set());
      }
      
    } catch (error) {
      console.error('💾 Save failed:', error);
      
      if (isGuestMode) {
        Alert.alert('Error', 'Failed to save items to guest mode. Please try again.');
      } else {
        try {
          // Queue for offline processing (authenticated users only)
          const selectedItemsArray = allItems
            .filter(({ uniqueId }) => selectedItems.has(uniqueId))
            .map(({ item }) => item);

          await enqueueSave(selectedItemsArray as any);
          
          // Store count before clearing selection
          setSavedCount(selectedItemsArray.length);
          
          // Show saved message and redirect
          setTimeout(() => {
            setShowSavedMessage(true);
            setTimeout(() => {
              setShowSavedMessage(false);
              router.push('/(tabs)/quick-jot');
            }, 2000);
          }, 500);
          
          // Clear selection
          setSelectedItems(new Set());
          
        } catch (queueError) {
          console.error('💾 Failed to queue for offline:', queueError);
          Alert.alert('Error', 'Failed to save items. Please try again.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [selectedItems, allItems, isGuestMode]);

  const keyExtractor = useCallback(({ uniqueId }: { uniqueId: string }) => {
    return uniqueId;
  }, []);

  const renderItem = useCallback(({ item }: { item: { item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT'; uniqueId: string } }) => {
    const isSelected = selectedItems.has(item.uniqueId);
    
    return (
      <AIResultCard
        item={item.item}
        type={item.type}
        onEdit={(itemData) => handleEditItem(itemData, item.type)}
        onQuickUpdate={handleQuickUpdate}
        onConvertType={handleConvertType}
        isSelected={isSelected}
        onToggleSelect={() => handleToggleSelect(item.item, item.type, item.uniqueId)}
      />
    );
  }, [selectedItems, handleEditItem, handleQuickUpdate, handleConvertType, handleToggleSelect]);

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>
        AI Breakdown Results
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {allItems.length} items • {selectedItems.size} selected
      </Text>
      
      {/* Offline Queue Status */}
      {offlineQueueStats.pendingCount > 0 && (
        <View style={[styles.offlineStatus, { backgroundColor: colors.accent }]}>
          <Icon name="wifi-off" size={16} color="white" />
          <Text style={styles.offlineStatusText}>
            {offlineQueueStats.pendingCount} items queued offline
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {renderHeader()}
      
      {/* Saved message overlay */}
      {showSavedMessage && (
        <View style={[styles.savedMessage, { backgroundColor: colors.primary }]}>
          <Icon name="check-circle" size={20} color="white" />
          <Text style={styles.savedMessageText}>
            {savedCount} item{savedCount !== 1 ? 's' : ''} saved successfully! Redirecting to Quick Jot...
          </Text>
        </View>
      )}
      
      <FlatList<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT'; uniqueId: string }>
        data={allItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="text-box-outline" size={48} color={colors.textSecondary} />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No AI breakdown results to display
            </Text>
          </View>
        }
      />
      
      <BottomSaveBar
        totalItems={allItems.length}
        selectedItems={selectedItems.size}
        onSelectAll={handleSelectAll}
        onSave={handleSaveSelected}
        isLoading={isLoading}
      />
      
      <EditItemSheet
        isVisible={isEditSheetVisible}
        item={editingItem?.item}
        type={editingItem?.type || 'TODO'}
        onClose={() => {
          setIsEditSheetVisible(false);
          setEditingItem(null);
        }}
        onSave={(updatedItem) => {
          // Update the item in the appropriate array
          setItems(prevItems => {
            const updated = { ...prevItems };
            
            if (editingItem?.type === 'TASK') {
              updated.tasks = updated.tasks.map(t => 
                t.title === editingItem.item.title ? updatedItem : t
              );
            } else if (editingItem?.type === 'TODO') {
              updated.todos = updated.todos.map(t => 
                t.title === editingItem.item.title ? updatedItem : t
              );
            } else if (editingItem?.type === 'EVENT') {
              updated.events = updated.events.map(e => 
                e.title === editingItem.item.title ? updatedItem : e
              );
            }
            
            return updated;
          });
          
          setIsEditSheetVisible(false);
          setEditingItem(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 12,
  },
  offlineStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  offlineStatusText: {
    color: 'white',
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
  },
  listContent: {
    paddingBottom: 100, // Space for bottom bar
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
  },
  savedMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
    transform: [{ scale: 1.05 }],
  },
  savedMessageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    textAlign: 'center',
  },
});
