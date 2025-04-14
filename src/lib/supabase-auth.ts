import { supabase } from '@/lib/supabase';
import { User, AuthResponse, AuthError } from '@supabase/supabase-js';

/**
 * Sign up a new user
 * @param email User's email
 * @param password User's password
 * @returns Authentication response
 */
export async function signUp(email: string, password: string): Promise<AuthResponse> {
  return supabase.auth.signUp({
    email,
    password,
  });
}

/**
 * Sign in a user with email and password
 * @param email User's email
 * @param password User's password
 * @returns Authentication response
 */
export async function signIn(email: string, password: string): Promise<AuthResponse> {
  return supabase.auth.signInWithPassword({
    email,
    password,
  });
}

/**
 * Sign out the current user
 * @returns Promise with void or error
 */
export async function signOut(): Promise<{ error: AuthError | null }> {
  return supabase.auth.signOut();
}

/**
 * Get the current user session
 * @returns Current session or null
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();
  return { session: data.session, error };
}

/**
 * Get the current user
 * @returns Current user or null
 */
export async function getCurrentUser(): Promise<User | null> {
  const { data } = await supabase.auth.getUser();
  return data?.user || null;
}

/**
 * Reset password for a user
 * @param email User's email
 * @returns Response with error if any
 */
export async function resetPassword(email: string) {
  return supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
}

/**
 * Update user's password
 * @param newPassword New password
 * @returns Response with error if any
 */
export async function updatePassword(newPassword: string) {
  return supabase.auth.updateUser({
    password: newPassword,
  });
}

/**
 * Set up an auth state change listener
 * @param callback Function to call when auth state changes
 * @returns Unsubscribe function
 */
export function onAuthStateChange(callback: (event: any, session: any) => void) {
  return supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });
} 