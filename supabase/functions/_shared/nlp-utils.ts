/**
 * Deterministic NLP Utilities for Audio-to-Text Pipeline
 * 
 * ND-first guardrails: neutral language, no shame/overdue messaging
 * Pluggable design: can swap in LLM later without API changes
 */

export interface Task {
  id: string;
  text: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO date string
  dueTime?: string; // ISO time string
  confidence: number; // 0-1 score
}

export interface DueDateInfo {
  originalText: string;
  parsedDate?: string; // ISO date
  parsedTime?: string; // ISO time
  relativeType?: 'today' | 'tomorrow' | 'this_week' | 'next_week' | 'specific';
  confidence: number;
}

export interface ExtractionResult {
  tasks: Task[];
  dueDates: DueDateInfo[];
  categories: string[];
  confidence: number; // overall extraction confidence
}

/**
 * Clean raw transcription text with deterministic rules
 * - Remove filler words and false starts
 * - Fix common transcription errors
 * - Standardize punctuation and capitalization
 * - Maintain ND-friendly neutral tone
 */
export function cleanText(rawText: string): string {
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

  // Fix common transcription errors
  const corrections = [
    [/\bto do\b/gi, 'todo'],
    [/\btoo do\b/gi, 'todo'],
    [/\btodo list\b/gi, 'todo'],
    [/\bmake sure to\b/gi, 'remember to'],
    [/\bneed to\b/gi, 'should'],
    [/\bhave to\b/gi, 'should'],
    [/\bmust\b/gi, 'should'],
    [/\boverdue\b/gi, 'pending'], // ND-friendly: no shame language
    [/\blate\b/gi, 'pending'],
    [/\bfailed to\b/gi, 'haven\'t'],
    [/\bshould of\b/gi, 'should have'],
    [/\bcould of\b/gi, 'could have'],
    [/\bwould of\b/gi, 'would have'],
  ];

  corrections.forEach(([pattern, replacement]) => {
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
 * Extract tasks from cleaned text using deterministic patterns
 * Focus on action verbs and common task indicators
 */
export function extractTasks(cleanedText: string): Task[] {
  if (!cleanedText || typeof cleanedText !== 'string') {
    return [];
  }

  const tasks: Task[] = [];
  const sentences = cleanedText.split(/[.!?]+/).filter(s => s.trim().length > 0);

  // Action patterns that indicate tasks
  const actionPatterns = [
    // Direct actions
    { pattern: /\b(should|need to|have to|must|remember to|don't forget to)\s+(.+)/gi, priority: 'medium' as const },
    { pattern: /\b(call|email|text|message|contact)\s+(.+)/gi, priority: 'medium' as const },
    { pattern: /\b(buy|purchase|get|pick up|grab)\s+(.+)/gi, priority: 'low' as const },
    { pattern: /\b(finish|complete|do|work on|start)\s+(.+)/gi, priority: 'medium' as const },
    { pattern: /\b(schedule|book|arrange|plan)\s+(.+)/gi, priority: 'medium' as const },
    { pattern: /\b(review|check|look at|examine)\s+(.+)/gi, priority: 'low' as const },
    { pattern: /\b(submit|send|deliver|share)\s+(.+)/gi, priority: 'high' as const },
    { pattern: /\b(pay|renew|update|fix|repair)\s+(.+)/gi, priority: 'high' as const },
    
    // Imperative statements
    { pattern: /^(make|create|write|prepare)\s+(.+)/gi, priority: 'medium' as const },
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

        const category = categorizeTask(taskText);
        const confidence = calculateTaskConfidence(match[0], trimmed);

        tasks.push({
          id: generateTaskId(taskText, index),
          text: taskText,
          category,
          priority,
          confidence,
        });
      });
    });

    // Check for list items (bullets, numbers, dashes)
    const listPattern = /^[\s]*[-•*\d+.]\s*(.+)/;
    const listMatch = trimmed.match(listPattern);
    if (listMatch) {
      const taskText = listMatch[1].trim();
      if (taskText.length >= 3) {
        tasks.push({
          id: generateTaskId(taskText, index),
          text: taskText,
          category: categorizeTask(taskText),
          priority: 'medium',
          confidence: 0.8,
        });
      }
    }
  });

  // Remove duplicates and merge similar tasks
  return deduplicateTasks(tasks);
}

