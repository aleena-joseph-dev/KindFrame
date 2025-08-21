/**
 * Core Types for Audio-to-Text Pipeline
 * 
 * Defines stable interfaces for pluggable providers
 * Ensures type safety across client and server
 */

export type Task = {
  title: string;
  due?: string; // ISO 8601 date string
  tags?: string[];
  priority?: 'low' | 'med' | 'high';
};

export type NLPResult = {
  cleanedText: string;
  tasks: Task[];
  meta?: Record<string, unknown>;
};

export interface TranscriptionProvider {
  transcribeFromStorage(params: {
    storagePath: string;
    mimeType?: string;
    platform: 'android' | 'ios';
    userId: string;
  }): Promise<{
    rawText: string;
    words?: unknown;
    meta?: unknown;
  }>;
}

export interface NLPProvider {
  process(
    text: string,
    platform: 'web' | 'electron' | 'android' | 'ios',
    timezone?: string
  ): Promise<NLPResult>;
}

// API Response types for consistency
export interface APIResponse {
  transcript: {
    id: string;
    rawText: string;
    cleanedText: string;
    meta?: Record<string, unknown>;
  };
  tasks: Task[];
  meta: {
    provider: string;
    model?: string;
    platform: string;
    confidence?: number;
    taskCount: number;
    [key: string]: unknown;
  };
}

// Error response type for consistent error handling
export interface APIError {
  error: string;
  message: string;
  details?: unknown;
}

// Upload response type
export interface UploadResponse {
  storagePath: string;
  bytes: number;
  mimeType: string;
}
