import OpenAI from "openai";
import { FormData, QuestionType, EmployabilityCategory } from '@/types/assessment';

// Check for API key and log basic info
const apiKey = process.env.OPENAI_API_KEY || '';
const isProjectKey = apiKey.startsWith('sk-proj-');
const apiKeyMasked = apiKey ? `${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}` : 'None';

console.log('----- OpenAI Configuration -----');
console.log(`API Key Status: ${apiKey ? 'Present' : 'Missing'}`);
console.log(`API Key Type: ${isProjectKey ? 'Project key' : (apiKey ? 'Standard key' : 'No key')}`);
console.log(`API Key (masked): ${apiKeyMasked}`);
console.log(`API Key Length: ${apiKey.length} characters`);
console.log('-------------------------------');

// Initialize OpenAI API with better configuration
const openai = new OpenAI({
  apiKey: apiKey,
  timeout: 90000, // 90 second timeout for requests (increased from 60s)
  maxRetries: 3,   // Auto-retry up to 3 times
  defaultHeaders: {
    'OpenAI-Beta': 'assistants=v1'  // Use latest API features
  },
  defaultQuery: {
    'api-version': '2023-05-15'     // Specify API version
  }
});

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
 * Improved with better error handling and reliability
 */
export async function generateQuestionsBatch(prompt: string): Promise<Question[]> {
  try {
    console.log('Sending prompt to OpenAI...');
    
    // Check if API key is completely missing
    if (!apiKey) {
      console.warn('Missing OpenAI API key, using simulation mode');
      throw new Error('OpenAI API key is required');
    }
    
    // Create a more robust OpenAI call with temperature parameter
    console.log('Making OpenAI API call with model: gpt-4o');
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
      response_format: { type: "json_object" },
      temperature: 0.7,  // Add some creativity but keep relatively consistent
    });

    const response = completion.choices[0].message.content;
    
    if (!response) {
      console.error('Empty response received from OpenAI');
      throw new Error('Empty response from OpenAI');
    }
    
    // Print the first 200 characters of the response for debugging
    console.log(`OpenAI response preview: ${response.substring(0, 200)}...`);
    
    try {
      // Enhanced error handling for JSON parsing
      let parsedResponse;
      try {
        parsedResponse = JSON.parse(response);
      } catch (initialParseError) {
        // Try to fix common JSON issues and retry parsing
        console.warn('Initial JSON parse failed, attempting to fix response format');
        
        // Sometimes the response might have markdown code blocks or leading/trailing text
        const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/) || 
                          response.match(/```\s*([\s\S]*?)\s*```/) || 
                          response.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
        
        if (jsonMatch && jsonMatch[1]) {
          console.log('Found JSON-like content inside markdown blocks, trying to parse that');
          try {
            parsedResponse = JSON.parse(jsonMatch[1]);
          } catch (markdownParseError) {
            console.error('Failed to parse JSON from markdown block:', markdownParseError);
            throw initialParseError; // Throw the original error
          }
        } else {
          // If no markdown blocks, try to clean the string in other ways
          const cleanedResponse = response
            .replace(/^[^{\[]+/, '') // Remove any text before the first { or [
            .replace(/[^}\]]+$/, ''); // Remove any text after the last } or ]
          
          console.log('Attempting to parse cleaned response');
          try {
            parsedResponse = JSON.parse(cleanedResponse);
          } catch (cleanedParseError) {
            console.error('Failed to parse cleaned JSON:', cleanedParseError);
            throw initialParseError; // Throw the original error
          }
        }
      }
      
      // Log success for monitoring
      console.log(`Successfully generated ${Array.isArray(parsedResponse) ? parsedResponse.length : 
        (parsedResponse.questions ? parsedResponse.questions.length : 0)} questions`);
      
      // Check if the response has a questions array
      if (Array.isArray(parsedResponse)) {
        return parsedResponse;
      } else if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
        return parsedResponse.questions;
      } else {
        console.error('Unexpected response format from OpenAI:', parsedResponse);
        throw new Error('Invalid response format from OpenAI');
      }
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      console.error('Failed response text type:', typeof response);
      console.error('Failed response length:', response.length);
      console.error('Failed response first 500 chars:', response.substring(0, 500));
      console.error('Failed response last 500 chars:', response.substring(response.length - 500));
      
      // Fall back to mock questions instead of failing
      console.warn('Falling back to mock questions due to parse error');
      return simulateOpenAIResponse(prompt, "aptitude", 5);
    }
  } catch (error: any) {
    console.error('Error generating questions with OpenAI:', error);
    
    // Identify specific error types for better handling
    if (error.name === 'AbortError' || error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      console.warn('OpenAI request timed out, falling back to simulation');
      return simulateOpenAIResponse(prompt, "aptitude", 5);
    }
    
    if (error.status === 429) {
      console.warn('OpenAI rate limit exceeded, falling back to simulation');
      return simulateOpenAIResponse(prompt, "aptitude", 5);
    }
    
    if (error.status === 401) {
      console.warn('Invalid OpenAI API key, falling back to simulation');
      return simulateOpenAIResponse(prompt, "aptitude", 5);
    }
    
    // For all other errors, also fall back to simulation
    console.warn('Unknown OpenAI error, falling back to simulation');
    return simulateOpenAIResponse(prompt, "aptitude", 5);
  }
}

