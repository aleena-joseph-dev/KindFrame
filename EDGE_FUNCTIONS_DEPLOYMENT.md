# Audio Pipeline Edge Functions - Deployment Guide

## 🚀 Overview

The audio-to-text pipeline is now complete with 4 Edge Functions and supporting infrastructure:

1. **`/transcribe`** - Deepgram audio transcription (Android/iOS)
2. **`/process_text`** - Deterministic NLP for Web Speech API (Web/Electron)
3. **`/purge_temp_audio`** - Scheduled cleanup (Cron)
4. **`/delete_audio_now`** - Privacy-focused immediate deletion

## 📋 Pre-Deployment Checklist

### 1. Database Schema

```bash
# Apply the audio pipeline schema
supabase db push --include-schema migrations/20250110_audio_pipeline_schema.sql
```

### 2. Environment Variables

Set these secrets in your Supabase project:

```bash
# Required for /transcribe
supabase secrets set DEEPGRAM_API_KEY=your_deepgram_api_key

# Required for /purge_temp_audio cron job
supabase secrets set CRON_SECRET=your_secure_random_string

# Verify secrets are set
supabase secrets list
```

### 3. Supabase Storage Setup

Ensure the `audio` bucket exists with proper policies:

```sql
-- Create audio bucket (if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('audio', 'audio', false);

-- RLS policy for authenticated users
CREATE POLICY "Users can upload own audio files" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can download own audio files" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own audio files" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );
```

## 🚢 Deployment Steps

### 1. Deploy All Functions

```bash
# From project root
cd supabase
supabase functions deploy
```

### 2. Deploy Individual Functions (Alternative)

```bash
supabase functions deploy transcribe
supabase functions deploy process_text
supabase functions deploy purge_temp_audio
supabase functions deploy delete_audio_now
```

### 3. Verify Deployment

```bash
# Check function status
supabase functions list

# Test a function (replace with your project URL)
curl -X POST https://your-project-ref.supabase.co/functions/v1/process_text \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "platform": "web"}'
```

## ⏰ Cron Job Setup

Set up automatic audio purging (every 2 hours recommended):

```bash
# Using GitHub Actions, add to your .github/workflows/purge-audio.yml
name: Purge Temp Audio
on:
  schedule:
    - cron: '0 */2 * * *'  # Every 2 hours
jobs:
  purge:
    runs-on: ubuntu-latest
    steps:
      - name: Purge Audio
        run: |
          curl -X POST https://your-project-ref.supabase.co/functions/v1/purge_temp_audio \
            -H "x-cron-key: ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json" \
            -d '{"retain_hours": 4}'
```

Or use Supabase's built-in cron (if available):

```sql
-- Schedule purge every 2 hours
SELECT cron.schedule('purge-temp-audio', '0 */2 * * *',
  'SELECT net.http_post(''https://your-project-ref.supabase.co/functions/v1/purge_temp_audio'',
    ''{"retain_hours": 4}'',
    ''{"x-cron-key": "YOUR_CRON_SECRET", "Content-Type": "application/json"}'')'
);
```

## 🧪 Testing Functions

### Test /transcribe (requires actual audio file)

```bash
# First upload an audio file to test with
curl -X POST https://your-project-ref.supabase.co/functions/v1/transcribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "storagePath": "audio/USER_ID/test.m4a",
    "platform": "android"
  }'
```

### Test /process_text

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/process_text \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "I need to call the doctor tomorrow and buy groceries",
    "platform": "web"
  }'
```

### Test /delete_audio_now

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/delete_audio_now \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"deleteAll": true}'
```

### Test /purge_temp_audio (dry run)

```bash
curl -X POST https://your-project-ref.supabase.co/functions/v1/purge_temp_audio \
  -H "x-cron-key: YOUR_CRON_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"dry_run": true, "retain_hours": 4}'
```

## 🔍 Monitoring & Debugging

### Function Logs

```bash
# View function logs
supabase functions logs transcribe
supabase functions logs process_text
```

### Database Queries for Monitoring

```sql
-- Check recent transcriptions
SELECT t.*, au.platform, au.file_size
FROM transcripts t
LEFT JOIN audio_uploads au ON t.audio_upload_id = au.id
ORDER BY t.created_at DESC
LIMIT 10;

-- Check task extractions
SELECT te.*, t.cleaned_text
FROM task_extractions te
JOIN transcripts t ON te.transcript_id = t.id
ORDER BY te.created_at DESC
LIMIT 10;

-- Check audio uploads pending purge
SELECT * FROM audio_uploads
WHERE created_at < NOW() - INTERVAL '4 hours'
ORDER BY created_at;
```

## 🛠️ Configuration Updates

### Update Quick Jot Frontend

The frontend `app/(tabs)/quick-jot.tsx` should already be configured to call these functions. Verify these environment variables:

```typescript
// In your .env file
EXPO_PUBLIC_SUPABASE_FUNCTIONS_URL=https://your-project-ref.supabase.co/functions/v1
```

### Update Function URLs

If needed, update the Quick Jot component to use the correct endpoints:

- `/transcribe` for Android audio processing
- `/process_text` for Web Speech API processing

## 🚨 Troubleshooting

### Common Issues

1. **Deepgram API Key Issues**

   ```bash
   # Check if secret is set
   supabase secrets list | grep DEEPGRAM

   # Reset if needed
   supabase secrets set DEEPGRAM_API_KEY=your_new_key
   ```

2. **CORS Issues**

   - Verify your domain is added to Supabase CORS settings
   - Check request headers include proper Authorization

3. **Audio File Access**

   - Verify RLS policies on storage.objects
   - Check file paths follow format: `audio/USER_ID/filename.m4a`

4. **Database Connection**
   - Verify SERVICE_ROLE_KEY has proper permissions
   - Check if RLS policies are correctly configured

### Performance Optimization

1. **Deepgram Rate Limits**

   - Monitor usage in Deepgram dashboard
   - Implement client-side rate limiting if needed

2. **Database Performance**

   - Monitor slow queries in Supabase dashboard
   - Consider adding indexes if needed

3. **Storage Costs**
   - Verify purge job is running successfully
   - Monitor storage usage patterns

## ✅ Success Criteria

After deployment, verify:

- [ ] Audio files upload successfully to Storage
- [ ] Transcription works for Android/iOS uploads
- [ ] Web Speech API text processing works
- [ ] Tasks are extracted correctly
- [ ] Audio files are purged after 4 hours
- [ ] Delete audio now works immediately
- [ ] All database records are created properly
- [ ] Error handling provides helpful messages

## 🔄 Next Steps

1. **Monitor Usage**: Track Deepgram API usage and costs
2. **User Feedback**: Collect feedback on task extraction accuracy
3. **LLM Integration**: Plan for future LLM provider integration
4. **Performance Tuning**: Optimize based on real usage patterns

The audio-to-text pipeline is now ready for production use with ND-first principles, transparent privacy controls, and efficient free-tier optimization!
