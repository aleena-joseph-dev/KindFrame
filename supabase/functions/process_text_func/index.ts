// Supabase Edge Function (Deno) — KindFrame process_text
// Single-file module exporting `process_text` and exposing an HTTP handler
// Tech: Deno + URL/npm imports (no tsconfig path aliases)
// Deterministic rules first; optional LLM cleaner via injected function

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import * as chrono from "npm:chrono-node@2.7.6";
import { DateTime } from "npm:luxon@3.4.4";
import { z } from "npm:zod@3.23.8";

/**
 * Types
 */
// Unified base item with common fields
export type BaseItem = {
  title?: string | null;
  body?: string | null;
  start?: string | null; // ISO in options.timezone or null if unknown
  end?: string | null;   // ISO in options.timezone or null if unknown
  allDay?: boolean | null;
  whenText?: string | null; // original natural language when fuzzy
  fuzzy: boolean;
  reminder?: string | null;
  isDraft: boolean;
  isPrivate: boolean;
};

export type ItemTask = {
  type: "task";
  title: string;
  projectId?: string | null;
  due?: string | null;
  reminder?: string | null;
  notes?: string | null;
  priority?: "low" | "medium" | "high" | null;
  isDraft: boolean;
  isPrivate: boolean;
};

export type ItemTodo = {
  type: "todo";
  title: string;
  projectId?: string | null;
  due?: string | null; // ISO date if parseable
  reminder?: string | null;
  notes?: string | null;
  priority?: "low" | "medium" | "high" | null;
  whenText?: string | null; // Preserve human time phrases that aren't concretized
  isDraft: boolean;
  isPrivate: boolean;
};

export type ItemEvent = {
  type: "event";
  title: string;
  start?: string | null; // ISO in options.timezone or null if unknown
  end?: string | null;   // ISO in options.timezone or null if unknown
  allDay?: boolean | null;
  whenText?: string | null; // original natural language when fuzzy
  fuzzy: boolean;
  reminder?: string | null;
  location?: string | null;
  isDraft: boolean;
  isPrivate: boolean;
};

export type ItemNote = BaseItem & {
  type: "note";
  body: string;
  folderId?: string | null;
};

export type ItemJournal = {
  type: "journal";
  title?: string | null;
  body: string;
  folderId?: string | null;
  mood?: string | null;
  isDraft: boolean;
  isPrivate: boolean;
};

export type ItemCoreMemorySuggestion = {
  type: "core_memory_suggestion";
  title: string;
  body: string;
};

export type ProcessItem =
  | ItemTodo
  | ItemEvent;

export type Suggestion = {
  inferredType: "todo" | "event" | "mixed";
  confidence: number; // 0..1
  rationale: string;
};

export type ProcessResult = {
  cleaned_text: string;
  items: ProcessItem[];
  suggestion: Suggestion;
  followups: string[];
};

export type CleanerFn = (text: string) => Promise<string>;

export const OptionsSchema = z.object({
  timezone: z.string().default("Asia/Kolkata"),
  userId: z.string(),
  projectId: z.string().optional().nullable().default(null),
  somedayAllowed: z.boolean().default(true),
  maxItems: z.number().int().positive().max(20).default(20),
  nowISO: z.string().optional(), // override clock for tests; must be ISO if provided
});
export type ProcessOptions = z.infer<typeof OptionsSchema> & {
  cleaner?: CleanerFn; // optional injected LLM/text cleaner
};

/**
 * Public API — process_text
 */
