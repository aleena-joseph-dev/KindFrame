# Audio-to-Text Pipeline Edge Functions

This directory contains the Supabase Edge Functions for KindFrame's audio-to-text pipeline with deterministic NLP and ND-first guardrails.

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐
│   Android/iOS   │    │   Web/Electron   │    │   Cron/Maintenance  │
│                 │    │                  │    │                     │
│ Record → Upload │    │ Web Speech API   │    │   Auto-purge (4h)   │
│     ↓           │    │       ↓          │    │                     │
│ /transcribe     │    │ /process_text    │    │ /purge_temp_audio   │
└─────────────────┘    └──────────────────┘    └─────────────────────┘
         │                       │                        │
         └───────────────────────┼────────────────────────┘
                                 │
                    ┌────────────▼─────────────┐
                    │     Supabase Storage     │
                    │   + Database Pipeline    │
                    │                          │
                    │ • audio_uploads          │
                    │ • transcripts            │
                    │ • task_extractions       │
                    └──────────────────────────┘
```

## Edge Functions

### `/transcribe` (POST)

**Purpose**: Process uploaded audio files using Deepgram API  
**Platform**: Android, iOS (with Web/Electron fallback)  
**Input**: `{ storagePath, platform, durationSeconds? }`  
**Output**: `{ transcript, tasks, meta }`

**Flow**:

1. Authenticate user via JWT
2. Download audio file from Supabase Storage
3. Transcribe using Deepgram (nova-2 model)
4. Clean text with deterministic NLP
5. Extract tasks and due dates
6. Persist results to database
7. Return structured response

### `/process_text` (POST)

**Purpose**: Process Web Speech API text with deterministic NLP  
**Platform**: Web, Electron  
**Input**: `{ text, platform, timezone? }`  
**Output**: `{ transcript, tasks, meta }`

**Flow**:

1. Authenticate user via JWT
2. Validate and clean input text
3. Apply deterministic NLP processing
4. Extract tasks and due dates
5. Persist results (no audio file)
6. Return structured response

### `/purge_temp_audio` (POST)

**Purpose**: Scheduled cleanup of expired audio files  
**Auth**: Cron secret header (`x-cron-key`)  
**Input**: `{ retain_hours?, dry_run? }`  
**Output**: `{ deleted, errors, total_found }`

**Flow**:

1. Validate cron authorization
2. Find expired audio uploads (default: 4 hours)
3. Delete from Supabase Storage
4. Update database records
5. Return cleanup summary

### `/delete_audio_now` (POST)

**Purpose**: Privacy-focused immediate audio deletion  
**Platform**: All  
**Input**: `{ audioUploadId?, deleteAll? }`  
**Output**: `{ ok, deleted, message }`

**Flow**:

1. Authenticate user via JWT
2. Verify ownership of audio files
3. Delete from Supabase Storage
4. Mark transcripts as `redacted_from_audio`
5. Remove database records
6. Preserve transcripts for editing

## Shared Utilities

### `nlp-utils.ts`

- **cleanText()**: Remove filler words, fix transcription errors, normalize text
- **extractTasks()**: Find action items using deterministic patterns
- **parseDueDates()**: Extract temporal information (today, tomorrow, dates)
- **performExtraction()**: Complete NLP pipeline

### `database-helpers.ts`

- **Authentication**: JWT validation and user extraction
- **Audio Uploads**: CRUD operations with RLS
- **Transcripts**: Persistence with metadata
- **Task Extractions**: Store NLP results
- **Batch Operations**: Efficient bulk processing

## ND-First Design Principles

1. **Neutral Language**: No shame-based messaging ("overdue" → "pending")
2. **Transparent Privacy**: Clear retention policies and deletion options
3. **Low-Sensory Errors**: Calm, helpful error messages
4. **Edit/Correct Flow**: Users can modify extracted content
5. **Confidence Scoring**: Transparent about extraction certainty

## Environment Variables

```bash
# Required for all functions
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Required for /transcribe
DEEPGRAM_API_KEY=your_deepgram_api_key

# Required for /purge_temp_audio
CRON_SECRET=your_cron_secret_key
```

## Database Schema

See `supabase/migrations/20250110_audio_pipeline_schema.sql` for:

- `audio_uploads`: Temporary file metadata
- `transcripts`: Transcription results from all providers
- `task_extractions`: Deterministic NLP results

## Free Tier Optimization

- **Deepgram**: Pre-recorded API (generous free tier)
- **Web Speech**: Client-side, no API costs
- **Deterministic NLP**: No LLM costs, instant processing
- **4-hour retention**: Minimal storage footprint
- **Pluggable design**: Easy LLM integration later

## Testing

Each function includes comprehensive error handling and logging:

- Input validation with helpful error messages
- Provider-specific error handling (Deepgram timeouts, etc.)
- Database transaction safety
- Storage operation resilience

## Deployment

```bash
# Deploy all functions
supabase functions deploy

# Deploy specific function
supabase functions deploy transcribe

# Set environment variables
supabase secrets set DEEPGRAM_API_KEY=your_key
supabase secrets set CRON_SECRET=your_secret
```

## Monitoring

- All functions log extensively for debugging
- Error responses use neutral, user-friendly language
- Success metrics: transcription accuracy, task extraction quality
- Performance metrics: latency, throughput, error rates
