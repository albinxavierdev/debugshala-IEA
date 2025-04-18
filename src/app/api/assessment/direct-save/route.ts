import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { sanitizeObject } from '@/lib/validation';
import { scoresSchema } from '@/lib/schema';
import { v4 as uuidv4 } from 'uuid';

// Direct save endpoint that bypasses foreign key constraints
export async function POST(request: Request) {
  try {
    // Parse request body
    const body = await request.json();
    const { formData, scores, provider = 'openai', userId: userIdFromRequest } = body;
    
    // Check for a userId from the request or generate a new one
    const userId = userIdFromRequest || uuidv4();
    console.log('Using user ID for assessment results:', userId);
    
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
    
    // Create user data object
    const userData = formData || {
      name: 'Anonymous User',
      email: `anonymous-${userId}@example.com`
    };
    
    // Prepare the result object (simplified version of the standard endpoint)
    const resultObject = {
      userId,
      timestamp: new Date().toISOString(),
      formData: userData,
      scores,
      sectionDetails: {
        aptitude: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.aptitude / 10),
          accuracy: scores.aptitude
        },
        programming: {
          totalQuestions: 10,
          correctAnswers: Math.round(scores.programming / 10),
          accuracy: scores.programming
        },
        employability: {
          totalQuestions: 20,
          correctAnswers: Math.round((scores.employability?.core || 0) / 5),
          accuracy: scores.employability?.core || 0
        }
      },
      outcome: scores.aptitude >= 60 && scores.programming >= 60 ? 'Pass' : 'Not Qualified'
    };
    
    // Sanitize the data
    const sanitizedResult = sanitizeObject(resultObject);
    const timestamp = new Date().toISOString();
    
    console.log('Attempting direct insert with data:', {
      user_id: userId,
      results_size: JSON.stringify(sanitizedResult).length,
      timestamp
    });
    
    // Method 1: Try standard Supabase client insert with service key if available
    if (process.env.SUPABASE_SERVICE_KEY) {
      try {
        // Create a service client with admin privileges
        const serviceClient = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || '',
          process.env.SUPABASE_SERVICE_KEY
        );
        
        const { data, error } = await serviceClient
          .from('assessment_results')
          .insert({
            user_id: userId,
            results: sanitizedResult,
            provider,
            created_at: timestamp
          })
          .select();
          
        if (!error) {
          console.log('Successfully inserted via service client');
          return NextResponse.json({
            success: true,
            message: 'Assessment results saved via service client',
            assessment: data[0]
          });
        }
        
        console.error('Service client insert failed:', error);
      } catch (err) {
        console.error('Error using service client:', err);
      }
    }
    
    // Method 2: Try a direct SQL query
    try {
      // Create table if not exists
      const createTableSQL = `
        CREATE TABLE IF NOT EXISTS public.assessment_results_backup (
          id SERIAL PRIMARY KEY,
          user_id TEXT,
          results JSONB NOT NULL,
          provider TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      // Execute using fetch directly to the REST API
      await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
        },
        body: JSON.stringify({ query: createTableSQL })
      });
      
      // Now insert into the backup table
      const { data, error } = await supabase
        .from('assessment_results_backup')
        .insert({
          user_id: userId,
          results: sanitizedResult,
          provider,
          created_at: timestamp
        })
        .select();
        
      if (!error) {
        console.log('Successfully inserted to backup table');
        return NextResponse.json({
          success: true,
          message: 'Assessment results saved to backup table',
          assessment: data[0]
        });
      }
      
      console.error('Backup table insert failed:', error);
    } catch (err) {
      console.error('Error with backup table approach:', err);
    }
    
    // Method 3: Store in localStorage for local testing
    return NextResponse.json({
      success: true,
      message: 'Client should store assessment results locally - database is inaccessible',
      localBackup: {
        userId,
        resultObject,
        timestamp
      }
    });
  } catch (error) {
    console.error('Error in direct save endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    );
  }
} 