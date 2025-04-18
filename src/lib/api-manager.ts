import { errorHandler } from './error-handler';
import { ErrorLevel } from './error-handler';
import { assessmentService } from './assessment-service';
import { promptLayer } from './prompt-layer';

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
   * Get questions by category with improved error handling
   * @param category - The category to get questions for
   * @param level - The difficulty level (default: 1)
   * @param useOpenAI - Whether to force use of OpenAI (default: true)
   * @param customFormData - Optional custom form data to override assessmentService data
   * @param skipPersonalization - Whether to skip personalization (default: false)
   */
  async getQuestionsByCategory(
    category: string, 
    level: number = 1,
    useOpenAI: boolean = true,
    customFormData?: any,
    skipPersonalization: boolean = false
  ): Promise<any[]> {
    console.log(`API Manager: Getting questions for category: ${category}, level: ${level}, useOpenAI: ${useOpenAI}, skipPersonalization: ${skipPersonalization}`);
    
    // Get standard batch size from promptLayer
    const standardBatchSize = promptLayer.getBatchSize();
    
    try {
      // Add timeout to prevent long-hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
      
      try {
        // Get user form data from assessment service or use custom data if provided
        const formData = customFormData || assessmentService.getFormData();
        const userId = assessmentService.getUserId();
        
        // Ensure we have form data for personalization
        if (!formData) {
          console.warn("No form data available for personalization. User may receive generic questions.");
          errorHandler.logError('API Manager: Missing form data for personalization', {
            level: ErrorLevel.WARNING,
            additionalInfo: { 
              userId,
              category,
              level,
              skipPersonalization
            }
          });
        } else {
          console.log(`API Manager: Using personalized questions for ${formData.name} (${formData.email})`);
          console.log(`Interests: ${formData.interestedDomains.join(', ')}`);
          console.log(`Education: ${formData.degree} from ${formData.collegeName}, ${formData.graduationYear}`);
        }

        // Setup an AbortController for fetch timeout
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
              batchSize: standardBatchSize, // Use standard batch size
              realtime: true,
              formData, // Always send form data, even if null (API will handle null case)
              userId,
              useOpenAI: true, // Always force OpenAI for personalization
              personalizationRequired: !skipPersonalization // Skip personalization if requested
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            const errorText = await response.text();
            console.error(`API error (status ${response.status}):`, errorText);
            // Don't throw, just return empty array to trigger fallback
            console.log("API request failed, using fallback questions");
            return [];
          }
          
          const data = await response.json();
          
          if (!data.questions || !Array.isArray(data.questions)) {
            console.error('Invalid response format:', data);
            // Don't throw, return empty array
            return [];
          }
          
          if (data.questions.length === 0) {
            console.warn('API returned empty questions array');
            return [];
          } else {
            console.log(`API returned ${data.questions.length} questions`);
            console.log(`Questions are ${data.isPersonalized ? 'personalized' : 'generic'} from provider: ${data.provider || 'unknown'}`);
            
            // Log whether we actually got personalized questions
            if (formData && !data.isPersonalized) {
              console.warn('Expected personalized questions but received generic ones');
              errorHandler.logError('API Manager: Personalization failed', {
                level: ErrorLevel.WARNING,
                additionalInfo: { 
                  userId,
                  category,
                  level,
                  provider: data.provider
                }
              });
            }
          }
          
          return data.questions || [];
        } catch (fetchError: any) {
          clearTimeout(timeoutId);
          
          // Handle AbortError (timeout) silently
          if (fetchError.name === 'AbortError') {
            console.warn('API request timed out - using fallback questions instead');
            errorHandler.logError('API Manager: Request timeout', {
              level: ErrorLevel.WARNING,
              additionalInfo: { 
                category,
                level,
                timeout: '15 seconds'
              }
            });
            // Return empty array to trigger fallback without throwing
            return [];
          }
          
          // For network errors, also return empty to trigger fallback
          console.warn(`Network error: ${fetchError.message} - using fallback questions`);
          return [];
        }
      } catch (innerError: any) {
        clearTimeout(timeoutId);
        console.warn(`Error during API preparation: ${innerError.message} - using fallback questions`);
        // Return empty array to trigger fallback without throwing
        return [];
      }
    } catch (outerError: any) {
      // Even for catastrophic errors, we don't throw but return empty
      console.error('Critical error in API manager:', outerError);
      errorHandler.logError('API Manager: Critical error', {
        level: ErrorLevel.ERROR,
        additionalInfo: { 
          errorMessage: outerError.message,
          stack: outerError.stack,
          category,
          level
        }
      });
      // Return empty array to trigger fallback
      return [];
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