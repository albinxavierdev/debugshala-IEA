import { FormData, AssessmentResult, EmployabilityScores } from '../types/assessment';
import { z } from 'zod';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates user form data before database operations
 * @param data The form data to validate
 * @throws ValidationError if data is invalid
 */
export function validateFormData(data: FormData): void {
  // Validate required fields
  if (!data.name || data.name.trim() === '') {
    throw new ValidationError('Name is required');
  }
  
  if (!data.email || data.email.trim() === '') {
    throw new ValidationError('Email is required');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new ValidationError('Invalid email format');
  }
  
  // Validate phone number if provided
  if (data.phone && data.phone.trim() !== '') {
    // Basic phone validation - allows various formats but requires at least 7 digits
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      throw new ValidationError('Invalid phone number format');
    }
  }
  
  // Validate interested domains
  if (!Array.isArray(data.interestedDomains) || data.interestedDomains.length === 0) {
    throw new ValidationError('At least one domain of interest is required');
  }
  
  // Additional validations can be added as needed
}

/**
 * Validates assessment scores before generating reports
 * @param scores The scores to validate
 * @throws ValidationError if scores are invalid
 */
export function validateScores(scores: any): void {
  if (!scores) {
    throw new ValidationError('Scores are required');
  }
  
  // Validate required score sections
  if (typeof scores.aptitude !== 'number' || scores.aptitude < 0 || scores.aptitude > 100) {
    throw new ValidationError('Valid aptitude score is required (0-100)');
  }
  
  if (typeof scores.programming !== 'number' || scores.programming < 0 || scores.programming > 100) {
    throw new ValidationError('Valid programming score is required (0-100)');
  }
  
  // Validate employability scores if present
  if (scores.employability) {
    if (typeof scores.employability !== 'object') {
      throw new ValidationError('Employability scores must be an object');
    }
    
    // Check each employability subcategory
    const requiredCategories = ['core', 'soft', 'professional'];
    for (const category of requiredCategories) {
      if (typeof scores.employability[category] !== 'number' || 
          scores.employability[category] < 0 || 
          scores.employability[category] > 100) {
        throw new ValidationError(`Valid ${category} score is required (0-100)`);
      }
    }
  }
}

/**
 * Enhanced sanitization function to protect against various injection attacks
 * @param input The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: URLs
    .replace(/data:[^,]*,/gi, 'data:,')
    // Remove potentially dangerous attributes
    .replace(/\b(href|action|formaction|src|data|classid|codebase)\s*=\s*(['"])(.*?)\2/gi, '')
    // Remove Unicode control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Normalize quotes
    .replace(/[""]/g, '"')
    // Remove SQL injection patterns
    .replace(/(\b)(OR|AND|SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|DECLARE)(\b)/gi, (match) => match.toLowerCase())
    .trim();
}

/**
 * Sanitizes an array of strings
 * @param items Array of strings to sanitize
 * @returns Array of sanitized strings
 */
export function sanitizeArray(items: string[]): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item: string) => sanitizeInput(item)).filter(Boolean);
}

