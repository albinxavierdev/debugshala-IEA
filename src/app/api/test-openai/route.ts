import { NextResponse } from 'next/server';
import { generateQuestionsBatch } from '@/lib/openai';

export async function GET() {
  try {
    // Simple test prompt to check if OpenAI API is working
    const testPrompt = `Generate 2 multiple choice questions about JavaScript. 
    Format each question as a JSON object with the following structure:
    {
      "id": "unique_id",
      "type": "mcq",
      "question": "question text",
      "options": ["option1", "option2", "option3", "option4"],
      "correctAnswer": "correct option",
      "explanation": "explanation of the answer",
      "difficulty": "easy|medium|hard",
      "timeLimit": 60
    }
    Return the questions as a JSON array.`;

    console.log('Testing OpenAI API with a simple prompt');
    const questions = await generateQuestionsBatch(testPrompt);
    
    return NextResponse.json({
      success: true,
      message: 'OpenAI API test successful',
      questions
    });
  } catch (error: any) {
    console.error('OpenAI API test failed:', error);
    
    return NextResponse.json({
      success: false,
      message: 'OpenAI API test failed',
      error: error.message
    }, { status: 500 });
  }
} 