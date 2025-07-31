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
import { TargetIcon } from '@/components/ui/TargetIcon';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';

interface Goal {
  id: string;
  title: string;
  description?: string;
  category: 'personal' | 'work' | 'health' | 'learning' | 'creative' | 'financial';
  priority: 'low' | 'medium' | 'high';
  status: 'active' | 'completed' | 'paused';
  targetDate?: string; // YYYY-MM-DD format
  progress: number; // 0-100
  milestones: Milestone[];
  createdAt: Date;
  completedAt?: Date;
}

interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export default function GoalsScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  
  // New goal form state
  const [newGoalTitle, setNewGoalTitle] = useState('');
  const [newGoalDescription, setNewGoalDescription] = useState('');
  const [newGoalCategory, setNewGoalCategory] = useState<'personal' | 'work' | 'health' | 'learning' | 'creative' | 'financial'>('personal');
  const [newGoalPriority, setNewGoalPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [newGoalTargetDate, setNewGoalTargetDate] = useState('');
  
  // New milestone form state
  const [newMilestoneTitle, setNewMilestoneTitle] = useState('');

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('goals');
  }, [addToStack]);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    try {
      const savedGoals = await AsyncStorage.getItem('goals');
      if (savedGoals) {
        setGoals(JSON.parse(savedGoals));
      }
    } catch (error) {
      console.error('Error loading goals:', error);
    }
  };

  const saveGoals = async (updatedGoals: Goal[]) => {
    try {
      await AsyncStorage.setItem('goals', JSON.stringify(updatedGoals));
    } catch (error) {
      console.error('Error saving goals:', error);
    }
  };

  const handleAddGoal = () => {
    if (!newGoalTitle.trim()) {
      Alert.alert('Empty Goal', 'Please enter a goal title.');
      return;
    }

    const newGoal: Goal = {
      id: Date.now().toString(),
      title: newGoalTitle.trim(),
      description: newGoalDescription.trim() || undefined,
      category: newGoalCategory,
      priority: newGoalPriority,
      status: 'active',
      targetDate: newGoalTargetDate || undefined,
      progress: 0,
      milestones: [],
      createdAt: new Date(),
    };

    const updatedGoals = [...goals, newGoal];
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
    
    setNewGoalTitle('');
    setNewGoalDescription('');
    setNewGoalCategory('personal');
    setNewGoalPriority('medium');
    setNewGoalTargetDate('');
    setShowAddGoal(false);
  };

  const handleUpdateProgress = (goalId: string, newProgress: number) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedGoal = { ...goal, progress: Math.max(0, Math.min(100, newProgress)) };
        if (updatedGoal.progress === 100 && goal.status !== 'completed') {
          updatedGoal.status = 'completed';
          updatedGoal.completedAt = new Date();
        }
        return updatedGoal;
      }
      return goal;
    });
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  const handleToggleGoalStatus = (goalId: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        if (goal.status === 'active') {
          return { ...goal, status: 'paused' as const };
        } else if (goal.status === 'paused') {
          return { ...goal, status: 'active' as const };
        }
      }
      return goal;
    });
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  const handleDeleteGoal = (goalId: string) => {
    Alert.alert(
      'Delete Goal',
      'Are you sure you want to delete this goal? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            const updatedGoals = goals.filter(goal => goal.id !== goalId);
            setGoals(updatedGoals);
            saveGoals(updatedGoals);
          },
        },
      ]
    );
  };

  const handleAddMilestone = () => {
    if (!selectedGoal || !newMilestoneTitle.trim()) {
      Alert.alert('Empty Milestone', 'Please enter a milestone title.');
      return;
    }

    const newMilestone: Milestone = {
      id: Date.now().toString(),
      title: newMilestoneTitle.trim(),
      completed: false,
      createdAt: new Date(),
    };

    const updatedGoals = goals.map(goal => {
      if (goal.id === selectedGoal.id) {
        return { ...goal, milestones: [...goal.milestones, newMilestone] };
      }
      return goal;
    });
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
    
    setNewMilestoneTitle('');
    setShowMilestoneModal(false);
  };

  const handleToggleMilestone = (goalId: string, milestoneId: string) => {
    const updatedGoals = goals.map(goal => {
      if (goal.id === goalId) {
        const updatedMilestones = goal.milestones.map(milestone => {
          if (milestone.id === milestoneId) {
            return {
              ...milestone,
              completed: !milestone.completed,
              completedAt: !milestone.completed ? new Date() : undefined,
            };
          }
          return milestone;
        });
        
        // Calculate new progress based on completed milestones
        const completedMilestones = updatedMilestones.filter(m => m.completed).length;
        const newProgress = updatedMilestones.length > 0 
          ? Math.round((completedMilestones / updatedMilestones.length) * 100)
          : goal.progress;
        
        return { ...goal, milestones: updatedMilestones, progress: newProgress };
      }
      return goal;
    });
    setGoals(updatedGoals);
    saveGoals(updatedGoals);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'personal': return '#ff6b6b';
      case 'work': return '#4ecdc4';
      case 'health': return '#2ed573';
      case 'learning': return '#ffa502';
      case 'creative': return '#45b7d1';
      case 'financial': return '#a55eea';
      default: return colors.text;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ff4757';
      case 'medium': return '#ffa502';
      case 'low': return '#2ed573';
      default: return '#747d8c';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#2ed573';
      case 'paused': return '#ffa502';
      case 'completed': return '#45b7d1';
      default: return '#747d8c';
    }
  };

  const getActiveGoals = () => goals.filter(goal => goal.status === 'active');
  const getCompletedGoals = () => goals.filter(goal => goal.status === 'completed');
  const getPausedGoals = () => goals.filter(goal => goal.status === 'paused');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <TopBar title="Goals" onBack={() => handleBack()} showSettings={true} />

      {/* Add Goal Button */}
      <View style={styles.addButtonContainer}>
        <TouchableOpacity
          style={[styles.addButton, { backgroundColor: colors.buttonBackground }]}
          onPress={() => setShowAddGoal(true)}
        >
          <Text style={[styles.addButtonText, { color: colors.buttonText }]}>+ Add Goal</Text>
        </TouchableOpacity>
      </View>

      {/* Goals List */}
      <ScrollView style={styles.goalsContainer} showsVerticalScrollIndicator={false}>
        {/* Active Goals */}
        {getActiveGoals().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Active Goals</Text>
            {getActiveGoals().map((goal) => (
              <View
                key={goal.id}
                style={[styles.goalCard, { 
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border 
                }]}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalInfo}>
                    <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(goal.category) }]} />
                    <Text style={[styles.goalTitle, { color: colors.text }]}>
                      {goal.title}
                    </Text>
                  </View>
                  <View style={styles.goalActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, { borderColor: colors.border }]}
                      onPress={() => setSelectedGoal(goal)}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, { borderColor: colors.border }]}
                      onPress={() => handleToggleGoalStatus(goal.id)}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.text }]}>Pause</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {goal.description && (
                  <Text style={[styles.goalDescription, { color: colors.textSecondary }]}>
                    {goal.description}
                  </Text>
                )}
                
                <View style={styles.goalMeta}>
                  <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(goal.priority) }]}>
                    <Text style={styles.priorityText}>{goal.priority}</Text>
                  </View>
                  {goal.targetDate && (
                    <Text style={[styles.targetDate, { color: colors.textSecondary }]}>
                      Due: {goal.targetDate}
                    </Text>
                  )}
                </View>
                
                <View style={styles.progressContainer}>
                  <View style={styles.progressHeader}>
                    <Text style={[styles.progressText, { color: colors.text }]}>
                      Progress: {goal.progress}%
                    </Text>
                    <Text style={[styles.milestoneText, { color: colors.textSecondary }]}>
                      {goal.milestones.filter(m => m.completed).length}/{goal.milestones.length} milestones
                    </Text>
                  </View>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          backgroundColor: getCategoryColor(goal.category),
                          width: `${goal.progress}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Paused Goals */}
        {getPausedGoals().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Paused Goals</Text>
            {getPausedGoals().map((goal) => (
              <View
                key={goal.id}
                style={[styles.goalCard, { 
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  opacity: 0.7
                }]}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalInfo}>
                    <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(goal.category) }]} />
                    <Text style={[styles.goalTitle, { color: colors.text }]}>
                      {goal.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => handleToggleGoalStatus(goal.id)}
                  >
                    <Text style={[styles.actionButtonText, { color: colors.text }]}>Resume</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.progressContainer}>
                  <Text style={[styles.progressText, { color: colors.text }]}>
                    Progress: {goal.progress}%
                  </Text>
                  <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                    <View 
                      style={[
                        styles.progressFill, 
                        { 
                          backgroundColor: getCategoryColor(goal.category),
                          width: `${goal.progress}%` 
                        }
                      ]} 
                    />
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Completed Goals */}
        {getCompletedGoals().length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Completed Goals</Text>
            {getCompletedGoals().map((goal) => (
              <View
                key={goal.id}
                style={[styles.goalCard, { 
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                  opacity: 0.8
                }]}
              >
                <View style={styles.goalHeader}>
                  <View style={styles.goalInfo}>
                    <View style={[styles.categoryIndicator, { backgroundColor: getCategoryColor(goal.category) }]} />
                    <Text style={[styles.goalTitle, { color: colors.text }]}>
                      {goal.title}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.actionButton, { borderColor: colors.border }]}
                    onPress={() => handleDeleteGoal(goal.id)}
                  >
                    <Text style={[styles.actionButtonText, { color: '#ff4757' }]}>Delete</Text>
                  </TouchableOpacity>
                </View>
                
                <Text style={[styles.completedText, { color: '#2ed573' }]}>
                  ✓ Completed on {goal.completedAt ? new Date(goal.completedAt).toLocaleDateString() : 'Unknown'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {goals.length === 0 && (
          <View style={styles.emptyState}>
            <TargetIcon size={64} color={colors.textSecondary} />
            <Text style={[styles.emptyStateText, { color: colors.textSecondary }]}>
              No goals yet. Create your first goal to get started!
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Add Goal Modal */}
      {showAddGoal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add New Goal</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Goal title"
              placeholderTextColor={colors.textSecondary}
              value={newGoalTitle}
              onChangeText={setNewGoalTitle}
            />
            
            <TextInput
              style={[styles.input, styles.textArea, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Description (optional)"
              placeholderTextColor={colors.textSecondary}
              value={newGoalDescription}
              onChangeText={setNewGoalDescription}
              multiline
              numberOfLines={3}
            />
            
            <View style={styles.categoryContainer}>
              <Text style={[styles.categoryLabel, { color: colors.text }]}>Category:</Text>
              <View style={styles.categoryButtons}>
                {(['personal', 'work', 'health', 'learning', 'creative', 'financial'] as const).map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.categoryButton,
                      { 
                        backgroundColor: newGoalCategory === category ? getCategoryColor(category) : colors.cardBackground,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setNewGoalCategory(category)}
                  >
                    <Text style={[
                      styles.categoryButtonText,
                      { color: newGoalCategory === category ? '#fff' : colors.text }
                    ]}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View style={styles.priorityContainer}>
              <Text style={[styles.priorityLabel, { color: colors.text }]}>Priority:</Text>
              <View style={styles.priorityButtons}>
                {(['low', 'medium', 'high'] as const).map((priority) => (
                  <TouchableOpacity
                    key={priority}
                    style={[
                      styles.priorityButton,
                      { 
                        backgroundColor: newGoalPriority === priority ? getPriorityColor(priority) : colors.cardBackground,
                        borderColor: colors.border 
                      }
                    ]}
                    onPress={() => setNewGoalPriority(priority)}
                  >
                    <Text style={[
                      styles.priorityButtonText,
                      { color: newGoalPriority === priority ? '#fff' : colors.text }
                    ]}>
                      {priority.charAt(0).toUpperCase() + priority.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Target date (YYYY-MM-DD) - optional"
              placeholderTextColor={colors.textSecondary}
              value={newGoalTargetDate}
              onChangeText={setNewGoalTargetDate}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowAddGoal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addGoalButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddGoal}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Add Goal</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Goal Detail Modal */}
      {selectedGoal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>{selectedGoal.title}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setSelectedGoal(null)}
              >
                <Text style={[styles.closeButtonText, { color: colors.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>
            
            {selectedGoal.description && (
              <Text style={[styles.goalDetailDescription, { color: colors.textSecondary }]}>
                {selectedGoal.description}
              </Text>
            )}
            
            <View style={styles.goalDetailMeta}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(selectedGoal.category) }]}>
                <Text style={styles.categoryText}>{selectedGoal.category}</Text>
              </View>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(selectedGoal.priority) }]}>
                <Text style={styles.priorityText}>{selectedGoal.priority}</Text>
              </View>
            </View>
            
            <View style={styles.progressContainer}>
              <Text style={[styles.progressText, { color: colors.text }]}>
                Progress: {selectedGoal.progress}%
              </Text>
              <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
                <View 
                  style={[
                    styles.progressFill, 
                    { 
                      backgroundColor: getCategoryColor(selectedGoal.category),
                      width: `${selectedGoal.progress}%` 
                    }
                  ]} 
                />
              </View>
            </View>
            
            <View style={styles.milestonesContainer}>
              <View style={styles.milestonesHeader}>
                <Text style={[styles.milestonesTitle, { color: colors.text }]}>Milestones</Text>
                <TouchableOpacity
                  style={[styles.addMilestoneButton, { backgroundColor: colors.buttonBackground }]}
                  onPress={() => setShowMilestoneModal(true)}
                >
                  <Text style={[styles.addMilestoneButtonText, { color: colors.buttonText }]}>+</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.milestonesList} showsVerticalScrollIndicator={false}>
                {selectedGoal.milestones.length === 0 ? (
                  <Text style={[styles.noMilestonesText, { color: colors.textSecondary }]}>
                    No milestones yet. Add your first milestone!
                  </Text>
                ) : (
                  selectedGoal.milestones.map((milestone) => (
                    <TouchableOpacity
                      key={milestone.id}
                      style={[styles.milestoneItem, { 
                        backgroundColor: colors.cardBackground,
                        borderColor: colors.border 
                      }]}
                      onPress={() => handleToggleMilestone(selectedGoal.id, milestone.id)}
                    >
                      <Text style={[
                        styles.milestoneTitle,
                        { 
                          color: milestone.completed ? colors.textSecondary : colors.text,
                          textDecorationLine: milestone.completed ? 'line-through' : 'none'
                        }
                      ]}>
                        {milestone.title}
                      </Text>
                      {milestone.completed && (
                        <Text style={[styles.milestoneCompleted, { color: '#2ed573' }]}>✓</Text>
                      )}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      )}

      {/* Add Milestone Modal */}
      {showMilestoneModal && (
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0, 0, 0, 0.5)' }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.surface }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Milestone</Text>
            
            <TextInput
              style={[styles.input, { 
                backgroundColor: colors.cardBackground,
                color: colors.text,
                borderColor: colors.border 
              }]}
              placeholder="Milestone title"
              placeholderTextColor={colors.textSecondary}
              value={newMilestoneTitle}
              onChangeText={setNewMilestoneTitle}
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton, { borderColor: colors.border }]}
                onPress={() => setShowMilestoneModal(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.addMilestoneButton, { backgroundColor: colors.buttonBackground }]}
                onPress={handleAddMilestone}
              >
                <Text style={[styles.modalButtonText, { color: colors.buttonText }]}>Add Milestone</Text>
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
  goalsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  goalCard: {
    marginBottom: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  goalActions: {
    flexDirection: 'row',
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    marginLeft: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  goalDescription: {
    fontSize: 14,
    marginBottom: 8,
  },
  goalMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginRight: 8,
  },
  priorityText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  targetDate: {
    fontSize: 12,
    fontWeight: '500',
  },
  progressContainer: {
    marginTop: 8,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  milestoneText: {
    fontSize: 12,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
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
  goalDetailDescription: {
    fontSize: 16,
    marginBottom: 16,
  },
  goalDetailMeta: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  categoryContainer: {
    marginBottom: 16,
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
  categoryButton: {
    width: '48%',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  priorityContainer: {
    marginBottom: 16,
  },
  priorityLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  priorityButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  priorityButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  priorityButtonText: {
    fontSize: 14,
    fontWeight: '500',
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
  addGoalButton: {
    marginLeft: 8,
  },
  addMilestoneButton: {
    marginLeft: 8,
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  milestonesContainer: {
    flex: 1,
  },
  milestonesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestonesTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  addMilestoneButtonIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addMilestoneButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  milestonesList: {
    flex: 1,
  },
  noMilestonesText: {
    textAlign: 'center',
    fontStyle: 'italic',
    marginTop: 20,
  },
  milestoneItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  milestoneTitle: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  milestoneCompleted: {
    fontSize: 16,
    fontWeight: 'bold',
  },
}); 