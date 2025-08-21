/**
 * Local Text Processing Service for KindFrame
 * Deterministic fallback processor with canonical schema compatibility
 */

import { z } from "zod";
import { postFilterItems } from "../lib/postFilterItems";

// -------------------------
// 1. Canonical schema validator (matches edge function output)
// -------------------------
export const CanonicalSchema = z.object({
  items: z.array(z.object({
    type: z.enum(["Task", "To-do", "Event", "Note", "Journal"]),
    title: z.string(),
    details: z.string().nullable(),
    due_iso: z.string().datetime().nullable(),
    duration_min: z.number().nullable(),
    location: z.string().nullable(),
    subtasks: z.array(z.string())
  })),
  suggested_overall_category: z.enum(["Task", "To-do", "Event", "Note", "Journal"]),
  forced_rules_applied: z.array(z.string()),
  warnings: z.array(z.string()),
  confidence: z.number().min(0).max(1)
});

export type CanonicalResult = z.infer<typeof CanonicalSchema>;

// -------------------------
// 2. Local extraction types
// -------------------------
interface LocalTask {
  type: "Task" | "To-do" | "Event" | "Note" | "Journal";
  title: string;
  details?: string | null;
  dueDate?: string | null; // ISO string
  duration?: number | null;
  location?: string | null;
  subtasks?: string[];
}

interface LocalResult {
  tasks: LocalTask[];
  meta: {
    rules: string[];
    warnings: string[];
    confidence?: number;
  };
}

// -------------------------
// 3. Classification helper (mirrors edge function logic)
// -------------------------
function classify(text: string): LocalTask["type"] {
  const lowerText = text.toLowerCase();
  
  // Event keywords - meetings, appointments, scheduled activities
  if (/\b(reminder|appointment|meeting|meet|schedule|call|conference|event)\b/i.test(text)) {
    return "Event";
  }
  
  // To-do keywords - action verbs without fixed time
  if (/\b(todo|to-do|call|email|buy|send|pay|book|renew|follow up|contact|order|pick up|drop off|submit|apply)\b/i.test(text)) {
    return "To-do";
  }
  
  // Task keywords - explicit work deliverables
  if (/\b(task|deliverable|complete|finish|implement|develop|create|build|design|review|test|deploy)\b/i.test(text)) {
    return "Task";
  }
  
  // Journal detection - longer reflective text
  if (text.split(/\s+/).length > 25 && /\b(feel|felt|think|thought|today|yesterday|remember|realize)\b/i.test(text)) {
    return "Journal";
  }
  
  // Default to Note for everything else
  return "Note";
}

// -------------------------
// 4. Date & duration parsers (regex-based for determinism)
// -------------------------
function parseDuration(text: string): number | null {
  // Match patterns like "30 min", "2 hours", "1h 30m", "45m"
  const patterns = [
    /(\d+)\s*h(?:ours?)?\s*(\d+)\s*m(?:in(?:utes?)?)?/i, // "1h 30m", "2 hours 15 minutes"
    /(\d+)\s*h(?:ours?)?/i,                               // "2h", "1 hour"
    /(\d+)\s*m(?:in(?:utes?)?)?/i,                        // "30m", "45 minutes"
    /(\d+)\s*s(?:ec(?:onds?)?)?/i                         // "30s", "45 seconds"
  ];
  
  let totalMinutes = 0;
  
  // Check for hour + minute pattern first
  const hourMinMatch = text.match(patterns[0]);
  if (hourMinMatch) {
    const hours = parseInt(hourMinMatch[1], 10);
    const minutes = parseInt(hourMinMatch[2], 10);
    return hours * 60 + minutes;
  }
  
  // Check for hours only
  const hourMatch = text.match(patterns[1]);
  if (hourMatch) {
    return parseInt(hourMatch[1], 10) * 60;
  }
  
  // Check for minutes only
  const minMatch = text.match(patterns[2]);
  if (minMatch) {
    return parseInt(minMatch[1], 10);
  }
  
  // Check for seconds (convert to minutes, minimum 1)
  const secMatch = text.match(patterns[3]);
  if (secMatch) {
    const seconds = parseInt(secMatch[1], 10);
    return Math.max(1, Math.round(seconds / 60));
  }
  
  return null;
}

