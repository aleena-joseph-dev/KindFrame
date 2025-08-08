import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, Dimensions, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import AnimatedJotBoxIcon from '@/components/ui/AnimatedJotBoxIcon';
import { CalendarIcon } from '@/components/ui/CalendarIcon';
import { CheckIcon } from '@/components/ui/CheckIcon';
import { ChevronIcon } from '@/components/ui/ChevronDownIcon';
import { ClockIcon } from '@/components/ui/ClockIcon';
import { GuestModeIndicator } from '@/components/ui/GuestModeIndicator';
import { HeadphonesIcon } from '@/components/ui/HeadphonesIcon';
import { KanbanIcon } from '@/components/ui/KanbanIcon';
import MenuIcon from '@/components/ui/MenuIcon';
import { NotesIcon } from '@/components/ui/NotesIcon';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import ProfileIcon from '@/components/ui/ProfileIcon';
import { SearchIcon } from '@/components/ui/SearchIcon';
import SettingsIcon from '@/components/ui/SettingsIcon';
import { SmileIcon } from '@/components/ui/SmileIcon';
import { TargetIcon } from '@/components/ui/TargetIcon';
import { ThemeDropdown } from '@/components/ui/ThemeDropdown';

import { TutorialCompletionPopup } from '@/components/ui/TutorialCompletionPopup';
import { TutorialOverlay } from '@/components/ui/TutorialOverlay';
import { SensoryColors } from '@/constants/Colors';
import { useAuth } from '@/contexts/AuthContext';
import { useGuestMode } from '@/contexts/GuestModeContext';
import { useSensoryMode } from '@/contexts/SensoryModeContext';
import { useTutorial } from '@/contexts/TutorialContext';
import { useColorScheme } from '@/hooks/useColorScheme';
import { AuthService } from '@/services/authService';
import { detectVisitType, getWelcomeMessage, shouldShowWelcomeMessage, updateVisitData } from '@/utils/visitTypeDetector';

const { width, height } = Dimensions.get('window');

interface FeatureItem {
  id: string;
  title: string;
  icon: React.ReactNode;
  isVisible: boolean;
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { addToStack, removeFromStack, getPreviousScreen, resetStack } = usePreviousScreen();
  const { mode, setMode, isLoading: modeLoading, refreshMode, loadModeForAuthenticatedUser } = useSensoryMode();
  const { isGuestMode } = useGuestMode();
  const { session } = useAuth();
  const { 
    hasCompletedTutorial, 
    showTutorial, 
    showCompletionPopup, 
    startTutorial, 
    completeTutorial, 
    skipTutorial, 
    hideCompletionPopup,
    resetSessionState
  } = useTutorial();



  // Tutorial button highlighting state
  const [isTutorialButtonHighlighted, setIsTutorialButtonHighlighted] = useState(true);
  const tutorialButtonScale = useRef(new Animated.Value(1)).current;
  const tutorialButtonOpacity = useRef(new Animated.Value(1)).current;

