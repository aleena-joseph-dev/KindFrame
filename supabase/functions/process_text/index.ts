/// <reference types="https://deno.land/x/types/index.d.ts" />

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createSupabaseClient, getUserFromRequest, persistTranscriptionResult } from "../_shared/database-helpers.ts";
import { DeterministicNLPProvider } from "../_shared/providers.ts";
import { APIResponse } from "../_shared/types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface ProcessTextRequest {
  text: string;
  platform: 'web' | 'electron';
  timezone?: string;
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
        'Please sign in to use text processing services',
        401
      );
    }

    // Parse request body
    let requestData: ProcessTextRequest;
    try {
      requestData = await req.json();
    } catch {
      return createErrorResponse(
        'invalid_request',
        'Please provide valid JSON with text and platform'
      );
    }

    const { text, platform, timezone } = requestData;

    // Validate required fields
    if (!text || typeof text !== 'string') {
      return createErrorResponse(
        'missing_text',
        'Text content is required for processing'
      );
    }

    if (!platform || !['web', 'electron'].includes(platform)) {
      return createErrorResponse(
        'invalid_platform',
        'Platform must be either web or electron'
      );
    }

    // Validate text length (reasonable limits for free tier)
    if (text.length > 10000) {
      return createErrorResponse(
        'text_too_long',
        'Text content is too long. Please keep it under 10,000 characters.'
      );
    }

    if (text.trim().length < 3) {
      return createErrorResponse(
        'text_too_short',
        'Please provide more text content to process.'
      );
    }

    console.log(`📝 Processing text for ${platform} platform`);
    console.log(`📊 Text length: ${text.length} characters`);
    
    if (timezone) {
      console.log(`🌍 User timezone: ${timezone}`);
    }

    // Initialize NLP provider
    const nlpProvider = new DeterministicNLPProvider();

    // Process text with deterministic NLP
    const nlpResult = await nlpProvider.process(text, platform);

    console.log(`🧹 Cleaned text: ${nlpResult.cleanedText.length} characters`);
    console.log(`📋 Extracted ${nlpResult.tasks.length} tasks`);

    // Persist transcription and task extraction
    // No audio_upload_id for Web Speech API transcripts
    const { transcript, taskExtraction, error: persistError } = await persistTranscriptionResult(
      supabase,
      user.id,
      null, // No audio file for Web Speech API
      text, // Original text as rawText
      nlpResult.cleanedText,
      {
        tasks: nlpResult.tasks,
        dueDates: [],
        categories: [...new Set(nlpResult.tasks.map(t => t.priority || 'med'))],
        confidence: 0.9, // High confidence for deterministic processing
      },
      'deterministic', // Provider for Web Speech API
      'deterministic_nlp_v1', // Model name
      platform,
      undefined, // No confidence score from Web Speech API
      {
        platform,
        timezone: timezone || 'unknown',
        processing_method: 'deterministic',
        extraction_version: '1.0',
        ...nlpResult.meta,
      }
    );

    if (persistError) {
      console.error('Failed to persist text processing:', persistError);
      return createErrorResponse(
        'storage_error',
        'Text processed successfully but couldn\'t save results. Please try again.'
      );
    }

    console.log(`💾 Text processing persisted with ID: ${transcript.id}`);

    // Return successful response with same structure as /transcribe
    const response: APIResponse = {
      transcript: {
        id: transcript.id,
        rawText: text,
        cleanedText: nlpResult.cleanedText,
        meta: {
          platform,
          timezone: timezone || 'unknown',
          processing_method: 'deterministic',
          ...nlpResult.meta,
        },
      },
      tasks: nlpResult.tasks,
      meta: {
        provider: 'deterministic',
        model: 'deterministic_nlp_v1',
        platform,
        confidence: 0.9,
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
    console.error('Process text function error:', error);
    
    // Return neutral error message (ND-first)
    return createErrorResponse(
      'processing_error',
      'Something went wrong while processing your text. Please try again in a moment.',
      500
    );
  }
});
