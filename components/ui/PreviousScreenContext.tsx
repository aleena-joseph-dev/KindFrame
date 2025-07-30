import { useRouter } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

interface PreviousScreenContextType {
  navigationStack: string[];
  addToStack: (screenName: string) => void;
  removeFromStack: () => void;
  getCurrentScreen: () => string | null;
  getPreviousScreen: () => string | null;
  handleBack: (defaultFallback?: 'home' | 'menu') => void;
  resetStack: () => void;
}

const PreviousScreenContext = createContext<PreviousScreenContextType>({
  navigationStack: [],
  addToStack: () => {},
  removeFromStack: () => {},
  getCurrentScreen: () => null,
  getPreviousScreen: () => null,
  handleBack: () => {},
  resetStack: () => {},
});

export const PreviousScreenProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [navigationStack, setNavigationStack] = useState<string[]>([]);
  const router = useRouter();

  const addToStack = useCallback((screenName: string) => {
    console.log('addToStack called with screenName:', screenName);
    
    setNavigationStack(prev => {
      console.log('Current stack before adding:', prev);
      if (prev.length > 0 && prev[prev.length - 1] === screenName) {
        console.log('Preventing duplicate consecutive screen:', screenName);
        return prev; // Prevent adding duplicate consecutive screens
      }
      const newStack = [...prev, screenName];
      console.log('Navigation Stack:', newStack);
      return newStack;
    });
  }, []);

  const removeFromStack = useCallback(() => {
    console.log('removeFromStack called');
    
    setNavigationStack(prev => {
      console.log('Current stack before removal:', prev);
      const newStack = [...prev];
      const removedScreen = newStack.pop();
      console.log('Removed screen:', removedScreen);
      console.log('New stack after removal:', newStack);
      return newStack;
    });
  }, []);

  const getCurrentScreen = useCallback(() => {
    return navigationStack.length > 0 ? navigationStack[navigationStack.length - 1] : null;
  }, [navigationStack]);

  const getPreviousScreen = useCallback(() => {
    return navigationStack.length > 1 ? navigationStack[navigationStack.length - 2] : null;
  }, [navigationStack]);

  const resetStack = useCallback(() => {
    setNavigationStack(['home']);
  }, []);

  const handleBack = useCallback((defaultFallback: 'home' | 'menu' = 'menu') => {
    console.log('handleBack called with defaultFallback:', defaultFallback);
    console.log('Current stack before removal:', navigationStack);
    
    setNavigationStack(prev => {
      console.log('Current stack in setState:', prev);
      if (prev.length === 0) {
        console.log('Stack is empty, using default fallback');
        // If stack is empty, use default fallback
        if (defaultFallback === 'home') {
          router.push('/(tabs)');
        } else {
          router.push('/menu');
        }
        return prev;
      }
      
      const newStack = [...prev];
      const removedScreen = newStack.pop();
      console.log('Removed screen:', removedScreen);
      console.log('New stack after removal:', newStack);
      
      // Determine where to navigate based on the new top of stack
      const newCurrentScreen = newStack.length > 0 ? newStack[newStack.length - 1] : null;
      console.log('New current screen after removal:', newCurrentScreen);
      
      if (newCurrentScreen === 'home') {
        console.log('Navigating to home');
        router.push('/(tabs)');
      } else if (newCurrentScreen === 'menu') {
        console.log('Navigating to menu');
        router.push('/menu');
      } else if (newCurrentScreen === 'zone-out') {
        console.log('Navigating to zone-out');
        router.push('/(tabs)/zone-out');
      } else if (newCurrentScreen === 'breathe') {
        console.log('Navigating to breathe');
        router.push('/(tabs)/breathe');
      } else if (newCurrentScreen === 'todo') {
        console.log('Navigating to todo');
        router.push('/(tabs)/todo');
      } else if (newCurrentScreen === 'calendar') {
        console.log('Navigating to calendar');
        router.push('/(tabs)/calendar');
      } else if (newCurrentScreen === 'pomodoro') {
        console.log('Navigating to pomodoro');
        router.push('/(tabs)/pomodoro');
      } else if (newCurrentScreen === 'todo-review') {
        console.log('Navigating to todo-review');
        router.push('/(tabs)/todo-review');
      } else if (newCurrentScreen === 'kanban') {
        console.log('Navigating to kanban');
        router.push('/(tabs)/kanban');
      } else if (newCurrentScreen === 'goals') {
        console.log('Navigating to goals');
        router.push('/(tabs)/goals');
      } else if (newCurrentScreen === 'mood-tracker') {
        console.log('Navigating to mood-tracker');
        router.push('/(tabs)/mood-tracker');
      } else if (newCurrentScreen === 'quick-jot') {
        console.log('Navigating to quick-jot');
        router.push('/(tabs)/quick-jot');
      } else if (newCurrentScreen === 'notes') {
        console.log('Navigating to notes');
        router.push('/(tabs)/notes');
      } else {
        // If no screen in stack or current screen was the only one, use default fallback
        console.log('Using default fallback:', defaultFallback);
        if (defaultFallback === 'home') {
          router.push('/(tabs)');
        } else {
          router.push('/menu');
        }
      }
      
      return newStack;
    });
  }, [navigationStack, router]);

  const contextValue = useMemo(() => ({
    navigationStack,
    addToStack,
    removeFromStack,
    getCurrentScreen,
    getPreviousScreen,
    handleBack,
    resetStack,
  }), [navigationStack, addToStack, removeFromStack, getCurrentScreen, getPreviousScreen, handleBack, resetStack]);

  return (
    <PreviousScreenContext.Provider value={contextValue}>
      {children}
    </PreviousScreenContext.Provider>
  );
};

export function usePreviousScreen() {
  return useContext(PreviousScreenContext);
} 