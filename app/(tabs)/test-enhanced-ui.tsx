import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColors } from '@/hooks/useThemeColors';
import AIResultCard, { AIResultItem } from '@/components/ui/AIResultCard';
import EditItemSheet from '@/components/ui/EditItemSheet';
import { mockAIBreakdownResults, mockIncompleteResults, mockAllDayEvents } from '@/lib/testData';

export default function TestEnhancedUIScreen() {
  const { colors } = useThemeColors();
  const [selectedData, setSelectedData] = useState<'complete' | 'incomplete' | 'allDay'>('complete');
  const [editingItem, setEditingItem] = useState<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' } | null>(null);
  const [isEditSheetVisible, setIsEditSheetVisible] = useState(false);

  const getTestData = () => {
    switch (selectedData) {
      case 'incomplete':
        return mockIncompleteResults;
      case 'allDay':
        return mockAllDayEvents;
      default:
        return mockAIBreakdownResults;
    }
  };

  const handleEditItem = (item: AIResultItem, type: 'TASK' | 'TODO' | 'EVENT') => {
    setEditingItem({ item, type });
    setIsEditSheetVisible(true);
  };

  const handleSaveItem = async (updatedItem: AIResultItem) => {
    console.log('Saving updated item:', updatedItem);
    // In a real app, this would save to the database
    setIsEditSheetVisible(false);
    setEditingItem(null);
  };

  const renderTestData = () => {
    const data = getTestData();
    const allItems: Array<{ item: AIResultItem; type: 'TASK' | 'TODO' | 'EVENT' }> = [];
    
    data.tasks.forEach(task => allItems.push({ item: task, type: 'TASK' }));
    data.todos.forEach(todo => allItems.push({ item: todo, type: 'TODO' }));
    data.events.forEach(event => allItems.push({ item: event, type: 'EVENT' }));

    return allItems.map(({ item, type }, index) => (
      <AIResultCard
        key={`${type}-${index}`}
        item={item}
        type={type}
        confidence={85 + (index * 5)}
        onEdit={() => handleEditItem(item, type)}
        onSave={handleSaveItem}
      />
    ));
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>
          Enhanced AI Breakdown UI Test
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Test different data scenarios and edit functionality
        </Text>
      </View>

      {/* Test Data Selector */}
      <View style={[styles.selectorContainer, { backgroundColor: colors.surface }]}>
        <Text style={[styles.selectorLabel, { color: colors.text }]}>
          Test Data:
        </Text>
        <View style={styles.selectorButtons}>
          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: selectedData === 'complete' ? colors.primary : colors.border,
                borderColor: selectedData === 'complete' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedData('complete')}
          >
            <Text
              style={[
                styles.selectorButtonText,
                {
                  color: selectedData === 'complete' ? '#FFF' : colors.textSecondary,
                },
              ]}
            >
              Complete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: selectedData === 'incomplete' ? colors.primary : colors.border,
                borderColor: selectedData === 'incomplete' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedData('incomplete')}
          >
            <Text
              style={[
                styles.selectorButtonText,
                {
                  color: selectedData === 'incomplete' ? '#FFF' : colors.textSecondary,
                },
              ]}
            >
              Incomplete
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.selectorButton,
              {
                backgroundColor: selectedData === 'allDay' ? colors.primary : colors.border,
                borderColor: selectedData === 'allDay' ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setSelectedData('allDay')}
          >
            <Text
              style={[
                styles.selectorButtonText,
                {
                  color: selectedData === 'allDay' ? '#FFF' : colors.textSecondary,
                },
              ]}
            >
              All-Day Events
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Test Cards */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.cardsContainer}>
          {renderTestData()}
        </View>
      </ScrollView>

      {/* Instructions */}
      <View style={[styles.instructions, { backgroundColor: colors.surface }]}>
        <Text style={[styles.instructionsTitle, { color: colors.text }]}>
          How to Test:
        </Text>
        <Text style={[styles.instructionsText, { color: colors.textSecondary }]}>
          • Tap the edit button (pencil icon) on any card to open the edit sheet{'\n'}
          • Try editing different fields like dates, times, and priorities{'\n'}
          • Test validation by entering invalid data{'\n'}
          • Switch between test data scenarios to see different UI states
        </Text>
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
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  selectorContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  selectorLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  selectorButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  selectorButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
  },
  selectorButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  cardsContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