function parseISODate(text: string): string | null {
  // Match ISO date patterns: YYYY-MM-DD or YYYY-MM-DDTHH:MM
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2}))?\b/);
  if (isoMatch) {
    const datePart = isoMatch[1];
    const timePart = isoMatch[2] || "00:00";
    return `${datePart}T${timePart}:00Z`;
  }
  
  // Match common date formats and convert to ISO
  const dateFormats = [
    /\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/,           // MM/DD/YYYY or DD/MM/YYYY
    /\b(\d{4})\/(\d{1,2})\/(\d{1,2})\b/,           // YYYY/MM/DD
    /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2}),?\s+(\d{4})\b/i // Month DD, YYYY
  ];
  
  for (const format of dateFormats) {
    const match = text.match(format);
    if (match) {
      try {
        let year: number, month: number, day: number;
        
        if (format === dateFormats[0]) {
          // Assume MM/DD/YYYY format for US dates
          month = parseInt(match[1], 10);
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        } else if (format === dateFormats[1]) {
          year = parseInt(match[1], 10);
          month = parseInt(match[2], 10);
          day = parseInt(match[3], 10);
        } else {
          // Month name format
          const monthNames = ["jan", "feb", "mar", "apr", "may", "jun", 
                             "jul", "aug", "sep", "oct", "nov", "dec"];
          month = monthNames.indexOf(match[1].toLowerCase().slice(0, 3)) + 1;
          day = parseInt(match[2], 10);
          year = parseInt(match[3], 10);
        }
        
        if (year >= 1900 && year <= 2100 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
          const monthStr = month.toString().padStart(2, '0');
          const dayStr = day.toString().padStart(2, '0');
          return `${year}-${monthStr}-${dayStr}T00:00:00Z`;
        }
      } catch (e) {
        // Invalid date, continue to next format
        continue;
      }
    }
  }
  
  return null;
}

