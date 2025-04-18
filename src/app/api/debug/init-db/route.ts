import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Individual SQL statements from the schema
const schemaStatements = [
  // Enable UUID extension
  `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`,
  
  // Users table - modified to make it work without auth schema reference
  `CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT,
    email TEXT UNIQUE,
    phone TEXT,
    degree TEXT,
    graduation_year TEXT,
    college_name TEXT,
    interested_domains TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  // Question sets table - modified to make foreign key optional
  `CREATE TABLE IF NOT EXISTS public.question_sets (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    type TEXT NOT NULL,
    category TEXT,
    questions JSONB NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  // Assessment results table - modified to make foreign key optional
  `CREATE TABLE IF NOT EXISTS public.assessment_results (
    id SERIAL PRIMARY KEY,
    user_id UUID,
    results JSONB NOT NULL,
    provider TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
  );`,
  
  // Indexes
  `CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);`,
  `CREATE INDEX IF NOT EXISTS idx_question_sets_user_id ON public.question_sets(user_id);`,
  `CREATE INDEX IF NOT EXISTS idx_question_sets_type ON public.question_sets(type);`,
  `CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);`,
  
  // RLS
  `ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;`,
  
  // Anonymous access policy for assessment_results
  `CREATE POLICY IF NOT EXISTS "Allow anonymous assessment results" 
    ON public.assessment_results FOR INSERT 
    WITH CHECK (true);`,
    
  // Anonymous access policy for reading results
  `CREATE POLICY IF NOT EXISTS "Allow anonymous assessment results read" 
    ON public.assessment_results FOR SELECT 
    USING (true);`
];

export async function GET(request: Request) {
  try {
    console.log('Initializing database schema...');
    
    // Track results of each statement
    const results = [];
    
    // Execute each statement separately
    for (let i = 0; i < schemaStatements.length; i++) {
      const statement = schemaStatements[i];
      console.log(`Executing statement ${i+1}/${schemaStatements.length}`);
      
      try {
        // Try directly with the REST API
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
              'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''}`
            },
            body: JSON.stringify({ query: statement })
          }
        );
        
        const result = await response.json();
        results.push({ statement: i+1, success: true, result });
      } catch (err) {
        results.push({ statement: i+1, success: false, error: err });
        console.error(`Error executing statement ${i+1}:`, err);
      }
    }
    
    // Check if tables exist after initialization
    const { data: tableData, error: tableError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
      
    const { data: resultsData, error: resultsError } = await supabase
      .from('assessment_results')
      .select('count')
      .limit(1);
    
    // For testing: Try to insert a test record
    const testTimestamp = new Date().toISOString();
    const { data: testInsert, error: insertError } = await supabase
      .from('assessment_results')
      .insert({
        user_id: '00000000-0000-0000-0000-000000000000', // dummy UUID for testing
        results: { test: true, timestamp: testTimestamp },
        provider: 'test',
        created_at: testTimestamp
      })
      .select();
    
    return NextResponse.json({
      success: results.some(r => r.success),
      results,
      tablesExist: {
        users: !tableError,
        usersError: tableError,
        results: !resultsError,
        resultsError: resultsError
      },
      testInsert: {
        success: !!testInsert && testInsert.length > 0,
        data: testInsert,
        error: insertError
      }
    });
  } catch (error) {
    console.error('Error initializing database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database', 
        details: error 
      },
      { status: 500 }
    );
  }
} 