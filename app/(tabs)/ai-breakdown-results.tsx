import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { DataService } from '@/services/dataService';
import { TopBar } from '@/components/ui/TopBar';
import { PopupBg } from '@/components/ui/PopupBg';

interface BreakdownItem {
  type: 'task' | 'todo' | 'event' | 'note';
  title: string;
  description: string;
  priority?: 'low' | 'medium' | 'high';
  dueDate?: string;
  category?: string;
  confidence: number;
}

export default function AIBreakdownResultsScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack, resetStack } = usePreviousScreen();
  
  const params = useLocalSearchParams();
  const [breakdownItems, setBreakdownItems] = useState<BreakdownItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<BreakdownItem | null>(null);

  useEffect(() => {
    // Add this screen to the navigation stack
    addToStack('ai-breakdown-results');
    
    // Get breakdown items from params or navigation state
    if (params.items) {
      try {
        const items = JSON.parse(params.items as string);
        setBreakdownItems(items);
      } catch (error) {
        console.error('Error parsing breakdown items:', error);
        // Fallback to empty array
        setBreakdownItems([]);
      }
    }
  }, [params.items]);

  const handleBackPress = () => {
    handleBack();
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'todo':
        return '✅';
      case 'event':
        return '📅';
      case 'note':
        return '📝';
      default:
        return '📄';
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return colors.primary;
      case 'todo':
        return colors.secondary;
      case 'event':
        return colors.accent;
      case 'note':
        return colors.textSecondary;
      default:
        return colors.border;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return colors.textSecondary;
    }
  };

  const handleSaveItem = async (item: BreakdownItem, saveType: 'todo' | 'note') => {
    setIsLoading(true);
    try {
      if (saveType === 'todo') {
        await DataService.createTodo({
          title: item.title,
          description: item.description,
          is_completed: false,
          priority: item.priority || 'medium',
          category: item.category || 'personal'
        });
        Alert.alert('Success', 'Item saved as Todo!');
      } else if (saveType === 'note') {
        await DataService.createNote({
          title: item.title,
          content: item.description,
          category: item.category || 'personal'
        });
        Alert.alert('Success', 'Item saved as Note!');
      }
      
      // Remove the saved item from the list
      setBreakdownItems(prev => prev.filter(i => i !== item));
    } catch (error) {
      console.error('Error saving item:', error);
      Alert.alert('Error', 'Failed to save item. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAllAsType = async (saveType: 'todo' | 'note') => {
    if (breakdownItems.length === 0) {
      Alert.alert('No Items', 'There are no items to save.');
      return;
    }

    setIsLoading(true);
    try {
      for (const item of breakdownItems) {
        if (saveType === 'todo') {
          await DataService.createTodo({
            title: item.title,
            description: item.description,
            is_completed: false,
            priority: item.priority || 'medium',
            category: item.category || 'personal'
          });
        } else if (saveType === 'note') {
          await DataService.createNote({
            title: item.title,
            content: item.description,
            category: item.category || 'personal'
          });
        }
      }
      
      Alert.alert('Success', `All ${breakdownItems.length} items saved as ${saveType === 'todo' ? 'Todos' : 'Notes'}!`);
      setBreakdownItems([]); // Clear all items
    } catch (error) {
      console.error('Error saving all items:', error);
      Alert.alert('Error', 'Failed to save some items. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemPress = (item: BreakdownItem) => {
    setSelectedItem(item);
    setShowSaveModal(true);
  };

  if (breakdownItems.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <TopBar
          title="AI Breakdown Results"
          onBack={handleBackPress}
          showBack={true}
        />
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Breakdown Items
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Run AI breakdown on some text to see results here.
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.primary }]}
            onPress={handleBackPress}
          >
            <Text style={[styles.backButtonText, { color: colors.background }]}>
              Go Back
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar
        title="AI Breakdown Results"
        onBack={handleBackPress}
        showBack={true}
      />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Found {breakdownItems.length} Items
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          Tap on items to save them individually or use bulk actions below
        </Text>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {breakdownItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.itemCard, { 
              backgroundColor: colors.surface,
              borderColor: getTypeColor(item.type)
            }]}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
          >
            <View style={styles.itemHeader}>
              <View style={styles.itemTypeContainer}>
                <Text style={styles.itemTypeIcon}>
                  {getTypeIcon(item.type)}
                </Text>
                <View style={styles.itemTypeInfo}>
                  <Text style={[styles.itemType, { color: getTypeColor(item.type) }]}>
                    {item.type.toUpperCase()}
                  </Text>
                  <Text style={[styles.itemConfidence, { color: colors.textSecondary }]}>
                    {Math.round(item.confidence * 100)}% confidence
                  </Text>
                </View>
              </View>
              {item.priority && (
                <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(item.priority) }]}>
                  <Text style={styles.priorityText}>
                    {item.priority.toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            
            <Text style={[styles.itemTitle, { color: colors.text }]}>
              {item.title}
            </Text>
            
            {item.description && item.description !== item.title && (
              <Text style={[styles.itemDescription, { color: colors.textSecondary }]}>
                {item.description}
              </Text>
            )}
            
            <View style={styles.itemFooter}>
              {item.category && (
                <View style={[styles.categoryBadge, { backgroundColor: colors.border }]}>
                  <Text style={[styles.categoryText, { color: colors.textSecondary }]}>
                    {item.category}
                  </Text>
                </View>
              )}
              {item.dueDate && (
                <Text style={[styles.dueDate, { color: colors.textSecondary }]}>
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                </Text>
              )}
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={styles.actionBar}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.secondary }]}
          onPress={() => handleSaveAllAsType('todo')}
          disabled={isLoading || breakdownItems.length === 0}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>
            Save All as Todos
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.accent }]}
          onPress={() => handleSaveAllAsType('note')}
          disabled={isLoading || breakdownItems.length === 0}
        >
          <Text style={[styles.actionButtonText, { color: colors.background }]}>
            Save All as Notes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Item Detail Modal */}
      <PopupBg
        visible={showSaveModal}
        onRequestClose={() => setShowSaveModal(false)}
        size="medium"
        color={colors.surface}
        showSkip={false}
        closeOnOutsideTap={true}
      >
        <View style={styles.modalContent}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Save Item
          </Text>
          
          {selectedItem && (
            <View style={styles.modalItem}>
              <Text style={[styles.modalItemTitle, { color: colors.text }]}>
                {selectedItem.title}
              </Text>
              <Text style={[styles.modalItemType, { color: getTypeColor(selectedItem.type) }]}>
                Type: {selectedItem.type.toUpperCase()}
              </Text>
              {selectedItem.description && (
                <Text style={[styles.modalItemDescription, { color: colors.textSecondary }]}>
                  {selectedItem.description}
                </Text>
              )}
            </View>
          )}
          
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalActionButton, { backgroundColor: colors.secondary }]}
              onPress={() => {
                if (selectedItem) {
                  handleSaveItem(selectedItem, 'todo');
                  setShowSaveModal(false);
                }
              }}
              disabled={isLoading}
            >
              <Text style={[styles.modalActionText, { color: colors.background }]}>
                Save as Todo
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.modalActionButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                if (selectedItem) {
                  handleSaveItem(selectedItem, 'note');
                  setShowSaveModal(false);
                }
              }}
              disabled={isLoading}
            >
              <Text style={[styles.modalActionText, { color: colors.background }]}>
                Save as Note
              </Text>
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity
            style={[styles.modalCancelButton, { borderColor: colors.border }]}
            onPress={() => setShowSaveModal(false)}
          >
            <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </PopupBg>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  backButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  itemCard: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  itemTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemTypeIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  itemTypeInfo: {
    flex: 1,
  },
  itemType: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  itemConfidence: {
    fontSize: 11,
    opacity: 0.8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    color: 'white',
    fontSize: 10,
    fontWeight: '600',
  },
  itemTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    lineHeight: 24,
  },
  itemDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  itemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  categoryText: {
    fontSize: 10,
    fontWeight: '500',
  },
  dueDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 32,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  actionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalItem: {
    width: '100%',
    marginBottom: 24,
  },
  modalItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalItemType: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  modalItemDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  modalActionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalActionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
