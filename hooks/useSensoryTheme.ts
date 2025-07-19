import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

export type SensoryTheme = 'low' | 'medium' | 'high';

const SENSORY_THEME_KEY = '@kindframe_sensory_theme';

export function useSensoryTheme() {
  const [theme, setTheme] = useState<SensoryTheme>('low');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const savedTheme = await AsyncStorage.getItem(SENSORY_THEME_KEY);
      if (savedTheme && ['low', 'medium', 'high'].includes(savedTheme)) {
        setTheme(savedTheme as SensoryTheme);
      } else {
        // Default to low sensory for first-time users
        setTheme('low');
        await AsyncStorage.setItem(SENSORY_THEME_KEY, 'low');
      }
    } catch (error) {
      console.error('Error loading sensory theme:', error);
      setTheme('low');
    } finally {
      setIsLoading(false);
    }
  };

  const updateTheme = async (newTheme: SensoryTheme) => {
    try {
      await AsyncStorage.setItem(SENSORY_THEME_KEY, newTheme);
      setTheme(newTheme);
    } catch (error) {
      console.error('Error saving sensory theme:', error);
    }
  };

  return {
    theme,
    updateTheme,
    isLoading,
  };
} 