# Audio-to-Text Provider System

## 🎯 Overview

The KindFrame audio-to-text pipeline now implements a fully pluggable provider system with clean interfaces, deterministic NLP, and comprehensive client helpers.

## 🏗️ Architecture

### Provider Interfaces

```typescript
export interface TranscriptionProvider {
  transcribeFromStorage(params: {
    storagePath: string;
    mimeType?: string;
    platform: "android" | "ios";
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
    platform: "web" | "electron" | "android" | "ios"
  ): Promise<NLPResult>;
}
```

### Core Types

```typescript
export type Task = {
  title: string;
  due?: string; // ISO 8601 date string
  tags?: string[];
  priority?: "low" | "med" | "high";
};

export type NLPResult = {
  cleanedText: string;
  tasks: Task[];
  meta?: Record<string, unknown>;
};
```

## 🔌 Current Implementations

### DeepgramTranscriptionProvider

**Location**: `supabase/functions/_shared/providers.ts`
**Purpose**: High-quality audio transcription using Deepgram nova-2 model

**Features**:

- Pre-recorded API for better accuracy
- Support for .m4a (AAC) audio format
- Word-level timestamps and confidence scores
- Automatic retry and error handling
- Free tier optimization

**Usage**:

```typescript
const provider = new DeepgramTranscriptionProvider(apiKey);
const result = await provider.transcribe(audioBlob, {
  mimeType: "audio/m4a",
  platform: "android",
  userId: "user-123",
});
```

### DeterministicNLPProvider

**Location**: `supabase/functions/_shared/providers.ts`
**Purpose**: Zero-cost deterministic text processing and task extraction

**Features**:

- ND-first language processing (no shame/pressure words)
- Robust filler word removal
- Action pattern recognition
- Priority detection from context
- Hashtag extraction as tags
- Due date parsing with timezone awareness
- Confidence scoring

**Processing Pipeline**:

1. **cleanText()**: Remove fillers, fix transcription errors, normalize punctuation
2. **extractTasks()**: Find action patterns, extract titles, priorities, tags
3. **parseDue()**: Parse temporal expressions into ISO 8601 dates

**ND-First Corrections**:

- `overdue` → `pending`
- `failed to` → `haven't`
- `must` → `should`
- `deadline` → `target date`

## 📱 Client Helpers

### Audio Helpers (`lib/audio.ts`)

```typescript
// Upload audio file to Supabase Storage
uploadAudio(localUri: string): Promise<UploadResponse>

// Transcribe uploaded audio file
transcribe(storagePath: string, platform: 'android' | 'ios'): Promise<TranscribeResponse>

// Delete all user's audio files
deleteAllAudioNow(): Promise<{ deleted: number; message: string }>

// Delete specific audio file
deleteAudioFile(audioUploadId: string): Promise<{ deleted: number; message: string }>

// Get user's audio uploads
getUserAudioUploads(): Promise<AudioUpload[]>
```

### NLP Helpers (`lib/nlp.ts`)

```typescript
// Process text with deterministic NLP
processText(text: string, platform: 'web' | 'electron'): Promise<ProcessTextResponse>

// Check Web Speech API support
isWebSpeechSupported(): boolean

// Check dictation engine availability (Electron)
engineSupportsDictation(): boolean

// Create and manage speech recognition
createSpeechRecognition(): SpeechRecognition | null
startSpeechRecognition(onResult, onError, onEnd): SpeechRecognition | null
stopSpeechRecognition(recognition): void

// Client-side preview functions
previewCleanText(text: string): string
previewExtractTasks(text: string): Array<{ title: string; confidence: number }>
```

## 🧪 Testing

### Unit Tests (`tests/nlp.test.ts`)

Comprehensive test suite covering:

- Text cleaning with ND-first corrections
- Task extraction from various patterns
- Due date parsing with timezone handling
- Edge cases and error conditions
- Integration tests

**Run Tests**:

```bash
npm test
# or
yarn test
```

### Test Coverage

- ✅ **cleanText**: Filler removal, ND corrections, punctuation normalization
- ✅ **extractTasks**: Action patterns, priority detection, hashtag extraction
- ✅ **parseDue**: Relative dates, specific dates, timezone handling
- ✅ **Integration**: Full pipeline with realistic input
- ✅ **Edge Cases**: Empty input, special characters, long text

## 🚀 Deployment

### Environment Variables

```bash
# Required for Deepgram provider
DEEPGRAM_API_KEY=your_deepgram_api_key

# Client configuration
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project.supabase.co/functions/v1
```

### Database Schema