/**
 * Parse due dates from text using deterministic patterns
 * ND-friendly: focus on helpful scheduling, not deadline pressure
 */
export function parseDueDates(cleanedText: string): DueDateInfo[] {
  if (!cleanedText || typeof cleanedText !== 'string') {
    return [];
  }

  const dueDates: DueDateInfo[] = [];
  const now = new Date();

  // Temporal patterns
  const patterns = [
    // Relative dates
    { pattern: /\b(today|this evening|tonight)\b/gi, type: 'today' as const, confidence: 0.9 },
    { pattern: /\b(tomorrow|next day)\b/gi, type: 'tomorrow' as const, confidence: 0.9 },
    { pattern: /\b(this week|by friday|end of week)\b/gi, type: 'this_week' as const, confidence: 0.8 },
    { pattern: /\b(next week|following week)\b/gi, type: 'next_week' as const, confidence: 0.8 },
    
    // Specific dates
    { pattern: /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})\b/gi, type: 'specific' as const, confidence: 0.9 },
    { pattern: /\b(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\b/g, type: 'specific' as const, confidence: 0.8 },
    { pattern: /\b(\d{1,2})-(\d{1,2})(?:-(\d{2,4}))?\b/g, type: 'specific' as const, confidence: 0.8 },
    
    // Time patterns
    { pattern: /\b(\d{1,2}):(\d{2})\s*(am|pm)?\b/gi, type: 'time' as const, confidence: 0.8 },
    { pattern: /\b(morning|afternoon|evening|night)\b/gi, type: 'time_range' as const, confidence: 0.6 },
  ];

  patterns.forEach(({ pattern, type, confidence }) => {
    const matches = [...cleanedText.matchAll(pattern)];
    
    matches.forEach(match => {
      const originalText = match[0];
      let parsedDate: string | undefined;
      let parsedTime: string | undefined;

      try {
        switch (type) {
          case 'today':
            parsedDate = now.toISOString().split('T')[0];
            break;
          case 'tomorrow':
            const tomorrow = new Date(now);
            tomorrow.setDate(tomorrow.getDate() + 1);
            parsedDate = tomorrow.toISOString().split('T')[0];
            break;
          case 'this_week':
            const endOfWeek = new Date(now);
            endOfWeek.setDate(now.getDate() + (5 - now.getDay())); // Friday
            parsedDate = endOfWeek.toISOString().split('T')[0];
            break;
          case 'next_week':
            const nextWeek = new Date(now);
            nextWeek.setDate(now.getDate() + 7);
            parsedDate = nextWeek.toISOString().split('T')[0];
            break;
          case 'specific':
            // Handle month names and numeric dates
            parsedDate = parseSpecificDate(originalText, now);
            break;
          case 'time':
          case 'time_range':
            parsedTime = parseTime(originalText);
            break;
        }

        dueDates.push({
          originalText,
          parsedDate,
          parsedTime,
          relativeType: type === 'time' || type === 'time_range' ? undefined : type,
          confidence,
        });
      } catch (error) {
        // Skip invalid dates silently
        console.warn('Failed to parse date:', originalText, error);
      }
    });
  });

  return dueDates;
}

/**
 * Main extraction function that combines all NLP operations
 */
export function performExtraction(cleanedText: string): ExtractionResult {
  const tasks = extractTasks(cleanedText);
  const dueDates = parseDueDates(cleanedText);
  const categories = [...new Set(tasks.map(t => t.category))];
  
  // Merge due dates with tasks where possible
  const tasksWithDates = mergeDueDatesWithTasks(tasks, dueDates);
  
  // Calculate overall confidence
  const totalConfidence = tasks.length > 0 
    ? tasks.reduce((sum, task) => sum + task.confidence, 0) / tasks.length
    : 0;

  return {
    tasks: tasksWithDates,
    dueDates,
    categories,
    confidence: totalConfidence,
  };
}

// Helper functions

