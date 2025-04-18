import React from 'react';
import { motion } from 'framer-motion';
import { Question } from '@/types/assessment';

interface QuestionCardProps {
  question: Question | null;
  selectedAnswer?: string;
  onSelectAnswer: (questionId: string, answer: string) => void;
  showExplanation?: boolean;
  isLoading?: boolean;
}

/**
 * Component for displaying a question and its answer options
 */
export function QuestionCard({
  question,
  selectedAnswer,
  onSelectAnswer,
  showExplanation = false,
  isLoading = false
}: QuestionCardProps) {
  if (!question) {
    return (
      <div className="p-4 text-center text-muted-foreground">
        No question available
      </div>
    );
  }
  
  return (
    <div className="w-full space-y-6">
      <div>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 text-xs rounded-full ${
              question.difficulty === 'easy' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                : question.difficulty === 'medium'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
            }`}>
              {question.difficulty.charAt(0).toUpperCase() + question.difficulty.slice(1)}
            </span>
            
            {question.category && (
              <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded-full">
                {question.categoryName || question.category.charAt(0).toUpperCase() + question.category.slice(1).replace('_', ' ')}
              </span>
            )}
          </div>
          
          {question.timeLimit && (
            <span className="text-xs text-muted-foreground">
              Suggested time: {question.timeLimit} sec
            </span>
          )}
        </div>
        
        <motion.div 
          initial={{ y: 5, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
          className="w-full rounded-lg border p-4 mb-4"
        >
          <h3 className="text-lg font-medium">
            {question.question}
          </h3>
        </motion.div>
      </div>
      
      <div className="space-y-3 mt-4">
        {question.options && question.options.length > 0 ? (
          <div className="space-y-4">
            {question.options.map((option, index) => (
              <motion.button
                key={`option-${index}-${option}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                className={`w-full py-3 px-4 rounded-lg border ${
                  selectedAnswer === option
                    ? "bg-primary/10 border-primary text-primary dark:bg-primary/25"
                    : "border-border hover:border-primary/50 dark:border-border"
                } text-left`}
                onClick={() => onSelectAnswer(question?.id || '', option)}
              >
                {option}
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="p-4 border border-border rounded-lg">
            <p className="text-gray-500 dark:text-gray-400">No options available for this question.</p>
          </div>
        )}
      </div>
      
      {showExplanation && selectedAnswer && question.explanation && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          transition={{ duration: 0.3 }}
          className="mt-6 p-4 bg-muted rounded-lg"
        >
          <div className="font-medium mb-1">Explanation:</div>
          <p className="text-muted-foreground">{question.explanation}</p>
        </motion.div>
      )}
    </div>
  );
}

export default QuestionCard; 