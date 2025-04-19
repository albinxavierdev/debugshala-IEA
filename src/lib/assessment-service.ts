import { FormData, AssessmentResult, Question, QuestionType, EmployabilityCategory } from '@/types/assessment';
import { supabase } from './supabase';
import { v4 as uuidv4 } from 'uuid';

// Helper to safely access localStorage (only in browser)
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

class AssessmentService {
  private static instance: AssessmentService;
  private formData: FormData | null = null;
  private assessmentResults: AssessmentResult | null = null;
  private userId: string | null = null;

  private constructor() {
    // Safely access localStorage only in browser environment
    const storage = getLocalStorage();
    if (storage) {
      this.userId = storage.getItem('debugshala_user_id') || null;
    }
  }

  static getInstance(): AssessmentService {
    if (!AssessmentService.instance) {
      AssessmentService.instance = new AssessmentService();
    }
    return AssessmentService.instance;
  }

  async setFormData(data: FormData) {
    this.formData = data;
    
    try {
      // Generate a user ID if not exists
      if (!this.userId) {
        this.userId = uuidv4();
        const storage = getLocalStorage();
        if (storage) {
          storage.setItem('debugshala_user_id', this.userId);
        }
      }
      
      // Always save to localStorage first as a reliable backup
      const storage = getLocalStorage();
      if (storage) {
        try {
          storage.setItem('debugshala_user_data', JSON.stringify(data));
          console.log('User data saved to localStorage successfully');
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
      }
      
      // Consolidated approach for storing user data in database
      try {
        console.log('Storing user data in database with userId:', this.userId);
        
        // Create a standardized user data object
        const userData = {
          id: this.userId,
          full_name: data.name || 'Anonymous',
          email: data.email || `user_${Date.now()}@debugshala.com`,
          phone: data.phone || '',
          college: data.collegeName || '',
          graduation_year: data.graduationYear || '',
          degree: data.degree || '',
          interested_domains: Array.isArray(data.interestedDomains) 
            ? data.interestedDomains 
            : [],
          created_at: new Date().toISOString()
        };
        
        // Upsert to handle both new users and updates
        const { error } = await supabase
          .from('users')
          .upsert(userData, { onConflict: 'id' });
        
        if (error) {
          console.error('Error storing user data in database:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details
          });
        } else {
          console.log('User data stored successfully in database');
        }
      } catch (err) {
        console.error('Exception storing user data:', err);
      }
    } catch (error) {
      console.error('Error in setFormData:', error);
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
    }
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

    const prompt = this.buildPersonalizedPrompt(type, category);
    
    try {
      const response = await fetch('/api/questions/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          category,
          formData: this.formData,
          prompt,
          userId: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to generate questions: ${response.status}`);
      }

      const data = await response.json();
      
      // Store question set in Supabase with better error handling
      if (this.userId && data.questions && Array.isArray(data.questions)) {
        try {
          const questionSetId = uuidv4();
          const questionSetData = {
            id: questionSetId,
            user_id: this.userId,
            type: type,
            category: category || null,
            questions: data.questions,
            created_at: new Date().toISOString()
          };
          
          console.log('Storing question set in database:', {
            userId: this.userId,
            type,
            category,
            questionCount: data.questions.length
          });
          
          // First check if 'question_sets' table exists
          const { error: checkError } = await supabase
            .from('question_sets')
            .select('id')
            .limit(1);
            
          if (checkError && checkError.code === '42P01') { // Table doesn't exist
            console.log('question_sets table does not exist, using assessments table instead');
            
            // Store questions in assessments table instead
            const assessmentData = {
              id: questionSetId,
              user_id: this.userId,
              domains: category ? [category] : [],
              questions: data.questions,
              assessment_id: `questions-${type}-${Date.now()}`,
              created_at: new Date().toISOString()
            };
            
            const { error } = await supabase
              .from('assessments')
              .insert(assessmentData);
              
            if (error) {
              console.error('Error storing questions in assessments table:', error);
            } else {
              console.log('Questions stored successfully in assessments table');
            }
          } else {
            // Use question_sets table
            const { error } = await supabase
              .from('question_sets')
              .insert(questionSetData);

            if (error) {
              console.error('Error storing question set in database:', error);
              console.error('Error details:', {
                code: error.code,
                message: error.message,
                details: error.details
              });
            } else {
              console.log('Question set stored successfully in database');
            }
          }
        } catch (err) {
          console.error('Exception storing question set:', err);
        }
      }

      return data.questions || [];
    } catch (error) {
      console.error('Error generating questions:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      throw error;
    }
  }

  private buildPersonalizedPrompt(type: QuestionType, category?: EmployabilityCategory): string {
    const { name, degree, interestedDomains } = this.formData!;
    
    let prompt = `Generate ${type} questions for a candidate named ${name}`;
    
    if (degree) {
      prompt += ` with a degree in ${degree}`;
    }
    
    if (interestedDomains.length > 0) {
      prompt += ` interested in: ${interestedDomains.join(', ')}.`;
    }
    
    if (type === 'employability' && category) {
      prompt += ` Focus on ${category} skills assessment.`;
    }
    
    return prompt;
  }

  async generateAssessmentReport(scores: AssessmentResult['scores'], userAnswers?: Record<string, string>, questions?: any[]): Promise<AssessmentResult> {
    if (!this.formData) {
      throw new Error('Form data not found');
    }

    try {
      // Prepare a complete assessment data structure
      const assessment: Partial<AssessmentResult> = {
        userId: this.userId || uuidv4(),
        timestamp: new Date().toISOString(),
        formData: this.formData,
        scores,
        type: "aptitude" as QuestionType,
      };

      console.log('Generating assessment report for user:', this.userId);
      
      const response = await fetch('/api/assessment/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: this.formData,
          scores,
          userId: this.userId,
          userAnswers, // Add user answers for accurate scoring
          questions    // Add questions for accurate report generation
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to generate report: ${response.status} - ${errorText}`);
      }

      const reportData = await response.json();
      // Store report in class property for retrieval later
      this.assessmentResults = reportData;
      
      // Always save to localStorage first for backup
      const storage = getLocalStorage();
      if (storage) {
        try {
          storage.setItem('debugshala_assessment_result', JSON.stringify(reportData));
          console.log('Assessment results saved to localStorage successfully');
        } catch (storageError) {
          console.error('Error saving results to localStorage:', storageError);
        }
      }
      
      // Store assessment results in database with unified approach
      if (this.userId) {
        try {
          console.log('Storing assessment results in database for user:', this.userId);
          
          // Create an assessment record first
          const assessmentId = uuidv4();
          const assessmentRecord = {
            id: assessmentId,
            user_id: this.userId,
            domains: Array.isArray(this.formData.interestedDomains) 
              ? this.formData.interestedDomains 
              : [],
            questions: questions || [],
            assessment_id: assessmentId, // Used as a reference
            created_at: new Date().toISOString()
          };
          
          const { error: assessmentError } = await supabase
            .from('assessments')
            .insert(assessmentRecord);
            
          if (assessmentError) {
            console.error('Error storing assessment record:', assessmentError);
          } else {
            console.log('Assessment record stored successfully with ID:', assessmentId);
            
            // Then create a results record linked to the assessment
            const resultsRecord = {
              id: uuidv4(),
              assessment_id: assessmentId,
              user_id: this.userId,
              score: typeof reportData.finalScore?.overall === 'number' 
                ? reportData.finalScore.overall 
                : Math.round((scores.aptitude + scores.programming + 
                  (typeof scores.employability === 'object' 
                    ? Object.values(scores.employability).reduce((sum, val) => sum + val, 0) / Object.values(scores.employability).length 
                    : scores.employability)
                  ) / 3),
              analysis: JSON.stringify(reportData),
              strengths: reportData.detailedAnalysis?.strengths || [],
              areas_for_improvement: reportData.detailedAnalysis?.areasForImprovement || [],
              report_id: uuidv4(),
              time_spent: reportData.timestamp || new Date().toISOString(),
              created_at: new Date().toISOString()
            };
            
            const { error: resultsError } = await supabase
              .from('results')
              .insert(resultsRecord);
              
            if (resultsError) {
              console.error('Error storing results record:', resultsError);
            } else {
              console.log('Results stored successfully');
              
              // Store individual answers if available
              if (userAnswers && questions) {
                try {
                  const answerRecords = Object.entries(userAnswers).map(([questionId, answer]) => {
                    const question = questions.find(q => q.id === questionId);
                    return {
                      id: uuidv4(),
                      assessment_id: assessmentId,
                      user_id: this.userId,
                      question_id: questionId,
                      selected_answer: answer,
                      is_correct: question ? answer === question.correctAnswer : null,
                      created_at: new Date().toISOString()
                    };
                  });
                  
                  // Batch insert answers
                  if (answerRecords.length > 0) {
                    const { error: answersError } = await supabase
                      .from('answers')
                      .insert(answerRecords);
                      
                    if (answersError) {
                      console.error('Error storing answers:', answersError);
                    } else {
                      console.log(`${answerRecords.length} answers stored successfully`);
                    }
                  }
                } catch (answersError) {
                  console.error('Error processing answers:', answersError);
                }
              }
            }
          }
        } catch (dbError) {
          console.error('Error in database storage:', dbError);
        }
      } else {
        console.warn('Not storing assessment results: missing userId');
      }
      
      return reportData;
    } catch (error) {
      console.error('Error generating report:', error);
      // More detailed error logging
      if (error instanceof Error) {
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      // Try to load from localStorage as last resort
      const storage = getLocalStorage();
      if (storage) {
        const savedResult = storage.getItem('debugshala_assessment_result');
        if (savedResult) {
          try {
            const parsedResult = JSON.parse(savedResult);
            console.log('Retrieved assessment result from localStorage');
            return parsedResult;
          } catch (parseError) {
            console.error('Error parsing saved result:', parseError);
          }
        }
      }
      
      throw error;
    }
  }

  getAssessmentResults(): AssessmentResult | null {
    return this.assessmentResults;
  }

  clearAssessmentData() {
    this.formData = null;
    this.assessmentResults = null;
  }
}

export const assessmentService = AssessmentService.getInstance(); 