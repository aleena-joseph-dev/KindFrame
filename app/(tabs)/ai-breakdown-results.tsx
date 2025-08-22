import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AIResultCard, { AIResultItem } from '@/components/ui/AIResultCard';
import EditItemSheet from '@/components/ui/EditItemSheet';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface AIBreakdownResults {
  tasks: AIResultItem[];
  todos: AIResultItem[];
  events: AIResultItem[];
}

export default function AIBreakdownResultsScreen() {
  const router = useRouter();
  const { colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const params = useLocalSearchParams();
  
  const [items, setItems] = useState<AIBreakdownResults>({ tasks: [], todos: [], events: [] });
  const [isLoading, setIsLoading] = useState(false);
  const [editingItem, setEditingItem] = useState<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' } | null>(null);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

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
          setItems(parsedItems);
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

  const allItems = useMemo(() => {
    const result: Array<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' }> = [];
    
    // Add null checks and default to empty arrays
    const tasks = items.tasks || [];
    const todos = items.todos || [];
    const events = items.events || [];
    
    console.log('🎤 DEBUG: allItems - Current items state:', items);
    console.log('🎤 DEBUG: allItems - Processing items:', { tasks, todos, events });
    console.log('🎤 DEBUG: allItems - Tasks length:', tasks.length);
    console.log('🎤 DEBUG: allItems - Todos length:', todos.length);
    console.log('🎤 DEBUG: allItems - Events length:', events.length);
    
    tasks.forEach(task => {
      console.log('🎤 DEBUG: Adding task:', task);
      result.push({ item: task, type: 'TASK' });
    });
    todos.forEach(todo => {
      console.log('🎤 DEBUG: Adding todo:', todo);
      result.push({ item: todo, type: 'TODO' });
    });
    events.forEach(event => {
      console.log('🎤 DEBUG: Adding event:', event);
      result.push({ item: event, type: 'EVENT' });
    });
    
    console.log('🎤 DEBUG: allItems - Final result:', result);
    console.log('🎤 DEBUG: allItems - Final result length:', result.length);
    
    return result;
  }, [items]);

  const handleEditItem = useCallback((item: AIResultItem, type: 'TASK' | 'TODO' | 'EVENT') => {
    setEditingItem({ item, type });
    setIsEditSheetVisible(true);
  }, []);

  const handleSaveItem = useCallback(async (updatedItem: AIResultItem) => {
    if (!editingItem) return;

    setIsLoading(true);
    try {
      // Update local state first
      setItems(prev => {
        const newItems = { ...prev };
        
        switch (editingItem.type) {
          case 'TASK':
            newItems.tasks = prev.tasks?.map(task => 
              task.title === editingItem.item.title ? updatedItem : task
            ) || [];
            break;
          case 'TODO':
            newItems.todos = prev.todos?.map(todo => 
              todo.title === editingItem.item.title ? updatedItem : todo
            ) || [];
            break;
          case 'EVENT':
            newItems.events = prev.events?.map(event => 
              event.title === editingItem.item.title ? updatedItem : event
            ) || [];
            break;
        }
        
        return newItems;
      });

      // For now, just log the save - in a real app, you'd persist to database
      console.log('Saving updated item:', updatedItem);
      Alert.alert('Success', 'Item updated successfully (local only)');
    } catch (error) {
      console.error('Failed to save item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [editingItem]);

  const handleSaveAllAsType = useCallback(async (type: 'TASK' | 'TODO' | 'EVENT') => {
    setIsLoading(true);
    try {
      const itemsToSave = allItems.map(({ item }) => item);
      
      if (itemsToSave.length === 0) {
        Alert.alert('No Items', 'There are no items to save.');
        return;
      }
      
      // For now, just log the save - in a real app, you'd persist to database
      console.log(`Saving ${itemsToSave.length} items as ${type}s:`, itemsToSave);
      
      Alert.alert('Success', `All items would be saved as ${type}s (local only)`);
      router.back();
    } catch (error) {
      console.error('Failed to save all items:', error);
      Alert.alert('Error', 'Failed to save some items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [allItems, router]);

  const renderItem = useCallback(({ item: { item, type } }: { item: { item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' } }) => (
    <AIResultCard
      item={item}
      type={type}
      confidence={90} // Default confidence for now
      onEdit={() => handleEditItem(item, type)}
      onSave={handleSaveItem}
    />
  ), [handleEditItem, handleSaveItem]);

  const keyExtractor = useCallback((item: { item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' }) => 
    `${item.type}-${item.item.title}`, []);

  const getItemLayout = useCallback((data: any, index: number) => ({
    length: 200, // Approximate card height
    offset: 200 * index,
    index,
  }), []);

  if (allItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.emptyContainer}>
          <Icon name="text-search" size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No AI Breakdown Results
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Try running AI breakdown on some text first
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={() => router.back()}
          >
            <Text style={[styles.bulkButtonText, { color: '#FFF' }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Icon name="arrow-left" size={24} color={colors.text} />
        </TouchableOpacity>
        
        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>
            AI Breakdown Results
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Found {allItems.length} Items
          </Text>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Tap on items to edit them individually or use bulk actions below
          </Text>
        </View>
      </View>

      {/* Items List */}
      <FlatList
        data={allItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        getItemLayout={getItemLayout}
        initialNumToRender={6}
        removeClippedSubviews={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        style={styles.list}
      />

      {/* Bulk Actions */}
      <View style={[styles.bulkActions, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.bulkButton, { backgroundColor: '#EF4444' }]}
          onPress={() => handleSaveAllAsType('TODO')}
          disabled={isLoading}
        >
          <Icon name="check-all" size={20} color="#FFF" />
          <Text style={[styles.bulkButtonText, { color: '#FFF' }]}>
            Save All as Todos
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.bulkButton, { backgroundColor: '#10B981' }]}
          onPress={() => handleSaveAllAsType('EVENT')}
          disabled={isLoading}
        >
          <Icon name="calendar-plus" size={20} color="#FFF" />
          <Text style={[styles.bulkButtonText, { color: '#FFF' }]}>
            Save All as Events
          </Text>
        </TouchableOpacity>
      </View>

      {/* Edit Sheet */}
      <EditItemSheet
        isVisible={isEditSheetVisible}
        item={editingItem?.item || null}
        type={editingItem?.type || 'TASK'}
        onClose={() => {
          setIsEditSheetVisible(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    marginBottom: 16,
  },
  headerContent: {
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  instruction: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  bulkActions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    gap: 12,
  },
  bulkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
  },
  bulkButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
});
