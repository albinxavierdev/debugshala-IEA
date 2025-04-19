"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentService } from '@/lib/assessment-service';
import { Navbar } from '@/components/ui/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from '@/components/ui/use-toast';

// Helper to safely access localStorage
const getLocalStorage = () => {
  if (typeof window !== 'undefined') {
    return window.localStorage;
  }
  return undefined;
};

type Question = {
  id: string;
  type: 'mcq' | 'coding';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
  category?: string;
  timeLimit?: number;
  categoryName?: string;
};

type Section = {
  id: string;
  title: string;
  type: 'aptitude' | 'programming' | 'employability';
  category?: string;
  description: string;
  duration: number; // in minutes
  questions: Question[];
  completed: boolean;
  categories?: { id: string; name: string }[];
};

export default function AssessmentTest() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [sectionLoading, setSectionLoading] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState(60 * 60); // 60 minutes in seconds
  const [userName, setUserName] = useState('');
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, string>>({});
  const [sections, setSections] = useState<Section[]>([
    {
      id: 'aptitude',
      title: 'Aptitude & Reasoning',
      type: 'aptitude',
      description: 'Logical reasoning, numerical ability, and problem-solving questions',
      duration: 15,
      questions: [],
      completed: false
    },
    {
      id: 'programming',
      title: 'General Programming',
      type: 'programming',
      description: 'Basic coding concepts, algorithmic thinking, and programming fundamentals',
      duration: 15,
      questions: [],
      completed: false
    },
    {
      id: 'employability',
      title: 'Employability Skills',
      type: 'employability',
      description: 'Comprehensive assessment of work-related skills and professional abilities',
      duration: 30,
      questions: [],
      completed: false,
      categories: [
        { id: 'core', name: 'Core Work Skills' },
        { id: 'soft', name: 'Soft Skills' },
        { id: 'professional', name: 'Professional Development' },
        { id: 'communication', name: 'Communication Skills' },
        { id: 'teamwork', name: 'Teamwork & Collaboration' },
        { id: 'leadership', name: 'Leadership Potential' },
        { id: 'problem_solving', name: 'Problem Solving' },
        { id: 'domain', name: 'Domain Knowledge' }
      ]
    }
  ]);

  useEffect(() => {
    // Initialize assessment
    const initialize = async () => {
      setLoading(true);
      try {
        // Get user data from the assessment service 
        const formData = assessmentService.getFormData();
        const storage = getLocalStorage();
        
        if (formData) {
          setUserName(formData.name);
        } else if (storage) {
          const storedName = storage.getItem('debugshala_user_name');
          if (storedName) setUserName(storedName);
        }

        // Load questions for the first section
        await loadQuestionsForSection(0);
      } catch (error) {
        console.error('Error initializing assessment:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();

    // Set up timer
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto-submit when time expires
          handleTestComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const loadQuestionsForSection = async (sectionIndex: number) => {
    setQuestionsLoading(true);
    
    try {
      const section = sections[sectionIndex];
      // Set loading state for this specific section
      setSectionLoading(prev => ({...prev, [section.id]: true}));
      
      // Only load questions if we haven't already
      if (section.questions.length === 0) {
        const formData = assessmentService.getFormData();
        
        if (section.type === 'employability' && section.categories) {
          // For employability section, load personalized questions for each category
          const allQuestions: Question[] = [];
          
          // Create requests for all categories in parallel
          const promises = section.categories.map(async (category) => {
            try {
              console.log(`Requesting ${category.name} questions...`);
              const response = await fetch('/api/questions/openai', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: section.type,
                  category: category.id,
                  formData: formData,
                  userId: assessmentService.getUserId(),
                  questionCount: 2 // Request 2 questions per category (changed from 5)
                }),
              });
              
              if (!response.ok) {
                throw new Error(`Failed to load ${category.name} questions: ${response.status}`);
              }
              
              const data = await response.json();
              console.log(`Loaded ${data.questions?.length || 0} questions for ${category.name}`);
              
              // Add category name to each question for display
              return (data.questions || []).map((q: Question) => ({ 
                ...q, 
                categoryName: category.name 
              }));
            } catch (error) {
              console.error(`Error loading ${category.name} questions:`, error);
              // Just return empty array instead of fallback questions
              return [];
            }
          });
          
          // Wait for all requests to complete
          const questionsByCategory = await Promise.all(promises);
          
          // Flatten the array of arrays
          questionsByCategory.forEach(questions => {
            if (questions && Array.isArray(questions)) {
              allQuestions.push(...questions);
            }
          });
          
          console.log(`Total questions for ${section.title}: ${allQuestions.length}`);
          
          // Update the section with all questions
          const updatedSections = [...sections];
          updatedSections[sectionIndex] = {
            ...section,
            questions: allQuestions
          };
          
          setSections(updatedSections);
        } else {
          // For other sections, load questions as before
          console.log(`Requesting questions for ${section.title}...`);
          const response = await fetch('/api/questions/openai', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              type: section.type,
              formData: formData,
              userId: assessmentService.getUserId()
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to load questions');
          }

          const data = await response.json();
          console.log(`Received ${data.questions?.length || 0} questions for ${section.title}`);
          
          // Debug: Log the actual first question to see what's being returned
          if (data.questions && data.questions.length > 0) {
            console.log('First question sample:', JSON.stringify(data.questions[0]));
          }
          
          // Update the section with the loaded questions - no fallback
          const updatedSections = [...sections];
          updatedSections[sectionIndex] = {
            ...section,
            questions: data.questions || []
          };
          
          setSections(updatedSections);
          console.log(`Loaded ${data.questions?.length || 0} questions for ${section.title}`);
        }
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      // Don't load fallback questions, just keep section in loading state
      // Let the UI handle the loading state
    } finally {
      setQuestionsLoading(false);
      // Clear loading state for this section
      setSectionLoading(prev => {
        const newState = {...prev};
        if (sections[sectionIndex]) {
          newState[sections[sectionIndex].id] = false;
        }
        return newState;
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setUserAnswers({
      ...userAnswers,
      [questionId]: answer
    });
  };

  const handleNextQuestion = () => {
    const currentSection = sections[currentSectionIndex];
    const currentQuestion = currentSection?.questions[currentQuestionIndex];
    
    if (currentQuestionIndex < currentSection.questions.length - 1) {
      // Move to next question in this section
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      // Mark this section as completed
      const updatedSections = [...sections];
      updatedSections[currentSectionIndex].completed = true;
      setSections(updatedSections);

      // Move to next section if available
      if (currentSectionIndex < sections.length - 1) {
        setCurrentSectionIndex(currentSectionIndex + 1);
        setCurrentQuestionIndex(0);
        // Load questions for the next section
        loadQuestionsForSection(currentSectionIndex + 1);
      } else {
        // All sections completed
        handleTestComplete();
      }
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else if (currentSectionIndex > 0) {
      // Move to previous section
      setCurrentSectionIndex(currentSectionIndex - 1);
      // Move to the last question of the previous section
      const prevSection = sections[currentSectionIndex - 1];
      setCurrentQuestionIndex(prevSection.questions.length - 1);
    }
  };

  const handleTestComplete = async () => {
    setLoading(true);
    try {
      const storage = getLocalStorage();
      const startTime = storage?.getItem('testStartTime') || new Date().toISOString();
      const endTime = new Date().toISOString();

      // Calculate scores for each section
      const sectionScores = sections.map(section => {
        const totalQuestions = section.questions.length;
        if (totalQuestions === 0) return 0;
        
        let correctAnswers = 0;
        section.questions.forEach(question => {
          const userAnswer = userAnswers[question.id];
          if (userAnswer === question.correctAnswer) {
            correctAnswers++;
          }
        });
        
        return Math.round((correctAnswers / totalQuestions) * 100);
      });

      // Gather all questions from all sections
      const allQuestions = sections.flatMap(section => section.questions);
      
      // Calculate accurate employability sub-scores by category if possible
      const employabilitySubScores: Record<string, number> = {};
      
      // Get the employability section
      const employabilitySection = sections.find(s => s.type === 'employability');
      
      // Only calculate category scores if we have questions
      if (employabilitySection && employabilitySection.questions.length > 0) {
        // Group questions by category
        const questionsByCategory: Record<string, Question[]> = {};
        
        employabilitySection.questions.forEach(question => {
          const category = question.category || 'general';
          if (!questionsByCategory[category]) {
            questionsByCategory[category] = [];
          }
          questionsByCategory[category].push(question);
        });
        
        // Calculate scores by category
        Object.entries(questionsByCategory).forEach(([category, questions]) => {
          const totalCategoryQuestions = questions.length;
          if (totalCategoryQuestions === 0) {
            employabilitySubScores[category] = 0;
            return;
          }
          
          let correctCategoryAnswers = 0;
          questions.forEach(question => {
            const userAnswer = userAnswers[question.id];
            if (userAnswer === question.correctAnswer) {
              correctCategoryAnswers++;
            }
          });
          
          employabilitySubScores[category] = Math.round((correctCategoryAnswers / totalCategoryQuestions) * 100);
        });
      }

      // Generate report data with more accurate employability scores
      const reportData = {
        scores: {
          aptitude: sectionScores[0] || 75,
          programming: sectionScores[1] || 70,
          employability: Object.keys(employabilitySubScores).length > 0 
            ? employabilitySubScores 
            : {
                general: sectionScores[2] || 80,
                communication: 75,
                teamwork: 80,
                problemSolving: 85
              }
        },
        userAnswers,
        questions: allQuestions,
        timeTaken: {
          start: startTime,
          end: endTime
        }
      };

      try {
        console.log('Storing assessment results via service');
        // Store results via the assessment service with all necessary data
        await assessmentService.generateAssessmentReport(
          reportData.scores,
          reportData.userAnswers,
          reportData.questions
        );
        console.log('Assessment results stored successfully');
      } catch (serviceError) {
        console.error('Error using assessment service:', serviceError);
        
        // Direct API fallback if service fails
        try {
          console.log('Attempting API fallback for storing results');
          const response = await fetch('/api/assessment/report', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              formData: assessmentService.getFormData() || {
                name: userName || 'Candidate',
                email: '',
                phone: '',
                degree: 'Not specified',
                graduationYear: 'Not specified',
                collegeName: 'Not specified',
                interestedDomains: [],
              },
              scores: reportData.scores,
              userId: assessmentService.getUserId(),
              userAnswers: reportData.userAnswers,
              questions: reportData.questions
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
          console.log('Assessment results stored via API fallback');
        } catch (apiError) {
          console.error('API fallback failed:', apiError);
          
          // Save to localStorage as last resort
          const storage2 = getLocalStorage();
          if (storage2) {
            try {
              storage2.setItem('debugshala_assessment_full_report', JSON.stringify({
                scores: reportData.scores,
                userAnswers: reportData.userAnswers,
                questions: reportData.questions,
                timestamp: new Date().toISOString()
              }));
              console.log('Full assessment data saved to localStorage as fallback');
            } catch (storageError) {
              console.error('Error saving full report to localStorage:', storageError);
            }
          }
        }
      }
      
      // Always save basic results to local storage for quick access on results page
      const storage2 = getLocalStorage();
      if (storage2) {
        try {
          storage2.setItem('debugshala_assessment_scores', JSON.stringify(reportData.scores));
          console.log('Assessment scores saved to localStorage for quick access');
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
      }
      
      // Navigate to results page regardless of success/failure
      console.log('Navigating to results page');
      router.push('/assessment/results');
    } catch (error) {
      console.error('Error completing test:', error);
      alert('Error saving your results. We will redirect you to the results page, but your data might be incomplete.');
      
      // Navigate to results page anyway
      setTimeout(() => {
        router.push('/assessment/results');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  const currentSection = sections[currentSectionIndex];
  const currentQuestion = currentSection?.questions[currentQuestionIndex];
  const totalQuestions = currentSection?.questions.length || 0;
  
  // Calculate overall progress
  const totalSections = sections.length;
  const completedSections = sections.filter(s => s.completed).length;
  const currentSectionProgress = totalQuestions > 0 
    ? (currentQuestionIndex / totalQuestions) * (1 / totalSections)
    : 0;
  const overallProgress = (completedSections / totalSections) + currentSectionProgress;

  // Start the test when ready
  useEffect(() => {
    if (sections.length > 0 && currentSectionIndex < sections.length) {
      loadQuestionsForSection(currentSectionIndex);
    }
  }, [currentSectionIndex]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-24">
        <div className="flex flex-col items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
          <h1 className="text-2xl font-bold mt-6">Loading assessment...</h1>
        </div>
      </div>
    );
  }

  // Show loading screen if section is loading its questions
  const currentSectionId = sections[currentSectionIndex]?.id;
  const isCurrentSectionLoading = currentSectionId && sectionLoading[currentSectionId];

  // Render question UI
  const renderQuestionUI = () => {
    const section = sections[currentSectionIndex];
    if (!section) return null;

    // If section is loading questions, show loading state
    if (isCurrentSectionLoading || section.questions.length === 0) {
      // More engaging and personalized loading UI
      const userFormData = assessmentService.getFormData();
      return (
        <div className="flex flex-col items-center justify-center h-64 px-4">
          <div className="relative">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
            <div className="absolute -top-2 -right-2">
              <div className="h-5 w-5 bg-blue-500 rounded-full animate-pulse" />
            </div>
          </div>
          
          <h3 className="mt-6 text-xl font-semibold text-primary">Creating Your Personalized Assessment</h3>
          
          <div className="mt-4 text-center space-y-2">
            <p className="text-gray-700">
              Our AI is designing questions specifically for {userName || 'you'}{userFormData?.degree ? ` with a background in ${userFormData.degree}` : ''}.
            </p>
            
            {section.type === 'employability' && (
              <p className="text-gray-600 italic">
                Analyzing your profile to create relevant {section.title.toLowerCase()} scenarios...
              </p>
            )}
            
            {section.type === 'aptitude' && (
              <p className="text-gray-600 italic">
                Calibrating problem difficulty based on your experience level...
              </p>
            )}
            
            {section.type === 'programming' && (
              <p className="text-gray-600 italic">
                Tailoring technical questions to match your interests...
              </p>
            )}
          </div>
          
          <div className="mt-6 w-full max-w-md">
            <div className="h-1.5 w-full bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: `${Math.random() * 30 + 70}%` }}></div>
            </div>
          </div>
        </div>
      );
    }

    // If there are questions, show the current question
    if (currentQuestionIndex < section.questions.length) {
      const question = section.questions[currentQuestionIndex];
      
      // Debug: Log the current question to see if it's a fallback
      console.log(`Rendering question ${currentQuestionIndex + 1}:`, question);
      
      return (
        <div className="w-full max-w-3xl mx-auto">
          <div className="flex justify-between items-center mb-4">
            <div>
              <span className="text-sm font-medium text-gray-500">
                Question {currentQuestionIndex + 1} of {section.questions.length}
              </span>
              {question.categoryName && (
                <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  {question.categoryName}
                </span>
              )}
            </div>
            {question.timeLimit && (
              <div className="text-sm font-medium text-gray-500">
                Time remaining: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-xl font-semibold mb-4">{question.question}</h3>
            
            {question.type === 'mcq' && (
              <div className="space-y-3">
                {question.options && question.options.map((option, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-md cursor-pointer transition-all ${
                      userAnswers[question.id] === option 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onClick={() => handleAnswerSelect(question.id, option)}
                  >
                    <div className="flex items-start">
                      <div className={`flex-shrink-0 h-5 w-5 rounded-full border ${
                        userAnswers[question.id] === option
                          ? 'bg-blue-500 border-blue-500' 
                          : 'border-gray-400'
                      } mr-3 mt-0.5 flex items-center justify-center`}>
                        {userAnswers[question.id] === option && (
                          <div className="h-2 w-2 rounded-full bg-white" />
                        )}
                      </div>
                      <span>{option}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {question.type === 'coding' && (
              <div className="mt-4">
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md"
                  rows={4}
                  placeholder="Type your answer here..."
                  value={userAnswers[question.id] || ''}
                  onChange={(e) => handleAnswerSelect(question.id, e.target.value)}
                />
              </div>
            )}
          </div>
          
          <div className="flex justify-between">
            <Button 
              variant="outline"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            <Button onClick={handleNextQuestion}>
              {currentQuestionIndex === section.questions.length - 1 ? 'Finish Section' : 'Next'}
            </Button>
          </div>
        </div>
      );
    }
    
    return null;
  };
  
  // Render test UI or completion screen
  if (!sections.length) {
    // ... existing code for test intro screen ...
  } else {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        
        <div className="container mx-auto px-4 py-8 flex-1">
          <div className="mb-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Employability Assessment</h1>
              <p className="text-muted-foreground">Welcome, {userName || 'Candidate'}</p>
            </div>
            <div className="flex items-center gap-2 bg-primary/10 py-2 px-4 rounded-full">
              <Clock className="h-5 w-5 text-primary" />
              <div className="text-lg font-semibold text-primary">{formatTime(timeRemaining)}</div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <div className="font-medium">Progress</div>
              <div className="text-sm text-muted-foreground">
                Section {currentSectionIndex + 1} of {totalSections}
              </div>
            </div>
            <Progress value={overallProgress * 100} className="h-2" />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="md:col-span-1">
              <Card className="p-4">
                <h2 className="font-bold mb-4">Sections</h2>
                <div className="space-y-3">
                  {sections.map((section, index) => (
                    <div 
                      key={section.id}
                      className={`p-3 rounded-lg flex gap-3 items-center ${
                        index === currentSectionIndex 
                          ? 'bg-primary/10 text-primary font-medium' 
                          : section.completed 
                            ? 'bg-muted text-muted-foreground' 
                            : 'bg-card hover:bg-muted/50 cursor-pointer'
                      }`}
                      onClick={() => {
                        if (section.completed || index <= currentSectionIndex) {
                          setCurrentSectionIndex(index);
                          setCurrentQuestionIndex(0);
                        }
                      }}
                    >
                      {section.completed ? (
                        <CheckCircle className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <div className={`h-5 w-5 rounded-full flex-shrink-0 grid place-items-center text-xs font-medium ${
                          index === currentSectionIndex ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                    </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="truncate">{section.title}</div>
                        <div className="text-xs text-muted-foreground">{section.duration} mins</div>
                    </div>
                    </div>
                    ))}
                </div>
              </Card>
              </div>

            <div className="md:col-span-3">
              <Card className="p-6">
                {renderQuestionUI()}
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }
}