/**
 * Database Helper Functions for Audio Pipeline
 * 
 * Provides clean, reusable database operations for Edge Functions
 * Handles RLS, error checking, and proper data persistence
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Task } from './types.ts';

// Initialize Supabase client for Edge Functions
export function createSupabaseClient() {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export interface AudioUploadData {
  user_id: string;
  storage_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  duration_seconds?: number;
  platform: 'android' | 'ios' | 'web' | 'electron';
}

export interface TranscriptData {
  user_id: string;
  audio_upload_id?: string; // NULL for Web Speech API
  raw_text: string;
  cleaned_text: string;
  provider: 'deepgram' | 'deterministic' | 'web_speech';
  provider_model?: string;
  platform: 'android' | 'ios' | 'web' | 'electron';
  confidence_score?: number;
  language_code?: string;
  meta?: Record<string, any>;
}

export interface TaskExtractionData {
  transcript_id: string;
  user_id: string;
  extracted_tasks: Task[];
  due_dates: Record<string, any>;
  categories: Record<string, any>;
  confidence_metrics: Record<string, any>;
  extraction_method: string;
}

/**
 * Upsert audio upload record (idempotent)
 * Prevents duplicates based on (user_id, storage_path)
 */
export async function upsertAudioUpload(
  supabase: any,
  data: AudioUploadData
): Promise<{ data: any; error: any }> {
  try {
    const { data: result, error } = await supabase
      .from('audio_uploads')
      .upsert(
        {
          user_id: data.user_id,
          storage_path: data.storage_path,
          file_name: data.file_name,
          file_size: data.file_size,
          mime_type: data.mime_type,
          duration_seconds: data.duration_seconds,
          platform: data.platform,
          created_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,storage_path',
          ignoreDuplicates: false,
        }
      )
      .select('*')
      .single();

    return { data: result, error };
  } catch (err) {
    console.error('Error upserting audio upload:', err);
    return { data: null, error: err };
  }
}

/**
 * Insert transcript record
 */
