import { FormData, QuestionType, SectionType } from '@/types/assessment';
import { EmployabilityCategory } from '@/lib/openai';

/**
 * A centralized prompt management layer to ensure consistent, accurate question generation
 * across different sections and categories.
 */
class PromptLayer {
  private static instance: PromptLayer;

  // Define batch size consistently
  private defaultBatchSize: number = 10;

  // Store template prompts for each question type with strict typing
  private promptTemplates: Record<SectionType, string> = {
    'aptitude': '',
    'programming': '',
    'employability': ''
  };

  // Private constructor to enforce singleton pattern
  private constructor() {
    this.initializeTemplates();
  }

  // Get singleton instance
  static getInstance(): PromptLayer {
    if (!PromptLayer.instance) {
      PromptLayer.instance = new PromptLayer();
    }
    return PromptLayer.instance;
  }

  // Initialize standard prompt templates
  private initializeTemplates(): void {
    // Base structure that will be used for all question types
    const baseJsonStructure = `
    [
      {
        "id": "string",
        "type": "mcq",
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string",
        "explanation": "string explaining the correct answer",
        "difficulty": "easy|medium|hard",
        "category": "string",
        "timeLimit": number (in seconds, typically 60-120)
      }
    ]`;

    // Template for aptitude questions
    this.promptTemplates.aptitude = `
    You are an expert assessment creator designing aptitude questions for a technical assessment platform.
    
    CONTEXT:
    You will generate exactly ${this.defaultBatchSize} high-quality aptitude and reasoning questions that are:
    1. Personalized to match the candidate's background and interests
    2. Properly categorized (numerical, logical, pattern, or problem-solving)
    3. Diverse in difficulty levels (include easy, medium, and hard questions)
    4. Clear and unambiguous with only one correct answer
    
    ASSESSMENT FORMAT:
    - The Aptitude & Reasoning section has exactly 10 questions
    - Time limit is 15 minutes total (90 seconds per question on average)
    - Questions must assess logical reasoning, numerical ability, and problem-solving
    - Questions should be relevant to technical/software contexts
    
    INSTRUCTIONS:
    - Create exactly ${this.defaultBatchSize} multiple-choice questions with 4 options each
    - Each question MUST have one and only one correct answer
    - Include at least 2 questions from each category (numerical, logical, pattern, problem-solving)
    - Reference the candidate's interests where appropriate
    - Ensure explanations are clear and educational
    - Assign a realistic time limit (60-90 seconds per question)
    
    RESPONSE FORMAT:
    Your response MUST include a valid JSON array of ${this.defaultBatchSize} questions with the exact schema below.
    
    JSON Structure:
    ${baseJsonStructure}
    
    Make sure your JSON can be parsed directly with JSON.parse() and conforms exactly to the format.`;

    // Template for programming questions
    this.promptTemplates.programming = `
    You are an expert software engineering educator designing programming knowledge questions.
    
    CONTEXT:
    You will generate exactly ${this.defaultBatchSize} high-quality programming questions that are:
    1. Personalized to match the candidate's technical background and interests
    2. Focused on topics relevant to their specified domains of interest
    3. Properly categorized (algorithms, data structures, debugging, concepts)
    4. Varied in difficulty levels
    
    ASSESSMENT FORMAT:
    - The General Programming section has exactly 10 questions
    - Time limit is 15 minutes total (90 seconds per question on average)
    - Questions must assess basic coding concepts, algorithmic thinking, and programming fundamentals
    - Questions should be relevant to software development regardless of specific language
    
    INSTRUCTIONS:
    - Create exactly ${this.defaultBatchSize} multiple-choice questions with 4 options each
    - Each question MUST have one and only one correct answer
    - Include at least 2 questions from each category (algorithms, data structures, debugging, concepts)
    - Focus on the candidate's specified domains of interest
    - Include questions about algorithms, data structures, debugging, and programming concepts
    - Include both conceptual and problem-solving questions
    - Ensure explanations help the candidate learn from their mistakes
    - Assign appropriate time limits (60-90 seconds per question)
    
    RESPONSE FORMAT:
    Your response MUST include a valid JSON array of ${this.defaultBatchSize} questions with the exact schema below.
    
    JSON Structure:
    ${baseJsonStructure}
    
    Make sure your JSON can be parsed directly with JSON.parse() and conforms exactly to the format.`;

    // Template for employability questions
    this.promptTemplates.employability = `
    You are an expert career development coach designing employability assessment questions.
    
    CONTEXT:
    You will generate exactly ${this.defaultBatchSize} high-quality employability questions that are:
    1. Focused on the specific category provided
    2. Scenario-based and relevant to the candidate's field
    3. Designed to assess real-world professional judgment and skills
    4. Personalized based on the candidate's background
    
    ASSESSMENT FORMAT:
    - The Employability Skills section has exactly 10 questions
    - Time limit is 30 minutes total (3 minutes per question on average)
    - Questions must assess work-related skills and professional abilities
    - Questions should evaluate across multiple employability categories
    
    INSTRUCTIONS:
    - Create exactly ${this.defaultBatchSize} scenario-based multiple-choice questions with 4 options each
    - Each question MUST have one and only one correct answer
    - Focus on realistic workplace scenarios in the candidate's domains of interest
    - Questions should assess professional judgment, communication, problem-solving, or teamwork
    - Reference technologies, roles, and situations relevant to their interests
    - Include explanations that provide career development insight
    - Assign appropriate time limits (90-180 seconds per question)
    
    RESPONSE FORMAT:
    Your response MUST include a valid JSON array of ${this.defaultBatchSize} questions with the exact schema below.
    
    JSON Structure:
    ${baseJsonStructure}
    
    Make sure your JSON can be parsed directly with JSON.parse() and conforms exactly to the format.`;
  }