function categorizeTask(taskText: string): string {
  const categories = [
    { keywords: ['work', 'job', 'meeting', 'presentation', 'report', 'deadline', 'project'], category: 'work' },
    { keywords: ['buy', 'shop', 'store', 'purchase', 'pick up', 'grocery'], category: 'shopping' },
    { keywords: ['doctor', 'dentist', 'exercise', 'gym', 'health', 'medication'], category: 'health' },
    { keywords: ['clean', 'wash', 'organize', 'fix', 'repair', 'home', 'house'], category: 'home' },
    { keywords: ['call', 'text', 'email', 'message', 'family', 'friend'], category: 'social' },
    { keywords: ['learn', 'study', 'read', 'course', 'tutorial', 'research'], category: 'learning' },
    { keywords: ['pay', 'bill', 'bank', 'money', 'budget', 'financial'], category: 'financial' },
  ];

  const lowerText = taskText.toLowerCase();
  
  for (const { keywords, category } of categories) {
    if (keywords.some(keyword => lowerText.includes(keyword))) {
      return category;
    }
  }
  
  return 'personal';
}

function calculateTaskConfidence(matchedText: string, sentence: string): number {
  let confidence = 0.5; // Base confidence
  
  // Higher confidence for explicit action verbs
  if (/\b(should|need to|must|remember to)\b/i.test(matchedText)) {
    confidence += 0.3;
  }
  
  // Higher confidence for imperative mood
  if (/^(call|buy|finish|send|pay)\b/i.test(matchedText)) {
    confidence += 0.2;
  }
  
  // Lower confidence for question-like sentences
  if (sentence.includes('?')) {
    confidence -= 0.2;
  }
  
  // Higher confidence for specific details
  if (/\b(today|tomorrow|this week|by \w+)\b/i.test(sentence)) {
    confidence += 0.1;
  }
  
  return Math.max(0.1, Math.min(1.0, confidence));
}

function generateTaskId(taskText: string, index: number): string {
  // Generate deterministic ID from task text and position
  const hash = taskText.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8);
  return `task_${hash}_${index}`;
}

function deduplicateTasks(tasks: Task[]): Task[] {
  const seen = new Set<string>();
  const unique: Task[] = [];
  
  for (const task of tasks) {
    const normalized = task.text.toLowerCase().trim();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      unique.push(task);
    }
  }
  
  return unique.sort((a, b) => b.confidence - a.confidence);
}

function parseSpecificDate(dateText: string, referenceDate: Date): string | undefined {
  try {
    // Handle MM/DD or MM/DD/YYYY format
    const numericMatch = dateText.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
    if (numericMatch) {
      const month = parseInt(numericMatch[1], 10);
      const day = parseInt(numericMatch[2], 10);
      let year = numericMatch[3] ? parseInt(numericMatch[3], 10) : referenceDate.getFullYear();
      
      if (year < 100) year += 2000; // Handle 2-digit years
      
      const date = new Date(year, month - 1, day);
      return date.toISOString().split('T')[0];
    }
    
    // Handle month name format
    const monthMatch = dateText.match(/(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
    if (monthMatch) {
      const monthNames = ['january', 'february', 'march', 'april', 'may', 'june',
                          'july', 'august', 'september', 'october', 'november', 'december'];
      const monthIndex = monthNames.indexOf(monthMatch[1].toLowerCase());
      const day = parseInt(monthMatch[2], 10);
      
      const date = new Date(referenceDate.getFullYear(), monthIndex, day);
      return date.toISOString().split('T')[0];
    }
    
    return undefined;
  } catch {
    return undefined;
  }
}

function parseTime(timeText: string): string | undefined {
  try {
    const timeMatch = timeText.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (timeMatch) {
      let hour = parseInt(timeMatch[1], 10);
      const minute = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3]?.toLowerCase();
      
      if (ampm === 'pm' && hour !== 12) hour += 12;
      if (ampm === 'am' && hour === 12) hour = 0;
      
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:00`;
    }
    
    // Handle general time ranges
    const timeRangeMap: Record<string, string> = {
      'morning': '09:00:00',
      'afternoon': '14:00:00',
      'evening': '18:00:00',
      'night': '20:00:00',
    };
    
    const lowerTime = timeText.toLowerCase();
    return timeRangeMap[lowerTime] || undefined;
  } catch {
    return undefined;
  }
}

function mergeDueDatesWithTasks(tasks: Task[], dueDates: DueDateInfo[]): Task[] {
  if (dueDates.length === 0) return tasks;
  
  return tasks.map(task => {
    // Find the most relevant due date for this task
    const relevantDate = dueDates.find(date => 
      date.confidence > 0.7 && (date.parsedDate || date.parsedTime)
    );
    
    if (relevantDate) {
      return {
        ...task,
        dueDate: relevantDate.parsedDate,
        dueTime: relevantDate.parsedTime,
      };
    }
    
    return task;
  });
}
