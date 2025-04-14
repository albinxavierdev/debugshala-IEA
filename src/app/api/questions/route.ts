import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeObject } from '@/lib/validation';
import { questionTypeSchema, employabilityCategorySchema } from '@/lib/schema';
import { cache } from '@/lib/cache';
import { withRetry, RetryPatterns } from '@/lib/retry';
import { DataNormalizer, generateCacheKey } from '@/lib/normalize';

// Get questions from database with filters
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
    const type = url.searchParams.get('type');
    const category = url.searchParams.get('category');
    const limit = url.searchParams.get('limit') || '20';
    const realtime = url.searchParams.get('realtime') === 'true';
    
    // Generate cache key based on query parameters
    const cacheKey = generateCacheKey(
      'questions',
      authData.user.id,
      JSON.stringify({ type, category, limit })
    );
    
    // Try to get data from cache first
    const questionSets = await cache.getOrFetch(
      cacheKey,
      async () => {
        // Build query
        let query = supabase
          .from('question_sets')
          .select('*')
          .eq('user_id', authData.user.id)
          .order('created_at', { ascending: false });
        
        // Apply filters if provided
        if (type) {
          query = query.eq('type', type);
        }
        
        if (category) {
          query = query.eq('category', category);
        }
        
        // Execute query with limit and retry logic
        const { data, error } = await withRetry(
          async () => await query.limit(parseInt(limit)),
          RetryPatterns.DatabaseConnection
        );
        
        if (error) {
          console.error('Database error:', error);
          throw new Error('Failed to fetch questions');
        }
        
        return data;
      },
      { ttl: realtime ? 0 : 30 * 1000, realtime } // Use real-time option if requested
    );
    
    return NextResponse.json({ 
      question_sets: questionSets,
      count: questionSets.length,
      real_time: realtime
    });
  } catch (error) {
    console.error('Error in GET /api/questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}

// Save question set to database
export async function POST(request: Request) {
  try {
    // Check for fallback mode
    const url = new URL(request.url);
    const fallbackMode = url.searchParams.get('fallback') === 'true';
    
    // Parse request body
    const body = await request.json();
    const { type, category, questions, provider = 'openai', userId: userIdFromRequest } = body;
    
    // Check for a userId from the request or try to get an authenticated user
    let userId: string;
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (!authError && authData.user) {
      // If authenticated, use the authenticated user ID
      userId = authData.user.id;
    } else if (userIdFromRequest) {
      // For anonymous users, use the provided ID
      userId = userIdFromRequest;
      console.log('Using anonymous user ID for questions:', userId);
    } else {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    // Basic validation
    if (!type || !questions || !Array.isArray(questions)) {
      return NextResponse.json(
        { error: 'Invalid request: type and questions array are required' },
        { status: 400 }
      );
    }
    
    // Validate type
    try {
      questionTypeSchema.parse(type);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid question type' },
        { status: 400 }
      );
    }
    
    // Validate category if provided
    if (category && type === 'employability') {
      try {
        employabilityCategorySchema.parse(category);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid employability category' },
          { status: 400 }
        );
      }
    }
    
    // If in fallback mode, return success without database operations
    if (fallbackMode) {
      console.log('Fallback mode active, bypassing database operations for questions');
      return NextResponse.json({ 
        success: true, 
        question_set: {
          id: 'fallback-' + Date.now(),
          user_id: userId,
          type,
          category: category || null,
          questions: sanitizeObject(questions),
          provider,
          created_at: new Date().toISOString(),
          fallback_mode: true
        }
      });
    }
    
    // Sanitize and normalize input
    const sanitizedQuestions = sanitizeObject(questions);
    const normalizedData = DataNormalizer.normalizeQuestionSet({
      type,
      category: category || null,
      questions: sanitizedQuestions,
      provider
    });
    
    // Insert data into database with retry logic
    const { data, error } = await withRetry(
      async () => await supabase
        .from('question_sets')
        .insert({
          user_id: userId,
          ...normalizedData,
          created_at: new Date().toISOString(),
        })
        .select(),
      RetryPatterns.ConflictResolution
    );
    
    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to save questions' },
        { status: 500 }
      );
    }
    
    // Invalidate any question cache entries for this user
    cache.invalidateByPrefix(`questions:${userId}`);
    
    return NextResponse.json({ 
      success: true, 
      question_set: data[0]
    });
  } catch (error) {
    console.error('Error in POST /api/questions:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
} 