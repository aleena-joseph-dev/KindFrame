import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import InfoModal from '@/components/ui/InfoModal';
import TopBar from '@/components/ui/TopBar';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { MoodService } from '@/services/moodService';
import { LinearGradient } from 'expo-linear-gradient';
import { Animated, PanResponder, Platform } from 'react-native';


const moodLevels = [
  { value: 0, label: 'Totally Drained', emoji: '😩', color: '#DC2626' },
  { value: 1, label: 'Barely Holding On', emoji: '😞', color: '#EF4444' },
  { value: 2, label: 'Very Low Energy', emoji: '😒', color: '#F97316' },
  { value: 3, label: 'Tired and Sluggish', emoji: '😴', color: '#FB923C' },
  { value: 4, label: 'Somewhat Fatigued', emoji: '😕', color: '#F59E0B' },
  { value: 5, label: 'Neutral / Okay', emoji: '😐', color: '#EAB308' },
  { value: 6, label: 'Slightly Energized', emoji: '🙂', color: '#FACC15' },
  { value: 7, label: 'Feeling Good', emoji: '😊', color: '#84CC16' },
  { value: 8, label: 'Energized & Productive', emoji: '😃', color: '#22C55E' },
  { value: 9, label: 'Highly Motivated', emoji: '😄', color: '#16A34A' },
  { value: 10, label: 'Fully Energized', emoji: '🤩', color: '#15803D' },
];

function getSuggestion(mental: number, physical: number) {
  if (mental <= 5 || physical <= 5) {
    return {
      title: 'Need a Boost?',
      options: ['Breathe With Me', 'Journal'],
    };
  }
  if (mental >= 8 || physical >= 8) {
    return {
      title: 'Feeling Great!',
      options: ['Add a Core Memory', 'Journal'],
    };
  }
  return null;
}

// SVGs for each mood level (0-10)
const moodSVGs = [
  // 0: Totally Drained
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#DC2626"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M22 26 L34 30" stroke="#000" strokeWidth="3" strokeLinecap="round"/><path d="M46 30 L58 26" stroke="#000" strokeWidth="3" strokeLinecap="round"/><path d="M25 55 Q40 45 55 55" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
  ),
  // 1: Barely Holding On
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#EF4444"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M28 52 Q40 47 52 52" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
  ),
  // 2: Very Low Energy
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#F97316"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M30 50 Q40 47 50 50" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
  ),
  // 3: Tired and Sluggish
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#FB923C"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M32 48 Q40 46 48 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
  ),
  // 4: Somewhat Fatigued
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#F59E0B"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><line x1="32" y1="48" x2="48" y2="48" stroke="#000" strokeWidth="3" strokeLinecap="round"/></svg>
  ),
  // 5: Neutral / Okay
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#EAB308"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><line x1="32" y1="48" x2="48" y2="48" stroke="#000" strokeWidth="3" strokeLinecap="round"/></svg>
  ),
  // 6: Slightly Energized
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#FACC15"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M32 48 Q40 52 48 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
  ),
  // 7: Feeling Good
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#84CC16"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M28 48 Q40 55 52 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
  ),
  // 8: Energized & Productive
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#22C55E"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M25 48 Q40 58 55 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></svg>
  ),
  // 9: Highly Motivated
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#16A34A"/><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M22 48 Q40 62 58 48" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
  ),
  // 10: Fully Energized
  () => (
    <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="38" fill="#15803D"/><path d="M28 28 Q24 24 20 28 Q24 32 28 28 Q32 24 28 28" fill="#000"/><path d="M52 28 Q48 24 44 28 Q48 32 52 28 Q56 24 52 28" fill="#000"/><path d="M20 48 Q40 65 60 48" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round"/></svg>
  ),
];