export async function process_text(input: string, options: ProcessOptions): Promise<ProcessResult> {
  const opts = OptionsSchema.parse(options);
  const now = opts.nowISO ? DateTime.fromISO(opts.nowISO) : DateTime.now();
  const zone = opts.timezone || "Asia/Kolkata";
  const nowZ = now.setZone(zone);

  // 1) CLEANING — rules first, optional LLM cleaner second
  const ruleCleaned = ruleBasedClean(input);
  const cleaned = await maybeLLMClean(ruleCleaned, options.cleaner);

  // 2) SPLIT — conservative segmentation into fragments
  const fragments = splitIntoFragments(cleaned);

  // 3) EXTRACT — deterministic classification & date parsing
  const resultItems: ProcessItem[] = [];
  const followups: string[] = [];

  for (const frag of fragments) {
    const trimmed = frag.trim();
    if (!trimmed) continue;

    // Skip reflective/journal content entirely per requirements
    if (looksLikeJournal(trimmed)) {
      continue; // Skip journals unless explicit imperative (handled below)
    }

    // Detect dates/times (multiple allowed)
    const parsedDates = extractDates(trimmed, nowZ, zone);

    /**
     * Classification cheat-sheet:
     * 
     * Event keywords (only if time present): meeting, appointment, visit, call, reminder.
     * - With time/date → event.
     * - Without time/date → todo ("Schedule …" or "Call …").
     * 
     * Time detectors → event: explicit times (3 pm, 15:30), relative (in 30 minutes, after 2 hours), 
     * dated phrases (on Fri, Aug 22, tomorrow morning).
     * 
     * If only a day word (no time), mark event with fuzzy=true and whenText populated only when 
     * the phrase clearly implies a scheduled action (e.g., "meeting tomorrow"). 
     * For tasky lines ("finish report by Friday"), keep as todo with whenText:"Friday".
     * 
     * Ambiguous/vague time → todo: someday, soon, later, this weekend/next week → todo with whenText set; 
     * do not create an event.
     */

    // Check for event keywords
    const hasEventKeywords = /(\bmeet(?:ing)?\b|\bappointment\b|\bvisit\b|\bcall\b|\bremind(?:er)?\b)/i.test(trimmed);
    
    // Check if there's concrete time/date information (not vague phrases)
    // Exclude "by [day]" patterns which are due dates for tasks, not scheduled events
    const hasConcreteTime = parsedDates.length > 0 && 
      parsedDates.some(p => p.start || /\b(at\s+\d|tomorrow|today|\d+\s*(am|pm)|in\s+\d+\s*(minutes|hours))\b/i.test(p.whenText || "")) &&
      !/\bby\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday|weekend)\b/i.test(trimmed);
    
    // Check for vague time phrases that should stay as todos
    const hasVagueTime = /\b(someday|soon|later|this\s+weekend|next\s+week)\b/i.test(trimmed);

    // PRIORITY 1: Event classification 
    // 1a. Event keywords with concrete time
    if (hasEventKeywords && hasConcreteTime && !hasVagueTime) {
      const title = normalizeTitle(trimmed);
      for (const p of parsedDates) {
        resultItems.push(asEvent({ title, ...p }, opts));
        if (p.fuzzy || !p.start) {
          followups.push(`What time is '${p.whenText}'?`);
        }
      }
      continue;
    }
    
    // 1b. Any concrete time/date phrase creates an event (per requirements)
    if (hasConcreteTime && !hasVagueTime) {
      const title = normalizeTitle(trimmed);
      for (const p of parsedDates) {
        resultItems.push(asEvent({ title, ...p }, opts));
        if (p.fuzzy || !p.start) {
          followups.push(`What time is '${p.whenText}'?`);
        }
      }
      continue;
    }

    // PRIORITY 2: Handle shopping lists first (before general todo classification)
    if (/\b(buy|purchase|get|pick up)\b.*,/i.test(trimmed)) {
      const items = trimmed.replace(/^.*?(buy|purchase|get|pick up)\s+/i, '').replace(/\s+then.*$/i, '');
      resultItems.push(asTodo({ 
        title: "Buy groceries", 
        notes: items,
        whenText: parsedDates.length > 0 ? parsedDates[0].whenText : null
      }, opts));
      continue;
    }

    // PRIORITY 3: Todo classification (everything else that's actionable)
    if (looksLikeTask(trimmed) || hasEventKeywords) {
      const title = normalizeTitle(trimmed);
      
      // Regular todo
      const whenText = parsedDates.length > 0 ? parsedDates[0].whenText : null;
      resultItems.push(asTodo({ 
        title, 
        whenText,
        // Only set due for concrete dates, not vague phrases
        due: (parsedDates.length > 0 && !hasVagueTime && parsedDates[0].start) ? parsedDates[0].start : null
      }, opts));
      continue;
    }

    // Skip everything else (notes, unclassifiable content) per requirements
  }

  // 4) Cap items
  const items = resultItems.slice(0, opts.maxItems);

  // 5) Suggest an overall type
  const suggestion = makeSuggestion(items);

  return {
    cleaned_text: cleaned,
    items,
    suggestion,
    followups,
  };
}

