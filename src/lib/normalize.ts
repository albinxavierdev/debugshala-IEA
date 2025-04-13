import { AssessmentResult, Scores, EmployabilityScores, SectionDetails } from '@/types/assessment';

/**
 * Normalizes large JSON structures by extracting nested data into separate objects
 * to reduce data duplication and improve query performance
 */
export class DataNormalizer {
  /**
   * Normalizes an assessment result by breaking it down into separate objects
   * that can be stored in different tables
   */
  static normalizeAssessmentResult(result: AssessmentResult): {
    baseResult: any;
    scores: Scores;
    sectionDetails: Record<string, SectionDetails>;
    recommendations: any;
    detailedAnalysis: any;
  } {
    // Extract scores
    const scores = result.scores;

    // Extract section details
    const sectionDetails = result.sectionDetails || {};
    
    // Extract recommendations
    const recommendations = result.recommendations || {};
    
    // Extract detailed analysis
    const detailedAnalysis = result.detailedAnalysis || {};
    
    // Create base result without the extracted data
    const baseResult = {
      userId: result.userId,
      timestamp: result.timestamp,
      formData: result.formData,
      outcome: result.outcome,
      skillReadinessLevel: result.skillReadinessLevel,
    };
    
    return {
      baseResult,
      scores,
      sectionDetails,
      recommendations,
      detailedAnalysis,
    };
  }
  
  /**
   * Combines normalized data back into a single assessment result
   */
  static denormalizeAssessmentResult(
    baseResult: any,
    scores: Scores,
    sectionDetails: Record<string, SectionDetails>,
    recommendations: any,
    detailedAnalysis: any
  ): AssessmentResult {
    return {
      ...baseResult,
      scores,
      sectionDetails,
      recommendations,
      detailedAnalysis,
    } as AssessmentResult;
  }
  
  /**
   * Normalizes user data by extracting domains of interest
   * which could be stored in a separate table
   */
  static normalizeUserData(userData: any): {
    baseUserData: any;
    interestedDomains: string[];
  } {
    const { interestedDomains, ...baseUserData } = userData;
    
    return {
      baseUserData,
      interestedDomains: interestedDomains || [],
    };
  }
  
  /**
   * Normalizes question sets by extracting common data
   */
  static normalizeQuestionSet(questionSet: any): {
    baseQuestionSet: any;
    questions: any[];
  } {
    const { questions, ...baseQuestionSet } = questionSet;
    
    return {
      baseQuestionSet,
      questions: questions || [],
    };
  }
}

/**
 * Helper function to generate cache keys for normalized data
 */
export function generateCacheKey(prefix: string, id: string, subType?: string): string {
  return `${prefix}:${id}${subType ? `:${subType}` : ''}`;
} 