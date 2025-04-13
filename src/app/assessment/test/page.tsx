"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { assessmentService } from '@/lib/assessment-service';
import { Navbar } from '@/components/ui/navbar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Clock, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { errorHandler, ErrorLevel } from '@/lib/error-handler';
import { offlineManager } from '@/lib/offline-manager';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { toast } from 'react-hot-toast';
import { apiManager } from '@/lib/api-manager';

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

  // Save test progress to localStorage
  const saveTestProgress = () => {
    const storage = getLocalStorage();
    if (storage) {
      // Save current state of the test
      const testProgress = {
        sections,
        userAnswers,
        currentSectionIndex,
        currentQuestionIndex,
        timeRemaining,
        timestamp: new Date().toISOString()
      };
      
      try {
        storage.setItem('debugshala_test_progress', JSON.stringify(testProgress));
        console.log('Test progress saved to localStorage:', new Date().toISOString());
      } catch (error) {
        console.error('Error saving test progress to localStorage:', error);
      }
    }
  };
  
  // Load test progress from localStorage
  const loadTestProgress = () => {
    const storage = getLocalStorage();
    if (storage) {
      try {
        const savedProgress = storage.getItem('debugshala_test_progress');
        if (savedProgress) {
          const progress = JSON.parse(savedProgress);
          
          // Check if progress data is recent (within 3 hours)
          const savedTime = new Date(progress.timestamp).getTime();
          const currentTime = new Date().getTime();
          const threeHoursInMs = 3 * 60 * 60 * 1000;
          
          if (currentTime - savedTime < threeHoursInMs) {
            console.log('Restoring test progress from localStorage');
            setSections(progress.sections);
            setUserAnswers(progress.userAnswers);
            setCurrentSectionIndex(progress.currentSectionIndex);
            setCurrentQuestionIndex(progress.currentQuestionIndex);
            setTimeRemaining(progress.timeRemaining);
            return true;
          } else {
            console.log('Saved test progress is too old, starting fresh');
            storage.removeItem('debugshala_test_progress');
          }
        }
      } catch (error) {
        console.error('Error loading test progress from localStorage:', error);
      }
    }
    return false;
  };

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Combine useEffect for initialization and timer
  useEffect(() => {
    // Check if test is already completed to prevent resubmission on refresh
    const checkCompletionStatus = () => {
      // Use the assessment service method to check if test is completed
      if (assessmentService.isTestCompleted()) {
        console.log('Test already completed, redirecting to results page');
        router.push('/assessment/results');
        return true;
      }
      
      return false;
    };
    
    // Initialize assessment only if not already completed
    const initialize = async () => {
      setLoading(true);
      try {
        // Skip initialization if test is already completed
        if (checkCompletionStatus()) {
          return;
        }
        
        // Try to load test progress from localStorage first
        const progressLoaded = loadTestProgress();
        
        if (!progressLoaded) {
          // Only initialize from scratch if no progress was loaded
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
        }
      } catch (error) {
        console.error('Error initializing assessment:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initialize();

    // Set up timer
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerInterval);
          // Auto-submit when time expires
          handleTestComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    
    // Set up periodic autosave (every 30 seconds)
    const autosaveInterval = setInterval(saveTestProgress, 30000);
    
    // Save progress when the tab/browser closes
    const handleBeforeUnload = () => {
      saveTestProgress();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    
    // Clean up
    return () => {
      clearInterval(timerInterval);
      clearInterval(autosaveInterval);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [router]);

  // Save progress after each answer
  const handleAnswerSelect = (questionId: string, answer: string) => {
    const updatedAnswers = {
      ...userAnswers,
      [questionId]: answer
    };
    
    setUserAnswers(updatedAnswers);
    
    // Save progress immediately when user answers a question
    setTimeout(saveTestProgress, 0);
  };

  // Also save progress when moving to next question
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
    
    // Save progress on question navigation
    saveTestProgress();
  };

  // Move function declarations above useEffect
  const loadQuestionsByCategory = async (category: string, level: number): Promise<Question[]> => {
    try {
      setLoadingQuestions(true);
      
      console.log(`Loading questions for category: ${category}, level: ${level}`);
      
      // Try to use the API first (if online and api key is valid)
      try {
        const questions = await apiManager.getQuestionsByCategory(category, level);
        console.log(`Loaded ${questions.length} questions from API`);
        return questions;
      } catch (error) {
        console.warn('Failed to load questions from API, falling back to offline manager', error);
        
        // Fallback to offline manager if API call fails
        const questions = await offlineManager.getQuestionsByCategory(category, level);
        console.log(`Loaded ${questions.length} questions from offline manager`);
        return questions;
      }
    } finally {
      setLoadingQuestions(false);
    }
  };

  const loadQuestionsForSection = async (sectionIndex: number): Promise<void> => {
    if (sectionIndex >= sections.length) {
      console.error('Section index out of bounds:', sectionIndex);
      return;
    }
    
    const section = sections[sectionIndex];
    console.log(`Loading questions for section: ${section.title}`);
    
    try {
      // Reset section state
      setCurrentSectionIndex(sectionIndex);
      setCurrentQuestionIndex(0);
      setLoadingQuestions(true);
      
      let sectionQuestions: Question[] = [];
      
      // Load questions for each category in this section
      for (const category of section.categories) {
        const categoryQuestions = await loadQuestionsByCategory(
          category.name,
          category.level
        );
        
        // Create weighted copies of questions based on category weight
        const weightedQuestions = Array(category.weight)
          .fill(null)
          .flatMap(() => categoryQuestions);
        
        sectionQuestions = [...sectionQuestions, ...weightedQuestions];
      }
      
      // Shuffle questions and limit to the section's question count
      const shuffled = sectionQuestions.sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, section.questions.length);
      
      // Add these questions to our state
      setSections(prevSections => [
        ...prevSections.slice(0, sectionIndex),
        {
          ...section,
          questions: selected
        },
        ...prevSections.slice(sectionIndex + 1)
      ]);
      
      console.log(`Loaded ${selected.length} questions for section ${section.title}`);
    } catch (error) {
      console.error('Error loading questions:', error);
      // Show an error message to the user
      toast.error('Failed to load questions. Please try again.');
    } finally {
      setLoadingQuestions(false);
    }
  };

  const handleSubmitSection = async (): Promise<void> => {
    setSubmitting(true);
    
    try {
      // Save current section progress
      saveTestProgress();
      
      // Check if this was the last section
      if (currentSectionIndex >= sections.length - 1) {
        handleTestComplete();
      } else {
        // Move to next section
        await loadQuestionsForSection(currentSectionIndex + 1);
      }
    } catch (error) {
      console.error('Error submitting section:', error);
      toast.error('Failed to submit section. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleTestComplete = async () => {
    setLoading(true);
    try {
      // Calculate scores for each section
      const scores: Record<string, any> = {};
      let totalEmployability = 0;
      const employabilityScores: Record<string, number> = {};
      
      sections.forEach(section => {
        if (section.type === 'employability') {
          // Process employability categories separately
          if (section.categories) {
            const categoryCounts: Record<string, number> = {};
            const categoryScores: Record<string, number> = {};
            
            section.questions.forEach(question => {
              const categoryId = question.category || 'general';
              // Initialize if not exists
              if (!categoryCounts[categoryId]) {
                categoryCounts[categoryId] = 0;
                categoryScores[categoryId] = 0;
              }
              
              categoryCounts[categoryId]++;
              const userAnswer = userAnswers[question.id];
              if (userAnswer === question.correctAnswer) {
                categoryScores[categoryId]++;
              }
            });
            
            // Calculate percentage score for each category
            section.categories.forEach(category => {
              if (categoryCounts[category.id] > 0) {
                const score = (categoryScores[category.id] / categoryCounts[category.id]) * 100;
                employabilityScores[category.id] = Math.round(score);
                totalEmployability += score;
              } else {
                employabilityScores[category.id] = 0;
              }
            });
            
            // Set average employability score
            scores.employability = employabilityScores;
          }
        } else {
          // Calculate score for aptitude and programming
          const correctAnswers = section.questions.filter(
            q => userAnswers[q.id] === q.correctAnswer
          ).length;
          const totalQuestions = section.questions.length;
          const score = totalQuestions > 0 
            ? Math.round((correctAnswers / totalQuestions) * 100) 
            : 0;
          
          scores[section.type] = score;
        }
      });
      
      const reportData = {
        scores,
        answers: userAnswers,
        userId: assessmentService.getUserId(),
        timestamp: new Date().toISOString()
      };
      
      console.log('Assessment complete, scores:', scores);
      
      // Set completion flag in localStorage to prevent resubmission on refresh
      const storage = getLocalStorage();
      if (storage) {
        storage.setItem('debugshala_test_completed', 'true');
      }
      
      // Save scores using AssessmentService
      try {
        // Use offline manager for reliable submission
        const response = await offlineManager.fetch('/api/assessment/report-openai', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            formData: assessmentService.getFormData(),
            scores,
            userId: assessmentService.getUserId(),
            realtime: true
          }),
        });
        
        if (!response.ok) {
          throw new Error(`API response error: ${response.status}`);
        }
        
        const responseData = await response.json();
        console.log('Assessment report generated successfully:', responseData);
        
        // Store results locally as fallback
        offlineManager.storeOfflineData('latest_assessment_results', {
          scores: reportData.scores,
          timestamp: reportData.timestamp,
          responseData
        });
        
      } catch (apiError) {
        console.error('API error:', apiError);
        errorHandler.showErrorToast('Saving your results offline. They will be submitted when you reconnect.', {
          title: 'Error Saving Results',
          level: ErrorLevel.WARNING
        });
        
        // Queue the request for retry when online
        const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        try {
          offlineManager.queueRequest(
            '/api/assessment/report-openai',
            'POST',
            {
              formData: assessmentService.getFormData(),
              scores,
              userId: assessmentService.getUserId(),
              realtime: true
            }
          );
          console.log("Request queued with ID:", requestId);
        } catch (error) {
          console.error("Error queuing request:", error);
        }
        
        // Also store data offline
        offlineManager.storeOfflineData('latest_assessment_results', reportData);
      }
      
      // Navigate to results page regardless of success/failure
      router.push('/assessment/results');
    } catch (error) {
      errorHandler.showErrorToast('We had trouble processing your test results. Your data has been saved locally.', {
        title: 'Test Completion Error',
        level: ErrorLevel.WARNING,
        retryAction: handleTestComplete
      });
      
      // Create results data for offline storage in error case with fallback values
      const resultsData = {
        scores: {
          aptitude: calculateFallbackScore('aptitude'),
          programming: calculateFallbackScore('programming'),
          employability: calculateFallbackEmployabilityScores()
        },
        timestamp: new Date().toISOString()
      };
      offlineManager.storeOfflineData('latest_assessment_results', resultsData);
      
      // Navigate to results page after a short delay
      setTimeout(() => {
        router.push('/assessment/results');
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions for fallback scores
  const calculateFallbackScore = (sectionType: string): number => {
    const section = sections.find(s => s.type === sectionType);
    if (!section || section.questions.length === 0) return 70; // Default fallback
    
    const answeredQuestions = section.questions.filter(q => userAnswers[q.id]);
    if (answeredQuestions.length === 0) return 50; // User didn't answer any
    
    const correctAnswers = section.questions.filter(
      q => userAnswers[q.id] === q.correctAnswer
    ).length;
    
    return Math.round((correctAnswers / section.questions.length) * 100);
  };

  const calculateFallbackEmployabilityScores = (): Record<string, number> => {
    const section = sections.find(s => s.type === 'employability');
    if (!section || !section.categories || section.questions.length === 0) {
      return { general: 75 }; // Default fallback
    }
    
    const results: Record<string, number> = {};
    section.categories.forEach(category => {
      const categoryQuestions = section.questions.filter(q => q.category === category.id);
      if (categoryQuestions.length === 0) {
        results[category.id] = 70; // Default for this category
        return;
      }
      
      const answeredQuestions = categoryQuestions.filter(q => userAnswers[q.id]);
      if (answeredQuestions.length === 0) {
        results[category.id] = 60; // User didn't answer any in this category
        return;
      }
      
      const correctAnswers = categoryQuestions.filter(
        q => userAnswers[q.id] === q.correctAnswer
      ).length;
      
      results[category.id] = Math.round((correctAnswers / categoryQuestions.length) * 100);
    });
    
    return results;
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

  // Main render
  if (loading) {
    return (
      <ErrorBoundary>
        <div className="min-h-screen flex flex-col bg-background relative overflow-hidden">
          <Navbar />
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-indigo-500/10 opacity-20"></div>
          </div>
          <div className="flex-1 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center max-w-md"
            >
              <div className="relative w-20 h-20 mx-auto mb-6">
                <div className="absolute inset-0 rounded-full border-4 border-primary/30"></div>
                <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                <div className="absolute inset-2 flex items-center justify-center">
                  <Loader2 className="h-10 w-10 text-primary animate-pulse" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-3">Preparing Your Assessment</h3>
              <p className="text-muted-foreground mb-4">We're personalizing your test experience based on your profile and interests.</p>
              <div className="max-w-xs mx-auto">
                <Progress value={35} className="h-1.5 mb-2" />
                <p className="text-xs text-muted-foreground">Initializing test environment...</p>
              </div>
            </motion.div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
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
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <div className="relative w-16 h-16 mx-auto mb-5">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/20"></div>
                        <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                      </div>
                      <h4 className="text-lg font-medium mb-2">Loading Questions</h4>
                      <p className="text-muted-foreground mb-3">Creating personalized questions for {currentSection.title}...</p>
                      <div className="max-w-xs mx-auto">
                        <Progress value={65} className="h-1.5" />
                      </div>
                    </motion.div>
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
    </ErrorBoundary>
  );
}