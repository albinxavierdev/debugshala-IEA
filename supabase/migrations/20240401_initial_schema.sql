-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table to store assessment form data
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    college TEXT NOT NULL,
    stream TEXT NOT NULL,
    graduation_year TEXT NOT NULL,
    selected_domain TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create reports table to store assessment results
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    score INTEGER NOT NULL,
    report_content JSONB NOT NULL, -- Stores the complete assessment report
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users table policies
CREATE POLICY "Enable read access for all users" ON public.users
    FOR SELECT USING (true);
    
CREATE POLICY "Enable insert access for all users" ON public.users
    FOR INSERT WITH CHECK (true);

-- Reports table policies
CREATE POLICY "Users can read their own reports" ON public.reports
    FOR SELECT USING (auth.uid() = user_id);
    
CREATE POLICY "Enable insert for reports" ON public.reports
    FOR INSERT WITH CHECK (true); 