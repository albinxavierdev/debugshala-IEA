-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table
CREATE TABLE public.users (
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

-- Create assessments table
CREATE TABLE public.assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.users(id),
    domain TEXT NOT NULL,
    questions JSONB NOT NULL,
    assessment_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create results table
CREATE TABLE public.results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES public.assessments(id),
    user_id UUID REFERENCES public.users(id),
    score INTEGER NOT NULL,
    analysis TEXT,
    strengths TEXT[],
    areas_for_improvement TEXT[],
    report_id TEXT NOT NULL,
    time_spent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create answers table
CREATE TABLE public.answers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assessment_id UUID REFERENCES public.assessments(id),
    user_id UUID REFERENCES public.users(id),
    question_id TEXT NOT NULL,
    selected_answer TEXT NOT NULL,
    is_correct BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Allow public insert" ON public.users
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual read" ON public.users
    FOR SELECT USING (true);

CREATE POLICY "Allow assessment creation" ON public.assessments
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual read assessment" ON public.assessments
    FOR SELECT USING (true);

CREATE POLICY "Allow result creation" ON public.results
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual read result" ON public.results
    FOR SELECT USING (true);

CREATE POLICY "Allow answer submission" ON public.answers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow individual read answer" ON public.answers
    FOR SELECT USING (true); 