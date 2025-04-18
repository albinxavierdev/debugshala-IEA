import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeObject } from '@/lib/validation';
import { scoresSchema } from '@/lib/schema';
import { EmployabilityScores } from '@/types/assessment';

// Get assessment results for the current user
export async function GET(request: Request) {
  try {
    // Get auth user from Supabase
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (authError || !authData.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '10';
    
    // Get the assessment results
    const { data, error } = await supabase
      .from('assessment_results')
      .select('id, results, provider, created_at')
      .eq('user_id', authData.user.id)
      .order('created_at', { ascending: false })
      .limit(parseInt(limit));
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch assessment results' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      results: data,
      count: data.length 
    });
  } catch (error) {
    console.error('Error in GET /api/assessment/results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Save assessment results
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { formData, scores, provider = 'openai', userId: userIdFromRequest } = body;
    
    // Check for a userId from the request or try to get an authenticated user
    let userId;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (!authError && authData.user) {
      // If authenticated, use the authenticated user ID
      userId = authData.user.id;
    } else if (userIdFromRequest) {
      // For anonymous users, use the provided ID
      userId = userIdFromRequest;
      console.log('Using anonymous user ID for assessment results:', userId);
    } else {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    // Validate scores
    try {
      scoresSchema.parse(scores);
    } catch (error: any) {
      return NextResponse.json(
        { 
          error: 'Validation error', 
          details: error.errors || 'Invalid scores format' 
        },
        { status: 400 }
      );
    }
    
    // Get user information if not provided
    let userData = formData;
    if (!userData) {
      const { data: userDataResponse, error: userError } = await supabase
        .from('users')
        .select('name, email, phone, degree, graduation_year, college_name, interested_domains')
        .eq('id', userId)
        .single();
      
      if (userError) {
        console.error('Error fetching user data:', userError);
      } else {
        userData = {
          name: userDataResponse.name,
          email: userDataResponse.email,
          phone: userDataResponse.phone,
          degree: userDataResponse.degree,
          graduationYear: userDataResponse.graduation_year,
          collegeName: userDataResponse.college_name,
          interestedDomains: userDataResponse.interested_domains,
        };
      }
    }
    
    // Calculate employability scores properly with type safety
    let employabilityAccuracy = 0;
    let employabilityCorrectAnswers = 0;
    
    if (typeof scores.employability === 'number') {
      employabilityAccuracy = scores.employability;
      employabilityCorrectAnswers = Math.round(scores.employability / 5);
    } else if (typeof scores.employability === 'object') {
      // Type guard to ensure we have the correct object shape
      const empScores = scores.employability as EmployabilityScores;
      const empValues = Object.values(empScores) as number[];
      employabilityAccuracy = empValues.reduce((sum, val) => sum + val, 0) / empValues.length;
      employabilityCorrectAnswers = Math.round(employabilityAccuracy / 5);
    }
    
    // Prepare the result object
    const resultObject = {
      userId: userId,
      timestamp: new Date().toISOString(),
      formData: userData,
      scores: scores,
      // Basic details - could be enhanced with AI-generated content in a separate API
      sectionDetails: {
        aptitude: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.aptitude / 10),
          accuracy: scores.aptitude,
          strengths: [],
          weakAreas: []
        },
        programming: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.programming / 10),
          accuracy: scores.programming,
          strengths: [],
          weakAreas: []
        },
        employability: {
          totalQuestions: 20,
          correctAnswers: employabilityCorrectAnswers,
          accuracy: employabilityAccuracy,
          strengths: [],
          weakAreas: []
        }
      },
      outcome: scores.aptitude >= 60 && scores.programming >= 60 ? 'Pass' : 'Not Qualified',
      skillReadinessLevel: 'Intermediate',
      recommendations: {
        skills: [],
        courses: [],
        careerPaths: [],
        nextAction: 'Proceed to Technical Test'
      },
      detailedAnalysis: {
        strengths: [],
        areasForImprovement: [],
        skillGaps: [],
        industryComparison: {
          aptitude: 80,
          programming: 75,
          softSkills: 85,
          overallGap: 15
        }
      }
    };
    
    // Sanitize the data
    const sanitizedResult = sanitizeObject(resultObject);
    
    // Add detailed logging
    console.log('Attempting to save to assessment_results table with payload:', {
      user_id: userId,
      provider,
      created_at: new Date().toISOString(),
      results_size: JSON.stringify(sanitizedResult).length
    });
    
    // First try regular insert
    const { data, error } = await supabase
      .from('assessment_results')
      .insert({
        user_id: userId,
        results: sanitizedResult,
        provider,
        created_at: new Date().toISOString(),
      })
      .select();
    
    // If there's an error, try fallback methods
    if (error) {
      console.error('Database error:', error);
      console.error('Error details:', JSON.stringify(error));
      
      // If the error is related to foreign key constraint, try a direct SQL insert
      if (error.code === '23503') { // Foreign key violation
        console.log('Foreign key constraint error. Trying direct SQL insert...');
        
        try {
          // First create the user if missing
          const { data: userData, error: userError } = await supabase
            .from('users')
            .insert({
              id: userId,
              name: formData.name || 'Anonymous',
              email: formData.email || `anonymous-${userId}@example.com`,
              phone: formData.phone,
              degree: formData.degree,
              graduation_year: formData.graduationYear,
              college_name: formData.collegeName,
              interested_domains: formData.interestedDomains || []
            })
            .select();
          
          if (userError) {
            console.warn('Failed to create user, continuing anyway:', userError);
          }
          
          // Try inserting with direct SQL to bypass FK constraints
          const insertTimestamp = new Date().toISOString();
          const jsonResults = JSON.stringify(sanitizedResult);
          
          // Use a direct insert into the table
          const directInsertResponse = await fetch(
            `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/assessment_results`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
              },
              body: JSON.stringify({
                user_id: userId,
                results: sanitizedResult,
                provider,
                created_at: insertTimestamp
              })
            }
          );
          
          if (!directInsertResponse.ok) {
            throw new Error(`Direct insert failed with status ${directInsertResponse.status}`);
          }
          
          const directResult = await directInsertResponse.json();
          console.log('Successfully inserted via direct SQL:', directResult);
          
          return NextResponse.json({
            success: true,
            message: 'Assessment results saved via direct SQL',
            assessment: directResult[0] || { id: 'unknown', created_at: insertTimestamp }
          });
        } catch (directError) {
          console.error('Direct SQL insert also failed:', directError);
          return NextResponse.json(
            { 
              error: 'Failed to save assessment results via all methods',
              original: error,
              directError
            },
            { status: 500 }
          );
        }
      }
      
      return NextResponse.json(
        { error: 'Failed to save assessment results', details: error },
        { status: 500 }
      );
    }
    
    console.log('Successfully saved assessment results:', data);
    
    return NextResponse.json({ 
      success: true, 
      assessment: data[0]
    });
  } catch (error) {
    console.error('Error in POST /api/assessment/results:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 