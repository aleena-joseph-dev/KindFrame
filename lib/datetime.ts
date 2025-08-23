/**
 * Comprehensive datetime utilities for AI breakdown results
 * Handles formatting, parsing, and relative date/time resolution
 */

export interface TimeBlock {
  iso?: string;
  date?: string;
  time?: string;
  display_time?: string; // 12-hour format for user-friendly display
  tz?: string;
  when_text?: string;
}

export interface DateTimeMeta {
  dateLabel: string | null;
  timeLabel: string | null;
  priorityLabel: string | null;
  reminderLabel: string | null;
  locationLabel: string | null;
  hasTime: boolean;
  hasDate: boolean;
  allDay: boolean;
}

/**
 * Get today's date in specified timezone as YYYY-MM-DD
 */
export function todayInTZ(tz: string): string {
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { 
    timeZone: tz, 
    year: "numeric", 
    month: "2-digit", 
    day: "2-digit" 
  }).formatToParts(now);
  
  const y = parts.find(p => p.type === "year")?.value ?? "1970";
  const m = parts.find(p => p.type === "month")?.value ?? "01";
  const d = parts.find(p => p.type === "day")?.value ?? "01";
  
  return `${y}-${m}-${d}`;
}

/**
 * Add minutes to a date
 */
export function addMinutes(date: Date, mins: number): Date {
  return new Date(date.getTime() + mins * 60000);
}

/**
 * Format a date from ISO string to human-readable format
 * Returns: "Thu, 17 Jul" or null if invalid
 */
