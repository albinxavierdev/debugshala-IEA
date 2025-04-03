import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { type, category } = await request.json();

    let prompt = '';
    switch (type) {
      case 'aptitude':
        prompt = `Generate 15 multiple choice aptitude and reasoning questions. Each question should test logical reasoning, numerical ability, and analytical skills.
        Format each question as a JSON object with the following structure:
        {
          "id": "unique_id",
          "type": "mcq",
          "question": "question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": "correct option",
          "explanation": "explanation of the answer",
          "difficulty": "easy|medium|hard"
        }
        Return the questions as a JSON array.`;
        break;
      case 'programming':
        prompt = `Generate 15 multiple choice programming questions covering fundamental concepts like data structures, algorithms, OOP, and basic programming concepts.
        Format each question as a JSON object with the following structure:
        {
          "id": "unique_id",
          "type": "mcq",
          "question": "question text",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": "correct option",
          "explanation": "explanation of the answer",
          "difficulty": "easy|medium|hard"
        }
        Return the questions as a JSON array.`;
        break;
      case 'coding':
        prompt = `Generate 2 coding problems that test problem-solving abilities. Include a mix of algorithm implementation and data structure manipulation.
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
        break;
      case 'employability':
        prompt = `Generate 5 scenario-based questions to assess employability skills in the category: ${category}.
        The questions should evaluate real-world problem-solving, communication, and professional judgment.
        Format each question as a JSON object with the following structure:
        {
          "id": "unique_id",
          "type": "mcq",
          "question": "scenario-based question",
          "options": ["option1", "option2", "option3", "option4"],
          "correctAnswer": "most appropriate option",
          "explanation": "explanation of why this is the best approach",
          "difficulty": "medium"
        }
        Return the questions as a JSON array.`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid question type' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      messages: [{ role: "user", content: prompt }],
      model: "gpt-3.5-turbo",
      response_format: { type: "json_object" }
    });

    const response = completion.choices[0].message.content;
    const questions = response ? JSON.parse(response).questions : [];

    return NextResponse.json({ questions });
  } catch (error) {
    console.error('Error generating questions:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    );
  }
} 