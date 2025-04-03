"use client"

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AssessmentResult } from '@/types/assessment';
import { assessmentService } from '@/lib/assessment-service';
import { Navbar } from '@/components/ui/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
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

export default function ResultsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AssessmentResult | null>(null);

  useEffect(() => {
    const loadReport = async () => {
      try {
        // Try to get report from assessment service first
        const serviceReport = assessmentService.getAssessmentResults();
        
        if (serviceReport) {
          setReport(serviceReport);
          setLoading(false);
          return;
        }
        
        // Try to get scores from localStorage as fallback
        const storage = getLocalStorage();
        if (storage) {
          const scoresJson = storage.getItem('debugshala_assessment_scores');
          
          if (scoresJson) {
            try {
              const scores = JSON.parse(scoresJson);
              
              // Create a minimal report with the scores
              const minimalReport: AssessmentResult = {
                ...fallbackResult,
                scores,
                timestamp: new Date().toISOString()
              };
              
              setReport(minimalReport);
              setLoading(false);
              return;
            } catch (parseError) {
              console.error('Error parsing scores from localStorage:', parseError);
            }
          }
        }
        
        // If no data is available, use complete fallback
        setReport(fallbackResult);
        
      } catch (error) {
        console.error('Error loading report:', error);
        
        // Use fallback data
        setReport(fallbackResult);
      } finally {
    setLoading(false);
      }
    };

    loadReport();
  }, []);

  const calculateLevel = (score: number) => {
    if (score >= 85) return { text: 'Expert', color: 'bg-green-600', textColor: 'text-green-600' };
    if (score >= 70) return { text: 'Proficient', color: 'bg-blue-600', textColor: 'text-blue-600' };
    if (score >= 50) return { text: 'Intermediate', color: 'bg-amber-500', textColor: 'text-amber-500' };
    return { text: 'Beginner', color: 'bg-red-500', textColor: 'text-red-500' };
  };

  const getOverallScore = () => {
    if (!report?.scores) return 0;
    
    if (report.scores.total) {
      return report.scores.total;
    }
    
    const { aptitude, programming, employability } = report.scores;
    
    // Calculate avg employability score
    let employabilityAvg = 0;
    if (typeof employability === 'object') {
      const values = Object.values(employability);
      employabilityAvg = values.length > 0 
        ? values.reduce((sum, val) => sum + val, 0) / values.length 
        : 0;
    } else if (typeof employability === 'number') {
      employabilityAvg = employability;
    }
    
    // Weighted average: 30% aptitude, 30% programming, 40% employability
    return Math.round((aptitude * 0.3) + (programming * 0.3) + (employabilityAvg * 0.4));
  };

  // Prepare chart data
  const prepareRadarData = () => {
    if (!report) return null;
    
    const employabilityScores = report.scores.employability;
    if (typeof employabilityScores !== 'object') return null;
    
    const labels = Object.keys(employabilityScores).map(key => 
      key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
    );
    
    const data = {
      labels,
      datasets: [
        {
          label: 'Employability Skills',
          data: Object.values(employabilityScores),
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 1)',
          borderWidth: 2,
          pointBackgroundColor: 'rgba(99, 102, 241, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(99, 102, 241, 1)'
        }
      ]
    };
    
    return data;
  };
  
  const prepareBarData = () => {
    if (!report) return null;
    
    const data = {
      labels: ['Aptitude', 'Programming', 'Employability'],
      datasets: [
        {
          label: 'Assessment Scores',
          data: [
            report.scores.aptitude, 
            report.scores.programming, 
            typeof report.scores.employability === 'object' 
              ? Object.values(report.scores.employability).reduce((sum, val) => sum + val, 0) / 
                Object.values(report.scores.employability).length
              : report.scores.employability
          ],
          backgroundColor: [
            'rgba(255, 99, 132, 0.7)',
            'rgba(54, 162, 235, 0.7)',
            'rgba(75, 192, 192, 0.7)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(75, 192, 192, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
    
    return data;
  };
  
  const preparePieData = () => {
    if (!report) return null;
    
    // Count strengths and areas for improvement
    const strengthsCount = report.detailedAnalysis.strengths.length;
    const improvementCount = report.detailedAnalysis.areasForImprovement.length;
    const gapsCount = report.detailedAnalysis.skillGaps.length;
    
    const data = {
      labels: ['Strengths', 'Areas for Improvement', 'Skill Gaps'],
      datasets: [
        {
          data: [strengthsCount, improvementCount, gapsCount],
          backgroundColor: [
            'rgba(75, 192, 192, 0.7)',
            'rgba(255, 206, 86, 0.7)',
            'rgba(255, 99, 132, 0.7)'
          ],
          borderColor: [
            'rgba(75, 192, 192, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(255, 99, 132, 1)'
          ],
          borderWidth: 1
        }
      ]
    };
    
    return data;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
            <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-lg text-muted-foreground">Generating your assessment report...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Assessment Results Not Found</h2>
            <p className="text-muted-foreground mb-6">We couldn't find your assessment results. You may need to complete an assessment first.</p>
            <Button onClick={() => router.push('/assessment/instructions')}>
              Take Assessment
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const overallScore = getOverallScore();
  const overallLevel = calculateLevel(overallScore);
  const radarData = prepareRadarData();
  const barData = prepareBarData();
  const pieData = preparePieData();

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
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <RadarIcon className="h-5 w-5 text-primary" />
                Employability Skills Breakdown
              </h2>
              
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
            </Card>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                <PieChartIcon className="h-5 w-5 text-primary" />
                Analysis Breakdown
              </h2>
              
              {pieData && (
                <div className="h-[250px] mx-auto">
                  <PieChart 
                    data={pieData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
                        }
                      }
                    }}
                  />
                </div>
              )}
              
              <div className="mt-6 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Based on {report.detailedAnalysis.strengths.length + 
                    report.detailedAnalysis.areasForImprovement.length + 
                    report.detailedAnalysis.skillGaps.length} analyzed factors
                </p>
              </div>
            </Card>
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
          
          <Card className="p-6">
            <h3 className="text-xl font-semibold mb-6">Performance Comparison with Top Performers</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <div className="text-4xl font-bold text-primary mb-2">{report.scores.percentile || 68}%</div>
                <p className="text-sm text-muted-foreground">Your Percentile Rank</p>
                <p className="text-xs mt-2">You performed better than {report.scores.percentile || 68}% of candidates</p>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <div className="text-4xl font-bold text-blue-500 mb-2">{overallScore}%</div>
                <p className="text-sm text-muted-foreground">Your Overall Score</p>
                <p className="text-xs mt-2">Industry average is 75%</p>
              </div>
              
              <div className="bg-muted/30 p-4 rounded-lg text-center">
                <div className="text-4xl font-bold text-green-500 mb-2">85%</div>
                <p className="text-sm text-muted-foreground">Top Performers Average</p>
                <p className="text-xs mt-2">Gap of {85 - overallScore}% to reach top tier</p>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t">
              <h4 className="font-medium mb-3">Key Differentiators of Top Performers</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium mb-2">Technical Excellence</h5>
                  <p className="text-sm text-muted-foreground">
                    Top performers demonstrate strong algorithmic thinking, optimal code solutions, and advanced problem-solving capabilities.
                  </p>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium mb-2">Communication Skills</h5>
                  <p className="text-sm text-muted-foreground">
                    They excel in articulating technical concepts clearly and collaborating effectively in team environments.
                  </p>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium mb-2">Learning Agility</h5>
                  <p className="text-sm text-muted-foreground">
                    High adaptability to new technologies and continuous self-improvement distinguish top candidates.
                  </p>
                </div>
                
                <div className="p-3 border rounded-lg">
                  <h5 className="font-medium mb-2">Project Experience</h5>
                  <p className="text-sm text-muted-foreground">
                    Practical application of skills through real projects or substantial coursework separates top performers.
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
        
        {/* Improvement Plan */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mb-8"
        >
          <h2 className="text-2xl font-bold mb-4">5️⃣ Detailed Improvement Plan & Study Guide</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Aptitude Improvement */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">For Aptitude & Reasoning</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Recommended Books</h4>
                  <ul className="space-y-2">
                    {(report.recommendations.aptitudeResources?.books || [
                      "Quantitative Aptitude by R.S. Aggarwal",
                      "Logical Reasoning by M.K. Pandey"
                    ]).map((book, index) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{book}</span>
                      </li>
                ))}
              </ul>
            </div>
                
                <div>
                  <h4 className="font-medium mb-2">Practice Platforms</h4>
                  <ul className="space-y-2">
                    {(report.recommendations.aptitudeResources?.platforms || [
                      "HackerRank",
                      "IndiaBIX",
                      "Brilliant.org"
                    ]).map((platform, index) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{platform}</span>
                      </li>
                    ))}
                  </ul>
          </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Daily Practice Plan</h4>
                  <p className="text-sm text-muted-foreground">
                    {report.recommendations.aptitudeResources?.practiceGuide || 
                      "5 reasoning questions + 10-minute numerical drills daily"
                    }
                  </p>
        </div>

                <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">Focus Areas</h4>
                  <div className="flex flex-wrap gap-2">
                    {['Data interpretation', 'Probability', 'Series completion', 'Logical puzzles'].map((area, index) => (
                      <div key={index} className="px-2 py-1 bg-white text-xs rounded-full">
                        {area}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
            
            {/* Programming Improvement */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Lightbulb className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">For Programming & Coding</h3>
              </div>
              
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Courses to Take</h4>
                  <ul className="space-y-2">
                    {(report.recommendations.programmingResources?.courses || [
                      "DebugShala's Web Development Bootcamp",
                      "Data Structures Masterclass"
                    ]).map((course, index) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{course}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Coding Challenges</h4>
                  <ul className="space-y-2">
                    {(report.recommendations.programmingResources?.platforms || [
                      "LeetCode",
                      "CodeChef (Beginner Level)",
                      "HackerRank"
                    ]).map((platform, index) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{platform}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Study Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {(report.recommendations.programmingResources?.topicsToStudy || [
                      "Data structures",
                      "Recursion",
                      "OOP concepts",
                      "Design patterns"
                    ]).map((topic, index) => (
                      <div key={index} className="px-2 py-1 bg-white text-xs rounded-full">
                        {topic}
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">Recommended Project</h4>
                  <p className="text-sm text-muted-foreground">
                    Build a small web application that demonstrates CRUD operations, API integration, and responsive design to showcase your practical skills.
                  </p>
                </div>
              </div>
            </Card>
            
            {/* Employability Improvement */}
            <Card className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <GraduationCap className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-semibold">For Employability & Soft Skills</h3>
              </div>
              
              <div className="space-y-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <h4 className="font-medium mb-2">Resume & Profile</h4>
                  <p className="text-sm text-muted-foreground">
                    Improve Resume & LinkedIn Profile with DebugShala Career Coach to highlight your technical strengths and projects.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Recommended Courses</h4>
                  <ul className="space-y-2">
                    {(report.recommendations.employabilityResources?.courses || [
                      "Business Communication & Email Writing",
                      "Technical Interview Preparation",
                      "Time Management for Professionals"
                    ]).map((course, index) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{course}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Activities</h4>
                  <ul className="space-y-2">
                    {(report.recommendations.employabilityResources?.activities || [
                      "Mock Interviews for confidence-building",
                      "Resume Building Workshop",
                      "LinkedIn Profile Optimization"
                    ]).map((activity, index) => (
                      <li key={index} className="flex gap-2 items-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary"></div>
                        <span className="text-sm">{activity}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                
                <div className="p-3 border border-primary/20 bg-primary/5 rounded-lg">
                  <h4 className="font-medium mb-2">Industry Engagement</h4>
                  <p className="text-sm text-muted-foreground">
                    Join relevant tech communities and attend industry webinars to expand your network and stay current with industry trends.
                  </p>
                </div>
              </div>
            </Card>
          </div>
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