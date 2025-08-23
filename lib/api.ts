import { supabase } from './supabase';
import { EventItem, TaskItem, TimeBlock, TodoItem } from './types';

// API base URL - using Supabase Edge Functions
const API_BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://dlenuyofztbvhzmdfiek.supabase.co';

/**
 * Generic API call helper for Supabase Edge Functions
 */
async function apiCall<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  data?: any
): Promise<T> {
  try {
    const url = `${API_BASE_URL}/functions/v1${endpoint}`;
    
    // Get the current user session token
    const { data: { session } } = await supabase.auth.getSession();
    const authToken = session?.access_token;
    
    if (!authToken) {
      throw new Error('User not authenticated - please log in');
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    };

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API call failed: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`API call to ${endpoint} failed:`, error);
    throw error;
  }
}

/**
 * Convert TimeBlock to ISO string for database storage
 */
function timeBlockToISO(timeBlock?: TimeBlock): string | null {
  if (!timeBlock) return null;
  
  if (timeBlock.iso) return timeBlock.iso;
  
  if (timeBlock.date) {
    const timeStr = timeBlock.time || '00:00';
    return `${timeBlock.date}T${timeStr}:00.000Z`;
  }
  
  return null;
}

/**
 * Format task for database insertion
 */
function formatTaskForDB(task: TaskItem) {
  return {
    id: task.id,
    title: task.title,
    description: task.notes || '',
    priority: task.priority || 'normal',
    category: extractCategory(task.tags),
    tags: task.tags || [],
    due_date: timeBlockToISO(task.due),
  };
}

/**
 * Format todo for database insertion
 */
function formatTodoForDB(todo: TodoItem) {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.notes || '',
    priority: todo.priority || 'normal',
    category: extractCategory(todo.tags),
    tags: todo.tags || [],
    due_date: timeBlockToISO(todo.due),
    reminder: todo.reminder?.lead_minutes ? `${todo.reminder.lead_minutes}` : null,
  };
}

/**
 * Format event for database insertion
 */
function formatEventForDB(event: EventItem) {
  const startTime = timeBlockToISO(event.start) || new Date().toISOString();
  const endTime = timeBlockToISO(event.end) || startTime;
  
  return {
    id: event.id,
    title: event.title,
    description: event.notes || '',
    start_time: startTime,
    end_time: endTime,
    location: event.location || '',
    category: extractCategory(event.tags),
    tags: event.tags || [],
    reminder: event.reminder?.lead_minutes ? `${event.reminder.lead_minutes}` : null,
  };
}

/**
 * Extract category from tags - use first non-priority tag as category
 */
function extractCategory(tags?: string[]): string {
  if (!tags || tags.length === 0) return 'general';
  
  // Filter out priority and domain tags to find a category
  const categoryTags = tags.filter(tag => 
    !['low', 'normal', 'high', 'Casual', 'Professional'].includes(tag)
  );
  
  return categoryTags[0] || 'general';
}

/**
 * Save a single task to the database via Edge Function
 */
export async function saveTask(task: TaskItem): Promise<void> {
  try {
    const formattedTask = formatTaskForDB(task);
    const result = await apiCall('/save-tasks', 'POST', { tasks: [formattedTask] });
    console.log('✅ Task saved successfully:', task.title, result);
  } catch (error) {
    console.error('❌ Failed to save task:', error);
    throw error;
  }
}

/**
 * Save a single todo to the database via Edge Function
 */
export async function saveTodo(todo: TodoItem): Promise<void> {
  try {
    const formattedTodo = formatTodoForDB(todo);
    const result = await apiCall('/save-todos', 'POST', { todos: [formattedTodo] });
    console.log('✅ Todo saved successfully:', todo.title, result);
  } catch (error) {
    console.error('❌ Failed to save todo:', error);
    throw error;
  }
}

/**
 * Save a single event to the database via Edge Function
 */
