import AsyncStorage from '@react-native-async-storage/async-storage';

export interface NotionPage {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

export interface NotionDatabase {
  id: string;
  title: string;
  url: string;
  created_time: string;
  last_edited_time: string;
}

export interface NotionWorkspace {
  id: string;
  name: string;
  icon?: string;
}

export class NotionService {
  private static async getAccessToken(): Promise<string | null> {
    try {
      return await AsyncStorage.getItem('notionToken');
    } catch (error) {
      console.error('Error getting Notion access token:', error);
      return null;
    }
  }

  private static async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const token = await this.getAccessToken();
    
    if (!token) {
      throw new Error('Notion access token not found. Please authenticate with Notion first.');
    }

    const response = await fetch(`https://api.notion.com/v1${endpoint}`, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Notion API error: ${response.status} - ${errorData.message || response.statusText}`);
    }

    return response;
  }

  // Get current user information
  static async getCurrentUser(): Promise<any> {
    try {
      const response = await this.makeRequest('/users/me');
      return await response.json();
    } catch (error) {
      console.error('Error getting Notion user:', error);
      throw error;
    }
  }

  // Search for pages and databases
  static async search(query?: string, filter?: 'page' | 'database'): Promise<{
    pages: NotionPage[];
    databases: NotionDatabase[];
  }> {
    try {
      const body: any = {
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      };

      if (query) {
        body.query = query;
      }

      if (filter) {
        body.filter = {
          value: filter,
          property: 'object',
        };
      }

      const response = await this.makeRequest('/search', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      const data = await response.json();
      
      const pages: NotionPage[] = [];
      const databases: NotionDatabase[] = [];

      data.results.forEach((item: any) => {
        if (item.object === 'page') {
          pages.push({
            id: item.id,
            title: item.properties?.title?.title?.[0]?.plain_text || 'Untitled',
            url: item.url,
            created_time: item.created_time,
            last_edited_time: item.last_edited_time,
          });
        } else if (item.object === 'database') {
          databases.push({
            id: item.id,
            title: item.title?.[0]?.plain_text || 'Untitled Database',
            url: item.url,
            created_time: item.created_time,
            last_edited_time: item.last_edited_time,
          });
        }
      });

      return { pages, databases };
    } catch (error) {
      console.error('Error searching Notion:', error);
      throw error;
    }
  }

  // Get a specific page
  static async getPage(pageId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/pages/${pageId}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting Notion page:', error);
      throw error;
    }
  }

  // Create a new page
  static async createPage(parentId: string, title: string, content?: string): Promise<any> {
    try {
      const body = {
        parent: {
          database_id: parentId,
        },
        properties: {
          title: {
            title: [
              {
                text: {
                  content: title,
                },
              },
            ],
          },
        },
        children: content ? [
          {
            object: 'block',
            type: 'paragraph',
            paragraph: {
              rich_text: [
                {
                  type: 'text',
                  text: {
                    content: content,
                  },
                },
              ],
            },
          },
        ] : [],
      };

      const response = await this.makeRequest('/pages', {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error) {
      console.error('Error creating Notion page:', error);
      throw error;
    }
  }

  // Update a page
  static async updatePage(pageId: string, updates: any): Promise<any> {
    try {
      const response = await this.makeRequest(`/pages/${pageId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });

      return await response.json();
    } catch (error) {
      console.error('Error updating Notion page:', error);
      throw error;
    }
  }

  // Get database
  static async getDatabase(databaseId: string): Promise<any> {
    try {
      const response = await this.makeRequest(`/databases/${databaseId}`);
      return await response.json();
    } catch (error) {
      console.error('Error getting Notion database:', error);
      throw error;
    }
  }

  // Query database
  static async queryDatabase(databaseId: string, filter?: any, sorts?: any[]): Promise<any> {
    try {
      const body: any = {};
      
      if (filter) {
        body.filter = filter;
      }
      
      if (sorts) {
        body.sorts = sorts;
      }

      const response = await this.makeRequest(`/databases/${databaseId}/query`, {
        method: 'POST',
        body: JSON.stringify(body),
      });

      return await response.json();
    } catch (error) {
      console.error('Error querying Notion database:', error);
      throw error;
    }
  }

  // Check if user is authenticated with Notion
  static async isAuthenticated(): Promise<boolean> {
    try {
      const token = await this.getAccessToken();
      if (!token) return false;

      // Test the token by making a simple API call
      await this.getCurrentUser();
      return true;
    } catch (error) {
      console.error('Notion authentication check failed:', error);
      return false;
    }
  }

  // Clear Notion authentication
  static async signOut(): Promise<void> {
    try {
      await AsyncStorage.removeItem('notionToken');
    } catch (error) {
      console.error('Error signing out from Notion:', error);
      throw error;
    }
  }
} 