/**
 * Transcription Service for KindFrame
 * Handles audio-to-text conversion using Supabase Edge Functions
 */

import { supabase } from '@/lib/supabase';
import { Platform } from 'react-native';

export interface TranscriptionResult {
  success: boolean;
  transcriptId?: string;
  rawText?: string;
  cleanedText?: string;
  tasks?: Array<{
    title: string;
    due?: string;
    tags?: string[];
    priority?: 'low' | 'med' | 'high';
  }>;
  error?: string;
  meta?: {
    provider: string;
    platform: string;
    confidence?: number;
    taskCount: number;
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
        tasks: transcribeResult.tasks,
        meta: transcribeResult.meta
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
   * Process text directly (for web speech API results)
   */
  static async processText(
    text: string,
    platform: 'web' | 'electron' = 'web'
  ): Promise<TranscriptionResult> {
    try {
      console.log('🎤 TRANSCRIPTION: Processing text directly:', text.substring(0, 100));

      const { data, error } = await supabase.functions.invoke('process_text', {
        body: {
          text: text.trim(),
          platform,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
        }
      });

      if (error) {
        console.error('🎤 TRANSCRIPTION: Edge function error:', error);
        return { success: false, error: error.message || 'Processing failed' };
      }

      if (!data || data.error) {
        console.error('🎤 TRANSCRIPTION: Response error:', data?.error);
        return { success: false, error: data?.message || 'Processing failed' };
      }

      console.log('✅ TRANSCRIPTION: Text processing successful');
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
      console.log('🎤 TRANSCRIPTION: Starting transcription for:', storagePath);

      const { data, error } = await supabase.functions.invoke('transcribe', {
        body: {
          storagePath,
          platform,
          durationSeconds: null // Will be calculated by edge function
        }
      });

      if (error) {
        console.error('🎤 TRANSCRIPTION: Edge function error:', error);
        return { success: false, error: error.message || 'Transcription failed' };
      }

      if (!data || data.error) {
        console.error('🎤 TRANSCRIPTION: Response error:', data?.error);
        return { success: false, error: data?.message || 'Transcription failed' };
      }

      console.log('✅ TRANSCRIPTION: Audio transcription successful');
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

    const SpeechRecognition = (window as any).SpeechRecognition || 
                              (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return {
        start: () => onError('Web Speech API not supported in this browser'),
        stop: () => {},
        isSupported: false
      };
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      onResult(finalTranscript || interimTranscript, !!finalTranscript);
    };

    recognition.onerror = (event: any) => {
      onError(`Speech recognition error: ${event.error}`);
    };

    return {
      start: () => recognition.start(),
      stop: () => recognition.stop(),
      isSupported: true
    };
  }
}
