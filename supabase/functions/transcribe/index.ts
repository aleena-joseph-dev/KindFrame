/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, getUserFromRequest, persistTranscriptionResult, upsertAudioUpload } from "../_shared/database-helpers.ts";
import { DeepgramTranscriptionProvider, DeterministicNLPProvider } from "../_shared/providers.ts";
import { APIResponse } from "../_shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface TranscribeRequest {
  storagePath: string;
  platform: 'android' | 'ios';
  durationSeconds?: number;
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
        'Please sign in to use transcription services',
        401
      );
    }

    // Parse request body
    let requestData: TranscribeRequest;
    try {
      requestData = await req.json();
    } catch {
      return createErrorResponse(
        'invalid_request',
        'Please provide valid JSON with storagePath and platform'
      );
    }

    const { storagePath, platform, durationSeconds } = requestData;

    // Validate required fields
    if (!storagePath || !platform) {
      return createErrorResponse(
        'missing_parameters',
        'Both storagePath and platform are required'
      );
    }

    if (!['android', 'ios'].includes(platform)) {
      return createErrorResponse(
        'invalid_platform',
        'Platform must be android or ios for audio transcription'
      );
    }

    console.log(`🎤 Processing transcription for ${platform} platform`);
    console.log(`📁 Storage path: ${storagePath}`);

    // Validate and fetch audio file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('audio')
      .download(storagePath);

    if (downloadError || !fileData) {
      console.error('Storage download error:', downloadError);
      return createErrorResponse(
        'file_not_found',
        'We couldn\'t find this audio file. Please try recording again.'
      );
    }

    // Get file metadata
    const { data: fileInfo, error: infoError } = await supabase.storage
      .from('audio')
      .getPublicUrl(storagePath);

    if (infoError) {
      console.warn('Could not get file info:', infoError);
    }

    // Convert to Uint8Array for Deepgram
    const audioBlob = new Uint8Array(await fileData.arrayBuffer());
    
    console.log(`📊 Audio file size: ${audioBlob.length} bytes`);

    // Initialize providers
    const deepgramApiKey = Deno.env.get('DEEPGRAM_API_KEY');
    if (!deepgramApiKey) {
      return createErrorResponse(
        'service_unavailable',
        'Transcription service is not configured'
      );
    }

    const transcriptionProvider = new DeepgramTranscriptionProvider(deepgramApiKey);
    const nlpProvider = new DeterministicNLPProvider();

    // Transcribe with Deepgram
    let transcriptionResult;
    try {
      transcriptionResult = await transcriptionProvider.transcribe(audioBlob, {
        mimeType: 'audio/m4a',
        platform,
        userId: user.id,
      });
      console.log(`✅ Deepgram transcription completed: ${transcriptionResult.rawText.length} characters`);
    } catch (error) {
      console.error('Deepgram transcription failed:', error);
      return createErrorResponse(
        'transcription_unavailable',
        'We couldn\'t process this audio yet. Try again or send shorter clips.'
      );
    }

    // Process with deterministic NLP
    const nlpResult = await nlpProvider.process(transcriptionResult.rawText, platform);

    console.log(`🧹 Cleaned text: ${nlpResult.cleanedText.length} characters`);
    console.log(`📋 Extracted ${nlpResult.tasks.length} tasks`);

    // Persist audio upload metadata (idempotent)
    const audioUploadData = {
      user_id: user.id,
      storage_path: storagePath,
      file_name: storagePath.split('/').pop() || 'unknown.m4a',
      file_size: audioBlob.length,
      mime_type: 'audio/m4a',
      duration_seconds: (transcriptionResult.meta as any)?.duration || durationSeconds,
      platform,
    };

    const { data: audioUpload, error: uploadError } = await upsertAudioUpload(
      supabase,
      audioUploadData
    );

    if (uploadError) {
      console.warn('Failed to upsert audio upload:', uploadError);
    }

    // Persist transcription and task extraction
    const { transcript, taskExtraction, error: persistError } = await persistTranscriptionResult(
      supabase,
      user.id,
      audioUpload?.id || null,
      transcriptionResult.rawText,
      nlpResult.cleanedText,
      {
        tasks: nlpResult.tasks,
        dueDates: [],
        categories: [...new Set(nlpResult.tasks.map(t => t.priority || 'med'))],
        confidence: (transcriptionResult.meta as any)?.confidence || 0.8,
      },
      'deepgram',
      (transcriptionResult.meta as any)?.model || 'nova-2',
      platform,
      (transcriptionResult.meta as any)?.confidence,
      {
        words: transcriptionResult.words,
        duration: (transcriptionResult.meta as any)?.duration,
        deepgram_model: (transcriptionResult.meta as any)?.model,
        ...transcriptionResult.meta,
      }
    );

    if (persistError) {
      console.error('Failed to persist transcription:', persistError);
      return createErrorResponse(
        'storage_error',
        'Transcription completed but couldn\'t save results. Please try again.'
      );
    }

    console.log(`💾 Transcription persisted with ID: ${transcript.id}`);

    // Return successful response in APIResponse format
    const response: APIResponse = {
      transcript: {
        id: transcript.id,
        rawText: transcriptionResult.rawText,
        cleanedText: nlpResult.cleanedText,
        meta: {
          confidence: (transcriptionResult.meta as any)?.confidence,
          duration: (transcriptionResult.meta as any)?.duration,
          model: (transcriptionResult.meta as any)?.model,
          ...transcriptionResult.meta,
        },
      },
      tasks: nlpResult.tasks,
      meta: {
        provider: 'deepgram',
        model: (transcriptionResult.meta as any)?.model || 'nova-2',
        platform,
        storagePath,
        confidence: (transcriptionResult.meta as any)?.confidence || 0.8,
        taskCount: nlpResult.tasks.length,
      },
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Transcribe function error:', error);
    
    // Return neutral error message (ND-first)
    return createErrorResponse(
      'processing_error',
      'Something went wrong while processing your audio. Please try again in a moment.',
      500
    );
  }
});
