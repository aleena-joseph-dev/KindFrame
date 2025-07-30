import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { CameraIcon } from '../../components/ui/CameraIcon';
import { FilmIcon } from '../../components/ui/FilmIcon';
import { usePreviousScreen } from '../../components/ui/PreviousScreenContext';
import { SparklesIcon } from '../../components/ui/SparklesIcon';
import { StarIcon } from '../../components/ui/StarIcon';
import { TopBar } from '../../components/ui/TopBar';
import { SensoryColors } from '../../constants/Colors';
import { useSensoryMode } from '../../contexts/SensoryModeContext';

interface CoreMemory {
  id: string;
  title: string;
  description: string;
  photoUri?: string;
  date: string;
  emotions: string[];
  createdAt: string;
}

type SortOption = 'newest' | 'oldest' | 'emotion';

export default function CoreMemoryScreen() {
  const { mode } = useSensoryMode();
  const colors = SensoryColors[mode];
  const { addToStack, handleBack } = usePreviousScreen();
  
  const [memories, setMemories] = useState<CoreMemory[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSlideshow, setShowSlideshow] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<CoreMemory | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [filterEmotion, setFilterEmotion] = useState<string>('');
  
  // Slideshow state
  const [currentSlideshowIndex, setCurrentSlideshowIndex] = useState(0);
  const slideshowIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [photoUri, setPhotoUri] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedEmotions, setSelectedEmotions] = useState<string[]>([]);
  
  const availableEmotions = [
    'Happy', 'Joyful', 'Peaceful', 'Grateful', 'Excited',
    'Sad', 'Melancholy', 'Nostalgic', 'Calm', 'Inspired',
    'Loved', 'Proud', 'Surprised', 'Curious', 'Hopeful'
  ];

  useEffect(() => {
    addToStack('core-memory');
    loadMemories();
  }, []);

  // Slideshow functionality
  useEffect(() => {
    if (showSlideshow && memories.length > 0) {
      slideshowIntervalRef.current = setInterval(() => {
        setCurrentSlideshowIndex(prev => (prev + 1) % memories.length);
      }, 3000); // Change slide every 3 seconds
    } else {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current);
        slideshowIntervalRef.current = null;
      }
    }

    return () => {
      if (slideshowIntervalRef.current) {
        clearInterval(slideshowIntervalRef.current);
      }
    };
  }, [showSlideshow, memories.length]);

  const startSlideshow = () => {
    setCurrentSlideshowIndex(0);
    setShowSlideshow(true);
  };

  const stopSlideshow = () => {
    setShowSlideshow(false);
    setCurrentSlideshowIndex(0);
  };

  const nextSlide = () => {
    setCurrentSlideshowIndex(prev => (prev + 1) % memories.length);
  };

  const previousSlide = () => {
    setCurrentSlideshowIndex(prev => (prev - 1 + memories.length) % memories.length);
  };

  const loadMemories = async () => {
    try {
      const stored = await AsyncStorage.getItem('coreMemories');
      if (stored) {
        setMemories(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading memories:', error);
    }
  };

  const saveMemories = async (newMemories: CoreMemory[]) => {
    try {
      await AsyncStorage.setItem('coreMemories', JSON.stringify(newMemories));
      setMemories(newMemories);
    } catch (error) {
      console.error('Error saving memories:', error);
    }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  const addMemory = () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please add a title for your memory.');
      return;
    }

    const newMemory: CoreMemory = {
      id: Date.now().toString(),
      title: title.trim(),
      description: description.trim(),
      photoUri,
      date: selectedDate,
      emotions: selectedEmotions,
      createdAt: new Date().toISOString(),
    };

    const updatedMemories = [newMemory, ...memories];
    saveMemories(updatedMemories);
    
    // Reset form
    setTitle('');
    setDescription('');
    setPhotoUri('');
    setSelectedDate(new Date().toISOString().split('T')[0]);
    setSelectedEmotions([]);
    setShowAddModal(false);
    
    Alert.alert('Success', 'Core memory added successfully!');
  };

  const deleteMemory = (memoryId: string) => {
    Alert.alert(
      'Delete Memory',
      'Are you sure you want to delete this memory? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedMemories = memories.filter(m => m.id !== memoryId);
            saveMemories(updatedMemories);
            setShowDetailModal(false);
            setSelectedMemory(null);
          },
        },
      ]
    );
  };

  const toggleEmotion = (emotion: string) => {
    setSelectedEmotions(prev => 
      prev.includes(emotion) 
        ? prev.filter(e => e !== emotion)
        : [...prev, emotion]
    );
  };

  const getSortedMemories = () => {
    let filtered = memories;
    
    if (filterEmotion) {
      filtered = memories.filter(m => m.emotions.includes(filterEmotion));
    }
    
    switch (sortBy) {
      case 'newest':
        return filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case 'oldest':
        return filtered.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case 'emotion':
        return filtered.sort((a, b) => a.emotions[0]?.localeCompare(b.emotions[0] || ''));
      default:
        return filtered;
    }
  };

  const renderMemoryCard = (memory: CoreMemory) => (
    <TouchableOpacity
      key={memory.id}
      style={[styles.memoryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={() => {
        setSelectedMemory(memory);
        setShowDetailModal(true);
      }}
    >
      {memory.photoUri ? (
        <Image source={{ uri: memory.photoUri }} style={styles.memoryPhoto} />
      ) : (
        <View style={[styles.placeholderPhoto, { backgroundColor: colors.cardBackground }]}>
          <CameraIcon size={32} color={colors.textSecondary} />
        </View>
      )}
      
      <View style={styles.memoryInfo}>
        <Text style={[styles.memoryTitle, { color: colors.text }]} numberOfLines={2}>
          {memory.title}
        </Text>
        <Text style={[styles.memoryDate, { color: colors.textSecondary }]}>
          {new Date(memory.date).toLocaleDateString()}
        </Text>
        {memory.emotions.length > 0 && (
          <View style={styles.emotionTags}>
            {memory.emotions.slice(0, 2).map(emotion => (
              <View key={emotion} style={[styles.emotionTag, { backgroundColor: colors.primary + '20' }]}>
                <Text style={[styles.emotionText, { color: colors.primary }]}>
                  {emotion}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  const renderSlideshow = () => (
    <Modal
      visible={showSlideshow}
      animationType="fade"
      presentationStyle="fullScreen"
    >
      <View style={[styles.slideshowContainer, { backgroundColor: colors.background }]}>
        <TopBar
          title="Memory Slideshow"
          onBack={stopSlideshow}
        />
        
        {memories.length > 0 && (
          <View style={styles.slideshowContent}>
            <View style={styles.slideshowImageContainer}>
              {memories[currentSlideshowIndex].photoUri ? (
                <Image 
                  source={{ uri: memories[currentSlideshowIndex].photoUri }} 
                  style={styles.slideshowImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={[styles.slideshowPlaceholder, { backgroundColor: colors.cardBackground }]}>
                  <CameraIcon size={64} color={colors.textSecondary} />
                </View>
              )}
            </View>
            
            <View style={styles.slideshowInfo}>
              <Text style={[styles.slideshowTitle, { color: colors.text }]}>
                {memories[currentSlideshowIndex].title}
              </Text>
              
              <Text style={[styles.slideshowDate, { color: colors.textSecondary }]}>
                {new Date(memories[currentSlideshowIndex].date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              
              {memories[currentSlideshowIndex].description && (
                <Text style={[styles.slideshowDescription, { color: colors.text }]}>
                  {memories[currentSlideshowIndex].description}
                </Text>
              )}
              
              {memories[currentSlideshowIndex].emotions.length > 0 && (
                <View style={styles.slideshowEmotions}>
                  {memories[currentSlideshowIndex].emotions.map(emotion => (
                    <View key={emotion} style={[styles.emotionTag, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.emotionText, { color: colors.primary }]}>
                        {emotion}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
            
            <View style={styles.slideshowControls}>
              <TouchableOpacity
                style={[styles.slideshowButton, { backgroundColor: colors.primary }]}
                onPress={previousSlide}
              >
                <Text style={[styles.slideshowButtonText, { color: colors.buttonText }]}>‹</Text>
              </TouchableOpacity>
              
              <Text style={[styles.slideshowCounter, { color: colors.text }]}>
                {slideshowCounterText}
              </Text>
              
              <TouchableOpacity
                style={[styles.slideshowButton, { backgroundColor: colors.primary }]}
                onPress={nextSlide}
              >
                <Text style={[styles.slideshowButtonText, { color: colors.buttonText }]}>›</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );

  const renderDetailView = () => (
    <Modal
      visible={showDetailModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.detailContainer, { backgroundColor: colors.background }]}>
        <TopBar
          title="Memory Details"
          onBack={() => {
            setShowDetailModal(false);
            setSelectedMemory(null);
          }}
        />
        
        {selectedMemory && (
          <ScrollView style={styles.detailContent}>
            {selectedMemory.photoUri ? (
              <Image source={{ uri: selectedMemory.photoUri }} style={styles.detailPhoto} />
            ) : (
              <View style={[styles.detailPlaceholder, { backgroundColor: colors.cardBackground }]}>
                <CameraIcon size={64} color={colors.textSecondary} />
              </View>
            )}
            
            <View style={styles.detailInfo}>
              <Text style={[styles.detailTitle, { color: colors.text }]}>
                {selectedMemory.title}
              </Text>
              
              <Text style={[styles.detailDate, { color: colors.textSecondary }]}>
                {new Date(selectedMemory.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </Text>
              
              {selectedMemory.description && (
                <Text style={[styles.detailDescription, { color: colors.text }]}>
                  {selectedMemory.description}
                </Text>
              )}
              
              {selectedMemory.emotions.length > 0 && (
                <View style={styles.detailEmotions}>
                  <Text style={[styles.emotionsLabel, { color: colors.text }]}>
                    Emotions:
                  </Text>
                  <View style={styles.emotionsList}>
                    {selectedMemory.emotions.map(emotion => (
                      <View key={emotion} style={[styles.emotionTag, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.emotionText, { color: colors.primary }]}>
                          {emotion}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </View>
            
            <View style={styles.detailActions}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  setShowDetailModal(false);
                  setSelectedMemory(null);
                }}
              >
                <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
                  Close
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#ef4444' }]}
                onPress={() => deleteMemory(selectedMemory.id)}
              >
                <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
                  Delete
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}
      </View>
    </Modal>
  );

  const renderAddModal = () => (
    <Modal
      visible={showAddModal}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.addContainer, { backgroundColor: colors.background }]}>
        <TopBar
          title="Add Core Memory"
          onBack={() => setShowAddModal(false)}
        />
        
        <ScrollView style={styles.addContent}>
          <Text style={[styles.addLabel, { color: colors.text }]}>
            Title *
          </Text>
          <TextInput
            style={[styles.addInput, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border,
              color: colors.text 
            }]}
            value={title}
            onChangeText={setTitle}
            placeholder="What's this memory about?"
            placeholderTextColor={colors.textSecondary}
          />
          
          <Text style={[styles.addLabel, { color: colors.text }]}>
            Description
          </Text>
          <TextInput
            style={[styles.addTextArea, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border,
              color: colors.text,
              textAlignVertical: 'top' as const
            }]}
            value={description}
            onChangeText={setDescription}
            placeholder="Tell the story of this memory..."
            placeholderTextColor={colors.textSecondary}
            multiline
            numberOfLines={4}
          />
          
          <Text style={[styles.addLabel, { color: colors.text }]}>
            Photo
          </Text>
          <TouchableOpacity
            style={[styles.photoButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={pickImage}
          >
            {photoUri ? (
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            ) : (
              <View style={styles.photoPlaceholder}>
                <CameraIcon size={32} color={colors.textSecondary} />
                <Text style={[styles.photoText, { color: colors.textSecondary }]}>
                  Add Photo
                </Text>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={[styles.addLabel, { color: colors.text }]}>
            Date
          </Text>
          <TextInput
            style={[styles.addInput, { 
              backgroundColor: colors.surface, 
              borderColor: colors.border,
              color: colors.text 
            }]}
            value={selectedDate}
            onChangeText={setSelectedDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.textSecondary}
          />
          
          <Text style={[styles.addLabel, { color: colors.text }]}>
            Emotions
          </Text>
          <View style={styles.emotionsGrid}>
            {availableEmotions.map(emotion => (
              <TouchableOpacity
                key={emotion}
                style={[
                  styles.emotionButton,
                  { 
                    backgroundColor: selectedEmotions.includes(emotion) 
                      ? colors.primary 
                      : colors.surface,
                    borderColor: colors.border
                  }
                ]}
                onPress={() => toggleEmotion(emotion)}
              >
                <Text style={[
                  styles.emotionButtonText,
                  { 
                    color: selectedEmotions.includes(emotion) 
                      ? colors.buttonText 
                      : colors.text 
                  }
                ]}>
                  {emotion}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          <View style={styles.addActions}>
            <TouchableOpacity
              style={[styles.addButton, { backgroundColor: colors.primary }]}
              onPress={addMemory}
            >
              <Text style={[styles.addButtonText, { color: colors.buttonText }]}>
                Save Memory
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );

  const sortedMemories = getSortedMemories();
  const sortButtonText = `Sort: ${sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}`;
  const memoryCountText = `${memories.length} memory${memories.length !== 1 ? 'ies' : ''} captured`;
  const filterChipText = `${filterEmotion} ✕`;
  const slideshowCounterText = `${currentSlideshowIndex + 1} / ${memories.length}`;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar
        title="Core Memories"
        onBack={() => handleBack()}
      />
      
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          Your Precious Moments
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
          {memoryCountText}
        </Text>
      </View>
      
      <View style={styles.controls}>
        <View style={styles.sortFilter}>
          <TouchableOpacity
            style={[styles.filterButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => {
              const options = ['newest', 'oldest', 'emotion'];
              const currentIndex = options.indexOf(sortBy);
              const nextIndex = (currentIndex + 1) % options.length;
              setSortBy(options[nextIndex] as SortOption);
            }}
          >
            <Text style={[styles.filterButtonText, { color: colors.text }]}>
              Sort: {sortBy === 'newest' ? 'Newest' : sortBy === 'oldest' ? 'Oldest' : 'Emotion'}
            </Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <SparklesIcon size={16} color={colors.buttonText} />
            <Text style={[styles.actionButtonText, { color: colors.buttonText }]}>
              Add Memory
            </Text>
          </TouchableOpacity>
          
          {memories.length > 0 && (
            <TouchableOpacity
              style={[styles.actionButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={startSlideshow}
            >
              <FilmIcon size={16} color={colors.text} />
              <Text style={[styles.actionButtonText, { color: colors.text }]}>
                Slideshow
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      
      {memories.length === 0 ? (
        <View style={styles.emptyState}>
          <StarIcon size={64} color={colors.textSecondary} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No memories yet
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
            Start capturing your precious moments by adding your first core memory.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={[styles.emptyButtonText, { color: colors.buttonText }]}>
              Create Your First Memory
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView style={styles.memoriesList} showsVerticalScrollIndicator={false}>
          <View style={styles.memoriesGrid}>
            {sortedMemories.map(renderMemoryCard)}
          </View>
        </ScrollView>
      )}
      
      {renderAddModal()}
      {renderDetailView()}
      {renderSlideshow()}
    </View>
  );
}

const styles = {
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center' as const,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 16,
  },
  controls: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sortFilter: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: 16,
    gap: 12,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '600' as const,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600' as const,
  },
  actionButtons: {
    flexDirection: 'row' as const,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center' as const,
    borderWidth: 1,
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center' as const,
    marginBottom: 24,
    lineHeight: 24,
  },
  emptyButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
  memoriesList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  memoriesGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'space-between' as const,
    gap: 16,
  },
  memoryCard: {
    width: (Dimensions.get('window').width - 60) / 2,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memoryPhoto: {
    width: '100%' as const,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
  },
  placeholderPhoto: {
    width: '100%' as const,
    height: 120,
    borderRadius: 12,
    marginBottom: 12,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  memoryInfo: {
    gap: 4,
  },
  memoryTitle: {
    fontSize: 14,
    fontWeight: '600' as const,
    marginBottom: 4,
  },
  memoryDate: {
    fontSize: 12,
    marginBottom: 8,
  },
  emotionTags: {
    flexDirection: 'row' as const,
    gap: 4,
  },
  emotionTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  emotionText: {
    fontSize: 10,
    fontWeight: '500' as const,
  },
  addContainer: {
    flex: 1,
  },
  addContent: {
    padding: 20,
  },
  addLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
    marginTop: 16,
  },
  addInput: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  addTextArea: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top' as const,
  },
  photoButton: {
    height: 120,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  photoPreview: {
    width: '100%' as const,
    height: '100%' as const,
    borderRadius: 12,
  },
  photoPlaceholder: {
    alignItems: 'center' as const,
  },
  photoText: {
    fontSize: 14,
    marginTop: 8,
  },
  emotionsGrid: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
    marginTop: 8,
  },
  emotionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  emotionButtonText: {
    fontSize: 12,
    fontWeight: '500' as const,
  },
  addActions: {
    marginTop: 24,
  },
  addButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center' as const,
  },
  addButtonText: {
    fontSize: 18,
    fontWeight: '600' as const,
  },
  detailContainer: {
    flex: 1,
  },
  detailContent: {
    flex: 1,
  },
  detailPhoto: {
    width: '100%' as const,
    height: 300,
    resizeMode: 'cover' as const,
  },
  detailPlaceholder: {
    width: '100%' as const,
    height: 300,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  detailInfo: {
    padding: 20,
  },
  detailTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
  },
  detailDate: {
    fontSize: 16,
    marginBottom: 16,
  },
  detailDescription: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
  },
  detailEmotions: {
    marginTop: 16,
  },
  emotionsLabel: {
    fontSize: 16,
    fontWeight: '600' as const,
    marginBottom: 8,
  },
  emotionsList: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  detailActions: {
    flexDirection: 'row' as const,
    gap: 12,
    padding: 20,
    paddingTop: 0,
  },

  // Slideshow styles
  slideshowContainer: {
    flex: 1,
  },
  slideshowContent: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: 20,
  },
  slideshowImageContainer: {
    width: '100%' as const,
    height: 300,
    borderRadius: 16,
    overflow: 'hidden' as const,
    marginBottom: 24,
  },
  slideshowImage: {
    width: '100%' as const,
    height: '100%' as const,
  },
  slideshowPlaceholder: {
    width: '100%' as const,
    height: '100%' as const,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  slideshowInfo: {
    alignItems: 'center' as const,
    marginBottom: 32,
  },
  slideshowTitle: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginBottom: 8,
    textAlign: 'center' as const,
  },
  slideshowDate: {
    fontSize: 16,
    marginBottom: 12,
  },
  slideshowDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center' as const,
    marginBottom: 16,
  },
  slideshowEmotions: {
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const,
    justifyContent: 'center' as const,
    gap: 8,
  },
  slideshowControls: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    gap: 20,
  },
  slideshowButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  slideshowButtonText: {
    fontSize: 24,
    fontWeight: '600' as const,
  },
  slideshowCounter: {
    fontSize: 16,
    fontWeight: '600' as const,
  },
}; 