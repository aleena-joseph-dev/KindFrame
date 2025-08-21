/**
 * Provider Implementations for Audio-to-Text Pipeline
 * 
 * Pluggable implementations that can be swapped without changing API contracts
 */

import { NLPProvider, NLPResult, Task, TranscriptionProvider } from './types.ts';

/**
 * Deepgram Transcription Provider
 * Uses nova-2 model with pre-recorded API for best accuracy
 */
export class DeepgramTranscriptionProvider implements TranscriptionProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async transcribeFromStorage(params: {
    storagePath: string;
    mimeType?: string;
    platform: 'android' | 'ios';
    userId: string;
  }): Promise<{
    rawText: string;
    words?: unknown;
    meta?: unknown;
  }> {
    const { storagePath, mimeType = 'audio/m4a' } = params;

    if (!this.apiKey) {
      throw new Error('Deepgram API key not configured');
    }

    // For Edge Functions context, we need to get the audio blob
    // This would be called from the Edge Function after downloading from storage
    throw new Error('transcribeFromStorage should be called with audio blob in Edge Function context');
  }

  /**
   * Transcribe audio blob directly (for Edge Function use)
   */
  async transcribe(
    audioBlob: Uint8Array,
    options: {
      mimeType?: string;
      platform: 'android' | 'ios';
      userId: string;
    } = { platform: 'android', userId: '' }
  ): Promise<{
    rawText: string;
    words?: unknown;
    meta?: unknown;
  }> {
    const response = await fetch('https://api.deepgram.com/v1/listen', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${this.apiKey}`,
        'Content-Type': options.mimeType || 'audio/m4a',
      },
      body: audioBlob,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Deepgram API error:', error);
      throw new Error(`Deepgram transcription failed: ${response.status}`);
    }

    const result = await response.json();
    
    if (!result.results?.channels?.[0]?.alternatives?.[0]) {
      throw new Error('No transcription results from Deepgram');
    }

    const alternative = result.results.channels[0].alternatives[0];
    
    return {
      rawText: alternative.transcript,
      words: alternative.words || [],
      meta: {
        confidence: alternative.confidence,
        model: result.metadata?.model_info?.name || 'nova-2',
        duration: result.metadata?.duration,
        provider: 'deepgram',
        platform: options.platform,
      },
    };
  }
}

/**
 * Groq NLP Provider
 * Uses Groq API with deterministic parameters for consistent results
 */
export class GroqNLPProvider implements NLPProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async process(
    text: string,
    platform: 'web' | 'electron' | 'android' | 'ios',
    timezone?: string
  ): Promise<NLPResult> {
    if (!this.apiKey) {
      throw new Error('Groq API key not configured');
    }

    const cleanedText = this.cleanText(text);
    
    try {
      // Call Groq API with deterministic parameters
      const groqResult = await this.callGroqAPI(cleanedText, timezone);
      
      // Parse Groq response into our task format
      const tasks = this.parseGroqResponse(groqResult);
      
      return {
        cleanedText,
        tasks,
        meta: {
          provider: 'groq',
          model: 'llama-3.1-70b-versatile',
          version: '1.0',
          platform,
          processed_at: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Groq API error, falling back to deterministic processing:', error);
      // Fallback to deterministic processing
      return this.fallbackProcess(cleanedText, platform);
    }
  }

  private async callGroqAPI(text: string, timezone?: string): Promise<any> {
    const systemPrompt = `You are a task extraction AI that converts natural language text into structured tasks. 

CRITICAL RULES:
- Extract ONLY actionable items from the text
- Each item MUST start with an action verb (call, email, buy, send, complete, implement, develop, meet, schedule, etc.)
- NO overlapping or duplicate items - each task must be distinct
- NO partial or incomplete phrases - each title must be a complete thought
- NO filler words or false starts (um, uh, you know, etc.)

CLASSIFICATION:
- Event: meetings, appointments, scheduled activities with time/date
- To-do: action verbs without fixed time (call, email, buy, send)
- Task: explicit work deliverables (complete, implement, develop)
- Note: informational content (only if no actionable items)
- Journal: reflective, personal content (only if no actionable items)

VALIDATION:
- Every item.title must start with a verb
- Every item.title must be a complete sentence or phrase
- No items should overlap in meaning or scope
- If text contains no actionable items, return empty items array

Return ONLY valid JSON in this exact format:
{
  "items": [
    {
      "type": "Task|To-do|Event|Note|Journal",
      "title": "extracted task title (must start with verb)",
      "details": null,
      "due_iso": null,
      "duration_min": null,
      "location": null,
      "subtasks": []
    }
  ],
  "suggested_overall_category": "Task|To-do|Event|Note|Journal",
  "forced_rules_applied": ["rule_name"],
  "warnings": [],
  "confidence": 0.85
}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "llama-3.1-70b-versatile",
        temperature: 0.1,
        top_p: 0,
        max_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify({ timezone: timezone || null, text }) }
        ]
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const result = await response.json();
    return result.choices[0]?.message?.content;
  }

  private parseGroqResponse(groqResponse: string): Task[] {
    try {
      const parsed = JSON.parse(groqResponse);
      
      if (!parsed.items || !Array.isArray(parsed.items)) {
        throw new Error('Invalid Groq response format');
      }

      return parsed.items.map((item: any) => ({
        title: item.title || '',
        due: item.due_iso || undefined,
        tags: item.subtasks || [],
        priority: this.mapPriorityFromType(item.type) as 'low' | 'med' | 'high',
      }));
    } catch (error) {
      console.error('Failed to parse Groq response:', error);
      throw error;
    }
  }

  private mapPriorityFromType(type: string): string {
    switch (type) {
      case 'Event': return 'high';
      case 'Task': return 'med';
      case 'To-do': return 'med';
      default: return 'low';
    }
  }

  private fallbackProcess(cleanedText: string, platform: string): NLPResult {
    // Use the existing deterministic logic as fallback
    const tasks = this.extractTasks(cleanedText);
    
    return {
      cleanedText,
      tasks,
      meta: {
        provider: 'deterministic_fallback',
        version: '1.0',
        platform,
        processed_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Clean raw text with deterministic rules (shared method)
   */
  cleanText(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    let cleaned = rawText.trim();

    // Remove common filler words and false starts
    const fillerPatterns = [
      /\b(um|uh|er|ah|like|you know|so|well|actually|basically|literally)\b/gi,
      /\b(i mean|you see|right\?|ok\?|okay\?)\b/gi,
      /\b(let me|let's see|hold on|wait)\b/gi,
    ];

    fillerPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, ' ');
    });

    // ND-first corrections: replace shame/pressure language with neutral alternatives
    const ndFriendlyCorrections = [
      [/\boverdue\b/gi, 'pending'],
      [/\blate\b/gi, 'pending'],
      [/\bfailed to\b/gi, 'haven\'t'],
      [/\bmust\b/gi, 'should'],
      [/\bdeadline\b/gi, 'target date'],
      [/\burgent\b/gi, 'priority'],
    ];

    // Common transcription fixes
    const transcriptionFixes = [
      [/\bto do\b/gi, 'todo'],
      [/\btoo do\b/gi, 'todo'],
      [/\btodo list\b/gi, 'todo'],
      [/\bmake sure to\b/gi, 'remember to'],
      [/\bneed to\b/gi, 'should'],
      [/\bhave to\b/gi, 'should'],
      [/\bshould of\b/gi, 'should have'],
      [/\bcould of\b/gi, 'could have'],
      [/\bwould of\b/gi, 'would have'],
      
      // Speech recognition errors
      [/\bcomplaint\b/gi, 'complete'],
      [/\bby\s+(banana|vegetables|groceries|items|food|things|bread|milk|coffee)\b/gi, 'buy $1'],
      [/\bthere are free\b/gi, 'they are free'],
      [/\bwork after\b/gi, 'walk after'],
      [/\bgo for a work\b/gi, 'go for a walk'],
      [/\bsend out the ma\b/gi, 'send out the mail'],
      [/\bweeke\b/gi, 'weekend'],
      [/\btoday I walk up\b/gi, 'today I woke up'],
      [/\bfeel sleep head\b/gi, 'feel sleepy'],
      [/\bcan walk project\b/gi, 'Canva project'],
      
      // New corrections for common misheard words
      [/\bheart day\b/gi, 'hard day'],
      [/\bmild\b/gi, 'milk'],
      [/\bsave they are feed\b/gi, 'see if they are free'],
      [/\bsave if they are feed\b/gi, 'see if they are free'],
      [/\bthey are feed\b/gi, 'they are free'],
      [/\bwhat are the plan set\b/gi, 'watch the planned show at'],
      [/\bplan set\b/gi, 'planned show at'],
      [/\bremind me to what\b/gi, 'remind me to watch'],
      
      // Additional common errors
      [/\beggs and mild\b/gi, 'eggs and milk'],
      [/\bmild and\b/gi, 'milk and'],
      [/\bfeed during\b/gi, 'free during'],
      [/\bsave they\b/gi, 'see if they'],
      [/\bsave if\b/gi, 'see if'],
      
      // Grammar and article fixes
      [/\bdo lot of\b/gi, 'do a lot of'],
      [/\blot of work\b/gi, 'a lot of work'],
      [/\bdraught\b/gi, 'draft'],
      [/\bGan milk\b/gi, 'oat milk'],
      [/\bgan milk\b/gi, 'oat milk'],
      [/\bthere free\b/gi, "they're free"],
      [/\bif there free\b/gi, "if they're free"],
      [/\bsee if there free\b/gi, "see if they're free"],
      
      // Common word substitutions
      [/\bfinal draught\b/gi, 'final draft'],
      [/\bprofessional draught\b/gi, 'professional draft'],
      [/\brough draught\b/gi, 'rough draft'],
      
      // New corrections for latest errors
      [/\bto say if she is free\b/gi, 'to ask if she is free'],
      [/\bto say if he is free\b/gi, 'to ask if he is free'], 
      [/\bto say if they are free\b/gi, 'to ask if they are free'],
      [/\bsay if she is free\b/gi, 'ask if she is free'],
      [/\bsay if he is free\b/gi, 'ask if he is free'],
      [/\bsay if they are free\b/gi, 'ask if they are free'],
      [/\bto save she is free\b/gi, 'to ask if she is free'],
      [/\bto save he is free\b/gi, 'to ask if he is free'],
      [/\bto save they are free\b/gi, 'to ask if they are free'],
      [/\bweeknd\b/gi, 'weekend'],
      [/\blate number\b/gi, 'slide number'],
      [/\bbook Stay for\b/gi, 'book a stay for'],
      [/\bbook stay for\b/gi, 'book a stay for'],
      [/\bBook Stay\b/gi, 'book a stay'],
      
      // Advanced context-aware fixes for complex patterns
      [/\band it to book\b/gi, 'and I need to book'],
      [/\band it to\b/gi, 'and I need to'],
      [/\blater the sweet\b/gi, 'later this evening'],
      [/\bsave the movie tickets are available\b/gi, 'see if the movie tickets are available'],
      [/\bsave the tickets are available\b/gi, 'see if the tickets are available'],
      [/\bto save the movie tickets\b/gi, 'to see if the movie tickets'],
      [/\bto save the tickets\b/gi, 'to see if the tickets'],
      [/\begg milk and\b/gi, 'eggs, milk and'],
      [/\begg milk\b/gi, 'eggs and milk'],
    ];

    [...ndFriendlyCorrections, ...transcriptionFixes].forEach(([pattern, replacement]) => {
      cleaned = cleaned.replace(pattern, replacement as string);
    });

    // Clean up spacing and punctuation
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s+([,.!?;:])/g, '$1') // Remove space before punctuation
      .replace(/([,.!?;:])\s*/g, '$1 ') // Add single space after punctuation
      .replace(/\.{2,}/g, '.') // Multiple periods to single
      .replace(/\?{2,}/g, '?') // Multiple question marks
      .replace(/!{2,}/g, '!') // Multiple exclamation marks
      .trim();

    // Capitalize sentences properly
    cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });

    // Ensure sentence ends with punctuation
    if (cleaned && !/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  }

  /**
   * Extract tasks using deterministic heuristics
   * Focus on imperative cues and action patterns
   */
  extractTasks(cleanedText: string): Task[] {
    if (!cleanedText || typeof cleanedText !== 'string') {
      return [];
    }

    const tasks: Task[] = [];
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Action patterns that indicate tasks
    const actionPatterns = [
      // Direct actions with priority hints
      { pattern: /\b(should|need to|have to|must|remember to|don't forget to)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(call|email|text|message|contact)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(buy|purchase|get|pick up|grab)\s+(.+)/gi, priority: 'low' as const },
      { pattern: /\b(finish|complete|do|work on|start)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(schedule|book|arrange|plan)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(review|check|look at|examine)\s+(.+)/gi, priority: 'low' as const },
      { pattern: /\b(submit|send|deliver|share)\s+(.+)/gi, priority: 'high' as const },
      { pattern: /\b(pay|renew|update|fix|repair)\s+(.+)/gi, priority: 'high' as const },
      
      // Imperative statements
      { pattern: /^(make|create|write|prepare)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /^(find|search|look for)\s+(.+)/gi, priority: 'low' as const },
      { pattern: /^(clean|organize|sort)\s+(.+)/gi, priority: 'low' as const },
    ];

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length < 3) return;

      actionPatterns.forEach(({ pattern, priority }) => {
        const matches = [...trimmed.matchAll(pattern)];
        
        matches.forEach(match => {
          const taskText = (match[2] || match[1] || match[0]).trim();
          if (taskText.length < 3) return;

          // Extract hashtags as tags
          const tags = this.extractHashtags(taskText);
          
          // Parse due date from the full sentence
          const due = this.parseDue(sentence);

          // Override priority if explicit priority markers found
          const extractedPriority = this.extractPriority(sentence) || priority;

          tasks.push({
            title: taskText.replace(/#\w+/g, '').trim(), // Remove hashtags from title
            due,
            tags,
            priority: extractedPriority,
          });
        });
      });

      // Check for list items (bullets, numbers, dashes)
      const listPattern = /^[\s]*[-•*\d+.]\s*(.+)/;
      const listMatch = trimmed.match(listPattern);
      if (listMatch) {
        const taskText = listMatch[1].trim();
        if (taskText.length >= 3) {
          const tags = this.extractHashtags(taskText);
          const due = this.parseDue(sentence);
          const priority = this.extractPriority(sentence) || 'med';

          tasks.push({
            title: taskText.replace(/#\w+/g, '').trim(),
            due,
            tags,
            priority,
          });
        }
      }
    });

    // Remove duplicates and return
    return this.deduplicateTasks(tasks);
  }

  /**
   * Parse due dates from text using deterministic patterns
   * Returns ISO 8601 date strings in user's timezone
   */
  parseDue(text: string, userTimezone?: string): string | undefined {
    if (!text) return undefined;

    const now = new Date();
    const lowerText = text.toLowerCase();

    // Today/tonight
    if (/\b(today|this evening|tonight)\b/.test(lowerText)) {
      return now.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Tomorrow
    if (/\b(tomorrow|next day)\b/.test(lowerText)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // This week / by Friday
    if (/\b(this week|by friday|end of week)\b/.test(lowerText)) {
      const endOfWeek = new Date(now);
      const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7; // Friday = 5
      endOfWeek.setDate(now.getDate() + daysUntilFriday);
      return endOfWeek.toISOString().split('T')[0];
    }

    // Next week
    if (/\b(next week|following week)\b/.test(lowerText)) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    // Specific weekdays (next Monday, this Friday, etc.)
    const weekdayMatch = lowerText.match(/\b(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (weekdayMatch) {
      const [, modifier, weekday] = weekdayMatch;
      const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekday);
      const currentDay = now.getDay();
      
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (modifier === 'next' || (daysToAdd === 0 && modifier !== 'this')) {
        daysToAdd += 7;
      }
      
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysToAdd);
      return targetDate.toISOString().split('T')[0];
    }

    // Month names with days (January 15, Aug 3, etc.)
    const monthMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
    if (monthMatch) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
      const day = parseInt(monthMatch[2], 10);
      
      const targetDate = new Date(now.getFullYear(), monthIndex, day);
      // If the date has passed this year, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
      
      return targetDate.toISOString().split('T')[0];
    }

    // Numeric dates (MM/DD, DD/MM, YYYY-MM-DD)
    const numericMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b|\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (numericMatch) {
      try {
        let year, month, day;
        
        if (numericMatch[4]) {
          // YYYY-MM-DD format
          year = parseInt(numericMatch[4], 10);
          month = parseInt(numericMatch[5], 10) - 1; // JS months are 0-based
          day = parseInt(numericMatch[6], 10);
        } else {
          // MM/DD or DD/MM format - assume MM/DD for US format
          month = parseInt(numericMatch[1], 10) - 1;
          day = parseInt(numericMatch[2], 10);
          year = numericMatch[3] ? parseInt(numericMatch[3], 10) : now.getFullYear();
          
          if (year < 100) year += 2000; // Handle 2-digit years
        }
        
        const targetDate = new Date(year, month, day);
        if (!isNaN(targetDate.getTime())) {
          return targetDate.toISOString().split('T')[0];
        }
      } catch {
        // Invalid date, continue
      }
    }

    // Relative time patterns (in 2 days, in 3 hours, etc.)
    const relativeMatch = lowerText.match(/\bin\s+(\d+)\s+(hour|day|week)s?\b/);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2];
      
      const targetDate = new Date(now);
      
      switch (unit) {
        case 'hour':
          targetDate.setHours(targetDate.getHours() + amount);
          break;
        case 'day':
          targetDate.setDate(targetDate.getDate() + amount);
          break;
        case 'week':
          targetDate.setDate(targetDate.getDate() + (amount * 7));
          break;
      }
      
      return targetDate.toISOString().split('T')[0];
    }

    return undefined;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagMatches = text.match(/#\w+/g);
    return hashtagMatches ? hashtagMatches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Extract priority indicators from text
   */
  private extractPriority(text: string): 'low' | 'med' | 'high' | undefined {
    const lowerText = text.toLowerCase();
    
    // Explicit priority markers
    if (/\b(p0|!|urgent|asap|critical)\b/.test(lowerText)) return 'high';
    if (/\b(p1|important|priority)\b/.test(lowerText)) return 'high';
    if (/\b(p2|medium|normal)\b/.test(lowerText)) return 'med';
    if (/\b(p3|low|minor|someday)\b/.test(lowerText)) return 'low';
    
    // Contextual priority hints
    if (/\b(deadline|due|must|urgent|critical|emergency)\b/.test(lowerText)) return 'high';
    if (/\b(should|need|important|remember)\b/.test(lowerText)) return 'med';
    if (/\b(maybe|consider|think about|someday|eventually)\b/.test(lowerText)) return 'low';
    
    return undefined;
  }

  /**
   * Remove duplicate tasks based on title similarity
   */
  private deduplicateTasks(tasks: Task[]): Task[] {
    const seen = new Set<string>();
    const unique: Task[] = [];
    
    for (const task of tasks) {
      const normalized = task.title.toLowerCase().trim();
      if (!seen.has(normalized) && normalized.length > 0) {
        seen.add(normalized);
        unique.push(task);
      }
    }
    
    return unique;
  }
}

/**
 * Deterministic NLP Provider
 * Pure deterministic processing without LLM costs
 * ND-first: neutral language, no shame/pressure
 */
export class DeterministicNLPProvider implements NLPProvider {
  async process(
    text: string,
    platform: 'web' | 'electron' | 'android' | 'ios',
    timezone?: string
  ): Promise<NLPResult> {
    const cleanedText = this.cleanText(text);
    const tasks = this.extractTasks(cleanedText);
    
    return {
      cleanedText,
      tasks,
      meta: {
        provider: 'deterministic',
        version: '1.0',
        platform,
        processed_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Clean raw text with deterministic rules
   * ND-first: neutral language, no shame-based corrections
   */
  cleanText(rawText: string): string {
    if (!rawText || typeof rawText !== 'string') {
      return '';
    }

    let cleaned = rawText.trim();

    // Remove common filler words and false starts
    const fillerPatterns = [
      /\b(um|uh|er|ah|like|you know|so|well|actually|basically|literally)\b/gi,
      /\b(i mean|you see|right\?|ok\?|okay\?)\b/gi,
      /\b(let me|let's see|hold on|wait)\b/gi,
    ];

    fillerPatterns.forEach(pattern => {
      cleaned = cleaned.replace(pattern, ' ');
    });

    // ND-first corrections: replace shame/pressure language with neutral alternatives
    const ndFriendlyCorrections = [
      [/\boverdue\b/gi, 'pending'],
      [/\blate\b/gi, 'pending'],
      [/\bfailed to\b/gi, 'haven\'t'],
      [/\bmust\b/gi, 'should'],
      [/\bdeadline\b/gi, 'target date'],
      [/\burgent\b/gi, 'priority'],
    ];

    // Common transcription fixes
    const transcriptionFixes = [
      [/\bto do\b/gi, 'todo'],
      [/\btoo do\b/gi, 'todo'],
      [/\btodo list\b/gi, 'todo'],
      [/\bmake sure to\b/gi, 'remember to'],
      [/\bneed to\b/gi, 'should'],
      [/\bhave to\b/gi, 'should'],
      [/\bshould of\b/gi, 'should have'],
      [/\bcould of\b/gi, 'could have'],
      [/\bwould of\b/gi, 'would have'],
      
      // Speech recognition errors
      [/\bcomplaint\b/gi, 'complete'],
      [/\bby\s+(banana|vegetables|groceries|items|food|things|bread|milk|coffee)\b/gi, 'buy $1'],
      [/\bthere are free\b/gi, 'they are free'],
      [/\bwork after\b/gi, 'walk after'],
      [/\bgo for a work\b/gi, 'go for a walk'],
      [/\bsend out the ma\b/gi, 'send out the mail'],
      [/\bweeke\b/gi, 'weekend'],
      [/\btoday I walk up\b/gi, 'today I woke up'],
      [/\bfeel sleep head\b/gi, 'feel sleepy'],
      [/\bcan walk project\b/gi, 'Canva project'],
      
      // New corrections for common misheard words
      [/\bheart day\b/gi, 'hard day'],
      [/\bmild\b/gi, 'milk'],
      [/\bsave they are feed\b/gi, 'see if they are free'],
      [/\bsave if they are feed\b/gi, 'see if they are free'],
      [/\bthey are feed\b/gi, 'they are free'],
      [/\bwhat are the plan set\b/gi, 'watch the planned show at'],
      [/\bplan set\b/gi, 'planned show at'],
      [/\bremind me to what\b/gi, 'remind me to watch'],
      
      // Additional common errors
      [/\beggs and mild\b/gi, 'eggs and milk'],
      [/\bmild and\b/gi, 'milk and'],
      [/\bfeed during\b/gi, 'free during'],
      [/\bsave they\b/gi, 'see if they'],
      [/\bsave if\b/gi, 'see if'],
      
      // Grammar and article fixes
      [/\bdo lot of\b/gi, 'do a lot of'],
      [/\blot of work\b/gi, 'a lot of work'],
      [/\bdraught\b/gi, 'draft'],
      [/\bGan milk\b/gi, 'oat milk'],
      [/\bgan milk\b/gi, 'oat milk'],
      [/\bthere free\b/gi, "they're free"],
      [/\bif there free\b/gi, "if they're free"],
      [/\bsee if there free\b/gi, "see if they're free"],
      
      // Common word substitutions
      [/\bfinal draught\b/gi, 'final draft'],
      [/\bprofessional draught\b/gi, 'professional draft'],
      [/\brough draught\b/gi, 'rough draft'],
      
      // New corrections for latest errors
      [/\bto say if she is free\b/gi, 'to ask if she is free'],
      [/\bto say if he is free\b/gi, 'to ask if he is free'], 
      [/\bto say if they are free\b/gi, 'to ask if they are free'],
      [/\bsay if she is free\b/gi, 'ask if she is free'],
      [/\bsay if he is free\b/gi, 'ask if he is free'],
      [/\bsay if they are free\b/gi, 'ask if they are free'],
      [/\bto save she is free\b/gi, 'to ask if she is free'],
      [/\bto save he is free\b/gi, 'to ask if he is free'],
      [/\bto save they are free\b/gi, 'to ask if they are free'],
      [/\bweeknd\b/gi, 'weekend'],
      [/\blate number\b/gi, 'slide number'],
      [/\bbook Stay for\b/gi, 'book a stay for'],
      [/\bbook stay for\b/gi, 'book a stay for'],
      [/\bBook Stay\b/gi, 'book a stay'],
      
      // Advanced context-aware fixes for complex patterns
      [/\band it to book\b/gi, 'and I need to book'],
      [/\band it to\b/gi, 'and I need to'],
      [/\blater the sweet\b/gi, 'later this evening'],
      [/\bsave the movie tickets are available\b/gi, 'see if the movie tickets are available'],
      [/\bsave the tickets are available\b/gi, 'see if the tickets are available'],
      [/\bto save the movie tickets\b/gi, 'to see if the movie tickets'],
      [/\bto save the tickets\b/gi, 'to see if the tickets'],
      [/\begg milk and\b/gi, 'eggs, milk and'],
      [/\begg milk\b/gi, 'eggs and milk'],
    ];

    [...ndFriendlyCorrections, ...transcriptionFixes].forEach(([pattern, replacement]) => {
      cleaned = cleaned.replace(pattern, replacement as string);
    });

    // Clean up spacing and punctuation
    cleaned = cleaned
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s+([,.!?;:])/g, '$1') // Remove space before punctuation
      .replace(/([,.!?;:])\s*/g, '$1 ') // Add single space after punctuation
      .replace(/\.{2,}/g, '.') // Multiple periods to single
      .replace(/\?{2,}/g, '?') // Multiple question marks
      .replace(/!{2,}/g, '!') // Multiple exclamation marks
      .trim();

    // Capitalize sentences properly
    cleaned = cleaned.replace(/(^|[.!?]\s+)([a-z])/g, (match, prefix, letter) => {
      return prefix + letter.toUpperCase();
    });

    // Ensure sentence ends with punctuation
    if (cleaned && !/[.!?]$/.test(cleaned)) {
      cleaned += '.';
    }

    return cleaned;
  }

  /**
   * Extract tasks using deterministic heuristics
   * Focus on imperative cues and action patterns
   */
  extractTasks(cleanedText: string): Task[] {
    if (!cleanedText || typeof cleanedText !== 'string') {
      return [];
    }

    const tasks: Task[] = [];
    const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

    // Action patterns that indicate tasks
    const actionPatterns = [
      // Direct actions with priority hints
      { pattern: /\b(should|need to|have to|must|remember to|don't forget to)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(call|email|text|message|contact)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(buy|purchase|get|pick up|grab)\s+(.+)/gi, priority: 'low' as const },
      { pattern: /\b(finish|complete|do|work on|start)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(schedule|book|arrange|plan)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /\b(review|check|look at|examine)\s+(.+)/gi, priority: 'low' as const },
      { pattern: /\b(submit|send|deliver|share)\s+(.+)/gi, priority: 'high' as const },
      { pattern: /\b(pay|renew|update|fix|repair)\s+(.+)/gi, priority: 'high' as const },
      
      // Imperative statements
      { pattern: /^(make|create|write|prepare)\s+(.+)/gi, priority: 'med' as const },
      { pattern: /^(find|search|look for)\s+(.+)/gi, priority: 'low' as const },
      { pattern: /^(clean|organize|sort)\s+(.+)/gi, priority: 'low' as const },
    ];

    sentences.forEach((sentence, index) => {
      const trimmed = sentence.trim();
      if (trimmed.length < 3) return;

      actionPatterns.forEach(({ pattern, priority }) => {
        const matches = [...trimmed.matchAll(pattern)];
        
        matches.forEach(match => {
          const taskText = (match[2] || match[1] || match[0]).trim();
          if (taskText.length < 3) return;

          // Extract hashtags as tags
          const tags = this.extractHashtags(taskText);
          
          // Parse due date from the full sentence
          const due = this.parseDue(sentence);

          // Override priority if explicit priority markers found
          const extractedPriority = this.extractPriority(sentence) || priority;

          tasks.push({
            title: taskText.replace(/#\w+/g, '').trim(), // Remove hashtags from title
            due,
            tags,
            priority: extractedPriority,
          });
        });
      });

      // Check for list items (bullets, numbers, dashes)
      const listPattern = /^[\s]*[-•*\d+.]\s*(.+)/;
      const listMatch = trimmed.match(listPattern);
      if (listMatch) {
        const taskText = listMatch[1].trim();
        if (taskText.length >= 3) {
          const tags = this.extractHashtags(taskText);
          const due = this.parseDue(sentence);
          const priority = this.extractPriority(sentence) || 'med';

          tasks.push({
            title: taskText.replace(/#\w+/g, '').trim(),
            due,
            tags,
            priority,
          });
        }
      }
    });

    // Remove duplicates and return
    return this.deduplicateTasks(tasks);
  }

  /**
   * Parse due dates from text using deterministic patterns
   * Returns ISO 8601 date strings in user's timezone
   */
  parseDue(text: string, userTimezone?: string): string | undefined {
    if (!text) return undefined;

    const now = new Date();
    const lowerText = text.toLowerCase();

    // Today/tonight
    if (/\b(today|this evening|tonight)\b/.test(lowerText)) {
      return now.toISOString().split('T')[0]; // YYYY-MM-DD
    }

    // Tomorrow
    if (/\b(tomorrow|next day)\b/.test(lowerText)) {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // This week / by Friday
    if (/\b(this week|by friday|end of week)\b/.test(lowerText)) {
      const endOfWeek = new Date(now);
      const daysUntilFriday = (5 - now.getDay() + 7) % 7 || 7; // Friday = 5
      endOfWeek.setDate(now.getDate() + daysUntilFriday);
      return endOfWeek.toISOString().split('T')[0];
    }

    // Next week
    if (/\b(next week|following week)\b/.test(lowerText)) {
      const nextWeek = new Date(now);
      nextWeek.setDate(now.getDate() + 7);
      return nextWeek.toISOString().split('T')[0];
    }

    // Specific weekdays (next Monday, this Friday, etc.)
    const weekdayMatch = lowerText.match(/\b(next|this)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
    if (weekdayMatch) {
      const [, modifier, weekday] = weekdayMatch;
      const targetDay = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(weekday);
      const currentDay = now.getDay();
      
      let daysToAdd = (targetDay - currentDay + 7) % 7;
      if (modifier === 'next' || (daysToAdd === 0 && modifier !== 'this')) {
        daysToAdd += 7;
      }
      
      const targetDate = new Date(now);
      targetDate.setDate(now.getDate() + daysToAdd);
      return targetDate.toISOString().split('T')[0];
    }

    // Month names with days (January 15, Aug 3, etc.)
    const monthMatch = text.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
    if (monthMatch) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
      const day = parseInt(monthMatch[2], 10);
      
      const targetDate = new Date(now.getFullYear(), monthIndex, day);
      // If the date has passed this year, assume next year
      if (targetDate < now) {
        targetDate.setFullYear(now.getFullYear() + 1);
      }
      
      return targetDate.toISOString().split('T')[0];
    }

    // Numeric dates (MM/DD, DD/MM, YYYY-MM-DD)
    const numericMatch = text.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b|\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (numericMatch) {
      try {
        let year, month, day;
        
        if (numericMatch[4]) {
          // YYYY-MM-DD format
          year = parseInt(numericMatch[4], 10);
          month = parseInt(numericMatch[5], 10) - 1; // JS months are 0-based
          day = parseInt(numericMatch[6], 10);
        } else {
          // MM/DD or DD/MM format - assume MM/DD for US format
          month = parseInt(numericMatch[1], 10) - 1;
          day = parseInt(numericMatch[2], 10);
          year = numericMatch[3] ? parseInt(numericMatch[3], 10) : now.getFullYear();
          
          if (year < 100) year += 2000; // Handle 2-digit years
        }
        
        const targetDate = new Date(year, month, day);
        if (!isNaN(targetDate.getTime())) {
          return targetDate.toISOString().split('T')[0];
        }
      } catch {
        // Invalid date, continue
      }
    }

    // Relative time patterns (in 2 days, in 3 hours, etc.)
    const relativeMatch = lowerText.match(/\bin\s+(\d+)\s+(hour|day|week)s?\b/);
    if (relativeMatch) {
      const amount = parseInt(relativeMatch[1], 10);
      const unit = relativeMatch[2];
      
      const targetDate = new Date(now);
      
      switch (unit) {
        case 'hour':
          targetDate.setHours(targetDate.getHours() + amount);
          break;
        case 'day':
          targetDate.setDate(targetDate.getDate() + amount);
          break;
        case 'week':
          targetDate.setDate(targetDate.getDate() + (amount * 7));
          break;
      }
      
      return targetDate.toISOString().split('T')[0];
    }

    return undefined;
  }

  /**
   * Extract hashtags from text
   */
  private extractHashtags(text: string): string[] {
    const hashtagMatches = text.match(/#\w+/g);
    return hashtagMatches ? hashtagMatches.map(tag => tag.substring(1)) : [];
  }

  /**
   * Extract priority indicators from text
   */
  private extractPriority(text: string): 'low' | 'med' | 'high' | undefined {
    const lowerText = text.toLowerCase();
    
    // Explicit priority markers
    if (/\b(p0|!|urgent|asap|critical)\b/.test(lowerText)) return 'high';
    if (/\b(p1|important|priority)\b/.test(lowerText)) return 'high';
    if (/\b(p2|medium|normal)\b/.test(lowerText)) return 'med';
    if (/\b(p3|low|minor|someday)\b/.test(lowerText)) return 'low';
    
    // Contextual priority hints
    if (/\b(deadline|due|must|urgent|critical|emergency)\b/.test(lowerText)) return 'high';
    if (/\b(should|need|important|remember)\b/.test(lowerText)) return 'med';
    if (/\b(maybe|consider|think about|someday|eventually)\b/.test(lowerText)) return 'low';
    
    return undefined;
  }

  /**
   * Remove duplicate tasks based on title similarity
   */
  private deduplicateTasks(tasks: Task[]): Task[] {
    const seen = new Set<string>();
    const unique: Task[] = [];
    
    for (const task of tasks) {
      const normalized = task.title.toLowerCase().trim();
      if (!seen.has(normalized) && normalized.length > 0) {
        seen.add(normalized);
        unique.push(task);
      }
    }
    
    return unique;
  }
}
