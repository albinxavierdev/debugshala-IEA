import { NextResponse } from 'next/server';
import { generatePersonalizedQuestions } from '@/lib/openai';
import { FormData, QuestionType, EmployabilityCategory } from '@/types/assessment';

export async function POST(request: Request) {
  try {
    const { 
      type, 
      category, 
      formData, 
      userId, 
      questionCount, 
      batchSize = 10, 
      realtime = true,
      skipStorage = false
    } = await request.json();

    if (!type || !['aptitude', 'programming', 'employability'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }

    // Generate questions based on the specified type and optional parameters
    console.log(`Generating questions for type: ${type}, category: ${category || 'none'} using OpenAI (${realtime ? 'real-time' : 'cacheable'})`);
    
    // Log OpenAI configuration for debugging
    const apiKey = process.env.OPENAI_API_KEY || '';
    console.log(`OpenAI API key check: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`OpenAI API key type: ${apiKey.startsWith('sk-proj-') ? 'Project key' : (apiKey ? 'Standard key' : 'No key')}`);
    console.log(`Skip storage mode: ${skipStorage ? 'Enabled' : 'Disabled'}`);
    
    let questions;
    let isPersonalized = false;
    
    // If formData is provided, generate personalized questions
    if (formData && Object.keys(formData).length > 0) {
      console.log(`Generating personalized questions for ${formData.name} using OpenAI with batch size: ${batchSize}`);
      // Enhanced logging to ensure we have all the necessary data
      console.log(`User profile data: Name: ${formData.name}, Degree: ${formData.degree || 'N/A'}, Interested domains: ${formData.interestedDomains?.join(', ') || 'N/A'}`);
      
      // Set the desired count of questions (default is 10 for most types, 5 for employability categories)
      const count = questionCount || (type === 'employability' ? 5 : 10);
      
      try {
        // Always use real-time for personalized questions
        questions = await generatePersonalizedQuestions(
          formData, 
          type as QuestionType, 
          category as EmployabilityCategory,
          batchSize
        );
        
        console.log(`Generated ${questions.length} personalized questions using OpenAI`);
        isPersonalized = true;
      } catch (error) {
        console.error('Error generating personalized questions with OpenAI:', error);
        console.error('Error details:', typeof error === 'object' ? JSON.stringify(error) : error);
        
        // If personalized generation fails, fall back to standard mock questions
        questions = generateMockQuestions(
          type as QuestionType, 
          category as EmployabilityCategory,
          count,
          formData
        );
        console.log(`Generated ${questions.length} fallback personalized questions`);
      }
    } else {
      console.log('No formData provided, using standard mock questions');
      // If no formData is provided, use standard mock questions
      questions = generateMockQuestions(
        type as QuestionType, 
        category as EmployabilityCategory,
        questionCount || batchSize
      );
    }
    
    // Ensure all questions have unique IDs with timestamps for real-time uniqueness
    const timestamp = Date.now();
    questions = questions.map((q, index) => ({
      ...q,
      id: q.id || `openai-${type}-${category || ''}-${index + 1}-${timestamp}`,
      generated_at: new Date().toISOString(),
      personalized: isPersonalized
    }));

    return NextResponse.json({
      questions,
      isPersonalized,
      userId,
      provider: 'openai',
      real_time: realtime,
      timestamp: timestamp,
      batch_size: batchSize
    });
  } catch (error) {
    console.error('Error generating questions with OpenAI:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}

// Function to generate mock questions when API fails or for testing
function generateMockQuestions(
  type: QuestionType, 
  category?: EmployabilityCategory, 
  count: number = 10,
  userData?: FormData
): any[] {
  const questions = [];
  
  // Get personalization data if available
  const name = userData?.name || 'candidate';
  const degree = userData?.degree || 'technical';
  const interests = userData?.interestedDomains?.join(', ') || 'technology';
  const college = userData?.collegeName || 'university';
  
  // Create different questions based on type with personalization
  switch (type) {
    case 'aptitude':
      questions.push(
        {
          id: 'apt-1',
          type: 'mcq',
          question: `If a ${interests} project needs 360 hours of work and ${name} can work 3 hours per day, how many days will it take to complete?`,
          options: ['90 days', '120 days', '180 days', '240 days'],
          correctAnswer: '120 days',
          explanation: 'Days = Total hours / Hours per day = 360h / 3h = 120 days',
          difficulty: 'easy',
          category: 'numerical',
          timeLimit: 60,
          personalized: !!userData
        },
        {
          id: 'apt-2',
          type: 'mcq',
          question: `In a sequence relevant to ${degree} studies: 2, 4, 8, 16, what comes next?`,
          options: ['24', '32', '36', '64'],
          correctAnswer: '32',
          explanation: 'Each number is doubled to get the next number: 2×2=4, 4×2=8, 8×2=16, 16×2=32',
          difficulty: 'easy',
          category: 'pattern',
          timeLimit: 60,
          personalized: !!userData
        }
      );
      break;
      
    case 'programming':
      questions.push(
        {
          id: 'prog-1',
          type: 'mcq',
          question: `For a ${interests} application, what would be the time complexity of binary search?`,
          options: ['O(n)', 'O(n log n)', 'O(log n)', 'O(1)'],
          correctAnswer: 'O(log n)',
          explanation: 'Binary search repeatedly divides the search space in half, resulting in logarithmic time complexity.',
          difficulty: 'medium',
          category: 'algorithms',
          timeLimit: 60,
          personalized: !!userData
        },
        {
          id: 'prog-2',
          type: 'mcq',
          question: `Which data structure would ${name} use for implementing a Last In First Out (LIFO) queue in a ${interests} project?`,
          options: ['Queue', 'Stack', 'Linked List', 'Tree'],
          correctAnswer: 'Stack',
          explanation: 'A stack follows the LIFO principle where the last element added is the first one to be removed.',
          difficulty: 'easy',
          category: 'data structures',
          timeLimit: 60,
          personalized: !!userData
        }
      );
      break;
      
    case 'employability':
      questions.push(
        {
          id: `emp-${category}-1`,
          type: 'mcq',
          question: `At a ${interests} company, ${name} is in a team meeting where a colleague presents an idea with significant flaws. What is the most appropriate response?`,
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
          timeLimit: 60,
          personalized: !!userData
        }
      );
      break;
  }
  
  // Add personalized generic questions to reach the desired count
  while (questions.length < count) {
    const index: number = questions.length + 1;
    questions.push({
      id: `${type}-generic-${index}`,
      type: 'mcq',
      question: userData ? 
        `Question ${index} for ${name} with ${degree} background from ${college}, interested in ${interests}?` :
        `Mock question ${index} for ${type} assessment ${category ? `in category ${category}` : ''}?`,
      options: userData ? 
        [`${interests} Option A`, `${degree} Option B`, `${college} Option C`, 'Option D'] :
        ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: userData ? `${degree} Option B` : 'Option B',
      explanation: userData ? 
        `This explanation is customized for someone with a ${degree} background interested in ${interests}.` :
        'This is the explanation for the correct answer.',
      difficulty: 'medium',
      category: category || type,
      timeLimit: 60,
      personalized: !!userData
    });
  }
  
  return questions;
} 