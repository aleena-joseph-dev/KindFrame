import { useRouter } from 'expo-router';
import React from 'react';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = React.useState(false);

  // Wait for the router to be ready before navigating
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsReady(true);
      router.replace('/(tabs)');
    }, 100); // Small delay to ensure layout is mounted

    return () => clearTimeout(timer);
  }, [router]);

  // Show loading indicator while waiting
  if (!isReady) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        backgroundColor: '#e0e5de'
      }}>
        <ActivityIndicator size="large" color="#4285f4" />
      </View>
    );
  }

  return null;
} 