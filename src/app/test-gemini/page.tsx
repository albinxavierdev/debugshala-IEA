"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

type QuestionType = 'aptitude' | 'programming' | 'coding' | 'employability';

export default function TestQuestions() {
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<QuestionType>('aptitude');

  const generateQuestions = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/questions/groq', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          category: type === 'employability' ? 'general' : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate questions');
      }

      const data = await response.json();
      setQuestions(data.questions);
    } catch (err) {
      console.error('Error generating questions:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate questions');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-2xl font-bold mb-4">Assessment Question Generator</h1>
      <p className="text-gray-600 mb-6">Using Groq LLM (Llama 70B) for high-quality question generation</p>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <Button
          variant={type === 'aptitude' ? 'default' : 'outline'}
          onClick={() => setType('aptitude')}
          disabled={loading}
          className="flex-1 min-w-[150px]"
        >
          Aptitude Questions
        </Button>
        <Button
          variant={type === 'programming' ? 'default' : 'outline'}
          onClick={() => setType('programming')}
          disabled={loading}
          className="flex-1 min-w-[150px]"
        >
          Programming Questions
        </Button>
        <Button
          variant={type === 'coding' ? 'default' : 'outline'}
          onClick={() => setType('coding')}
          disabled={loading}
          className="flex-1 min-w-[150px]"
        >
          Coding Problems
        </Button>
        <Button
          variant={type === 'employability' ? 'default' : 'outline'}
          onClick={() => setType('employability')}
          disabled={loading}
          className="flex-1 min-w-[150px]"
        >
          Employability Assessment
        </Button>
      </div>

      <Button 
        onClick={generateQuestions}
        disabled={loading}
        className="mb-6 w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Generating {type} Questions...
          </>
        ) : (
          `Generate ${type.charAt(0).toUpperCase() + type.slice(1)} Questions`
        )}
      </Button>

      {error && (
        <Card className="p-4 mb-6 bg-red-50 text-red-600">
          <h2 className="font-semibold">Error</h2>
          <p>{error}</p>
        </Card>
      )}

      {questions.length > 0 && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Generated {type.charAt(0).toUpperCase() + type.slice(1)} Questions</h2>
          <div className="space-y-6">
            {questions.map((q, index) => (
              <div key={q.id} className="border-b pb-4 last:border-b-0">
                <p className="font-medium mb-2">Question {index + 1}:</p>
                <p className="mb-3">{q.question}</p>
                {q.options && (
                  <div className="pl-4 space-y-1">
                    {q.options.map((option: string, i: number) => (
                      <p key={i} className={`${option === q.correctAnswer ? 'text-green-600 font-medium' : ''}`}>
                        {String.fromCharCode(65 + i)}. {option}
                      </p>
                    ))}
                  </div>
                )}
                {q.explanation && (
                  <div className="mt-2 text-gray-600">
                    <p className="font-medium">Explanation:</p>
                    <p>{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
} 