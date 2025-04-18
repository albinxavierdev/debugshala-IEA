import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sanitizeObject } from '@/lib/validation';
import { formDataSchema, userSchema } from '@/lib/schema';
import { ZodError } from 'zod';
import { cache } from '@/lib/cache';
import { withRetry, RetryPatterns } from '@/lib/retry';
import { DataNormalizer, generateCacheKey } from '@/lib/normalize';
import { isValidUUID } from '@/lib/uuid';

// Get current user data with selective column filtering
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
    
    // Get query parameters for column selection
    const url = new URL(request.url);
    const select = url.searchParams.get('select');
    
    // Parse and validate the selected columns
    const columns = select ? select.split(',') : undefined;
    
    // Generate a cache key based on user ID and selected columns
    const cacheKey = generateCacheKey('user', authData.user.id, select || 'full');
    
    // Try to get from cache first, or fetch from database with retry
    const userData = await cache.getOrFetch(
      cacheKey,
      async () => {
        return await withRetry(
          async () => {
            // Query database with selective columns
            const { data, error } = await supabase
              .from('users')
              .select(columns ? columns.join(',') : '*')
              .eq('id', authData.user.id)
              .single();
            
            if (error) {
              console.error('Database error:', error);
              throw error;
            }
            
            if (!data) {
              throw new Error('User not found');
            }
            
            return data;
          },
          RetryPatterns.DatabaseConnection
        );
      },
      { ttl: 5 * 60 * 1000 } // Cache for 5 minutes
    );
    
    return NextResponse.json({ user: userData });
  } catch (error: any) {
    console.error('Error in GET /api/users:', error);
    
    // Return appropriate error response based on error type
    if (error.message === 'User not found') {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Create or update user
export async function POST(request: Request) {
  try {
    // Parse request body
    const formData = await request.json();
    
    // Create a safe reference for error reporting
    const safeEmail = formData?.email || 'unknown';
    
    // Check if userId is provided in the request (for anonymous users)
    const userIdFromRequest = formData.userId;
    let userId;
    
    // Try to get authenticated user if available
    const { data: authData, error: authError } = await supabase.auth.getUser();
    
    if (!authError && authData.user) {
      // If authenticated, use the authenticated user ID
      userId = authData.user.id;
    } else if (userIdFromRequest) {
      // For anonymous users, use the provided ID after validation
      // Validate that the ID is in UUID format
      if (!isValidUUID(userIdFromRequest)) {
        return NextResponse.json(
          { error: 'Invalid user ID format. Must be a valid UUID.' },
          { status: 400 }
        );
      } else {
        userId = userIdFromRequest;
        console.log('Using anonymous user ID (validated UUID):', userId);
      }
    } else {
      // No user ID available
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }
    
    // Validate with Zod schema
    try {
      formDataSchema.parse(formData);
    } catch (validationError) {
      if (validationError instanceof ZodError) {
        return NextResponse.json(
          { error: 'Validation error', details: validationError.errors },
          { status: 400 }
        );
      }
      throw validationError;
    }
    
    // Sanitize input
    const sanitizedData = sanitizeObject(formData);
    
    // Normalize data to extract domains of interest
    const { baseUserData, interestedDomains } = DataNormalizer.normalizeUserData({
      ...sanitizedData,
      preferredLanguage: sanitizedData.preferredLanguage || null
    });
    
    // Prepare data for database
    const userData = {
      id: userId,
      name: baseUserData.name,
      email: baseUserData.email,
      phone: baseUserData.phone,
      degree: baseUserData.degree,
      graduation_year: baseUserData.graduationYear,
      college_name: baseUserData.collegeName,
      interested_domains: interestedDomains,
      updated_at: new Date().toISOString(),
    };
    
    // Insert or update user in database with retry
    const data = await withRetry(
      async () => {
        const { data, error } = await supabase
          .from('users')
          .upsert(userData)
          .select();
        
        if (error) {
          console.error('Database error during user upsert:', error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error('No data returned from upsert operation');
        }
        
        return data[0];
      },
      {
        ...RetryPatterns.ConflictResolution,
        onRetry: (error, attempt) => {
          console.warn(`Retry attempt ${attempt} for user update:`, error);
        }
      }
    );
    
    // Invalidate user cache
    cache.invalidateByPrefix(`user:${userId}`);
    
    return NextResponse.json({ 
      success: true,
      user: data
    });
  } catch (error: any) {
    console.error('Error in POST /api/users:', error);
    
    // Check for duplicate/unique constraint violation errors 
    // Supabase/PostgreSQL codes: 23505 for unique constraint violations
    let statusCode = 500;
    let errorMessage = 'Failed to save user data';
    let errorCode = error.code || 'UNKNOWN';
    
    // Determine specific error type for better client handling
    if (error.code === '23505' || 
        (error.message && error.message.toLowerCase().includes('duplicate key')) || 
        (error.message && error.message.toLowerCase().includes('unique constraint'))) {
      
      statusCode = 409; // Conflict status code
      errorMessage = 'Email already registered';
      errorCode = 'DUPLICATE_USER';
      
      // Try to extract which field caused the duplicate error
      if (error.detail) {
        if (error.detail.includes('email')) {
          errorMessage = 'This email is already registered with another account';
        } else if (error.detail.includes('phone')) {
          errorMessage = 'This phone number is already registered';
        }
      }
      
      console.warn('Duplicate user detected:', {
        errorDetail: error.detail
      });
    }
    
    return NextResponse.json(
      { 
        success: false,
        error: errorMessage,
        message: error.message || 'Internal server error',
        code: errorCode,
        field: errorCode === 'DUPLICATE_USER' ? 'email' : undefined
      },
      { status: statusCode }
    );
  }
} 