  /**
   * Get a personalized prompt for question generation
   * 
   * @param userData - User profile data for personalization
   * @param type - Type of questions to generate (aptitude, programming, employability)
   * @param category - Optional category for employability questions
   * @returns A structured prompt for the OpenAI API
   */
  getPrompt(userData: FormData, type: QuestionType | SectionType, category?: EmployabilityCategory): string {
    // Ensure type safety - validate the section type
    const sectionType = this.validateSectionType(type);
    
    // Get the base template for this question type
    const baseTemplate = this.promptTemplates[sectionType] || this.promptTemplates.aptitude;
    
    // Safely handle user data with fallbacks for missing values
    const name = userData.name || 'candidate';
    const degree = userData.degree || 'technical background';
    const graduationYear = userData.graduationYear || 'recent';
    const collegeName = userData.collegeName || 'institution';
    const interests = userData.interestedDomain || 'technology, software development';
    
    // Create personalized user context from profile data
    const userContext = `
    CANDIDATE PROFILE:
    Name: ${name}
    Degree: ${degree}
    Graduation Year: ${graduationYear}
    College/University: ${collegeName}
    Interested Domains: ${interests}
    `;
    
    // Add category-specific instructions for employability questions
    let categoryInstructions = '';
    if (sectionType === 'employability' && category) {
      categoryInstructions = `
      CATEGORY FOCUS: ${this.getCategoryDescription(category)}
      
      The questions must be specifically designed for the "${category}" category.
      Each question's category field should be set to "${category}".
      `;
    }
    
    // Add domain-specific instructions for all question types
    let domainInstructions = '';
    if (userData.interestedDomain) {
      domainInstructions = `
      DOMAIN FOCUS:
      Create questions specifically relevant to: ${userData.interestedDomain}
      
      When appropriate, reference technologies, concepts, and scenarios from these domains.
      Customize examples and contexts to these specific areas of interest.
      `;
    }
    
    // Combine all components into a final prompt
    return `${baseTemplate}\n${userContext}\n${categoryInstructions}\n${domainInstructions}`;
  }
  
  /**
   * Validate and normalize the section type
   */
  private validateSectionType(type: QuestionType | SectionType): SectionType {
    // Cast as string for comparison
    const typeString = type as string;
    
    // Check if it's a valid section type
    if (typeString === 'aptitude' || typeString === 'programming' || typeString === 'employability') {
      return typeString as SectionType;
    }
    
    // Default to aptitude if invalid
    console.warn(`Invalid section type: ${typeString}. Defaulting to 'aptitude'.`);
    return 'aptitude';
  }
  
  /**
   * Get the batch size for question generation
   */
  getBatchSize(): number {
    return this.defaultBatchSize;
  }
  