function parseLocation(text: string): string | null {
  // Look for location indicators: "at [location]", "@ [location]", "in [location]"
  const locationPatterns = [
    /\b(?:at|@)\s+([A-Za-z0-9\s&.,'-]+?)(?:\s+(?:for|with|about|\.|,|$))/i,
    /\bin\s+([A-Za-z0-9\s&.,'-]+?)(?:\s+(?:for|with|about|\.|,|$))/i,
    /\blocation:\s*([A-Za-z0-9\s&.,'-]+?)(?:\s*(?:\.|,|$))/i
  ];
  
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const location = match[1].trim();
      // Filter out common false positives
      if (location.length > 2 && location.length < 100 && 
          !/\b(the|and|or|but|for|with|about|when|where|what|how)\b/i.test(location)) {
        return location;
      }
    }
  }
  
  return null;
}

function extractSubtasks(text: string): string[] {
  // Look for subtask patterns: "1. task", "- subtask", "• item"
  const subtaskPatterns = [
    /^\s*[-•*]\s+(.+)$/gm,           // Bullet points
    /^\s*\d+\.\s+(.+)$/gm,          // Numbered lists
    /^\s*[a-z]\)\s+(.+)$/gm         // Lettered lists (a) b) c))
  ];
  
  const subtasks: string[] = [];
  
  for (const pattern of subtaskPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const subtask = match[1].trim();
      if (subtask.length > 3 && subtask.length < 200) {
        subtasks.push(subtask);
      }
    }
  }
  
  // Remove duplicates and sort for determinism
  return [...new Set(subtasks)].sort();
}

// -------------------------
// 5. Title extraction helper
// -------------------------
function extractCleanTitle(text: string): string {
  // Remove common filler words and phrases
  const fillerPatterns = [
    /^(?:remind me to|remind me|please|can you|could you|i need to|i want to|i would like to)\s+/i,
    /^(?:and i was also thinking|also|additionally|furthermore|moreover)\s+/i,
    /^(?:just|simply|basically|essentially)\s+/i,
    /^(?:i think|i feel|i believe|i guess|i suppose)\s+/i
  ];
  
  let cleanText = text.trim();
  
  // Speech recognition error corrections (unified with edge functions)
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
    
    // Grammar and article fixes
    [/\bdo lot of work\b/gi, 'do a lot of work'],
    [/\bdo lot of\b/gi, 'do a lot of'],
    [/\blot of work\b/gi, 'a lot of work'],
    [/\bdraught\b/gi, 'draft'],
    [/\bGan milk\b/gi, 'oat milk'],
    [/\bgan milk\b/gi, 'oat milk'],
    [/\bthere free\b/gi, "they're free"],
    [/\bif there free\b/gi, "if they're free"],
    [/\bsee if there free\b/gi, "see if they're free"],
    
    // Latest corrections (context-aware and natural)
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
  
  // Apply speech corrections
  speechFixes.forEach(([pattern, replacement]) => {
    cleanText = cleanText.replace(pattern, replacement as string);
  });
  
  // Post-process to fix double articles
  cleanText = cleanText.replace(/\bdo a a lot of\b/gi, 'do a lot of');
  cleanText = cleanText.replace(/\ba a lot of\b/gi, 'a lot of');
  
  // Remove filler patterns
  for (const pattern of fillerPatterns) {
    cleanText = cleanText.replace(pattern, '');
  }
  
  // Extract the main action or subject
  const actionPatterns = [
    /^(wake up|call|email|meet|schedule|book|buy|send|pay|renew|refactor|draft|create|build|develop)\s+([^.]+)/i,
    /^(reminder|appointment|meeting|task|todo|to-do)\s+(?:to\s+)?([^.]+)/i,
    /^([^.]+?)(?:\s+(?:in\s+\d+\s+minutes?|\s+at\s+\d+:\d+|\s+tomorrow|\s+next\s+week))/i
  ];
  
  for (const pattern of actionPatterns) {
    const match = cleanText.match(pattern);
    if (match) {
      return match[2] || match[1] || cleanText;
    }
  }
  
  // If no pattern matches, take the first meaningful phrase
  const sentences = cleanText.split(/[.!?]+/);
  const firstSentence = sentences[0].trim();
  
  // Take first 3-5 words as title
  const words = firstSentence.split(/\s+/);
  if (words.length <= 5) {
    return firstSentence;
  } else {
    return words.slice(0, 4).join(' ') + '...';
  }
}

// -------------------------
// 6. Hard split patterns and sentence splitting
// -------------------------
const HARD_SPLITS = [
  /\bthen\b/gi,
  /\band then\b/gi,
  /\bafter that\b/gi,
  /[,;]\s+/g
];

const VERB = /\b(call|text|message|email|send|finish|complete|buy|pick|book|schedule|pay|renew|plan|review|write|draft|upload|submit|meet|follow up|check|verify)\b/i;

function splitSentences(s: string): string[] {
  // first, period-inserted boundaries from step 1 help here
  let parts = [s];
  for (const re of HARD_SPLITS) {
    parts = parts.flatMap(p => p.split(re));
  }
  return parts.map(p => p.trim()).filter(Boolean);
}

// -------------------------
// 7. Main local processor
// -------------------------
export function processTextLocal(text: string): CanonicalResult {
  const rulesApplied: string[] = [];
  const warnings: string[] = [];
  
  if (!text || text.trim().length === 0) {
    warnings.push("Empty input text provided");
    return {
      items: [],
      suggested_overall_category: "Note",
      forced_rules_applied: [],
      warnings,
      confidence: 0.6
    };
  }
  
  // Normalize text
  const normalizedText = text.replace(/\s+/g, ' ').trim();
  
  // Use hard splits for better sentence segmentation
  const segments = splitSentences(normalizedText)
    .filter(s => s.length > 2);
  
  if (segments.length === 0) {
    warnings.push("No valid segments found after parsing");
    return {
      items: [],
      suggested_overall_category: "Note",
      forced_rules_applied: [],
      warnings,
      confidence: 0.6
    };
  }
  
  const tasks: LocalTask[] = segments
    .filter(segment => {
      // Only keep segments that contain action verbs
      if (!VERB.test(segment)) {
        warnings.push(`Segment lacks action verb: "${segment.substring(0, 30)}..."`);
        return false;
      }
      return true;
    })
    .map(segment => {
      const type = classify(segment);
      
      // Track which rules were applied
      switch (type) {
        case "Event":
          rulesApplied.push("event_keyword→Event");
          break;
        case "To-do":
          rulesApplied.push("todo_keyword→To-do");
          break;
        case "Task":
          rulesApplied.push("task_keyword→Task");
          break;
        case "Journal":
          rulesApplied.push("long_reflective→Journal");
          break;
        default:
          rulesApplied.push("default→Note");
      }
    
    // Extract details
    const dueDate = parseISODate(segment);
    const duration = parseDuration(segment);
    const location = parseLocation(segment);
    const subtasks = extractSubtasks(segment);
    
    if (dueDate) rulesApplied.push("iso_date_detected");
    if (duration) rulesApplied.push("duration_detected");
    if (location) rulesApplied.push("location_detected");
    if (subtasks.length > 0) rulesApplied.push("subtasks_detected");
    
    // Extract a clean title from the segment
    const cleanTitle = extractCleanTitle(segment);
    
    return {
      type,
      title: cleanTitle,
      details: segment.length > cleanTitle.length ? segment : null,
      dueDate,
      duration,
      location,
      subtasks
    };
  });
  
  // Determine overall category (most common type)
  const typeCounts = tasks.reduce((acc, task) => {
    acc[task.type] = (acc[task.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  const overallCategory = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as LocalTask["type"];
  
  // Calculate confidence based on rule matches and text characteristics
  let confidence = 0.8; // Base confidence
  
  if (rulesApplied.includes("event_keyword→Event") || 
      rulesApplied.includes("todo_keyword→To-do") || 
      rulesApplied.includes("task_keyword→Task")) {
    confidence = 0.9; // High confidence for clear keywords
  }
  
  // Boost confidence for verb-validated segments
  if (tasks.length > 0) {
    confidence = Math.min(0.95, confidence + (tasks.length * 0.02));
  }
  
  if (tasks.length === 1 && tasks[0].type === "Note" && 
      normalizedText.split(' ').length < 5) {
    confidence = 0.6; // Lower confidence for short, unclear notes
  }
  
  if (rulesApplied.includes("long_reflective→Journal")) {
    confidence = 0.85; // Good confidence for journal detection
  }
  
  // Remove duplicate rules and sort for determinism
  const uniqueRules = [...new Set(rulesApplied)].sort();
  
  return {
    items: tasks.map(task => ({
      type: task.type,
      title: task.title,
      details: task.details ?? null,
      due_iso: task.dueDate ?? null,
      duration_min: task.duration ?? null,
      location: task.location ?? null,
      subtasks: task.subtasks ?? []
    })),
    suggested_overall_category: overallCategory,
    forced_rules_applied: uniqueRules,
    warnings,
    confidence: Math.round(confidence * 100) / 100 // Round to 2 decimal places
  };
}



// -------------------------
// 6. Edge function validation and fallback orchestrator
// -------------------------
export function validateOrFallback(
  edgeResult: unknown, 
  originalText: string
): CanonicalResult {
  try {
    const parsed = CanonicalSchema.safeParse(edgeResult);
    if (parsed.success) {
      // Edge function returned valid result
      console.log('✅ VALIDATE_EDGE: Edge function result passed schema validation');
      
      // Apply client-side post-filter to clean up results
      const cleanedResult = {
        ...parsed.data,
        items: postFilterItems(parsed.data.items)
      };
      
      console.log(`🧹 POST_FILTER: Cleaned ${parsed.data.items.length} → ${cleanedResult.items.length} items`);
      return cleanedResult;
    } else {
      console.warn('❌ VALIDATE_EDGE: Edge function returned invalid schema, falling back to local processing');
      console.warn('❌ VALIDATE_EDGE: Validation errors:', JSON.stringify(parsed.error.errors, null, 2));
      console.warn('❌ VALIDATE_EDGE: Original data:', JSON.stringify(edgeResult, null, 2));
    }
  } catch (error) {
    console.warn('❌ VALIDATE_EDGE: Error validating edge function result:', error);
  }
  
  // Fallback to local processing
  console.log('🔄 LOCAL_FALLBACK: Processing locally');
  console.log('📝 INPUT:', originalText);
  
  const localResult = processTextLocal(originalText);
  
  console.log('✅ LOCAL_FALLBACK: Success');
  console.log('📊 OUTPUT:', {
    items: localResult.items.length,
    types: localResult.items.map(item => item.type),
    suggestion: localResult.suggested_overall_category,
    confidence: localResult.confidence
  });
  
        // Apply post-filter to clean up results
      const filteredResult = {
        ...localResult,
        items: postFilterItems(localResult.items)
      };
      
      // Add warning about fallback
      return {
        ...filteredResult,
        forced_rules_applied: [
          ...filteredResult.forced_rules_applied,
          "local_fallback"
        ],
        warnings: [
          ...filteredResult.warnings,
          "Fell back to local processing due to edge function error"
        ]
      };
}

// -------------------------
// 7. Utility functions for testing and debugging
// -------------------------
export function normalizeResultForTesting(result: CanonicalResult): CanonicalResult {
  return {
    ...result,
    forced_rules_applied: [...result.forced_rules_applied].sort(),
    warnings: [...result.warnings].sort(),
    items: result.items.map(item => ({
      ...item,
      subtasks: [...item.subtasks].sort()
    }))
  };
}

export function extractTasksPreview(text: string): {
  segmentCount: number;
  typeCounts: Record<string, number>;
  hasDateInfo: boolean;
  hasDuration: boolean;
  hasLocation: boolean;
} {
  const result = processTextLocal(text);
  
  const typeCounts = result.items.reduce((acc, item) => {
    acc[item.type] = (acc[item.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  
  return {
    segmentCount: result.items.length,
    typeCounts,
    hasDateInfo: result.items.some(item => item.due_iso !== null),
    hasDuration: result.items.some(item => item.duration_min !== null),
    hasLocation: result.items.some(item => item.location !== null)
  };
}