Apply the audio pipeline schema:

```bash
supabase db push --include-schema migrations/20250110_audio_pipeline_schema.sql
```

### Edge Functions

Deploy all functions:

```bash
supabase functions deploy
```

Or deploy individually:

```bash
supabase functions deploy transcribe
supabase functions deploy process_text
supabase functions deploy purge_temp_audio
supabase functions deploy delete_audio_now
```

## 🔄 Future Extensibility

### Adding New Providers

1. **Implement Interface**:

```typescript
class WhisperTranscriptionProvider implements TranscriptionProvider {
  async transcribeFromStorage(params) {
    // OpenAI Whisper implementation
  }
}
```

2. **Update Edge Function**:

```typescript
// In transcribe/index.ts
const provider = useWhisper
  ? new WhisperTranscriptionProvider(apiKey)
  : new DeepgramTranscriptionProvider(apiKey);
```

3. **API Stays Identical**:

- No client-side changes needed
- Same response format
- Pluggable swap

### Adding LLM Processing

1. **Implement NLPProvider**:

```typescript
class OpenAINLPProvider implements NLPProvider {
  async process(text: string, platform: string): Promise<NLPResult> {
    // GPT-4 task extraction
  }
}
```

2. **Feature Flag**:

```typescript
const nlpProvider = useLLM
  ? new OpenAINLPProvider(apiKey)
  : new DeterministicNLPProvider();
```

## 📊 Performance & Costs

### Current (Free Tier)

- **Deepgram**: 45,000 minutes/month free
- **Web Speech**: Unlimited, client-side
- **Deterministic NLP**: Zero cost, instant processing
- **Storage**: 4-hour retention = minimal footprint

### Future Considerations

- **Whisper**: $0.006/minute (more expensive but self-hostable)
- **GPT-4**: ~$0.01-0.03 per task extraction
- **Claude**: ~$0.008-0.024 per task extraction

## 🔐 Privacy & Security

### Data Flow

1. **Audio**: Temporary storage (≤4h), then auto-purged
2. **Transcripts**: User-owned, persistent, editable
3. **Tasks**: Extracted locally, no external transmission
4. **Metadata**: Minimal, no PII in logs

### ND-First Principles

- ✅ **Neutral Language**: No shame/pressure words
- ✅ **Transparent Privacy**: Clear retention policies
- ✅ **Low-Sensory Errors**: Calm, helpful messages
- ✅ **User Control**: Edit/delete capabilities
- ✅ **Confidence Transparency**: Score-based feedback

## 📈 Monitoring

### Key Metrics

- **Transcription Accuracy**: Word error rate, confidence scores
- **Task Extraction Quality**: User corrections, manual adjustments
- **Performance**: Latency (p95), throughput, error rates
- **Usage**: Audio upload volumes, platform distribution

### Dashboard Queries

```sql
-- Recent transcriptions by platform
SELECT platform, COUNT(*), AVG(confidence_score)
FROM transcripts
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY platform;

-- Task extraction quality
SELECT
  COUNT(*) as total_tasks,
  AVG(array_length(extracted_tasks, 1)) as avg_tasks_per_session,
  AVG((confidence_metrics->>'overall')::float) as avg_confidence
FROM task_extractions
WHERE created_at > NOW() - INTERVAL '7 days';

-- Audio retention compliance
SELECT COUNT(*) as files_pending_purge
FROM audio_uploads
WHERE created_at < NOW() - INTERVAL '4 hours';
```

## 🎯 Success Criteria

After deployment, verify:

- [ ] Audio transcription works across all platforms
- [ ] Task extraction identifies action items accurately
- [ ] Due dates parse correctly with user timezone
- [ ] Privacy controls function (delete audio now)
- [ ] Error messages are neutral and helpful
- [ ] Performance meets targets (<2s for transcription)
- [ ] Free tier limits are respected

## 🔄 Roadmap

### Phase 1: Stabilization (Current)

- ✅ Provider interfaces implemented
- ✅ Deterministic NLP production-ready
- ✅ Client helpers with error handling
- ✅ Comprehensive test coverage

### Phase 2: Intelligence (Next)

- [ ] LLM provider implementation
- [ ] Context-aware task categorization
- [ ] Multi-language support
- [ ] Voice command recognition

### Phase 3: Integration (Future)

- [ ] Calendar integration for due dates
- [ ] Smart notification scheduling
- [ ] Cross-platform task sync
- [ ] Analytics dashboard

The provider system is now production-ready with a solid foundation for future enhancements while maintaining API stability and user privacy! 🚀