export async function insertTranscript(
  supabase: any,
  data: TranscriptData
): Promise<{ data: any; error: any }> {
  try {
    const { data: result, error } = await supabase
      .from('transcripts')
      .insert({
        user_id: data.user_id,
        audio_upload_id: data.audio_upload_id || null,
        raw_text: data.raw_text,
        cleaned_text: data.cleaned_text,
        provider: data.provider,
        provider_model: data.provider_model,
        platform: data.platform,
        confidence_score: data.confidence_score,
        language_code: data.language_code || 'en',
        meta: data.meta || {},
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    return { data: result, error };
  } catch (err) {
    console.error('Error inserting transcript:', err);
    return { data: null, error: err };
  }
}

/**
 * Insert task extraction record
 */
export async function insertTaskExtraction(
  supabase: any,
  data: TaskExtractionData
): Promise<{ data: any; error: any }> {
  try {
    const { data: result, error } = await supabase
      .from('task_extractions')
      .insert({
        transcript_id: data.transcript_id,
        user_id: data.user_id,
        extracted_tasks: data.extracted_tasks,
        due_dates: data.due_dates,
        categories: data.categories,
        confidence_metrics: data.confidence_metrics,
        extraction_method: data.extraction_method,
        created_at: new Date().toISOString(),
      })
      .select('*')
      .single();

    return { data: result, error };
  } catch (err) {
    console.error('Error inserting task extraction:', err);
    return { data: null, error: err };
  }
}

/**
 * Complete pipeline: persist transcript and task extraction
 */
export async function persistTranscriptionResult(
  supabase: any,
  userId: string,
  audioUploadId: string | null,
  rawText: string,
  cleanedText: string,
  extractionResult: {
    tasks: Task[];
    dueDates: any[];
    categories: string[];
    confidence: number;
  },
  provider: string,
  providerModel: string | undefined,
  platform: string,
  confidenceScore?: number,
  meta?: Record<string, any>
): Promise<{
  transcript: any;
  taskExtraction: any;
  error: any;
}> {
  try {
    // Insert transcript
    const transcriptData: TranscriptData = {
      user_id: userId,
      audio_upload_id: audioUploadId,
      raw_text: rawText,
      cleaned_text: cleanedText,
      provider: provider as any,
      provider_model: providerModel,
      platform: platform as any,
      confidence_score: confidenceScore,
      language_code: 'en',
      meta: meta || {},
    };

    const { data: transcript, error: transcriptError } = await insertTranscript(
      supabase,
      transcriptData
    );

    if (transcriptError) {
      throw new Error(`Failed to insert transcript: ${transcriptError.message}`);
    }

    // Insert task extraction
    const taskExtractionData: TaskExtractionData = {
      transcript_id: transcript.id,
      user_id: userId,
      extracted_tasks: extractionResult.tasks,
      due_dates: { items: extractionResult.dueDates },
      categories: { items: extractionResult.categories },
      confidence_metrics: { overall: extractionResult.confidence },
      extraction_method: 'deterministic',
    };

    const { data: taskExtraction, error: taskError } = await insertTaskExtraction(
      supabase,
      taskExtractionData
    );

    if (taskError) {
      console.warn('Failed to insert task extraction:', taskError);
      // Don't fail the whole operation if task extraction fails
    }

    return {
      transcript,
      taskExtraction,
      error: null,
    };
  } catch (err) {
    console.error('Error persisting transcription result:', err);
    return {
      transcript: null,
      taskExtraction: null,
      error: err,
    };
  }
}

/**
 * Get expired audio uploads for purging
 */
export async function getExpiredAudioUploads(
  supabase: any,
  retainHours: number = 4
): Promise<{ data: any[]; error: any }> {
  try {
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - retainHours);

    const { data, error } = await supabase
      .from('audio_uploads')
      .select('id, user_id, storage_path, file_name')
      .lt('created_at', cutoffTime.toISOString())
      .order('created_at', { ascending: true });

    return { data: data || [], error };
  } catch (err) {
    console.error('Error getting expired audio uploads:', err);
    return { data: [], error: err };
  }
}

/**
 * Delete audio upload and related records
 */
export async function deleteAudioUpload(
  supabase: any,
  audioUploadId: string,
  userId: string
): Promise<{ success: boolean; error: any }> {
  try {
    // Verify ownership
    const { data: upload, error: fetchError } = await supabase
      .from('audio_uploads')
      .select('id, user_id, storage_path')
      .eq('id', audioUploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !upload) {
      throw new Error('Audio upload not found or access denied');
    }

    // Delete from storage first
    const { error: storageError } = await supabase.storage
      .from('audio')
      .remove([upload.storage_path]);

    if (storageError) {
      console.warn('Failed to delete from storage:', storageError);
      // Continue with database cleanup even if storage deletion fails
    }

    // Delete database record (CASCADE will handle related transcripts)
    const { error: deleteError } = await supabase
      .from('audio_uploads')
      .delete()
      .eq('id', audioUploadId)
      .eq('user_id', userId);

    if (deleteError) {
      throw deleteError;
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Error deleting audio upload:', err);
    return { success: false, error: err };
  }
}

/**
 * Get audio uploads for a user (for delete audio now functionality)
 */
export async function getUserAudioUploads(
  supabase: any,
  userId: string
): Promise<{ data: any[]; error: any }> {
  try {
    const { data, error } = await supabase
      .from('audio_uploads')
      .select('id, storage_path, file_name, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    return { data: data || [], error };
  } catch (err) {
    console.error('Error getting user audio uploads:', err);
    return { data: [], error: err };
  }
}

/**
 * Batch delete multiple audio uploads
 */
export async function batchDeleteAudioUploads(
  supabase: any,
  audioUploadIds: string[],
  userId: string
): Promise<{ deletedCount: number; errors: any[] }> {
  let deletedCount = 0;
  const errors: any[] = [];

  for (const uploadId of audioUploadIds) {
    const { success, error } = await deleteAudioUpload(supabase, uploadId, userId);
    if (success) {
      deletedCount++;
    } else {
      errors.push({ uploadId, error });
    }
  }

  return { deletedCount, errors };
}

/**
 * Clean up orphaned transcripts (transcripts without audio uploads)
 * Useful for maintenance operations
 */
export async function cleanupOrphanedTranscripts(
  supabase: any
): Promise<{ deletedCount: number; error: any }> {
  try {
    const { data, error } = await supabase
      .from('transcripts')
      .delete()
      .not('audio_upload_id', 'is', null)
      .not('audio_upload_id', 'in', 
        supabase.from('audio_uploads').select('id')
      );

    return { 
      deletedCount: data?.length || 0, 
      error 
    };
  } catch (err) {
    console.error('Error cleaning up orphaned transcripts:', err);
    return { deletedCount: 0, error: err };
  }
}

/**
 * Get user authentication from request headers
 */
export async function getUserFromRequest(
  request: Request,
  supabase: any
): Promise<{ user: any; error: any }> {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Missing or invalid authorization header');
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      throw new Error('Invalid or expired token');
    }

    return { user, error: null };
  } catch (err) {
    console.error('Error getting user from request:', err);
    return { user: null, error: err };
  }
}

/**
 * Validate cron request authorization
 */
export function validateCronRequest(request: Request): boolean {
  const cronSecret = Deno.env.get('CRON_SECRET');
  if (!cronSecret) {
    console.error('CRON_SECRET not configured');
    return false;
  }

  const requestSecret = request.headers.get('x-cron-key');
  return requestSecret === cronSecret;
}
