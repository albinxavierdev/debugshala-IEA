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
  Target
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
      "Technical communication",
      "Leadership skills",
      "Problem-solving approaches",
      "Domain knowledge"
    ],
    courses: [
      "Advanced Data Structures & Algorithms",
      "Full Stack Development Bootcamp",
      "System Design for Enterprise Applications",
      "Professional Communication for Tech Leaders",
      "Leadership in Technical Teams",
      "Critical Thinking and Problem Solving",
      "Domain-Specific Architecture Patterns"
    ],
    careerPaths: [
      "Full Stack Developer",
      "Software Engineer",
      "DevOps Engineer",
      "Backend Developer",
      "Technical Team Lead",
      "Solution Architect"
    ],
    aptitudeResources: {
      books: ["Quantitative Aptitude by R.S. Aggarwal", "Logical Reasoning by M.K. Pandey"],
      platforms: ["HackerRank", "IndiaBIX", "Brilliant.org"],
      practiceGuide: "5 reasoning questions + 10-minute numerical drills daily"
    },
    programmingResources: {
      courses: ["DebugShala's Web Development Bootcamp", "Data Structures Masterclass"],
      platforms: ["LeetCode", "CodeChef", "HackerRank"],
      topicsToStudy: ["Data structures", "Recursion", "OOP concepts", "Design patterns"]
    },
    employabilityResources: {
      courses: ["Business Communication", "Email Writing", "Presentation Skills"],
      activities: ["Mock Interviews", "Resume Building", "LinkedIn Profile Optimization"]
    },
    nextAction: "Proceed to Technical Test"
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
    'scores',
    'sectionDetails',
    'recommendations',
    'detailedAnalysis'
  ] as const;

  const hasAllFields = requiredFields.every(field => 
    field in data && data[field] !== null && data[field] !== undefined
  );

  if (!hasAllFields) return false;

  // Verify scores structure
  const { scores } = data;
  if (!scores.employability || 
      typeof scores.employability !== 'object' ||
      !('core' in scores.employability) ||
      !('soft' in scores.employability) ||
      !('professional' in scores.employability)) {
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

  const loadReport = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Try to get from localStorage first
      const localStorage = getLocalStorage();
      const cachedReport = localStorage?.getItem('assessmentResult');
      
      if (cachedReport) {
        const parsedReport = JSON.parse(cachedReport);
        if (validateReportData(parsedReport)) {
          setReport(parsedReport);
          return;
        }
      }

      // If no valid cached data, try to get from service
      const result = await assessmentService.getAssessmentResults();
      if (result && validateReportData(result)) {
        setReport(result);
        localStorage?.setItem('assessmentResult', JSON.stringify(result));
      } else {
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
      if (process.env.NODE_ENV === 'development' && validateReportData(fallbackResult)) {
        setReport(fallbackResult);
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

  const getOverallScore = (): number => {
    return report.scores.total;
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

  const overallScore = getOverallScore();
  const overallLevel = calculateLevel(overallScore);
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
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8 flex-1">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-2">
            <h1 className="text-4xl font-bold">DebugShala IT Job Placement Program</h1>
            <Button 
              variant="outline" 
              size="sm"
              className="mt-2 md:mt-0 gap-2"
              onClick={() => window.print()}
            >
              <Download className="h-4 w-4" />
              Download Report
            </Button>
          </div>
          <p className="text-muted-foreground">
            Employability Test Report • Completed on {new Date(report.timestamp).toLocaleDateString()} at {new Date(report.timestamp).toLocaleTimeString()}
          </p>
        </motion.div>

        {report && report.candidateInfo && report.testSummary && report.finalScore ? (
          <SimplifiedReport report={report} />
        ) : (
          <>
        {/* Candidate Information */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">1️⃣ Candidate Information</h2>
          <Card className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <dl className="space-y-3">
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Full Name</dt>
                    <dd className="font-medium">{report.formData.name}</dd>
        </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Phone Number</dt>
                    <dd className="font-medium">{report.formData.phone || 'Not Provided'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Email Address</dt>
                    <dd className="font-medium">{report.formData.email || 'Not Provided'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Degree</dt>
                    <dd className="font-medium">{report.formData.degree || 'Not Provided'}</dd>
                  </div>
                </dl>
              </div>
              <div>
                <dl className="space-y-3">
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Graduation Year</dt>
                    <dd className="font-medium">{report.formData.graduationYear || 'Not Provided'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">College Name</dt>
                    <dd className="font-medium">{report.formData.collegeName || 'Not Provided'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Interested Domains</dt>
                    <dd className="font-medium">{report.formData.interestedDomains.join(', ') || 'Not Provided'}</dd>
                  </div>
                  <div className="flex flex-col">
                    <dt className="text-sm text-muted-foreground">Preferred Programming Language</dt>
                    <dd className="font-medium">{report.formData.preferredLanguage || 'Not Provided'}</dd>
                  </div>
                </dl>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Test Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">2️⃣ Test Summary</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-3">
              <Card className="p-6 border-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
                    <h2 className="text-xl font-semibold mb-1">Overall Performance</h2>
                    <div className="flex items-center gap-2">
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                        report.outcome === 'Pass' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {report.outcome || (overallScore >= 60 ? 'Pass' : 'Not Qualified')}
                      </div>
                      <div className="text-muted-foreground">
                        <span className="font-medium">{report.scores.percentile || '65'}th</span> Percentile
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid place-items-center bg-primary/10 rounded-lg p-6 w-full md:w-auto">
                    <div className="text-5xl font-bold text-primary mb-1">{overallScore}%</div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${overallLevel.textColor} bg-background`}>
                      {report.skillReadinessLevel || overallLevel.text} Level
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </div>
          
          {/* Main score overview with bar chart */}
          <Card className="p-6 mb-6">
            <h3 className="text-xl font-semibold mb-6 flex items-center gap-2">
              <BarChart4 className="h-5 w-5 text-primary" />
              Section-Wise Performance
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2">
                {barData && (
                  <div className="h-[300px] w-full">
                    <BarChart 
                      data={barData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                              callback: function(value) {
                                return value + '%';
                              }
                            }
                          }
                        },
                        plugins: {
                          legend: {
                            display: false
                          },
                          tooltip: {
                            callbacks: {
                              label: function(context) {
                                return context.raw + '%';
                              }
                            }
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              <div>
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-red-100">
                      <Brain className="h-6 w-6 text-red-500" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Aptitude & Reasoning</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold">{report.scores.aptitude}%</p>
                        <p className="text-xs text-muted-foreground">
                          ({report.sectionDetails?.aptitude.correctAnswers || "7"}/{report.sectionDetails?.aptitude.totalQuestions || "10"})
              </p>
            </div>
              </div>
            </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-blue-100">
                      <Lightbulb className="h-6 w-6 text-blue-500" />
          </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Programming Knowledge</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold">{report.scores.programming}%</p>
                        <p className="text-xs text-muted-foreground">
                          ({report.sectionDetails?.programming.correctAnswers || "6"}/{report.sectionDetails?.programming.totalQuestions || "10"})
                        </p>
              </div>
              </div>
              </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-full bg-teal-100">
                      <GraduationCap className="h-6 w-6 text-teal-500" />
          </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Employability Skills</p>
                      <div className="flex items-center gap-2">
                        <p className="text-xl font-semibold">
                          {typeof report.scores.employability === 'object' 
                            ? Math.round(Object.values(report.scores.employability).reduce((sum, val) => sum + val, 0) / 
                                Object.values(report.scores.employability).length)
                            : report.scores.employability
                          }%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          ({report.sectionDetails?.employability.correctAnswers || "30"}/{report.sectionDetails?.employability.totalQuestions || "40"})
                        </p>
        </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Score distribution graph */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Overall Score Distribution</h3>
              <div className="h-[250px]">
                <BarChart
                  data={{
                    labels: ['Your Score', 'Average Score', 'Top Performers'],
                    datasets: [
                      {
                        label: 'Score Comparison',
                        data: [overallScore, 65, 85],
                        backgroundColor: [
                          'rgba(99, 102, 241, 0.8)',
                          'rgba(156, 163, 175, 0.5)',
                          'rgba(34, 197, 94, 0.5)',
                        ],
                        borderColor: [
                          'rgba(99, 102, 241, 1)',
                          'rgba(156, 163, 175, 0.8)',
                          'rgba(34, 197, 94, 0.8)',
                        ],
                        borderWidth: 1,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                      y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                          callback: function(value) {
                            return value + '%';
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </Card>
            
            <Card className="p-6">
              <h3 className="text-xl font-semibold mb-4">Placement Readiness</h3>
              <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-4xl font-bold text-primary">{report.scores.readinessScore || overallScore}%</div>
                  </div>
                  <PieChart
                    data={{
                      labels: ['Ready', 'Gap'],
                      datasets: [
                        {
                          data: [report.scores.readinessScore || overallScore, 100 - (report.scores.readinessScore || overallScore)],
                          backgroundColor: [
                            'rgba(99, 102, 241, 0.8)',
                            'rgba(229, 231, 235, 0.5)',
                          ],
                          borderWidth: 0,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      cutout: '75%',
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          enabled: false
                        }
                      }
                    }}
                  />
                </div>
                <div className="mt-4 text-center">
                  <h4 className="font-semibold">Next Step</h4>
                  <p className="text-muted-foreground mt-1">{report.recommendations.nextAction || 'Proceed to Technical Test'}</p>
                </div>
              </div>
            </Card>
          </div>
        </motion.div>
        
        {/* Section-Wise Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">3️⃣ Section-Wise Analysis</h2>
          
          {/* Aptitude Section */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-red-100">
                <Brain className="h-6 w-6 text-red-500" />
              </div>
              <h3 className="text-xl font-semibold">Aptitude & Reasoning</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary">{report.scores.aptitude}%</div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Correct Answers</span>
                        <span className="font-medium">{report.sectionDetails?.aptitude.correctAnswers || 7}/{report.sectionDetails?.aptitude.totalQuestions || 10}</span>
                      </div>
                      <Progress value={(report.sectionDetails?.aptitude.correctAnswers || 7) / (report.sectionDetails?.aptitude.totalQuestions || 10) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Accuracy</span>
                        <span className="font-medium">{report.sectionDetails?.aptitude.accuracy || 70}%</span>
                      </div>
                      <Progress value={report.sectionDetails?.aptitude.accuracy || 70} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Speed</span>
                        <span className="font-medium">Medium</span>
                      </div>
                      <Progress value={65} className="h-2" />
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
                
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-2">Recommended Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    Practice data sufficiency, logical puzzles, and probability questions using online resources like HackerRank and IndiaBIX. Dedicate 30 minutes daily to improve your aptitude skills.
                  </p>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Industry Comparison</h4>
                    <div className="h-[150px]">
                      <BarChart
                        data={{
                          labels: ['Your Score', 'Industry Average', 'Gap'],
                          datasets: [
                            {
                              label: 'Aptitude Comparison',
                              data: [report.scores.aptitude, 80, Math.max(80 - report.scores.aptitude, 0)],
                              backgroundColor: [
                                'rgba(99, 102, 241, 0.8)',
                                'rgba(34, 197, 94, 0.5)',
                                'rgba(244, 63, 94, 0.5)',
                              ],
                              borderWidth: 1,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            y: {
                              beginAtZero: true,
                              max: 100,
                            }
                          }
                        }}
                      />
          </div>
                  </div>
                  </div>
                </div>
            </div>
          </Card>
          
          {/* Programming Section */}
          <Card className="p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-blue-100">
                <Lightbulb className="h-6 w-6 text-blue-500" />
              </div>
              <h3 className="text-xl font-semibold">General Programming</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary">{report.scores.programming}%</div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Correct Answers</span>
                        <span className="font-medium">{report.sectionDetails?.programming.correctAnswers || 6}/{report.sectionDetails?.programming.totalQuestions || 10}</span>
                      </div>
                      <Progress value={(report.sectionDetails?.programming.correctAnswers || 6) / (report.sectionDetails?.programming.totalQuestions || 10) * 100} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Accuracy</span>
                        <span className="font-medium">{report.sectionDetails?.programming.accuracy || 60}%</span>
                      </div>
                      <Progress value={report.sectionDetails?.programming.accuracy || 60} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Technical Depth</span>
                        <span className="font-medium">Intermediate</span>
                      </div>
                      <Progress value={70} className="h-2" />
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
                      {(report.sectionDetails?.programming.strengths || [
                        "Algorithm design",
                        "Code debugging",
                        "Basic data structures"
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
                      {(report.sectionDetails?.programming.weakAreas || [
                        "Time complexity analysis",
                        "Recursive functions",
                        "Advanced algorithms"
                      ]).map((weakness, i) => (
                        <li key={i}>{weakness}</li>
                      ))}
                    </ul>
          </div>
        </div>
                
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-2">Recommended Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    Revise sorting algorithms, recursion, and space complexity analysis. Practice coding problems on platforms like LeetCode and CodeChef focusing on time/space complexity optimization.
                  </p>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Programming Strength vs. Weakness</h4>
                    <div className="h-[150px]">
                      <RadarChart
                        data={{
                          labels: ['Algorithm Design', 'Data Structures', 'Problem Solving', 'Code Quality', 'Optimization'],
                          datasets: [
                            {
                              label: 'Your Skills',
                              data: [80, 65, 75, 60, 50],
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              borderColor: 'rgba(99, 102, 241, 1)',
                              borderWidth: 2,
                            },
                            {
                              label: 'Required Skills',
                              data: [70, 80, 75, 75, 70],
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              borderColor: 'rgba(34, 197, 94, 0.7)',
                              borderWidth: 2,
                              borderDash: [5, 5],
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              angleLines: {
                                display: true
                              },
                              suggestedMin: 0,
                              suggestedMax: 100,
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
          
          {/* Employability Section */}
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="p-2 rounded-full bg-teal-100">
                <GraduationCap className="h-6 w-6 text-teal-500" />
              </div>
              <h3 className="text-xl font-semibold">Employability Skills</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-1">
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="text-center mb-4">
                    <div className="text-3xl font-bold text-primary">
                      {typeof report.scores.employability === 'object' 
                        ? Math.round(Object.values(report.scores.employability).reduce((sum, val) => sum + val, 0) / 
                          Object.values(report.scores.employability).length)
                        : report.scores.employability
                      }%
                    </div>
                    <p className="text-sm text-muted-foreground">Overall Score</p>
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Soft Skills</span>
                        <span className="font-medium">{report.sectionDetails?.employability.softSkillsScore || 82}%</span>
                      </div>
                      <Progress value={report.sectionDetails?.employability.softSkillsScore || 82} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Professional Skills</span>
                        <span className="font-medium">{report.sectionDetails?.employability.professionalSkillsScore || 75}%</span>
                      </div>
                      <Progress value={report.sectionDetails?.employability.professionalSkillsScore || 75} className="h-2" />
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>AI Literacy & Job Readiness</span>
                        <span className="font-medium">{report.sectionDetails?.employability.aiLiteracyScore || 65}%</span>
                      </div>
                      <Progress value={report.sectionDetails?.employability.aiLiteracyScore || 65} className="h-2" />
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
                      {(report.sectionDetails?.employability.strengths || [
                        "Leadership",
                        "Adaptability",
                        "Teamwork",
                        "Communication"
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
                      {(report.sectionDetails?.employability.weakAreas || [
                        "Email writing",
                        "Business communication",
                        "Time management"
                      ]).map((weakness, i) => (
                        <li key={i}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t">
                  <h4 className="font-medium mb-2">Recommended Improvement</h4>
                  <p className="text-sm text-muted-foreground">
                    Enroll in DebugShala's Soft Skills Program for business communication training. Improve email writing skills through guided practice. Develop time management techniques to enhance productivity.
                  </p>
                  
                  <div className="mt-4">
                    <h4 className="font-medium mb-2">Soft Skills Analysis</h4>
                    <div className="h-[200px]">
                      <RadarChart
                        data={{
                          labels: [
                            'Communication', 
                            'Teamwork', 
                            'Leadership', 
                            'Problem Solving', 
                            'Time Management', 
                            'Adaptability', 
                            'Work Ethic',
                            'Critical Thinking'
                          ],
                          datasets: [
                            {
                              label: 'Your Skills',
                              data: [75, 82, 65, 70, 60, 85, 75, 68],
                              backgroundColor: 'rgba(99, 102, 241, 0.2)',
                              borderColor: 'rgba(99, 102, 241, 1)',
                              borderWidth: 2,
                            }
                          ]
                        }}
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          scales: {
                            r: {
                              angleLines: {
                                display: true
                              },
                              suggestedMin: 0,
                              suggestedMax: 100,
                            }
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="lg:col-span-2"
          >
            <ChartWrapper title="Skills Radar">
              {radarData && (
                <div className="h-[350px] w-full">
                  <RadarChart 
                    data={radarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          angleLines: {
                            display: true
                          },
                          suggestedMin: 0,
                          suggestedMax: 100,
                          ticks: {
                            stepSize: 20,
                            callback: function(value) {
                              return value + '%';
                            }
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return context.raw + '%';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </ChartWrapper>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <ChartWrapper title="Performance Breakdown">
              {barData && (
                <div className="h-[300px] w-full">
                  <BarChart 
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            callback: function(value) {
                              return value + '%';
                            }
                          }
                        }
                      },
                      plugins: {
                        legend: {
                          display: false
                        },
                        tooltip: {
                          callbacks: {
                            label: function(context) {
                              return context.raw + '%';
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              )}
            </ChartWrapper>
          </motion.div>
        </div>
        
        {/* Skill Gap Analysis */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">4️⃣ Personalized Skill Gap Analysis</h2>
          
          <Card className="p-6 mb-6">
            <h3 className="text-xl font-semibold mb-6">Industry Comparison Analysis</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-4">Your Skills vs. Industry Standards</h4>
                <div className="h-[300px]">
                  <BarChart
                    data={{
                      labels: ['Aptitude', 'Programming', 'Soft Skills', 'Overall'],
                      datasets: [
                        {
                          label: 'Your Skills',
                          data: [
                            report.scores.aptitude,
                            report.scores.programming,
                            report.sectionDetails?.employability.softSkillsScore || 82,
                            overallScore
                          ],
                          backgroundColor: 'rgba(99, 102, 241, 0.7)',
                          borderColor: 'rgba(99, 102, 241, 1)',
                          borderWidth: 1,
                        },
                        {
                          label: 'Industry Standard',
                          data: [
                            report.detailedAnalysis.industryComparison?.aptitude || 85,
                            report.detailedAnalysis.industryComparison?.programming || 70,
                            report.detailedAnalysis.industryComparison?.softSkills || 88,
                            85
                          ],
                          backgroundColor: 'rgba(34, 197, 94, 0.7)',
                          borderColor: 'rgba(34, 197, 94, 1)',
                          borderWidth: 1,
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 100,
                          ticks: {
                            callback: function(value) {
                              return value + '%';
                            }
                          }
                        }
                      }
                    }}
                  />
            </div>
              </div>
              
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-3">Key Gap Areas</h4>
                  <ul className="space-y-3">
                    {report.detailedAnalysis.skillGaps.slice(0, 4).map((gap, index) => (
                      <li key={index} className="flex gap-3 items-start p-3 bg-muted/50 rounded-lg">
                        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                        <span>{gap}</span>
                      </li>
                ))}
              </ul>
            </div>
                
                <div className="p-4 border rounded-lg bg-primary/5">
                  <h4 className="font-medium mb-2">Industry Insight</h4>
                  <p className="text-sm text-muted-foreground">
                    Based on current IT industry trends, candidates with strong problem-solving skills, AI literacy, and solid technical fundamentals are most in demand. Your overall gap of {report.detailedAnalysis.industryComparison?.overallGap || 15}% from industry standards can be addressed through targeted skill development.
                  </p>
          </div>

                <div className="p-4 border rounded-lg">
                  <h4 className="font-medium mb-2">Recommended Focus Areas</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {report.recommendations.skills.slice(0, 6).map((skill, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-primary"></div>
                        <span className="text-sm">{skill}</span>
            </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Final Score & Next Steps */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">6️⃣ Final Score & Next Steps</h2>
          
          <Card className="p-6 mb-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="text-center md:text-left">
                <h3 className="text-xl font-semibold mb-2">Placement Readiness Score</h3>
                <div className="flex items-center gap-2">
                  <div className="text-4xl font-bold text-primary">{report.scores.readinessScore || overallScore}%</div>
                  <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                    (report.scores.readinessScore || overallScore) >= 80 
                      ? 'bg-green-100 text-green-800' 
                      : (report.scores.readinessScore || overallScore) >= 60
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-red-100 text-red-800'
                  }`}>
                    {(report.scores.readinessScore || overallScore) >= 80 
                      ? 'High Readiness' 
                      : (report.scores.readinessScore || overallScore) >= 60
                        ? 'Moderate Readiness'
                        : 'Low Readiness'}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mt-2 max-w-md">
                  Your placement readiness score indicates your current preparedness for IT job roles based on technical skills, problem-solving abilities, and soft skills.
                </p>
              </div>
              
              <div className="bg-muted/30 p-6 rounded-lg max-w-md w-full">
                <h4 className="font-semibold mb-3">Recommended Next Action</h4>
                <p className="text-muted-foreground text-sm mb-4">
                  {report.recommendations.nextAction || 'Proceed to Technical Test'}
                </p>
                
                <div className="grid grid-cols-1 gap-2">
                  {(report.scores.readinessScore || overallScore) >= 80 ? (
                    <Button className="w-full">Direct Job Placement Process</Button>
                  ) : (report.scores.readinessScore || overallScore) >= 60 ? (
                    <Button className="w-full">Schedule Mentorship Session</Button>
                  ) : (
                    <Button className="w-full">Enroll in Training Program</Button>
                  )}
                  
                  <Button variant="outline" className="w-full">
                    Get Detailed Guidance
                  </Button>
                </div>
              </div>
            </div>
          </Card>
          
          <Card className="p-6 mb-6">
            <h3 className="text-xl font-semibold mb-4">Career Guidance & Job Recommendations</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3">Best-Suited Roles</h4>
                <div className="space-y-2">
                  {report.recommendations.careerPaths.slice(0, 3).map((role, index) => (
                    <div key={index} className="flex gap-3 items-center p-3 rounded-lg bg-muted/50">
                      <div className={`w-2 h-10 rounded-full bg-gradient-to-b ${
                        index === 0 ? 'from-green-400 to-green-600' : 
                        index === 1 ? 'from-blue-400 to-blue-600' : 
                        'from-purple-400 to-purple-600'
                      }`}></div>
                      <div>
                        <p className="font-medium">{role}</p>
                        <p className="text-xs text-muted-foreground">Alignment: {90 - (index * 10)}%</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-3">Recommended Companies</h4>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm">
                      Infosys, TCS, Wipro, Startups focusing on {report.formData.interestedDomains.join(', ')}
                    </p>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-3">Career Path Map</h4>
                <div className="bg-muted/30 p-4 rounded-lg h-[250px] relative overflow-hidden">
                  <div className="absolute inset-0 flex items-center justify-center opacity-10">
                    <div className="w-full h-full bg-[radial-gradient(circle_at_center,var(--primary)_0%,transparent_50%)]"></div>
                  </div>
                  
                  <div className="relative">
                    <h5 className="font-medium text-center mb-4">Suggested Career Progression</h5>
                    <div className="flex flex-col items-center">
                      <div className="w-px h-10 bg-muted-foreground/30"></div>
                      <div className="w-10 h-10 rounded-full bg-primary grid place-items-center text-primary-foreground mb-2">1</div>
                      <p className="text-center font-medium mb-1">Junior Developer</p>
                      <p className="text-xs text-muted-foreground text-center mb-4">0-2 years</p>
                      
                      <div className="w-px h-10 bg-muted-foreground/30"></div>
                      <div className="w-10 h-10 rounded-full bg-blue-500 grid place-items-center text-white mb-2">2</div>
                      <p className="text-center font-medium mb-1">Senior Developer</p>
                      <p className="text-xs text-muted-foreground text-center mb-4">2-5 years</p>
                      
                      <div className="w-px h-10 bg-muted-foreground/30"></div>
                      <div className="w-10 h-10 rounded-full bg-green-500 grid place-items-center text-white mb-2">3</div>
                      <p className="text-center font-medium mb-1">Technical Lead</p>
                      <p className="text-xs text-muted-foreground text-center">5+ years</p>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="font-medium mb-3">Training Focus Areas</h4>
                  <div className="p-3 border rounded-lg">
                    <p className="text-sm">
                      Improve coding & interview preparation, enhance portfolio with {report.formData.interestedDomains[0] || 'web development'} projects.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.7 }}
          className="mb-8"
        >
          <div className="bg-primary/10 p-6 rounded-lg text-center">
            <h2 className="text-2xl font-bold mb-3">📢 Take the Next Step!</h2>
            <p className="text-lg mb-4">Improve your skills with DebugShala's Personalized Training 🚀</p>
            
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
              <Button size="lg" className="gap-2">
                <GraduationCap className="h-5 w-5" />
                Enroll in Training
              </Button>
              
              <Button variant="outline" size="lg" className="gap-2">
                <Lightbulb className="h-5 w-5" />
                Book Career Consultation
              </Button>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <p>📍 Contact for Training Enrollment: +91 8982385539 / +91 9111333207</p>
              <p>🔗 Website: debugshala.com</p>
            </div>
          </div>
        </motion.div>
          </>
        )}
        
        <div className="mt-8 text-center">
          <Button 
            variant="outline" 
            size="lg"
            className="mx-auto"
            onClick={() => router.push('/')}
          >
            Back to Home
          </Button>
        </div>
      </div>
    </div>
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