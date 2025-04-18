import OpenAI from "openai";
import { FormData, QuestionType, SectionType } from '@/types/assessment';
import { promptLayer } from './prompt-layer';

// Check for API key and log basic info
const apiKey = process.env.OPENAI_API_KEY || '';
const isProjectKey = apiKey.startsWith('sk-');
const apiKeyMasked = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'None';

// Define EmployabilityCategory type since it's not exported from assessment.ts
export type EmployabilityCategory = 'core' | 'soft' | 'professional' | 'communication' | 'teamwork' | 'leadership' | 'problem_solving' | 'domain';

// Log initialization info
console.log(`[OpenAI] Initializing with API key: ${apiKeyMasked} (${isProjectKey ? 'Project Key' : 'Organization Key'})`);

// Constants for better robustness
const DEFAULT_QUESTION_COUNT = 5;
const DEFAULT_RESPONSE_TIMEOUT = 30000; // 30 seconds
const DEFAULT_DELAY = 1000; // 1 second

// Quick helper to check if we have a valid API key
function hasValidApiKey(): boolean {
  return !!apiKey && apiKey.length > 20;
}

/**
 * Helper function to validate if a string is a valid SectionType
 * @param value String to validate
 * @returns Valid SectionType or default 'aptitude'
 */
function validateSectionType(value?: string): SectionType {
  if (value && ['aptitude', 'programming', 'employability'].includes(value)) {
    return value as SectionType;
  }
  // Default to 'aptitude' if not a valid section type
  return 'aptitude';
}

console.log('----- OpenAI Configuration -----');
console.log(`API Key: ${apiKeyMasked}`);
console.log(`Environment: ${process.env.NODE_ENV}`);
console.log('--------------------------------');

// Initialize OpenAI API with updated configuration
const openai = new OpenAI({
  apiKey: apiKey,
  timeout: 60000, // 60 second timeout for requests
  maxRetries: 3,  // Maximum number of retries
});

// Log configuration info
console.log('----- OpenAI Configuration -----');
console.log(`Model: gpt-3.5-turbo, Temperature: 0.7`);
console.log(`Timeout: 60 seconds, Max Retries: 3`);
console.log(`Simulation Fallback: Enabled`);
console.log('---------------------------------------');

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
};

/**
 * Generate a batch of questions using OpenAI
 * Simplified with better error handling and reliability
 */
