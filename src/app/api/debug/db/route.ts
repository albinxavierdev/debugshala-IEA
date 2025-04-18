import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    console.log('Debug: Checking Supabase connection and tables');
    
    // Test basic connection
    const { data: connectionTest, error: connectionError } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    // Try listing tables by querying catalog
    const { data: tableList, error: tableError } = await supabase.rpc(
      'exec_sql',
      { 
        sql: `SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'` 
      }
    );
    
    // Test users table with a direct query
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('*')
      .limit(5);
    
    // Test assessment_results table with a direct query
    const { data: resultsData, error: resultsError } = await supabase
      .from('assessment_results')
      .select('*')
      .limit(5);
      
    // Check for missing tables based on codes 
    let missingTables = [];
    if (usersError?.code === '42P01') {
      missingTables.push('users');
    }
    if (resultsError?.code === '42P01') {
      missingTables.push('assessment_results');
    }
    
    // Create test user in a try-catch block to handle potential schema mismatch
    let testUser = null;
    let testUserError = null;
    
    try {
      // Create a test user with fields matching schema in code
      const { data, error } = await supabase
        .from('users')
        .insert({
          name: 'Test User',
          email: `test-${Date.now()}@example.com`,
          phone: '1234567890',
          degree: 'Computer Science',
          graduation_year: '2023',
          college_name: 'Test University',
          interested_domains: ['Web Development', 'AI']
        })
        .select();
      
      testUser = data;
      testUserError = error;
    } catch (err) {
      testUserError = err;
      
      // Try alternate schema from schema.sql
      try {
        const { data, error } = await supabase
          .from('users')
          .insert({
            full_name: 'Test User (alt)',
            email: `test-alt-${Date.now()}@example.com`,
            phone: '1234567890',
            college: 'Test University',
            graduation_year: '2023'
          })
          .select();
        
        testUser = data;
        if (error) {
          testUserError = { 
            original: testUserError, 
            altSchema: error 
          };
        } else {
          testUserError = { 
            original: testUserError, 
            altSchema: 'Success with alternate schema' 
          };
        }
      } catch (altErr) {
        testUserError = { 
          original: testUserError, 
          altSchema: altErr 
        };
      }
    }
    
    return NextResponse.json({
      connection: {
        success: !connectionError,
        error: connectionError,
        data: connectionTest
      },
      tables: {
        list: tableList || "Failed to retrieve table list",
        error: tableError
      },
      data: {
        users: usersData || [],
        usersError,
        results: resultsData || [],
        resultsError
      },
      testInsert: {
        success: !!testUser && testUser.length > 0,
        data: testUser,
        error: testUserError
      },
      missingTables,
      diagnosis: {
        connectionIssue: !!connectionError,
        tablesExist: !tableError && (tableList || []).length > 0,
        usersTableMissing: usersError?.code === '42P01',
        resultsTableMissing: resultsError?.code === '42P01',
        schemaMismatch: testUserError?.code === '42703', // Column doesn't exist
        possibleSolutions: [
          missingTables.length > 0 ? 'Create missing tables using schema.sql' : null,
          testUserError?.code === '42703' ? 'Schema mismatch between code and database' : null,
          connectionError ? 'Check Supabase credentials in .env.local' : null
        ].filter(Boolean)
      },
      environment: {
        supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set (masked)' : 'Missing',
        supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set (masked)' : 'Missing',
        appUrl: process.env.NEXT_PUBLIC_APP_URL || 'Not set'
      }
    });
  } catch (error) {
    console.error('Error checking database:', error);
    return NextResponse.json(
      { 
        error: 'Failed to check database', 
        details: error,
        suggestion: 'There might be a connection issue with Supabase or the database has not been initialized.'
      },
      { status: 500 }
    );
  }
} 