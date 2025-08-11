/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, getExpiredAudioUploads, validateCronRequest } from "../_shared/database-helpers.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-key',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface PurgeRequest {
  retain_hours?: number;
  dry_run?: boolean;
}

/**
 * Generate error response
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
 * Delete audio file from storage and update database
 */
async function deleteAudioFile(
  supabase: any,
  upload: { id: string; user_id: string; storage_path: string; file_name: string }
): Promise<{ success: boolean; error?: any }> {
  try {
    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('audio')
      .remove([upload.storage_path]);

    if (storageError) {
      console.warn(`⚠️ Failed to delete storage file ${upload.storage_path}:`, storageError);
      // Continue with database cleanup even if storage deletion fails
    } else {
      console.log(`🗑️ Deleted storage file: ${upload.storage_path}`);
    }

    // Update database record to null out storage_path (soft delete approach)
    // This preserves the audit trail while indicating the file is gone
    const { error: updateError } = await supabase
      .from('audio_uploads')
      .update({ 
        storage_path: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', upload.id);

    if (updateError) {
      console.error(`❌ Failed to update database record ${upload.id}:`, updateError);
      return { success: false, error: updateError };
    }

    // Alternatively, we could delete the record entirely:
    // const { error: deleteError } = await supabase
    //   .from('audio_uploads')
    //   .delete()
    //   .eq('id', upload.id);

    console.log(`✅ Purged audio upload: ${upload.file_name} (${upload.id})`);
    return { success: true };

  } catch (error) {
    console.error(`❌ Error deleting audio file ${upload.id}:`, error);
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
    // Validate cron authorization
    if (!validateCronRequest(req)) {
      return createErrorResponse(
        'unauthorized',
        'Invalid or missing cron authorization',
        401
      );
    }

    console.log('🕒 Starting scheduled audio purge...');

    // Initialize Supabase client with service role
    const supabase = createSupabaseClient();

    // Parse request body (optional parameters)
    let requestData: PurgeRequest = {};
    try {
      const body = await req.text();
      if (body.trim()) {
        requestData = JSON.parse(body);
      }
    } catch {
      // Use defaults if parsing fails
      console.log('📋 Using default purge parameters');
    }

    const { 
      retain_hours = 4, // Default 4-hour retention
      dry_run = false 
    } = requestData;

    console.log(`⏰ Purging audio files older than ${retain_hours} hours`);
    if (dry_run) {
      console.log('🧪 DRY RUN MODE - No files will be deleted');
    }

    // Get expired audio uploads
    const { data: expiredUploads, error: fetchError } = await getExpiredAudioUploads(
      supabase,
      retain_hours
    );

    if (fetchError) {
      console.error('Failed to fetch expired uploads:', fetchError);
      return createErrorResponse(
        'fetch_error',
        'Failed to retrieve expired audio files'
      );
    }

    if (!expiredUploads || expiredUploads.length === 0) {
      console.log('✨ No expired audio files found');
      return new Response(
        JSON.stringify({ 
          deleted: 0,
          message: 'No expired audio files found',
          retain_hours,
          dry_run
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`📂 Found ${expiredUploads.length} expired audio files`);

    // Process deletions
    let deletedCount = 0;
    let errorCount = 0;
    const errors: any[] = [];

    for (const upload of expiredUploads) {
      if (dry_run) {
        console.log(`🧪 DRY RUN: Would delete ${upload.storage_path}`);
        deletedCount++;
        continue;
      }

      const { success, error } = await deleteAudioFile(supabase, upload);
      
      if (success) {
        deletedCount++;
      } else {
        errorCount++;
        errors.push({
          upload_id: upload.id,
          storage_path: upload.storage_path,
          error: error?.message || 'Unknown error'
        });
      }

      // Add small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const summary = {
      deleted: deletedCount,
      errors: errorCount,
      total_found: expiredUploads.length,
      retain_hours,
      dry_run,
      error_details: errors.length > 0 ? errors : undefined
    };

    console.log(`✅ Purge completed: ${deletedCount} deleted, ${errorCount} errors`);

    if (errorCount > 0) {
      console.warn(`⚠️ ${errorCount} files failed to delete:`, errors);
    }

    return new Response(
      JSON.stringify(summary),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Purge temp audio function error:', error);
    
    return createErrorResponse(
      'purge_error',
      'Failed to complete audio purge operation',
      500
    );
  }
});