export async function generateQuestionsBatch(
  prompt: string,
  systemPrompt: string = "You are a helpful AI assistant that generates high-quality assessment questions.",
  model = "gpt-3.5-turbo",
  temperature = 0.7,
  max_tokens = 1500,
  category?: string,
  difficulty?: string
): Promise<Question[]> {
  console.log(`[DEBUG OpenAI] Starting question generation for category: ${category}, difficulty: ${difficulty}`);
  
  // Log actual prompt being used
  console.log(`[DEBUG OpenAI] Using prompt: ${prompt.substring(0, 100)}...`);
  
  // Check for API key - use simulation if not available
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[DEBUG OpenAI] No API key found, using simulation mode");
    return simulateOpenAIResponse(prompt, validateSectionType(category), 5);
  }

  // Set up the API call with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.log("[DEBUG OpenAI] API call timed out after 30 seconds");
    controller.abort();
  }, 30000);

  try {
    console.log("[DEBUG OpenAI] Making API call to OpenAI");
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content: systemPrompt,
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature,
        max_tokens,
      }),
      signal: controller.signal,
    });

    console.log(`[DEBUG OpenAI] Received response with status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[DEBUG OpenAI] API error: ${errorText}`);
      throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
    }

    console.log("[DEBUG OpenAI] Parsing JSON response");
    const data = await response.json();
    
    // Log response data summary
    console.log(`[DEBUG OpenAI] Response received, content length: ${data?.choices?.[0]?.message?.content?.length || 0}`);
    
    // Extract and clean up the JSON from the completion
    let questionsJson;
    try {
      console.log("[DEBUG OpenAI] Extracting JSON from response");
      const content = data.choices[0].message.content;
      
      // Find JSON content by looking for opening/closing brackets
      const jsonStart = content.indexOf("[");
      const jsonEnd = content.lastIndexOf("]") + 1;
      
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        const jsonString = content.substring(jsonStart, jsonEnd);
        console.log(`[DEBUG OpenAI] Found JSON string of length: ${jsonString.length}`);
        questionsJson = JSON.parse(jsonString);
      } else {
        // If no brackets found, try to parse the whole content
        console.log("[DEBUG OpenAI] No JSON brackets found, trying to parse entire content");
        questionsJson = JSON.parse(content);
      }
    } catch (error) {
      console.error(`[DEBUG OpenAI] JSON parsing error: ${error instanceof Error ? error.message : String(error)}`);
      console.log("[DEBUG OpenAI] Falling back to simulation mode due to JSON parsing error");
      return simulateOpenAIResponse(prompt, validateSectionType(category), 5);
    }

    // Validate and normalize the questions
    if (Array.isArray(questionsJson)) {
      return normalizeQuestions(questionsJson, validateSectionType(category || difficulty));
    } else if (questionsJson.questions && Array.isArray(questionsJson.questions)) {
      return normalizeQuestions(questionsJson.questions, validateSectionType(category || difficulty));
    } else {
      console.error('Invalid questions format');
      return simulateOpenAIResponse(prompt, validateSectionType(category), 5);
    }
  } catch (error) {
    console.error('Unexpected error in question generation:', error);
    return simulateOpenAIResponse(prompt, validateSectionType(category), 5);
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Parse and validate the OpenAI response - simplified for reliability
 */
function parseAndValidateResponse(response: string, section: SectionType): Question[] {
  try {
    // Direct parsing attempt first - most responses should be clean JSON
    try {
      const parsedData = JSON.parse(response);
      
      // Check if it's a valid questions array or object
      if (Array.isArray(parsedData)) {
        return normalizeQuestions(parsedData, section);
      } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
        return normalizeQuestions(parsedData.questions, section);
      }
    } catch (directParseError) {
      // If direct parsing fails, try extraction methods
      console.warn('Direct JSON parsing failed, trying to extract JSON:', directParseError);
    }
    
    // Extraction methods for JSON embedded in text
    let extractedJson = '';
    
    // Case 1: Response is contained within a JSON code block
    if (response.includes('```json')) {
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch && jsonMatch[1]) {
        extractedJson = jsonMatch[1].trim();
      }
    } 
    // Case 2: Response is contained within a generic code block
    else if (response.includes('```')) {
      const codeMatch = response.match(/```\s*([\s\S]*?)\s*```/);
      if (codeMatch && codeMatch[1]) {
        extractedJson = codeMatch[1].trim();
      }
    }
    
    // Try parsing the extracted JSON
    if (extractedJson) {
      try {
        const parsedData = JSON.parse(extractedJson);
        
        if (Array.isArray(parsedData)) {
          return normalizeQuestions(parsedData, section);
        } else if (parsedData.questions && Array.isArray(parsedData.questions)) {
          return normalizeQuestions(parsedData.questions, section);
        }
      } catch (extractedParseError) {
        console.error('Failed to parse extracted JSON:', extractedParseError);
      }
    }
    
    // If all parsing attempts fail, fall back to simulation
    console.error('Could not parse valid JSON from response, falling back to simulation');
    return simulateOpenAIResponse('', section, 5);
  } catch (error) {
    console.error('Failed to process OpenAI response:', error);
    return simulateOpenAIResponse('', section, 5);
  }
}

/**
 * Normalize and validate questions - simplified helper function
 */
function normalizeQuestions(questions: any[], section: SectionType): Question[] {
  // Validate that questions array is not empty
  if (!questions.length) {
    console.error('Empty questions array from OpenAI response');
    return simulateOpenAIResponse('', section, 5);
  }
  
  console.log(`Normalizing ${questions.length} questions from OpenAI response`);
  
  // Normalize and validate each question - with safety checks
  return questions.map((q: any, index: number) => {
    if (!q || typeof q !== 'object') {
      console.warn(`Question at index ${index} is invalid, creating default question`);
      return createDefaultQuestion(section, index);
    }
    
    // Ensure options are always an array of strings
    let options: string[] = [];
    if (q.options && Array.isArray(q.options)) {
      options = q.options.map((opt: any) => 
        typeof opt === 'string' ? cleanupTemplateVariables(opt) : String(opt)
      );
    } else {
      // Create default options if missing
      options = [`Option A for question ${index+1}`, `Option B for question ${index+1}`, 
                 `Option C for question ${index+1}`, `Option D for question ${index+1}`];
    }
    
    // Ensure we have a valid correctAnswer
    let correctAnswer = q.correctAnswer || q.correct_answer;
    if (!correctAnswer && options.length > 0) {
      correctAnswer = options[0];
    }
    
    // Create a normalized question with all required fields
    const normalizedQuestion: Question = {
      id: q.id || `openai-${section}-${index + 1}-${Date.now()}`,
      type: q.type || 'mcq',
      question: q.question ? cleanupTemplateVariables(q.question) : `Question ${index + 1}`,
      options: options,
      correctAnswer: typeof correctAnswer === 'string' ? cleanupTemplateVariables(correctAnswer) : correctAnswer || options[0],
      explanation: q.explanation ? cleanupTemplateVariables(q.explanation) : `Explanation for question ${index + 1}`,
      difficulty: validateDifficulty(q.difficulty),
      category: validateCategory(section, q.category),
      timeLimit: validateTimeLimit(q.timeLimit || q.time_limit, section)
    };
    
    return normalizedQuestion;
  });
}

