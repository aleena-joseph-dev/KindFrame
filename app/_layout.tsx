import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';

// Apply body styles immediately on script load (before React)
if (typeof document !== 'undefined') {
  const applyImmediateBodyStyles = () => {
    if (document.body) {
      document.body.style.position = 'relative';
      document.body.style.zIndex = '2000';
      console.log('🎯 IMMEDIATE BODY STYLES APPLIED');
    }
  };
  
  // Apply immediately if body exists
  applyImmediateBodyStyles();
  
  // Also apply when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyImmediateBodyStyles);
  } else {
    applyImmediateBodyStyles();
  }
}

import { GlobalSaveWorkModal } from '@/components/ui/GlobalSaveWorkModal';
import { PreviousScreenProvider } from '@/components/ui/PreviousScreenContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { GuestDataProvider } from '@/contexts/GuestDataContext';
import { GuestModeProvider } from '@/contexts/GuestModeContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { SensoryModeProvider } from '@/contexts/SensoryModeContext';
import { TutorialProvider } from '@/contexts/TutorialContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// Global styles for web platform
const GlobalStyles = () => {
  useEffect(() => {
    if (typeof document !== 'undefined') {
      // Apply styles immediately
      const applyBodyStyles = () => {
        if (document.body) {
          document.body.style.position = 'relative';
          document.body.style.zIndex = '2000';
          console.log('🎯 BODY STYLES APPLIED:', {
            position: document.body.style.position,
            zIndex: document.body.style.zIndex
          });
        }
      };

      // Apply immediately if body exists
      applyBodyStyles();

      // Also apply via CSS injection with multiple attempts
      const style = document.createElement('style');
      style.id = 'global-body-styles';
      style.textContent = `
        body {
          position: relative !important;
          z-index: 2000 !important;
        }
        
        html body {
          position: relative !important;
          z-index: 2000 !important;
        }
        
        body[data-expo-root] {
          position: relative !important;
          z-index: 2000 !important;
        }
        
        /* Force override any existing styles */
        * {
          box-sizing: border-box;
        }
        
        body, html body, body[data-expo-root] {
          position: relative !important;
          z-index: 2000 !important;
        }
        
        /* Tutorial overlay components - positioned above overlay */
        .tutorial-highlight-component {
          z-index: 3000 !important;
          position: absolute !important;
          pointer-events: none !important;
        }
      `;
      
      // Remove existing style if it exists
      const existingStyle = document.getElementById('global-body-styles');
      if (existingStyle) {
        existingStyle.remove();
      }
      
      document.head.appendChild(style);
      
      // Apply again after a short delay to ensure it sticks
      setTimeout(applyBodyStyles, 100);
      setTimeout(applyBodyStyles, 500);
      setTimeout(applyBodyStyles, 1000);
      
      console.log('🎯 GLOBAL STYLES APPLIED: Body element styled with position: relative and z-index: 2000');
    }
  }, []);

  return null;
};


export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <>
      <GlobalStyles />
      <AuthProvider>
        <OnboardingProvider>
          <GuestModeProvider>
            <SensoryModeProvider>
              <TutorialProvider>
                <GuestDataProvider>
                  <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
                    <PreviousScreenProvider>
                    <Stack
                      screenOptions={{
                        contentStyle: { backgroundColor: '#e0e5de' }, // Updated background color
                      }}
                    >
                      <Stack.Screen name="index" options={{ headerShown: false }} />
                      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
                      <Stack.Screen name="menu" options={{ headerShown: false }} />
                      <Stack.Screen name="auth-callback/index" options={{ headerShown: false }} />
                      <Stack.Screen name="+not-found" />
                    </Stack>
                    <StatusBar style="auto" />
                    <GlobalSaveWorkModal />
                    </PreviousScreenProvider>
                  </ThemeProvider>
                </GuestDataProvider>
              </TutorialProvider>
            </SensoryModeProvider>
          </GuestModeProvider>
        </OnboardingProvider>
      </AuthProvider>
    </>
  );
}
