import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeObject } from '@/lib/validation';

export async function GET(request: Request) {
  try {
    // 1. Sample user and assessment data
    const userId = '00000000-0000-0000-0000-000000000000';
    const timestamp = new Date().toISOString();
    
    const formData = {
      name: 'Test Flow User',
      email: 'testflow@example.com',
      phone: '9876543210',
      degree: 'Computer Engineering',
      graduationYear: '2023',
      collegeName: 'Test College',
      interestedDomains: ['Web Development', 'Cloud Computing']
    };
    
    const scores = {
      aptitude: 82,
      programming: 77,
      employability: {
        core: 85,
        soft: 88,
        professional: 79,
        communication: 83,
        teamwork: 90,
        leadership: 76,
        problem_solving: 84,
        domain: 80
      },
      total: 82,
      percentile: 78,
      readinessScore: 80
    };
    
    // 2. Prepare the assessment result object (similar to what happens in the POST endpoint)
    const employabilityValues = Object.values(scores.employability);
    const employabilityAccuracy = employabilityValues.reduce((sum, val) => sum + val, 0) / employabilityValues.length;
    const employabilityCorrectAnswers = Math.round(employabilityAccuracy / 5);
    
    const resultObject = {
      userId,
      timestamp,
      formData,
      scores,
      sectionDetails: {
        aptitude: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.aptitude / 10),
          accuracy: scores.aptitude,
          strengths: ['Logical reasoning', 'Pattern recognition'],
          weakAreas: ['Data interpretation']
        },
        programming: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.programming / 10),
          accuracy: scores.programming,
          strengths: ['Algorithm design', 'Code debugging'],
          weakAreas: ['Time complexity analysis']
        },
        employability: {
          totalQuestions: 20,
          correctAnswers: employabilityCorrectAnswers,
          accuracy: employabilityAccuracy,
          softSkillsScore: scores.employability.soft,
          professionalSkillsScore: scores.employability.professional,
          aiLiteracyScore: 75,
          strengths: ['Teamwork', 'Communication'],
          weakAreas: ['Leadership']
        }
      },
      outcome: scores.aptitude >= 60 && scores.programming >= 60 ? 'Pass' : 'Not Qualified',
      skillReadinessLevel: 'Intermediate',
      recommendations: {
        skills: ['Advanced algorithms', 'System design'],
        courses: ['Data Structures', 'Design Patterns'],
        careerPaths: ['Full Stack Developer', 'Software Engineer'],
        nextAction: 'Proceed to Technical Test'
      },
      detailedAnalysis: {
        strengths: ['Problem solving', 'Team collaboration'],
        areasForImprovement: ['Algorithm optimization', 'System design'],
        skillGaps: ['Performance optimization', 'Advanced patterns'],
        industryComparison: {
          aptitude: 80,
          programming: 75,
          softSkills: 85,
          overallGap: 15
        }
      }
    };
    
    // 3. Sanitize the data
    const sanitizedResult = sanitizeObject(resultObject);
    
    // 4. Try different storage approaches
    
    // 4.1. Standard approach - via assessment_results table
    const { data: regularData, error: regularError } = await supabase
      .from('assessment_results')
      .insert({
        user_id: userId,
        results: sanitizedResult,
        provider: 'test_flow',
        created_at: timestamp
      })
      .select();
    
    // 4.2. Backup approach - via assessment_results_backup table
    const { data: backupData, error: backupError } = await supabase
      .from('assessment_results_backup')
      .insert({
        user_id: userId,
        results: sanitizedResult,
        provider: 'test_flow',
        created_at: timestamp
      })
      .select();
    
    // 5. Test retrieving the result
    const { data: retrieveData, error: retrieveError } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(1);
    
    // Return results of all operations
    return NextResponse.json({
      success: true,
      flowTest: {
        userId,
        timestamp,
        sanitizedResultSize: JSON.stringify(sanitizedResult).length
      },
      storage: {
        regular: {
          success: !regularError,
          data: regularData,
          error: regularError
        },
        backup: {
          success: !backupError,
          data: backupData,
          error: backupError
        }
      },
      retrieval: {
        success: !retrieveError,
        data: retrieveData,
        matches: retrieveData && retrieveData.length > 0 && 
                retrieveData[0].results.userId === userId
      }
    });
  } catch (error) {
    console.error('Test flow error:', error);
    return NextResponse.json(
      { error: 'Test flow error', details: error },
      { status: 500 }
    );
  }
} 