/**
 * Create a default question when missing or invalid
 */
function createDefaultQuestion(section: SectionType, index: number): Question {
  // Get appropriate category for section
  let category = '';
  if (section === 'aptitude') {
    category = ['numerical', 'logical', 'pattern', 'problem-solving'][index % 4];
  } else if (section === 'programming') {
    category = ['algorithms', 'data structures', 'debugging', 'concepts'][index % 4];
  } else {
    category = ['communication', 'teamwork', 'professional', 'problem_solving'][index % 4];
  }
  
  // Create default options
  const options = [
    `Option A for ${category} question`,
    `Option B for ${category} question`,
    `Option C for ${category} question`,
    `Option D for ${category} question`
  ];
  
  return {
    id: `default-${section}-${index}-${Date.now()}`,
    type: 'mcq',
    question: `Default ${section} question about ${category} (#${index+1})`,
    options: options,
    correctAnswer: options[0],
    explanation: `This is a default explanation for a ${category} question.`,
    difficulty: 'medium',
    category,
    timeLimit: section === 'employability' ? 120 : 60
  };
}

/**
 * Validate difficulty value
 */
function validateDifficulty(difficulty?: string): 'easy' | 'medium' | 'hard' {
  if (!difficulty) return 'medium';
  
  const normalized = difficulty.toLowerCase();
  if (['easy', 'medium', 'hard'].includes(normalized)) {
    return normalized as 'easy' | 'medium' | 'hard';
  }
  
  return 'medium';
}

/**
 * Validate category value
 */
function validateCategory(section: SectionType, category?: string): string {
  if (!category) {
    // Default categories by section
    if (section === 'aptitude') return 'numerical';
    if (section === 'programming') return 'concepts';
    if (section === 'employability') return 'core';
    return 'general';
  }
  
  // Normalize the category
  return category.toLowerCase().replace(/-/g, '_');
}

/**
 * Validate time limit
 */
function validateTimeLimit(timeLimit: number | undefined, section: SectionType): number {
  if (typeof timeLimit === 'number' && timeLimit > 0 && timeLimit <= 300) {
    return timeLimit;
  }
  
  // Default time limits
  if (section === 'aptitude') return 60;
  if (section === 'programming') return 90;
  if (section === 'employability') return 120;
  return 60;
}

// Modified to accept SectionType instead of QuestionType with simplified implementation
export async function generatePersonalizedQuestions(userData: FormData, type: SectionType, category?: EmployabilityCategory, batchSize: number = 5): Promise<Question[]> {
  console.log(`Generating personalized ${type} questions for ${userData.name}`);
  
  try {
    // Use simulation mode if no API key
    if (!apiKey) {
      console.warn('No OpenAI API key provided, using simulation mode');
      return simulateOpenAIResponse('', type, batchSize, userData);
    }
    
    // Generate a simplified but effective prompt
    const prompt = generateSimplifiedPrompt(userData, type, category, batchSize);
    
    // Generate questions with simplified error handling
    const questions = await generateQuestionsBatch(prompt, undefined, "gpt-3.5-turbo", 0.7, 1500, type);
    
    if (!questions || questions.length === 0) {
      console.warn('No questions returned from OpenAI, using simulation');
      return simulateOpenAIResponse('', type, batchSize, userData);
    }
    
    console.log(`Successfully generated ${questions.length} questions for ${type}`);
    return questions;
  } catch (error) {
    console.error('Error generating questions:', error);
    
    // Always fall back to simulation for any errors
    return simulateOpenAIResponse('', type, batchSize, userData);
  }
}

