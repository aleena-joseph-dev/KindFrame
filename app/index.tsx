import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Text, View } from 'react-native';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to tabs after a short delay
    const timer = setTimeout(() => {
      router.replace('/(tabs)');
    }, 2000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <View style={{ 
      flex: 1, 
      justifyContent: 'center', 
      alignItems: 'center', 
      backgroundColor: '#e0e5de',
      padding: 20
    }}>
      <Text style={{ fontSize: 32, fontWeight: 'bold', color: '#222', marginBottom: 20 }}>
        KindFrame App
      </Text>
      <Text style={{ fontSize: 18, color: '#666', textAlign: 'center', lineHeight: 24 }}>
        Welcome to your neurodivergent-friendly productivity app!
      </Text>
      <Text style={{ fontSize: 14, color: '#888', marginTop: 20, textAlign: 'center' }}>
        Redirecting to main app...
      </Text>
    </View>
  );
} 