  /**
   * Get description for an employability category
   * 
   * @param category - The employability category
   * @returns A detailed description of the category
   */
  private getCategoryDescription(category?: EmployabilityCategory): string {
    switch (category) {
      case 'core':
        return 'Essential workplace skills that are fundamental to professional success in any role.';
      case 'soft':
        return 'Interpersonal skills that enable effective collaboration and communication with others.';
      case 'professional':
        return 'Skills related to professional conduct, workplace ethics, and career development.';
      case 'communication':
        return 'Abilities related to clear expression, active listening, and effective information exchange.';
      case 'teamwork':
        return 'Skills that enable productive collaboration in group settings.';
      case 'leadership':
        return 'Abilities related to guiding, inspiring, and managing others.';
      case 'problem_solving':
        return 'Analytical skills for identifying, approaching, and resolving challenges.';
      case 'domain':
        return 'Specific knowledge and skills relevant to technical fields and specializations.';
      default:
        return 'General employability skills for professional success.';
    }
  }
  
  /**
   * Validate and normalize questions returned from LLM
   * 
   * This function checks each question to ensure it has the required properties
   * and consistent formatting for use in the assessment.
   * 
   * @param questions - The questions to validate
   * @param type - The type of questions
   * @param category - Optional category for specific sections
   * @returns Validated questions with consistent formatting
   */
  validateQuestions(questions: any[], type: QuestionType | SectionType, category?: EmployabilityCategory): any[] {
    // Skip validation if questions array is empty
    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      console.error('No questions to validate');
      return [];
    }
    
    // Get the section type
    const sectionType = this.validateSectionType(type);
    
    // Clean up questions array by filtering out invalid entries
    let cleanedQuestions = questions.filter(q => q && typeof q === 'object');
    
    // Define the expected categories for each section type
    const categoryMap: Record<SectionType, string[]> = {
      'aptitude': ['numerical', 'logical', 'pattern', 'problem-solving'],
      'programming': ['algorithms', 'data structures', 'debugging', 'concepts'],
      'employability': ['communication', 'teamwork', 'professional', 'problem_solving', 
                        'core', 'soft', 'leadership', 'domain']
    };
    
    // Get expected categories for this section
    const expectedCategories = categoryMap[sectionType] || [];
    
    // Normalize the questions
    const normalizedQuestions = cleanedQuestions.map((q, index) => {
      // Generate a stable ID if missing
      const id = q.id || `${sectionType}-${category || 'general'}-${index + 1}-${Date.now()}`;
      
      // Ensure question has all required fields
      const normalizedQuestion = {
        id,
        type: q.type || 'mcq',
        question: q.question || `Question ${index + 1}`,
        options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
        correctAnswer: q.correctAnswer || q.correct_answer || (Array.isArray(q.options) ? q.options[0] : 'Option A'),
        explanation: q.explanation || `Explanation for question ${index + 1}`,
        difficulty: this.normalizeDifficulty(q.difficulty),
        category: this.normalizeCategory(q.category, sectionType, expectedCategories),
        timeLimit: this.normalizeTimeLimit(q.timeLimit || q.time_limit, sectionType)
      };
      
      // Clean up template variables
      return this.cleanUpTemplateVariables(normalizedQuestion);
    });
    