/**
 * Generate a simplified prompt for more reliable responses
 */
function generateSimplifiedPrompt(userData: FormData, type: SectionType, category?: EmployabilityCategory, count: number = 5): string {
  // Basic user info with fallbacks
  const name = userData.name || 'candidate';
  const degree = userData.degree || 'technical';
  const interests = userData.interestedDomain || 'technology';
  
  // Base prompt structure
  let basePrompt = `Generate exactly ${count} multiple-choice questions for a technical assessment.
  
User Profile:
- Name: ${name}
- Degree: ${degree}
- Interest: ${interests}

Requirements:
- Each question must have a 'question' field, an 'options' array with 4 choices, and a 'correctAnswer' that matches one option exactly
- Each question needs a difficulty ('easy', 'medium', or 'hard')
- Each question needs a brief explanation of the correct answer
- Questions should be relevant to the user's background
- The output must be valid JSON that can be parsed directly`;

  // Section-specific instructions
  if (type === 'aptitude') {
    basePrompt += `
    
Section: Aptitude & Reasoning
- Focus on logical reasoning, numerical ability, and pattern recognition
- Include questions from these categories: numerical, logical, pattern, problem-solving
- Questions should assess analytical thinking and problem-solving skills
- Set appropriate time limits (60 seconds per question)`;
  } else if (type === 'programming') {
    basePrompt += `
    
Section: Programming Knowledge
- Focus on programming concepts, data structures, algorithms, and debugging
- Include questions from these categories: algorithms, data structures, debugging, concepts
- Questions should test understanding of programming fundamentals regardless of language
- Set appropriate time limits (90 seconds per question)`;
  } else if (type === 'employability') {
    basePrompt += `
    
Section: Employability Skills
- Focus on workplace skills, professional judgment, and career readiness
- Include questions from these categories: communication, teamwork, professional, problem_solving
- Questions should assess real-world professional scenarios and judgment
- Set appropriate time limits (120 seconds per question)`;
    
    // Add category-specific instructions if provided
    if (category) {
      basePrompt += `
- Specifically focus on the '${category}' category for all questions`;
    }
  }
  
  // Format specification
  basePrompt += `

Response Format:
{
  "questions": [
    {
      "id": "unique-id",
      "type": "mcq",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctAnswer": "Option B",
      "explanation": "Explanation of why Option B is correct",
      "difficulty": "medium",
      "category": "category-name",
      "timeLimit": 60
    }
  ]
}`;

  return basePrompt;
}