export async function generatePersonalizedQuestions(userData: FormData, type: QuestionType, category?: EmployabilityCategory, batchSize: number = 10): Promise<Question[]> {
  console.log(`Generating personalized ${type} questions for ${userData.name} using OpenAI (batch size: ${batchSize})`);
  
  // Create a more detailed user context based on their profile
  const userContext = `
    Name: ${userData.name}
    Degree: ${userData.degree || 'Not specified'}
    Graduation Year: ${userData.graduationYear || 'Not specified'}
    College: ${userData.collegeName || 'Not specified'}
    Interested Domains: ${userData.interestedDomains.join(', ') || 'Not specified'}
  `;
  
  // Use provided batch size or default based on question type
  const numQuestions = batchSize || (type === 'employability' ? 5 : 10);
  
  // Different prompt based on question type with more personalization
  let prompt = '';
  
  if (type === 'aptitude') {
    // Customize aptitude questions based on domains of interest
    const domainFocus = userData.interestedDomains && userData.interestedDomains.length > 0 ?
      `Focus on problems that would be relevant to someone interested in ${userData.interestedDomains.join(', ')}.` :
      'Focus on general technical aptitude questions.';
    
    prompt = `Generate ${numQuestions} personalized aptitude and reasoning questions suitable for a technical assessment. 
    The candidate has the following profile:
    ${userContext}
    
    ${domainFocus}
    
    Include a mix of:
    - Logical reasoning questions
    - Numerical ability questions 
    - Problem-solving questions
    - Pattern recognition questions
    
    Each question should be multiple choice with 4 options, with exactly one correct answer.
    Try to reference the candidate's background, interests, or field of study when relevant.
    
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
    // Focus specifically on their domains of interest
    const domainSpecificQuestions = userData.interestedDomains && userData.interestedDomains.length > 0 ?
      `Create questions that specifically test knowledge in ${userData.interestedDomains.join(', ')}.` :
      'Create general programming knowledge questions.';
    
    prompt = `Generate ${numQuestions} personalized programming knowledge questions suitable for ${userData.name}.
    The candidate has the following profile:
    ${userContext}
    
    ${domainSpecificQuestions}
    
    Include a mix of:
    - Data structures and algorithms relevant to their interests
    - Programming concepts they would likely encounter in their career
    - Software design patterns
    - Web/mobile/system development concepts based on their interests
    - Database concepts
    
    Each question should be multiple choice with 4 options, with exactly one correct answer.
    Make the questions feel personalized by occasionally referencing their background or interests.
    
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
    // Customize based on category and user background
    const categoryDescription = getCategoryDescription(category);
    
    prompt = `Generate ${numQuestions} highly personalized employability assessment questions for ${userData.name}, focused on the ${category} category.
    The candidate has the following profile:
    ${userContext}
    
    Category description: ${categoryDescription}
    
    The questions should:
    - Be scenario-based when possible
    - Relate directly to roles in ${userData.interestedDomains.join(', ') || 'technology'} fields
    - Assess real-world problem-solving and professional judgment
    - Reference contexts that would be familiar to someone with ${userData.degree || 'their'} background
    - Evaluate skills that would be valuable in jobs related to ${userData.interestedDomains.join(', ') || 'technology'}
    - Occasionally mention their educational background from ${userData.collegeName || 'their college'} when relevant
    
    Each question should be multiple choice with 4 options, with exactly one correct answer.
    
    Format the response as a JSON array of objects with the following structure:
    [
      {
        "id": "string",
        "type": "mcq",
        "question": "string",
        "options": ["string", "string", "string", "string"],
        "correctAnswer": "string",
        "explanation": "string explaining why this is the correct answer",
        "difficulty": "easy|medium|hard",
        "category": "${category}",
        "timeLimit": number (in seconds)
      }
    ]`;
  }
  
  try {
    // Check if API key is completely missing
    if (!apiKey) {
      console.warn('No OpenAI API key provided, using simulation mode');
      return simulateOpenAIResponse(prompt, type, numQuestions, userData);
    }
    
    // Call the OpenAI API with the generated prompt
    console.log('Calling OpenAI API with personalized prompt');
    return await generateQuestionsBatch(prompt);
  } catch (error) {
    console.error('Error generating questions with OpenAI API:', error);
    console.error('Error details:', typeof error === 'object' ? JSON.stringify(error) : error);
    
    // Fall back to simulation if API call fails
    console.log('Falling back to simulated response');
    return simulateOpenAIResponse(prompt, type, numQuestions, userData);
  }
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

// Helper function to simulate OpenAI API response with better personalization
function simulateOpenAIResponse(prompt: string, category: string, count: number, userData?: FormData): Question[] {
  // Extract key information from the prompt for personalization
  const nameMatch = prompt.match(/Name: ([^\n]+)/);
  const degreeMatch = prompt.match(/Degree: ([^\n]+)/);
  const interestsMatch = prompt.match(/Interested Domains: ([^\n]+)/);
  
  const name = userData?.name || (nameMatch ? nameMatch[1].trim() : 'the candidate');
  const degree = userData?.degree || (degreeMatch ? degreeMatch[1].trim() : 'technical');
  const interests = userData?.interestedDomains?.join(', ') || (interestsMatch ? interestsMatch[1].trim() : 'technology');
  const college = userData?.collegeName || 'your university';
  
  const questions: Question[] = [];
  
  // Generate highly personalized mock questions based on the category and user details
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
      }
    );
  } else if (category === 'programming') {
    // Personalized programming questions based on interests
    const interestArray = interests.split(',').map(i => i.trim());
    const primaryInterest = interestArray[0] || 'software development';
    
    questions.push(
      {
        id: `${category}-1`,
        type: 'mcq',
        question: `For ${name}, working in ${primaryInterest}, what would be the time complexity of binary search?`,
        options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'],
        correctAnswer: 'O(log n)',
        explanation: 'Binary search repeatedly divides the search space in half, resulting in logarithmic time complexity.',
        difficulty: 'medium',
        category: 'algorithms',
        timeLimit: 60
      },
      {
        id: `${category}-2`,
        type: 'mcq',
        question: `When developing a ${primaryInterest} application, which data structure would be most appropriate for implementing an undo functionality?`,
        options: ['Queue', 'Stack', 'Linked List', 'Binary Tree'],
        correctAnswer: 'Stack',
        explanation: 'A stack follows the LIFO principle which is perfect for undo operations, where the most recent action is the first to be undone.',
        difficulty: 'easy',
        category: 'data structures',
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
      }
    );
  }
  
  // Add more personalized generic questions to reach the desired count
  while (questions.length < count) {
    const index = questions.length + 1;
    questions.push({
      id: `${category}-${index}`,
      type: 'mcq',
      question: `Question ${index} for ${name} with ${degree} background from ${college}, interested in ${interests}?`,
      options: [
        `Option A related to ${interests}`, 
        `Option B considering your ${degree} background`, 
        `Option C for someone from ${college}`, 
        'Generic Option D'
      ],
      correctAnswer: `Option B considering your ${degree} background`,
      explanation: `This option is most appropriate for someone with a ${degree} background interested in ${interests}.`,
      difficulty: 'medium',
      category: category,
      timeLimit: 60
    });
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
    Interested Domains: ${formData.interestedDomains.join(', ') || 'Not specified'}
    
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
    
    console.log('Making OpenAI API call for assessment report with model: gpt-4o');
    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-4o",
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