export function formatDate(isoOrYmd?: string, tz?: string): string | null {
  if (!isoOrYmd) return null;
  
  try {
    let date: Date;
    
    // Handle YYYY-MM-DD format
    if (isoOrYmd.match(/^\d{4}-\d{2}-\d{2}$/)) {
      date = new Date(isoOrYmd + 'T00:00:00');
    } else {
      date = new Date(isoOrYmd);
    }
    
    if (isNaN(date.getTime())) return null;
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Format time from HH:mm to human-readable format
 * Returns: "10:00 AM" or null if invalid
 */
export function formatTime(hhmm?: string): string | null {
  if (!hhmm) return null;
  
  try {
    const [hour, minute] = hhmm.split(':').map(Number);
    if (isNaN(hour) || isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch {
    return null;
  }
}

/**
 * Concretize relative time expressions to concrete date/time
 * UI-only computation - does not persist ISO
 */
export function concretizeRelative(tb: TimeBlock | undefined, tz: string): { date?: string; time?: string } | null {
  if (!tb?.when_text) return null;
  
  const whenText = tb.when_text.toLowerCase();
  const now = new Date();
  
  // Handle "after X minutes" patterns
  const afterMatch = whenText.match(/after\s+(\d+)\s+minutes?/);
  if (afterMatch) {
    const minutes = parseInt(afterMatch[1]);
    const futureTime = addMinutes(now, minutes);
    return {
      date: todayInTZ(tz),
      time: futureTime.toTimeString().slice(0, 5) // HH:mm
    };
  }
  
  // Handle "in X hours" patterns
  const inHoursMatch = whenText.match(/in\s+(\d+)\s+hours?/);
  if (inHoursMatch) {
    const hours = parseInt(inHoursMatch[1]);
    const futureTime = addMinutes(now, hours * 60);
    return {
      date: todayInTZ(tz),
      time: futureTime.toTimeString().slice(0, 5) // HH:mm
    };
  }
  
  // Handle "tomorrow" patterns
  if (whenText.includes('tomorrow')) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Extract time if present (e.g., "tomorrow 10am")
    const timeMatch = whenText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const isPM = timeMatch[3] === 'pm';
      
      const adjustedHour = hour === 12 ? (isPM ? 12 : 0) : (isPM ? hour + 12 : hour);
      const timeString = `${adjustedHour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      return {
        date: tomorrow.toISOString().split('T')[0],
        time: timeString
      };
    }
    
    return {
      date: tomorrow.toISOString().split('T')[0]
    };
  }
  
  return null;
}

/**
 * Ensure Todo items have today's date if missing
 */
export function ensureTodoDateTodayIfMissing(item: any, tz: string) {
  if (!item.due) {
    item.due = { date: todayInTZ(tz), tz };
  } else {
    if (!item.due.date) item.due.date = todayInTZ(tz);
    if (!item.due.tz) item.due.tz = tz;
  }
}

/**
 * Parse user time input (e.g., "10am", "14:30", "7 pm")
 * Returns Date object or null if invalid
 */
export function parseUserTimeInput(input: string, baseDate: Date): Date | null {
  if (!input || !baseDate) return null;
  
  const cleanInput = input.trim().toLowerCase();
  
  try {
    // Handle 12-hour format: "10am", "7 pm", "2:30pm"
    const timeMatch = cleanInput.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
      const isPM = timeMatch[3] === 'pm';
      
      if (hour < 1 || hour > 12 || minute < 0 || minute > 59) return null;
      
      const adjustedHour = hour === 12 ? (isPM ? 12 : 0) : (isPM ? hour + 12 : hour);
      
      const result = new Date(baseDate);
      result.setHours(adjustedHour, minute, 0, 0);
      return result;
    }
    
    // Handle 24-hour format: "14:30", "09:15"
    const time24Match = cleanInput.match(/^(\d{1,2}):(\d{2})$/);
    if (time24Match) {
      const hour = parseInt(time24Match[1]);
      const minute = parseInt(time24Match[2]);
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
      
      const result = new Date(baseDate);
      result.setHours(hour, minute, 0, 0);
      return result;
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve relative date from text (e.g., "tomorrow", "next Wednesday")
 * Returns ISO date string or null if cannot resolve
 */
export function resolveRelativeDate(whenText?: string, now: Date = new Date(), tz: string = 'Asia/Kolkata'): string | null {
  if (!whenText) return null;
  
  const text = whenText.toLowerCase().trim();
  const today = new Date(now);
  
  try {
    // Handle "today"
    if (text === 'today') {
      return today.toISOString().split('T')[0];
    }
    
    // Handle "tomorrow"
    if (text === 'tomorrow') {
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }
    
    // Handle "next [day]"
    const nextDayMatch = text.match(/^next\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
    if (nextDayMatch) {
      const dayName = nextDayMatch[1];
      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
      
      if (dayIndex !== -1) {
        const targetDate = new Date(today);
        const currentDay = targetDate.getDay();
        let daysToAdd = (dayIndex - currentDay + 7) % 7;
        if (daysToAdd === 0) daysToAdd = 7; // Next week if today is the target day
        
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        return targetDate.toISOString().split('T')[0];
      }
    }
    
    // Handle specific day names
    const dayMatch = text.match(/^(monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/);
    if (dayMatch) {
      const dayName = dayMatch[1];
      const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
      
      if (dayIndex !== -1) {
        const targetDate = new Date(today);
        const currentDay = targetDate.getDay();
        let daysToAdd = (dayIndex - currentDay + 7) % 7;
        
        targetDate.setDate(targetDate.getDate() + daysToAdd);
        return targetDate.toISOString().split('T')[0];
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Resolve relative time from text (e.g., "after 30 minutes", "in 2 hours")
 * Returns ISO datetime string for today or null if cannot resolve
 */
export function resolveRelativeTime(whenText?: string, now: Date = new Date(), tz: string = 'Asia/Kolkata'): string | null {
  if (!whenText) return null;
  
  const text = whenText.toLowerCase().trim();
  const today = new Date(now);
  
  try {
    // Handle "after X minutes"
    const afterMinutesMatch = text.match(/^after\s+(\d+)\s+minutes?$/);
    if (afterMinutesMatch) {
      const minutes = parseInt(afterMinutesMatch[1]);
      const result = new Date(today);
      result.setMinutes(result.getMinutes() + minutes);
      return result.toISOString();
    }
    
    // Handle "in X minutes"
    const inMinutesMatch = text.match(/^in\s+(\d+)\s+minutes?$/);
    if (inMinutesMatch) {
      const minutes = parseInt(inMinutesMatch[1]);
      const result = new Date(today);
      result.setMinutes(result.getMinutes() + minutes);
      return result.toISOString();
    }
    
    // Handle "after X hours"
    const afterHoursMatch = text.match(/^after\s+(\d+)\s+hours?$/);
    if (afterHoursMatch) {
      const hours = parseInt(afterHoursMatch[1]);
      const result = new Date(today);
      result.setHours(result.getHours() + hours);
      return result.toISOString();
    }
    
    // Handle "in X hours"
    const inHoursMatch = text.match(/^in\s+(\d+)\s+hours?$/);
    if (inHoursMatch) {
      const hours = parseInt(inHoursMatch[1]);
      const result = new Date(today);
      result.setHours(result.getHours() + hours);
      return result.toISOString();
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Convert Date to ISO string
 */
export function toISO(date: Date): string {
  return date.toISOString();
}

/**
 * Check if a date is today
 */
export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

/**
 * Check if a date is tomorrow
 */
export function isTomorrow(date: Date): boolean {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return date.toDateString() === tomorrow.toDateString();
}

/**
 * Get relative date label (Today, Tomorrow, or formatted date)
 */
export function getRelativeDateLabel(iso?: string): string {
  if (!iso) return 'Date?';
  
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return 'Date?';
    
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    
    return formatDate(iso) || 'Date?';
  } catch {
    return 'Date?';
  }
}

/**
 * Get relative time label (e.g., "in 30 minutes", "tomorrow")
 */
export function getRelativeTimeLabel(whenText?: string): string | null {
  if (!whenText) return null;

  const text = whenText.toLowerCase();

  if (text.includes('after') && text.includes('minutes')) {
    const match = text.match(/after\s+(\d+)\s+minutes?/);
    if (match) {
      const mins = parseInt(match[1]);
      if (mins < 60) {
        return `in ${mins} min`;
      } else {
        const hours = Math.floor(mins / 60);
        return `in ${hours}h`;
      }
    }
  }

  if (text.includes('tomorrow')) {
    return 'tomorrow';
  }

  if (text.includes('today')) {
    return 'today';
  }

  return whenText;
}

/**
 * Get next occurrence of a specific day of the week
 * e.g., "next Monday" -> date of next Monday
 */
export function getNextDayOfWeek(targetDay: string, tz: string): string {
  const dayMap: { [key: string]: number } = {
    'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3,
    'thursday': 4, 'friday': 5, 'saturday': 6
  };

  const targetDayNum = dayMap[targetDay.toLowerCase()];
  if (targetDayNum === undefined) return todayInTZ(tz);

  const now = new Date();
  const currentDay = now.getDay();
  let daysToAdd = targetDayNum - currentDay;

  if (daysToAdd <= 0) {
    daysToAdd = daysToAdd + 7; // Next week if today is the target day
  }

  const nextDate = new Date(now);
  nextDate.setDate(now.getDate() + daysToAdd);

  return nextDate.toISOString().split('T')[0];
}
