import { Question, QuestionDifficulty, QuestionType } from '@/types/assessment';

/**
 * Utility functions for working with questions
 */

/**
 * Convert any value to a safe option string
 * @param option The option value to convert
 * @returns A string representation of the option
 */
export function convertToOptionString(option: any): string {
  if (option === null || option === undefined) {
    return 'No answer';
  }
  
  if (typeof option === 'string') {
    return option.trim() || 'Empty answer';
  }
  
  if (typeof option === 'number' || typeof option === 'boolean') {
    return String(option);
  }
  
  if (typeof option === 'object') {
    try {
      return JSON.stringify(option);
    } catch (e) {
      return 'Complex answer';
    }
  }
  
  return String(option);
}

/**
 * Ensures question options are unique by appending a suffix to duplicates
 * @param question The question to process
 * @returns The question with deduplicated options
 */
export function ensureUniqueOptions(question: Question): Question {
  if (!Array.isArray(question.options) || question.options.length === 0) {
    return question;
  }

  // Create a map to track occurrences of each option
  const optionCounts: Record<string, number> = {};
  
  // First convert all options to strings and filter out null/undefined values
  const safeOptions = question.options
    .map(option => convertToOptionString(option))
    .filter(Boolean);
  
  // Create a new options array with deduplicated values
  const uniqueOptions = safeOptions.map(option => {
    // If this is the first time we've seen this option, keep as is
    if (!optionCounts[option]) {
      optionCounts[option] = 1;
      return option;
    }
    
    // For duplicates, append a counter to make unique
    optionCounts[option]++;
    return `${option} (${optionCounts[option]})`;
  });
  
  // If the correct answer was duplicated, we need to update it
  let correctAnswer = question.correctAnswer;
  if (typeof correctAnswer === 'string' && optionCounts[correctAnswer] > 1) {
    correctAnswer = `${correctAnswer} (1)`;
  }
  
  return {
    ...question,
    options: uniqueOptions,
    correctAnswer
  };
}

/**
 * Process question data to ensure it's valid and consistent
 * @param question The question to process
 * @returns The processed question
 */
export function processQuestion(question: Question): Question {
  if (!question) return question;
  
  // Ensure question has an ID
  if (!question.id) {
    question.id = `question-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  // Ensure question text is a string
  if (typeof question.question !== 'string' || !question.question.trim()) {
    question.question = `Question #${question.id}`;
  }
  
  // Ensure options are unique and valid strings
  question = ensureUniqueOptions(question);
  
  // Ensure difficulty is valid
  if (!['easy', 'medium', 'hard'].includes(question.difficulty)) {
    question.difficulty = 'medium' as QuestionDifficulty;
  }
  
  // Ensure type is valid
  if (!['mcq', 'coding'].includes(question.type)) {
    question.type = 'mcq' as QuestionType;
  }
  
  return question;
}

/**
 * Process an array of questions
 * @param questions The questions to process
 * @param sectionType Optional section type to filter questions by appropriate categories
 * @returns The processed questions
 */
export function processQuestions(questions: Question[], sectionType?: string): Question[] {
  if (!Array.isArray(questions)) return [];
  
  // Process each question for basic validation
  let processedQuestions = questions.map(processQuestion);
  
  // If sectionType is provided, validate and filter questions to match the section
  if (sectionType) {
    // Define valid categories for each section type
    const validCategories: Record<string, string[]> = {
      'aptitude': ['numerical', 'logical', 'pattern', 'problem-solving'],
      'programming': ['algorithms', 'data structures', 'debugging', 'concepts'],
      'employability': ['communication', 'teamwork', 'professional', 'problem_solving', 'core', 'soft', 'leadership', 'domain']
    };
    
    // Filter questions that match the section type's categories
    if (validCategories[sectionType]) {
      console.log(`Validating questions for section type: ${sectionType}`);
      const validCategoriesForSection = validCategories[sectionType];
      
      processedQuestions = processedQuestions.filter(question => {
        // Keep questions with matching categories
        const isValid = question.category && validCategoriesForSection.includes(question.category);
        
        if (!isValid) {
          console.warn(`Filtered out question with mismatched category: ${question.category} not valid for section ${sectionType}`);
        }
        
        return isValid;
      });
      
      console.log(`Filtered to ${processedQuestions.length} valid questions for ${sectionType} section`);
    }
  }
  
  return processedQuestions;
} 