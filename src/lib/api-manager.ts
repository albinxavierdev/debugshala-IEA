import { errorHandler } from './error-handler';

/**
 * API Manager to handle all API interactions
 */
class ApiManager {
  private static instance: ApiManager;
  private baseUrl: string = '';
  
  private constructor() {
    // Determine base URL based on environment
    this.baseUrl = typeof window !== 'undefined' 
      ? window.location.origin 
      : process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  }
  
  static getInstance(): ApiManager {
    if (!ApiManager.instance) {
      ApiManager.instance = new ApiManager();
    }
    return ApiManager.instance;
  }
  
  /**
   * Get questions by category
   */
  async getQuestionsByCategory(category: string, level: number = 1): Promise<any[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/questions/openai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'employability',
          category,
          level,
          batchSize: 10
        }),
      });
      
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.questions || [];
    } catch (error) {
      console.error('Error fetching questions:', error);
      throw error;
    }
  }
  
  /**
   * Get API URL
   */
  getApiUrl(endpoint: string): string {
    return `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
  }
}

// Export singleton instance
export const apiManager = ApiManager.getInstance(); 