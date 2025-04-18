import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    // 1. Try to save a test assessment result
    const testData = {
      user_id: '00000000-0000-0000-0000-000000000000', // Our test user
      results: {
        userId: '00000000-0000-0000-0000-000000000000',
        timestamp: new Date().toISOString(),
        formData: {
          name: 'Test User',
          email: 'test@example.com',
        },
        scores: {
          aptitude: 85,
          programming: 78,
          employability: {
            core: 82,
            soft: 79,
            professional: 75
          },
          total: 80
        }
      },
      provider: 'test_api',
      created_at: new Date().toISOString()
    };
    
    // Save to the assessment_results table
    const { data: insertData, error: insertError } = await supabase
      .from('assessment_results')
      .insert(testData)
      .select();
      
    // Try saving to the backup table too
    const { data: backupData, error: backupError } = await supabase
      .from('assessment_results_backup')
      .insert(testData)
      .select();
    
    // 2. Try to retrieve the latest assessment results
    const { data: retrieveData, error: retrieveError } = await supabase
      .from('assessment_results')
      .select('*')
      .eq('user_id', '00000000-0000-0000-0000-000000000000')
      .order('created_at', { ascending: false })
      .limit(5);
    
    // 3. Check database tables and structure
    const { data: tableUsers, error: errorUsers } = await supabase
      .from('users')
      .select('count');
      
    const { data: tableResults, error: errorResults } = await supabase
      .from('assessment_results')
      .select('count');
      
    const { data: tableBackup, error: errorBackup } = await supabase
      .from('assessment_results_backup')
      .select('count');
    
    return NextResponse.json({
      success: true,
      insertion: {
        regular: {
          success: !insertError,
          data: insertData,
          error: insertError
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
        error: retrieveError,
        count: retrieveData ? retrieveData.length : 0
      },
      tables: {
        users: {
          exists: !errorUsers,
          count: tableUsers ? tableUsers[0]?.count : 0,
          error: errorUsers
        },
        assessment_results: {
          exists: !errorResults,
          count: tableResults ? tableResults[0]?.count : 0,
          error: errorResults
        },
        assessment_results_backup: {
          exists: !errorBackup,
          count: tableBackup ? tableBackup[0]?.count : 0,
          error: errorBackup
        }
      }
    });
  } catch (error) {
    console.error('Test save error:', error);
    return NextResponse.json(
      { error: 'Test save error', details: error },
      { status: 500 }
    );
  }
} 