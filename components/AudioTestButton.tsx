/**
 * Simple Audio Test Button for Testing Voice Input
 * Can be added to any screen for quick testing
 */

import { TranscriptionService } from '@/services/transcriptionService';
import React, { useState } from 'react';
import { Alert, Platform, Text, TouchableOpacity, View } from 'react-native';

interface AudioTestButtonProps {
  onResult?: (text: string, tasks?: any[]) => void;
}

export function AudioTestButton({ onResult }: AudioTestButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const testWebSpeech = async () => {
    if (Platform.OS !== 'web') {
      Alert.alert('Web Speech API Test', 'This test only works in web browsers');
      return;
    }

    setIsProcessing(true);
    
    const webSpeechAPI = TranscriptionService.initializeWebSpeechAPI(
      async (text, isFinal) => {
        if (isFinal && text.trim()) {
          console.log('🎤 TEST: Final result:', text);
          
          // Process the text for task extraction
          const result = await TranscriptionService.processText(text);
          
          if (result.success) {
            console.log('✅ TEST: Processing successful');
            onResult?.(result.cleanedText || text, result.tasks);
            Alert.alert(
              'Speech Recognition Success!', 
              `Text: "${result.cleanedText}"\nTasks found: ${result.tasks?.length || 0}`
            );
          } else {
            console.error('❌ TEST: Processing failed:', result.error);
            onResult?.(text, []);
            Alert.alert('Speech Recognition', `Text: "${text}"\nTask processing failed: ${result.error}`);
          }
          
          setIsProcessing(false);
        }
      },
      (error) => {
        console.error('🎤 TEST: Error:', error);
        Alert.alert('Speech Recognition Error', error);
        setIsProcessing(false);
      }
    );

    if (!webSpeechAPI.isSupported) {
      Alert.alert('Not Supported', 'Web Speech API is not supported in this browser');
      setIsProcessing(false);
      return;
    }

    try {
      webSpeechAPI.start();
      Alert.alert('Listening...', 'Speak now! Tap OK when finished.', [
        {
          text: 'Stop',
          onPress: () => {
            webSpeechAPI.stop();
            setIsProcessing(false);
          }
        }
      ]);
    } catch (error) {
      console.error('🎤 TEST: Failed to start:', error);
      Alert.alert('Error', 'Failed to start speech recognition');
      setIsProcessing(false);
    }
  };

  return (
    <View style={{ margin: 16 }}>
      <TouchableOpacity
        onPress={testWebSpeech}
        disabled={isProcessing}
        style={{
          backgroundColor: isProcessing ? '#ccc' : '#007AFF',
          padding: 12,
          borderRadius: 8,
          alignItems: 'center'
        }}
      >
        <Text style={{ color: 'white', fontWeight: 'bold' }}>
          {isProcessing ? 'Processing...' : '🎤 Test Voice Input'}
        </Text>
      </TouchableOpacity>
      <Text style={{ fontSize: 12, color: '#666', textAlign: 'center', marginTop: 4 }}>
        {Platform.OS === 'web' ? 'Web Speech API Test' : 'Web only - use QuickJot for mobile'}
      </Text>
    </View>
  );
}
