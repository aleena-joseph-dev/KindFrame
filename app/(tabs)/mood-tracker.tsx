import { PopupBg } from '@/components/ui/PopupBg';
import { usePreviousScreen } from '@/components/ui/PreviousScreenContext';
import { TopBar } from '@/components/ui/TopBar';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useViewport } from '@/hooks/useViewport';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, PanResponder, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';


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
  const { addToStack, removeFromStack, getPreviousScreen, getCurrentScreen, handleBack } = usePreviousScreen();
  const [mental, setMental] = useState(5);
  const [physical, setPhysical] = useState(5);
  const [showPopup, setShowPopup] = useState(false);
  const [suggestion, setSuggestion] = useState(null as null | { title: string; options: string[] });

  const handleInfo = () => {
    console.log('Info button pressed'); // Debug log
    setTimeout(() => {
      Alert.alert(
        'Mood Tracker',
        'Track your mental and physical energy levels to understand your patterns and get personalized suggestions. This helps you identify when you need support and when you\'re at your best.',
        [{ text: 'OK' }]
      );
    }, 100);
  };

  // Add this screen to navigation stack when component mounts
  useEffect(() => {
    addToStack('mood-tracker');
  }, [addToStack]);

  // Cleanup function to stop any animations when component unmounts
  useEffect(() => {
    return () => {
      // Stop any ongoing animations when leaving the screen
      // This ensures clean state when returning to the screen
    };
  }, []);

  const handleSubmit = () => {
    const suggestion = getSuggestion(mental, physical);
    if (suggestion) {
      setSuggestion(suggestion);
      setShowPopup(true);
    } else {
      // Save mood check (implement as needed)
      router.back();
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <TopBar title="Mood Tracker" onBack={() => handleBack()} onInfo={handleInfo} showSettings={true} />
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
              backgroundColor: '#2563eb',
              borderRadius: 12,
              paddingVertical: 18,
              marginTop: 32,
              alignItems: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.08,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={handleSubmit}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 18 }}>Submit Mood Check</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Suggestion Popup */}
      <PopupBg
        visible={showPopup}
        onRequestClose={() => setShowPopup(false)}
        size="medium"
        color="#fff"
        showSkip={true}
        closeOnOutsideTap={true}
        onSkip={() => setShowPopup(false)}
      >
        {/* Main Content Container - Child of PopupBg */}
        <View style={[styles.popupContent, { width: '100%' }]}>
          {/* Title Section - Child of Content */}
          <View style={styles.popupTitleSection}>
            <Text style={[styles.popupTitle, { 
              color: colors.text,
              fontSize: getResponsiveSize(18, 20, 24)
            }]}>
              {suggestion?.title}
            </Text>
          </View>

          {/* Options Section - Child of Content */}
          <View style={styles.popupOptionsSection}>
            {suggestion?.options.map(opt => (
              <TouchableOpacity 
                key={opt} 
                style={[styles.suggestionButton, { 
                  width: vw(80),
                  paddingVertical: getResponsiveSize(10, 12, 14)
                }]} 
                onPress={() => setShowPopup(false)}
              >
                <Text style={[styles.suggestionButtonText, { 
                  color: colors.primary,
                  fontSize: getResponsiveSize(14, 16, 18)
                }]}>
                  {opt}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </PopupBg>
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
    backgroundColor: '#2563eb',
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