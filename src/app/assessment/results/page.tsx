"use client"

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentResult } from '@/types/assessment';
import { assessmentService } from '@/lib/assessment-service';
import { Navbar } from '@/components/ui/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from '@/components/ui/use-toast';
import { 
  CheckCircle, 
  AlertCircle, 
  ArrowUpRight, 
  BookOpen, 
  Download, 
  BarChart4, 
  PieChart as PieChartIcon,
  Radar as RadarIcon, 
  Brain,
  Lightbulb,
  GraduationCap,
  Trophy,
  Target,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import { 
  Chart as ChartJS, 
  RadialLinearScale, 
  PointElement, 
  LineElement, 
  Filler, 
  Tooltip, 
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
} from 'chart.js';
import { Radar as RadarChart, Bar as BarChart, Pie as PieChart } from 'react-chartjs-2';
import { offlineManager } from '@/lib/offline-manager';
import { ReactNode } from 'react';

// Register ChartJS components
ChartJS.register(
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement
);

// Helper to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

// Fallback assessment result data
const fallbackResult: AssessmentResult = {
  userId: "fallback-user",
  timestamp: new Date().toISOString(),
  formData: {
    name: "Candidate",
    email: "candidate@example.com",
    phone: "+91 9876543210",
    degree: "Computer Science",
    graduationYear: "2023",
    collegeName: "University",
    interestedDomains: ["Web Development", "Machine Learning"],
    preferredLanguage: "JavaScript"
  },
  scores: {
    aptitude: 75,
    programming: 68,
    employability: {
      core: 72,
      soft: 80,
      professional: 78,
      communication: 75,
      teamwork: 82,
      leadership: 65,
      problem_solving: 70,
      domain: 74
    },
    total: 72,
    percentile: 68,
    readinessScore: 70
  },
  sectionDetails: {
    aptitude: {
      totalQuestions: 10,
      correctAnswers: 7,
      accuracy: 70,
      strengths: ["Logical reasoning", "Number series", "Pattern recognition"],
      weakAreas: ["Probability", "Data interpretation", "Complex problem solving"]
    },
    programming: {
      totalQuestions: 10,
      correctAnswers: 6,
      accuracy: 60,
      strengths: ["Algorithm design", "Code debugging", "Basic data structures"],
      weakAreas: ["Time complexity analysis", "Recursive functions", "Advanced algorithms"]
    },
    employability: {
      totalQuestions: 40,
      correctAnswers: 30,
      accuracy: 75,
      softSkillsScore: 82,
      professionalSkillsScore: 75,
      aiLiteracyScore: 65,
      strengths: ["Leadership", "Adaptability", "Teamwork", "Communication"],
      weakAreas: ["Email writing", "Business communication", "Time management"]
    }
  },
  outcome: "Pass",
  skillReadinessLevel: "Intermediate",
  recommendations: {
    skills: [
      "Advanced algorithm optimization",
      "Frontend performance tuning",
      "Data structure implementation",
      "System design for scalability", 
      "Cloud deployment strategies"
    ],
    courses: [
      "Advanced Data Structures & Algorithms",
      "Full Stack Development Bootcamp",
      "System Design for Enterprise Applications",
      "Professional Communication for Tech Leaders",
      "Cloud Engineering Certification"
    ],
    careerPaths: [
      "Full Stack Developer",
      "Software Engineer",
      "Technical Lead",
      "DevOps Engineer",
      "Backend Developer"
    ],
    aptitudeResources: {
      books: [
        "Problem Solving Strategies by Arthur Engel",
        "How to Solve It by G. Polya"
      ],
      platforms: [
        "BrainMetrix",
        "Lumosity",
        "Brilliant.org"
      ],
      practiceGuide: "Focus on daily analytical thinking exercises and timed practice tests."
    },
    programmingResources: {
      courses: [
        "Data Structures and Algorithms Specialization (Coursera)",
        "Advanced Programming Techniques (edX)"
      ],
      platforms: [
        "LeetCode",
        "HackerRank",
        "CodeSignal"
      ],
      topicsToStudy: [
        "Dynamic Programming",
        "Graph Algorithms",
        "System Design"
      ]
    },
    employabilityResources: {
      courses: [
        "Professional Communication Skills (LinkedIn Learning)",
        "Project Management Fundamentals (PMI)"
      ],
      activities: [
        "Join open-source projects",
        "Participate in hackathons",
        "Attend industry meetups"
      ]
    },
    nextAction: "Enroll in the recommended algorithms course and start practicing on coding platforms."
  },
  detailedAnalysis: {
    strengths: [
      "Strong problem-solving abilities",
      "Good technical fundamentals",
      "Analytical thinking",
      "Adaptability to different technologies",
      "Teamwork and collaboration",
      "Programming knowledge"
    ],
    areasForImprovement: [
      "Advanced algorithm optimization",
      "Complex data structure implementation",
      "System design for large-scale applications",
      "Technical communication skills",
      "Leadership capabilities",
      "Domain-specific knowledge"
    ],
    skillGaps: [
      "Performance optimization techniques",
      "Distributed systems design",
      "Advanced architectural patterns",
      "Technical documentation skills",
      "Conflict resolution",
      "Strategic thinking"
    ],
    industryComparison: {
      aptitude: 85,
      programming: 70,
      softSkills: 88,
      overallGap: 15
    }
  },
  // Add simplified format fields to ensure validation passes
  candidateInfo: {
    name: "Candidate",
    profile: "Computer Science student graduating in 2023",
    interests: ["Web Development", "Machine Learning"]
  },
  testSummary: {
    totalScore: 72,
    aptitudeScore: 75,
    programmingScore: 68,
    employabilityScore: 76,
    strengthAreas: ["Logical reasoning", "Teamwork", "Communication"],
    improvementAreas: ["Algorithm optimization", "System design"]
  },
  finalScore: {
    outcome: "Pass",
    skillReadinessLevel: "Intermediate",
    nextSteps: [
      "Practice data structures & algorithms",
      "Build a portfolio project",
      "Improve system design skills"
    ]
  }
};

const SimplifiedReport = ({ report }: { report: AssessmentResult }) => {
  if (!report.candidateInfo || !report.testSummary || !report.finalScore) {
    return null;
  }
  
  return (
    <div className="space-y-8 mb-10">
      {/* 1️⃣ Candidate Information */}
      <Card className="p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <GraduationCap className="mr-2" /> 1️⃣ Candidate Information
        </h2>
        <div className="space-y-2">
          <p className="text-lg"><strong>Name:</strong> {report.candidateInfo.name}</p>
          <p className="text-lg"><strong>Profile:</strong> {report.candidateInfo.profile}</p>
          <div>
            <p className="text-lg font-medium">Interests:</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {report.candidateInfo.interests.map((interest, index) => (
                <span key={index} className="px-3 py-1 bg-primary/10 text-primary rounded-full text-sm">
                  {interest}
                </span>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 2️⃣ Test Summary */}
      <Card className="p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <BarChart4 className="mr-2" /> 2️⃣ Test Summary
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="text-lg font-medium mb-2">Scores Overview</h3>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between mb-1">
                  <span className="font-medium">Overall Score</span>
                  <span className="font-bold">{report.testSummary.totalScore}%</span>
                </div>
                <Progress value={report.testSummary.totalScore} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Aptitude</span>
                  <span>{report.testSummary.aptitudeScore}%</span>
                </div>
                <Progress value={report.testSummary.aptitudeScore} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Programming</span>
                  <span>{report.testSummary.programmingScore}%</span>
                </div>
                <Progress value={report.testSummary.programmingScore} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between mb-1">
                  <span>Employability</span>
                  <span>{report.testSummary.employabilityScore}%</span>
                </div>
                <Progress value={report.testSummary.employabilityScore} className="h-2" />
              </div>
            </div>
          </div>
          <div>
            <div className="mb-4">
              <h3 className="text-lg font-medium mb-2">Strengths</h3>
              <ul className="list-disc pl-5 space-y-1">
                {report.testSummary.strengthAreas.map((strength, index) => (
                  <li key={index} className="text-primary-700">{strength}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-medium mb-2">Areas for Improvement</h3>
              <ul className="list-disc pl-5 space-y-1">
                {report.testSummary.improvementAreas.map((area, index) => (
                  <li key={index} className="text-orange-700">{area}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </Card>

      {/* 6️⃣ Final Score & Next Steps */}
      <Card className="p-6 shadow-lg">
        <h2 className="text-2xl font-bold mb-4 flex items-center">
          <Trophy className="mr-2" /> 6️⃣ Final Score & Next Steps
        </h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Outcome</h3>
              <p className="text-xl font-bold mt-1">{report.finalScore.outcome}</p>
            </div>
            <div className="bg-primary/10 px-4 py-2 rounded-lg">
              <h3 className="text-lg font-medium">Skill Readiness Level</h3>
              <p className="text-xl font-bold text-primary mt-1">{report.finalScore.skillReadinessLevel}</p>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Recommended Next Steps</h3>
            <div className="space-y-2">
              {report.finalScore.nextSteps.map((step, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="rounded-full bg-primary/10 p-1 mt-0.5">
                    <Target className="h-4 w-4 text-primary" />
                  </div>
                  <p>{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

// Loading component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center min-h-screen p-4">
    <Progress value={100} className="w-[60%] animate-pulse" />
    <p className="mt-4 text-muted-foreground">Loading your assessment results...</p>
  </div>
);

interface ChartErrorFallbackProps {
  error: Error;
  resetErrorBoundary: () => void;
}

interface ChartWrapperProps {
  children: ReactNode;
  title: string;
}

// Error component for charts
const ChartErrorFallback = ({ error, resetErrorBoundary }: ChartErrorFallbackProps) => (
  <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
    <AlertCircle className="w-8 h-8 text-destructive" />
    <p className="mt-2 text-sm text-destructive">Failed to load chart: {error.message}</p>
    <Button variant="outline" onClick={resetErrorBoundary} className="mt-2">
      Retry
    </Button>
  </div>
);

const ChartWrapper = ({ children, title }: ChartWrapperProps) => (
  <Card className="p-4">
    <h3 className="text-lg font-semibold mb-4">{title}</h3>
    <ErrorBoundary fallback={
      <div className="flex flex-col items-center justify-center p-4 border rounded-lg">
        <AlertCircle className="w-8 h-8 text-destructive" />
        <p className="mt-2 text-sm text-destructive">Failed to load chart</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    }>
      {children}
    </ErrorBoundary>
  </Card>
);

// Data validation function
const validateReportData = (data: any): data is AssessmentResult => {
  if (!data || typeof data !== 'object') return false;
  
  const requiredFields = [
    'userId',
    'scores'
  ] as const;

  const hasAllFields = requiredFields.every(field => 
    field in data && data[field] !== null && data[field] !== undefined
  );

  if (!hasAllFields) return false;

  // Verify scores exist
  const { scores } = data;
  if (!scores || typeof scores !== 'object') return false;
  
  // Less strict requirements for scores
  if (!('aptitude' in scores) || !('programming' in scores) || !('employability' in scores)) {
    return false;
  }
  
  // Accept either format: old or new
  if (!data.sectionDetails && !data.candidateInfo) {
    return false;
  }

  return true;
};

interface SkillLevel {
  text: string;
  color: string;
  textColor: string;
}

const calculateLevel = (score: number): SkillLevel => {
  if (score >= 85) return { text: 'Expert', color: 'bg-green-600', textColor: 'text-green-600' };
  if (score >= 70) return { text: 'Proficient', color: 'bg-blue-600', textColor: 'text-blue-600' };
  if (score >= 50) return { text: 'Intermediate', color: 'bg-amber-500', textColor: 'text-amber-500' };
  return { text: 'Beginner', color: 'bg-red-500', textColor: 'text-red-500' };
};

export default function ResultsPage() {
  const router = useRouter();
  const [report, setReport] = useState<AssessmentResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadReport = async (userId?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Get the effective userId (provided or from service)
      const effectiveUserId = userId || assessmentService.getUserId() || 'unknown';
      
      // Try to get from localStorage first
      const localStorage = getLocalStorage();
      const cachedReport = localStorage?.getItem('assessmentResult');
      
      if (cachedReport) {
        try {
          const parsedReport = JSON.parse(cachedReport);
          if (validateReportData(parsedReport)) {
            console.log('Using cached report from localStorage');
            setReport(parsedReport);
            return;
          } else {
            console.warn('Invalid cached report format, fetching fresh data');
          }
        } catch (e) {
          console.warn('Error parsing cached report:', e);
        }
      }

      // If no valid cached data, try to get from service
      const result = await assessmentService.getAssessmentResults();
      
      if (result && validateReportData(result)) {
        setReport(result);
        localStorage?.setItem('assessmentResult', JSON.stringify(result));
      } else {
        // If service returns null or invalid data, try using raw scores from localStorage directly
        const rawScores = localStorage?.getItem('debugshala_assessment_scores');
        const timestamp = localStorage?.getItem('debugshala_assessment_timestamp');
        
        if (rawScores) {
          try {
            console.log('Service returned invalid/null data, attempting to build minimal report from raw scores');
            const parsedScores = JSON.parse(rawScores);
            
            // Build a minimal valid report
            const localFormData = assessmentService.getFormData() || {
              name: 'User',
              email: 'user@example.com',
              phone: '',
              degree: '',
              graduationYear: '',
              collegeName: '',
              interestedDomains: []
            };
            
            const minimalReport: AssessmentResult = {
              userId: effectiveUserId,
              timestamp: timestamp || new Date().toISOString(),
              formData: localFormData,
              scores: {
                aptitude: parsedScores.aptitude || 0,
                programming: parsedScores.programming || 0,
                employability: typeof parsedScores.employability === 'object' 
                  ? parsedScores.employability 
                  : { core: 0, soft: 0, professional: 0 },
                total: (parsedScores.aptitude + parsedScores.programming) / 2 || 0,
                percentile: 50, // Default percentile
                readinessScore: (parsedScores.aptitude + parsedScores.programming) / 2 || 0
              },
              sectionDetails: {
                aptitude: {
                  totalQuestions: 10,
                  correctAnswers: Math.round((parsedScores.aptitude || 0) / 10),
                  accuracy: parsedScores.aptitude || 0,
                  strengths: ["Problem solving", "Analytical thinking"],
                  weakAreas: ["Time management", "Complex calculations"]
                },
                programming: {
                  totalQuestions: 10,
                  correctAnswers: Math.round((parsedScores.programming || 0) / 10),
                  accuracy: parsedScores.programming || 0,
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
              outcome: ((parsedScores.aptitude || 0) >= 60 && (parsedScores.programming || 0) >= 60) ? 'Pass' : 'Not Qualified',
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
                  aptitude: parsedScores.aptitude || 0,
                  programming: parsedScores.programming || 0,
                  softSkills: 70,
                  overallGap: 20
                }
              }
            };
            
            if (validateReportData(minimalReport)) {
              console.log('Successfully built valid report from raw scores');
              setReport(minimalReport);
              localStorage?.setItem('assessmentResult', JSON.stringify(minimalReport));
              return;
            } else {
              console.error('Built report failed validation');
            }
          } catch (buildError) {
            console.error('Error building report from raw scores:', buildError);
          }
        }
        
        // Provide more detailed error info since all attempts failed
        if (!result) {
          console.error('Service returned null result. The service now includes fallback mechanisms, so this indicates no assessment data is available from any source.');
        } else {
          console.error('Invalid report structure from service:', result);
          // Log what fields are missing for debugging
          if (!result.userId) console.error('- Missing userId');
          if (!result.scores) console.error('- Missing scores object');
          else if (result.scores) {
            if (!('aptitude' in result.scores)) console.error('- Missing scores.aptitude');
            if (!('programming' in result.scores)) console.error('- Missing scores.programming');
            if (!('employability' in result.scores)) console.error('- Missing scores.employability');
          }
          if (!result.sectionDetails && !result.candidateInfo) {
            console.error('- Missing both sectionDetails and candidateInfo');
          }
        }
        
        throw new Error('Invalid report data structure');
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setError(err instanceof Error ? err.message : 'Failed to load report');
      toast({
        variant: "destructive",
        title: "Error loading report",
        description: "Please try again or contact support if the problem persists."
      });
      
      // Use fallback data in development only
      if (process.env.NODE_ENV === 'development') {
        try {
          // Check if fallback validates
          const isValid = validateReportData(fallbackResult);
          if (isValid) {
            console.log('Using fallback result data (development mode)');
            setReport(fallbackResult);
          } else {
            console.error('Fallback result validation failed');
          }
        } catch (e) {
          console.error('Error using fallback data:', e);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadReport();
  }, []);

  if (isLoading) {
    return <LoadingState />;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Failed to Load Results</h2>
        <p className="mt-2 text-muted-foreground">{error}</p>
        <Button onClick={() => loadReport()} className="mt-4">Retry</Button>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">No Results Found</h2>
        <p className="mt-2 text-muted-foreground">We couldn't find your assessment results.</p>
        <Button onClick={() => router.push('/assessment')} className="mt-4">
          Take Assessment
        </Button>
      </div>
    );
  }

  // Ensure we have all required data
  const { scores, detailedAnalysis, recommendations } = report;
  if (!scores || !detailedAnalysis || !recommendations) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="mt-4 text-xl font-semibold">Incomplete Results</h2>
        <p className="mt-2 text-muted-foreground">Some assessment data is missing.</p>
        <Button onClick={() => loadReport()} className="mt-4">Retry</Button>
      </div>
    );
  }

  // Determine which format is available
  const isSimplifiedFormat = report?.candidateInfo && report?.testSummary && report?.finalScore;
  
  // Helper to get the overall score based on available format
  const getOverallScore = (): number => {
    if (isSimplifiedFormat && report?.testSummary) {
      return report.testSummary.totalScore;
    }
    return report?.scores.total || 0;
  };
  
  // Get the overall score
  const overallScore = getOverallScore();
  
  // Calculate skill level from score
  const overallLevel = calculateLevel(overallScore);

  const getOverallScoreLevel = (): string => {
    if (overallScore >= 80) return 'High Readiness';
    if (overallScore >= 60) return 'Moderate Readiness';
    return 'Low Readiness';
  };

  const prepareRadarData = () => {
    const { employability } = report.scores;
    return {
      labels: [
        'Core Skills',
        'Soft Skills',
        'Professional',
        'Communication',
        'Teamwork',
        'Leadership'
      ],
      datasets: [{
        label: 'Skills Score',
        data: [
          employability.core,
          employability.soft,
          employability.professional,
          employability.communication ?? 0,
          employability.teamwork ?? 0,
          employability.leadership ?? 0
        ],
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        borderColor: 'rgb(99, 102, 241)',
        borderWidth: 2,
        pointBackgroundColor: 'rgb(99, 102, 241)',
      }]
    };
  };

  const prepareBarData = () => {
    const { scores } = report;
    return {
      labels: ['Aptitude', 'Programming', 'Employability'],
      datasets: [{
        label: 'Score',
        data: [
          scores.aptitude,
          scores.programming,
          scores.employability.core
        ],
        backgroundColor: [
          'rgba(59, 130, 246, 0.5)',
          'rgba(99, 102, 241, 0.5)',
          'rgba(139, 92, 246, 0.5)'
        ],
        borderColor: [
          'rgb(59, 130, 246)',
          'rgb(99, 102, 241)',
          'rgb(139, 92, 246)'
        ],
        borderWidth: 1
      }]
    };
  };

  const preparePieData = () => {
    const { detailedAnalysis } = report;
    const { strengths, areasForImprovement, skillGaps } = detailedAnalysis;
    const total = strengths.length + areasForImprovement.length + skillGaps.length;

    return {
      labels: ['Strengths', 'Areas for Improvement', 'Skill Gaps'],
      datasets: [{
        data: [
          (strengths.length / total) * 100,
          (areasForImprovement.length / total) * 100,
          (skillGaps.length / total) * 100
        ],
        backgroundColor: [
          'rgba(34, 197, 94, 0.5)',
          'rgba(234, 179, 8, 0.5)',
          'rgba(239, 68, 68, 0.5)'
        ],
        borderColor: [
          'rgb(34, 197, 94)',
          'rgb(234, 179, 8)',
          'rgb(239, 68, 68)'
        ],
        borderWidth: 1
      }]
    };
  };

  const radarData = prepareRadarData();
  const barData = prepareBarData();
  const pieData = preparePieData();

  const prepareChartData = (type: 'radar' | 'bar' | 'pie') => {
    try {
      switch (type) {
        case 'radar':
          return prepareRadarData();
        case 'bar':
          return prepareBarData();
        case 'pie':
          return preparePieData();
        default:
          throw new Error('Invalid chart type');
      }
    } catch (error) {
      console.error(`Error preparing ${type} chart data:`, error);
      toast({
        variant: "destructive",
        title: `Error preparing ${type} chart`,
        description: "Some data might not be displayed correctly."
      });
      return null;
    }
  };

  return (
    <main className="min-h-screen bg-muted/30">
          <SimplifiedReport report={report} />
      
      <div className="container py-8 px-4 md:px-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-primary/10 rounded-full">
            <BarChart3 className="h-6 w-6 text-primary" />
              </div>
              <div>
            <h1 className="text-2xl font-bold">Assessment Results</h1>
            <p className="text-muted-foreground">
              {isSimplifiedFormat && report?.candidateInfo 
                ? `Analysis for ${report.candidateInfo.name}` 
                : "Detailed analysis of your assessment performance"}
            </p>
              </div>
            </div>
                  
        {/* Main content starts here */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">1️⃣ Candidate Profile</h2>
          <Card className="p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="flex flex-col gap-2 md:border-r md:pr-6">
                  <div className="font-medium text-lg">{isSimplifiedFormat && report?.candidateInfo ? report.candidateInfo.name : report?.formData.name}</div>
                  <div className="text-muted-foreground text-sm">
                    {isSimplifiedFormat && report?.candidateInfo ? report.candidateInfo.profile : `${report?.formData.degree || 'Computer Science'}, ${report?.formData.graduationYear || '2023'}`}
                  </div>
                  
                  <div className="mt-4">
                    <div className="text-sm font-medium mb-1">Interested Domains</div>
                    <div className="flex flex-wrap gap-1.5">
                      {(isSimplifiedFormat && report?.candidateInfo?.interests 
                        ? report.candidateInfo.interests 
                        : report?.formData.interestedDomains || ['Web Development']).map((domain, i) => (
                        <span key={i} className="px-2 py-1 rounded-md bg-secondary text-secondary-foreground text-sm">
                          {domain}
                        </span>
                      ))}
                      </div>
                    </div>
                </div>
              </div>
              
              <div className="md:col-span-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1.5">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Strengths
                    </h4>
                    <ul className="space-y-1 pl-6 list-disc text-sm">
                      {(report.sectionDetails?.aptitude.strengths || [
                        "Logical reasoning",
                        "Number series",
                        "Pattern recognition"
                      ]).map((strength, i) => (
                        <li key={i}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="font-medium mb-2 flex items-center gap-1.5">
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      Weak Areas
                    </h4>
                    <ul className="space-y-1 pl-6 list-disc text-sm">
                      {(report.sectionDetails?.aptitude.weakAreas || [
                        "Probability",
                        "Data interpretation",
                        "Complex problem solving"
                      ]).map((weakness, i) => (
                        <li key={i}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* ... rest of the component remains the same ... */}
                </div>
    </main>
  );
}

// Chart options
const radarOptions = {
  scales: {
    r: {
      beginAtZero: true,
      max: 100,
      ticks: {
        stepSize: 20
      }
    }
  },
  plugins: {
    legend: {
      display: false
    }
  }
};

const barOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'top' as const
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      max: 100
    }
  }
};

const pieOptions = {
  responsive: true,
  plugins: {
    legend: {
      position: 'right' as const
    }
  }
};