    // Ensure we have a balanced set of questions across categories
    return this.ensureBalancedCategories(normalizedQuestions, sectionType, expectedCategories);
  }
  
  /**
   * Normalize the difficulty level
   */
  private normalizeDifficulty(difficulty?: string): 'easy' | 'medium' | 'hard' {
    if (!difficulty) return 'medium';
    
    const normalizedDifficulty = difficulty.toLowerCase();
    if (normalizedDifficulty === 'easy' || normalizedDifficulty === 'medium' || normalizedDifficulty === 'hard') {
      return normalizedDifficulty as 'easy' | 'medium' | 'hard';
    }
    
    return 'medium';
  }
  
  /**
   * Normalize the category
   */
  private normalizeCategory(category: string | undefined, sectionType: SectionType, expectedCategories: string[]): string {
    if (!category) {
      // Assign a default category based on section type
      switch (sectionType) {
        case 'aptitude': return 'numerical';
        case 'programming': return 'concepts';
        case 'employability': return 'core';
        default: return 'general';
      }
    }
    
    // Check if the category is in the expected list
    const normalizedCategory = category.toLowerCase().replace(/-/g, '_');
    if (expectedCategories.includes(normalizedCategory)) {
      return normalizedCategory;
    }
    
    // Try to map to a valid category
    for (const validCategory of expectedCategories) {
      if (normalizedCategory.includes(validCategory) || validCategory.includes(normalizedCategory)) {
        return validCategory;
      }
    }
    
    // Default category based on section type
    switch (sectionType) {
      case 'aptitude': return 'numerical';
      case 'programming': return 'concepts';
      case 'employability': return 'core';
      default: return 'general';
    }
  }
  
  /**
   * Normalize the time limit based on section type
   */
  private normalizeTimeLimit(timeLimit: number | undefined, sectionType: SectionType): number {
    if (typeof timeLimit === 'number' && timeLimit > 0) {
      return timeLimit;
    }
    
    // Default time limits based on section type
    switch (sectionType) {
      case 'aptitude': return 60; // 60 seconds
      case 'programming': return 90; // 90 seconds
      case 'employability': return 120; // 120 seconds
      default: return 60;
    }
  }
  
  /**
   * Clean up template variables in a question
   */
  private cleanUpTemplateVariables(question: any): any {
    const cleanUp = (text: string): string => {
      if (!text) return text;
      
      return text
        .replace(/\{\{interest\}\}/g, 'technology')
        .replace(/\{\{degree\}\}/g, 'technical degree')
        .replace(/\{\{name\}\}/g, 'candidate')
        .replace(/\{\{college\}\}/g, 'university')
        .replace(/\{\{[\w]+\}\}/g, 'relevant value'); // Catch any other template variables
    };
    
    // Clean up text fields
    question.question = cleanUp(question.question);
    question.explanation = cleanUp(question.explanation);
    
    // Clean up options array
    if (Array.isArray(question.options)) {
      question.options = question.options.map((opt: any) => typeof opt === 'string' ? cleanUp(opt) : opt);
    }
    
    // Clean up correctAnswer if it's a string
    if (typeof question.correctAnswer === 'string') {
      question.correctAnswer = cleanUp(question.correctAnswer);
    }
    
    return question;
  }
  
  /**
   * Ensure we have a balanced set of questions across categories
   */
  private ensureBalancedCategories(
    questions: any[], 
    questionType: string, 
    expectedCategories: string[]
  ): any[] {
    // If we don't have enough questions or categories, just return what we have
    if (questions.length <= expectedCategories.length || expectedCategories.length === 0) {
      return questions;
    }
    
    // Count questions by category
    const categoryCount: Record<string, number> = {};
    for (const category of expectedCategories) {
      categoryCount[category] = 0;
    }
    
    // Count existing categories
    for (const question of questions) {
      const category = question.category;
      if (category && categoryCount[category] !== undefined) {
        categoryCount[category]++;
      }
    }
    
    // Check if we have at least one question per category
    const missingCategories = expectedCategories.filter(category => categoryCount[category] === 0);
    
    // If all categories are covered, return the questions
    if (missingCategories.length === 0) {
      return questions;
    }
    
    // Find categories with the most questions to replace
    const categoriesOrderedByCount = Object.entries(categoryCount)
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0]);
    
    // Create a copy of the questions
    const balancedQuestions = [...questions];
    
    // Replace some questions from over-represented categories with missing categories
    for (let i = 0; i < missingCategories.length; i++) {
      const missingCategory = missingCategories[i];
      const overRepresentedCategory = categoriesOrderedByCount[0];
      
      // Find questions from the over-represented category
      const overRepresentedIndices = balancedQuestions
        .map((q, index) => q.category === overRepresentedCategory ? index : -1)
        .filter(index => index !== -1);
      
      // If we found any, update the category of the first one
      if (overRepresentedIndices.length > 0) {
        const indexToUpdate = overRepresentedIndices[0];
        balancedQuestions[indexToUpdate] = {
          ...balancedQuestions[indexToUpdate],
          category: missingCategory
        };
        
        // Update our count for the next iteration
        categoryCount[overRepresentedCategory]--;
        categoryCount[missingCategory]++;
        
        // Re-sort categories by count
        categoriesOrderedByCount.sort((a, b) => categoryCount[b] - categoryCount[a]);
      }
    }
    
    return balancedQuestions;
  }
}

// Export singleton instance
export const promptLayer = PromptLayer.getInstance(); 