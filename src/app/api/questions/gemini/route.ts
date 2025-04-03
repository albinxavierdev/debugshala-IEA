import { NextResponse } from 'next/server';
import {
  generateAptitudeQuestions,
  generateProgrammingQuestions,
  generateCodingTasks,
  generateEmployabilityQuestions,
  generatePersonalizedQuestions
} from '@/lib/gemini';
import { FormData, QuestionType, EmployabilityCategory } from '@/types/assessment';

export async function POST(request: Request) {
  try {
    const { type, category, formData, prompt, userId, questionCount } = await request.json();

    if (!type || !['aptitude', 'programming', 'employability'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }

    // Generate questions based on the specified type and optional parameters
    console.log(`Generating questions for type: ${type}, category: ${category || 'none'}`);
    
    let questions;
    
    // If formData is provided, generate personalized questions
    if (formData) {
      console.log(`Generating personalized questions for ${formData.name}`);
      
      // Set the desired count of questions (default is 10 for most types, 5 for employability categories)
      const count = questionCount || (type === 'employability' ? 5 : 10);
      
      try {
        questions = await generatePersonalizedQuestions(
          formData, 
          type as QuestionType, 
          category as EmployabilityCategory
        );
        
        console.log(`Generated ${questions.length} personalized questions`);
      } catch (error) {
        console.error('Error generating personalized questions:', error);
        
        // If personalized generation fails, fall back to standard mock questions
        questions = generateMockQuestions(
          type as QuestionType, 
          category as EmployabilityCategory,
          count
        );
      }
    } else {
      // If no formData is provided, use standard mock questions
      questions = generateMockQuestions(
        type as QuestionType, 
        category as EmployabilityCategory,
        questionCount
      );
    }
    
    // Ensure all questions have unique IDs
    questions = questions.map((q, index) => ({
      ...q,
      id: q.id || `${type}-${category || ''}-${index + 1}`
    }));

    return NextResponse.json({
      questions,
      isPersonalized: !!formData,
      userId
    });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
}

// Function to generate mock questions when API fails or for testing
function generateMockQuestions(type: QuestionType, category?: EmployabilityCategory, count: number = 10): any[] {
  const questions = [];
  
  // Create different questions based on type
  switch (type) {
    case 'aptitude':
      questions.push(
        {
          id: 'apt-1',
          type: 'mcq',
          question: 'If a train travels 360 kilometers in 3 hours, what is its speed?',
          options: ['90 km/h', '120 km/h', '180 km/h', '240 km/h'],
          correctAnswer: '120 km/h',
          explanation: 'Speed = Distance/Time = 360km/3h = 120km/h',
          difficulty: 'easy',
          category: 'numerical',
          timeLimit: 60
        },
        {
          id: 'apt-2',
          type: 'mcq',
          question: 'Which number comes next in the sequence: 2, 4, 8, 16, __?',
          options: ['24', '32', '36', '64'],
          correctAnswer: '32',
          explanation: 'Each number is doubled to get the next number: 2×2=4, 4×2=8, 8×2=16, 16×2=32',
          difficulty: 'easy',
          category: 'pattern',
          timeLimit: 60
        }
      );
      break;
      
    case 'programming':
      questions.push(
        {
          id: 'prog-1',
          type: 'mcq',
          question: 'What is the time complexity of binary search?',
          options: ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)'],
          correctAnswer: 'O(log n)',
          explanation: 'Binary search halves the search space in each step, resulting in logarithmic time complexity.',
          difficulty: 'medium',
          category: 'algorithms',
          timeLimit: 60
        },
        {
          id: 'prog-2',
          type: 'mcq',
          question: 'Which of these is NOT a JavaScript data type?',
          options: ['String', 'Boolean', 'Character', 'Number'],
          correctAnswer: 'Character',
          explanation: 'JavaScript does not have a Character data type. Characters are represented as String with length 1.',
          difficulty: 'easy',
          category: 'coding',
          timeLimit: 60
        }
      );
      break;
      
    case 'employability':
      // Generate specific questions based on category if provided
      if (category) {
        // Map of category IDs to display names
        const categoryNames: Record<string, string> = {
          'core': 'Core Work Skills',
          'soft': 'Soft Skills',
          'professional': 'Professional Development',
          'communication': 'Communication Skills',
          'teamwork': 'Teamwork & Collaboration',
          'leadership': 'Leadership Potential',
          'problem_solving': 'Problem Solving',
          'domain': 'Domain Knowledge'
        };
        
        const categoryName = categoryNames[category] || 'Employability';
        
        for (let i = 0; i < 5; i++) {
          questions.push({
            id: `${category}-${i+1}`,
            type: 'mcq',
            question: `Sample ${categoryName} question ${i+1}`,
            options: [
              `${categoryName} Option A`,
              `${categoryName} Option B`,
              `${categoryName} Option C`,
              `${categoryName} Option D`
            ],
            correctAnswer: `${categoryName} Option B`,
            explanation: `This is the explanation for ${categoryName} question ${i+1}.`,
            difficulty: 'medium',
            category: category,
            categoryName: categoryName,
            timeLimit: 60
          });
        }
      } else {
        // General employability questions if no specific category
        questions.push(
          {
            id: 'emp-1',
            type: 'mcq',
            question: 'A team member consistently misses deadlines. The best approach would be:',
            options: [
              'Immediately report them to management',
              'Privately discuss the issue and offer assistance',
              'Take over their work to ensure it gets done',
              'Ignore the issue as it\'s not your responsibility'
            ],
            correctAnswer: 'Privately discuss the issue and offer assistance',
            explanation: 'Addressing issues directly but privately demonstrates emotional intelligence and gives the person an opportunity to improve.',
            difficulty: 'medium',
            category: 'soft',
            categoryName: 'Soft Skills',
            timeLimit: 60
          },
          {
            id: 'emp-2',
            type: 'mcq',
            question: 'When receiving critical feedback on your work, the most professional response is:',
            options: [
              'Defend your decisions firmly',
              'Listen attentively, ask questions, and thank them for the feedback',
              'Immediately promise to make all suggested changes',
              'Explain why their criticism is misguided'
            ],
            correctAnswer: 'Listen attentively, ask questions, and thank them for the feedback',
            explanation: 'Being receptive to feedback demonstrates professionalism and a growth mindset.',
            difficulty: 'medium',
            category: 'professional',
            categoryName: 'Professional Development',
            timeLimit: 60
          }
        );
      }
      break;
  }
  
  // Generate additional mock questions to reach the desired count
  const mockQuestionTypes: Record<QuestionType, string[]> = {
    'aptitude': ['logical', 'numerical', 'pattern', 'problem-solving'],
    'programming': ['algorithms', 'data-structures', 'coding', 'languages', 'design'],
    'employability': ['soft', 'core', 'professional', 'communication']
  };
  
  // Get the appropriate question types for this category
  const questionTypes = mockQuestionTypes[type] || ['general'];
  
  while (questions.length < count) {
    const i: number = questions.length;
    const mockCategory: string = questionTypes[i % questionTypes.length];
    
    questions.push({
      id: `${type}-${mockCategory}-${i+1}`,
      type: 'mcq',
      question: `Sample ${type} question ${i+1} for category ${mockCategory}`,
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option B',
      explanation: `This is a sample explanation for question ${i+1}.`,
      difficulty: 'medium',
      category: mockCategory,
      timeLimit: 60
    });
  }
  
  return questions;
} 