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
      
      // Only load questions if we haven't already
      if (section.questions.length === 0) {
        const formData = assessmentService.getFormData();
        
        if (section.type === 'employability' && section.categories) {
          // For employability section, load personalized questions for each category
          const allQuestions: Question[] = [];
          
          // Create requests for all categories in parallel
          const promises = section.categories.map(async (category) => {
            try {
              const response = await fetch('/api/questions/gemini', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  type: section.type,
                  category: category.id,
                  formData: formData,
                  userId: assessmentService.getUserId(),
                  questionCount: 5 // Request 5 questions per category
                }),
              });
              
              if (!response.ok) {
                throw new Error(`Failed to load ${category.name} questions: ${response.status}`);
              }
              
              const data = await response.json();
              console.log(`Loaded ${data.questions.length} questions for ${category.name}`);
              
              // Add category name to each question for display
              return data.questions.map((q: Question) => ({ 
                ...q, 
                categoryName: category.name 
              }));
            } catch (error) {
              console.error(`Error loading ${category.name} questions:`, error);
              // Return fallback questions for this category
              return generateFallbackQuestions(section.type, 5, category.id, category.name);
            }
          });
          
          // Wait for all requests to complete
          const questionsByCategory = await Promise.all(promises);
          
          // Flatten the array of arrays
          questionsByCategory.forEach(questions => {
            allQuestions.push(...questions);
          });
          
          // Update the section with all questions
          const updatedSections = [...sections];
          updatedSections[sectionIndex] = {
            ...section,
            questions: allQuestions
          };
          
          setSections(updatedSections);
        } else {
          // For other sections, load questions as before
          const response = await fetch('/api/questions/gemini', {
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
          
          // Update the section with the loaded questions
          const updatedSections = [...sections];
          updatedSections[sectionIndex] = {
            ...section,
            questions: data.questions
          };
          
          setSections(updatedSections);
          console.log(`Loaded ${data.questions.length} questions for ${section.title}`);
        }
      }
    } catch (error) {
      console.error('Error loading questions:', error);
      // Load fallback questions if API fails
      const fallbackQuestions = generateFallbackQuestions(sections[sectionIndex].type, 8);
      
      const updatedSections = [...sections];
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        questions: fallbackQuestions
      };
      
      setSections(updatedSections);
    } finally {
      setQuestionsLoading(false);
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

      // Generate report data
      const reportData = {
        scores: {
          aptitude: sectionScores[0] || 75,
          programming: sectionScores[1] || 70,
          employability: {
            general: sectionScores[2] || 80,
            communication: 75,
            teamwork: 80,
            problemSolving: 85
          }
        },
        userAnswers,
        sections,
        timeTaken: {
          start: startTime,
          end: endTime
        }
      };

      try {
        // Try to store results via the assessment service
        await assessmentService.generateAssessmentReport(reportData.scores);
      } catch (serviceError) {
        console.error('Error using assessment service:', serviceError);
        
        // Direct API fallback if service fails
        try {
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
              userId: assessmentService.getUserId()
            }),
          });
          
          if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
          }
        } catch (apiError) {
          console.error('API fallback failed:', apiError);
          // We'll continue to results page anyway
        }
      }
      
      // Save basic results to local storage as last resort fallback
      const storage2 = getLocalStorage();
      if (storage2) {
        try {
          storage2.setItem('debugshala_assessment_scores', JSON.stringify(reportData.scores));
        } catch (storageError) {
          console.error('Error saving to localStorage:', storageError);
        }
      }
      
      // Navigate to results page regardless of success/failure
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

  // Generate some fallback questions in case the API fails
  const generateFallbackQuestions = (type: string, count: number, categoryId?: string, categoryName?: string): Question[] => {
    const questions: Question[] = [];
    
    if (type === 'employability' && categoryId && categoryName) {
      // Generate questions for a specific employability category
      for (let i = 0; i < count; i++) {
        questions.push({
          id: `${categoryId}-${i+1}`,
          type: 'mcq',
          question: `Sample ${categoryName} question ${i+1} for ${userName || 'candidate'} with background in ${assessmentService.getFormData()?.degree || 'your field'}`,
          options: [
            `${categoryName} Option A`, 
            `${categoryName} Option B`, 
            `${categoryName} Option C`, 
            `${categoryName} Option D`
          ],
          correctAnswer: `${categoryName} Option B`,
          explanation: `This is the explanation for ${categoryName} question ${i+1}.`,
          difficulty: 'medium',
          category: categoryId,
          categoryName: categoryName,
          timeLimit: 60
        });
      }
      return questions;
    }
    
    switch (type) {
      case 'aptitude':
        questions.push(
          {
            id: 'apt-1',
            type: 'mcq',
            question: 'If a train travels 360 kilometers in 3 hours, what is its speed?',
            options: ['90 km/h', '120 km/h', '180 km/h', '240 km/h'],
            correctAnswer: '120 km/h',
            difficulty: 'easy',
            category: 'numerical'
          },
          {
            id: 'apt-2',
            type: 'mcq',
            question: 'Which number comes next in the sequence: 2, 4, 8, 16, __?',
            options: ['24', '32', '36', '64'],
            correctAnswer: '32',
            difficulty: 'easy',
            category: 'logical'
          },
          {
            id: 'apt-3',
            type: 'mcq',
            question: 'If all Zips are Zaps, and some Zaps are Zooms, which statement must be true?',
            options: [
              'All Zips are Zooms',
              'Some Zips are Zooms',
              'No Zips are Zooms',
              'All Zooms are Zips'
            ],
            correctAnswer: 'Some Zips are Zooms',
            difficulty: 'medium',
            category: 'logical'
          }
        );
        break;
        
      case 'programming':
        questions.push(
          {
            id: 'prog-1',
            type: 'mcq',
            question: 'What is the time complexity of binary search?',
            options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
            correctAnswer: 'O(log n)',
            difficulty: 'medium',
            category: 'algorithms'
          },
          {
            id: 'prog-2',
            type: 'mcq',
            question: 'Which of these is NOT a JavaScript data type?',
            options: ['String', 'Boolean', 'Character', 'Number'],
            correctAnswer: 'Character',
            difficulty: 'easy',
            category: 'coding'
          },
          {
            id: 'prog-3',
            type: 'mcq',
            question: 'What does SQL stand for?',
            options: [
              'Structured Query Language',
              'Sequential Query Language',
              'Structured Question Language',
              'Simple Query Language'
            ],
            correctAnswer: 'Structured Query Language',
            difficulty: 'easy',
            category: 'data-structures'
          }
        );
        break;
        
      case 'employability':
        questions.push(
          {
            id: 'emp-1',
            type: 'mcq',
            question: 'A team member consistently misses deadlines. The best approach would be:',
            options: [
              'Immediately report them to management',
              'Privately discuss the issue and offer assistance',
              'Take over their work to ensure it gets done',
              'Ignore the issue as it\'s not your responsibility'
            ],
            correctAnswer: 'Privately discuss the issue and offer assistance',
            difficulty: 'medium',
            category: 'soft'
          },
          {
            id: 'emp-2',
            type: 'mcq',
            question: 'When receiving critical feedback on your work, the most professional response is:',
            options: [
              'Defend your decisions firmly',
              'Listen attentively, ask questions, and thank them for the feedback',
              'Immediately promise to make all suggested changes',
              'Explain why their criticism is misguided'
            ],
            correctAnswer: 'Listen attentively, ask questions, and thank them for the feedback',
            difficulty: 'medium',
            category: 'professional'
          },
          {
            id: 'emp-3',
            type: 'mcq',
            question: 'When joining a new team, the best initial approach is to:',
            options: [
              'Immediately suggest improvements to their processes',
              'Work silently and avoid asking questions',
              'Observe, learn the team dynamics, and ask thoughtful questions',
              'Point out mistakes you notice to show your expertise'
            ],
            correctAnswer: 'Observe, learn the team dynamics, and ask thoughtful questions',
            difficulty: 'medium',
            category: 'core'
          }
        );
        break;
    }
    
    // Add more generic questions to reach the desired count
    while (questions.length < count) {
      const index = questions.length + 1;
      questions.push({
        id: `${type}-${index}`,
        type: 'mcq',
        question: `Sample ${type} question ${index}`,
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option B',
        difficulty: 'medium',
        category: type
      });
    }
    
    return questions;
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-lg text-muted-foreground">Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

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
              {questionsLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
                  <p className="text-muted-foreground">Loading questions...</p>
                </div>
              ) : currentQuestion ? (
                <motion.div
                  key={currentQuestion.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="flex justify-between items-center mb-6">
                    <div className="text-sm text-muted-foreground">
                      Question {currentQuestionIndex + 1} of {totalQuestions}
                </div>
                    <div className="text-sm font-medium px-2 py-1 rounded bg-muted">
                      {currentQuestion.categoryName || currentQuestion.category || currentSection.title}
                </div>
              </div>
                  
                  <h3 className="text-xl font-medium mb-6">{currentQuestion.question}</h3>
                  
                  <div className="space-y-3 mb-8">
                    {currentQuestion.options?.map((option, i) => (
                      <div 
                        key={i}
                        className={`p-4 rounded-lg border-2 transition-colors ${
                          userAnswers[currentQuestion.id] === option
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:border-muted-foreground/50 cursor-pointer'
                        }`}
                        onClick={() => handleAnswerSelect(currentQuestion.id, option)}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full grid place-items-center border-2 flex-shrink-0 mt-0.5 ${
                            userAnswers[currentQuestion.id] === option
                              ? 'border-primary bg-primary text-primary-foreground font-medium'
                              : 'border-muted-foreground/30'
                          }`}>
                            {String.fromCharCode(65 + i)}
                          </div>
                          <div>{option}</div>
            </div>
          </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between pt-4 border-t">
                    <Button 
                      variant="outline" 
                      onClick={handlePreviousQuestion}
                      disabled={currentSectionIndex === 0 && currentQuestionIndex === 0}
                      className="gap-1"
                    >
                      <ArrowLeft className="h-4 w-4" /> Previous
                    </Button>
                    
                    <Button
                      onClick={handleNextQuestion}
                      className="gap-1"
                      disabled={!userAnswers[currentQuestion.id]}
                    >
                      {currentSectionIndex === sections.length - 1 && currentQuestionIndex === totalQuestions - 1 
                        ? 'Complete Assessment'
                        : 'Next'} 
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </motion.div>
              ) : (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">No questions available for this section.</p>
                  <Button
                    onClick={() => loadQuestionsForSection(currentSectionIndex)}
                    className="mt-4"
                  >
                    Try Loading Questions Again
                  </Button>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}