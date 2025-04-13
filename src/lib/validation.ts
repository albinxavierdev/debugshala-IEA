import { FormData } from '@/types/assessment';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Validates user form data before database operations
 * @param data The form data to validate
 * @throws ValidationError if data is invalid
 */
export function validateFormData(data: FormData): void {
  // Validate required fields
  if (!data.name || data.name.trim() === '') {
    throw new ValidationError('Name is required');
  }
  
  if (!data.email || data.email.trim() === '') {
    throw new ValidationError('Email is required');
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(data.email)) {
    throw new ValidationError('Invalid email format');
  }
  
  // Validate phone number if provided
  if (data.phone && data.phone.trim() !== '') {
    // Basic phone validation - allows various formats but requires at least 7 digits
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/;
    if (!phoneRegex.test(data.phone.replace(/\s/g, ''))) {
      throw new ValidationError('Invalid phone number format');
    }
  }
  
  // Validate interested domains
  if (!Array.isArray(data.interestedDomains) || data.interestedDomains.length === 0) {
    throw new ValidationError('At least one domain of interest is required');
  }
  
  // Additional validations can be added as needed
}

/**
 * Validates assessment scores before generating reports
 * @param scores The scores to validate
 * @throws ValidationError if scores are invalid
 */
export function validateScores(scores: any): void {
  if (!scores) {
    throw new ValidationError('Scores are required');
  }
  
  // Validate required score sections
  if (typeof scores.aptitude !== 'number' || scores.aptitude < 0 || scores.aptitude > 100) {
    throw new ValidationError('Valid aptitude score is required (0-100)');
  }
  
  if (typeof scores.programming !== 'number' || scores.programming < 0 || scores.programming > 100) {
    throw new ValidationError('Valid programming score is required (0-100)');
  }
  
  // Validate employability scores if present
  if (scores.employability) {
    if (typeof scores.employability !== 'object') {
      throw new ValidationError('Employability scores must be an object');
    }
    
    // Check each employability subcategory
    const requiredCategories = ['core', 'soft', 'professional'];
    for (const category of requiredCategories) {
      if (typeof scores.employability[category] !== 'number' || 
          scores.employability[category] < 0 || 
          scores.employability[category] > 100) {
        throw new ValidationError(`Valid ${category} score is required (0-100)`);
      }
    }
  }
}

/**
 * Enhanced sanitization function to protect against various injection attacks
 * @param input The input string to sanitize
 * @returns Sanitized string
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  
  return input
    // Remove script tags and content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    // Remove all HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove event handlers
    .replace(/on\w+="[^"]*"/gi, '')
    // Remove javascript: protocol
    .replace(/javascript:/gi, '')
    // Remove data: URLs
    .replace(/data:[^,]*,/gi, 'data:,')
    // Remove potentially dangerous attributes
    .replace(/\b(href|action|formaction|src|data|classid|codebase)\s*=\s*(['"])(.*?)\2/gi, '')
    // Remove Unicode control characters
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    // Remove excessive whitespace
    .replace(/\s+/g, ' ')
    // Normalize quotes
    .replace(/[""]/g, '"')
    // Remove SQL injection patterns
    .replace(/(\b)(OR|AND|SELECT|INSERT|UPDATE|DELETE|DROP|UNION|EXEC|DECLARE)(\b)/gi, (match) => match.toLowerCase())
    .trim();
}

/**
 * Sanitizes an array of strings
 * @param items Array of strings to sanitize
 * @returns Array of sanitized strings
 */
export function sanitizeArray(items: string[]): string[] {
  if (!Array.isArray(items)) return [];
  return items.map((item: string) => sanitizeInput(item)).filter(Boolean);
}

/**
 * Sanitizes all properties of an object recursively
 * @param obj Object to sanitize
 * @returns Sanitized object
 */
export function sanitizeObject<T extends Record<string, any>>(obj: T): T {
  if (!obj || typeof obj !== 'object') return obj;
  
  const result = {} as T;
  
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const value = obj[key];
      
      if (typeof value === 'string') {
        result[key] = sanitizeInput(value) as any;
      } else if (Array.isArray(value) && value.every(item => typeof item === 'string')) {
        result[key] = sanitizeArray(value) as any;
      } else if (value && typeof value === 'object') {
        result[key] = sanitizeObject(value);
      } else {
        result[key] = value;
      }
    }
  }
  
  return result;
} 