/**
 * Sanitizes all properties of an object recursively
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = sanitizeInput(value) as any;
      } else if (Array.isArray(value) && value.every((item: unknown) => typeof item === 'string')) {
        result[key] = sanitizeArray(value) as any;
      } else if (value && typeof value === 'object') {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
}

// Define validation schema for form data
const formDataSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string(),
  degree: z.string(),
  graduationYear: z.string(),
  collegeName: z.string(),
  interestedDomains: z.array(z.string()),
  preferredLanguage: z.string().optional()
});

// Define validation schema for employability scores
const employabilityScoresSchema = z.object({
  core: z.number(),
  soft: z.number(),
  professional: z.number(),
  communication: z.number().optional(),
  teamwork: z.number().optional(),
  leadership: z.number().optional(),
  problem_solving: z.number().optional(),
  domain: z.number().optional()
});

// Define validation schema for section details
const baseSectionSchema = z.object({
  totalQuestions: z.number(),
  correctAnswers: z.number(),
  accuracy: z.number(),
  strengths: z.array(z.string()),
  weakAreas: z.array(z.string())
});

const employabilitySectionSchema = baseSectionSchema.extend({
  softSkillsScore: z.number(),
  professionalSkillsScore: z.number(),
  aiLiteracyScore: z.number()
});

// Define validation schema for recommendations
const recommendationsSchema = z.object({
  skills: z.array(z.string()),
  courses: z.array(z.string()),
  careerPaths: z.array(z.string()),
  aptitudeResources: z.object({
    books: z.array(z.string()),
    platforms: z.array(z.string()),
    practiceGuide: z.string()
  }),
  programmingResources: z.object({
    courses: z.array(z.string()),
    platforms: z.array(z.string()),
    topicsToStudy: z.array(z.string())
  }),
  employabilityResources: z.object({
    courses: z.array(z.string()),
    activities: z.array(z.string())
  }),
  nextAction: z.string()
});

// Define validation schema for detailed analysis
const detailedAnalysisSchema = z.object({
  strengths: z.array(z.string()),
  areasForImprovement: z.array(z.string()),
  skillGaps: z.array(z.string()),
  industryComparison: z.object({
    aptitude: z.number(),
    programming: z.number(),
    softSkills: z.number(),
    overallGap: z.number()
  })
});

// Define validation schema for candidate info
const candidateInfoSchema = z.object({
  name: z.string(),
  profile: z.string(),
  interests: z.array(z.string())
}).catchall(z.any());

// Define validation schema for test summary
const testSummarySchema = z.object({
  totalScore: z.number(),
  aptitudeScore: z.number(),
  programmingScore: z.number(),
  employabilityScore: z.number(),
  strengthAreas: z.array(z.string()),
  improvementAreas: z.array(z.string())
}).catchall(z.any());

// Define validation schema for final score
const finalScoreSchema = z.object({
  outcome: z.enum(['Pass', 'Not Qualified']),
  skillReadinessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  nextSteps: z.array(z.string())
}).catchall(z.any());

// Define validation schema for assessment result
const assessmentSchema = z.object({
  userId: z.string(),
  timestamp: z.string(),
  formData: formDataSchema,
  scores: z.object({
    aptitude: z.number(),
    programming: z.number(),
    employability: employabilityScoresSchema,
    total: z.number(),
    percentile: z.number(),
    readinessScore: z.number()
  }),
  sectionDetails: z.object({
    aptitude: baseSectionSchema,
    programming: baseSectionSchema,
    employability: employabilitySectionSchema
  }),
  outcome: z.enum(['Pass', 'Not Qualified']),
  skillReadinessLevel: z.enum(['Beginner', 'Intermediate', 'Advanced']),
  recommendations: recommendationsSchema,
  detailedAnalysis: detailedAnalysisSchema,
  candidateInfo: candidateInfoSchema.optional(),
  testSummary: testSummarySchema.optional(),
  finalScore: finalScoreSchema.optional()
});

export function validateAndTransformReport(data: unknown): AssessmentResult {
  try {
    // First pass: validate the basic structure
    const validatedData = assessmentSchema.parse(data);
    
    // Second pass: apply business rules and transformations
    const transformedData: AssessmentResult = {
      ...validatedData,
      // Round all numeric scores to 2 decimal places
      scores: {
        ...validatedData.scores,
        aptitude: Math.round(validatedData.scores.aptitude * 100) / 100,
        programming: Math.round(validatedData.scores.programming * 100) / 100,
        total: Math.round(validatedData.scores.total * 100) / 100,
        percentile: Math.round(validatedData.scores.percentile * 100) / 100,
        readinessScore: Math.round(validatedData.scores.readinessScore * 100) / 100,
        employability: Object.entries(validatedData.scores.employability).reduce<EmployabilityScores>((acc, [key, value]: [string, unknown]) => ({
          ...acc,
          [key]: typeof value === 'number' ? Math.round(value * 100) / 100 : value
        }), {} as EmployabilityScores)
      },
      // Ensure sectionDetails accuracies are rounded
      sectionDetails: {
        ...validatedData.sectionDetails,
        aptitude: {
          ...validatedData.sectionDetails.aptitude,
          accuracy: Math.round(validatedData.sectionDetails.aptitude.accuracy * 100) / 100
        },
        programming: {
          ...validatedData.sectionDetails.programming,
          accuracy: Math.round(validatedData.sectionDetails.programming.accuracy * 100) / 100
        },
        employability: {
          ...validatedData.sectionDetails.employability,
          accuracy: Math.round(validatedData.sectionDetails.employability.accuracy * 100) / 100,
          softSkillsScore: Math.round(validatedData.sectionDetails.employability.softSkillsScore * 100) / 100,
          professionalSkillsScore: Math.round(validatedData.sectionDetails.employability.professionalSkillsScore * 100) / 100,
          aiLiteracyScore: Math.round(validatedData.sectionDetails.employability.aiLiteracyScore * 100) / 100
        }
      },
      // Ensure industry comparison scores are rounded
      detailedAnalysis: {
        ...validatedData.detailedAnalysis,
        industryComparison: {
          ...validatedData.detailedAnalysis.industryComparison,
          aptitude: Math.round(validatedData.detailedAnalysis.industryComparison.aptitude * 100) / 100,
          programming: Math.round(validatedData.detailedAnalysis.industryComparison.programming * 100) / 100,
          softSkills: Math.round(validatedData.detailedAnalysis.industryComparison.softSkills * 100) / 100,
          overallGap: Math.round(validatedData.detailedAnalysis.industryComparison.overallGap * 100) / 100
        }
      }
    };

    // Additional validation for test summary if present
    if (transformedData.testSummary) {
      transformedData.testSummary = {
        ...transformedData.testSummary,
        totalScore: Math.round(transformedData.testSummary.totalScore * 100) / 100,
        aptitudeScore: Math.round(transformedData.testSummary.aptitudeScore * 100) / 100,
        programmingScore: Math.round(transformedData.testSummary.programmingScore * 100) / 100,
        employabilityScore: Math.round(transformedData.testSummary.employabilityScore * 100) / 100
      };
    }

    return transformedData;
  } catch (error) {
    console.error('Validation error:', error);
    throw new Error('Invalid assessment report data');
  }
}

export function isValidReport(data: unknown): boolean {
  try {
    assessmentSchema.parse(data);
    return true;
  } catch {
    return false;
  }
} 