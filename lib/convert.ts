import { AnyItem, EventItem, TaskItem, TodoItem } from './types';

/**
 * Convert an item between different types (todo, task, event)
 * Handles field mapping and sets appropriate defaults
 */
export function convertItem(item: AnyItem, target: "todo" | "task" | "event"): AnyItem {
  if (target === "event") {
    // Convert from task/todo to event
    const date = (item as any).due?.date;
    const time = (item as any).due?.time;
    const tz = (item as any).due?.tz;
    const when_text = (item as any).due?.when_text;

    const start = { date, time, tz, when_text };

    // Set default reminder to 30m if missing
    const reminder = {
      ...(item as any).reminder,
      lead_minutes: (item as any).reminder?.lead_minutes ?? 30
    };

    const eventItem: EventItem = {
      ...item,
      type: 'event',
      start,
      reminder
    };

    return eventItem;
  }

  if (target === "task" || target === "todo") {
    // Convert from event to task/todo
    const date = (item as any).start?.date;
    const time = (item as any).start?.time;
    const tz = (item as any).start?.tz;
    const when_text = (item as any).start?.when_text;

    const due = { date, time, tz, when_text };

    // Preserve existing reminder if present
    const reminder = (item as any).reminder?.iso ? (item as any).reminder : undefined;

    if (target === "task") {
      const taskItem: TaskItem = {
        ...item,
        type: 'task',
        due,
        reminder
      };
      return taskItem;
    } else {
      const todoItem: TodoItem = {
        ...item,
        type: 'todo',
        due,
        reminder
      };
      return todoItem;
    }
  }

  return item;
}

/**
 * Get the display type for an item
 */
export function getDisplayType(item: AnyItem): string {
  switch (item.type) {
    case 'task': return 'TASK';
    case 'todo': return 'TODO';
    case 'event': return 'EVENT';
    default: return 'ITEM';
  }
}

/**
 * Get the appropriate time field for an item type
 */
export function getTimeField(item: AnyItem): { date?: string; time?: string; tz?: string } | null {
  if (item.type === 'event') {
    return item.start || null;
  } else {
    return item.due || null;
  }
}

/**
 * Set the appropriate time field for an item type
 */
export function setTimeField(item: AnyItem, field: 'date' | 'time', value: string): AnyItem {
  const updated = { ...item };

  if (item.type === 'event') {
    if (!updated.start) updated.start = {};
    (updated as EventItem).start![field] = value;
  } else if (item.type === 'task' || item.type === 'todo') {
    if (!updated.due) updated.due = {};
    (updated as TaskItem | TodoItem).due![field] = value;
  }

  return updated;
}

/**
 * Get category tag from item tags
 */
export function getCategoryTag(item: AnyItem): string | null {
  if (!item.tags || item.tags.length === 0) return null;

  // Look for Casual or Professional tags
  const categoryTag = item.tags.find(tag =>
    tag === 'Casual' || tag === 'Professional'
  );

  return categoryTag || null;
}

/**
 * Get domain tags (excluding category tags)
 */
export function getDomainTags(item: AnyItem): string[] {
  if (!item.tags || item.tags.length === 0) return [];

  // Filter out category tags
  return item.tags.filter(tag =>
    tag !== 'Casual' && tag !== 'Professional'
  );
}

/**
 * Check if item has a specific tag
 */
export function hasTag(item: AnyItem, tag: string): boolean {
  return item.tags?.some(t => t.toLowerCase() === tag.toLowerCase()) ?? false;
}

/**
 * Add tag to item if not already present
 */
export function addTag(item: AnyItem, tag: string): AnyItem {
  const tags = item.tags || [];
  if (!tags.some(t => t.toLowerCase() === tag.toLowerCase())) {
    return { ...item, tags: [...tags, tag] };
  }
  return item;
}

/**
 * Remove tag from item
 */
export function removeTag(item: AnyItem, tag: string): AnyItem {
  const tags = item.tags || [];
  const filteredTags = tags.filter(t => t.toLowerCase() !== tag.toLowerCase());
  return { ...item, tags: filteredTags };
}