export default function MoodTrackerScreen() {
  const router = useRouter();
  const { mode, colors } = useThemeColors();
  const { vw, vh, getResponsiveSize } = useViewport();
  const { session } = useAuth();
  const [mental, setMental] = useState(5);
  const [physical, setPhysical] = useState(5);
  const [showPopup, setShowPopup] = useState(false);
  const [suggestion, setSuggestion] = useState(null as null | { title: string; options: string[] });
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showSavedMessage, setShowSavedMessage] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleInfo = () => {
    setShowInfoModal(true);
  };

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    // This functionality is now handled by the TopBar's onInfo prop
  }, []);

  // Cleanup function to stop any animations when component unmounts
  useEffect(() => {
    return () => {
      // Stop any ongoing animations when leaving the screen
      // This ensures clean state when returning to the screen
    };
  }, []);

  const handleSubmit = async () => {
    if (!session?.user?.id) {
      console.error('No user session found');
      return;
    }

    setIsSaving(true);
    
    try {
      // Save mood entry to database
      const moodEntry = {
        user_id: session.user.id,
        timestamp: new Date().toISOString(),
        mood_value: {
          body: physical,
          mind: mental,
        },
      };

      const result = await MoodService.saveMoodEntry(moodEntry);
      
      if (result.success) {
        console.log('✅ Mood entry saved successfully:', result.data);
        
        // Show saved message
        setShowSavedMessage(true);
        
        // Hide the message after 2 seconds
        setTimeout(() => {
          setShowSavedMessage(false);
        }, 2000);
        
        const suggestion = getSuggestion(mental, physical);
        if (suggestion) {
          setSuggestion(suggestion);
          setShowPopup(true);
        } else {
          // Navigate back after a brief delay to show the saved message
          setTimeout(() => {
            router.back();
          }, 2500);
        }
      } else {
        console.error('❌ Failed to save mood entry:', result.error);
        // Still show the suggestion popup even if saving failed
        const suggestion = getSuggestion(mental, physical);
        if (suggestion) {
          setSuggestion(suggestion);
          setShowPopup(true);
        }
      }
    } catch (error) {
      console.error('❌ Exception saving mood entry:', error);
      // Still show the suggestion popup even if saving failed
      const suggestion = getSuggestion(mental, physical);
      if (suggestion) {
        setSuggestion(suggestion);
        setShowPopup(true);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar 
        title="Mood Tracker" 
        onBack={() => router.back()} 
        showInfo={true}
        onInfo={handleInfo} 
      />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View style={{ padding: 24 }}>
          <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text, textAlign: 'center', marginBottom: 8 }}>Mood Tracker</Text>
          <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text, textAlign: 'center', marginBottom: 4 }}>How are you feeling today?</Text>
          <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', marginBottom: 24 }}>
            Track your mental and physical energy levels to better understand your wellbeing
          </Text>

          {/* Mental Energy */}
          <MoodSlider
            label="Mental Energy"
            value={mental}
            onChange={setMental}
          />

          {/* Physical Energy */}
          <MoodSlider
            label="Physical Energy"
            value={physical}
            onChange={setPhysical}
          />

          <TouchableOpacity
            style={{
              backgroundColor: colors.topBarBackground,
              borderRadius: 12,
              paddingVertical: 18,
              marginTop: 32,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
              opacity: isSaving ? 0.6 : 1,
            }}
            onPress={handleSubmit}
            disabled={isSaving}
            activeOpacity={0.8}
          >
            <Text style={{
              color: colors.background,
              fontSize: 18,
              fontWeight: '600',
            }}>
              {isSaving ? 'Saving...' : 'Submit Mood Check'}
            </Text>
          </TouchableOpacity>

          {/* Mood Insights Button */}
          <TouchableOpacity
            style={{
              backgroundColor: colors.surface,
              borderRadius: 12,
              paddingVertical: 16,
              marginTop: 16,
              alignItems: 'center',
              borderWidth: 1,
              borderColor: colors.border,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.05,
              shadowRadius: 2,
              elevation: 1,
            }}
            onPress={() => router.push('/insights')}
            activeOpacity={0.8}
          >
            <Text style={{
              color: colors.text,
              fontSize: 16,
              fontWeight: '600',
            }}>
              📊 View Mood Insights
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      
      {/* Floating Saved Message */}
      {showSavedMessage && (
        <View style={{
          position: 'absolute',
          top: 100,
          left: 20,
          right: 20,
          backgroundColor: colors.topBarBackground,
          borderRadius: 12,
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 6,
          zIndex: 999,
        }}>
          <Text style={{
            color: colors.background,
            fontSize: 16,
            fontWeight: '600',
          }}>
            ✅ Mood Saved
          </Text>
        </View>
      )}
      
      {/* Suggestion Popup */}
      {showPopup && suggestion && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <View style={{
            backgroundColor: colors.surface,
            borderRadius: 16,
            padding: 24,
            margin: 20,
            alignItems: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
            elevation: 8,
          }}>
            <Text style={{
              fontSize: 20,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: 16,
              textAlign: 'center',
            }}>
              {suggestion.title}
            </Text>
            
            <View style={{ marginBottom: 20 }}>
              {suggestion.options.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  style={{
                    backgroundColor: colors.topBarBackground,
                    borderRadius: 8,
                    paddingVertical: 12,
                    paddingHorizontal: 20,
                    marginVertical: 6,
                    minWidth: 200,
                    alignItems: 'center',
                  }}
                  onPress={() => {
                    setShowPopup(false);
                    // Navigate to the selected option
                    if (option === 'Breathe With Me') {
                      router.push('/(tabs)/breathe');
                    } else if (option === 'Journal') {
                      router.push('/(tabs)/quick-jot');
                    } else if (option === 'Add a Core Memory') {
                      router.push('/(tabs)/core-memory');
                    }
                  }}
                >
                  <Text style={{
                    color: colors.background,
                    fontWeight: '600',
                    fontSize: 16,
                  }}>
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            <TouchableOpacity
              style={{
                paddingVertical: 12,
                paddingHorizontal: 24,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: colors.border,
              }}
              onPress={() => setShowPopup(false)}
            >
              <Text style={{
                color: colors.textSecondary,
                fontWeight: '600',
                fontSize: 16,
              }}>
                Close
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Info Modal */}
      <InfoModal
        visible={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Mood Tracker Guide"
        sections={[
          {
            title: "Purpose",
            content: "The Mood Tracker helps you understand your energy levels and identify patterns. Mental Energy (0-10) reflects your mental focus and motivation, while Physical Energy (0-10) measures your physical stamina."
          },
          {
            title: "How It Works",
            content: "When you submit your mood, we'll analyze your scores and provide personalized suggestions for improvement. For example, if your Mental Energy is low and Physical Energy is high, we might suggest journaling to clear your mind."
          }
        ]}
        tips={[
          "Try to be as honest as possible with your ratings",
          "Track your mood regularly to identify patterns",
          "Use the suggestions to improve your energy levels"
        ]}
        description="This tool helps you become more aware of your daily energy patterns and provides actionable suggestions for improvement."
      />
    </SafeAreaView>
  );
}

function MoodSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  const { mode, colors } = useThemeColors();
  // Clamp value to [0, 10]
  const safeValue = Math.max(0, Math.min(10, value));
  const fallbackLevel = { color: '#EAB308', label: 'Neutral', emoji: '😐' };
  const level = moodLevels[safeValue] || fallbackLevel;
  // Use full color for emoji and slider
  const emojiColor = level.color;
  const gradientColors = moodLevels.map(l => l?.color || fallbackLevel.color);

  const sliderWidth = 260;
  const seekerSize = 28;
  const pan = useRef(new Animated.Value((value / 10) * sliderWidth)).current;
  const [dragging, setDragging] = useState(false);
  const sliderRef = useRef<any>(null);
  const [sliderLeft, setSliderLeft] = useState(0);

  // Get slider's absolute X position
  React.useEffect(() => {
    if (sliderRef.current) {
      sliderRef.current.measure((x: any, y: any, width: any, height: any, pageX: any) => {
        setSliderLeft(pageX);
      });
    }
  }, []);

  // Update pan position if value changes from outside
  React.useEffect(() => {
    if (!dragging) {
      Animated.timing(pan, {
        toValue: (value / 10) * sliderWidth,
        duration: 120,
        useNativeDriver: false,
      }).start();
    }
  }, [value, dragging]);

  // PanResponder for drag
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => setDragging(true),
      onPanResponderMove: (_, gesture) => {
        // Use absolute X position
        let x = Math.max(0, Math.min(sliderWidth, gesture.moveX - sliderLeft));
        let v = Math.round((x / sliderWidth) * 10);
        onChange(v);
        pan.setValue(x);
      },
      onPanResponderRelease: (_, gesture) => {
        let x = Math.max(0, Math.min(sliderWidth, gesture.moveX - sliderLeft));
        let v = Math.round((x / sliderWidth) * 10);
        onChange(v);
        Animated.timing(pan, {
          toValue: (v / 10) * sliderWidth,
          duration: 120,
          useNativeDriver: false,
        }).start(() => setDragging(false));
      },
      onPanResponderTerminate: () => setDragging(false),
    })
  ).current;

  // Tap to rate
  const handleBarPress = (evt: any) => {
    if (!sliderRef.current) return;
    let x: number | undefined;
    if (Platform.OS === 'web') {
      // Web: use getBoundingClientRect and clientX
      const rect = sliderRef.current.getBoundingClientRect();
      x = evt.nativeEvent.clientX - rect.left;
    } else {
      // Native: use locationX
      x = evt.nativeEvent.locationX;
    }
    if (typeof x !== 'number' || isNaN(x)) return;
    let v = Math.round((x / sliderWidth) * 10);
    v = Math.max(0, Math.min(10, v));
    onChange(v);
    Animated.timing(pan, {
      toValue: (v / 10) * sliderWidth,
      duration: 120,
      useNativeDriver: false,
    }).start();
  };

  return (
    <View style={styles.sliderCard}>
      <Text style={{ fontSize: 20, fontWeight: 'bold', color: '#222', textAlign: 'center', marginBottom: 8 }}>{label}</Text>
      <View style={{ alignItems: 'center', marginBottom: 8 }}>
        {/* Vibrant SVG Emoji */}
        <svg width="80" height="80" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="38" fill={emojiColor} />
          {/* Face features based on safeValue */}
          {(() => {
            switch (safeValue) {
              case 0:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M22 26 L34 30" stroke="#000" strokeWidth="3" strokeLinecap="round"/><path d="M46 30 L58 26" stroke="#000" strokeWidth="3" strokeLinecap="round"/><path d="M25 55 Q40 45 55 55" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round"/></>);
              case 1:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M28 52 Q40 47 52 52" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></>);
              case 2:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M30 50 Q40 47 50 50" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></>);
              case 3:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M32 48 Q40 46 48 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></>);
              case 4:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><line x1="32" y1="48" x2="48" y2="48" stroke="#000" strokeWidth="3" strokeLinecap="round"/></>);
              case 5:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><line x1="32" y1="48" x2="48" y2="48" stroke="#000" strokeWidth="3" strokeLinecap="round"/></>);
              case 6:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M32 48 Q40 52 48 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></>);
              case 7:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M28 48 Q40 55 52 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></>);
              case 8:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M25 48 Q40 58 55 48" stroke="#000" strokeWidth="3" fill="none" strokeLinecap="round"/></>);
              case 9:
                return (<><circle cx="28" cy="32" r="3" fill="#000"/><circle cx="52" cy="32" r="3" fill="#000"/><path d="M22 48 Q40 62 58 48" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round"/></>);
              case 10:
                return (<><path d="M28 28 Q24 24 20 28 Q24 32 28 28 Q32 24 28 28" fill="#000"/><path d="M52 28 Q48 24 44 28 Q48 32 52 28 Q56 24 52 28" fill="#000"/><path d="M20 48 Q40 65 60 48" stroke="#000" strokeWidth="4" fill="none" strokeLinecap="round"/></>);
              default:
                return (<><circle cx="40" cy="40" r="38" fill={fallbackLevel.color} /><circle cx="40" cy="40" r="8" fill="#000" opacity="0.3"/></>);
            }
          })()}
        </svg>
      </View>
      <Text style={{ fontSize: 16, color: '#444', textAlign: 'center', marginBottom: 2 }}>{level.label}</Text>
      <Text style={{ fontSize: 28, fontWeight: 'bold', color: '#2563eb', textAlign: 'center', marginBottom: 8 }}>
        {isNaN(safeValue) ? '-' : safeValue}/10
      </Text>
      {/* Slider */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, justifyContent: 'center' }}>
        <Text style={{ color: '#888', fontWeight: '500', width: 24, textAlign: 'center' }}>0</Text>
        <TouchableOpacity onPress={handleBarPress} activeOpacity={1}>
          <View ref={sliderRef} style={{ width: sliderWidth, marginHorizontal: 8, justifyContent: 'center' }}>
            <LinearGradient
              colors={gradientColors as any}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 8, borderRadius: 4, width: '100%', position: 'absolute' }}
            />
            {/* No tick marks below the scale */}
            {/* Draggable seeker */}
            <Animated.View
              style={{
                position: 'absolute',
                left: pan,
                top: (8 - seekerSize) / 2, // Vertically center on 8px bar
                zIndex: 2,
                width: seekerSize,
                height: seekerSize,
                marginLeft: -seekerSize / 2,
                backgroundColor: emojiColor,
                borderRadius: seekerSize / 2,
                borderWidth: 2,
                borderColor: '#fff',
                shadowColor: level.color,
                shadowOpacity: 0.18,
                shadowRadius: 6,
                elevation: 3,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              accessibilityRole="adjustable"
              accessibilityLabel={label}
              accessibilityValue={{ min: 0, max: 10, now: value }}
              {...panResponder.panHandlers}
            />
          </View>
        </TouchableOpacity>
        <Text style={{ color: '#888', fontWeight: '500', width: 24, textAlign: 'center' }}>10</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sliderCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  suggestionButton: {
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: '90%',
    alignSelf: 'center',
  },
  skipButton: {
    marginTop: 16,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  popupContent: {
    padding: 20,
    alignItems: 'center',
  },
  popupTitleSection: {
    marginBottom: 15,
  },
  popupTitle: {
    fontWeight: 'bold',
    textAlign: 'center',
  },
  popupOptionsSection: {
    width: '100%',
  },
  suggestionButtonText: {
    fontWeight: 'bold',
    color: '#fff',
  },
}); 