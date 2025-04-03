// This is a simplified version - in production, use an actual Google API client

import { GoogleGenerativeAI } from '@google/generative-ai';
import { FormData, QuestionType, EmployabilityCategory } from '@/types/assessment';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

export async function generateQuestionsBatch(prompt: string): Promise<Question[]> {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Log the raw response for debugging
    console.log('Raw Gemini Response:', text);
    
    try {
      // Clean the response by removing markdown formatting
      const cleanedResponse = text
        .replace(/```json/g, '')  // Remove opening markdown
        .replace(/```/g, '')      // Remove closing markdown
        .trim();                  // Trim extra spaces
      
      // Log the cleaned response for debugging
      console.log('Cleaned Response:', cleanedResponse);
      
      return JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('Error parsing Gemini response:', parseError);
      console.error('Failed response text:', text);
      throw new Error('Failed to parse Gemini response as JSON');
    }
  } catch (error) {
    console.error('Error generating questions batch:', error);
    throw error;
  }
}

export async function generateAptitudeQuestions(): Promise<Question[]> {
  const prompt = `Generate 5 multiple choice aptitude and reasoning questions. Each question should test:
  - Logical reasoning
  - Numerical ability
  - Problem-solving skills
  
  Format each question as a JSON object with the following structure:
  {
    "id": "unique_id",
    "type": "mcq",
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct option",
    "explanation": "explanation of the answer",
    "difficulty": "easy|medium|hard",
    "category": "logical|numerical|problem-solving",
    "timeLimit": 90
  }
  Return the questions as a JSON array.`;

  try {
    // Generate two batches of 5 questions each
    const [batch1, batch2] = await Promise.all([
      generateQuestionsBatch(prompt),
      generateQuestionsBatch(prompt)
    ]);

    // Combine the batches and ensure unique IDs
    const combinedQuestions = [...batch1, ...batch2].map((q, index) => ({
      ...q,
      id: `aptitude-${index + 1}`
    }));

    return combinedQuestions;
  } catch (error) {
    console.error('Error generating aptitude questions:', error);
    throw error;
  }
}

export async function generateProgrammingQuestions(): Promise<Question[]> {
  const prompt = `Generate 5 multiple choice programming questions covering:
  - Basic coding concepts
  - Algorithmic thinking
  - Data structures
  - Problem-solving approaches
  
  Format each question as a JSON object with the following structure:
  {
    "id": "unique_id",
    "type": "mcq",
    "question": "question text",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "correct option",
    "explanation": "explanation of the answer",
    "difficulty": "easy|medium|hard",
    "category": "coding|algorithms|data-structures",
    "timeLimit": 90
  }
  Return the questions as a JSON array.`;

  try {
    // Generate two batches of 5 questions each
    const [batch1, batch2] = await Promise.all([
      generateQuestionsBatch(prompt),
      generateQuestionsBatch(prompt)
    ]);

    // Combine the batches and ensure unique IDs
    const combinedQuestions = [...batch1, ...batch2].map((q, index) => ({
      ...q,
      id: `programming-${index + 1}`
    }));

    return combinedQuestions;
  } catch (error) {
    console.error('Error generating programming questions:', error);
    throw error;
  }
}

export async function generateCodingTasks(): Promise<Question[]> {
  const prompt = `Generate 2 coding problems that test problem-solving abilities. Include a mix of algorithm implementation and data structure manipulation.
  Format each problem as a JSON object with the following structure:
  {
    "id": "unique_id",
    "type": "coding",
    "question": "detailed problem description including input/output format and constraints",
    "correctAnswer": "example solution or test cases",
    "explanation": "explanation of the approach",
    "difficulty": "medium|hard"
  }
  Return the problems as a JSON array.`;

  try {
    // Generate two batches of 2 questions each
    const [batch1, batch2] = await Promise.all([
      generateQuestionsBatch(prompt),
      generateQuestionsBatch(prompt)
    ]);

    // Combine the batches and ensure unique IDs
    const combinedQuestions = [...batch1, ...batch2].map((q, index) => ({
      ...q,
      id: `coding-${index + 1}`
    }));

    return combinedQuestions;
  } catch (error) {
    console.error('Error generating coding tasks:', error);
    throw error;
  }
}

