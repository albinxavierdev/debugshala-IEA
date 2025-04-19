export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface FormData {
  name: string;
  email: string;
  phone: string;
  degree: string;
  graduationYear: string;
  collegeName: string;
  interestedDomains: string[];
  preferredLanguage?: string;
}

export interface AssessmentResult {
  userId: string;
  timestamp: string;
  formData: FormData;
  type: QuestionType;
  category?: EmployabilityCategory;
  questions: Question[];
  answers: Record<string, string | null>;
  scores: {
    aptitude: number;
    programming: number;
    employability: Record<string, number>;
    total?: number;
    percentile?: number;
    readinessScore?: number;
  };
  sectionDetails: {
    aptitude: {
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
      strengths: string[];
      weakAreas: string[];
    };
    programming: {
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
      strengths: string[];
      weakAreas: string[];
    };
    employability: {
      totalQuestions: number;
      correctAnswers: number;
      accuracy: number;
      softSkillsScore: number;
      professionalSkillsScore: number;
      aiLiteracyScore: number;
      strengths: string[];
      weakAreas: string[];
    };
  };
  outcome: 'Pass' | 'Not Qualified';
  skillReadinessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  recommendations: {
    skills: string[];
    courses: string[];
    careerPaths: string[];
    aptitudeResources: {
      books: string[];
      platforms: string[];
      practiceGuide: string;
    };
    programmingResources: {
      courses: string[];
      platforms: string[];
      topicsToStudy: string[];
    };
    employabilityResources: {
      courses: string[];
      activities: string[];
    };
    nextAction: string;
  };
  detailedAnalysis: {
    strengths: string[];
    areasForImprovement: string[];
    skillGaps: string[];
    industryComparison: {
      aptitude: number;
      programming: number;
      softSkills: number;
      overallGap: number;
    };
  };
}

export interface AssessmentReport {
  summary: string;
  employabilityScore: number;
  aptitudeScore: number;
  programmingScore: number;
  overallScore: number;
  skillReadinessLevel: string;
  strengths: string[];
  areasForImprovement: string[];
  recommendedSkills: string[];
  recommendedCourses: string[];
  careerPaths: string[];
  nextSteps: string;
  detailedFeedback: {
    aptitude: string;
    programming: string;
    employability: string;
  };
}

export interface Question {
  id: string;
  type: 'mcq' | 'coding';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  categoryName?: string;
  timeLimit?: number;
  skillTags?: string[];
}

export type QuestionType = 'aptitude' | 'programming' | 'employability';
export type EmployabilityCategory = 'core' | 'soft' | 'professional' | 'communication' | 'teamwork' | 'leadership' | 'problem_solving' | 'domain'; 