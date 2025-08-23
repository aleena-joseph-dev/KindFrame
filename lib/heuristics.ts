/**
 * Heuristics for AI breakdown items
 * Determines types, default dates, and reminders based on content analysis
 */

import { formatDate, formatTime, parseUserTimeInput, resolveRelativeDate, resolveRelativeTime, toISO } from './datetime';

export interface AIItem {
  title: string;
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  due?: { iso?: string; date?: string; time?: string; tz?: string; when_text?: string };
  reminder?: { iso?: string; lead_minutes?: number };
  start?: { iso?: string; date?: string; time?: string; tz?: string; when_text?: string };
  end?: { iso?: string; date?: string; time?: string; tz?: string; when_text?: string };
  all_day?: boolean;
  location?: string;
  attendees?: string[];
  type?: 'task' | 'todo' | 'event';
}

export interface DerivedUI {
  // Date and time information
  defaultDate: string | null;
  dateLabel: string | null;
  timeLabel: string | null;
  allDay: boolean;
  
  // Priority and reminder
  priorityLabel: string | null;
  reminderLabel: string | null;
  
  // Location
  locationLabel: string | null;
  
  // Computed values
  computedDate: Date | null;
  computedTime: Date | null;
}

/**
 * Classifies an item based on its title and content
 */
export function deriveType(item: AIItem): 'TASK' | 'TODO' | 'EVENT' {
  const title = item.title.toLowerCase();
  
  // Event keywords (always events)
  const eventKeywords = [
    'appointment', 'meeting', 'interview', 'standup', 'stand-up', 'review',
    'flight', 'train', 'bus', 'ceremony', 'wedding', 'party', 'conference',
    'presentation', 'demo', 'workshop', 'seminar', 'webinar'
  ];
  
  if (eventKeywords.some(keyword => title.includes(keyword))) {
    return 'EVENT';
  }
  
  // Todo keywords (casual/informal)
  const todoKeywords = [
    'buy', 'purchase', 'get', 'pick up', 'pickup', 'go to', 'call', 'meet',
    'visit', 'drop by', 'stop by', 'check', 'look', 'find', 'search'
  ];
  
  if (todoKeywords.some(keyword => title.includes(keyword))) {
    return 'TODO';
  }
  
  // Task keywords (formal/serious/multi-step)
  const taskKeywords = [
    'complete', 'finish', 'submit', 'prepare', 'draft', 'report', 'invoice',
    'renew', 'update', 'create', 'build', 'develop', 'design', 'plan',
    'organize', 'review', 'analyze', 'research', 'study', 'learn'
  ];
  
  if (taskKeywords.some(keyword => title.includes(keyword))) {
    return 'TASK';
  }
  
  // Default to TODO for casual items
  return 'TODO';
}

/**
 * Sets default dates based on item type and content
 */
export function defaultDateFor(item: AIItem, type: 'TASK' | 'TODO' | 'EVENT'): string | null {
  // If item already has a date, use it
  if (item.due?.date || item.due?.iso || item.start?.date || item.start?.iso) {
    return item.due?.date || item.due?.iso?.split('T')[0] || item.start?.date || item.start?.iso?.split('T')[0];
  }
  
  // Check for relative time expressions
  const title = item.title.toLowerCase();
  const relativeTimeMatch = title.match(/(?:in|after)\s+(\d+)\s+(minute|hour|day|week)s?/);
  
  if (relativeTimeMatch) {
    const amount = parseInt(relativeTimeMatch[1]);
    const unit = relativeTimeMatch[2];
    
    if (unit === 'minute' || unit === 'hour') {
      // For minutes/hours, default to today
      return new Date().toISOString().split('T')[0];
    } else if (unit === 'day') {
      // For days, calculate relative date
      const date = new Date();
      date.setDate(date.getDate() + amount);
      return date.toISOString().split('T')[0];
    } else if (unit === 'week') {
      // For weeks, calculate relative date
      const date = new Date();
      date.setDate(date.getDate() + (amount * 7));
      return date.toISOString().split('T')[0];
    }
  }
  
  // Check for natural language dates
  if (title.includes('tomorrow')) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }
  
  if (title.includes('next week')) {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  }
  
  // Default dates by type
  switch (type) {
    case 'EVENT':
    case 'TODO':
      // Events and todos default to today if they have time but no date
      if (item.start?.time || item.due?.time) {
        return new Date().toISOString().split('T')[0];
      }
      return new Date().toISOString().split('T')[0];
    case 'TASK':
      // Tasks don't get default dates unless specified
      return null;
    default:
      return null;
  }
}

