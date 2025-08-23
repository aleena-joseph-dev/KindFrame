import { AnyItem, TaskItem, TodoItem, EventItem } from './types';
import { concretizeRelative, todayInTZ } from './datetime';
import { batchSaveTasks, batchSaveTodos, batchSaveEvents } from './api';

export async function saveItems(items: AnyItem[]): Promise<void> {
  if (items.length === 0) {
    console.log('💾 Persist: No items to save');
    return;
  }

  console.log('💾 Persist: Saving', items.length, 'items');

  // Group items by type for efficient saving
  const tasks: TaskItem[] = [];
  const todos: TodoItem[] = [];
  const events: EventItem[] = [];

  items.forEach(item => {
    const processed = processItemForSave(item);
    
    if (processed.type === 'task') {
      tasks.push(processed as TaskItem);
    } else if (processed.type === 'todo') {
      todos.push(processed as TodoItem);
    } else if (processed.type === 'event') {
      events.push(processed as EventItem);
    }
  });

  // Save each group using batch API calls
  const promises: Promise<void>[] = [];

  if (tasks.length > 0) {
    promises.push(batchSaveTasks(tasks));
  }
  if (todos.length > 0) {
    promises.push(batchSaveTodos(todos));
  }
  if (events.length > 0) {
    promises.push(batchSaveEvents(events));
  }

  // Wait for all saves to complete
  await Promise.all(promises);
  console.log('💾 Persist: Successfully saved all items');
}

/**
 * Process item for saving - apply UI-only computed values
 */
function processItemForSave(item: AnyItem): AnyItem {
  const processed = { ...item };

  // Handle relative time expressions for events
  if (processed.type === 'event' && processed.start?.when_text) {
    const eventItem = processed as EventItem;
    const concrete = concretizeRelative(eventItem.start, eventItem.start.tz || 'Asia/Kolkata');
    
    if (concrete) {
      if (concrete.date && !eventItem.start.date) {
        eventItem.start.date = concrete.date;
      }
      if (concrete.time && !eventItem.start.time) {
        eventItem.start.time = concrete.time;
      }
    }

    // Ensure event has a date if it has time
    if (eventItem.start?.time && !eventItem.start?.date) {
      eventItem.start.date = todayInTZ(eventItem.start.tz || 'Asia/Kolkata');
    }

    // Set default reminder for events if missing
    if (!eventItem.reminder?.lead_minutes && !eventItem.reminder?.iso) {
      eventItem.reminder = {
        lead_minutes: 30
      };
    }
  }

  // Handle relative time expressions for tasks/todos
  if ((processed.type === 'task' || processed.type === 'todo') && processed.due?.when_text) {
    const taskTodoItem = processed as TaskItem | TodoItem;
    const concrete = concretizeRelative(taskTodoItem.due, taskTodoItem.due.tz || 'Asia/Kolkata');
    
    if (concrete) {
      if (concrete.date && !taskTodoItem.due.date) {
        taskTodoItem.due.date = concrete.date;
      }
      if (concrete.time && !taskTodoItem.due.time) {
        taskTodoItem.due.time = concrete.time;
      }
    }
  }

  // Ensure todos have today's date if missing
  if (processed.type === 'todo' && (!processed.due?.date || processed.due?.date === '')) {
    const todoItem = processed as TodoItem;
    todoItem.due = {
      ...todoItem.due,
      date: todayInTZ(todoItem.due?.tz || 'Asia/Kolkata'),
      tz: todoItem.due?.tz || 'Asia/Kolkata'
    };
  }

  return processed;
}

/**
 * Generate a unique client ID for an item
 */
export function generateClientId(): string {
  return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Check if an item has been modified and needs saving
 */
export function isItemDirty(item: AnyItem): boolean {
  return !!(item as any)._isDirty;
}

/**
 * Mark an item as dirty (needs saving)
 */
export function markItemDirty(item: AnyItem): AnyItem {
  return { ...item, _isDirty: true } as any;
}

/**
 * Mark an item as clean (saved)
 */
export function markItemClean(item: AnyItem): AnyItem {
  const { _isDirty, ...cleanItem } = item as any;
  return cleanItem;
}
