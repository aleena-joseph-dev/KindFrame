/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { batchDeleteAudioUploads, createSupabaseClient, getUserAudioUploads, getUserFromRequest } from "../_shared/database-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DeleteAudioRequest {
  audioUploadId?: string; // Delete specific upload
  deleteAll?: boolean;    // Delete all user's audio files
}

/**
 * Generate neutral error response (ND-first)
 */
function createErrorResponse(code: string, message: string, status: number = 400) {
  return new Response(
    JSON.stringify({ 
      error: code, 
      message 
    }),
    { 
      status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

/**
 * Delete single audio upload with ownership verification
 */
async function deleteSingleAudio(
  supabase: any,
  audioUploadId: string,
  userId: string
): Promise<{ success: boolean; error?: any }> {
  try {
    // Verify ownership and get storage path
    const { data: upload, error: fetchError } = await supabase
      .from('audio_uploads')
      .select('id, user_id, storage_path, file_name')
      .eq('id', audioUploadId)
      .eq('user_id', userId)
      .single();

    if (fetchError || !upload) {
      console.warn(`Audio upload not found or access denied: ${audioUploadId}`);
      return { 
        success: false, 
        error: new Error('Audio file not found or access denied')
      };
    }

    // Delete from storage if storage_path exists
    if (upload.storage_path) {
      const { error: storageError } = await supabase.storage
        .from('audio')
        .remove([upload.storage_path]);

      if (storageError) {
        console.warn(`⚠️ Failed to delete storage file ${upload.storage_path}:`, storageError);
        // Continue with database cleanup even if storage deletion fails
      } else {
        console.log(`🗑️ Deleted storage file: ${upload.storage_path}`);
      }
    }

    // Update transcripts to mark audio as deleted (preserve transcripts)
    const { error: transcriptUpdateError } = await supabase
      .from('transcripts')
      .update({
        meta: supabase.raw('meta || \'{"redacted_from_audio": true}\'::jsonb'),
        updated_at: new Date().toISOString()
      })
      .eq('audio_upload_id', audioUploadId);

    if (transcriptUpdateError) {
      console.warn(`⚠️ Failed to update transcripts for ${audioUploadId}:`, transcriptUpdateError);
    }

    // Delete the audio_uploads record
    const { error: deleteError } = await supabase
      .from('audio_uploads')
      .delete()
      .eq('id', audioUploadId)
      .eq('user_id', userId);

    if (deleteError) {
      console.error(`❌ Failed to delete database record ${audioUploadId}:`, deleteError);
      return { success: false, error: deleteError };
    }

    console.log(`✅ Successfully deleted audio upload: ${upload.file_name} (${audioUploadId})`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error deleting audio upload ${audioUploadId}:`, error);
    return { success: false, error };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return createErrorResponse(
      'method_not_allowed', 
      'Only POST requests are supported',
      405
    );
  }

  try {
    // Initialize Supabase client
    const supabase = createSupabaseClient();
    
    // Authenticate user
    const { user, error: authError } = await getUserFromRequest(req, supabase);
    if (authError || !user) {
      return createErrorResponse(
        'authentication_required',
        'Please sign in to delete your audio files',
        401
      );
    }

    // Parse request body
    let requestData: DeleteAudioRequest = {};
    try {
      const body = await req.text();
      if (body.trim()) {
        requestData = JSON.parse(body);
      }
    } catch {
      // Use defaults if parsing fails
      console.log('📋 Using default delete parameters (delete all)');
    }

    const { audioUploadId, deleteAll = false } = requestData;

    console.log(`🗑️ Delete audio request from user ${user.id}`);

    // Handle specific file deletion
    if (audioUploadId && !deleteAll) {
      console.log(`🎯 Deleting specific audio upload: ${audioUploadId}`);
      
      const { success, error } = await deleteSingleAudio(supabase, audioUploadId, user.id);
      
      if (!success) {
        return createErrorResponse(
          'deletion_failed',
          error?.message || 'Failed to delete the audio file'
        );
      }

      return new Response(
        JSON.stringify({ 
          ok: true,
          deleted: 1,
          message: 'Audio file deleted successfully. Your transcript is still available for editing.'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Handle delete all files
    console.log(`🧹 Deleting all audio files for user ${user.id}`);

    // Get all user's audio uploads
    const { data: audioUploads, error: fetchError } = await getUserAudioUploads(
      supabase,
      user.id
    );

    if (fetchError) {
      console.error('Failed to fetch user audio uploads:', fetchError);
      return createErrorResponse(
        'fetch_error',
        'Failed to retrieve your audio files'
      );
    }

    if (!audioUploads || audioUploads.length === 0) {
      return new Response(
        JSON.stringify({ 
          ok: true,
          deleted: 0,
          message: 'No audio files found to delete'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📂 Found ${audioUploads.length} audio files to delete`);

    // Batch delete all audio uploads
    const uploadIds = audioUploads.map(upload => upload.id);
    const { deletedCount, errors } = await batchDeleteAudioUploads(
      supabase,
      uploadIds,
      user.id
    );

    const response = {
      ok: true,
      deleted: deletedCount,
      errors: errors.length,
      message: `Successfully deleted ${deletedCount} audio files. Your transcripts are still available for editing.`,
      error_details: errors.length > 0 ? errors : undefined
    };

    if (errors.length > 0) {
      console.warn(`⚠️ ${errors.length} files failed to delete:`, errors);
    }

    console.log(`✅ Batch deletion completed: ${deletedCount} deleted, ${errors.length} errors`);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Delete audio now function error:', error);
    
    // Return neutral error message (ND-first)
    return createErrorResponse(
      'deletion_error',
      'Something went wrong while deleting your audio files. Please try again in a moment.',
      500
    );
  }
});
