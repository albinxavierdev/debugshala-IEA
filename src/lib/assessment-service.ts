import { FormData, AssessmentResult, Question, QuestionType, EmployabilityCategory } from '@/types/assessment';
import { validateFormData, validateScores, sanitizeObject, ValidationError } from '@/lib/validation';
import { getCurrentUser } from './supabase-auth';
import { generateUUID, isValidUUID } from './uuid';

// Helper to safely access localStorage (only in browser)
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

// Database operation error class for better error handling
class DatabaseError extends Error {
  constructor(message: string, public originalError: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

// Authentication error class
class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// Using OpenAI as the only provider
export type LLMProvider = 'openai';

class AssessmentService {
  private static instance: AssessmentService;
  private formData: FormData | null = null;
  private assessmentResults: AssessmentResult | null = null;
  private userId: string | null = null;
  private readonly provider: LLMProvider = 'openai';

  private constructor() {
    // Auth-based user identification will happen in initUser()
  }

  static getInstance(): AssessmentService {
    if (!AssessmentService.instance) {
      AssessmentService.instance = new AssessmentService();
    }
    return AssessmentService.instance;
  }

  getProvider(): LLMProvider {
    return this.provider;
  }

  // Create a helper method to generate and set an anonymous user ID
  private ensureUserId(): string {
    if (!this.userId) {
      // Generate a proper UUID v4 for anonymous users
      const uuid = generateUUID();
      console.log('Creating anonymous user ID (UUID format):', uuid);
      this.userId = uuid;
      
      // Store in localStorage for future use
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem('debugshala_user_id', uuid);
      }
    }
    return this.userId;
  }

  // Initialize user from Supabase Auth
  async initUser(): Promise<string | null> {
    try {
      // Try to get authenticated user
      const user = await getCurrentUser();
      
      if (user) {
        this.userId = user.id;
        return this.userId;
      }
      
      // If no authenticated user, check localStorage for compatibility
      const storage = getLocalStorage();
      if (storage) {
        const localId = storage.getItem('debugshala_user_id');
        if (localId) {
          // Validate if existing ID is UUID format
          if (isValidUUID(localId)) {
            console.log('Using stored UUID from localStorage:', localId);
            this.userId = localId;
            return this.userId;
          } else {
            console.warn('Found invalid UUID format in localStorage. Generating new UUID.');
            // Old format detected, generate new UUID
            storage.removeItem('debugshala_user_id');
          }
        }
      }
      
      // No user found or invalid format, create anonymous ID
      return this.ensureUserId();
    } catch (error) {
      console.error('Error initializing user:', error);
      // Generate an anonymous ID if anything fails
      return this.ensureUserId();
    }
  }

  async setFormData(data: FormData) {
    try {
      // Ensure we have a user ID (anonymous or authenticated)
      this.ensureUserId();
      
      // Validate form data before proceeding
      validateFormData(data);
      
      // Sanitize input data
      const sanitizedData = sanitizeObject(data);
      
      // Store sanitized data locally
      this.formData = sanitizedData;
      
      try {
        // Store via API route
        const response = await fetch('/api/users?debug=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...sanitizedData,
            userId: this.userId  // Include the user ID
          }),
        });

        if (!response.ok) {
          const responseData = await response.json();
          console.warn('API request failed but continuing: ', responseData);
          // Don't throw - allow assessment to continue even with database error
        } else {
          const responseData = await response.json();
          if (!responseData.success) {
            console.warn('API reported failure but continuing with local data');
          }
        }
        
      } catch (apiError) {
        console.error('API error when saving user data:', apiError);
        console.warn('Continuing with local form data despite API error');
        // Don't throw - continue using local form data
      }
    } catch (error) {
      console.error('Error storing user data:', error);
      
      // If it's a validation error, rethrow it
      if (error instanceof ValidationError) {
        throw error;
      } else {
        // For all other errors, log but continue with assessment
        console.warn('Continuing with assessment despite data storage error');
      }
    }
    
    return this.userId;
  }

  getFormData(): FormData | null {
    return this.formData;
  }

  getUserId(): string | null {
    return this.userId;
  }

  async generatePersonalizedQuestions(type: QuestionType, category?: EmployabilityCategory): Promise<Question[]> {
    if (!this.formData) {
      throw new Error('Form data not found');
    }

    // Ensure we have a user ID (anonymous or authenticated)
    this.ensureUserId();

    try {
      // Always use OpenAI endpoint
      const endpoint = `/api/questions/openai`;
      
      console.log(`Using OpenAI provider for questions generation`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          category,
          formData: this.formData,
          userId: this.userId,
          skipStorage: true, // Add parameter to skip database storage
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions with OpenAI: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Validate the questions array
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Invalid question data received');
      }
      
      // Store question set via API route - but don't fail if it doesn't work
      try {
        const saveResponse = await fetch('/api/questions?fallback=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type,
            category,
            questions: data.questions,
            provider: this.provider,
            userId: this.userId,
          }),
        });
        
        if (!saveResponse.ok) {
          console.warn('Could not save questions to database via API - continuing with local data');
        }
      } catch (apiError) {
        console.warn('Error saving questions via API route - continuing with local data:', apiError);
        // Don't fail the main operation if this fails - it's non-critical
      }
      
      return data.questions;
    } catch (error) {
      console.error(`Error generating questions with OpenAI:`, error);
      
      // Check for different error types
      if (error instanceof AuthError) {
        throw error;
      } else if (error instanceof TypeError) {
        throw new Error('Network error when contacting OpenAI. Please check your connection.');
      } else if (error instanceof SyntaxError) {
        throw new Error('Invalid response from OpenAI service. Please try again.');
      }
      
      throw error;
    }
  }

  async generateAssessmentReport(scores: AssessmentResult['scores']): Promise<AssessmentResult> {
    if (!this.formData) {
      throw new Error('Form data not found');
    }

    // Ensure we have a user ID (anonymous or authenticated)
    this.ensureUserId();

    try {
      // Validate the scores data
      validateScores(scores);
      
      // Generate the report using OpenAI endpoint
      const endpoint = `/api/assessment/report-openai`;
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: this.formData,
          scores,
          userId: this.userId, // Include the user ID for API processing
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate assessment report: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.report) {
        throw new Error('Invalid assessment report data received');
      }

      // Store assessment results via API
      try {
        const saveResponse = await fetch('/api/assessment/results', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            formData: this.formData,
            scores,
            provider: this.provider,
            userId: this.userId, // Include the user ID
          }),
        });
        
        if (!saveResponse.ok) {
          console.warn('Failed to save assessment results via API:', saveResponse.statusText);
        }
      } catch (apiError) {
        console.warn('Error saving assessment results via API:', apiError);
        // Continue even if saving fails
      }
      
      // Store the results locally
      this.assessmentResults = data.report;
      return data.report;
    } catch (error) {
      console.error('Error generating assessment report:', error);
      throw error;
    }
  }

  getAssessmentResults(): AssessmentResult | null {
    return this.assessmentResults;
  }

  isTestCompleted(): boolean {
    // Check if we have results in memory
    if (this.assessmentResults) {
      return true;
    }
    
    // Check localStorage for completion flag
    if (typeof window !== 'undefined') {
      try {
        const storage = localStorage;
        if (storage.getItem('debugshala_test_completed') === 'true') {
          return true;
        }
        
        // Check for offline results
        const offlineData = JSON.parse(storage.getItem('debugshala_offline_data') || '{}');
        if (offlineData['latest_assessment_results']) {
          return true;
        }
      } catch (error) {
        console.error('Error checking test completion status:', error);
      }
    }
    
    return false;
  }

  clearAssessmentData() {
    this.formData = null;
    this.assessmentResults = null;
    
    // Also clear completion flag
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('debugshala_test_completed');
      } catch (error) {
        console.error('Error clearing test completion flag:', error);
      }
    }
  }
}

export const assessmentService = AssessmentService.getInstance();