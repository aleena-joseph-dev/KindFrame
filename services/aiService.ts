import config from '@/lib/config';

interface TaskBreakdownRequest {
  userInput: string;
  detailLevel?: 'few' | 'many';
}

interface TaskBreakdownResponse {
  subtasks: string[];
  formattedBreakdown: string;
  success: boolean;
  error?: string;
}

interface CursorAIRequest {
  model: string;
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  max_tokens: number;
  temperature?: number;
  stream?: boolean;
}

interface CursorAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIService {
  // Use the AI proxy server instead of direct Cursor AI connection
  private static AI_PROXY_ENDPOINT = config.ai.proxyEndpoint + '/task-breakdown';
  private static AI_PROXY_TEST_ENDPOINT = config.ai.proxyEndpoint + '/test-connection';
  private static API_KEY = process.env.EXPO_PUBLIC_CURSOR_AI_KEY || '';
  private static DEFAULT_MODEL = 'gpt-4'; // or your preferred model
  private static DEFAULT_MAX_TOKENS = 500;
  private static DEFAULT_TEMPERATURE = 0.3;

  /**
   * Get task breakdown from Cursor AI
   * @param jot - User's input text
   * @param detailLevel - 'few' or 'many' steps
   * @returns Promise<TaskBreakdownResponse>
   */
  static async getTaskBreakdown(jot: string, detailLevel: 'few' | 'many' = 'few'): Promise<TaskBreakdownResponse> {
    try {
      console.log('🤖 AI Task Breakdown Request:', { jot, detailLevel });
      
      // Use the AI proxy server
      const response = await fetch(this.AI_PROXY_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jot,
          detailLevel
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'AI service error');
      }

      console.log('✅ AI Task Breakdown Success:', { subtasksCount: data.subtasks.length });
      
      return {
        subtasks: data.subtasks,
        formattedBreakdown: data.formattedBreakdown,
        success: true
      };

    } catch (error) {
      console.error('❌ AI Task Breakdown Error:', error);
      return {
        subtasks: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }





  /**
   * Legacy method for backward compatibility
   */
  static async breakDownTask(request: TaskBreakdownRequest): Promise<TaskBreakdownResponse> {
    return this.getTaskBreakdown(request.userInput, request.detailLevel);
  }

  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing AI connection...');
      
      const response = await fetch(this.AI_PROXY_TEST_ENDPOINT, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const isConnected = data.success === true;
      console.log('🔍 AI connection test result:', isConnected);
      return isConnected;
    } catch (error) {
      console.error('❌ AI Connection Test Failed:', error);
      return false;
    }
  }
} 