/**
 * HTTP handler: POST { input, options } → ProcessResult
 * (Keep simple. Your app can ignore this and import process_text directly.)
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: cors() });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST with { input, options }" }), { status: 405, headers: {
      ...cors(),
      "Content-Type": "application/json",
    }});
  }
  try {
    const { input, options } = await req.json();
    if (typeof input !== "string") throw new Error("`input` must be a string");
    const out = await process_text(input, options ?? {});
    return new Response(JSON.stringify(out), { headers: { ...cors(), "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), { status: 400, headers: {
      ...cors(),
      "Content-Type": "application/json",
    }});
  }
});

/**
 * Helpers — Cleaning
 */
function ruleBasedClean(text: string): string {
  let t = text.replace(/\r\n?|\u000b|\f|\u0085/g, "\n");
  // collapse multiple spaces/newlines
  t = t.replace(/[\t ]{2,}/g, " ");
  t = t.replace(/\n{3,}/g, "\n\n");
  // remove common fillers at boundaries
  t = t.replace(/\b(?:um+|uh+|like|you know),?\s/gi, "");
  // normalize quotes/dashes
  t = t.replace(/[""]/g, '"').replace(/['']/g, "'").replace(/[\u2013\u2014]/g, "-");
  // trim bullets
  t = t.replace(/^[-*]\s+/gm, "");
  
  // Speech recognition error corrections (unified across all functions)
  const speechFixes = [
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
    
    // Grammar and article fixes (order matters - more specific first)
    [/\bdo lot of work\b/gi, 'do a lot of work'],
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
    
    // New corrections for latest errors (context-aware and natural)
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
    [/\bso I was thinking about going\b/gi, 'so I need to go'],
  ];
  
  speechFixes.forEach(([pattern, replacement]) => {
    t = t.replace(pattern, replacement as string);
  });
  
  // Post-process to fix double articles
  t = t.replace(/\bdo a a lot of\b/gi, 'do a lot of');
  t = t.replace(/\ba a lot of\b/gi, 'a lot of');
  
  // Add periods before task indicators for better segmentation - more aggressive
  t = t.replace(/(\s+)(?=I\s+(?:need|have)\s+to\s+|I\s+have\s+to\s+|I\s+need\s+to\s+|I'\s*ll\s+|go\s+for\s+|buy?\s+|complete\s+|send\s+|go\s+to\s+the\s+|call\s+|create\s+)/gi, function(match, space, offset, string) {
    // Only add period if there isn't already one
    const prevChar = string[offset - 1];
    return (prevChar === '.' || prevChar === '!' || prevChar === '?') ? ' ' : '. ';
  });
  
  // Handle "then" transitions between tasks (must be before period insertion)
  t = t.replace(/\s+then\s+(?=(?:create|go|call|buy|send|finish|complete)\s+)/gi, '. Then ');
  
  // Fix specific case: "mail then create" should be "mail. Then create"
  t = t.replace(/\bmail\s+then\s+create/gi, 'mail. Then create');
  
  // Split after emotional expressions to separate journal from tasks
  t = t.replace(/(tired|exhausted|sleepy|happy|sad|stressed)\s+(today|yesterday)(\s+)(?=I\s+(?:need|have)\s+to\s+|go\s+|complete\s+|send\s+|buy)/gi, function(match, emotion, timeword, space) {
    return emotion + ' ' + timeword + '. ';
  });
  
  // Handle the specific pattern "I feel very tired today I walk up" -> split before "I have to"
  t = t.replace(/(I feel [^.]*?tired[^.]*?today[^.]*?)(\s+)(?=I\s+have\s+to)/gi, function(match, journalPart, space) {
    return journalPart + '. ';
  });
  
  // Add periods before other task indicators that might not start with "I"
  t = t.replace(/(\s+)(?=(?:buy|complete|send|call|book|go\s+for)\s+)/gi, function(match, space, offset, string) {
    const prevChar = string[offset - 1];
    return (prevChar === '.' || prevChar === '!' || prevChar === '?') ? ' ' : '. ';
  });
  
  // Fix capitalization after periods - ensure "I" is always capitalized
  t = t.replace(/\.\s+i\s+/gi, ". I ");
  t = t.replace(/\.\s*i'/gi, ". I'");
  
  // Capitalize common task words after periods
  t = t.replace(/\.\s+(go|buy|complete|send|call|book)\s+/gi, function(match, word) {
    return '. ' + word.charAt(0).toUpperCase() + word.slice(1) + ' ';
  });
  
  // Fix the specific issue where "by" should be "Buy" (speech recognition error)
  t = t.replace(/\.\s*by\s+/gi, '. Buy ');
  
  // Ensure proper sentence case at start
  t = t.charAt(0).toUpperCase() + t.slice(1);
  
  return t.trim();
}

async function maybeLLMClean(text: string, cleaner?: CleanerFn): Promise<string> {
  if (!cleaner) return text;
  try {
    const out = await cleaner(text);
    if (typeof out === "string" && out.trim()) return out.trim();
    return text;
  } catch {
    return text; // graceful fallback
  }
}

/**
 * Helpers — Segmentation & Classification
 */
function splitIntoFragments(text: string): string[] {
  const lines = text.split(/\n+/).flatMap((ln) => ln.trim() ? [ln.trim()] : []);
  const frags: string[] = [];
  
  for (const line of lines) {
    // If the line is long and narrative (journal-like), keep as one
    // BUT NOT if it contains task indicators mixed in
    const sentenceCount = (line.match(/[.!?](\s|$)/g) || []).length;
    const hasTaskIndicators = /(complete|send|buy|call|book|go\s+for|I\s+have\s+to|I\s+need\s+to)/gi.test(line);
    if (line.length > 120 && sentenceCount >= 2 && looksLikeJournal(line) && !hasTaskIndicators) {
      frags.push(line);
      continue;
    }
    
    // If it looks like meeting notes or key points, keep as one
    if (/^(key points|notes|summary|takeaways|main points|highlights):/i.test(line.trim())) {
      frags.push(line);
      continue;
    }
    
    // Enhanced splitting for task lists and compound sentences
    let segments = [line];
    
    // First, split on sentence boundaries (periods, exclamation, question marks)
    segments = segments.flatMap(seg => {
      // Don't split if appointment/meeting followed by time in next sentence
      if (/\b(appointment|meeting|visit|call|remind)\b.*\.\s+(tomorrow|today|monday|tuesday|wednesday|thursday|friday|saturday|sunday|at\s+\d+)/i.test(seg)) {
        return [seg]; // Keep appointment + time together
      }
      // Split on periods followed by space and capital letter, or periods at the end
      return seg.split(/\.\s+(?=[A-Z])|[!?]\s+|\.\s*$/).filter(s => s.trim().length > 0);
    });
    
    // Split on clear sentence transitions like "but then", "then I", etc.
    segments = segments.flatMap(seg => {
      return seg.split(/\s+(?:but\s+then|then)\s+/i);
    });
    
    // Split on task indicators when they appear mid-sentence (more aggressive)
    segments = segments.flatMap(seg => {
      return seg.split(/\s+(?=I\s+(?:need|have)\s+to\s+|I\s+have\s+to\s+|I\s+need\s+to\s+|I'\s*ll\s+|I\s+have\s+|and\s+I\s+need\s+to\s+)/i);
    });
    
    // Split on "and" but preserve time expressions and be more selective
    segments = segments.flatMap(seg => {
      // Don't split if it looks like a time range
      if (/\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\s+and\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(seg) ||
          /\b\d+\s*(?:am|pm)?\s+and\s+\d+\s*(?:am|pm)\b/i.test(seg)) {
        return [seg];
      }
      // Split on "and" when followed by task indicators, or just "and" for compound tasks
      // Also split on phrases that indicate new actions
      return seg.split(/\s+and\s+(?=(?:ask|call|buy|go|complete|send|finish|do|make|create|schedule|book|i\s+need|i\s+have)\b)|\s+i\s+need\s+to\s+/i);
    });
    
    // Split on commas for lists, but be careful with dates and note-like content
    segments = segments.flatMap(seg => {
      // Don't split date expressions like "January 1, 2024"
      if (/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2},\s+\d{4}\b/i.test(seg)) {
        return [seg];
      }
      // Don't split if it's clearly a list of notes/points (contains colons or structured format)
      if (/^(key points|notes|summary|takeaways|main points|highlights):/i.test(seg) || 
          seg.split(',').length > 3) { // More than 3 comma-separated items = likely a note
        return [seg];
      }
      return seg.split(/,\s+(?=\w)/);
    });
    
    // Split on semicolons
    segments = segments.flatMap(seg => seg.split(/;\s+/));
    
    // Clean and add segments
    for (const s of segments) {
      const trimmed = s.trim();
      if (trimmed && trimmed.length > 3) {
        // Skip meaningless fragments like just "I have to" or "I need to"
        if (!/^(I have to|I need to|I'll|I will)\.?$/i.test(trimmed)) {
          frags.push(trimmed);
        }
      }
    }
  }
  
  return frags;
}

const EVENT_KEYWORDS = /(\bmeet(?:ing)?\b|\bappointment\b|\bremind(?:er)?\b)/i;
const TODO_KEYWORD = /\btodo\b/i;
const TASK_KEYWORD = /\btask\b/i;

function detectExplicitType(text: string): "event" | "todo" | "task" | null {
  if (EVENT_KEYWORDS.test(text)) return "event";
  if (TODO_KEYWORD.test(text)) return "todo";
  if (TASK_KEYWORD.test(text)) return "task";
  return null;
}

function looksLikeTask(text: string): boolean {
  const trimmed = text.trim();
  
  // Check for imperative verbs at the start (including "I need to..." and "ask")
  const startsWithImperative = /^(i need to|i have to|i got to|i gotta|need to|have to|got to|gotta|maybe|perhaps|possibly|email|mail|message|text|call|ping|dm|reply|schedule|book|buy|order|pay|renew|review|write|draft|prepare|finish|complete|fix|debug|deploy|ship|clean|organize|back up|backup|upload|download|research|look into|follow up|follow-up|update|set up|setup|pick up|pickup|drop off|dropoff|create|make|build|design|submit|send|ask)\b/i.test(trimmed);
  
  // Check for task-like verbs anywhere in short phrases (including optional activities)
  const containsTaskVerbs = trimmed.length < 100 && /\b(finish|complete|call|email|send|submit|create|make|buy|order|schedule|book|pay|renew|fix|update|write|draft|prepare|go for|take|do|try)\b/i.test(trimmed);
  
  // Exclude if it looks like a journal entry or reflection
  const isReflective = /\b(i feel|i felt|i think|i thought|i had|it was|today was|yesterday|last night|made me|so proud|so happy|so sad|so stressed|amazing|incredible|feedback|learned so much|write\s+a?\s*journal|journaling)\b/i.test(trimmed);
  
  return (startsWithImperative || containsTaskVerbs) && !isReflective;
}

function looksLikeJournal(text: string): boolean {
  const trimmed = text.trim();
  
  // If it starts with strong journal indicators, it's definitely a journal
  if (/^(i feel|i felt|i am\s+(tired|exhausted|stressed|happy|sad|excited|worried|nervous|calm|peaceful)|today was|yesterday was)/i.test(trimmed)) {
    return true;
  }
  
  // Strong journal indicators - feelings and reflective expressions
  const hasStrongJournalIndicators = /(i feel|i felt|i am\s+(tired|exhausted|stressed|happy|sad|excited|worried|nervous|calm|peaceful)|today was|yesterday was|i think|i realize|i learned|write\s+a?\s*journal|journaling)/i.test(trimmed);
  
  // Strong task indicators that would override journal classification
  const hasStrongTaskIndicators = /^(i need to|i have to|call|complete|send|book|buy)\b/i.test(trimmed);
  
  // If it has strong journal indicators and no strong task start, it's a journal
  if (hasStrongJournalIndicators && !hasStrongTaskIndicators) return true;
  
  // Long reflective text with personal pronouns
  if (text.length > 200 && /\b(i|we)\b/i.test(text) && !/^(i need to|i have to)\b/i.test(text)) return true;
  
  // Past tense narrative
  if (/\b(was|were|had|did|went|came|saw|heard|said|told)\b.*\b(i|me|my|myself)\b/i.test(text) && text.length > 40) return true;
  
  return false;
}

function looksLikeCoreMemory(text: string): boolean {
  return /(i remember|that time when|i'll never forget|made me feel|so proud|so happy|so scared|so sad)/i.test(text);
}

function normalizeTitle(text: string): string {
  let t = text.trim();
  
  // Remove common task prefixes and verbose lead-ins
  t = t.replace(/^\b(i need to|i have to|i got to|i gotta|please|remember to|note to self|todo:|task:|action:|action item:|reminder:|meeting:|appointment:)\b[:\s]*/i, "");
  t = t.replace(/^(i have so many things to get done|so many things to get done|things to get done)\s*/i, "");
  
  // Extract the core action from compound phrases
  if (/\bcall\b.*\band\s+ask/i.test(t)) {
    t = t.replace(/^.*?(call\s+[^a-z]+).*?(ask\s+.+)/i, "$1 to $2");
    t = t.replace(/\s+and\s+ask\s+/i, " to ");
  }
  
  // Handle "ask her to [action]" patterns
  if (/^ask\s+(her|him|them)\s+to\s+/i.test(t)) {
    t = t.replace(/^ask\s+(her|him|them)\s+to\s+(.+)/i, "$2");
  }
  
  // Remove articles and common unnecessary words for cleaner titles
  t = t.replace(/^\b(the|a|an)\s+/i, "");
  
  // Remove temporal expressions from the title (they'll be in whenText/due fields)
  t = t.replace(/\s+(by\s+friday\s+evening|tomorrow|today|this\s+week|next\s+week|on\s+\w+day|after\s+\d+\s+minutes).*$/i, "");
  
  // Remove connecting words at the end
  t = t.replace(/\s+(and|then)\s*$/i, "");
  
  // Clean up whitespace
  t = t.replace(/\s+/g, " ");
  
  return capitalize(t.trim()).slice(0, 140);
}

function summarizeTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return capitalize(t).slice(0, 80);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Date/Time extraction
 */
function extractDates(text: string, now: DateTime, zone: string): Array<{
  start: string | null;
  end: string | null;
  allDay: boolean | null;
  whenText: string | null;
  fuzzy: boolean;
}> {
  const results = chrono.parse(text, now.toJSDate());
  const out: Array<{ start: string | null; end: string | null; allDay: boolean | null; whenText: string | null; fuzzy: boolean }>
    = [];
  for (const r of results) {
    const comp = r.start;
    const endComp = r.end;
    const orig = r.text ?? null;

    // Implied time (none provided)
    const hasTime = comp.isCertain("hour");

    const startJS = comp.date();
    const start = DateTime.fromJSDate(startJS).setZone(zone);

    const end = endComp ? DateTime.fromJSDate(endComp.date()).setZone(zone) : null;

    // For day-only dates like "today", set default time to 09:00 IST for tasks
    let resolvedStart = start;
    if (!hasTime && orig && /\btoday\b/i.test(orig)) {
      resolvedStart = start.set({ hour: 9, minute: 0, second: 0, millisecond: 0 });
    }
    
    out.push({
      start: resolvedStart.toISO(),
      end: end ? end.toISO() : null,
      allDay: !hasTime,
      whenText: orig,
      fuzzy: !hasTime || isFuzzyText(orig || ""),
    });
  }

  // If no chrono match but we see vague words like "someday/this week" → fuzzy
  if (out.length === 0 && /\b(someday|this week|next week|soon|later)\b/i.test(text)) {
    out.push({ start: null, end: null, allDay: null, whenText: null, fuzzy: true });
  }

  return out;
}

function isFuzzyText(t: string): boolean {
  return /\b(today|tomorrow|tonight|this (morning|afternoon|evening|week|month)|next (week|month)|someday|soon|later)\b/i.test(t);
}

function inferDueFromText(text: string, now: DateTime, zone: string): string | null | undefined {
  // Use chrono to attempt due date; return undefined if vague but present
  const res = chrono.parse(text, now.toJSDate());
  if (res.length === 0) return null;
  const comp = res[0].start;
  const hasTime = comp.isCertain("hour");
  const js = comp.date();
  const dt = DateTime.fromJSDate(js).setZone(zone);
  if (!hasTime && isFuzzyText(res[0].text ?? "")) return undefined; // signal vague
  return dt.toISO();
}

/**
 * Item constructors
 */
function baseFlags(opts: ProcessOptions) {
  return { 
    isDraft: true as const, 
    isPrivate: true as const,
    reminder: null,
    start: null,
    end: null,
    allDay: false,
    fuzzy: false
  };
}

function asEvent(
  p: { title: string; start?: string | null; end?: string | null; allDay?: boolean | null; whenText?: string | null; fuzzy?: boolean; location?: string | null },
  opts: ProcessOptions,
): ItemEvent {
  return { 
    type: "event", 
    title: p.title,
    location: p.location ?? null,
    start: p.start ?? null,
    end: p.end ?? null,
    allDay: p.allDay ?? false,
    whenText: p.whenText ?? null,
    fuzzy: p.fuzzy ?? false,
    ...baseFlags(opts)
  };
}

function asTask(
  p: { title: string; due?: string | null; projectId?: string | null; notes?: string | null; priority?: "low" | "medium" | "high" | null },
  opts: ProcessOptions
): ItemTask {
  return { 
    type: "task", 
    title: p.title,
    projectId: p.projectId ?? null,
    due: p.due ?? null,
    reminder: null,
    notes: p.notes ?? null,
    priority: p.priority ?? null,
    isDraft: true,
    isPrivate: true
  };
}

function asTodo(
  p: { title: string; due?: string | null; projectId?: string | null; notes?: string | null; priority?: "low" | "medium" | "high" | null; whenText?: string | null },
  opts: ProcessOptions
): ItemTodo {
  return { 
    type: "todo", 
    title: p.title,
    projectId: p.projectId ?? null,
    due: p.due ?? null,
    reminder: null,
    notes: p.notes ?? null,
    priority: p.priority ?? null,
    whenText: p.whenText ?? null,
    isDraft: true,
    isPrivate: true
  };
}

function asNote(p: { title?: string | null; body: string }, opts: ProcessOptions): ItemNote {
  return { 
    type: "note", 
    title: p.title ?? null, 
    body: p.body, 
    folderId: null,
    whenText: null,
    ...baseFlags(opts)
  };
}

function asJournal(p: { title?: string | null; body: string; mood?: string | null }, opts: ProcessOptions): ItemJournal {
  return { 
    type: "journal", 
    title: p.title ?? null, 
    body: p.body, 
    folderId: null, 
    mood: p.mood ?? null,
    isDraft: true,
    isPrivate: true
  };
}

/**
 * Suggestion
 */
function makeSuggestion(items: ProcessItem[]): Suggestion {
  if (items.length === 0) {
    return { inferredType: "mixed", confidence: 0, rationale: "No items extracted" };
  }

  const counts = new Map<string, number>();
  let actionableCount = 0;
  
  for (const it of items) {
    counts.set(it.type, (counts.get(it.type) || 0) + 1);
    if (it.type === "todo" || it.type === "event") {
      actionableCount++;
    }
  }
  
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const [top] = entries;
  const conf = top[1] / items.length;
  
  // Build descriptive rationale
  let rationale = "";
  if (entries.length === 1) {
    rationale = "Single type detected";
  } else if (top[0] === "todo") {
    const todoCount = counts.get("todo") || 0;
    const totalCount = items.length;
    if (todoCount === totalCount) {
      rationale = "All fragments are todos";
    } else {
      rationale = `${todoCount === 1 ? "One" : todoCount === 2 ? "Two" : todoCount} of ${totalCount === 1 ? "one" : totalCount === 2 ? "two" : totalCount === 3 ? "three" : totalCount} fragment${totalCount > 1 ? "s" : ""} ${todoCount === 1 ? "is a" : "are"} todo${todoCount > 1 ? "s" : ""}`;
    }
  } else if (top[0] === "event") {
    const eventCount = counts.get("event") || 0;
    const totalCount = items.length;
    if (eventCount === totalCount) {
      rationale = "All fragments are events";
    } else {
      rationale = `${eventCount === 1 ? "One" : eventCount === 2 ? "Two" : eventCount} of ${totalCount === 1 ? "one" : totalCount === 2 ? "two" : totalCount === 3 ? "three" : totalCount} fragment${totalCount > 1 ? "s" : ""} ${eventCount === 1 ? "is an" : "are"} event${eventCount > 1 ? "s" : ""}`;
    }
  } else if (actionableCount > items.length - actionableCount) {
    rationale = `Majority of fragments are actionable (${actionableCount}/${items.length})`;
  } else {
    rationale = `Types detected: ${entries.map(([k, v]) => `${k}:${v}`).join(", ")}`;
  }
  
  const inferred = conf >= 0.6 ? (top[0] as any) : "mixed";
  return { 
    inferredType: inferred, 
    confidence: Number(conf.toFixed(2)), 
    rationale 
  };
}

/**
 * CORS helper
 */
function cors() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info, x-supabase-api-version, accept-profile, content-profile",
  } as const;
}
