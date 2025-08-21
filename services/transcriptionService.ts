/**
 * Transcription Service for KindFrame
 * Handles audio-to-text conversion using Supabase Edge Functions
 */

import { initEnhancedWebSpeech } from '@/lib/enhancedSpeechCapture';
import { cleanTranscript } from '@/lib/refineTranscript';
import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';
import { validateOrFallback, type CanonicalResult } from './processTextLocal';

export interface TranscriptionResult {
  success: boolean;
  transcriptId?: string;
  rawText?: string;
  cleanedText?: string;
  tasks?: CanonicalResult; // Use canonical result format
  error?: string;
  meta?: {
    provider: string;
    platform: string;
    confidence?: number;
    taskCount: number;
    textProcessingProvider?: 'edge' | 'local';
  };
}

export interface UploadProgress {
  progress: number;
  stage: 'uploading' | 'transcribing' | 'processing' | 'complete';
  message: string;
}

export class TranscriptionService {
  /**
   * Process audio file through the complete pipeline:
   * 1. Upload to Supabase Storage
   * 2. Transcribe using Deepgram (via edge function)
   * 3. Extract tasks using NLP (via edge function)
   */
  static async processAudioFile(
    audioUri: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<TranscriptionResult> {
    try {
      const platform = Platform.OS === 'web' ? 'web' : 
                      Platform.OS === 'android' ? 'android' : 'ios';

      // Step 1: Upload audio file to storage
      onProgress?.({ 
        progress: 10, 
        stage: 'uploading', 
        message: 'Uploading audio file...' 
      });

      const uploadResult = await this.uploadAudioFile(audioUri);
      if (!uploadResult.success) {
        return { success: false, error: uploadResult.error };
      }

      onProgress?.({ 
        progress: 30, 
        stage: 'transcribing', 
        message: 'Converting speech to text...' 
      });

      // Step 2: Transcribe audio using edge function
      const transcribeResult = await this.transcribeAudio(
        uploadResult.storagePath!,
        platform as 'android' | 'ios'
      );

      if (!transcribeResult.success) {
        return { success: false, error: transcribeResult.error };
      }

      onProgress?.({ 
        progress: 80, 
        stage: 'processing', 
        message: 'Extracting tasks from text...' 
      });

      // Step 3: Extract tasks using edge function with local fallback
      const taskResult = await this.processTextWithFallback(
        transcribeResult.cleanedText!, 
        platform
      );

      onProgress?.({ 
        progress: 100, 
        stage: 'complete', 
        message: 'Processing complete!' 
      });

      return {
        success: true,
        transcriptId: transcribeResult.transcriptId,
        rawText: transcribeResult.rawText,
        cleanedText: transcribeResult.cleanedText,
        tasks: taskResult,
        meta: {
          provider: transcribeResult.meta?.provider || 'unknown',
          platform,
          confidence: taskResult.confidence,
          taskCount: taskResult.items.length,
          textProcessingProvider: taskResult.forced_rules_applied.includes('local_fallback') ? 'local' : 'edge'
        }
      };

    } catch (error) {
      console.error('🎤 TRANSCRIPTION: Error processing audio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }



  /**
   * Process text with edge function first, fallback to local processing
   */
  static async processTextWithFallback(
    text: string, 
    platform: 'android' | 'ios' | 'web'
  ): Promise<CanonicalResult> {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    // Apply text cleaning (time format fixes, grammar corrections, etc.)
    const cleanedText = cleanTranscript(text);
    console.log('🧹 CLEANED INPUT:', cleanedText);
    
    try {
      console.log('🔄 PROCESS_TEXT_FUNC: Processing text input');
      console.log('📝 ORIGINAL INPUT:', text);
      console.log('📝 CLEANED INPUT:', cleanedText);
      console.log('📏 INPUT LENGTH:', cleanedText.length);

          // Use Supabase client for proper CORS handling
          const result = await supabase.functions.invoke('process_text_func', {
            body: {
              input: cleanedText,
              options: {
                timezone,
                userId: 'anonymous',
                maxItems: 15
              }
            }
          });
          
          const data = result.data;
          const error = result.error;
          
          console.log('✅ PROCESS_TEXT_FUNC: Response received');
          console.log('📄 CLEANED TEXT:', data?.cleaned_text);
          console.log('📋 EXTRACTED ITEMS:', data?.items?.length || 0, 'items');
          console.log('🎯 SUGGESTION:', data?.suggestion);
          if (data?.items) {
            data.items.forEach((item: any, index: number) => {
              console.log(`  ${index + 1}. [${item.type}] ${item.title}`);
            });
          }

          console.log('🔍 PROCESS_TEXT_FUNC: Raw response debug:', {
            hasError: !!error,
            hasData: !!data,
            dataKeys: data ? Object.keys(data) : null,
            errorMessage: error?.message || null
          });

      if (error) {
        console.warn('❌ PROCESS_TEXT_FUNC: Edge function error, falling back to local processing:', error);
        return validateOrFallback(null, cleanedText);
      }

      if (!data) {
        console.warn('❌ PROCESS_TEXT_FUNC: No data received, falling back to local processing');
        return validateOrFallback(null, cleanedText);
      }

      if (data.error) {
        console.warn('❌ PROCESS_TEXT_FUNC: Data contains error, falling back to local processing:', data.error);
        return validateOrFallback(null, cleanedText);
      }

      // Convert new function response format to expected CanonicalResult format
      const convertedResult: CanonicalResult = {
        items: data.items.map((item: any) => ({
          type: item.type === 'task' ? 'Task' : 
                item.type === 'todo' ? 'To-do' :
                item.type === 'event' ? 'Event' :
                item.type === 'note' ? 'Note' :
                item.type === 'journal' ? 'Journal' : 'Note',
          title: item.title || item.body || 'Untitled',
          details: item.body || item.notes || null,
          due_iso: item.start || null,
          duration_min: null, // Not provided in new schema
          location: item.location || null,
          subtasks: []
        })),
        suggested_overall_category: data.suggestion.inferredType === 'task' ? 'Task' :
                                   data.suggestion.inferredType === 'todo' ? 'To-do' :
                                   data.suggestion.inferredType === 'event' ? 'Event' :
                                   data.suggestion.inferredType === 'note' ? 'Note' :
                                   data.suggestion.inferredType === 'journal' ? 'Journal' : 'Note',
        forced_rules_applied: ['process_text_func'],
        warnings: data.followups || [],
        confidence: data.suggestion.confidence
      };
      
      // Clean, focused output logging
      console.log('✅ PROCESS_TEXT_FUNC: Success');
      console.log('📊 OUTPUT:', {
        items: convertedResult.items.length,
        types: convertedResult.items.map(item => item.type),
        suggestion: convertedResult.suggested_overall_category,
        confidence: convertedResult.confidence,
        followups: data.followups?.length || 0
      });
      
      if (convertedResult.items.length > 0) {
        console.log('📝 ITEMS:', convertedResult.items.map(item => ({
          type: item.type,
          title: item.title,
          whenText: data.items.find((di: any) => di.title === item.title || di.body === item.title)?.whenText
        })));
      }

      return convertedResult;

            } catch (error) {
          console.warn('❌ PROCESS_TEXT_FUNC: Exception occurred, falling back to local processing:', error);
          return validateOrFallback(null, cleanedText);
        }
  }

  /**
   * Process text directly (for web speech API results)
   * @deprecated Use processTextWithFallback instead for better reliability
   */
  static async processText(
    text: string,
    platform: 'web' | 'electron' = 'web'
  ): Promise<TranscriptionResult> {
    try {

      const { data, error } = await supabase.functions.invoke('process_text_func', {
        body: {
          input: text.trim(),
          options: {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            userId: 'anonymous',
            maxItems: 15
          }
        }
      });

      if (error) {
        return { success: false, error: error.message || 'Processing failed' };
      }

      if (!data || data.error) {
        return { success: false, error: data?.message || 'Processing failed' };
      }
      return {
        success: true,
        transcriptId: data.transcript.id,
        rawText: data.transcript.rawText,
        cleanedText: data.transcript.cleanedText,
        tasks: data.tasks,
        meta: data.meta
      };

    } catch (error) {
      console.error('🎤 TRANSCRIPTION: Error processing text:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Text processing failed' 
      };
    }
  }

  /**
   * Upload audio file to Supabase Storage
   */
  private static async uploadAudioFile(audioUri: string): Promise<{
    success: boolean;
    storagePath?: string;
    error?: string;
  }> {
    try {
      console.log('🎤 TRANSCRIPTION: Starting audio upload:', audioUri);

      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return { success: false, error: 'User not authenticated' };
      }

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `audio_${timestamp}.m4a`;
      const storagePath = `${user.id}/${filename}`;

      // Convert URI to File/Blob for upload
      let audioFile: File | Blob;
      
      if (Platform.OS === 'web') {
        // Web: Convert data URL to blob if needed
        if (audioUri.startsWith('data:')) {
          const response = await fetch(audioUri);
          audioFile = await response.blob();
        } else {
          const response = await fetch(audioUri);
          audioFile = await response.blob();
        }
      } else {
        // React Native: Create FormData
        const formData = new FormData();
        formData.append('file', {
          uri: audioUri,
          type: 'audio/m4a',
          name: filename,
        } as any);
        audioFile = formData as any;
      }

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from('audio')
        .upload(storagePath, audioFile, {
          contentType: 'audio/m4a',
          upsert: false
        });

      if (error) {
        console.error('🎤 TRANSCRIPTION: Storage upload error:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ TRANSCRIPTION: Audio uploaded successfully:', data.path);
      return { success: true, storagePath: data.path };

    } catch (error) {
      console.error('🎤 TRANSCRIPTION: Upload error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      };
    }
  }

  /**
   * Transcribe audio using Supabase Edge Function
   */
  private static async transcribeAudio(
    storagePath: string,
    platform: 'android' | 'ios'
  ): Promise<{
    success: boolean;
    transcriptId?: string;
    rawText?: string;
    cleanedText?: string;
    tasks?: any[];
    meta?: any;
    error?: string;
  }> {
    try {
      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: {
          storagePath,
          platform,
          durationSeconds: null // Will be calculated by edge function
        }
      });

      if (error) {
        console.error('❌ TRANSCRIBE: Edge function error:', error);
        return { success: false, error: error.message || 'Transcription failed' };
      }

      if (!data || data.error) {
        console.error('❌ TRANSCRIBE: Response error:', data?.error);
        return { success: false, error: data?.message || 'Transcription failed' };
      }

      console.log('✅ TRANSCRIBE: Audio processed successfully');
      return {
        success: true,
        transcriptId: data.transcript.id,
        rawText: data.transcript.rawText,
        cleanedText: data.transcript.cleanedText,
        tasks: data.tasks,
        meta: data.meta
      };

    } catch (error) {
      console.error('🎤 TRANSCRIPTION: Transcription error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Transcription failed' 
      };
    }
  }

  /**
   * Web Speech API integration for browsers
   */
  static initializeWebSpeechAPI(
    onResult: (text: string, isFinal: boolean) => void,
    onError: (error: string) => void
  ): {
    start: () => void;
    stop: () => void;
    isSupported: boolean;
  } {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return {
        start: () => onError('Web Speech API not available'),
        stop: () => {},
        isSupported: false
      };
    }

    let stopRecognition: (() => void) | null = null;
    let isRecording = false;

    const start = () => {
      if (isRecording) return;
      
      try {
        isRecording = true;
        stopRecognition = initEnhancedWebSpeech(
          (interimText) => {
            onResult(interimText, false);
          },
          (finalText) => {
            console.log('🎤 SPEECH: Final text captured');
            onResult(finalText, true);
          },
          {
            language: "en-US",
            continuous: true,
            interimResults: true,
            maxAlternatives: 5,
            noiseReduction: true
          }
        );
      } catch (error) {
        onError(`Failed to start speech recognition: ${error}`);
        isRecording = false;
      }
    };

    const stop = () => {
      if (stopRecognition) {
        stopRecognition();
        stopRecognition = null;
      }
      isRecording = false;
    };

    return {
      start,
      stop,
      isSupported: true
    };
  }
}