export async function generateEmployabilityQuestions(category: string): Promise<Question[]> {
  const categories = {
    'core': 'Core Employability – Work ethics, adaptability, collaboration',
    'soft': 'Soft Skills – Communication, leadership, problem-solving',
    'professional': 'Professional Skills – Workplace etiquette, email writing',
    'ai': 'AI Literacy – Understanding AI tools, automation',
    'application': 'Job Application Skills – Resume writing, LinkedIn optimization',
    'entrepreneurial': 'Entrepreneurial Skills – Business mindset, innovation thinking',
    'domain': 'Domain-Specific Skills – Industry-based knowledge',
    'project': 'Project Management Basics – Planning, execution, teamwork'
  };

  const prompt = `Generate 5 scenario-based questions to assess ${categories[category as keyof typeof categories]}.
  The questions should evaluate real-world problem-solving, communication, and professional judgment.
  Format each question as a JSON object with the following structure:
  {
    "id": "unique_id",
    "type": "mcq",
    "question": "scenario-based question",
    "options": ["option1", "option2", "option3", "option4"],
    "correctAnswer": "most appropriate option",
    "explanation": "explanation of why this is the best approach",
    "difficulty": "medium",
    "category": "${category}",
    "timeLimit": 180
  }
  Return the questions as a JSON array.`;

  try {
    // Generate one batch of 5 questions for employability
    const questions = await generateQuestionsBatch(prompt);
    
    // Ensure unique IDs
    return questions.map((q, index) => ({
      ...q,
      id: `employability-${category}-${index + 1}`
    }));
  } catch (error) {
    console.error('Error generating employability questions:', error);
    throw error;
  }
}

// Function to generate personalized assessment questions based on user data
export async function generateAssessment(userData: {
  fullName: string,
  domains: string[],
  graduationYear: string,
  college: string
}) {
  // In production, this would call the actual Gemini API
  // For now, we'll simulate the request
  
  try {
    // Mock API call to Gemini
    console.log('Generating assessment for:', userData);
    
    // For development, we'll return mock data
    // In production, replace with actual API call
    return {
      questions: generateMockQuestions(userData.domains),
      assessmentId: `assess-${Date.now()}`
    };
  } catch (error) {
    console.error('Error generating assessment:', error);
    throw error;
  }
}

// Function to generate assessment results and report
export async function generateResults(assessmentData: {
  userId: string,
  domains: string[],
  answers: any[],
  timeSpent: string
}) {
  // In production, this would call the actual Gemini API
  try {
    // Mock API call to Gemini
    console.log('Generating results for:', assessmentData);
    
    // For development, we'll return mock data
    return {
      score: Math.floor(Math.random() * 30) + 70, // Random score between 70-100
      analysis: generateMockAnalysis(assessmentData.domains),
      strengths: ['Problem Solving', 'Technical Knowledge'],
      areasForImprovement: ['Algorithm Optimization', 'Database Design'],
      reportId: `report-${Date.now()}`
    };
  } catch (error) {
    console.error('Error generating results:', error);
    throw error;
  }
}

// Helper function to generate mock questions based on domains
function generateMockQuestions(domains: string[]) {
  const questions: any[] = [];
  
  // Generate 5 questions per domain, up to 30 total
  domains.forEach(domain => {
    const domainQuestions = generateQuestionsForDomain(domain, 5);
    questions.push(...domainQuestions);
  });
  
  return questions.slice(0, 30); // Limit to 30 questions
}

// Helper function to generate domain-specific questions
function generateQuestionsForDomain(domain: string, count: number) {
  const questions = [];
  
  for (let i = 0; i < count; i++) {
    let question = {
      id: `${domain.toLowerCase().replace(/\s+/g, '-')}-q${i+1}`,
      domain: domain,
      text: `Sample question ${i+1} for ${domain}`,
      type: 'multiple-choice',
      options: [
        { id: 'a', text: 'Option A' },
        { id: 'b', text: 'Option B' },
        { id: 'c', text: 'Option C' },
        { id: 'd', text: 'Option D' }
      ],
      correctAnswer: 'b' // In real implementation, this would be sent separately
    };
    
    questions.push(question);
  }
  
  return questions;
}

// Helper function to generate mock analysis
function generateMockAnalysis(domains: string[]) {
  const analysisPoints = domains.map(domain => 
    `You showed strong understanding in ${domain} concepts. Your problem-solving approach demonstrates good technical knowledge.`
  );
  
  return analysisPoints.join(' ');
}

