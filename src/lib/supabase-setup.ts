import { supabase } from './supabase';

export async function verifySupabaseSetup() {
  try {
    // Test connection
    const { data: testData, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1);

    if (testError) {
      console.error('Error connecting to Supabase:', testError);
      return false;
    }

    console.log('Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('Error verifying Supabase setup:', error);
    return false;
  }
}

// Call this function when setting up your application
verifySupabaseSetup(); 