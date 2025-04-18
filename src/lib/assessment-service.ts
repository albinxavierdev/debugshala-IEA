import { FormData, AssessmentResult, Question, QuestionType, EmployabilityCategory } from '@/types/assessment';
import { validateFormData, validateScores, sanitizeObject, ValidationError } from '@/lib/validation';
import { getCurrentUser } from './supabase-auth';
import { generateUUID, isValidUUID } from './uuid';

// Define types for setFormData return values
type FormDataSuccess = {
  success: true;
  userId: string | null;
};

type FormDataError = {
  success: false;
  error: string;
};

type FormDataResult = string | FormDataSuccess | FormDataError;

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

  getFormData(): FormData | null {
    // If we already have form data in memory, return it
    if (this.formData) {
      return this.formData;
    }
    
    // Try to get form data from localStorage if not available in memory
    try {
      const storage = getLocalStorage();
      if (storage) {
        const localData = storage.getItem('debugshala_form_data');
        if (localData) {
          try {
            const parsedData = JSON.parse(localData);
            console.log('Retrieved form data from localStorage');
            
            // Validate the parsed data has the expected structure
            if (parsedData && 
                typeof parsedData === 'object' && 
                'name' in parsedData && 
                'email' in parsedData &&
                'interestedDomains' in parsedData) {
              // Store in memory for future use
              this.formData = parsedData;
              return parsedData;
            }
          } catch (parseError) {
            console.error('Error parsing form data from localStorage:', parseError);
          }
        }
      }
    } catch (error) {
      console.error('Error accessing localStorage for form data:', error);
    }
    
    // If we reach here, no valid form data was found
    return null;
  }

  // Update setFormData with better error handling and local fallback
  async setFormData(data: FormData, ensureDbStorage = false): Promise<FormDataResult> {
    try {
      // Ensure we have a user ID (anonymous or authenticated)
      this.ensureUserId();
      
      // Validate form data before proceeding
      validateFormData(data);
      
      // Sanitize input data
      const sanitizedData = sanitizeObject(data);
      
      // Store sanitized data locally (in memory)
      this.formData = sanitizedData;
      
      // Also store in localStorage as a backup
      try {
        const storage = getLocalStorage();
        if (storage) {
          storage.setItem('debugshala_form_data', JSON.stringify(sanitizedData));
          console.log('Form data saved to localStorage');
        }
      } catch (storageError) {
        console.warn('Could not save form data to localStorage:', storageError);
      }
      
      // Attempt to store via API
      let networkSuccess = false;
      let networkError: any = null;
      
      try {
        // Store via API route with timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn('API request timeout after 20 seconds');
        }, 20000); // Increase timeout to 20 seconds
        
        try {
          const response = await fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...sanitizedData,
              userId: this.userId  // Include the user ID
            }),
            signal: controller.signal
          });
          
          clearTimeout(timeoutId);
  
          // Parse response data
          const responseData = await response.json();
          
          if (!response.ok) {
            console.warn('API request failed: ', responseData);
            
            // Check specifically for duplicate user errors
            const errorMessage = responseData.error || 'API request failed';
            if (
              errorMessage.toLowerCase().includes('duplicate') ||
              errorMessage.toLowerCase().includes('already exists') ||
              errorMessage.toLowerCase().includes('unique constraint') ||
              errorMessage.toLowerCase().includes('email already registered') ||
              // PG error codes
              errorMessage.includes('23505') || // Unique violation in PostgreSQL
              responseData.code === 'DUPLICATE_USER'
            ) {
              networkError = new Error(`Email already registered: ${sanitizedData.email}`);
            } else {
              networkError = new Error(errorMessage);
            }
          } else {
            if (!responseData.success) {
              console.warn('API reported failure');
              
              // Also check for duplicate message in this case
              const errorMessage = responseData.error || 'API reported failure';
              if (
                errorMessage.toLowerCase().includes('duplicate') ||
                errorMessage.toLowerCase().includes('already exists') ||
                errorMessage.toLowerCase().includes('unique constraint') ||
                errorMessage.toLowerCase().includes('email already registered') ||
                responseData.code === 'DUPLICATE_USER'
              ) {
                networkError = new Error(`Email already registered: ${sanitizedData.email}`);
              } else {
                networkError = new Error(errorMessage);
              }
            } else {
              // Successful DB storage
              networkSuccess = true;
              return {
                success: true,
                userId: this.userId
              };
            }
          }
        } catch (fetchError) {
          // Make sure to clear the timeout if there's a fetch error
          clearTimeout(timeoutId);
          throw fetchError; // Re-throw to be handled in the outer catch
        }
      } catch (apiError: any) {
        console.error('API error when saving user data:', apiError);
        networkError = apiError;
        
        // Special handling for AbortError (timeout)
        if (apiError.name === 'AbortError') {
          console.warn('Request timed out after 20 seconds, using local storage fallback');
          networkError = new Error('Request timed out. Server might be busy. Your data is saved locally.');
          
          // Still consider this a partial success since we have local data
          if (!ensureDbStorage) {
            networkSuccess = true;
          }
        }
      }
      
      // If we got here and network was successful, just return success
      if (networkSuccess) {
        return {
          success: true,
          userId: this.userId
        };
      }
      
      // If we need to ensure DB storage and it failed, return error
      if (ensureDbStorage) {
        return {
          success: false,
          error: networkError?.message || 'Failed to save user data to database'
        };
      }
      
      // Otherwise, just return the user ID since local storage succeeded
      return this.userId || '';
        
    } catch (error: any) {
      console.error('Error storing user data:', error);
      
      // Try to save locally even if validation failed
      try {
        const storage = getLocalStorage();
        if (storage) {
          storage.setItem('debugshala_form_data_unvalidated', JSON.stringify(data));
        }
      } catch (storageError) {
        // Ignore
      }
      
      // If it's a validation error, return specific message
      if (error instanceof ValidationError) {
        return {
          success: false,
          error: `Validation error: ${error.message}`
        };
      }
      
      // For other errors, provide a generic message
      return {
        success: false,
        error: error.message || 'Failed to save user data'
      };
    }
  }

  getUserId(): string | null {
    return this.userId;
  }

  async generatePersonalizedQuestions(type: QuestionType | SectionType, category?: EmployabilityCategory): Promise<Question[]> {
    if (!this.formData) {
      throw new Error('Form data not found');
    }

    // Ensure we have a user ID (anonymous or authenticated)
    this.ensureUserId();
    
    // Generate a cache key for this request
    const cacheKey = `questions-${type}-${category || 'general'}-${this.userId}`;
    
    // Check if we have cached questions
    const storage = getLocalStorage();
    if (storage) {
      try {
        const cachedData = storage.getItem(cacheKey);
        if (cachedData) {
          const { questions, timestamp } = JSON.parse(cachedData);
          
          // Use cache if it's less than 5 minutes old
          const cacheAgeMs = Date.now() - timestamp;
          if (questions && Array.isArray(questions) && questions.length > 0 && cacheAgeMs < 5 * 60 * 1000) {
            console.log(`Using cached questions for ${type}:${category}`);
            return questions;
          }
        }
      } catch (error) {
        console.warn('Error checking question cache:', error);
        // Continue if cache check fails
      }
    }

    try {
      // Properly validate the type
      const validSectionTypes = ['aptitude', 'programming', 'employability'];
      const sectionType = validSectionTypes.includes(type as string) ? type : 'aptitude';
      
      // Always use OpenAI endpoint with improved error handling
      const endpoint = `/api/questions/openai`;
      
      console.log(`Using OpenAI provider for questions generation (${sectionType}:${category || 'general'})`);
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: sectionType,
          category,
          formData: this.formData,
          userId: this.userId,
          skipStorage: true, // Add parameter to skip database storage
        }),
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Failed to generate questions with OpenAI (${response.status}): ${error}`);
      }

      const data = await response.json();
      
      // Validate the questions array
      if (!Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error('Invalid question data received');
      }
      
      // Store in cache if available
      if (storage) {
        try {
          storage.setItem(cacheKey, JSON.stringify({
            questions: data.questions,
            timestamp: Date.now()
          }));
          console.log(`Cached questions for ${type}:${category}`);
        } catch (error) {
          console.warn('Error caching questions:', error);
          // Continue even if caching fails
        }
      }
      
      // Store question set via API route - but don't fail if it doesn't work
      try {
        const saveResponse = await fetch('/api/questions?fallback=true', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: sectionType,
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
      
      // For all other errors, use local emergency questions as fallback
      console.warn('Falling back to local emergency questions');
      
      // Import and use the generateEmergencyQuestions function for fallback
      if (typeof window !== 'undefined') {
        const { generateEmergencyQuestions } = await import('@/app/assessment/test/hooks/useAssessmentState');
        const emergencyQuestions = generateEmergencyQuestions(type as string, 10);
        
        // Store emergency questions in cache to avoid repeated failures
        if (storage) {
          try {
            storage.setItem(cacheKey, JSON.stringify({
              questions: emergencyQuestions,
              timestamp: Date.now(),
              emergency: true
            }));
          } catch (cacheError) {
            console.warn('Error caching emergency questions:', cacheError);
          }
        }
        
        return emergencyQuestions;
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
        // First try the regular endpoint
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
        
        // If the regular endpoint fails, try the direct-save endpoint
        if (!saveResponse.ok) {
          console.warn('Regular endpoint failed with status:', saveResponse.status);
          console.warn('Trying direct-save endpoint as fallback...');
          
          const directSaveResponse = await fetch('/api/assessment/direct-save', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              formData: this.formData,
              scores,
              provider: this.provider,
              userId: this.userId,
            }),
          });
          
          if (!directSaveResponse.ok) {
            console.error('Direct save also failed:', directSaveResponse.statusText);
            // Store results locally as a last resort
            this.storeLocalResults({
              formData: this.formData,
              scores,
              userId: this.userId,
              timestamp: new Date().toISOString()
            });
          } else {
            console.log('Successfully saved via direct-save endpoint');
          }
        } else {
          console.log('Successfully saved assessment results via regular API');
        }
      } catch (apiError) {
        console.warn('Error saving assessment results via API:', apiError);
        // Continue even if saving fails and store locally
        this.storeLocalResults({
          formData: this.formData,
          scores,
          userId: this.userId,
          timestamp: new Date().toISOString()
        });
      }
      
      // Store the results locally
      this.assessmentResults = data.report;
      return data.report;
    } catch (error) {
      console.error('Error generating assessment report:', error);
      throw error;
    }
  }

  // Helper method to store results locally
  private storeLocalResults(data: any): void {
    try {
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem('assessment_results_backup', JSON.stringify(data));
        console.log('Stored assessment results locally as backup');
      }
    } catch (err) {
      console.error('Failed to store results locally:', err);
    }
  }

  getAssessmentResults(): AssessmentResult | null {
    // If we already have results in memory, return them
    if (this.assessmentResults) {
      return this.assessmentResults;
    }
    
    console.log('Assessment results not found in memory, trying fallback sources...');
    
    // Try to load from various localStorage sources
    const storage = getLocalStorage();
    if (storage) {
      try {
        // Try specifically stored backup first
        const backup = storage.getItem('assessment_results_backup');
        if (backup) {
          console.log('Found results in assessment_results_backup');
          try {
            this.assessmentResults = JSON.parse(backup);
            return this.assessmentResults;
          } catch (parseError) {
            console.error('Failed to parse assessment_results_backup:', parseError);
          }
        }
        
        // Try the key used by the results page
        const resultData = storage.getItem('assessmentResult');
        if (resultData) {
          console.log('Found results in assessmentResult');
          try {
            this.assessmentResults = JSON.parse(resultData);
            return this.assessmentResults;
          } catch (parseError) {
            console.error('Failed to parse assessmentResult:', parseError);
          }
        }
        
        // Try to build from offline data
        try {
          const offlineData = JSON.parse(storage.getItem('debugshala_offline_data') || '{}');
          if (offlineData['latest_assessment_results']) {
            console.log('Found results in offline data');
            if (offlineData['latest_assessment_results'].responseData?.report) {
              this.assessmentResults = offlineData['latest_assessment_results'].responseData.report;
              return this.assessmentResults;
            } else if (offlineData['latest_assessment_results'].scores) {
              // Try to build a minimal report from scores
              return this.buildMinimalReportFromScores(offlineData['latest_assessment_results'].scores);
            }
          }
        } catch (offlineError) {
          console.error('Failed to parse offline data:', offlineError);
        }
        
        // Try to build from raw scores as last resort
        const scores = storage.getItem('debugshala_assessment_scores');
        if (scores) {
          console.log('Found raw scores, building minimal report');
          try {
            const parsedScores = JSON.parse(scores);
            return this.buildMinimalReportFromScores(parsedScores);
          } catch (scoresError) {
            console.error('Failed to parse scores data:', scoresError);
          }
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
    
    console.warn('No assessment results found in any storage location');
    return null;
  }

  // Helper method to build a minimal report from scores
  private buildMinimalReportFromScores(parsedScores: any): AssessmentResult {
    const minimalReport: AssessmentResult = {
      userId: this.userId || 'unknown',
      timestamp: new Date().toISOString(),
      formData: this.formData || {
        name: 'User',
        email: 'user@example.com',
        phone: '',
        degree: '',
        graduationYear: '',
        collegeName: '',
        interestedDomains: []
      },
      scores: parsedScores,
      sectionDetails: {
        aptitude: {
          totalQuestions: 10,
          correctAnswers: Math.round(parsedScores.aptitude / 10),
          accuracy: parsedScores.aptitude,
          strengths: ["Problem solving", "Analytical thinking"],
          weakAreas: ["Time management", "Complex calculations"]
        },
        programming: {
          totalQuestions: 10,
          correctAnswers: Math.round(parsedScores.programming / 10),
          accuracy: parsedScores.programming,
          strengths: ["Basic concepts", "Code structure"],
          weakAreas: ["Advanced algorithms", "Optimization"]
        },
        employability: {
          totalQuestions: 20,
          correctAnswers: 0,
          accuracy: 0,
          softSkillsScore: 0,
          professionalSkillsScore: 0,
          aiLiteracyScore: 0,
          strengths: ["Communication", "Teamwork"],
          weakAreas: ["Leadership", "Project management"]
        }
      },
      outcome: parsedScores.aptitude >= 60 && parsedScores.programming >= 60 ? 'Pass' : 'Not Qualified',
      skillReadinessLevel: 'Intermediate',
      recommendations: {
        skills: ["Problem solving", "Technical communication"],
        courses: ["Data Structures", "Algorithms"],
        careerPaths: ["Software Developer", "Web Developer"],
        aptitudeResources: {
          books: ["Logical Reasoning", "Quantitative Aptitude"],
          platforms: ["Brilliant.org", "Khan Academy"],
          practiceGuide: "Practice daily with timed exercises"
        },
        programmingResources: {
          courses: ["Data Structures and Algorithms", "System Design"],
          platforms: ["LeetCode", "HackerRank"],
          topicsToStudy: ["Algorithms", "Data Structures", "Design Patterns"]
        },
        employabilityResources: {
          courses: ["Communication Skills", "Professional Ethics"],
          activities: ["Open Source Contribution", "Hackathons"]
        },
        nextAction: "Continue building your portfolio with projects that showcase your skills"
      },
      detailedAnalysis: {
        strengths: ["Technical aptitude", "Coding fundamentals"],
        areasForImprovement: ["Advanced programming concepts", "System design"],
        skillGaps: ["Algorithm optimization", "Design patterns"],
        industryComparison: {
          aptitude: parsedScores.aptitude,
          programming: parsedScores.programming,
          softSkills: 70,
          overallGap: 20
        }
      }
    };
    
    // Cache this report in memory
    this.assessmentResults = minimalReport;
    
    // Also store it properly for future use
    this.storeLocalResults(minimalReport);
    
    return minimalReport;
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
        const testCompleted = storage.getItem('debugshala_test_completed') === 'true';
        
        if (testCompleted) {
          // Verify that there's actual assessment data
          const scores = storage.getItem('debugshala_assessment_scores');
          
          // Only consider it completed if we have valid scores
          if (scores && scores !== '{}' && scores !== 'null') {
            console.log('Test is completed with valid scores');
            return true;
          } else {
            // Remove invalid completion flag
            console.log('Removing invalid completion flag');
            storage.removeItem('debugshala_test_completed');
            return false;
          }
        }
        
        // Check for offline results
        const offlineData = JSON.parse(storage.getItem('debugshala_offline_data') || '{}');
        if (offlineData['latest_assessment_results']) {
          // Verify the data structure is valid
          if (offlineData['latest_assessment_results'].scores) {
            console.log('Found valid offline assessment results');
            return true;
          }
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