export async function generatePersonalizedQuestions(userData: FormData, type: QuestionType, category?: EmployabilityCategory): Promise<Question[]> {
  console.log(`Generating personalized ${type} questions for ${userData.name}`);
  
  // Create a unique user context based on their profile
  const userContext = `
    Name: ${userData.name}
    Degree: ${userData.degree || 'Not specified'}
    Graduation Year: ${userData.graduationYear || 'Not specified'}
    College: ${userData.collegeName || 'Not specified'}
    Interested Domains: ${userData.interestedDomains.join(', ') || 'Not specified'}
  `;
  
  // Default number of questions to generate
  const numQuestions = type === 'employability' ? 5 : 10;
  
  // Different prompt based on question type
  let prompt = '';
  
  if (type === 'aptitude') {
    prompt = `Generate ${numQuestions} aptitude and reasoning questions suitable for a technical assessment. 
    The candidate has the following profile:
    ${userContext}
    
    Include a mix of:
    - Logical reasoning questions
    - Numerical ability questions 
    - Problem-solving questions
    - Pattern recognition questions
    
    Each question should be multiple choice with 4 options, with exactly one correct answer.
    
    Format the response as a JSON array of objects with the following structure:
    [
      {
        "id": "string",
        "type": "mcq",
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string",
        "explanation": "string",
        "difficulty": "easy|medium|hard",
        "category": "logical|numerical|pattern|problem-solving",
        "timeLimit": number (in seconds)
      }
    ]`;
  } else if (type === 'programming') {
    prompt = `Generate ${numQuestions} programming knowledge questions suitable for a technical assessment.
    The candidate has the following profile:
    ${userContext}
    
    Focus on concepts relevant to ${userData.interestedDomains.join(', ') || 'general programming'}.
    
    Include a mix of:
    - Data structures and algorithms
    - Programming language concepts
    - Software design patterns
    - Web/mobile/system development concepts (based on their interests)
    - Database concepts
    
    Each question should be multiple choice with 4 options, with exactly one correct answer.
    
    Format the response as a JSON array of objects with the following structure:
    [
      {
        "id": "string",
        "type": "mcq",
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string",
        "explanation": "string",
        "difficulty": "easy|medium|hard",
        "category": "algorithms|languages|design|development|database",
        "timeLimit": number (in seconds)
      }
    ]`;
  } else if (type === 'employability') {
    // For employability, we need questions from a specific category
    const employabilityCategories = {
      'core': 'Core Work Skills',
      'soft': 'Soft Skills',
      'professional': 'Professional Development',
      'communication': 'Communication Skills',
      'teamwork': 'Teamwork & Collaboration',
      'leadership': 'Leadership Potential',
      'problem_solving': 'Problem Solving',
      'domain': 'Domain Knowledge'
    };
    
    const categoryToUse = category || 'soft';
    const categoryName = employabilityCategories[categoryToUse as keyof typeof employabilityCategories];
    
    prompt = `Generate ${numQuestions} employability assessment questions for the "${categoryName}" category.
    
    The candidate has the following profile:
    ${userContext}
    
    Tailor these questions specifically to someone interested in ${userData.interestedDomains.join(', ') || 'technology'} 
    with a ${userData.degree || 'technical'} background from ${userData.collegeName || 'their university'}.
    
    Make scenarios relevant to their profile and interests.
    
    Each question should present a realistic workplace scenario that evaluates the candidate's ${categoryName.toLowerCase()}.
    Each question should be multiple choice with 4 options, with exactly one correct answer.
    
    Format the response as a JSON array of objects with the following structure:
    [
      {
        "id": "${categoryToUse}-1",
        "type": "mcq",
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string",
        "explanation": "string",
        "difficulty": "easy|medium|hard",
        "category": "${categoryToUse}",
        "categoryName": "${categoryName}",
        "timeLimit": number (in seconds)
      }
    ]`;
  }
  
  try {
    // Try to call the Gemini API with the generated prompt
    console.log('Calling Gemini API with personalized prompt');
    return await generateQuestionsBatch(prompt);
  } catch (error) {
    console.error('Error generating questions with Gemini API:', error);
    
    // Fall back to simulation if API call fails
    console.log('Falling back to simulated response');
    return simulateGeminiResponse(prompt, type, numQuestions);
  }
}

