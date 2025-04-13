import { createClient } from '@supabase/supabase-js'

// Check if environment variables are defined
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Throw meaningful errors during initialization if credentials are missing
if (!supabaseUrl) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable')
  // In development, provide guidance; in production, fail gracefully
  if (process.env.NODE_ENV === 'development') {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required. Please add it to your .env.local file')
  }
}

if (!supabaseAnonKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable')
  if (process.env.NODE_ENV === 'development') {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required. Please add it to your .env.local file')
  }
}

// Create a single supabase client for interacting with your database
export const supabase = createClient(
  supabaseUrl || '', // Fallback for production to prevent crashes
  supabaseAnonKey || '' // Fallback for production to prevent crashes
) 