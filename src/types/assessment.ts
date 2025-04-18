export type SkillLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export interface FormData {
  name: string;
  email: string;
  phone: string;
  degree: string;
  graduationYear: string;
  collegeName: string;
  interestedDomain: string;
  preferredLanguage?: string;
}

export interface AssessmentResult {
  userId: string;
  timestamp: string;
  formData: FormData;
  scores: {
    aptitude: number;
    programming: number;
    employability: EmployabilityScores;
    total: number;
    percentile: number;
    readinessScore: number;
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
  candidateInfo?: {
    name: string;
    profile: string;
    interests: string[];
    [key: string]: any;
  };
  testSummary?: {
    totalScore: number;
    aptitudeScore: number;
    programmingScore: number;
    employabilityScore: number;
    strengthAreas: string[];
    improvementAreas: string[];
    [key: string]: any;
  };
  finalScore?: {
    outcome: 'Pass' | 'Not Qualified';
    skillReadinessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
    nextSteps: string[];
    [key: string]: any;
  };
}

export type QuestionDifficulty = 'easy' | 'medium' | 'hard';
export type QuestionType = 'mcq' | 'coding';
export type SectionType = 'aptitude' | 'programming' | 'employability';

export interface Question {
  id: string;
  type: QuestionType;
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: QuestionDifficulty;
  category?: string;
  categoryName?: string;
  timeLimit?: number;
}

export interface Category {
  id: string;
  name: string;
  level: number;
  weight: number;
}

export interface Section {
  id: string;
  title: string;
  type: SectionType;
  category?: string;
  description: string;
  duration: number; // in minutes
  questions: Question[];
  completed: boolean;
  categories?: Category[];
  loaded?: boolean;
}

export interface AssessmentState {
  sections: Section[];
  currentSectionIndex: number;
  currentQuestionIndex: number;
  userAnswers: Record<string, string>;
  timeRemaining: number;
  userName: string;
  loading: {
    initial: boolean;
    questions: boolean;
    submitting: boolean;
  };
  cacheSource?: string;
}

export interface TestProgress {
  sections: Section[];
  userAnswers: Record<string, string>;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  timeRemaining: number;
  timestamp: string;
}

export interface EmployabilityScores {
  core: number;
  soft: number;
  professional: number;
  communication: number;
  teamwork: number;
  leadership: number;
  problem_solving: number;
  domain: number;
}

export interface AssessmentScores {
  aptitude: number;
  programming: number;
  employability: EmployabilityScores;
  total: number;
  percentile: number;
  readinessScore: number;
}

export interface UserContext {
  name?: string;
  interests?: string[];
  degree?: string;
  graduationYear?: string;
  collegeName?: string;
}

export interface DetailedAnalysis {
  sections: Record<string, SectionAnalysis>;
  performance: {
    strengths: Array<{ category: string; score: number }>;
    weaknesses: Array<{ category: string; score: number }>;
    timeEfficiency: Record<string, number>;
    answeredByDifficulty: Record<QuestionDifficulty, number>;
    correctByDifficulty: Record<QuestionDifficulty, number>;
    totalByDifficulty: Record<QuestionDifficulty, number>;
  };
  recommendations: Array<{
    type: string;
    category?: string;
    message: string;
    resources?: Array<{ name: string; url: string }>;
  }>;
}

export interface SectionAnalysis {
  score: number;
  answeredCount: number;
  correctCount: number;
  categories: Record<string, {
    totalQuestions: number;
    answeredQuestions: number;
    correctAnswers: number;
  }>;
  questionBreakdown: Array<{
    questionId: string;
    difficulty: QuestionDifficulty;
    category: string;
    isAnswered: boolean;
    isCorrect: boolean;
    timeTaken: number;
  }>;
}

export interface QuestionTemplate {
  id: string;
  template: string;
  category: string;
  difficulty: QuestionDifficulty;
  variables: () => Record<string, any>;
  generateOptions: (vars: Record<string, any>) => {
    options: string[];
    correctAnswer: string;
    explanation: string;
  };
}

export interface AssessmentError extends Error {
  category: string;
  details: Record<string, any>;
  timestamp: string;
} 