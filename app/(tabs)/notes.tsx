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

import { NotesIcon } from '@/components/ui/NotesIcon';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface Note {
  id: string;
  title: string;
  content: string;
  category: 'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other';
  createdAt: Date;
  updatedAt: Date;
  tags?: string[];
}

export default function NotesScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack, navigationStack } = usePreviousScreen();
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // New note form state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other'>('personal');

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    console.log('Notes screen mounting, adding to stack');
    addToStack('notes');
  }, [addToStack]);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    try {
      const savedNotes = await AsyncStorage.getItem('notes');
      if (savedNotes) {
        setNotes(JSON.parse(savedNotes));
      }
    } catch (error) {
      console.error('Error loading notes:', error);
    }
  };

  const saveNotes = async (updatedNotes: Note[]) => {
    try {
      await AsyncStorage.setItem('notes', JSON.stringify(updatedNotes));
    } catch (error) {
      console.error('Error saving notes:', error);
    }
  };

  const handleAddNote = () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      Alert.alert('Empty Note', 'Please enter both title and content.');
      return;
    }

    const newNote: Note = {
      id: Date.now().toString(),
      title: newNoteTitle.trim(),
      content: newNoteContent.trim(),
      category: newNoteCategory,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const updatedNotes = [newNote, ...notes];
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    
    setNewNoteTitle('');
    setNewNoteContent('');
    setNewNoteCategory('personal');
    setShowAddNote(false);
  };

  const handleUpdateNote = (noteId: string, updatedTitle: string, updatedContent: string) => {
    const updatedNotes = notes.map(note => {
      if (note.id === noteId) {
        return {
          ...note,
          title: updatedTitle,
          content: updatedContent,
          updatedAt: new Date(),
        };
      }
      return note;
    });
    setNotes(updatedNotes);
    saveNotes(updatedNotes);
    setSelectedNote(null);
  };

  const handleDeleteNote = (noteId: string) => {
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedNotes = notes.filter(note => note.id !== noteId);
            setNotes(updatedNotes);
            saveNotes(updatedNotes);
            setSelectedNote(null);
          },
        },
      ]
    );
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return '#ff6b6b';
      case 'work': return '#4ecdc4';
      case 'ideas': return '#ffa502';
      case 'journal': return '#45b7d1';
      case 'learning': return '#2ed573';
      case 'other': return '#a55eea';
      default: return colors.text;
    }
  };

  const getFilteredNotes = () => {
    let filtered = notes;
    
    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(note => note.category === selectedCategory);
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(note => 
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  };

  const categories = [
    { id: 'all', name: 'All', color: colors.text },
    { id: 'personal', name: 'Personal', color: '#ff6b6b' },
    { id: 'work', name: 'Work', color: '#4ecdc4' },
    { id: 'ideas', name: 'Ideas', color: '#ffa502' },
    { id: 'journal', name: 'Journal', color: '#45b7d1' },
    { id: 'learning', name: 'Learning', color: '#2ed573' },
    { id: 'other', name: 'Other', color: '#a55eea' },
  ];

  const filteredNotes = getFilteredNotes();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Notes" onBack={() => {
        console.log('Notes back button pressed');
        console.log('Current navigation stack:', navigationStack);
        handleBack('menu');
      }} showSettings={true} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={[styles.searchInput, { 
            backgroundColor: colors.surface,
            color: colors.text,
            borderColor: colors.border 
          }]}
          placeholder="Search notes..."
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      {/* Category Filter */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoryContainer}
        contentContainerStyle={styles.categoryContent}
      >
        {categories.map((category) => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryButton,
              { 
                backgroundColor: selectedCategory === category.id ? category.color : colors.surface,
                borderColor: colors.border 
              }
            ]}
            onPress={() => setSelectedCategory(category.id)}
          >
            <Text style={[
              styles.categoryButtonText,
              { color: selectedCategory === category.id ? '#fff' : colors.text }
            ]}>
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Add Note Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => setShowAddNote(true)}
        >
          <Text style={[styles.addButtonText, { color: colors.buttonText }]}>+ New Note</Text>
        </TouchableOpacity>
      </View>

      {/* Notes List */}
      <ScrollView style={styles.notesContainer} showsVerticalScrollIndicator={false}>
        {filteredNotes.length === 0 ? (
          <View style={styles.emptyState}>
            <NotesIcon size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              {searchQuery.trim() ? 'No notes found matching your search.' : 'No notes yet. Create your first note!'}
            </Text>
          </View>
        ) : (
          filteredNotes.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={[styles.noteCard, { 
                backgroundColor: colors.cardBackground,
                borderColor: colors.border 
              }]}
              onPress={() => setSelectedNote(note)}
            >
              <View style={styles.noteHeader}>
                <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(note.category) }]} />
                <Text style={[styles.noteTitle, { color: colors.text }]}>
                  {note.title}
                </Text>
                <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
                  {new Date(note.updatedAt).toLocaleDateString()}
                </Text>
              </View>
              
              <Text style={[styles.notePreview, { color: colors.textSecondary }]}>
                {note.content.length > 100 ? `${note.content.substring(0, 100)}...` : note.content}
              </Text>
              
              <View style={styles.noteMeta}>
                <Text style={[styles.noteCategory, { color: getCategoryColor(note.category) }]}>
                  {note.category}
                </Text>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Note Modal */}
      {showAddNote && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Create New Note</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Note title"
              placeholderTextColor={colors.textSecondary}
              value={newNoteTitle}
              onChangeText={setNewNoteTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Write your note here..."
              placeholderTextColor={colors.textSecondary}
              value={newNoteContent}
              onChangeText={setNewNoteContent}
              multiline
              numberOfLines={8}
              textAlignVertical="top"
            />
            
            <View style={styles.categoryContainer}>
              <Text style={[styles.categoryLabel, { color: colors.text }]}>Category:</Text>
              <View style={styles.categoryButtons}>
                {(['personal', 'work', 'ideas', 'journal', 'learning', 'other'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { 
                        backgroundColor: newNoteCategory === category ? getCategoryColor(category) : colors.cardBackground,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setNewNoteCategory(category)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: newNoteCategory === category ? '#fff' : colors.text }
                    ]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddNote(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addNoteButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddNote}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Create Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Note Detail Modal */}
      {selectedNote && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Note</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedNote(null)}
              >
                <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Note title"
              placeholderTextColor={colors.textSecondary}
              value={selectedNote.title}
              onChangeText={(text) => setSelectedNote({ ...selectedNote, title: text })}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Note content"
              placeholderTextColor={colors.textSecondary}
              value={selectedNote.content}
              onChangeText={(text) => setSelectedNote({ ...selectedNote, content: text })}
              multiline
              numberOfLines={10}
              textAlignVertical="top"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.deleteButton, { borderColor: '#ff4757' }]}
                onPress={() => handleDeleteNote(selectedNote.id)}
              >
                <Text style={[styles.modalButtonText, { color: '#ff4757' }]}>Delete</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton, { backgroundColor: colors.buttonBackground }]}
                onPress={() => handleUpdateNote(selectedNote.id, selectedNote.title, selectedNote.content)}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Save Changes</Text>
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
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
  },
  categoryContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  categoryContent: {
    paddingRight: 20,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  addButtonContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  addButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  notesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noteCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  notePreview: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 20,
  },
  noteMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteCategory: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
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
    height: 120,
    textAlignVertical: 'top',
  },
  categoryLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  categoryButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
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
  addNoteButton: {
    marginLeft: 8,
  },
  deleteButton: {
    borderWidth: 1,
  },
  saveButton: {
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
}); 