// Helper function to get category descriptions
function getCategoryDescription(category?: EmployabilityCategory): string {
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
 * Clean up any template variables that weren't replaced
 */
function cleanupTemplateVariables(text: string): string {
  if (!text) return '';
  
  // Replace any remaining {{variable}} patterns with appropriate defaults
  return text
    .replace(/\{\{interest\}\}/g, 'technology')
    .replace(/\{\{degree\}\}/g, 'technical degree')
    .replace(/\{\{name\}\}/g, 'candidate')
    .replace(/\{\{college\}\}/g, 'university')
    .replace(/\{\{[\w]+\}\}/g, 'relevant value'); // Catch any other template variables
}

// Helper function to simulate OpenAI API response with better personalization
function simulateOpenAIResponse(prompt: string, category: SectionType, count: number, userData?: FormData): Question[] {
  // Extract key information from the prompt for personalization
  const nameMatch = prompt.match(/Name: ([^\n]+)/);
  const degreeMatch = prompt.match(/Degree: ([^\n]+)/);
  const interestsMatch = prompt.match(/Interested Domains: ([^\n]+)/);
  
  const name = userData?.name || (nameMatch ? nameMatch[1].trim() : 'the candidate');
  const degree = userData?.degree || (degreeMatch ? degreeMatch[1].trim() : 'technical');
  const interests = userData?.interestedDomain || (interestsMatch ? interestsMatch[1].trim() : 'technology');
  const college = userData?.collegeName || 'university';
  
  // Create an array to store questions
  const questions: Question[] = [];
  
  // Generate appropriate questions based on the category
  if (category === 'aptitude') {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `As a ${degree} student from ${college}, if you need to analyze a dataset with 300 entries in 4 hours, how many entries would you need to process per hour?`,
        options: ['50 entries/h', '60 entries/h', '75 entries/h', '80 entries/h'],
        correctAnswer: '75 entries/h',
        explanation: 'Rate = Total/Time = 300 entries/4h = 75 entries/h',
        difficulty: 'easy',
        category: 'numerical',
        timeLimit: 60
      },
      {
        id: `${category}-2`,
        type: 'mcq',
        question: `In a ${interests} project, you observe a sequence: 3, 6, 12, 24, __. What comes next?`,
        options: ['30', '36', '48', '60'],
        correctAnswer: '48',
        explanation: 'Each number is multiplied by 2 to get the next number: 3×2=6, 6×2=12, 12×2=24, 24×2=48',
        difficulty: 'easy',
        category: 'pattern',
        timeLimit: 60
      },
      {
        id: `${category}-3`,
        type: 'mcq',
        question: `If a development team can complete a project in 20 days with 5 developers, how many days would it take with 8 developers, assuming perfect work distribution?`,
        options: ['10 days', '12.5 days', '16 days', '18 days'],
        correctAnswer: '12.5 days',
        explanation: 'Using the formula: (People1 × Days1) = (People2 × Days2), we get (5 × 20) = (8 × Days2), so Days2 = 100/8 = 12.5 days',
        difficulty: 'medium',
        category: 'numerical',
        timeLimit: 60
      }
    );
  } else if (category === 'programming') {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `In the context of ${interests}, what is the time complexity of binary search on a sorted array of n elements?`,
        options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
        correctAnswer: 'O(log n)',
        explanation: 'Binary search divides the search space in half with each comparison, resulting in logarithmic time complexity.',
        difficulty: 'medium',
        category: 'algorithms',
        timeLimit: 60
      },
      {
        id: `${category}-2`,
        type: 'mcq',
        question: `What data structure would be most efficient for implementing a priority queue in a ${interests} application?`,
        options: ['Array', 'Linked List', 'Heap', 'Hash Table'],
        correctAnswer: 'Heap',
        explanation: 'A heap provides efficient operations for priority queue implementations: O(1) for finding the minimum/maximum and O(log n) for insertion and deletion.',
        difficulty: 'medium',
        category: 'data structures',
        timeLimit: 60
      },
      {
        id: `${category}-3`,
        type: 'mcq',
        question: `When implementing a solution for a complex ${interests} problem, which of these sorting algorithms has the best average-case performance?`,
        options: ['Bubble Sort', 'Insertion Sort', 'Quick Sort', 'Selection Sort'],
        correctAnswer: 'Quick Sort',
        explanation: 'Quick Sort has an average-case time complexity of O(n log n), which is better than Bubble Sort, Insertion Sort, and Selection Sort for large datasets.',
        difficulty: 'medium',
        category: 'algorithms',
        timeLimit: 60
      }
    );
  } else if (category === 'employability') {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `In a team meeting about a ${interests} project at your company, a colleague presents an idea that you know has significant flaws. What would be the most professional way for ${name} to address this?`,
        options: [
          'Wait until after the meeting and tell others why the idea won\'t work',
          'Immediately point out all the flaws to prevent wasting time',
          'Acknowledge the positive aspects first, then respectfully discuss concerns and suggest improvements',
          'Stay silent to avoid confrontation and let someone else bring up the issues'
        ],
        correctAnswer: 'Acknowledge the positive aspects first, then respectfully discuss concerns and suggest improvements',
        explanation: 'This approach maintains respect for your colleague while still addressing the important issues constructively.',
        difficulty: 'medium',
        category: 'communication',
        timeLimit: 60
      },
      {
        id: `${category}-2`,
        type: 'mcq',
        question: `As a ${degree} graduate working on a ${interests} project, you notice that the deadline is approaching but the team is behind schedule. What's the most effective approach?`,
        options: [
          'Work overtime without telling anyone and try to complete everything yourself',
          'Report the concern to your manager and suggest adjusting the scope or timeline',
          'Wait until the deadline and then explain why the team couldn\'t complete the work',
          'Focus only on your assigned tasks and let others worry about their responsibilities'
        ],
        correctAnswer: 'Report the concern to your manager and suggest adjusting the scope or timeline',
        explanation: 'Proactive communication about project risks demonstrates professionalism and allows for timely adjustments to scope, resources, or timeline.',
        difficulty: 'medium',
        category: 'problem_solving',
        timeLimit: 60
      },
      {
        id: `${category}-3`,
        type: 'mcq',
        question: `In your role at a ${interests} company, you're asked to lead a small team with diverse backgrounds and experience levels. Which leadership approach would likely be most effective?`,
        options: [
          'Assign tasks strictly based on seniority regardless of individual strengths',
          'Make all decisions yourself to ensure consistency and avoid disagreements',
          'Adapt your leadership style based on each team member\'s needs and strengths',
          'Treat everyone exactly the same way to ensure fairness'
        ],
        correctAnswer: 'Adapt your leadership style based on each team member\'s needs and strengths',
        explanation: 'Situational leadership that adapts to individual team members\' needs and strengths leads to better engagement, development, and results.',
        difficulty: 'medium',
        category: 'leadership',
        timeLimit: 60
      }
    );
  }
  
  // Add more questions to reach the desired count
  while (questions.length < count) {
    const index = questions.length + 1;
    
    if (category === 'aptitude') {
      if (index % 3 === 0) {
        // Logical reasoning question
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `In a tech company, there are three programming teams: frontend, backend, and full-stack. If all frontend developers are JavaScript developers, and some JavaScript developers are full-stack, which statement must be true?`,
          options: [
            'All full-stack developers are frontend developers',
            'Some frontend developers are full-stack developers',
            'All JavaScript developers are frontend developers',
            'No backend developers use JavaScript'
          ],
          correctAnswer: 'Some frontend developers are full-stack developers',
          explanation: 'Since all frontend developers are JavaScript developers, and some JavaScript developers are full-stack, it follows that some frontend developers are also full-stack developers.',
          difficulty: 'medium',
          category: 'logical',
          timeLimit: 60
        });
      } else if (index % 3 === 1) {
        // Numerical question
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `A company has ${20 + index * 5} developers who need to be assigned to ${4 + index % 3} teams equally. How many developers will be in each team?`,
          options: [
            `${Math.floor((20 + index * 5) / (4 + index % 3))}`,
            `${Math.floor((20 + index * 5) / (4 + index % 3)) + 1}`,
            `${Math.floor((20 + index * 5) / (4 + index % 3)) - 1}`,
            `${Math.floor((20 + index * 5) / (4 + index % 3)) + 2}`
          ],
          correctAnswer: `${Math.floor((20 + index * 5) / (4 + index % 3))}`,
          explanation: `Dividing ${20 + index * 5} developers by ${4 + index % 3} teams gives ${Math.floor((20 + index * 5) / (4 + index % 3))} developers per team.`,
          difficulty: 'easy',
          category: 'numerical',
          timeLimit: 60
        });
      } else {
        // Pattern recognition
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `What comes next in this sequence related to scaling in ${interests}: 1, 2, 4, 8, ?`,
          options: ['10', '12', '16', '20'],
          correctAnswer: '16',
          explanation: 'The sequence follows a pattern of multiplying by 2: 1×2=2, 2×2=4, 4×2=8, 8×2=16',
          difficulty: 'easy',
          category: 'pattern',
          timeLimit: 60
        });
      }
    } else if (category === 'programming') {
      if (index % 3 === 0) {
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `Which design pattern would be most appropriate for implementing a notification system in a ${interests} application?`,
          options: ['Singleton', 'Factory', 'Observer', 'Strategy'],
          correctAnswer: 'Observer',
          explanation: 'The Observer pattern allows objects (observers) to be notified when the state of another object (subject) changes, making it ideal for notification systems.',
          difficulty: 'medium',
          category: 'concepts',
          timeLimit: 60
        });
      } else if (index % 3 === 1) {
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `When would you choose a NoSQL database over a relational database for a ${interests} project?`,
          options: [
            'When complex transactions and joins are required',
            'When the data structure is expected to be consistent and unchanging',
            'When designing a system that requires strict data normalization',
            'When handling large volumes of unstructured data with flexible schema requirements'
          ],
          correctAnswer: 'When handling large volumes of unstructured data with flexible schema requirements',
          explanation: 'NoSQL databases excel at handling large volumes of unstructured data with flexible schemas, scaling horizontally, and providing high throughput.',
          difficulty: 'medium',
          category: 'concepts',
          timeLimit: 60
        });
      } else {
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `What is the output of this code snippet?\n\nlet arr = [1, 2, 3, 4, 5];\nlet result = arr.filter(num => num % 2 === 0).map(num => num * 2);\nconsole.log(result);`,
          options: ['[2, 4, 6, 8, 10]', '[4, 8]', '[2, 6, 10]', '[1, 3, 5]'],
          correctAnswer: '[4, 8]',
          explanation: 'The filter method keeps only even numbers (2, 4), and then the map method multiplies each by 2, resulting in [4, 8].',
          difficulty: 'easy',
          category: 'debugging',
          timeLimit: 60
        });
      }
    } else if (category === 'employability') {
      if (index % 3 === 0) {
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `As a ${degree} professional in ${interests}, what's the most effective approach to handling constructive criticism from a senior colleague?`,
          options: [
            'Defend your work immediately and explain why your approach was correct',
            'Ignore the feedback if you disagree with it',
            'Listen actively, thank them for the feedback, and consider how to incorporate it',
            'Agree with everything they say regardless of your own perspective'
          ],
          correctAnswer: 'Listen actively, thank them for the feedback, and consider how to incorporate it',
          explanation: 'Professional growth comes from being receptive to feedback, showing appreciation for it, and thoughtfully evaluating how to apply it to improve your work.',
          difficulty: 'medium',
          category: 'professional',
          timeLimit: 60
        });
      } else if (index % 3 === 1) {
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `When starting at a new job in ${interests}, what's the most effective way to learn about the company culture?`,
          options: [
            'Make assumptions based on the company website',
            'Observe interactions, ask questions, and engage with colleagues across departments',
            'Follow only the written policies and procedures',
            'Wait for someone to explain the culture to you'
          ],
          correctAnswer: 'Observe interactions, ask questions, and engage with colleagues across departments',
          explanation: 'Understanding company culture requires active engagement, observation, and conversations with various team members to grasp both the stated and unstated norms.',
          difficulty: 'easy',
          category: 'core',
          timeLimit: 60
        });
      } else {
        questions.push({
          id: `${category}-${index}`,
          type: 'mcq',
          question: `In a cross-functional team working on a ${interests} project, you notice that team members are not actively sharing information. What's the best approach to improve collaboration?`,
          options: [
            'Report the lack of sharing to management',
            'Only focus on your specific responsibilities',
            'Establish regular knowledge-sharing sessions and lead by example in transparent communication',
            'Create stricter documentation requirements for everyone'
          ],
          correctAnswer: 'Establish regular knowledge-sharing sessions and lead by example in transparent communication',
          explanation: 'Improving collaboration often requires creating structured opportunities for knowledge sharing and modeling the transparent communication you want to see from others.',
          difficulty: 'medium',
          category: 'teamwork',
          timeLimit: 60
        });
      }
    }
  }
  
  return questions;
}

