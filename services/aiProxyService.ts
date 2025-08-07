interface TaskBreakdownRequest {
  userInput: string;
  detailLevel?: 'few' | 'many';
}

interface TaskBreakdownResponse {
  subtasks: string[];
  success: boolean;
  error?: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class AIProxyService {
  private static PROXY_ENDPOINT = 'http://localhost:3001/api/ai'; // Adjust port as needed

  /**
   * Get task breakdown via backend proxy
   * @param jot - User's input text
   * @param detailLevel - 'few' or 'many' steps
   * @returns Promise<TaskBreakdownResponse>
   */
  static async getTaskBreakdown(jot: string, detailLevel: 'few' | 'many' = 'few'): Promise<TaskBreakdownResponse> {
    try {
      console.log('🤖 AI Proxy Task Breakdown Request:', { jot, detailLevel });
      
      const response = await fetch(`${this.PROXY_ENDPOINT}/task-breakdown`, {
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
        const errorText = await response.text();
        throw new Error(`AI Proxy error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ AI Proxy Task Breakdown Success:', { subtasksCount: data.subtasks.length });
        return {
          subtasks: data.subtasks,
          success: true,
          usage: data.usage
        };
      } else {
        throw new Error(data.error || 'Unknown error from AI proxy');
      }

    } catch (error) {
      console.error('❌ AI Proxy Task Breakdown Error:', error);
      return {
        subtasks: [],
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test connection to AI proxy
   * @returns Promise<boolean>
   */
  static async testConnection(): Promise<boolean> {
    try {
      console.log('🔍 Testing AI Proxy connection...');
      
      const response = await fetch(`${this.PROXY_ENDPOINT}/test-connection`);
      
      if (!response.ok) {
        throw new Error(`Proxy connection test failed: ${response.status}`);
      }

      const data = await response.json();
      const isConnected = data.success && data.connected;
      
      console.log('🔍 AI Proxy connection test result:', isConnected);
      return isConnected;

    } catch (error) {
      console.error('❌ AI Proxy Connection Test Failed:', error);
      return false;
    }
  }

  /**
   * Test proxy health
   * @returns Promise<boolean>
   */
  static async testHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.PROXY_ENDPOINT.replace('/api/ai', '')}/health`);
      return response.ok;
    } catch (error) {
      console.error('❌ AI Proxy Health Check Failed:', error);
      return false;
    }
  }

  /**
   * Legacy method for backward compatibility
   */
  static async breakDownTask(request: TaskBreakdownRequest): Promise<TaskBreakdownResponse> {
    return this.getTaskBreakdown(request.userInput, request.detailLevel);
  }
} 