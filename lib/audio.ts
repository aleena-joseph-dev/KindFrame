/**
 * Client-side Audio Helpers
 * 
 * Typed helpers for audio upload and transcription
 * Handles neutral error messages and JWT authentication
 */

import * as FileSystem from 'expo-file-system';
import { v4 as uuid } from 'uuid';
import { supabase } from './supabase';

export interface UploadResponse {
  storagePath: string;
  bytes: number;
  mimeType: string;
}

export interface TranscribeResponse {
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

export interface AudioError {
  error: string;
  message: string;
  details?: unknown;
}

/**
 * Upload audio file to Supabase Storage
 * Returns storage path, file size, and MIME type
 */
export async function uploadAudio(localUri: string): Promise<UploadResponse> {
  try {
    console.log('📤 Starting audio upload...');
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please sign in to upload audio files');
    }

    // Read file as base64
    const file = await FileSystem.readAsStringAsync(localUri, {
      encoding: FileSystem.EncodingType.Base64
    });

    // Generate unique filename
    const fileName = `${uuid()}.m4a`;
    const storagePath = `audio/${user.id}/${fileName}`;
    
    console.log('📁 Upload path:', storagePath);

    // Upload to Supabase Storage
    const { error: storageError } = await supabase.storage
      .from('audio')
      .upload(storagePath, Buffer.from(file, 'base64'), {
        contentType: 'audio/m4a',
        upsert: false
      });

    if (storageError) {
      console.error('❌ Storage upload failed:', storageError);
      throw new Error('We couldn\'t upload your audio file. Please try again.');
    }

    const bytes = Math.ceil(file.length * 0.75); // Approximate size in bytes
    
    console.log('✅ Audio uploaded successfully');
    
    return {
      storagePath,
      bytes,
      mimeType: 'audio/m4a'
    };

  } catch (error) {
    console.error('❌ Upload failed:', error);
    
    // Return neutral error message
    const message = error instanceof Error 
      ? error.message 
      : 'We couldn\'t upload your audio file. Please try again.';
    
    throw new Error(message);
  }
}

/**
 * Transcribe uploaded audio file
 * Calls the /transcribe Edge Function
 */
export async function transcribe(
  storagePath: string, 
  platform: 'android' | 'ios'
): Promise<TranscribeResponse> {
  try {
    console.log('🎤 Starting transcription...');
    
    // Get current session for JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Please sign in to use transcription services');
    }

    // Call transcribe Edge Function
    const functionsUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('Transcription service not configured');
    }

    const response = await fetch(`${functionsUrl}/transcribe`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        storagePath,
        platform,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || 'We couldn\'t process your audio. Please try again.';
      throw new Error(message);
    }

    const result = await response.json();
    console.log('✅ Transcription completed');
    
    return result;

  } catch (error) {
    console.error('❌ Transcription failed:', error);
    
    // Return neutral error message
    const message = error instanceof Error 
      ? error.message 
      : 'We couldn\'t process your audio. Please try again.';
    
    throw new Error(message);
  }
}

/**
 * Get user's audio uploads for deletion
 */
export async function getUserAudioUploads(): Promise<Array<{
  id: string;
  storage_path: string;
  file_name: string;
  created_at: string;
}>> {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Please sign in to view your files');
    }

    const { data, error } = await supabase
      .from('audio_uploads')
      .select('id, storage_path, file_name, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Failed to fetch audio uploads:', error);
      throw new Error('We couldn\'t retrieve your audio files');
    }

    return data || [];

  } catch (error) {
    console.error('❌ Get audio uploads failed:', error);
    
    const message = error instanceof Error 
      ? error.message 
      : 'We couldn\'t retrieve your audio files';
    
    throw new Error(message);
  }
}

/**
 * Delete all user's audio files immediately
 * Calls the /delete_audio_now Edge Function
 */
export async function deleteAllAudioNow(): Promise<{
  deleted: number;
  message: string;
}> {
  try {
    console.log('🗑️ Deleting all audio files...');
    
    // Get current session for JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Please sign in to delete your files');
    }

    // Call delete_audio_now Edge Function
    const functionsUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('Delete service not configured');
    }

    const response = await fetch(`${functionsUrl}/delete_audio_now`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        deleteAll: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || 'We couldn\'t delete your audio files. Please try again.';
      throw new Error(message);
    }

    const result = await response.json();
    console.log('✅ Audio files deleted');
    
    return {
      deleted: result.deleted,
      message: result.message,
    };

  } catch (error) {
    console.error('❌ Delete audio failed:', error);
    
    const message = error instanceof Error 
      ? error.message 
      : 'We couldn\'t delete your audio files. Please try again.';
    
    throw new Error(message);
  }
}

/**
 * Delete specific audio file
 */
export async function deleteAudioFile(audioUploadId: string): Promise<{
  deleted: number;
  message: string;
}> {
  try {
    console.log(`🗑️ Deleting audio file: ${audioUploadId}`);
    
    // Get current session for JWT token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      throw new Error('Please sign in to delete your files');
    }

    // Call delete_audio_now Edge Function
    const functionsUrl = process.env.EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL;
    if (!functionsUrl) {
      throw new Error('Delete service not configured');
    }

    const response = await fetch(`${functionsUrl}/delete_audio_now`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioUploadId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const message = errorData.message || 'We couldn\'t delete this audio file. Please try again.';
      throw new Error(message);
    }

    const result = await response.json();
    console.log('✅ Audio file deleted');
    
    return {
      deleted: result.deleted,
      message: result.message,
    };

  } catch (error) {
    console.error('❌ Delete audio file failed:', error);
    
    const message = error instanceof Error 
      ? error.message 
      : 'We couldn\'t delete this audio file. Please try again.';
    
    throw new Error(message);
  }
}