export async function generateAssessmentReport(formData: FormData, scores: any): Promise<any> {
  try {
    // Check if API key is completely missing
    if (!apiKey) {
      console.warn('No OpenAI API key provided, using simulation mode for assessment report');
      // Return a simulated report
      return {
        // Basic simulated report structure
        userId: "simulated-" + Math.random().toString(36).substring(2, 10),
        timestamp: new Date().toISOString(),
        formData,
        scores,
        sectionDetails: {
          aptitude: {
            totalQuestions: 10,
            correctAnswers: Math.round(scores.aptitude / 10),
            accuracy: scores.aptitude,
            strengths: ["Analytical thinking", "Pattern recognition"],
            weakAreas: ["Complex calculations", "3D visualization"]
          },
          programming: {
            totalQuestions: 10,
            correctAnswers: Math.round(scores.programming / 10),
            accuracy: scores.programming,
            strengths: ["Algorithms", "Data structures"],
            weakAreas: ["System design", "Optimization"]
          },
          employability: {
            totalQuestions: 15,
            correctAnswers: 10,
            accuracy: 67,
            softSkillsScore: 70,
            professionalSkillsScore: 65,
            aiLiteracyScore: 60,
            strengths: ["Communication", "Teamwork"],
            weakAreas: ["Leadership", "Time management"]
          }
        },
        outcome: 'Pass',
        skillReadinessLevel: 'Intermediate',
        recommendations: {
          skills: ["Algorithm design", "Problem solving"],
          courses: ["Data Structures", "System Design"],
          careerPaths: ["Software Engineer", "Web Developer"],
          aptitudeResources: {
            books: ["How to Solve It by Polya", "Thinking Fast and Slow"],
            platforms: ["Brilliant.org", "Khan Academy"],
            practiceGuide: "Practice logical reasoning daily"
          },
          programmingResources: {
            courses: ["Algorithms Specialization on Coursera", "System Design for Interviews"],
            platforms: ["LeetCode", "HackerRank"],
            topicsToStudy: ["Dynamic Programming", "Graph Algorithms"]
          },
          employabilityResources: {
            courses: ["Technical Communication", "Project Management"],
            activities: ["Contributing to open source", "Hackathons"]
          },
          nextAction: "Focus on improving algorithm skills and system design knowledge"
        }
      };
    }
    
    const prompt = `Generate a simplified assessment report for a candidate with the following profile:
    Name: ${formData.name}
    Degree: ${formData.degree || 'Not specified'}
    College: ${formData.collegeName || 'Not specified'}
    Graduation Year: ${formData.graduationYear || 'Not specified'}
    Interested Domains: ${formData.interestedDomain || 'Not specified'}
    
    Assessment Scores:
    - Aptitude & Reasoning: ${scores.aptitude}/100
    - General Programming: ${scores.programming}/100
    - Employability Skills: ${
      typeof scores.employability === 'object' 
        ? Object.entries(scores.employability)
            .map(([category, score]) => `${category}: ${score}/100`)
            .join(', ')
        : 'General: ' + scores.employability + '/100'
    }
    
    Please provide ONLY these three sections:
    1. Candidate Information - A brief summary of the candidate's profile
    2. Test Summary - A concise overview of test performance
    3. Final Score & Next Steps - Overall assessment grade and specific recommended next actions
    
    Do NOT include detailed analysis, resources lists, or extensive recommendations.
    
    Format the response as a JSON object with ONLY these sections shown, structured as follows:
    {
      "candidateInfo": {
        // basic candidate information
      },
      "testSummary": {
        // test performance summary
      },
      "finalScore": {
        "outcome": "Pass/Fail",
        "skillReadinessLevel": "Beginner/Intermediate/Advanced",
        "nextSteps": ["Step 1", "Step 2", "Step 3"]
      }
    }`;
    
    console.log('Making OpenAI API call for assessment report with model: gpt-3.5-turbo');
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }
    });
    
    const response = completion.choices[0].message.content;
    if (!response) {
      throw new Error('Empty response from OpenAI');
    }
    
    console.log('Successfully received assessment report response');
    return JSON.parse(response);
  } catch (error) {
    console.error('Error generating assessment report with OpenAI:', error);
    console.error('Error details:', typeof error === 'object' ? JSON.stringify(error) : error);
    
    // Return a fallback simulated report on error
    console.log('Returning fallback simulated assessment report');
    return {
      userId: "fallback-" + Math.random().toString(36).substring(2, 10),
      timestamp: new Date().toISOString(),
      formData,
      scores,
      sectionDetails: {
        aptitude: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.aptitude / 10),
          accuracy: scores.aptitude,
          strengths: ["Analytical thinking", "Pattern recognition"],
          weakAreas: ["Complex calculations", "3D visualization"]
        },
        programming: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.programming / 10),
          accuracy: scores.programming,
          strengths: ["Algorithms", "Data structures"],
          weakAreas: ["System design", "Optimization"]
        },
        employability: {
          totalQuestions: 15,
          correctAnswers: 10,
          accuracy: 67,
          softSkillsScore: 70,
          professionalSkillsScore: 65,
          aiLiteracyScore: 60,
          strengths: ["Communication", "Teamwork"],
          weakAreas: ["Leadership", "Time management"]
        }
      },
      outcome: 'Pass',
      skillReadinessLevel: 'Intermediate',
      recommendations: {
        skills: ["Algorithm design", "Problem solving"],
        courses: ["Data Structures", "System Design"],
        careerPaths: ["Software Engineer", "Web Developer"],
        aptitudeResources: {
          books: ["How to Solve It by Polya", "Thinking Fast and Slow"],
          platforms: ["Brilliant.org", "Khan Academy"],
          practiceGuide: "Practice logical reasoning daily"
        },
        programmingResources: {
          courses: ["Algorithms Specialization on Coursera", "System Design for Interviews"],
          platforms: ["LeetCode", "HackerRank"],
          topicsToStudy: ["Dynamic Programming", "Graph Algorithms"]
        },
        employabilityResources: {
          courses: ["Technical Communication", "Project Management"],
          activities: ["Contributing to open source", "Hackathons"]
        },
        nextAction: "Focus on improving algorithm skills and system design knowledge"
      }
    };
  }
}
