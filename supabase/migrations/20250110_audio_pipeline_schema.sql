-- Audio Pipeline Database Schema
-- This schema supports the audio-to-text pipeline with deterministic NLP

-- ========================================
-- AUDIO UPLOADS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.audio_uploads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL UNIQUE, -- path in Supabase Storage
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  duration_seconds DECIMAL(8,2), -- audio duration if available
  platform TEXT CHECK (platform IN ('android', 'ios', 'web', 'electron')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexing for efficient queries
  CONSTRAINT unique_user_storage_path UNIQUE (user_id, storage_path)
);

-- ========================================
-- TRANSCRIPTS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  audio_upload_id UUID REFERENCES public.audio_uploads(id) ON DELETE SET NULL, -- NULL for Web Speech API transcripts
  raw_text TEXT NOT NULL, -- original transcription from provider
  cleaned_text TEXT NOT NULL, -- processed text after cleanText()
  provider TEXT NOT NULL CHECK (provider IN ('deepgram', 'deterministic', 'web_speech')),
  provider_model TEXT, -- e.g., 'nova-2' for Deepgram
  platform TEXT CHECK (platform IN ('android', 'ios', 'web', 'electron')) NOT NULL,
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 if available
  language_code TEXT DEFAULT 'en', -- ISO language code
  meta JSONB DEFAULT '{}', -- provider-specific metadata (words, timings, etc.)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ========================================
-- TASK EXTRACTIONS TABLE
-- ========================================
CREATE TABLE IF NOT EXISTS public.task_extractions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transcript_id UUID NOT NULL REFERENCES public.transcripts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  extracted_tasks JSONB NOT NULL DEFAULT '[]', -- array of task objects
  due_dates JSONB DEFAULT '{}', -- extracted due dates and time patterns
  categories JSONB DEFAULT '{}', -- detected categories/contexts
  confidence_metrics JSONB DEFAULT '{}', -- confidence scores for extractions
  extraction_method TEXT DEFAULT 'deterministic', -- 'deterministic', 'llm', etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure one extraction per transcript
  CONSTRAINT unique_transcript_extraction UNIQUE (transcript_id)
);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Audio uploads indexes
CREATE INDEX IF NOT EXISTS idx_audio_uploads_user_id ON public.audio_uploads(user_id);
CREATE INDEX IF NOT EXISTS idx_audio_uploads_created_at ON public.audio_uploads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audio_uploads_platform ON public.audio_uploads(platform);
CREATE INDEX IF NOT EXISTS idx_audio_uploads_storage_path ON public.audio_uploads(storage_path);

-- Transcripts indexes
CREATE INDEX IF NOT EXISTS idx_transcripts_user_id ON public.transcripts(user_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_audio_upload_id ON public.transcripts(audio_upload_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_created_at ON public.transcripts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transcripts_provider ON public.transcripts(provider);
CREATE INDEX IF NOT EXISTS idx_transcripts_platform ON public.transcripts(platform);

-- Task extractions indexes
CREATE INDEX IF NOT EXISTS idx_task_extractions_transcript_id ON public.task_extractions(transcript_id);
CREATE INDEX IF NOT EXISTS idx_task_extractions_user_id ON public.task_extractions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_extractions_created_at ON public.task_extractions(created_at DESC);

-- ========================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ========================================

-- Enable RLS on all tables
ALTER TABLE public.audio_uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_extractions ENABLE ROW LEVEL SECURITY;

-- Audio uploads policies
CREATE POLICY "Users can view own audio uploads" ON public.audio_uploads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own audio uploads" ON public.audio_uploads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own audio uploads" ON public.audio_uploads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own audio uploads" ON public.audio_uploads
  FOR DELETE USING (auth.uid() = user_id);

-- Transcripts policies
CREATE POLICY "Users can view own transcripts" ON public.transcripts
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own transcripts" ON public.transcripts
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own transcripts" ON public.transcripts
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own transcripts" ON public.transcripts
  FOR DELETE USING (auth.uid() = user_id);

-- Task extractions policies
CREATE POLICY "Users can view own task extractions" ON public.task_extractions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own task extractions" ON public.task_extractions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own task extractions" ON public.task_extractions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own task extractions" ON public.task_extractions
  FOR DELETE USING (auth.uid() = user_id);

-- ========================================
-- TRIGGERS FOR UPDATED_AT TIMESTAMPS
-- ========================================

-- Create triggers for tables that need updated_at
CREATE TRIGGER update_transcripts_updated_at
  BEFORE UPDATE ON public.transcripts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- HELPER FUNCTIONS
-- ========================================

-- Function to get expired audio uploads for purging
CREATE OR REPLACE FUNCTION public.get_expired_audio_uploads(retain_hours INTEGER DEFAULT 4)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  storage_path TEXT,
  file_name TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id,
    au.user_id,
    au.storage_path,
    au.file_name
  FROM public.audio_uploads au
  WHERE au.created_at < NOW() - INTERVAL '1 hour' * retain_hours
  ORDER BY au.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- GRANT PERMISSIONS
-- ========================================

-- Grant permissions to authenticated users
GRANT ALL ON public.audio_uploads TO authenticated;
GRANT ALL ON public.transcripts TO authenticated;
GRANT ALL ON public.task_extractions TO authenticated;

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Grant execute permission on helper functions
GRANT EXECUTE ON FUNCTION public.get_expired_audio_uploads TO authenticated;

-- ========================================
-- COMMENTS FOR DOCUMENTATION
-- ========================================

COMMENT ON TABLE public.audio_uploads IS 'Temporary storage metadata for uploaded audio files with auto-purge capability';
COMMENT ON TABLE public.transcripts IS 'Transcription results from various providers (Deepgram, Web Speech API, etc.)';
COMMENT ON TABLE public.task_extractions IS 'Deterministic NLP extraction results for tasks, due dates, and categories';

COMMENT ON COLUMN public.audio_uploads.storage_path IS 'Path in Supabase Storage bucket (audio/USER_ID/filename.m4a)';
COMMENT ON COLUMN public.audio_uploads.platform IS 'Platform that created the upload (android, ios, web, electron)';
COMMENT ON COLUMN public.transcripts.audio_upload_id IS 'NULL for Web Speech API transcripts (no audio file)';
COMMENT ON COLUMN public.transcripts.provider IS 'Transcription provider: deepgram, deterministic, web_speech';
COMMENT ON COLUMN public.transcripts.meta IS 'Provider-specific metadata like words, timings, confidence per word';
COMMENT ON COLUMN public.task_extractions.extracted_tasks IS 'Array of task objects extracted from transcript';
COMMENT ON COLUMN public.task_extractions.due_dates IS 'Extracted due dates and temporal patterns';
COMMENT ON COLUMN public.task_extractions.extraction_method IS 'Method used: deterministic (current), llm (future)';
