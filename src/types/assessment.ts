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
  scores: {
    aptitude: number;
    programming: number;
    employability: Record<string, number>;
    total?: number;
    percentile?: number;
    readinessScore?: number;
  };
  candidateInfo?: {
    name: string;
    profile: string;
    interests: string[];
    [key: string]: any;
  } | null;
  testSummary?: {
    totalScore: number;
    aptitudeScore: number;
    programmingScore: number;
    employabilityScore: number;
    strengthAreas: string[];
    improvementAreas: string[];
    [key: string]: any;
  } | null;
  finalScore?: {
    outcome: 'Pass' | 'Not Qualified';
    skillReadinessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
    nextSteps: string[];
    [key: string]: any;
  } | null;
  sectionDetails?: {
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
  } | null;
  outcome: 'Pass' | 'Not Qualified';
  skillReadinessLevel: 'Beginner' | 'Intermediate' | 'Advanced';
  recommendations?: {
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
  } | null;
  detailedAnalysis?: {
    strengths: string[];
    areasForImprovement: string[];
    skillGaps: string[];
    industryComparison: {
      aptitude: number;
      programming: number;
      softSkills: number;
      overallGap: number;
    };
  } | null;
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

export interface EmployabilityScores {
  core: number;
  soft: number;
  professional: number;
  communication?: number;
  teamwork?: number;
  leadership?: number;
  problem_solving?: number;
  domain?: number;
}

export interface Scores {
  aptitude: number;
  programming: number;
  employability: number | EmployabilityScores;
  total?: number;
  percentile?: number;
  readinessScore?: number;
}

export interface SectionDetails {
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  strengths: string[];
  weakAreas: string[];
  softSkillsScore?: number;
  professionalSkillsScore?: number;
  aiLiteracyScore?: number;
}

export interface Section {
  id: string;
  title: string;
  subtitle?: string;
  type: QuestionType;
  category?: EmployabilityCategory;
  questions: Question[];
  duration: number;
  completed?: boolean;
} 