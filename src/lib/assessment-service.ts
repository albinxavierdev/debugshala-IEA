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
      
      // Store in Supabase
      const { error } = await supabase
        .from('users')
        .upsert({
          id: this.userId,
          name: data.name,
          email: data.email,
          phone: data.phone,
          degree: data.degree,
          graduation_year: data.graduationYear,
          college_name: data.collegeName,
          interested_domains: data.interestedDomains,
          created_at: new Date().toISOString(),
        });

      if (error) {
        console.error('Error storing user data in Supabase:', error);
      }
    } catch (error) {
      console.error('Error storing user data:', error);
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
      const response = await fetch('/api/questions/gemini', {
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
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      
      // Store question set in Supabase
      if (this.userId) {
        const { error } = await supabase
          .from('question_sets')
          .insert({
            user_id: this.userId,
            type,
            category: category || null,
            questions: data.questions,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error storing questions in Supabase:', error);
        }
      }
      
      return data.questions;
    } catch (error) {
      console.error('Error generating questions:', error);
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

  async generateAssessmentReport(scores: AssessmentResult['scores']): Promise<AssessmentResult> {
    if (!this.formData) {
      throw new Error('Form data not found');
    }

    try {
      const response = await fetch('/api/assessment/report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formData: this.formData,
          scores,
          userId: this.userId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate report');
      }

      const report = await response.json();
      this.assessmentResults = report;
      
      // Store report in Supabase
      if (this.userId) {
        const { error } = await supabase
          .from('assessment_results')
          .insert({
            user_id: this.userId,
            results: report,
            created_at: new Date().toISOString(),
          });

        if (error) {
          console.error('Error storing assessment results in Supabase:', error);
        }
      }
      
      return report;
    } catch (error) {
      console.error('Error generating report:', error);
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