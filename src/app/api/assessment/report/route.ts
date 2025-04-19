import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { FormData, AssessmentResult, QuestionType } from '@/types/assessment';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Update AssessmentResult to include the new sections needed for the report
interface EnhancedAssessmentResult extends AssessmentResult {
  candidateInfo?: {
    name: string;
    email: string;
    phone: string;
    degree: string;
    graduationYear: string;
    collegeName: string;
    interestedDomains: string[];
  };
  testSummary?: {
    aptitude: {
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
    };
    programming: {
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
    };
    employability: {
      score: number;
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
      categoryScores: Record<string, number>;
    };
  };
  finalScore?: {
    overall: number;
    skillLevel: string;
    outcome: string;
    readinessPercentile: number;
    careerRecommendations: string[];
  };
}

// Generate a simplified report with three sections
const generateSimplifiedReport = (formData: FormData, scores: AssessmentResult['scores'], userAnswers?: Record<string, string>, questions?: any[]): EnhancedAssessmentResult => {
  // Calculate employability average
  let employabilityAvg = 0;
  if (typeof scores.employability === 'object') {
    const values = Object.values(scores.employability);
    employabilityAvg = values.length > 0 
      ? values.reduce((sum, val) => sum + val, 0) / values.length 
      : 0;
  } else if (typeof scores.employability === 'number') {
    employabilityAvg = scores.employability;
  }
  
  // Calculate overall score (30% aptitude, 30% programming, 40% employability)
  const overallScore = Math.round((scores.aptitude * 0.3) + (scores.programming * 0.3) + (employabilityAvg * 0.4));
  
  // Determine skill level based on overall score
  let skillLevel: 'Beginner' | 'Intermediate' | 'Advanced' = 'Beginner';
  if (overallScore >= 85) skillLevel = 'Advanced';
  else if (overallScore >= 70) skillLevel = 'Intermediate';
  else if (overallScore >= 50) skillLevel = 'Beginner';
  
  // Determine outcome
  const outcome: 'Pass' | 'Not Qualified' = overallScore >= 60 ? 'Pass' : 'Not Qualified';
  
  // Calculate section accuracy if questions and answers are provided
  let aptitudeCorrect = 0;
  let aptitudeTotal = 0;
  let programmingCorrect = 0;
  let programmingTotal = 0;
  let employabilityCorrect = 0;
  let employabilityTotal = 0;
  
  if (questions && userAnswers) {
    questions.forEach(q => {
      const userAnswer = userAnswers[q.id];
      const isCorrect = userAnswer === q.correctAnswer;
      
      if (q.type === 'aptitude') {
        aptitudeTotal++;
        if (isCorrect) aptitudeCorrect++;
      } else if (q.type === 'programming') {
        programmingTotal++;
        if (isCorrect) programmingCorrect++;
      } else if (q.type === 'employability') {
        employabilityTotal++;
        if (isCorrect) employabilityCorrect++;
      }
    });
  }
  
  // Get career recommendations
  const careerRecs = determineCareerRecommendations(formData.interestedDomains, scores);
  
  return {
    userId: "user-" + Math.floor(Math.random() * 1000000),
    timestamp: new Date().toISOString(),
    formData,
    scores,
    type: "aptitude" as QuestionType,
    questions: questions || [],
    answers: userAnswers || {},
    candidateInfo: {
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      degree: formData.degree,
      graduationYear: formData.graduationYear,
      collegeName: formData.collegeName,
      interestedDomains: formData.interestedDomains
    },
    testSummary: {
      aptitude: {
        score: scores.aptitude,
        totalQuestions: aptitudeTotal || 10,
        correctAnswers: aptitudeCorrect || Math.round(scores.aptitude / 10),
        accuracy: aptitudeTotal ? Math.round((aptitudeCorrect / aptitudeTotal) * 100) : scores.aptitude
      },
      programming: {
        score: scores.programming,
        totalQuestions: programmingTotal || 10,
        correctAnswers: programmingCorrect || Math.round(scores.programming / 10),
        accuracy: programmingTotal ? Math.round((programmingCorrect / programmingTotal) * 100) : scores.programming
      },
      employability: {
        score: employabilityAvg,
        totalQuestions: employabilityTotal || 15,
        correctAnswers: employabilityCorrect || Math.round(employabilityAvg / 100 * 15),
        accuracy: employabilityTotal ? Math.round((employabilityCorrect / employabilityTotal) * 100) : employabilityAvg,
        categoryScores: typeof scores.employability === 'object' ? scores.employability : { general: employabilityAvg }
      }
    },
    finalScore: {
      overall: overallScore,
      skillLevel,
      outcome,
      readinessPercentile: Math.min(99, Math.round(overallScore * 1.2)), // Simulated percentile
      careerRecommendations: careerRecs
    },
    // Keep these for backward compatibility
    sectionDetails: {
      aptitude: {
        totalQuestions: aptitudeTotal || 10,
        correctAnswers: aptitudeCorrect || Math.round(scores.aptitude / 10),
        accuracy: scores.aptitude,
        strengths: [],
        weakAreas: []
      },
      programming: {
        totalQuestions: programmingTotal || 10,
        correctAnswers: programmingCorrect || Math.round(scores.programming / 10),
        accuracy: scores.programming,
        strengths: [],
        weakAreas: []
      },
      employability: {
        totalQuestions: employabilityTotal || 15,
        correctAnswers: employabilityCorrect || Math.round(employabilityAvg / 100 * 15),
        accuracy: employabilityAvg,
        softSkillsScore: typeof scores.employability === 'object' && scores.employability.soft ? scores.employability.soft : 70,
        professionalSkillsScore: typeof scores.employability === 'object' && scores.employability.professional ? scores.employability.professional : 65,
        aiLiteracyScore: 60,
        strengths: [],
        weakAreas: []
      }
    },
    outcome,
    skillReadinessLevel: skillLevel,
    recommendations: {
      skills: [],
      courses: [],
      careerPaths: careerRecs,
      aptitudeResources: { books: [], platforms: [], practiceGuide: "" },
      programmingResources: { courses: [], platforms: [], topicsToStudy: [] },
      employabilityResources: { courses: [], activities: [] },
      nextAction: ""
    },
    detailedAnalysis: {
      strengths: [],
      areasForImprovement: [],
      skillGaps: [],
      industryComparison: {
        aptitude: scores.aptitude,
        programming: scores.programming,
        softSkills: employabilityAvg,
        overallGap: 100 - overallScore
      }
    }
  };
};

