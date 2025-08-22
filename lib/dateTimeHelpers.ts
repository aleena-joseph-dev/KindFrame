/**
 * Date and Time Formatting Helpers for AI Breakdown Results
 */

export type TimeBlock = {
  iso?: string;
  date?: string;
  time?: string;
  tz?: string;
  when_text?: string;
};

/**
 * Format a time block into a human-readable string
 */
export function formatDateTime(tb?: TimeBlock): string {
  if (!tb) return '';
  
  // If we have ISO string, use it for precise formatting
  if (tb.iso) {
    try {
      const date = new Date(tb.iso);
      if (isNaN(date.getTime())) return '';
      
      const timeStr = timeFromISO(tb.iso);
      const dateStr = dateFromISO(tb.iso);
      
      if (timeStr && dateStr) {
        return timeStr + ' · ' + dateStr;
      } else if (timeStr) {
        return timeStr;
      } else if (dateStr) {
        return dateStr;
      }
    } catch (e) {
      console.warn('Failed to parse ISO date:', tb.iso);
    }
  }
  
  // Fallback to when_text if available
  if (tb.when_text) {
    return tb.when_text;
  }
  
  // Try to construct from date/time parts
  if (tb.date && tb.time) {
    return tb.time + ' · ' + tb.date;
  } else if (tb.date) {
    return tb.date;
  } else if (tb.time) {
    return tb.time;
  }
  
  return '';
}

/**
 * Extract time from ISO string in device locale
 */
export function timeFromISO(iso?: string): string | null {
  if (!iso) return null;
  
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return null;
    
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  } catch (e) {
    return null;
  }
}

/**
 * Extract date from ISO string in device locale
 */
export function dateFromISO(iso?: string): string | null {
  if (!iso) return null;
  
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return null;
    
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    }).format(date);
  } catch (e) {
    return null;
  }
}

/**
 * Check if a time block represents an all-day event
 */
export function isAllDay(tb?: TimeBlock): boolean {
  if (!tb?.iso) return false;
  
  try {
    const date = new Date(tb.iso);
    if (isNaN(date.getTime())) return false;
    
    // Check if time is midnight (00:00:00)
    return date.getHours() === 0 && 
           date.getMinutes() === 0 && 
           date.getSeconds() === 0;
  } catch (e) {
    return false;
  }
}

/**
 * Format relative time for reminders
 */
export function formatReminderTime(reminderIso?: string, leadMinutes?: number): string {
  if (!reminderIso) return '';
  
  if (leadMinutes) {
    return leadMinutes + 'm before';
  }
  
  try {
    const reminderDate = new Date(reminderIso);
    if (isNaN(reminderDate.getTime())) return '';
    
    return timeFromISO(reminderIso) || '';
  } catch (e) {
    return '';
  }
}

/**
 * Validate event times (end must be after start)
 */
export function validateEventTimes(start?: TimeBlock, end?: TimeBlock): string | null {
  if (!start?.iso || !end?.iso) return null;
  
  try {
    const startDate = new Date(start.iso);
    const endDate = new Date(end.iso);
    
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return 'Invalid date format';
    }
    
    if (endDate <= startDate) {
      return 'End time must be after start time';
    }
    
    return null;
  } catch (e) {
    return 'Invalid date format';
  }
}

/**
 * Validate reminder time (must be before due/start)
 */
export function validateReminderTime(reminderIso?: string, dueIso?: string): string | null {
  if (!reminderIso || !dueIso) return null;
  
  try {
    const reminderDate = new Date(reminderIso);
    const dueDate = new Date(dueIso);
    
    if (isNaN(reminderDate.getTime()) || isNaN(dueDate.getTime())) {
      return 'Invalid date format';
    }
    
    if (reminderDate >= dueDate) {
      return 'Reminder must be before due time';
    }
    
    return null;
  } catch (e) {
    return 'Invalid date format';
  }
}
