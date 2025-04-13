import { z } from 'zod';

// Form data schema with strong validation
export const formDataSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email format"),
  phone: z.string().regex(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/, "Invalid phone format").optional().nullable(),
  degree: z.string().max(100).optional().nullable(),
  graduationYear: z.string().regex(/^\d{4}$/, "Year must be in YYYY format").optional().nullable(),
  collegeName: z.string().max(150).optional().nullable(),
  interestedDomains: z.array(z.string()).min(1, "At least one domain is required"),
  preferredLanguage: z.string().optional().nullable(),
});

// Scores schema
export const scoresSchema = z.object({
  aptitude: z.number().min(0).max(100),
  programming: z.number().min(0).max(100),
  employability: z.union([
    z.number().min(0).max(100),
    z.object({
      core: z.number().min(0).max(100),
      soft: z.number().min(0).max(100),
      professional: z.number().min(0).max(100),
      communication: z.number().min(0).max(100).optional(),
      teamwork: z.number().min(0).max(100).optional(),
      leadership: z.number().min(0).max(100).optional(),
      problem_solving: z.number().min(0).max(100).optional(),
      domain: z.number().min(0).max(100).optional(),
    })
  ]),
  total: z.number().min(0).max(100).optional(),
  percentile: z.number().min(0).max(100).optional(),
  readinessScore: z.number().min(0).max(100).optional(),
});

// Question schema
export const questionSchema = z.object({
  id: z.string(),
  type: z.string(),
  question: z.string(),
  options: z.array(z.string()).optional(),
  correctAnswer: z.string().optional(),
  explanation: z.string().optional(),
  difficulty: z.string().optional(),
  category: z.string().optional(),
  categoryName: z.string().optional(),
  timeLimit: z.number().optional(),
});

// Question type and category
export const questionTypeSchema = z.enum(['aptitude', 'programming', 'employability']);
export const employabilityCategorySchema = z.enum(['core', 'soft', 'professional', 'communication', 'teamwork', 'leadership', 'problem_solving']);

// User schema for database operations
export const userSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional().nullable(),
  degree: z.string().optional().nullable(),
  graduation_year: z.string().optional().nullable(),
  college_name: z.string().optional().nullable(),
  interested_domains: z.array(z.string()),
  created_at: z.string().optional(),
  updated_at: z.string().optional(),
});

// For selective column queries
export const userSelectColumnsSchema = z.array(
  z.enum(['id', 'name', 'email', 'phone', 'degree', 'graduation_year', 'college_name', 'interested_domains', 'created_at', 'updated_at'])
); 