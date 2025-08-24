// Pomodoro Add or Link Item Sheet Component
// Bottom sheet with tabs for creating new items or linking existing ones

import { useThemeColors } from '@/hooks/useThemeColors';
import { DataService } from '@/services/dataService';
import { BottomSheetModal, BottomSheetView } from '@gorhom/bottom-sheet';
import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
    Alert,
    FlatList,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export interface LinkableItem {
  id: string;
  type: 'task' | 'todo' | 'event' | 'note' | 'goal' | 'memory';
  title: string;
  content?: string;
  dueDate?: string;
  priority?: string;
}

interface AddOrLinkItemSheetProps {
  isVisible: boolean;
  onClose: () => void;
  onLinkItem: (item: LinkableItem, estimatedPomodoros: number) => void;
  onCreateTask: (title: string, estimatedPomodoros: number, notes?: string) => void;
}

export default function AddOrLinkItemSheet({
  isVisible,
  onClose,
  onLinkItem,
  onCreateTask,
}: AddOrLinkItemSheetProps) {
  const { colors } = useThemeColors();
  const bottomSheetRef = useRef<BottomSheetModal>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'link'>('create');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LinkableItem[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPomodoros, setNewTaskPomodoros] = useState(1);
  const [newTaskNotes, setNewTaskNotes] = useState('');
  const [showPomodoroInput, setShowPomodoroInput] = useState(false);
  const [selectedItem, setSelectedItem] = useState<LinkableItem | null>(null);
  const [pomodoroInput, setPomodoroInput] = useState('1');

  const snapPoints = useMemo(() => ['75%', '90%'], []);

  // Handle modal visibility changes
  useEffect(() => {
    if (isVisible) {
      console.log('📱 AddOrLinkItemSheet: Presenting modal');
      bottomSheetRef.current?.present();
    } else {
      console.log('📱 AddOrLinkItemSheet: Dismissing modal');
      bottomSheetRef.current?.dismiss();
    }
  }, [isVisible]);

  const handleSheetChanges = useCallback((index: number) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const handleSearch = async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      const results = await DataService.searchUserContent(query);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateTask = () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Error', 'Please enter a task title');
      return;
    }

    onCreateTask(newTaskTitle.trim(), newTaskPomodoros, newTaskNotes.trim() || undefined);
    setNewTaskTitle('');
    setNewTaskPomodoros(1);
    setNewTaskNotes('');
    onClose();
  };

  const handleLinkItem = (item: LinkableItem) => {
    setSelectedItem(item);
    setPomodoroInput('1');
    setShowPomodoroInput(true);
  };

  const handleConfirmLink = () => {
    if (!selectedItem) return;
    
    const estimated = parseInt(pomodoroInput, 10);
    if (estimated > 0 && estimated <= 20) {
      onLinkItem(selectedItem, estimated);
      setShowPomodoroInput(false);
      setSelectedItem(null);
      onClose();
    } else {
      Alert.alert('Error', 'Please enter a valid number between 1-20');
    }
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'task':
        return '📋';
      case 'todo':
        return '✅';
      case 'event':
        return '📅';
      case 'note':
        return '📝';
      case 'goal':
        return '🎯';
      case 'memory':
        return '🧠';
      default:
        return '📄';
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'task':
        return '#8B5CF6';
      case 'todo':
        return '#10B981';
      case 'event':
        return '#F59E0B';
      case 'note':
        return '#3B82F6';
      case 'goal':
        return '#EF4444';
      case 'memory':
        return '#8B5CF6';
      default:
        return colors.textSecondary;
    }
  };

  const renderSearchResult = ({ item }: { item: LinkableItem }) => (
    <TouchableOpacity
      style={[
        styles.searchResultItem,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
      onPress={() => handleLinkItem(item)}
      activeOpacity={0.7}
    >
      <View style={styles.searchResultHeader}>
        <Text style={[styles.searchResultTitle, { color: colors.text }]}>
          {item.title}
        </Text>
        <View
          style={[
            styles.searchResultType,
            { backgroundColor: getItemTypeColor(item.type) + '20' },
          ]}
        >
          <Text
            style={[
              styles.searchResultTypeText,
              { color: getItemTypeColor(item.type) },
            ]}
          >
            {item.type}
          </Text>
        </View>
      </View>
      {item.content && (
        <Text
          style={[styles.searchResultContent, { color: colors.textSecondary }]}
          numberOfLines={2}
        >
          {item.content}
        </Text>
      )}
      {item.dueDate && (
        <Text style={[styles.searchResultDueDate, { color: colors.textSecondary }]}>
          Due: {item.dueDate}
        </Text>
      )}
    </TouchableOpacity>
  );

  return (
    <>
      <BottomSheetModal
        ref={bottomSheetRef}
        index={isVisible ? 0 : -1}
        snapPoints={snapPoints}
        onChange={handleSheetChanges}
        enablePanDownToClose
        backgroundStyle={{ backgroundColor: colors.background }}
      >
        <BottomSheetView style={[styles.container, { backgroundColor: colors.background }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              Add or Link Task
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Tab Buttons */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'create' && [
                  styles.activeTabButton,
                  { backgroundColor: colors.topBarBackground },
                ],
              ]}
              onPress={() => setActiveTab('create')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === 'create' ? colors.background : colors.textSecondary,
                  },
                ]}
              >
                Create New
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === 'link' && [
                  styles.activeTabButton,
                  { backgroundColor: colors.topBarBackground },
                ],
              ]}
              onPress={() => setActiveTab('link')}
            >
              <Text
                style={[
                  styles.tabButtonText,
                  {
                    color: activeTab === 'link' ? colors.background : colors.textSecondary,
                  },
                ]}
              >
                Link Existing
              </Text>
            </TouchableOpacity>
          </View>

          {/* Content */}
          {activeTab === 'create' ? (
            <ScrollView style={styles.createContent} showsVerticalScrollIndicator={false}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Task Title</Text>
                <TextInput
                  style={[
                    styles.textInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={newTaskTitle}
                  onChangeText={setNewTaskTitle}
                  placeholder="Enter task title..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Est. Pomodoros
                </Text>
                <View style={styles.pomodoroStepper}>
                  <TouchableOpacity
                    style={[
                      styles.stepperButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => setNewTaskPomodoros(Math.max(1, newTaskPomodoros - 1))}
                  >
                    <Text style={[styles.stepperButtonText, { color: colors.text }]}>−</Text>
                  </TouchableOpacity>
                  <Text style={[styles.stepperValue, { color: colors.text }]}>
                    {newTaskPomodoros}
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.stepperButton,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                    ]}
                    onPress={() => setNewTaskPomodoros(Math.min(20, newTaskPomodoros + 1))}
                  >
                    <Text style={[styles.stepperButtonText, { color: colors.text }]}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Notes (Optional)</Text>
                <TextInput
                  style={[
                    styles.textArea,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={newTaskNotes}
                  onChangeText={setNewTaskNotes}
                  placeholder="Add any additional notes..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  numberOfLines={3}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.createButton,
                  { backgroundColor: colors.topBarBackground },
                ]}
                onPress={handleCreateTask}
              >
                <Text style={[styles.createButtonText, { color: colors.background }]}>
                  Create Task
                </Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            <View style={styles.linkContent}>
              <View style={styles.searchContainer}>
                <TextInput
                  style={[
                    styles.searchInput,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  value={searchQuery}
                  onChangeText={(text) => {
                    setSearchQuery(text);
                    handleSearch(text);
                  }}
                  placeholder="Search for tasks, todos, events..."
                  placeholderTextColor={colors.textSecondary}
                />
              </View>

              {isSearching ? (
                <View style={styles.loadingContainer}>
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Searching...
                  </Text>
                </View>
              ) : searchResults.length > 0 ? (
                <FlatList
                  data={searchResults}
                  renderItem={renderSearchResult}
                  keyExtractor={(item) => `${item.type}-${item.id}`}
                  style={styles.searchResultsList}
                  showsVerticalScrollIndicator={false}
                />
              ) : searchQuery ? (
                <View style={styles.noResultsContainer}>
                  <Text style={[styles.noResultsText, { color: colors.textSecondary }]}>
                    No results found for "{searchQuery}"
                  </Text>
                </View>
              ) : (
                <View style={styles.emptySearchContainer}>
                  <Text style={[styles.emptySearchText, { color: colors.textSecondary }]}>
                    Search for existing tasks, todos, events, notes, goals, or memories to link
                  </Text>
                </View>
              )}
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>

      {/* Custom Pomodoro Input Modal */}
      {showPomodoroInput && selectedItem && (
        <View style={styles.overlay}>
          <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Estimated Pomodoros
            </Text>
            <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
              How many Pomodoros do you estimate for "{selectedItem.title}"?
            </Text>
            
            <View style={styles.inputContainer}>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                value={pomodoroInput}
                onChangeText={setPomodoroInput}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={colors.textSecondary}
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.cancelButton,
                  { borderColor: colors.border, backgroundColor: colors.surface },
                ]}
                onPress={() => {
                  setShowPomodoroInput(false);
                  setSelectedItem(null);
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  styles.confirmButton,
                  { backgroundColor: colors.topBarBackground },
                ]}
                onPress={handleConfirmLink}
              >
                <Text style={[styles.modalButtonText, { color: colors.background }]}>
                  Link
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </>
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
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 12,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  activeTabButton: {
    borderColor: 'transparent',
  },
  tabButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  createContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 80,
  },
  pomodoroStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stepperButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  stepperValue: {
    fontSize: 18,
    fontWeight: '600',
    minWidth: 30,
    textAlign: 'center',
  },
  createButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  linkContent: {
    flex: 1,
    paddingHorizontal: 24,
  },
  searchContainer: {
    marginBottom: 20,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  searchResultsContainer: {
    flex: 1,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
  },
  searchResultsList: {
    paddingBottom: 20,
  },
  searchResultItem: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  searchResultType: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  searchResultTypeText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  searchResultContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  searchResultDueDate: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  noResultsContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  noResultsText: {
    fontSize: 16,
    textAlign: 'center',
  },
  emptySearchContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptySearchText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
  overlay: {
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
  modalContainer: {
    width: '80%',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 24,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 18,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  cancelButton: {
    borderWidth: 1,
  },
  confirmButton: {
    // No specific styles needed, backgroundColor is handled by modalButton
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
