// Enhanced data model for AI Breakdown results
// Must match server-side schemas

export type TimeBlock = {
  iso?: string;        // optional
  date?: string;       // "YYYY-MM-DD"
  time?: string;       // "HH:mm" (24h)
  tz?: string;         // e.g., "Asia/Kolkata"
  when_text?: string;  // e.g., "after 30 minutes", "tomorrow 10am"
};

export type BaseItem = {
  id?: string;                 // client temp id
  title: string;
  notes?: string;
  tags?: string[];             // includes "Casual" or "Professional" + domains (Work, Health, etc.)
  priority?: "low"|"normal"|"high";
};

export type TaskItem = BaseItem & { 
  type: "task";  
  due?: TimeBlock; 
  reminder?: { iso?: string; lead_minutes?: number } 
};

export type TodoItem = BaseItem & { 
  type: "todo";  
  due?: TimeBlock; 
  reminder?: { iso?: string; lead_minutes?: number } 
};

export type EventItem = BaseItem & { 
  type: "event"; 
  start?: TimeBlock; 
  end?: TimeBlock; 
  all_day?: boolean; 
  location?: string; 
  attendees?: string[]; 
  reminder?: { iso?: string; lead_minutes?: number } 
};

export type AnyItem = TaskItem | TodoItem | EventItem;

// Legacy compatibility - keep existing AIResultItem for now
export interface AIResultItem {
  title: string;
  notes?: string;
  tags?: string[];
  priority?: 'low' | 'medium' | 'high';
  due?: TimeBlock;
  reminder?: { iso?: string; lead_minutes?: number };
  start?: TimeBlock;
  end?: TimeBlock;
  all_day?: boolean;
  location?: string;
  attendees?: string[];
  type?: 'task' | 'todo' | 'event';
  confidence?: number;
}

// Conversion helpers
export function isTaskItem(item: AnyItem): item is TaskItem {
  return item.type === 'task';
}

export function isTodoItem(item: AnyItem): item is TodoItem {
  return item.type === 'todo';
}

export function isEventItem(item: AnyItem): item is EventItem {
  return item.type === 'event';
}

// Legacy compatibility - convert AIResultItem to AnyItem
export function convertLegacyItem(item: AIResultItem): AnyItem {
  if (item.type === 'task') {
    return {
      id: (item as any).id || generateClientId(),
      title: item.title,
      notes: item.notes,
      tags: item.tags,
      priority: item.priority === 'medium' ? 'normal' : item.priority,
      type: 'task',
      due: item.due,
      reminder: item.reminder
    } as TaskItem;
  } else if (item.type === 'event') {
    return {
      id: (item as any).id || generateClientId(),
      title: item.title,
      notes: item.notes,
      tags: item.tags,
      priority: item.priority === 'medium' ? 'normal' : item.priority,
      type: 'event',
      start: item.start,
      end: item.end,
      all_day: item.all_day,
      location: item.location,
      attendees: item.attendees,
      reminder: item.reminder
    } as EventItem;
  } else {
    return {
      id: (item as any).id || generateClientId(),
      title: item.title,
      notes: item.notes,
      tags: item.tags,
      priority: item.priority === 'medium' ? 'normal' : item.priority,
      type: 'todo',
      due: item.due,
      reminder: item.reminder
    } as TodoItem;
  }
}

// Helper function to generate client IDs
function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
