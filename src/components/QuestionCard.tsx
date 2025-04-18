import React from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, Code, HelpCircle } from "lucide-react";
import { Question } from '@/types/assessment';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';

interface QuestionCardProps {
  question: Question;
  selectedAnswer?: string;
  onSelectAnswer?: (questionId: string, answer: string) => void;
  showExplanation?: boolean;
  isReview?: boolean;
  isLoading?: boolean;
}

export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  showExplanation = false,
  isReview = false,
  isLoading = false
}: QuestionCardProps) {
  const isAnswered = !!selectedAnswer;
  const isCorrect = isAnswered && selectedAnswer === question.correctAnswer;
  
  // Default time limit if not specified
  const timeLimit = question.timeLimit || 60;
  
  return (
    <Card className="shadow-md hover:shadow-lg transition-shadow overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={question.difficulty === 'easy' ? 'default' : 
                         question.difficulty === 'medium' ? 'secondary' : 
                         'destructive'} 
                className="uppercase text-[10px]">
            {question.difficulty}
          </Badge>
          <div className="flex items-center text-xs text-muted-foreground">
            <Clock className="h-3 w-3 mr-1" />
            <span>{timeLimit} sec</span>
          </div>
        </div>
        <CardTitle className="text-lg font-medium leading-tight">{question.question}</CardTitle>
        
        {/* Display markdown explanation if available */}
        {question.markdownExplanation && (
          <div className="mt-4 p-3 text-sm bg-primary/5 border rounded-md">
            <div className="text-xs text-muted-foreground mb-2 font-medium">AI Analysis:</div>
            <ReactMarkdown className="prose prose-sm max-w-none text-muted-foreground prose-p:my-1 prose-headings:my-2 prose-ul:my-0 prose-li:my-0">
              {question.markdownExplanation}
            </ReactMarkdown>
          </div>
        )}
      </CardHeader>
      
      <CardContent>
        <div className="space-y-2">
          {question.options?.map((option, index) => (
            <button
              key={index}
              onClick={() => onSelectAnswer && onSelectAnswer(question.id, option)}
              disabled={isReview || isLoading}
              className={cn(
                "w-full text-left py-3 px-4 rounded-md border transition-colors flex items-start gap-3",
                isReview && option === question.correctAnswer && "border-green-500 bg-green-50 dark:bg-green-950/20",
                isReview && selectedAnswer === option && option !== question.correctAnswer && "border-red-500 bg-red-50 dark:bg-red-950/20",
                !isReview && selectedAnswer === option && "border-primary bg-primary/5",
                !isReview && selectedAnswer !== option && "hover:bg-muted/50",
                isLoading && "opacity-75 cursor-not-allowed"
              )}
            >
              <div className={cn(
                "w-5 h-5 rounded-full border flex-shrink-0 flex items-center justify-center mt-0.5",
                selectedAnswer === option ? "border-primary bg-primary text-white" : "border-muted-foreground/30"
              )}>
                {selectedAnswer === option && <CheckCircle className="h-3 w-3" />}
              </div>
              <span className="text-sm">{option}</span>
            </button>
          ))}
        </div>
      </CardContent>
      
      {showExplanation && question.explanation && (
        <CardFooter className="flex flex-col items-start p-4 bg-muted/30 border-t">
          <div className="flex items-center gap-2 text-sm font-medium text-primary mb-1">
            <HelpCircle className="h-4 w-4" />
            <span>Explanation</span>
          </div>
          <p className="text-sm text-muted-foreground">{question.explanation}</p>
        </CardFooter>
      )}
    </Card>
  );
} 