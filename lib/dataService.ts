import { supabase } from './supabase';

export interface DatabaseTask {
  id: string;
  board_id: string;
  title: string;
  description: string | null;
  status: 'todo' | 'in_progress' | 'done' | 'backlog' | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  due_date: string | null;
  position: number | null;
  tags: string[] | null;
  assignee_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DatabaseTodo {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  is_completed: boolean | null;
  due_date: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent' | null;
  category: 'personal' | 'work' | 'health' | 'shopping' | 'learning' | 'other' | null;
  tags: string[] | null;
  parent_todo_id: string | null;
  sync_source: string | null;
  external_id: string | null;
  completed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DatabaseEvent {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string;
  all_day: boolean | null;
  location: string | null;
  color: string | null;
  is_recurring: boolean | null;
  recurrence_rule: string | null;
  sync_source: string | null;
  external_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

/**
 * Fetch all kanban tasks for a user
 */
export async function fetchUserTasks(userId: string): Promise<DatabaseTask[]> {
  try {
    // First, get all boards for the user
    const { data: boards, error: boardsError } = await supabase
      .from('kanban_boards')
      .select('id')
      .eq('user_id', userId);

    if (boardsError) {
      console.error('Error fetching boards:', boardsError);
      return [];
    }

    if (!boards || boards.length === 0) {
      return [];
    }

    // Get all tasks from all boards
    const boardIds = boards.map(board => board.id);
    const { data: tasks, error: tasksError } = await supabase
      .from('kanban_cards')
      .select('*')
      .in('board_id', boardIds)
      .order('position', { ascending: true })
      .order('created_at', { ascending: false });

    if (tasksError) {
      console.error('Error fetching tasks:', tasksError);
      return [];
    }

    return tasks || [];
  } catch (error) {
    console.error('Error in fetchUserTasks:', error);
    return [];
  }
}

/**
 * Fetch all todos for a user
 */
export async function fetchUserTodos(userId: string): Promise<DatabaseTodo[]> {
  try {
    const { data: todos, error } = await supabase
      .from('todos')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching todos:', error);
      return [];
    }

    return todos || [];
  } catch (error) {
    console.error('Error in fetchUserTodos:', error);
    return [];
  }
}

/**
 * Fetch all calendar events for a user
 */
export async function fetchUserEvents(userId: string): Promise<DatabaseEvent[]> {
  try {
    const { data: events, error } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', userId)
      .order('start_time', { ascending: true });

    if (error) {
      console.error('Error fetching events:', error);
      return [];
    }

    return events || [];
  } catch (error) {
    console.error('Error in fetchUserEvents:', error);
    return [];
  }
}

/**
 * Update a todo's completion status
 */
export async function updateTodoCompletion(todoId: string, isCompleted: boolean): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('todos')
      .update({ 
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', todoId);

    if (error) {
      console.error('Error updating todo completion:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateTodoCompletion:', error);
    return false;
  }
}

/**
 * Update a task's status (move between columns)
 */
export async function updateTaskStatus(taskId: string, newStatus: DatabaseTask['status']): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('kanban_cards')
      .update({ 
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', taskId);

    if (error) {
      console.error('Error updating task status:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updateTaskStatus:', error);
    return false;
  }
}