// Helper function to simulate Gemini API response
function simulateGeminiResponse(prompt: string, category: string, count: number): Question[] {
  // Extract key information from the prompt for personalization
  const nameMatch = prompt.match(/Name: ([^\n]+)/);
  const degreeMatch = prompt.match(/Degree: ([^\n]+)/);
  const interestsMatch = prompt.match(/Interested Domains: ([^\n]+)/);
  
  const name = nameMatch ? nameMatch[1].trim() : 'the candidate';
  const degree = degreeMatch ? degreeMatch[1].trim() : 'technical';
  const interests = interestsMatch ? interestsMatch[1].trim() : 'technology';
  
  const questions: Question[] = [];
  
  // Generate mock questions based on the category and user details
  if (category === 'aptitude') {
    // ... existing code ...
  } else if (category === 'programming') {
    // ... existing code ...
  } else if (category.startsWith('core')) {
    // ... existing code ...
  } else if (category.startsWith('soft')) {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `As a ${degree} graduate interested in ${interests}, how would you best handle a situation where project requirements change significantly midway through development?`,
        options: [
          'Express your frustration to ensure everyone knows the difficulties this causes',
          "Rigidly stick to the original plan since you've already started work",
          'Assess the impact, adjust your plans accordingly, and communicate proactively with stakeholders',
          'Work longer hours to accommodate both the original and new requirements'
        ],
        correctAnswer: 'Assess the impact, adjust your plans accordingly, and communicate proactively with stakeholders',
        explanation: 'Adaptability paired with clear communication demonstrates professionalism and ensures all parties have appropriate expectations.',
        difficulty: 'medium',
        category: 'soft',
        timeLimit: 60
      }
    );
  } else if (category.startsWith('teamwork')) {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `As a ${degree} graduate working on a collaborative ${interests} project, a team member is consistently missing deadlines. What's the most effective approach?`,
        options: [
          'Complete their work yourself to ensure the project stays on track',
          'Complain about them to other team members',
          "Have a private conversation to understand the challenges they're facing and offer support",
          'Immediately escalate the issue to management'
        ],
        correctAnswer: "Have a private conversation to understand the challenges they're facing and offer support",
        explanation: 'Addressing issues directly but privately demonstrates emotional intelligence and gives the person an opportunity to resolve issues without public embarrassment.',
        difficulty: 'medium',
        category: 'teamwork',
        timeLimit: 60
      }
    );
  } else if (category.startsWith('leadership')) {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `As someone with ${degree} expertise leading a ${interests} initiative, a team member makes a significant mistake. What's the best leadership response?`,
        options: [
          'Publicly criticize the mistake to ensure it doesn\'t happen again',
          'Fix the mistake yourself without discussing it',
          'Address the mistake privately, focus on learning and prevention, and provide support for correction',
          'Ignore the mistake to maintain team morale'
        ],
        correctAnswer: 'Address the mistake privately, focus on learning and prevention, and provide support for correction',
        explanation: 'Effective leadership addresses issues constructively while preserving dignity and focusing on growth and improvement.',
        difficulty: 'medium',
        category: 'leadership',
        timeLimit: 60
      }
    );
  } else if (category === 'problem_solving') {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `As a team lead for a project where ${degree} knowledge is important, what's the best approach when you discover that project requirements have changed significantly and your team has already started work?`,
        options: [
          "Rigidly stick to the original plan since you've already started work",
          "Adapt the plan iteratively while keeping stakeholders informed",
          "Change direction completely without consulting the team",
          "Ignore the requirements change and continue as planned"
        ],
        correctAnswer: "Adapt the plan iteratively while keeping stakeholders informed",
        explanation: "Effective problem solving in professional settings requires adaptability while maintaining communication with all stakeholders.",
        difficulty: 'medium',
        category: 'problem_solving',
        timeLimit: 60
      }
    );
  } else if (category.startsWith('domain')) {
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `Given your interest in ${interests}, what would be the most important consideration when implementing a new technology solution?`,
        options: [
          'Using the newest technology available regardless of fit',
          'Cost of implementation as the only factor',
          'Alignment with business objectives, user needs, scalability, and maintainability',
          'Choosing technology that\'s easiest to implement quickly'
        ],
        correctAnswer: 'Alignment with business objectives, user needs, scalability, and maintainability',
        explanation: 'Technology decisions should consider business alignment, user needs, and long-term factors like scalability and maintainability.',
        difficulty: 'medium',
        category: 'domain',
        timeLimit: 60
      }
    );
  }
  
  // Add more generic questions to reach the desired count
  while (questions.length < count) {
    const index = questions.length + 1;
    questions.push({
      id: `${category}-${index}`,
      type: 'mcq',
      question: `Question ${index} for ${name} with ${degree} background interested in ${interests}?`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option B',
      explanation: 'This is the explanation for the correct answer.',
      difficulty: 'medium',
      category: category,
      timeLimit: 60
    });
  }
  
  return questions;
} 