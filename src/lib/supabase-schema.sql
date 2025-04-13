-- Schema for DebugShala Assessment Platform
-- This file should be executed in the Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Update the users table to integrate with auth
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  degree TEXT,
  graduation_year TEXT,
  college_name TEXT,
  interested_domains TEXT[],
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Question sets table
CREATE TABLE IF NOT EXISTS public.question_sets (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT,
  questions JSONB NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Assessment results table
CREATE TABLE IF NOT EXISTS public.assessment_results (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  results JSONB NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_question_sets_user_id ON public.question_sets(user_id);
CREATE INDEX IF NOT EXISTS idx_question_sets_type ON public.question_sets(type);
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_id ON public.assessment_results(user_id);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
-- Only authenticated users can insert their own data
CREATE POLICY "Users can insert their own data" 
  ON public.users 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

-- Users can only select their own data
CREATE POLICY "Users can view their own data" 
  ON public.users 
  FOR SELECT 
  USING (auth.uid() = id);

-- Users can only update their own data
CREATE POLICY "Users can update their own data" 
  ON public.users 
  FOR UPDATE 
  USING (auth.uid() = id);

-- RLS Policies for question_sets table
-- Users can only insert their own question sets
CREATE POLICY "Users can insert their own question sets" 
  ON public.question_sets 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only view their own question sets
CREATE POLICY "Users can view their own question sets" 
  ON public.question_sets 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- RLS Policies for assessment_results table
-- Users can only insert their own assessment results
CREATE POLICY "Users can insert their own assessment results" 
  ON public.assessment_results 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Users can only view their own assessment results
CREATE POLICY "Users can view their own assessment results" 
  ON public.assessment_results 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create a trigger to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column(); 