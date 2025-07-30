import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { PreviousScreenProvider } from '@/components/ui/PreviousScreenContext';
import { OnboardingProvider } from '@/contexts/OnboardingContext';
import { SensoryModeProvider } from '@/contexts/SensoryModeContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// export default function Layout() {
//   return (
//     <ClerkProvider>
//       <Slot />
//     </ClerkProvider>
//   )
// }

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
    <OnboardingProvider>
      <SensoryModeProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <PreviousScreenProvider>
            <Stack
              screenOptions={{
                contentStyle: { backgroundColor: '#e0e5de' }, // Updated background color
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="menu" options={{ headerShown: false }} />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </PreviousScreenProvider>
        </ThemeProvider>
      </SensoryModeProvider>
    </OnboardingProvider>
  );
}