  // Start highlighting animation when component mounts
  useEffect(() => {
    if (isTutorialButtonHighlighted) {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.parallel([
            Animated.timing(tutorialButtonScale, {
              toValue: 1.1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(tutorialButtonOpacity, {
              toValue: 0.7,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(tutorialButtonScale, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
            Animated.timing(tutorialButtonOpacity, {
              toValue: 1,
              duration: 1000,
              useNativeDriver: true,
            }),
          ]),
        ])
      );
      pulseAnimation.start();
      return () => pulseAnimation.stop();
    }
  }, [isTutorialButtonHighlighted, tutorialButtonScale, tutorialButtonOpacity]);



  // Loading state for splash
  const [loading, setLoading] = useState(true);

  // Welcome message state
  const [welcomeMessage, setWelcomeMessage] = useState<string>('');
  const [showWelcomeMessage, setShowWelcomeMessage] = useState(false);
  const [userData, setUserData] = useState<any>(null);

  const [searchQuery, setSearchQuery] = useState('');

  // Add these hooks here, before any conditional returns
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [isJotBoxAnimating, setIsJotBoxAnimating] = useState(false);
  const [isJotBoxCompleted, setIsJotBoxCompleted] = useState(false);
  const [isSimpleAnimating, setIsSimpleAnimating] = useState(false);
  const [isMenuAnimating, setIsMenuAnimating] = useState(false);

  // Track if component is mounted
  const isMounted = useRef(true);
  
  // Track animation objects for direct cancellation
  const jotBoxAnimationRef = useRef<any>(null);
  const simpleAnimationRef = useRef<any>(null);
  const menuAnimationRef = useRef<any>(null);
  
  // Track if animations have been completed in this session
  const [hasCompletedAnimations, setHasCompletedAnimations] = useState(false);
  
  // Track if this is the first time loading the app
  const isFirstLoad = useRef(true);

  // Tutorial element refs for positioning
  const quickJotRef = useRef<View>(null);
  const menuRef = useRef<View>(null);
  const todaysFocusRef = useRef<View>(null);
  const zoneOutRef = useRef<View>(null);
  const moodTrackerRef = useRef<View>(null);



  // State to track which component should be highlighted
  const [highlightedComponent, setHighlightedComponent] = useState<string | null>(null);
  
  // State to store component positions for duplicate positioning
  const [componentPositions, setComponentPositions] = useState<{
    quickJot: { x: number; y: number; width: number; height: number } | null;
    menu: { x: number; y: number; width: number; height: number } | null;
    todaysFocus: { x: number; y: number; width: number; height: number } | null;
    zoneOut: { x: number; y: number; width: number; height: number } | null;
    moodTracker: { x: number; y: number; width: number; height: number } | null;
  }>({
    quickJot: null,
    menu: null,
    todaysFocus: null,
    zoneOut: null,
    moodTracker: null,
  });

  // Debug tutorial state
  console.log('🎯 TUTORIAL STATE DEBUG:', { 
    hasCompletedTutorial, 
    showTutorial, 
    showCompletionPopup,
    highlightedComponent,
    componentPositions
  });

  // Monitor highlighted component changes
  useEffect(() => {
    console.log('🎯 HIGHLIGHTED COMPONENT CHANGED:', highlightedComponent);
  }, [highlightedComponent]);

  // Clear highlighted component when tutorial is not running
  useEffect(() => {
    if (!showTutorial && highlightedComponent !== null) {
      console.log('🎯 TUTORIAL STOPPED: Clearing highlighted component');
      setHighlightedComponent(null);
    }
  }, [showTutorial, highlightedComponent]);



  // Function to measure component positions
  const measureComponent = (ref: React.RefObject<View>) => {
    return new Promise<{ x: number; y: number; width: number; height: number }>((resolve) => {
      if (ref.current) {
        ref.current.measure((x, y, width, height, pageX, pageY) => {
          resolve({ x: pageX, y: pageY, width, height });
        });
      } else {
        resolve({ x: 0, y: 0, width: 0, height: 0 });
      }
    });
  };

  // Function to measure all components
  const measureAllComponents = async () => {
    console.log('🎯 MEASURING COMPONENTS...');
    
    const [quickJot, menu, todaysFocus, zoneOut, moodTracker] = await Promise.all([
      measureComponent(quickJotRef),
      measureComponent(menuRef),
      measureComponent(todaysFocusRef),
      measureComponent(zoneOutRef),
      measureComponent(moodTrackerRef),
    ]);

    const positions = {
      quickJot,
      menu,
      todaysFocus,
      zoneOut,
      moodTracker,
    };

    console.log('🎯 COMPONENT POSITIONS MEASURED:', positions);
    setComponentPositions(positions);
  };

  // Measure components when tutorial starts
  const handleStartTutorial = async () => {
    console.log('🎯 TUTORIAL STARTING: Measuring components...');
    // Stop highlighting when tutorial starts
    setIsTutorialButtonHighlighted(false);
    await measureAllComponents();
    console.log('🎯 TUTORIAL STARTING: Calling startTutorial...');
    console.log('🎯 BEFORE START - showTutorial:', showTutorial, 'highlightedComponent:', highlightedComponent);
    startTutorial();
    // Reset highlighted component and set to first step
    setHighlightedComponent('quick-jot');
    console.log('🎯 AFTER START - showTutorial:', showTutorial, 'highlightedComponent: quick-jot (reset to step 1)');
  };

  // Handle tutorial step changes to manage highlighted component
  const handleTutorialStepChange = (stepIndex: number) => {
    const steps = ['quick-jot', 'menu', 'todays-focus', 'zone-out', 'mood-tracker'];
    const currentStepId = steps[stepIndex];
    console.log('🎯 TUTORIAL STEP CHANGE CALLED:', { stepIndex, currentStepId, showTutorial });
    
    // Always set highlighted component when step changes, regardless of showTutorial state
    console.log('🎯 SETTING HIGHLIGHTED COMPONENT TO:', currentStepId);
    setHighlightedComponent(currentStepId);
  };

  // Reset z-index when tutorial completes or skips
  const handleTutorialComplete = () => {
    setHighlightedComponent(null);
    completeTutorial();
  };

  const handleTutorialSkip = () => {
    setHighlightedComponent(null);
    skipTutorial();
  };

  // Reset navigation stack when home screen mounts
  useEffect(() => {
    resetStack();
  }, [resetStack]);

  // Debug tutorial state changes
  useEffect(() => {
    console.log('🎯 TUTORIAL STATE CHANGED:', { showTutorial, highlightedComponent });
  }, [showTutorial, highlightedComponent]);

  // Load user data and detect visit type
  const loadUserDataAndDetectVisit = async () => {
    try {
      console.log('🔄 LOADING USER DATA: Attempting to get current user data');
      const currentUser = await AuthService.getCurrentUser();
      
      console.log('=== INDEX.TSX: CURRENT USER STRUCTURE ===');
      console.log('🔍 CURRENT USER OBJECT:', {
        id: currentUser?.id,
        user_id: currentUser?.user_id,
        email: currentUser?.email,
        hasProfile: !!currentUser?.profile,
        hasSettings: !!currentUser?.settings,
        profileSettings: currentUser?.profile?.settings,
        directSettings: currentUser?.settings
      });
      
      console.log('⚠️ NOTE: Profile data is merged into currentUser object');
      console.log('   - currentUser.id = auth.users.id');
      console.log('   - currentUser.user_id = user_profiles.user_id (same as id)');
      console.log('   - currentUser.settings = user_profiles.settings (merged)');
      console.log('   - currentUser.profile = full profile object');
      
      console.log('✅ USER DATA LOADED: Current user data:', currentUser);
      
      if (currentUser) {
        setUserData(currentUser);
        
        // Detect visit type
        const visitData = detectVisitType(currentUser);
        console.log('Visit type detected:', visitData);
        
        // === TEST 2: Nickname Loading on Restart ===
        console.log('=== TEST 2: Nickname Loading on Restart ===');
        // Trust the database - use the nickname stored in settings
        let nickname = currentUser.profile?.settings?.nickname || currentUser.full_name || 'there';
        
        console.log('Nickname resolution:', {
          'userId': currentUser.id,
          'profileExists': !!currentUser.profile,
          'settings.nickname': currentUser.profile?.settings?.nickname,
          'auth.full_name': currentUser.full_name,
          'final_nickname': nickname
        });
        
        if (currentUser.profile?.settings?.nickname) {
          console.log('✅ SUCCESS: Using nickname from profile settings:', nickname);
        } else if (currentUser.full_name) {
          console.log('⚠️ FALLBACK: Using auth user full_name:', nickname);
        } else {
          console.log('❌ DEFAULT: No nickname data found, using default');
        }
        
        // Generate welcome message
        const message = getWelcomeMessage(visitData, nickname);
        setWelcomeMessage(message);
        
        // Check if should show welcome message
        const shouldShow = await shouldShowWelcomeMessage(currentUser.id);
        setShowWelcomeMessage(shouldShow);
        
        // Mode is now handled automatically by SensoryModeContext
        // It will load from database for authenticated users or local storage for guest users
        console.log('✅ MODE MANAGEMENT: Handled automatically by SensoryModeContext');
        
        // Update visit data in database
        console.log('🔄 UPDATING VISIT DATA: Attempting to update visit data for user:', currentUser.id);
        const updatedUserData = updateVisitData(currentUser);
                 // Always use the authenticated user's ID for profile operations
         const result = await AuthService.updateUserProfile(currentUser.id, {
           settings: updatedUserData.settings
         });
        
        if (result.success) {
          console.log('✅ VISIT DATA UPDATED: Visit data updated for user:', currentUser.id);
                 } else {
           console.error('❌ VISIT DATA UPDATE FAILED:', {
             error: result.error,
             message: result.error?.message,
             code: result.error?.code
           });
           
           // Handle specific database errors
           if (result.error?.code === 'DUPLICATE_PROFILE') {
             console.error('🚨 VISIT DATA ERROR: Profile already exists - this should not happen with proper flow');
           } else if (result.error?.code === 'USER_NOT_FOUND') {
             console.error('🚨 VISIT DATA ERROR: User does not exist in auth.users - check authentication');
           } else if (result.error?.code === 'MISSING_REQUIRED_FIELD') {
             console.error('🚨 VISIT DATA ERROR: Missing required field - check user data');
           }
           
           // Don't fail the entire function if visit data update fails
           console.log('⚠️ CONTINUING: Continuing without visit data update');
         }
      } else {
        console.log('❌ NO USER: No authenticated user found');
        
        // Check if user is in guest mode
        if (isGuestMode) {
          console.log('✅ GUEST MODE: User is in guest mode, continuing without authentication');
          return;
        } else {
          console.log('❌ NO AUTH & NO GUEST: Redirecting to signin');
          router.replace('/(auth)/signin');
          return;
        }
      }
    } catch (error) {
      console.error('❌ LOAD USER DATA EXCEPTION: Error loading user data and detecting visit:', {
        error: error,
        message: error?.message,
        stack: error?.stack
      });
      
      // Check if it's an auth session missing error
      if (error?.message?.includes('Auth session missing')) {
        console.log('⚠️ NO AUTH SESSION: Checking if user is in guest mode');
        
        // Check if user is in guest mode before redirecting
        if (isGuestMode) {
          console.log('✅ GUEST MODE: User is in guest mode, continuing without authentication');
          return;
        } else {
          console.log('❌ NO AUTH & NO GUEST: Redirecting to signin');
          router.replace('/(auth)/signin');
          return;
        }
      }
    }
  };

  const [features, setFeatures] = useState<FeatureItem[]>([
    {
      id: 'view-my-day',
      title: 'View My Day',
      icon: <CalendarIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'add-goals',
      title: 'Add Goals',
      icon: <TargetIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'pomodoro-timer',
      title: 'Pomodoro Timer',
      icon: <ClockIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'todo-list',
      title: 'To-Do List',
      icon: <CheckIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'notes',
      title: 'Notes',
      icon: <NotesIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
    {
      id: 'kanban-board',
      title: 'Kanban Board',
      icon: <KanbanIcon size={32} color="#6b7260" />,
      isVisible: true,
    },
  ]);

  // Trigger animations on first load
  useEffect(() => {
    // Only reset animation states on first load of the app
    if (isFirstLoad.current) {
      setIsJotBoxAnimating(false);
      setIsSimpleAnimating(false);
      setIsMenuAnimating(false);
      setIsJotBoxCompleted(false);
      setHasCompletedAnimations(false);
      isFirstLoad.current = false;
    } else {
      // On subsequent loads (navigation), preserve the completion state
      if (hasCompletedAnimations) {
        setIsJotBoxCompleted(true);
        setIsJotBoxAnimating(false);
      }
    }

    // Set loading to false and load user data
    setTimeout(() => {
      if (isMounted.current) {
        setLoading(false);
        loadUserDataAndDetectVisit();
      }
    }, 1200);

    // Only start animations if they haven't been completed yet
    if (!hasCompletedAnimations) {
      const timer = setTimeout(() => {
        if (isMounted.current) {
          setIsJotBoxAnimating(true);
          setTimeout(() => {
            if (isMounted.current) {
              setIsJotBoxAnimating(false);
              setIsJotBoxCompleted(true);
              setHasCompletedAnimations(true); // Mark as completed
            }
          }, 8500);
        }
      }, 500);

      const simpleTimer = setTimeout(() => {
        if (isMounted.current) {
          setIsSimpleAnimating(true);
          setTimeout(() => {
            if (isMounted.current) {
              setIsSimpleAnimating(false);
            }
          }, 2000);
        }
      }, 1000);

      const menuTimer = setTimeout(() => {
        if (isMounted.current) {
          setIsMenuAnimating(true);
          setTimeout(() => {
            if (isMounted.current) {
              setIsMenuAnimating(false);
            }
          }, 6000);
        }
      }, 1500);

      return () => {
        // Mark component as unmounted
        isMounted.current = false;
        // Immediately clear all timeouts
        clearTimeout(timer);
        clearTimeout(simpleTimer);
        clearTimeout(menuTimer);
        // Immediately stop all animations
        setIsJotBoxAnimating(false);
        setIsSimpleAnimating(false);
        setIsMenuAnimating(false);
        // Don't reset completion states - preserve them
      };
    }
  }, []); // Remove hasCompletedAnimations from dependency array

  // Handle completion state changes
  useEffect(() => {
    if (hasCompletedAnimations && !isFirstLoad.current) {
      setIsJotBoxCompleted(true);
      setIsJotBoxAnimating(false);
    }
  }, [hasCompletedAnimations]);

  // Stop animations when component unmounts
  useEffect(() => {
    return () => {
      // Mark component as unmounted
      isMounted.current = false;
      // Cleanup function that runs when component unmounts
      setIsJotBoxAnimating(false);
      setIsSimpleAnimating(false);
      setIsMenuAnimating(false);
      // Set to completed state when unmounting
      setIsJotBoxCompleted(true);
      setHasCompletedAnimations(true);
      // Cancel any running animations directly
      if (jotBoxAnimationRef.current) {
        jotBoxAnimationRef.current.stop?.();
      }
      if (simpleAnimationRef.current) {
        simpleAnimationRef.current.stop?.();
      }
      if (menuAnimationRef.current) {
        menuAnimationRef.current.stop?.();
      }
    };
  }, []);

  // Stop animations when screen loses focus
  useFocusEffect(
    React.useCallback(() => {
      return () => {
        // Stop all animations when screen loses focus
        setIsJotBoxAnimating(false);
        setIsSimpleAnimating(false);
        setIsMenuAnimating(false);
        // Set to completed state when losing focus
        setIsJotBoxCompleted(true);
        setHasCompletedAnimations(true);
        // Cancel any running animations directly
        if (jotBoxAnimationRef.current) {
          jotBoxAnimationRef.current.stop?.();
        }
        if (simpleAnimationRef.current) {
          simpleAnimationRef.current.stop?.();
        }
        if (menuAnimationRef.current) {
          menuAnimationRef.current.stop?.();
        }
      };
    }, [])
  );

  const handleFeaturePress = (feature: string) => {
    if (feature === 'To-Do List') {
      router.push('/(tabs)/todo');
    } else if (feature === 'Kanban Board') {
      router.push('/(tabs)/kanban');
    } else if (feature === 'Pomodoro Timer') {
      router.push('/(tabs)/pomodoro');
    } else if (feature === 'View My Day') {
      router.push('/(tabs)/calendar');
    } else if (feature === 'Add Goals') {
      router.push('/(tabs)/goals');
    } else if (feature === 'Zone Out') {
      router.push('/(tabs)/zone-out');
    } else {
      Alert.alert('Feature Coming Soon', `${feature} will be available in the next update!`);
    }
  };

  const handleThemeChange = async (theme: 'calm' | 'highEnergy' | 'normal' | 'relax') => {
    console.log('🎨 THEME CHANGE REQUESTED:', theme);
    
    // Update the mode in the context (this will automatically save to database/local storage)
    await setMode(theme);
    
    console.log('✅ THEME CHANGED SUCCESSFULLY:', theme);
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // TODO: Implement search functionality
    console.log('Searching for:', query);
  };

  const handleFeatureToggle = (featureId: string) => {
    setFeatures(prevFeatures => 
      prevFeatures.map(feature => 
        feature.id === featureId 
          ? { ...feature, isVisible: !feature.isVisible }
          : feature
      )
    );
  };

  const handleProfilePress = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            try {
              await AuthService.signOut();
              router.replace('/(auth)/signin');
            } catch (error) {
              console.error('Error during logout:', error);
              Alert.alert('Error', 'Failed to logout. Please try again.');
            }
          },
        },
      ]
    );
  };

  const visibleFeatures = features.filter(feature => feature.isVisible);
  const colors = SensoryColors[mode];

  // Update icon colors based on current theme
  const getFeatureIcon = (feature: FeatureItem) => {
    const iconProps = { size: 32, color: colors.icon };
    switch (feature.id) {
      case 'view-my-day':
        return <CalendarIcon {...iconProps} />;
      case 'add-goals':
        return <TargetIcon {...iconProps} />;
      case 'pomodoro-timer':
        return <ClockIcon {...iconProps} />;
      case 'todo-list':
        return <CheckIcon {...iconProps} />;
      case 'notes':
        return <NotesIcon {...iconProps} />;
      case 'kanban-board':
        return <KanbanIcon {...iconProps} />;
      default:
        return feature.icon;
    }
  };

  // Create rows for the grid layout - always maintain 2 columns
  const createGridRows = () => {
    const rows = [];
    for (let i = 0; i < visibleFeatures.length; i += 2) {
      const row = visibleFeatures.slice(i, i + 2);
      rows.push(row);
    }
    return rows;
  };

  const gridRows = createGridRows();

  // --- RENDER ---
  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Image
          source={require('../../assets/images/kind_frame_logo.png')}
          style={{ width: 96, height: 96, marginBottom: 24 }}
          resizeMode="contain"
          accessibilityLabel="KindFrame logo"
        />
        <Text style={{ fontSize: 22, fontWeight: '600', color: '#222' }}>Loading...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>  


      {/* Tutorial Overlay */}
      <TutorialOverlay
        visible={showTutorial}
        onComplete={handleTutorialComplete}
        onSkip={handleTutorialSkip}
        componentPositions={componentPositions}
        onStepChange={handleTutorialStepChange}
      />

      {/* Tutorial Completion Popup */}
      <TutorialCompletionPopup
        visible={showCompletionPopup}
        onSkip={hideCompletionPopup}
      />

      {/* Top HUD */}
      <View style={[styles.topHud, { backgroundColor: colors.topBarBackground }]}>  
        <Image
          source={require('../../assets/images/kind_frame_logo.png')}
          style={{ width: 36, height: 36, marginRight: 8 }}
          resizeMode="contain"
          accessibilityLabel="KindFrame logo"
        />
        <View style={{ flex: 1 }} />
        <ThemeDropdown 
          currentTheme={mode}
          onThemeChange={handleThemeChange}
          colors={colors}
        />
        <Animated.View
          style={[
            styles.tutorialButton,
            {
              backgroundColor: colors.primary,
              borderWidth: 2,
              borderColor: isTutorialButtonHighlighted ? colors.accent || '#ff6b6b' : colors.primary,
              transform: [{ scale: tutorialButtonScale }],
              opacity: tutorialButtonOpacity,
            }
          ]}
        >
          <TouchableOpacity 
            style={styles.tutorialButtonTouchable}
            onPress={handleStartTutorial}
            accessibilityLabel="Tutorial"
          >
            <Text style={[styles.tutorialButtonText, { color: colors.background }]}>?</Text>
          </TouchableOpacity>
        </Animated.View>
        <TouchableOpacity 
          style={[styles.settingsButton, { backgroundColor: colors.profileBackground }]}
          onPress={handleProfilePress}
          accessibilityLabel="Settings"
        >
          <SettingsIcon size={24} color={colors.profilePhoto} />
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.surface }]}>  
          <SearchIcon size={20} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search tasks, notes, and more..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={handleSearch}
          />
        </View>
      </View>

      {/* Guest Mode Indicator */}
      {isGuestMode && !session && (
        <GuestModeIndicator />
      )}

      {/* Welcome Message */}
      {showWelcomeMessage && welcomeMessage && (
        <View style={styles.welcomeContainer}>
          <Text style={[styles.welcomeMessage, { color: colors.textSecondary }]}>
            {welcomeMessage}
          </Text>
        </View>
      )}

      {/* Today's Focus Card */}
      <View 
        ref={todaysFocusRef}
        style={[
          styles.focusCard, 
          { 
            backgroundColor: colors.surface,
          }
        ]}
      >  
        <View style={styles.focusHeader}>
          <Text style={[styles.focusTitle, { color: colors.text }]}>Today's Focus</Text>
          <TouchableOpacity 
            onPress={() => setShowFullSchedule(v => !v)}
            style={styles.chevronButton}
          >
            <ChevronIcon size={20} color={colors.textSecondary} isExpanded={showFullSchedule} />
          </TouchableOpacity>
        </View>
        
        {/* Current Task Section */}
        <View style={[styles.taskSection, { backgroundColor: '#f8fafc' }]}>
          <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>Current Task</Text>
          <View style={styles.taskRow}>
            <Text style={[styles.taskTextActive, { color: '#3b82f6' }]}>Morning meditation</Text>
            <View style={[styles.taskIndicator, { backgroundColor: '#3b82f6' }]} />
          </View>
        </View>
        
        {/* Next Task Section */}
        <View style={[styles.taskSection, { backgroundColor: '#fefefe' }]}>
          <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>Next Task</Text>
          <View style={styles.taskRow}>
            <Text style={[styles.taskTextInactive, { color: colors.textSecondary }]}>Review project goals</Text>
            <View style={[styles.taskIndicator, { backgroundColor: '#d1d5db' }]} />
          </View>
        </View>
        
        {showFullSchedule && (
          <View style={styles.scheduleList}>
            {/* Example schedule, replace with real data */}
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleTime, { color: colors.textSecondary }]}>7:00 AM</Text>
              <Text style={[styles.scheduleTask, { color: colors.text }]}>Morning meditation</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleTime, { color: colors.textSecondary }]}>8:00 AM</Text>
              <Text style={[styles.scheduleTask, { color: colors.text }]}>Review project goals</Text>
            </View>
            <View style={styles.scheduleRow}>
              <Text style={[styles.scheduleTime, { color: colors.textSecondary }]}>9:00 AM</Text>
              <Text style={[styles.scheduleTask, { color: colors.text }]}>Team sync</Text>
            </View>
          </View>
        )}
      </View>

      {/* Spacer */}
      <View style={{ flex: 1 }} />

                  {/* Floating Menu Button (bottom-left) */}
      <TouchableOpacity 
        ref={menuRef}
        style={[
          styles.floatingMenuButton,
          {
            position: 'absolute',
            bottom: 100,
            left: 20,
          }
        ]}
        onPress={() => {
          addToStack('home');
          router.push('/menu');
        }}
      >
        <MenuIcon size={40} color={colors.icon} isAnimating={isMenuAnimating} />
      </TouchableOpacity>

      {/* Floating JotBox Button (bottom-right) */}
      <View 
        style={{
          position: 'absolute',
          bottom: 100,
          right: 20,
        }}
      >
        <TouchableOpacity
          ref={quickJotRef}
          style={[
            styles.floatingJotBoxButton,
          ]}
          
          onPress={() => {
            setIsJotBoxAnimating(true);
            setTimeout(() => setIsJotBoxAnimating(false), 8500);
            router.push('/(tabs)/quick-jot');
          }}
        >
          <AnimatedJotBoxIcon size={40} isAnimating={isJotBoxAnimating} isCompleted={isJotBoxCompleted} color={colors.icon} />
        </TouchableOpacity>
      </View>

      {/* Bottom Navigation */}
      <View style={[
        styles.bottomNav, 
        { 
          backgroundColor: colors.cardBackground,
        }
      ]}>
        {/* Center icons only */}
        <View style={styles.centerIcons}>
          {/* Zone Out Icon Container */}
          <View 
            ref={zoneOutRef}
            style={[
              styles.iconContainer,
              { 
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 8,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.centerIconBtn}
              onPress={() => handleFeaturePress('Zone Out')}
            >
              <HeadphonesIcon size={28} color={colors.icon} />
              <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Zone Out</Text>
            </TouchableOpacity>
          </View>

          {/* Mood Tracker Icon Container */}
          <View 
            ref={moodTrackerRef}
            style={[
              styles.iconContainer,
              { 
                backgroundColor: 'white',
                borderRadius: 12,
                padding: 8,
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.centerIconBtn}
              onPress={() => router.push('/(tabs)/mood-tracker')}
            >
              <SmileIcon size={28} color={colors.icon} />
              <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Mood Tracker</Text>
            </TouchableOpacity>
          </View>

          {/* Profile Icon Container */}
          <View style={styles.iconContainer}>
            <TouchableOpacity style={styles.centerIconBtn} onPress={() => handleFeaturePress('Profile')}>
              <ProfileIcon size={28} color={colors.icon} />
              <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>My Profile</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Tutorial Highlight Components - Duplicates positioned above overlay */}
      {showTutorial && highlightedComponent && (
        <>
          {console.log('🎯 RENDERING DUPLICATE FOR:', highlightedComponent, 'SHOW_TUTORIAL:', showTutorial, 'HIGHLIGHTED:', highlightedComponent)}
          {/* Quick Jot Duplicate */}
          {highlightedComponent === 'quick-jot' && (
            <View
              className="tutorial-highlight-component"
              style={{
                position: 'absolute',
                bottom: 100,
                right: 20,
                width: 70,
                height: 70,
                zIndex: 3000,
              }}
            >
              <View style={[styles.floatingJotBoxButton, { backgroundColor: 'white' }]}>
                <AnimatedJotBoxIcon size={40} isAnimating={false} isCompleted={false} color={colors.icon} />
              </View>
            </View>
          )}

          {/* Menu Duplicate */}
          {highlightedComponent === 'menu' && componentPositions.menu && (
            <View
              className="tutorial-highlight-component"
              style={{
                position: 'absolute',
                left: componentPositions.menu.x,
                top: componentPositions.menu.y,
                width: componentPositions.menu.width,
                height: componentPositions.menu.height,
                zIndex: 3000,
              }}
            >
              <View style={[styles.floatingMenuButton, { backgroundColor: 'white' }]}>
                <MenuIcon size={40} color={colors.icon} isAnimating={false} />
              </View>
            </View>
          )}

          {/* Today's Focus Duplicate */}
          {highlightedComponent === 'todays-focus' && componentPositions.todaysFocus && (
            <View
              className="tutorial-highlight-component"
              style={{
                position: 'absolute',
                left: componentPositions.todaysFocus.x,
                top: componentPositions.todaysFocus.y,
                width: componentPositions.todaysFocus.width,
                height: componentPositions.todaysFocus.height,
                zIndex: 3000,
              }}
            >
              <View style={[styles.focusCard, { backgroundColor: colors.surface, margin: 0, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 }]}>
                <View style={styles.focusHeader}>
                  <Text style={[styles.focusTitle, { color: colors.text }]}>Today's Focus</Text>
                  <View style={[styles.chevronButton, { opacity: 0.5 }]}>
                    <ChevronIcon size={20} color={colors.textSecondary} isExpanded={false} />
                  </View>
                </View>
                
                {/* Current Task Section */}
                <View style={[styles.taskSection, { backgroundColor: '#f8fafc' }]}>
                  <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>Current Task</Text>
                  <View style={styles.taskRow}>
                    <Text style={[styles.taskTextActive, { color: '#3b82f6' }]}>Morning meditation</Text>
                    <View style={[styles.taskIndicator, { backgroundColor: '#3b82f6' }]} />
                  </View>
                </View>
                
                {/* Next Task Section */}
                <View style={[styles.taskSection, { backgroundColor: '#fefefe' }]}>
                  <Text style={[styles.taskLabel, { color: colors.textSecondary }]}>Next Task</Text>
                  <View style={styles.taskRow}>
                    <Text style={[styles.taskTextInactive, { color: colors.textSecondary }]}>Review project goals</Text>
                    <View style={[styles.taskIndicator, { backgroundColor: '#d1d5db' }]} />
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Zone Out Duplicate */}
          {highlightedComponent === 'zone-out' && componentPositions.zoneOut && (
            <View
              className="tutorial-highlight-component"
              style={{
                position: 'absolute',
                left: componentPositions.zoneOut.x,
                top: componentPositions.zoneOut.y,
                width: componentPositions.zoneOut.width,
                height: componentPositions.zoneOut.height,
                zIndex: 3000,
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'white', borderRadius: 12, padding: 8 }]}>
                <TouchableOpacity style={styles.centerIconBtn}>
                  <HeadphonesIcon size={28} color={colors.icon} />
                  <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Zone Out</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Mood Tracker Duplicate */}
          {highlightedComponent === 'mood-tracker' && componentPositions.moodTracker && (
            <View
              className="tutorial-highlight-component"
              style={{
                position: 'absolute',
                left: componentPositions.moodTracker.x,
                top: componentPositions.moodTracker.y,
                width: componentPositions.moodTracker.width,
                height: componentPositions.moodTracker.height,
                zIndex: 3000,
              }}
            >
              <View style={[styles.iconContainer, { backgroundColor: 'white', borderRadius: 12, padding: 8 }]}>
                <TouchableOpacity style={styles.centerIconBtn}>
                  <SmileIcon size={28} color={colors.icon} />
                  <Text style={[styles.bottomNavText, { color: colors.textSecondary }]}>Mood Tracker</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  topBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
    elevation: 1,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  welcomeSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  featureGridContainer: {
    marginBottom: 20,
  },
  featureGrid: {
    // gap: 16, // Removed
  },
  featureRow: {
    // flexDirection: 'row', // Removed
    // gap: 16, // Removed
  },
  featureCard: {
    flex: 1,
    aspectRatio: 1,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0 2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
    position: 'relative',
  },
  emptyCard: {
    flex: 1,
    aspectRatio: 1,
  },
  cardToggleContainer: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 5,
  },
  featureContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginTop: 12,
    textAlign: 'center',
  },
  bottomFooter: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  footerItem: {
    alignItems: 'center',
    // gap: 4, // Removed
    flex: 1,
  },
  footerText: {
    fontSize: 12,
    fontWeight: '500',
  },
  topHud: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingsButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10, // Added padding
  },
  tutorialButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
  },
  tutorialButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  tutorialButtonTouchable: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  focusTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  expandIcon: {
    fontSize: 14,
    fontWeight: '500',
  },
  taskSection: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  taskLabel: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskTextActive: {
    fontSize: 15,
    fontWeight: '600',
  },
  taskTextInactive: {
    fontSize: 15,
    fontWeight: '400',
  },
  taskIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  scheduleList: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
  },
  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  scheduleTime: {
    fontSize: 13,
    fontWeight: '500',
  },
  scheduleTask: {
    fontSize: 14,
    fontWeight: '500',
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)',
    boxShadow: '0 -2px 3.84px rgba(0, 0, 0, 0.1)',
    elevation: 5,
  },
  centerIcons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    width: '100%',
  },
  centerIconBtn: {
    padding: 4,
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomNavText: {
    marginTop: 4,
    fontSize: 12,
    textAlign: 'center',
  },
  floatingMenuButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 15,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingJotBoxButton: {
    backgroundColor: 'white',
    borderRadius: 25,
    padding: 15,
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    elevation: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chevronButton: {
    padding: 5, // Added padding to make touch target larger
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f0f9eb', // welcome text bg
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  welcomeMessage: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
});
