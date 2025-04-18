import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentState, Section, TestProgress, UserContext, Question } from '@/types/assessment';
import { assessmentService } from '@/lib/assessment-service';
import { questionGenerator } from '../utils/questionGeneration';
import { errorHandler } from '../utils/errorHandling';
import { scoreCalculator } from '../utils/scoreCalculation';
import { toast } from '@/components/ui/use-toast';
import { processQuestions } from '../utils/questionUtils';

// Helper to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

/**
 * Generate emergency questions as a fallback when API fails
 */
export const generateEmergencyQuestions = (sectionType: string, count: number = 10): Question[] => {
  const questions: Question[] = [];
  
  // Define appropriate categories for each section type
  const categories = sectionType === 'aptitude' 
    ? ['numerical', 'logical', 'pattern', 'problem-solving'] 
    : sectionType === 'programming'
      ? ['algorithms', 'data structures', 'debugging', 'concepts']
      : ['communication', 'teamwork', 'professional', 'problem_solving', 'core', 'soft', 'leadership', 'domain'];
  
  // Ensure we use each category at least once for more variety
  const requiredCount = Math.min(categories.length, count);
  for (let i = 0; i < requiredCount; i++) {
    const category = categories[i % categories.length];
    
    // Create more varied question titles based on section type and category
    let questionTitle = '';
    let options: string[] = [];
    let correctAnswer = '';
    
    if (sectionType === 'aptitude') {
      const aptitudeQuestionTemplates = [
        `Solving a ${category} problem involving business analytics`,
        `Evaluating a ${category} scenario in software development`,
        `Analyzing a ${category} pattern in data structures`,
        `Finding the solution to a ${category} problem in algorithm design`
      ];
      questionTitle = `${aptitudeQuestionTemplates[i % aptitudeQuestionTemplates.length]} (#${i+1})`;
      
      options = [
        `Solution approach using ${category} concept A`,
        `Solution approach using ${category} concept B`,
        `Solution approach using ${category} concept C`,
        `Solution approach using ${category} concept D`
      ];
      correctAnswer = options[1]; // Varying the correct answer
    } else if (sectionType === 'programming') {
      const programmingQuestionTemplates = [
        `Implementing a solution using ${category} principles`,
        `Debugging code related to ${category}`,
        `Optimizing ${category} in an existing implementation`,
        `Understanding ${category} fundamentals in modern software development`
      ];
      questionTitle = `${programmingQuestionTemplates[i % programmingQuestionTemplates.length]} (#${i+1})`;
      
      options = [
        `Implementation using ${category} pattern A`,
        `Implementation using ${category} pattern B`,
        `Implementation using ${category} pattern C`,
        `Implementation using ${category} pattern D`
      ];
      correctAnswer = options[i % 4]; // Truly varied correct answers
    } else {
      const employabilityQuestionTemplates = [
        `Handling a ${category} challenge in a team environment`,
        `Demonstrating ${category} skills during project delivery`,
        `Applying ${category} principles in client interactions`,
        `Developing ${category} competencies for career growth`
      ];
      questionTitle = `${employabilityQuestionTemplates[i % employabilityQuestionTemplates.length]} (#${i+1})`;
      
      options = [
        `${category} approach: Direct and assertive`,
        `${category} approach: Collaborative and inclusive`,
        `${category} approach: Analytical and thorough`,
        `${category} approach: Creative and innovative`
      ];
      correctAnswer = options[1]; // Most employability answers favor collaboration
    }
    
    // Generate a unique ID with timestamp to avoid any potential collisions
    const uniqueId = `emergency-${sectionType}-${category}-${i+1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    // Create the question with appropriate category and section type
    questions.push({
      id: uniqueId,
      type: 'mcq',
      question: questionTitle,
      options: options,
      correctAnswer: correctAnswer,
      explanation: `This emergency question tests your ${category} skills in the context of ${sectionType}. The selected answer represents the best practice approach in most professional situations.`,
      difficulty: i < 5 ? 'easy' : 'medium',
      category: category,
      timeLimit: 60
    });
  }
  
  // If we need more than the number of categories, add additional questions
  // with randomly selected categories to reach 10 total questions
  if (requiredCount < 10) {
    for (let i = requiredCount; i < 10; i++) {
      // Select a random category from the appropriate list
      const randomCategoryIndex = Math.floor(Math.random() * categories.length);
      const category = categories[randomCategoryIndex];
      
      // Create appropriate question title based on section type
      let questionTitle = '';
      let options: string[] = [];
      let correctAnswer = '';
      
      if (sectionType === 'aptitude') {
        questionTitle = `Additional aptitude question about ${category} reasoning (#${i+1})`;
        options = [
          `${category} solution approach 1`,
          `${category} solution approach 2`,
          `${category} solution approach 3`,
          `${category} solution approach 4`
        ];
        correctAnswer = options[0];
      } else if (sectionType === 'programming') {
        questionTitle = `Additional programming challenge related to ${category} (#${i+1})`;
        options = [
          `Code solution using ${category} approach 1`,
          `Code solution using ${category} approach 2`,
          `Code solution using ${category} approach 3`,
          `Code solution using ${category} approach 4`
        ];
        correctAnswer = options[1];
      } else {
        questionTitle = `Additional employability assessment for ${category} skills (#${i+1})`;
        options = [
          `${category} workplace approach 1`,
          `${category} workplace approach 2 - most effective`,
          `${category} workplace approach 3`,
          `${category} workplace approach 4`
        ];
        correctAnswer = options[1];
      }
      
      // Create the question with appropriate category and section type
      questions.push({
        id: `emergency-${sectionType}-${category}-${i+1}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        type: 'mcq',
        question: questionTitle,
        options: options,
        correctAnswer: correctAnswer,
        explanation: `This additional emergency question tests your ${category} skills in the context of ${sectionType}.`,
        difficulty: i < 8 ? 'medium' : 'hard',
        category: category,
        timeLimit: 60
      });
    }
  }
  
  console.log(`Generated ${questions.length} emergency questions for ${sectionType} section with varied categories`);
  return questions;
};

/**
 * Custom hook for managing assessment state
 */
export function useAssessmentState() {
  const router = useRouter();
  const [state, setState] = useState<AssessmentState>({
    sections: [
      {
        id: 'aptitude',
        title: 'Aptitude & Reasoning',
        type: 'aptitude',
        description: 'Logical reasoning, numerical ability, and problem-solving questions',
        duration: 15,
        questions: [],
        completed: false
      },
      {
        id: 'programming',
        title: 'General Programming',
        type: 'programming',
        description: 'Basic coding concepts, algorithmic thinking, and programming fundamentals',
        duration: 15,
        questions: [],
        completed: false
      },
      {
        id: 'employability',
        title: 'Employability Skills',
        type: 'employability',
        description: 'Comprehensive assessment of work-related skills and professional abilities',
        duration: 30,
        questions: [],
        completed: false
      }
    ],
    currentSectionIndex: 0,
    currentQuestionIndex: 0,
    userAnswers: {},
    timeRemaining: 15 * 60, // Default to 15 minutes in seconds
    userName: '',
    loading: {
      initial: true,
      questions: false,
      submitting: false
    },
    cacheSource: undefined
  });
  
  // Create derived state values
  const currentSection = state.sections[state.currentSectionIndex] || { questions: [] };
  const totalSections = state.sections.length;
  const totalQuestions = currentSection?.questions?.length || 0;
  const currentQuestion = currentSection?.questions?.[state.currentQuestionIndex];
  
  /**
   * Save test progress to localStorage
   */
  const saveTestProgress = useCallback(() => {
    const storage = getLocalStorage();
    if (storage) {
      // Save current state of the test
      const testProgress: TestProgress = {
        sections: state.sections,
        userAnswers: state.userAnswers,
        currentSectionIndex: state.currentSectionIndex,
        currentQuestionIndex: state.currentQuestionIndex,
        timeRemaining: state.timeRemaining,
        timestamp: new Date().toISOString()
      };
      
      try {
        storage.setItem('debugshala_test_progress', JSON.stringify(testProgress));
        console.log('Test progress saved to localStorage:', new Date().toISOString());
      } catch (error) {
        console.error('Error saving test progress to localStorage:', error);
      }
    }
  }, [state]);
  
  /**
   * Load test progress from localStorage
   */
  const loadTestProgress = useCallback(() => {
    const storage = getLocalStorage();
    if (storage) {
      try {
        const savedProgress = storage.getItem('debugshala_test_progress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress) as TestProgress;
          
          // Check if progress data is recent (within 3 hours)
          const savedTime = new Date(progress.timestamp).getTime();
          const currentTime = new Date().getTime();
          const threeHoursInMs = 3 * 60 * 60 * 1000;
          
          if (currentTime - savedTime < threeHoursInMs) {
            console.log('Restoring test progress from localStorage');
            setState(prevState => ({
              ...prevState,
              sections: progress.sections,
              userAnswers: progress.userAnswers,
              currentSectionIndex: progress.currentSectionIndex,
              currentQuestionIndex: progress.currentQuestionIndex,
              timeRemaining: progress.timeRemaining,
              loading: {
                ...prevState.loading,
                initial: false
              }
            }));
            return true;
          } else {
            console.log('Saved test progress is too old, starting fresh');
            storage.removeItem('debugshala_test_progress');
          }
        }
      } catch (error) {
        console.error('Error loading test progress from localStorage:', error);
      }
    }
    return false;
  }, []);
  
  /**
   * Handle answer selection
   */
  const handleAnswerSelect = useCallback((questionId: string, answer: string) => {
    // Safety check for undefined or empty questionId
    if (!questionId) {
      console.error('Attempted to select answer for undefined questionId');
      toast({
        title: "Error",
        description: "There was a problem recording your answer. Please try again.",
        variant: "destructive",
      });
      return;
    }
    
    setState(prevState => ({
      ...prevState,
      userAnswers: {
        ...prevState.userAnswers,
        [questionId]: answer
      }
    }));
    
    // Save progress immediately when user answers a question
    setTimeout(saveTestProgress, 0);
  }, [saveTestProgress]);
  
  /**
   * Navigate to next question
   */
  const handleNextQuestion = useCallback(() => {
    setState(prevState => {
      const currentSection = prevState.sections[prevState.currentSectionIndex];
      if (prevState.currentQuestionIndex < currentSection.questions.length - 1) {
        return {
          ...prevState,
          currentQuestionIndex: prevState.currentQuestionIndex + 1
        };
      }
      return prevState;
    });
    
    // Save progress on question navigation
    saveTestProgress();
  }, [saveTestProgress]);
  
  /**
   * Navigate to previous question
   */
  const handlePreviousQuestion = useCallback(() => {
    setState(prevState => {
      if (prevState.currentQuestionIndex > 0) {
        return {
          ...prevState,
          currentQuestionIndex: prevState.currentQuestionIndex - 1
        };
      }
      return prevState;
    });
    
    saveTestProgress();
  }, [saveTestProgress]);
  
  /**
   * Load questions for a specific section
   */
  const loadQuestionsForSection = useCallback(async (sectionIndex: number, isBackground = false) => {
    console.log(`[DEBUG] Starting to load questions for section ${sectionIndex}, isBackground=${isBackground}`);
    
    // Set loading state if not background loading
    if (!isBackground) {
      setState(prevState => ({
        ...prevState,
        loading: {
          ...prevState.loading,
          questions: true
        }
      }));
      console.log(`[DEBUG] Set loading state to true for section ${sectionIndex}`);
    }
    
    // Track API response data - declared outside try/catch to make it accessible to all code paths
    let apiResponseData = {
      questions: [] as Question[],
      cached: false,
      cacheSource: 'none',
      isPersonalized: false
    };
    
    try {
      // Get the section data
      const section = state.sections[sectionIndex];
      if (!section) {
        throw new Error(`Section ${sectionIndex} not found`);
      }
      
      console.log(`[DEBUG] Loading questions for section: ${section.title} (${section.type})`);
      
      // If questions are already loaded, just update the state
      if (section.questions && section.questions.length > 0) {
        console.log(`[DEBUG] Questions already loaded for section ${sectionIndex}, count: ${section.questions.length}`);
        
        // Update state to reflect loaded questions
        setState(prevState => {
          const updatedSections = [...prevState.sections];
          updatedSections[sectionIndex] = {
            ...updatedSections[sectionIndex],
            loaded: true
          };
          
          return {
            ...prevState,
            sections: updatedSections,
            // Only update indices if not background loading
            ...(isBackground ? {} : {
              currentSectionIndex: sectionIndex,
              currentQuestionIndex: 0
            }),
            loading: {
              ...prevState.loading,
              questions: isBackground ? prevState.loading.questions : false
            }
          };
        });
        
        return true;
      }
      
      // Log telemetry
      errorHandler.logTelemetry('section_questions_loading_started', { sectionIndex });
      
      // Show loading toast if not background loading
      if (!isBackground) {
        toast({
          title: "Generating questions",
          description: "We're creating personalized questions for your assessment...",
          variant: "default",
          duration: 10000, // Longer duration
        });
      }
      
      // Load questions from API with retries
      let fetchedQuestions = await errorHandler.withRetry(
        async () => {
          // Get form data for personalization
          const formData = assessmentService.getFormData();
          const userId = assessmentService.getUserId();
          
          // Get section info
          const sectionType = section.type;
          const category = section.category || section.id;
          
          console.log(`Fetching questions from API for section: ${sectionType}, category: ${category}`);
          
          // Call the API endpoint directly instead of using local generator
          const controller = new AbortController();
          let timeoutId: NodeJS.Timeout | null = null;
          
          // Setup a proper timeout handler with a reasonable timeout
          const timeoutDuration = 25000; // 25 seconds timeout
          
          const setupTimeout = () => {
            // Clear any existing timeout
            if (timeoutId) clearTimeout(timeoutId);
            
            // Create a new timeout
            timeoutId = setTimeout(() => {
              console.warn(`API request timed out after ${timeoutDuration/1000} seconds, aborting`);
              try {
                // Provide a reason for abort to avoid "aborted without reason" errors
                controller.abort('timeout');
              } catch (e) {
                console.error('Error aborting fetch:', e);
              }
            }, timeoutDuration);
          };
          
          // Set up initial timeout
          setupTimeout();
          
          try {
            // Log API request for debugging
            console.log(`Sending API request to generate ${sectionType} questions for user: ${userId || 'anonymous'}`);
            
            // Use Promise.race to implement an additional timeout mechanism
            const fetchPromise = fetch('/api/questions/openai', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: sectionType,
                category,
                formData,
                userId,
                useOpenAI: true,
                personalizationRequired: true,
                realtime: true,
                bypassCache: false // Allow use of cached questions for faster loading
              }),
              signal: controller.signal
            });
            
            // Race between the fetch and a timeout
            const timeoutPromise = new Promise((_, reject) => {
              setTimeout(() => {
                reject(new Error(`API request timed out after ${timeoutDuration/1000} seconds`));
              }, timeoutDuration + 1000); // Add 1 second buffer
            });
            
            // Wait for either the fetch to complete or the timeout to trigger
            const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
            
            // Clear the timeout since the request completed
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            if (!response.ok) {
              const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
              throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const responseData = await response.json();
            console.log(`Received ${responseData.questions?.length || 0} questions from API`);
            
            // Store the response data in our outer variable for use later
            apiResponseData = {
              questions: responseData.questions || [],
              cached: responseData.cached || false,
              cacheSource: responseData.cacheSource || 'none',
              isPersonalized: responseData.isPersonalized || false
            };
            
            // Show appropriate toast based on question source
            if (!isBackground) {
              if (responseData.cached) {
                toast({
                  title: "Using cached questions",
                  description: `Loaded from ${responseData.cacheSource === 'file' ? 'saved file' : 'memory'} cache for faster assessment`,
                  variant: "default",
                  duration: 3000,
                });
              } else {
                toast({
                  title: "Questions ready",
                  description: "Your personalized questions have been generated",
                  variant: "default",
                  duration: 3000,
                });
              }
            }
            
            return responseData.questions || [];
          } catch (apiError) {
            // Clean up timeout if there was an error
            if (timeoutId) {
              clearTimeout(timeoutId);
              timeoutId = null;
            }
            
            console.error('API call failed:', apiError);
            
            // Handle abort errors specially to provide clearer error message
            if (apiError instanceof DOMException && apiError.name === 'AbortError') {
              console.warn('Request was aborted due to timeout or user cancellation');
              toast({
                title: "Taking too long",
                description: "Trying a different approach with local questions...",
                variant: "destructive",
                duration: 3000
              });
              
              // If aborted due to timeout, try emergency questions instead of retrying
              const emergencyQuestions = generateEmergencyQuestions(section.type, 10);
              console.log('Using emergency questions due to timeout:', emergencyQuestions.length);
              
              // Update our outer variable for the emergency scenario
              apiResponseData = {
                questions: emergencyQuestions,
                cached: false,
                cacheSource: 'emergency',
                isPersonalized: false
              };
              
              return emergencyQuestions;
            }
            
            // For connectivity errors, provide a clear error message
            if (apiError instanceof TypeError && apiError.message.includes('network')) {
              console.warn('Network connectivity issue detected');
              toast({
                title: "Network issue",
                description: "Using backup questions due to connectivity problems",
                variant: "destructive",
                duration: 3000
              });
              
              // Use emergency questions for network errors
              const emergencyQuestions = generateEmergencyQuestions(section.type, 10);
              console.log('Using emergency questions due to network error:', emergencyQuestions.length);
              
              // Update our outer variable for the emergency scenario
              apiResponseData = {
                questions: emergencyQuestions,
                cached: false,
                cacheSource: 'emergency',
                isPersonalized: false
              };
              
              return emergencyQuestions;
            }
            
            // For other errors, enhance the error for better debugging
            const enhancedError = new Error(
              `API call failed for section ${sectionType}: ${apiError instanceof Error ? apiError.message : String(apiError)}`
            );
            if (apiError instanceof Error && apiError.stack) {
              enhancedError.stack = apiError.stack;
            }
            
            // Log enhanced error for debugging
            console.error('Enhanced error details:', enhancedError);
            
            // Rethrow to let retry mechanism handle it
            throw enhancedError;
          }
        },
        {
          maxRetries: 2,
          onRetry: (attempt, error) => {
            console.log(`Retry attempt ${attempt} for API call:`, error);
            toast({
              title: "Retrying connection",
              description: `Having trouble loading questions. Retrying... (${attempt}/2)`,
              variant: "default",
              duration: 3000
            });
          }
        }).catch(() => {
          console.error('All retries failed, using emergency questions');
          toast({
            title: "Using backup questions",
            description: "Could not load questions from server. Using backup questions.",
            variant: "default",
            duration: 3000
          });
          
          // Return emergency questions as fallback when all retries fail
          const emergencyQuestions = generateEmergencyQuestions(section.type, 10);
          
          // Update our outer variable for the emergency scenario
          apiResponseData = {
            questions: emergencyQuestions,
            cached: false,
            cacheSource: 'emergency',
            isPersonalized: false
          };
          
          return emergencyQuestions;
        });
      
      // Validate and filter questions to ensure they match the section type
      if (fetchedQuestions && fetchedQuestions.length > 0) {
        // Filter out questions that don't match the section type
        // This prevents programming questions in aptitude sections and vice versa
        const validQuestions = fetchedQuestions.filter((q: Question) => {
          // For programming section, allow only programming questions
          if (section.type === 'programming') {
            // Strict check for programming-specific categories
            return q.category && ['algorithms', 'data structures', 'debugging', 'concepts'].includes(q.category.toLowerCase());
          }
          // For aptitude section, allow only aptitude questions
          else if (section.type === 'aptitude') {
            // Strict check for aptitude-specific categories
            return q.category && ['numerical', 'logical', 'pattern', 'problem-solving'].includes(q.category.toLowerCase());
          }
          // For employability section, allow only employability questions
          else if (section.type === 'employability') {
            // Strict check for employability-specific categories
            return q.category && ['communication', 'teamwork', 'professional', 'problem_solving', 'core', 'soft', 'leadership', 'domain'].includes(q.category.toLowerCase());
          }
          return false;
        });
        
        // Add a stricter filter for aptitude section to exclude programming-related content
        if (section.type === 'aptitude') {
          // Further filter out questions that contain programming code snippets in aptitude section
          const strictlyAptitudeQuestions = validQuestions.filter((q: Question) => {
            const questionText = q.question.toLowerCase();
            // Check if question contains programming code indicators
            const hasProgrammingCode = 
              questionText.includes('console.log') || 
              questionText.includes('var ') || 
              questionText.includes('function') || 
              questionText.includes('javascript') ||
              questionText.includes('code snippet');
            
            // Return true only for non-programming questions
            return !hasProgrammingCode;
          });
          
          console.log(`Strict aptitude filter: ${strictlyAptitudeQuestions.length} valid questions out of ${validQuestions.length} after removing programming content`);
          return strictlyAptitudeQuestions.length >= 5 ? strictlyAptitudeQuestions : validQuestions;
        }
        
        console.log(`Filtered questions: ${validQuestions.length} valid questions out of ${fetchedQuestions.length} total`);
        
        // If we don't have enough valid questions after strict filtering, generate emergency ones
        if (validQuestions.length < 10) {
          console.warn(`Not enough valid questions for ${section.type} section after filtering (${validQuestions.length}), generating emergency questions`);
          const emergencyQuestions = generateEmergencyQuestions(section.type, 10);
          fetchedQuestions = [...validQuestions, ...emergencyQuestions].slice(0, 10);
        } else {
          fetchedQuestions = validQuestions;
        }
      }
      
      // If we still don't have enough questions after retries and filtering, generate emergency questions
      if (!fetchedQuestions || fetchedQuestions.length < 10) {
        console.warn(`Failed to get enough valid questions (got ${fetchedQuestions?.length || 0}), generating emergency questions`);
        const emergencyQuestions = generateEmergencyQuestions(section.type, 10);
        
        // If we have some valid questions, combine them with emergency ones
        if (fetchedQuestions && fetchedQuestions.length > 0) {
          console.log(`Combining ${fetchedQuestions.length} valid questions with emergency questions`);
          fetchedQuestions = [...fetchedQuestions, ...emergencyQuestions].slice(0, 10);
        } else {
          fetchedQuestions = emergencyQuestions;
        }
        
        if (!isBackground) {
          toast({
            title: "Using backup questions",
            description: "We're using offline questions due to connectivity issues.",
            variant: "default",
            duration: 5000,
          });
        }
      }
      
      // Ensure we have exactly 10 questions for each section
      if (fetchedQuestions.length > 10) {
        fetchedQuestions = fetchedQuestions.slice(0, 10);
      } else if (fetchedQuestions.length < 10) {
        // If still not enough questions, add more emergency questions to reach exactly 10
        const additionalEmergencyQuestions = generateEmergencyQuestions(section.type, 10 - fetchedQuestions.length);
        fetchedQuestions = [...fetchedQuestions, ...additionalEmergencyQuestions];
      }
      
      console.log(`Final question count for ${section.type} section: ${fetchedQuestions.length}`);
      
      // Update state with new questions
      setState(prevState => {
        const updatedSections = [...prevState.sections];
        
        // Add final verification that all questions have appropriate categories for this section
        const sectionType = section.type;
        console.log(`Final verification of question categories for section: ${sectionType}`);
        
        const verifiedQuestions = fetchedQuestions.map((question: Question) => {
          const defaultCategories = {
            'aptitude': 'numerical',
            'programming': 'concepts',
            'employability': 'professional'
          };
          
          const validCategories = {
            'aptitude': ['numerical', 'logical', 'pattern', 'problem-solving'],
            'programming': ['algorithms', 'data structures', 'debugging', 'concepts'],
            'employability': ['communication', 'teamwork', 'professional', 'problem_solving', 'core', 'soft', 'leadership', 'domain']
          };
          
          // Check if the category is missing or invalid for this section type
          const needsCategoryFix = !question.category || 
            (section.type === 'aptitude' && !validCategories.aptitude.includes(question.category.toLowerCase())) ||
            (section.type === 'programming' && !validCategories.programming.includes(question.category.toLowerCase())) ||
            (section.type === 'employability' && !validCategories.employability.includes(question.category.toLowerCase()));
          
          if (needsCategoryFix) {
            console.warn(`Question has invalid category "${question.category}" for section ${sectionType}, assigning default: ${defaultCategories[sectionType as keyof typeof defaultCategories]}`);
            return {
              ...question,
              category: defaultCategories[sectionType as keyof typeof defaultCategories] || sectionType
            };
          }
          return question;
        });
        
        updatedSections[sectionIndex] = {
          ...updatedSections[sectionIndex],
          questions: verifiedQuestions,
          loaded: true
        };
        
        return {
          ...prevState,
          sections: updatedSections,
          // Only update indices if not background loading
          ...(isBackground ? {} : {
            currentSectionIndex: sectionIndex,
            currentQuestionIndex: 0
          }),
          loading: {
            ...prevState.loading,
            questions: isBackground ? prevState.loading.questions : false
          },
          // Store cache source information from API response
          // Fixed: Use the outer apiResponseData variable that's always defined
          cacheSource: apiResponseData.cacheSource
        };
      });
      
      // Log success
      errorHandler.logTelemetry('section_questions_loading_complete', { 
        sectionIndex, 
        questionCount: fetchedQuestions.length,
        isBackground
      });
      
      // Show success toast if not background loading
      if (!isBackground) {
        toast({
          title: "Questions ready",
          description: "Your personalized questions have been loaded successfully.",
          variant: "default",
          duration: 3000,
        });
      }
      
      return true;
    } catch (error) {
      // Log failure
      errorHandler.logError(
        errorHandler.createError(
          `Failed to load questions for section ${sectionIndex}: ${error instanceof Error ? error.message : String(error)}`,
          'question-loading-failed',
          { sectionIndex }
        )
      );
      
      // Generate emergency questions as last resort
      const section = state.sections[sectionIndex];
      if (section) {
        console.warn(`Using emergency questions for ${section.type} section due to error: ${error instanceof Error ? error.message : String(error)}`);
        const emergencyQuestions = generateEmergencyQuestions(section.type, 10);
        console.log(`Generated ${emergencyQuestions.length} emergency questions for section ${section.type}`);
        
        // Update our outer variable for the emergency scenario
        apiResponseData = {
          questions: emergencyQuestions,
          cached: false,
          cacheSource: 'emergency',
          isPersonalized: false
        };
        
        // Verify emergency questions have correct categories
        const validEmergencyQuestions = emergencyQuestions.filter(q => {
          if (!q.category) return false;
          
          if (section.type === 'aptitude') {
            return ['numerical', 'logical', 'pattern', 'problem-solving'].includes(q.category.toLowerCase());
          }
          else if (section.type === 'programming') {
            return ['algorithms', 'data structures', 'debugging', 'concepts'].includes(q.category.toLowerCase());
          }
          else if (section.type === 'employability') {
            return ['communication', 'teamwork', 'professional', 'problem_solving', 'core', 'soft', 'leadership', 'domain'].includes(q.category.toLowerCase());
          }
          return false;
        });
        
        if (validEmergencyQuestions.length < emergencyQuestions.length) {
          console.warn(`Some emergency questions had invalid categories: ${emergencyQuestions.length - validEmergencyQuestions.length} removed`);
        }
        
        // Update state with emergency questions
        setState(prevState => {
          const updatedSections = [...prevState.sections];
          updatedSections[sectionIndex] = {
            ...updatedSections[sectionIndex],
            questions: validEmergencyQuestions.length >= 10 ? validEmergencyQuestions : emergencyQuestions,
            loaded: true
          };
          
          return {
            ...prevState,
            sections: updatedSections,
            // Only update indices if not background loading
            ...(isBackground ? {} : {
              currentSectionIndex: sectionIndex,
              currentQuestionIndex: 0
            }),
            loading: {
              ...prevState.loading,
              questions: isBackground ? prevState.loading.questions : false
            },
            // Use the emergency cache source
            cacheSource: 'emergency'
          };
        });
        
        // Only show error toast if not background loading
        if (!isBackground) {
          toast({
            title: "Using offline questions",
            description: "We're using stored questions due to connectivity issues.",
            variant: "default",
            duration: 5000,
          });
        }
        
        return true;
      }
      
      // Only show error toast if not background loading and we couldn't generate emergency questions
      if (!isBackground) {
        toast({
          title: "Error",
          description: "We couldn't load your questions. Please try again or contact support.",
          variant: "destructive",
          duration: 5000,
        });
        
        // Reset loading state
        setState(prevState => ({
          ...prevState,
          loading: {
            ...prevState.loading,
            questions: false
          }
        }));
      }
      
      return false;
    }
  }, [state.sections]);
  
  /**
   * Complete the current section and move to next
   */
  const completeSection = useCallback(async () => {
    setState(prevState => ({
      ...prevState,
      loading: {
        ...prevState.loading,
        submitting: true
      }
    }));
    
    try {
      // Mark current section as completed
      setState(prevState => {
        const updatedSections = [...prevState.sections];
        if (updatedSections[prevState.currentSectionIndex]) {
          updatedSections[prevState.currentSectionIndex] = {
            ...updatedSections[prevState.currentSectionIndex],
            completed: true
          };
        }
        
        return {
          ...prevState,
          sections: updatedSections
        };
      });
      
      // Save progress
      saveTestProgress();
      
      // Check if this was the last section
      if (state.currentSectionIndex >= state.sections.length - 1) {
        handleTestComplete();
      } else {
        // Try to load next section
        const nextSectionIndex = state.currentSectionIndex + 1;
        await loadQuestionsForSection(nextSectionIndex);
      }
    } catch (error) {
      console.error('Error submitting section:', error);
      toast({
        title: "Error",
        description: 'Failed to submit section. Please try again.',
        variant: "destructive",
      });
    } finally {
      setState(prevState => ({
        ...prevState,
        loading: {
          ...prevState.loading,
          submitting: false
        }
      }));
    }
  }, [loadQuestionsForSection, saveTestProgress, state.currentSectionIndex, state.sections.length]);
  
  /**
   * Complete the entire test
   */
  const handleTestComplete = useCallback(async () => {
    setState(prevState => ({
      ...prevState,
      loading: {
        ...prevState.loading,
        submitting: true
      }
    }));
    
    try {
      // Calculate scores
      const scores = scoreCalculator.calculateScores(state.sections, state.userAnswers);
      
      // Generate detailed analysis
      const analysis = scoreCalculator.generateDetailedAnalysis(state.sections, state.userAnswers);
      
      // Create test data
      const testData = {
        scores,
        answers: state.userAnswers,
        analysis,
        timestamp: new Date().toISOString(),
        userId: assessmentService.getUserId()
      };
      
      console.log('Test completed. Calculating final scores:', testData);
      
      // Mark test as completed
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem('debugshala_test_completed', 'true');
        storage.setItem('debugshala_assessment_scores', JSON.stringify(scores));
        
        // Store full results
        storage.setItem('assessmentResult', JSON.stringify(testData));
      }
      
      // Try to generate assessment report
      try {
        console.log('Generating assessment report...');
        const report = await assessmentService.generateAssessmentReport(scores);
        console.log('Assessment report generated successfully');
        
        // Store report in localStorage
        if (storage) {
          storage.setItem('assessmentResult', JSON.stringify(report));
          console.log('Assessment result saved to localStorage');
        }
      } catch (reportError) {
        console.error('Error generating report:', reportError);
        // Continue with basic scores - already saved above
      }
      
      // Navigate to results page
      router.push('/assessment/results');
    } catch (error) {
      console.error('Error completing test:', error);
      toast({
        title: "Error",
        description: 'An error occurred while finishing your assessment. Your scores have been saved temporarily.',
        variant: "destructive",
      });
      
      // Try to store minimal scores locally as backup
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem('debugshala_test_completed', 'true');
        storage.setItem('debugshala_assessment_scores', JSON.stringify({}));
      }
      
      // Redirect to results page with minimal data
      router.push('/assessment/results');
    } finally {
      setState(prevState => ({
        ...prevState,
        loading: {
          ...prevState.loading,
          submitting: false
        }
      }));
    }
  }, [router, state.sections, state.userAnswers]);
  
  /**
   * Initialize the assessment
   */
  const initializeAssessment = useCallback(async () => {
    // Check if test is already completed to prevent resubmission on refresh
    const checkCompletionStatus = () => {
      // Use the assessment service method to check if test is completed
      if (assessmentService.isTestCompleted()) {
        console.log('Test already completed, redirecting to completion page');
        router.push('/assessment/complete');
        return true;
      }
      
      return false;
    };
    
    setState(prevState => ({
      ...prevState,
      loading: {
        ...prevState.loading,
        initial: true
      }
    }));
    
    try {
      // Skip initialization if test is already completed
      if (checkCompletionStatus()) {
        return;
      }
      
      // Try to load test progress from localStorage first
      const progressLoaded = loadTestProgress();
      
      if (!progressLoaded) {
        // Only initialize from scratch if no progress was loaded
        const formData = assessmentService.getFormData();
        const storage = getLocalStorage();
        
        // Check if form data is available
        if (!formData) {
          console.warn('Form data not available - checking if we should redirect to form');
          
          // Check if this is an intentional restart or first time
          const hasAttemptedTest = storage?.getItem('debugshala_test_attempted');
          
          if (!hasAttemptedTest) {
            console.log('No form data available and no previous test attempt - redirecting to assessment form');
            toast({
              title: "Information Needed",
              description: "Please complete your profile first before taking the assessment.",
              variant: "default",
            });
            router.push('/assessment');
            return;
          } else {
            console.log('Previous test attempt detected - continuing with non-personalized assessment');
            // We'll continue with non-personalized questions
            toast({
              title: "Limited Personalization",
              description: "Your profile data is not available. The assessment will use generic questions.",
              variant: "default",
            });
          }
        }
        
        // Set user name
        if (formData) {
          setState(prevState => ({
            ...prevState,
            userName: formData.name
          }));
        } else if (storage) {
          const storedName = storage.getItem('debugshala_user_name');
          if (storedName) {
            setState(prevState => ({
              ...prevState,
              userName: storedName
            }));
          }
        }

        // Mark that a test has been attempted
        if (storage) {
          storage.setItem('debugshala_test_attempted', 'true');
        }

        // Load questions for the first section
        await loadQuestionsForSection(0);
      }
      
      // Initialize completed, update state
      setState(prevState => ({
        ...prevState,
        loading: {
          ...prevState.loading,
          initial: false
        }
      }));
    } catch (error) {
      console.error('Error initializing assessment:', error);
      
      // Determine more specific error message
      let errorMessage = 'Failed to initialize assessment. Please try refreshing the page.';
      
      if (error instanceof Error) {
        if (error.message.includes('form data') || error.message.includes('Form data')) {
          errorMessage = 'Your profile information is required. Redirecting to the profile form...';
          // Redirect to assessment form after displaying message
          setTimeout(() => router.push('/assessment'), 2000);
        } else if (error.message.includes('network') || error.message.includes('failed to fetch')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
      
      // Update state to reflect initialization failure
      setState(prevState => ({
        ...prevState,
        loading: {
          ...prevState.loading,
          initial: false
        }
      }));
    }
  }, [loadQuestionsForSection, loadTestProgress, router]);
  
  /**
   * Calculate overall progress
   */
  const calculateOverallProgress = useCallback(() => {
    if (state.sections.length === 0) return 0;
    
    // Count total questions across all sections
    const totalQuestions = state.sections.reduce((sum, section) => sum + section.questions.length, 0);
    if (totalQuestions === 0) return 0;
    
    // Count answered questions
    const answeredCount = Object.keys(state.userAnswers).length;
    
    // Calculate progress based on answered questions
    return answeredCount / totalQuestions;
  }, [state.sections, state.userAnswers]);
  
  // Format time display
  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);
  
  // Return state and actions
  return {
    // State
    state,
    currentSection,
    currentQuestion,
    totalSections,
    totalQuestions,
    overallProgress: calculateOverallProgress(),
    formattedTime: formatTime(state.timeRemaining),
    
    // Actions
    setState,
    initializeAssessment,
    saveTestProgress,
    loadTestProgress,
    handleAnswerSelect,
    handleNextQuestion,
    handlePreviousQuestion,
    loadQuestionsForSection,
    completeSection,
    handleTestComplete
  };
}

export default useAssessmentState; 