// Helper function to determine career recommendations based on interests and scores
const determineCareerRecommendations = (interests: string[], scores: AssessmentResult['scores']): string[] => {
  const recommendations: string[] = [];
  const employabilityScore = typeof scores.employability === 'object' 
    ? Object.values(scores.employability).reduce((sum, val) => sum + val, 0) / Object.values(scores.employability).length
    : scores.employability;
  
  // Default recommendations
  const defaultRecs = [
    "Software Developer",
    "Web Developer",
    "Mobile App Developer",
    "Data Analyst"
  ];
  
  if (interests.length === 0) return defaultRecs;
  
  // Add recommendations based on interests
  interests.forEach(interest => {
    const lowercaseInterest = interest.toLowerCase();
    
    if (lowercaseInterest.includes('web')) {
      recommendations.push('Frontend Developer', 'Full Stack Developer');
    }
    if (lowercaseInterest.includes('front-end')) {
      recommendations.push('UI Developer', 'Frontend Developer', 'React Developer');
    }
    if (lowercaseInterest.includes('data') || lowercaseInterest.includes('analytics')) {
      recommendations.push('Data Scientist', 'Business Intelligence Analyst', 'Data Analyst', 'Business Analyst');
    }
    if (lowercaseInterest.includes('ai') || lowercaseInterest.includes('machine learning')) {
      recommendations.push('Machine Learning Engineer', 'AI Researcher');
    }
    if (lowercaseInterest.includes('cloud')) {
      recommendations.push('Cloud Solutions Architect', 'DevOps Engineer');
    }
    if (lowercaseInterest.includes('security')) {
      recommendations.push('Cybersecurity Analyst', 'Security Engineer');
    }
    if (lowercaseInterest.includes('mobile')) {
      recommendations.push('Mobile App Developer', 'iOS/Android Developer');
    }
    if (lowercaseInterest.includes('game')) {
      recommendations.push('Game Developer', 'Unity Developer');
    }
  });
  
  // If no specific recommendations were added, use defaults
  if (recommendations.length === 0) {
    return defaultRecs;
  }
  
  // Remove duplicates and limit to 5 recommendations
  const uniqueRecs = Array.from(new Set(recommendations));
  return uniqueRecs.slice(0, 5);
};

export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { formData, scores, userId, userAnswers, questions } = body;

    // Validate required data
    if (!formData || !scores) {
      return NextResponse.json(
        { error: 'Missing required data (formData or scores)' },
        { status: 400 }
      );
    }

    // Ensure formData has all required fields or use defaults
    const sanitizedFormData: FormData = {
      name: formData.name || "Candidate",
      email: formData.email || "",
      phone: formData.phone || "",
      degree: formData.degree || "Not specified",
      graduationYear: formData.graduationYear || "Not specified",
      collegeName: formData.collegeName || "Not specified",
      interestedDomains: Array.isArray(formData.interestedDomains) ? formData.interestedDomains : [],
    };

    // Generate the simplified report directly with the three sections
    const report = generateSimplifiedReport(sanitizedFormData, scores, userAnswers, questions);
    
    // Add userId if provided
    if (userId) {
      report.userId = userId;
    }
    
    return NextResponse.json(report);
    
  } catch (error) {
    console.error('Assessment report generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate assessment report' },
      { status: 500 }
    );
  }
} 