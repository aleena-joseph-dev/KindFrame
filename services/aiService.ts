// AI prompt for task breakdown
export const TASK_BREAKDOWN_PROMPT = `You are a task breakdown assistant.

Your job is to take a casual, natural language input describing what someone wants to do and turn it into a clean, actionable to-do list.

Follow these rules:
1. Rewrite each task as a short action phrase starting with a verb (e.g., "Finish poster", "Pick up prescription", "Email landlord").
2. Do NOT copy original phrases if they don't start with a verb—rephrase them as actions.
3. Do not output vague items like "That Canva poster"—rephrase as clear actions (e.g., "Finish the Canva poster").
4. Each task must stand alone as a to-do item—no nested or grouped items.
5. Include optional tasks, but mark them clearly as optional (e.g., "Take a walk (optional)").

Output only the final to-do list—no explanations or commentary.

Recheck the output to see if it is a valid task and the phrase should make sense as a task that has to be done, if not the rephrase it.`;

interface TodoItem {
  id: string;
  title: string;
  completed: boolean;
  priority?: 'low' | 'medium' | 'high';
  createdAt: Date;
}

function generateUniqueId(prefix = 'ai') {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
}

export class AIService {
  static async generateTodoList(text: string): Promise<TodoItem[]> {
    await new Promise(resolve => setTimeout(resolve, 1000));
    let taskId = 1;
    const tasks: TodoItem[] = [];
    const extractedTasks = this.extractTasksFromText(text);
    for (const { task, priority } of extractedTasks) {
      tasks.push({
        id: generateUniqueId('ai'),
        title: task,
        completed: false,
        priority,
        createdAt: new Date(),
      });
    }
    return tasks;
  }

  // Extracts tasks as per the breakdown prompt
  private static extractTasksFromText(text: string): { task: string; priority: 'low' | 'medium' }[] {
    // Split by conjunctions and punctuation
    const conjunctions = [' and ', ' but ', ' plus ', ' as well as ', ' also ', ' along with ', ','];
    let parts = [text];
    for (const conj of conjunctions) {
      const newParts: string[] = [];
      for (const part of parts) {
        newParts.push(...part.split(conj));
      }
      parts = newParts;
    }
    // Remove empty and trim
    parts = parts.map(p => p.trim()).filter(Boolean);

    // Heuristics for optional/casual/low-priority
    const optionalIndicators = [
      'maybe', 'if I feel', 'if possible', 'if there’s time', 'if I can', 'if I want', 'if up to it', 'if I have time', 'if I feel like it', 'possibly', 'might', 'could', 'optional'
    ];
    const result: { task: string; priority: 'low' | 'medium' }[] = [];
    for (let part of parts) {
      if (!part) continue;
      let priority: 'low' | 'medium' = 'medium';
      let task = part;
      // Mark optional/casual
      for (const opt of optionalIndicators) {
        if (task.toLowerCase().includes(opt)) {
          priority = 'low';
          // Add (optional) if not already present
          if (!task.toLowerCase().includes('optional')) {
            task = task.replace(/^[,\s]+|[,\s]+$/g, '');
            task = task.charAt(0).toUpperCase() + task.slice(1);
            task += ' (optional)';
          }
          break;
        }
      }
      // Clean up leading verbs/phrases
      task = task.replace(/^need to |^have to |^should |^must |^want to |^plan to |^going to |^try to |^finish |^complete |^do |^get to |^work on |^start |^begin |^reply to |^reschedule |^clean |^call |^email |^write |^read |^water |^prep |^prepare |^meditate |^squeeze in |^buy |^order |^meet |^schedule |^book |^pick up |^drop off |^organize |^study |^review |^check |^update |^create |^watch |^listen |^eat |^cook |^sleep |^rest /i, '');
      task = task.replace(/^[,\s]+|[,\s]+$/g, '');
      // Restore some verbs for natural tone
      if (/^reply to|^reschedule|^clean|^call|^email|^write|^read|^water|^prep|^prepare|^meditate|^buy|^order|^meet|^schedule|^book|^pick up|^drop off|^organize|^study|^review|^check|^update|^create|^watch|^listen|^eat|^cook|^sleep|^rest/i.test(part.trim())) {
        task = part.trim().charAt(0).toUpperCase() + part.trim().slice(1);
      }
      // Remove trailing periods
      task = task.replace(/[.]+$/, '');
      // Capitalize
      if (task.length > 0) task = task.charAt(0).toUpperCase() + task.slice(1);
      // Remove duplicate (optional)
      task = task.replace(/\(optional\).*\(optional\)/i, '(optional)');
      // Remove double spaces
      task = task.replace(/\s{2,}/g, ' ');
      if (task) result.push({ task, priority });
    }
    return result;
  }

  static async generateTodoListAdvanced(text: string): Promise<TodoItem[]> {
    return this.generateTodoList(text);
  }
} 