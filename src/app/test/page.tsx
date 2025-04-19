"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { generateAptitudeQuestions, generateProgrammingQuestions, generateCodingTasks, generateEmployabilityQuestions } from '@/lib/gemini';

type Question = {
  id: string;
  type: 'mcq' | 'coding';
  question: string;
  options?: string[];
  correctAnswer: string | number;
  explanation?: string;
  difficulty: 'easy' | 'medium' | 'hard';
};

export default function TestPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentSection, setCurrentSection] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | number>>({});
  const [submitting, setSubmitting] = useState(false);

  const sections = [
    { title: 'Aptitude Test', type: 'aptitude' },
    { title: 'Programming Knowledge', type: 'programming' },
    { title: 'Coding Tasks', type: 'coding' },
    { title: 'Employability Assessment', type: 'employability' }
  ];

  useEffect(() => {
    const loadQuestions = async () => {
      try {
        const [aptitudeQuestions, programmingQuestions, codingTasks, employabilityQuestions] = await Promise.all([
          generateAptitudeQuestions(),
          generateProgrammingQuestions(),
          generateCodingTasks(),
          generateEmployabilityQuestions('general')
        ]);

        setQuestions([
          ...aptitudeQuestions,
          ...programmingQuestions,
          ...codingTasks,
          ...employabilityQuestions
        ]);
        setLoading(false);
      } catch (error) {
        console.error('Error loading questions:', error);
        toast({
          title: 'Error',
          description: 'Failed to load assessment questions. Please try again.',
          variant: 'destructive'
        });
      }
    };

    loadQuestions();

    // Add exit warning
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [toast]);

  const currentSectionQuestions = questions.filter(q => {
    switch (sections[currentSection].type) {
      case 'aptitude':
        return q.type === 'mcq' && q.difficulty !== 'hard';
      case 'programming':
        return q.type === 'mcq' && q.difficulty === 'medium';
      case 'coding':
        return q.type === 'coding';
      case 'employability':
        return q.type === 'mcq' && q.difficulty === 'medium';
      default:
        return false;
    }
  });

  const progress = (currentQuestion / currentSectionQuestions.length) * 100;

  const handleAnswer = (answer: string | number) => {
    const questionId = currentSectionQuestions[currentQuestion].id;
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < currentSectionQuestions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else if (currentSection < sections.length - 1) {
      setCurrentSection(prev => prev + 1);
      setCurrentQuestion(0);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // Calculate score and store results
      const score = Object.entries(answers).reduce((acc, [questionId, answer]) => {
        const question = questions.find(q => q.id === questionId);
        if (question && answer === question.correctAnswer) {
          return acc + 1;
        }
        return acc;
      }, 0);

      // TODO: Store results in Supabase
      
      toast({
        title: 'Assessment Complete',
        description: 'Your results have been submitted successfully.',
      });
      
      router.push('/results');
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast({
        title: 'Error',
        description: 'Failed to submit assessment. Please try again.',
        variant: 'destructive'
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assessment questions...</span>
      </div>
    );
  }

  const currentQ = currentSectionQuestions[currentQuestion];

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold mb-2">{sections[currentSection].title}</h1>
        <Progress value={progress} className="w-full" />
        <p className="text-sm text-gray-500 mt-2">
          Question {currentQuestion + 1} of {currentSectionQuestions.length}
        </p>
      </div>

      <Card className="p-6">
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-4">{currentQ.question}</h2>
          
          {currentQ.type === 'mcq' && currentQ.options && (
            <div className="space-y-4">
              {currentQ.options.map((option, index) => (
                <Button
                  key={index}
                  variant={answers[currentQ.id] === option ? 'default' : 'outline'}
                  className="w-full justify-start text-left"
                  onClick={() => handleAnswer(option)}
                >
                  {option}
                </Button>
              ))}
            </div>
          )}

          {currentQ.type === 'coding' && (
            <div className="space-y-4">
              <textarea
                className="w-full h-48 p-4 border rounded-md font-mono"
                placeholder="Write your solution here..."
                value={answers[currentQ.id] as string || ''}
                onChange={(e) => handleAnswer(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleNext}
            disabled={!answers[currentQ.id] || submitting}
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : currentSection === sections.length - 1 && currentQuestion === currentSectionQuestions.length - 1 ? (
              'Submit Assessment'
            ) : (
              'Next Question'
            )}
          </Button>
        </div>
      </Card>
    </div>
  );
} 