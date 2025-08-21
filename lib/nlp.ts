/**
 * Client-side NLP Helpers
 * 
 * Typed helpers for text processing and Web Speech API
 * Handles neutral error messages and platform detection
 */

import { supabase } from './supabase';

export interface ProcessTextResponse {
  transcript: {
    id: string;
    rawText: string;
    cleanedText: string;
    meta?: Record<string, unknown>;
  };
  tasks: Array<{
    title: string;
    due?: string;
    tags?: string[];
    priority?: 'low' | 'med' | 'high';
  }>;
  meta: {
    provider: string;
    model?: string;
    platform: string;
    confidence?: number;
    taskCount: number;
    [key: string]: unknown;
  };
}

export interface NLPError {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Process text with deterministic NLP
 * Calls the /process_text_func Edge Function
 */
export async function processText(
  text: string, 
  platform: 'web' | 'electron'
): Promise<ProcessTextResponse> {
  try {
    console.log('📝 Starting text processing...');
    
    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length < 3) {
      throw new Error('Please provide more text content to process');
    }

    if (text.length > 10000) {
      throw new Error('Text content is too long. Please keep it under 10,000 characters');
    }

    // Get current session for JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Please sign in to use text processing services');
    }

    // Call process_text_func Edge Function
    const functionsUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('Text processing service not configured');
    }

    const response = await fetch(`${functionsUrl}/process_text_func`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: text.trim(),
        options: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          userId: session.user?.id || 'anonymous',
          maxItems: 15
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || 'We couldn\'t process your text. Please try again.';
      throw new Error(message);
    }

    const result = await response.json();
    console.log('✅ Text processing completed');
    
    return result;

  } catch (error) {
    console.error('❌ Text processing failed:', error);
    
    // Return neutral error message
    const message = error instanceof Error 
      ? error.message 
      : 'We couldn\'t process your text. Please try again.';
    
    throw new Error(message);
  }
}

/**
 * Check if Web Speech API is supported and available
 */
export function isWebSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  
  return !!(
    window.SpeechRecognition || 
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition
  );
}

/**
 * Check if browser supports dictation engines (for Electron)
 * Returns quickly to help UI decide on fallback options
 */
export function engineSupportsDictation(): boolean {
  // Check if we're in Electron
  if (typeof window !== 'undefined' && window.process?.versions?.electron) {
    // In Electron, check if Web Speech API is available
    // This depends on the OS speech engine
    return isWebSpeechSupported();
  }
  
  // For regular web browsers
  return isWebSpeechSupported();
}

/**
 * Get speech recognition instance with proper browser compatibility
 */
export function createSpeechRecognition(): SpeechRecognition | null {
  if (!isWebSpeechSupported()) return null;
  
  const SpeechRecognition = 
    window.SpeechRecognition || 
    (window as any).webkitSpeechRecognition ||
    (window as any).mozSpeechRecognition ||
    (window as any).msSpeechRecognition;
  
  if (!SpeechRecognition) return null;
  
  const recognition = new SpeechRecognition();
  
  // Configure for best results
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US'; // TODO: Make this configurable
  recognition.maxAlternatives = 1;
  
  return recognition;
}

/**
 * Start Web Speech API recognition with error handling
 */
export function startSpeechRecognition(
  onResult: (transcript: string, isFinal: boolean) => void,
  onError: (error: string) => void,
  onEnd: () => void
): SpeechRecognition | null {
  const recognition = createSpeechRecognition();
  
  if (!recognition) {
    onError('Speech recognition is not supported in this browser');
    return null;
  }

  // Set up event handlers
  recognition.onresult = (event) => {
    let finalTranscript = '';
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
      }
    }

    // Call the result handler
    if (finalTranscript) {
      onResult(finalTranscript, true);
    } else if (interimTranscript) {
      onResult(interimTranscript, false);
    }
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    
    // Provide user-friendly error messages
    let errorMessage = 'We couldn\'t understand the audio. Please try again.';
    
    switch (event.error) {
      case 'network':
        errorMessage = 'Network connection issue. Please check your internet connection.';
        break;
      case 'not-allowed':
        errorMessage = 'Microphone access is required. Please allow microphone access and try again.';
        break;
      case 'no-speech':
        errorMessage = 'No speech was detected. Please try speaking more clearly.';
        break;
      case 'aborted':
        errorMessage = 'Speech recognition was stopped.';
        break;
      case 'audio-capture':
        errorMessage = 'Microphone is not available. Please check your microphone and try again.';
        break;
      case 'service-not-allowed':
        errorMessage = 'Speech recognition service is not available.';
        break;
    }
    
    onError(errorMessage);
  };

  recognition.onend = () => {
    console.log('Speech recognition ended');
    onEnd();
  };

  // Start recognition
  try {
    recognition.start();
    console.log('🎤 Speech recognition started');
    return recognition;
  } catch (error) {
    console.error('Failed to start speech recognition:', error);
    onError('Failed to start speech recognition. Please try again.');
    return null;
  }
}

/**
 * Stop speech recognition gracefully
 */
export function stopSpeechRecognition(recognition: SpeechRecognition | null): void {
  if (recognition) {
    try {
      recognition.stop();
      console.log('🛑 Speech recognition stopped');
    } catch (error) {
      console.warn('Error stopping speech recognition:', error);
    }
  }
}

/**
 * Simple text cleaning for client-side preview
 * Lightweight version of server-side cleaning
 */
export function previewCleanText(text: string): string {
  if (!text || typeof text !== 'string') return '';
  
  return text
    .trim()
    .replace(/\s+/g, ' ') // Normalize whitespace
    .replace(/\b(um|uh|er|ah|like|you know)\b/gi, '') // Remove common fillers
    .replace(/\s+/g, ' ') // Clean up extra spaces
    .trim();
}

/**
 * Simple task detection for client-side preview
 * Lightweight version of server-side extraction
 */
export function previewExtractTasks(text: string): Array<{ title: string; confidence: number }> {
  if (!text || typeof text !== 'string') return [];
  
  const tasks: Array<{ title: string; confidence: number }> = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  // Simple patterns for quick preview
  const taskPatterns = [
    /\b(need to|should|have to|remember to)\s+(.+)/gi,
    /\b(call|email|buy|get|finish|complete)\s+(.+)/gi,
    /^(make|create|write|do)\s+(.+)/gi,
  ];
  
  sentences.forEach(sentence => {
    const trimmed = sentence.trim();
    if (trimmed.length < 5) return;
    
    taskPatterns.forEach(pattern => {
      const matches = [...trimmed.matchAll(pattern)];
      matches.forEach(match => {
        const taskText = (match[2] || match[1] || match[0]).trim();
        if (taskText.length >= 3) {
          tasks.push({
            title: taskText,
            confidence: 0.7, // Simple confidence for preview
          });
        }
      });
    });
  });
  
  // Remove duplicates and limit results
  const unique = tasks.filter((task, index, self) => 
    self.findIndex(t => t.title.toLowerCase() === task.title.toLowerCase()) === index
  );
  
  return unique.slice(0, 5); // Limit to 5 tasks for preview
}
