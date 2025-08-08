
import { useAuth } from '@/contexts/AuthContext';
import { useGuestData } from '@/contexts/GuestDataContext';
import { supabase } from '@/lib/supabase';
import { AuthService } from '@/services/authService';
import { DataService, Note as DatabaseNote } from '@/services/dataService';
import { GuestDataService } from '@/services/guestDataService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/Button';
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
  const themeResult = useThemeColors();
  const mode = themeResult.mode;
  const colors = themeResult.colors;
  
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack, navigationStack, resetStack } = usePreviousScreen();
  const { session, loading: authLoading } = useAuth();
  const { 
    savePendingAction,
    hasUnsavedData,
    triggerSaveWorkModal,
    showPrefilledForm,
    prefilledFormData,
    clearPrefilledForm
  } = useGuestData();
  
  // Check if user is in guest mode
  const isGuestMode = !session;
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [showAddNote, setShowAddNote] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // New note form state
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'personal' | 'work' | 'ideas' | 'journal' | 'learning' | 'other'>('personal');
  const [showGoogleKeepSync, setShowGoogleKeepSync] = useState(false);
  const [isGoogleKeepConnected, setIsGoogleKeepConnected] = useState(false);
  const [showSyncSuccess, setShowSyncSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [googleKeepNotes, setGoogleKeepNotes] = useState([]);
  const [showGoogleKeepModal, setShowGoogleKeepModal] = useState(false);

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('notes');
    
    // Check if user came through guest mode authentication flow
    // If so, reset the navigation stack to ensure proper back navigation
    const checkGuestModeFlow = async () => {
      try {
        const resetNavigationStack = await AsyncStorage.getItem('reset_navigation_stack');
        if (resetNavigationStack === 'true') {
          console.log('🎯 NOTES: User came through guest mode flow, resetting navigation stack');
          
          // Clear the flag first
          await AsyncStorage.removeItem('reset_navigation_stack');
          
          // Reset the navigation stack to ensure proper back navigation
          // The user should be able to go back: notes -> menu -> home
          resetStack();
          console.log('🎯 NOTES: Navigation stack reset for guest mode flow');
          
          // Add the current screen to the reset stack
          addToStack('notes');
        }
      } catch (error) {
        console.error('🎯 NOTES: Error checking guest mode flow:', error);
      }
    };
    
    checkGuestModeFlow();
  }, [addToStack]);

  useEffect(() => {
    loadNotes();
    checkGoogleKeepConnection();
  }, [session, selectedCategory]); // Re-check when session or category changes

  // Handle pre-filled form data
  useEffect(() => {
    if (showPrefilledForm && prefilledFormData && prefilledFormData.type === 'note') {
      console.log('🎯 NOTES: Showing pre-filled form with data:', prefilledFormData);
      
      // Pre-fill the form with the saved data
      const formState = prefilledFormData.formState as any;
      setNewNoteTitle(formState.newNoteTitle || '');
      setNewNoteContent(formState.newNoteContent || '');
      setNewNoteCategory(formState.newNoteCategory || 'personal');
      
      // Show the modal
      setShowAddNote(true);
      
      // Clear the pre-filled form data
      clearPrefilledForm();
    }
  }, [showPrefilledForm, prefilledFormData, clearPrefilledForm]);

  // Load synced Google Keep notes when connection status changes
  useEffect(() => {
    if (isGoogleKeepConnected) {
      loadSyncedKeepNotes();
      setShowSyncSuccess(true);
    }
  }, [isGoogleKeepConnected]);

  const loadNotes = async () => {
    try {
      setIsLoading(true);
      
      // If user is in guest mode, don't try to load from database
      if (isGuestMode && !session) {
        console.log('🎯 GUEST MODE: Skipping notes load from database');
        setNotes([]);
        return;
      }
      
      const result = await DataService.getNotes(50, 0, selectedCategory === 'all' ? undefined : selectedCategory);
      if (result.success && result.data) {
        // Convert database notes to local note format
        const convertedNotes = (result.data as DatabaseNote[]).map(dbNote => ({
          id: dbNote.id,
          title: dbNote.title,
          content: dbNote.content || '',
          category: dbNote.category || 'personal',
          createdAt: new Date(dbNote.created_at),
          updatedAt: new Date(dbNote.updated_at),
          tags: dbNote.tags || []
        }));
        setNotes(convertedNotes);
      } else {
        setNotes([]);
      }
    } catch (error) {
      setNotes([]);
    } finally {
      setIsLoading(false);
    }
  };

  const saveNotes = async (updatedNotes: Note[]) => {
    try {
      // This function is now handled by individual CRUD operations
      // We'll update the database directly in handleAddNote, handleUpdateNote, etc.
    } catch (error) {
      // Handle error silently
    }
  };

  // Google Keep Integration
  const checkGoogleKeepConnection = async () => {
    try {
      // Get provider token from localStorage (Notes/Keep-specific)
      const providerToken = localStorage.getItem('google_keep_token');
      
      // Check if user has a Supabase session and provider token
      if (session && session.user && providerToken) {
        setIsGoogleKeepConnected(true);
        
        // If connected, fetch notes
        fetchGoogleKeepNotes();
      } else if (session && session.user) {
        setIsGoogleKeepConnected(false);
      } else {
        setIsGoogleKeepConnected(false);
      }
    } catch (error) {
      setIsGoogleKeepConnected(false);
    }
  };

  const fetchGoogleKeepNotes = async () => {
    try {
      setIsLoading(true);
      
      // Use AuthService to fetch Google Keep notes
      const notes = await AuthService.fetchGoogleKeepNotes();
      
      setGoogleKeepNotes(notes);
      
      // Sync notes to database using DataService
      try {
        const syncResult = await DataService.syncGoogleKeepNotes(notes);
        if (syncResult.success) {
          const syncedNotes = syncResult.data as DatabaseNote[];
          // Reload notes from database to show synced notes
          await loadNotes();
        }
      } catch (syncError) {
        // Handle sync error silently
      }
    } catch (error) {
      setGoogleKeepNotes([]);
      
      // If the API call fails, it might mean the token is invalid
      // Check if the error is related to authentication
      if (error.message && error.message.includes('No Google access token found')) {
        setIsGoogleKeepConnected(false);
        // Clear the invalid token
        localStorage.removeItem('google_keep_token');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleKeepSync = () => {
    if (isGoogleKeepConnected) {
      // Google Keep already connected
    } else {
      setShowGoogleKeepSync(true);
    }
  };

  const handleSyncKeep = () => {
    if (isGoogleKeepConnected) {
      fetchGoogleKeepNotes();
    } else {
      setShowGoogleKeepModal(true);
    }
  };

  const handleRefreshKeep = async () => {
    try {
      setIsLoading(true);
      
      // Fetch fresh Google Keep notes using the existing function
      await fetchGoogleKeepNotes();
      
      // Also reload local notes from database
      await loadNotes();
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectGoogleKeep = async () => {
    try {
      setShowGoogleKeepModal(false);
      setIsLoading(true);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.metadata.readonly https://www.googleapis.com/auth/documents.readonly',
          redirectTo: window.location.origin + '/auth-callback?state=notes',
          queryParams: {
            prompt: 'consent', // Force consent screen even if user is already authenticated
            access_type: 'offline'
          }
        }
      });
      
      if (error) {
        setIsLoading(false);
      }
      // The OAuth flow will redirect to auth-callback
    } catch (error) {
      setIsLoading(false);
    }
  };

  const handleLaterGoogleKeep = () => {
    setShowGoogleKeepSync(false);
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear provider token from localStorage
      localStorage.removeItem('google_provider_token');
      setIsGoogleKeepConnected(false);
      setGoogleKeepNotes([]);
    } catch (error) {
      // Handle error silently
    }
  };

  // Removed checkLastOAuthUrlDebug function to avoid AuthService dependency

  // Load synced Google Keep notes
  const loadSyncedKeepNotes = async () => {
    try {
      // Use our server API directly
      await fetchGoogleKeepNotes();
    } catch (error) {
      // Handle error silently
    }
  };

  const handleAddNote = async () => {
    if (!newNoteTitle.trim() || !newNoteContent.trim()) {
      return;
    }

    try {
      setIsLoading(true);
      
      // If user is in guest mode, save to local storage and show save work modal
      if (isGuestMode) {
        const actionData = {
          type: 'note' as const,
          page: '/notes',
          data: {
            title: newNoteTitle.trim(),
            content: newNoteContent.trim(),
            category: newNoteCategory,
            tags: []
          },
          timestamp: Date.now(),
          formState: {
            newNoteTitle,
            newNoteContent,
            newNoteCategory
          }
        };
        
        console.log('🎯 NOTES: Starting to save note for guest user');
        
        // Save to local storage first and wait for it to complete
        await savePendingAction(actionData);
        
        // Verify the data was saved before showing modal
        const hasData = await GuestDataService.hasUnsavedData();
        console.log('🎯 NOTES: After savePendingAction - hasUnsavedData:', hasData);
        
        if (!hasData) {
          console.error('🎯 NOTES: Data was not saved properly, retrying...');
          // Retry once
          await savePendingAction(actionData);
          const retryHasData = await GuestDataService.hasUnsavedData();
          console.log('🎯 NOTES: After retry - hasUnsavedData:', retryHasData);
        }
        
        // Then show the save work modal
        console.log('🎯 NOTES: Showing save work modal');
        triggerSaveWorkModal('note', actionData);
        return;
      }

      // For authenticated users, save to database
      const result = await DataService.createNote({
        title: newNoteTitle.trim(),
        content: newNoteContent.trim(),
        category: newNoteCategory,
        tags: []
      });

      if (result && result.success && result.data) {
        // Convert database note to local note format
        const dbNote = result.data as DatabaseNote;
        const newNote: Note = {
          id: dbNote.id,
          title: dbNote.title,
          content: dbNote.content || '',
          category: dbNote.category || 'personal',
          createdAt: new Date(dbNote.created_at),
          updatedAt: new Date(dbNote.updated_at),
          tags: dbNote.tags || []
        };

        const updatedNotes = [newNote, ...notes];
        setNotes(updatedNotes);
        
        setNewNoteTitle('');
        setNewNoteContent('');
        setNewNoteCategory('personal');
        setShowAddNote(false);
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateNote = async (noteId: string, updatedTitle: string, updatedContent: string) => {
    try {
      setIsLoading(true);
      
      // For now, only handle authenticated users for updates
      if (isGuestMode) {
        Alert.alert('Info', 'Note updates are only available for signed-in users.');
        return;
      }

      const result = await DataService.updateNote(noteId, {
        title: updatedTitle,
        content: updatedContent
      });

      if (result.success && result.data) {
        const dbNote = result.data as DatabaseNote;
        const updatedNotes = notes.map(note => {
          if (note.id === noteId) {
            return {
              ...note,
              title: dbNote.title,
              content: dbNote.content || '',
              updatedAt: new Date(dbNote.updated_at),
            };
          }
          return note;
        });
        setNotes(updatedNotes);
        setSelectedNote(null);
      } else {
        // Handle error silently
      }
    } catch (error) {
      // Handle error silently
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteNote = (noteId: string) => {
    const deleteNoteAsync = async () => {
      try {
        setIsLoading(true);
        
        // For now, only handle authenticated users for deletes
        if (isGuestMode) {
          Alert.alert('Info', 'Note deletion is only available for signed-in users.');
          return;
        }

        const result = await DataService.deleteNote(noteId);
        
        if (result.success) {
          const updatedNotes = notes.filter(note => note.id !== noteId);
          setNotes(updatedNotes);
          setSelectedNote(null);
        } else {
          // Handle error silently
        }
      } catch (error) {
        // Handle error silently
      } finally {
        setIsLoading(false);
      }
    };
    
    deleteNoteAsync();
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

  const formatNoteContent = (note) => {
    if (note.textContent) {
      return note.textContent.content;
    }
    if (note.listContent) {
      return note.listContent.listItems?.map(item => 
        `${item.isChecked ? '☑' : '☐'} ${item.text?.content || ''}`
      ).join('\n') || '';
    }
    return 'No content';
  };

  const formatNoteDate = (timestamp) => {
    if (!timestamp) return 'Unknown date';
    const date = new Date(timestamp);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar 
        title="Notes" 
        onBack={() => {
          handleBack('menu');
        }} 
        showSettings={true}
        syncButton={{
          label: "Sync Keep",
          onPress: handleGoogleKeepSync,
          isConnected: isGoogleKeepConnected
        }}
      />
      

      
      {/* Sync Success Banner */}
      {showSyncSuccess && (
        <View style={[styles.successBanner, { backgroundColor: colors.primary }]}>
          <Text style={[styles.successText, { color: colors.background }]}>
            ✅ Google Keep synced successfully! Your notes are now available.
          </Text>
          <TouchableOpacity 
            onPress={() => setShowSyncSuccess(false)}
            style={styles.closeButton}
          >
            <Text style={[styles.closeButtonText, { color: colors.background }]}>×</Text>
          </TouchableOpacity>
        </View>
      )}

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

      {/* Google Keep Notes Section */}
      {isGoogleKeepConnected && (
        <View style={styles.googleKeepSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.googleKeepSectionTitle, { color: colors.text }]}>Google Keep Notes</Text>
            <TouchableOpacity
              style={[styles.syncButton, { backgroundColor: colors.primary }]}
              onPress={fetchGoogleKeepNotes}
            >
              <Text style={[styles.syncButtonText, { color: colors.background }]}>
                {isLoading ? 'Syncing...' : 'Sync'}
              </Text>
            </TouchableOpacity>
          </View>
          
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notes...</Text>
            </View>
          ) : googleKeepNotes.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.googleKeepNotesContainer}>
              {googleKeepNotes.map((note) => (
                <View key={note.id} style={[styles.googleKeepNoteCard, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.googleKeepNoteTitle, { color: colors.text }]}>
                    {note.title || 'Untitled Note'}
                  </Text>
                  <Text style={[styles.googleKeepNoteContent, { color: colors.textSecondary }]} numberOfLines={3}>
                    {formatNoteContent(note)}
                  </Text>
                  <Text style={[styles.googleKeepNoteDate, { color: colors.textSecondary }]}>
                    {formatNoteDate(note.userEditedTimestampUsec)}
                  </Text>
                  {note.labels && note.labels.length > 0 && (
                    <View style={styles.labelsContainer}>
                      {note.labels.map((label) => (
                        <Text key={label.name} style={[styles.label, { backgroundColor: colors.primary + '20', color: colors.primary }]}>
                          {label.name}
                        </Text>
                      ))}
                    </View>
                  )}
                </View>
              ))}
            </ScrollView>
          ) : (
            <Text style={[styles.noNotesText, { color: colors.textSecondary }]}>No Google Keep notes found</Text>
          )}
        </View>
      )}

      {/* Add Note Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => setShowAddNote(true)}
        >
          <Text style={[styles.addButtonText, { color: colors.buttonText }]}>+ New Note</Text>
        </TouchableOpacity>
      </View>

      {/* Local Notes Section */}
      <View style={styles.localNotesSection}>
        <Text style={[styles.googleKeepSectionTitle, { color: colors.text }]}>Local Notes</Text>
        
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
      </View>

      {/* Google Keep Sync Modal */}
      {showGoogleKeepSync && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Sync Google Keep</Text>
            <Text style={[styles.existingModalDescription, { color: colors.textSecondary }]}>
              Want to sync your notes with Google Keep/Notes for easy access? Connect now.
            </Text>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.existingConnectButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleConnectGoogleKeep}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Connect</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.laterButton, { borderColor: colors.border }]}
                onPress={handleLaterGoogleKeep}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Later</Text>
              </TouchableOpacity>
            </View>
            
            {/* Debug button removed */}
          </View>
        </View>
      )}

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

      {/* Google Keep Connection Modal */}
      <Modal
        visible={showGoogleKeepModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.googleKeepModalContainer}>
          <View style={styles.googleKeepModalHeader}>
            <Text style={styles.googleKeepModalTitle}>Connect Google Keep</Text>
            <Button 
              title="✕" 
              onPress={() => setShowGoogleKeepModal(false)}
              style={styles.googleKeepCloseButton}
            />
          </View>
          
          <View style={styles.googleKeepModalContent}>
            <Text style={styles.googleKeepModalDescription}>
              Connect your Google Keep account to sync your notes with KindFrame.
            </Text>
            
            <Button 
              title="Connect Google Keep" 
              onPress={() => {
                setShowGoogleKeepModal(false);
                
                // Construct Google OAuth URL directly
                const clientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID || '57453908124-1tr7r9f6uam0sojtkmt6k4qmdc8n7iv6.apps.googleusercontent.com';
                const redirectUri = 'http://localhost:8082/auth-callback'; // Hardcoded for now
                const scope = 'https://www.googleapis.com/auth/drive.readonly';
                const state = 'keep';
                
                console.log('🔍 OAuth URL construction:');
                console.log('🔍 clientId:', clientId);
                console.log('🔍 redirectUri:', redirectUri);
                console.log('🔍 scope:', scope);
                
                // Validate clientId
                if (!clientId) {
                  console.error('❌ ERROR: EXPO_PUBLIC_GOOGLE_CLIENT_ID is not defined!');
                  return;
                }
                
                // Build URL manually to avoid encoding issues
                const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&access_type=offline&prompt=consent&state=${state}&debug=notes-oauth-${Date.now()}`;
                
                console.log('🔍 Full OAuth URL:', oauthUrl);
                
                // Force a hard redirect
                window.location.replace(oauthUrl);
              }}
              style={styles.googleKeepConnectButton}
            />
          </View>
        </View>
      </Modal>


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
  existingModalDescription: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
  },
  existingConnectButton: {
    flex: 1,
  },
  laterButton: {
    flex: 1,
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
  },
  successText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
  },

  googleKeepModalContainer: {
    flex: 1,
    backgroundColor: '#e0e5de',
  },
  googleKeepModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  googleKeepModalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  googleKeepCloseButton: {
    backgroundColor: 'transparent',
    padding: 8,
  },
  googleKeepModalContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  googleKeepModalDescription: {
    fontSize: 16,
    color: '#7f8c8d',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 24,
  },
  googleKeepConnectButton: {
    backgroundColor: '#4285f4',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  // Google Keep Notes Section Styles
  googleKeepSection: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  googleKeepSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  syncButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  syncButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    fontSize: 14,
  },
  googleKeepNotesContainer: {
    marginBottom: 8,
  },
  googleKeepNoteCard: {
    width: 200,
    marginRight: 12,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  googleKeepNoteTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  googleKeepNoteContent: {
    fontSize: 14,
    marginBottom: 8,
    lineHeight: 18,
  },
  googleKeepNoteDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  labelsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  label: {
    fontSize: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  noNotesText: {
    textAlign: 'center',
    paddingVertical: 20,
    fontSize: 14,
  },
  localNotesSection: {
    flex: 1,
  },

}); 