export async function saveEvent(event: EventItem): Promise<void> {
  try {
    const formattedEvent = formatEventForDB(event);
    const result = await apiCall('/save-events', 'POST', { events: [formattedEvent] });
    console.log('✅ Event saved successfully:', event.title, result);
  } catch (error) {
    console.error('❌ Failed to save event:', error);
    throw error;
  }
}

/**
 * Batch save multiple items of the same type via Edge Functions
 */
export async function batchSaveTasks(tasks: TaskItem[]): Promise<void> {
  try {
    const formattedTasks = tasks.map(formatTaskForDB);
    const result = await apiCall('/save-tasks', 'POST', { tasks: formattedTasks });
    console.log(`✅ Batch saved ${tasks.length} tasks successfully:`, result);
  } catch (error) {
    console.error('❌ Failed to batch save tasks:', error);
    throw error;
  }
}

export async function batchSaveTodos(todos: TodoItem[]): Promise<void> {
  try {
    const formattedTodos = todos.map(formatTodoForDB);
    const result = await apiCall('/save-todos', 'POST', { todos: formattedTodos });
    console.log(`✅ Batch saved ${todos.length} todos successfully:`, result);
  } catch (error) {
    console.error('❌ Failed to batch save todos:', error);
    throw error;
  }
}

export async function batchSaveEvents(events: EventItem[]): Promise<void> {
  try {
    const formattedEvents = events.map(formatEventForDB);
    const result = await apiCall('/save-events', 'POST', { events: formattedEvents });
    console.log(`✅ Batch saved ${events.length} events successfully:`, result);
  } catch (error) {
    console.error('❌ Failed to batch save events:', error);
    throw error;
  }
}

/**
 * Update existing items - using the same Edge Functions
 */
export async function updateTask(taskId: string, task: Partial<TaskItem>): Promise<void> {
  try {
    // For updates, we'll use the same save function with the existing ID
    const updatedTask = { ...task, id: taskId };
    await saveTask(updatedTask as TaskItem);
    console.log('✅ Task updated successfully:', taskId);
  } catch (error) {
    console.error('❌ Failed to update task:', error);
    throw error;
  }
}

export async function updateTodo(todoId: string, todo: Partial<TodoItem>): Promise<void> {
  try {
    const updatedTodo = { ...todo, id: todoId };
    await saveTodo(updatedTodo as TodoItem);
    console.log('✅ Todo updated successfully:', todoId);
  } catch (error) {
    console.error('❌ Failed to update todo:', error);
    throw error;
  }
}

export async function updateEvent(eventId: string, event: Partial<EventItem>): Promise<void> {
  try {
    const updatedEvent = { ...event, id: eventId };
    await saveEvent(updatedEvent as EventItem);
    console.log('✅ Event updated successfully:', eventId);
  } catch (error) {
    console.error('❌ Failed to update event:', error);
    throw error;
  }
}

/**
 * Delete items - Note: These would need separate Edge Functions for actual deletion
 * For now, we'll mark them as archived or handle deletion differently
 */
export async function deleteTask(taskId: string): Promise<void> {
  try {
    console.log('⚠️ Delete not implemented yet - would delete task:', taskId);
    // TODO: Implement actual deletion via Edge Function
  } catch (error) {
    console.error('❌ Failed to delete task:', error);
    throw error;
  }
}

export async function deleteTodo(todoId: string): Promise<void> {
  try {
    console.log('⚠️ Delete not implemented yet - would delete todo:', todoId);
    // TODO: Implement actual deletion via Edge Function
  } catch (error) {
    console.error('❌ Failed to delete todo:', error);
    throw error;
  }
}

export async function deleteEvent(eventId: string): Promise<void> {
  try {
    console.log('⚠️ Delete not implemented yet - would delete event:', eventId);
    // TODO: Implement actual deletion via Edge Function
  } catch (error) {
    console.error('❌ Failed to delete event:', error);
    throw error;
  }
}