/**
 * Sets default reminders based on item type and timing
 */
export function defaultReminderFor(item: AIItem, type: 'TASK' | 'TODO' | 'EVENT'): { iso?: string; lead_minutes?: number } | null {
  // If item already has a reminder, use it
  if (item.reminder?.iso || item.reminder?.lead_minutes) {
    return item.reminder;
  }
  
  // Check for relative time expressions
  const title = item.title.toLowerCase();
  const relativeTimeMatch = title.match(/(?:in|after)\s+(\d+)\s+(minute|hour)s?/);
  
  if (relativeTimeMatch) {
    const amount = parseInt(relativeTimeMatch[1]);
    const unit = relativeTimeMatch[2];
    
    if (unit === 'minute') {
      // For "after X minutes", set reminder at that exact time
      const reminderTime = new Date();
      reminderTime.setMinutes(reminderTime.getMinutes() + amount);
      return { iso: reminderTime.toISOString() };
    } else if (unit === 'hour') {
      // For "after X hours", set reminder at that exact time
      const reminderTime = new Date();
      reminderTime.setHours(reminderTime.getHours() + amount);
      return { iso: reminderTime.toISOString() };
    }
  }
  
  // Default reminders by type
  switch (type) {
    case 'EVENT':
      // Events with time get 30-minute prior reminder
      if (item.start?.time || item.start?.iso) {
        return { lead_minutes: 30 };
      }
      return null;
    case 'TASK':
    case 'TODO':
      // Tasks and todos don't get default reminders unless relative time
      return null;
    default:
      return null;
  }
}

/**
 * Main hook that combines all heuristics and formats UI-ready metadata
 */
export function useDerivedUI(item: AIItem): DerivedUI {
  // Derive the type if not provided
  const type = item.type ? item.type.toUpperCase() as 'TASK' | 'TODO' | 'EVENT' : deriveType(item);
  
  // Get default date
  const defaultDate = defaultDateFor(item, type);
  
  // Get default reminder
  const defaultReminder = defaultReminderFor(item, type);
  
  // Format date label
  const dateLabel = (() => {
    if (item.due?.date || item.due?.iso) {
      const date = item.due.date || item.due.iso?.split('T')[0];
      return date ? formatDate(date) : null;
    }
    if (item.start?.date || item.start?.iso) {
      const date = item.start.date || item.start.iso?.split('T')[0];
      return date ? formatDate(date) : null;
    }
    if (defaultDate) {
      return formatDate(defaultDate);
    }
    return null;
  })();
  
  // Format time label
  const timeLabel = (() => {
    if (item.due?.time) {
      return formatTime(item.due.time);
    }
    if (item.start?.time) {
      return formatTime(item.start.time);
    }
    if (item.start?.iso) {
      return formatTime(item.start.iso);
    }
    return null;
  })();
  
  // Format priority label
  const priorityLabel = item.priority ? 
    item.priority.charAt(0).toUpperCase() + item.priority.slice(1) : null;
  
  // Format reminder label
  const reminderLabel = (() => {
    if (defaultReminder?.lead_minutes) {
      return `${defaultReminder.lead_minutes}m before`;
    }
    if (defaultReminder?.iso) {
      const reminderTime = new Date(defaultReminder.iso);
      const now = new Date();
      const diffMs = reminderTime.getTime() - now.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));
      
      if (diffMins > 0) {
        return `in ${diffMins}m`;
      } else {
        return 'now';
      }
    }
    return null;
  })();
  
  // Format location label
  const locationLabel = item.location || null;
  
  // Check if all-day
  const allDay = item.all_day || false;
  
  // Compute actual dates for pickers
  const computedDate = defaultDate ? new Date(defaultDate) : null;
  const computedTime = (() => {
    if (item.due?.time) {
      const baseDate = computedDate || new Date();
      const [hours, minutes] = item.due.time.split(':').map(Number);
      baseDate.setHours(hours, minutes, 0, 0);
      return baseDate;
    }
    if (item.start?.time) {
      const baseDate = computedDate || new Date();
      const [hours, minutes] = item.start.time.split(':').map(Number);
      baseDate.setHours(hours, minutes, 0, 0);
      return baseDate;
    }
    if (item.start?.iso) {
      return new Date(item.start.iso);
    }
    return null;
  })();
  
  return {
    defaultDate,
    dateLabel,
    timeLabel,
    allDay,
    priorityLabel,
    reminderLabel,
    locationLabel,
    computedDate,
    computedTime,
  };
}
