import { NextResponse } from 'next/server';
import { generatePersonalizedQuestions } from '@/lib/openai';
import { FormData, Question, SectionType } from '@/types/assessment';
import { promptLayer } from '@/lib/prompt-layer';
import { EmployabilityCategory } from '@/lib/openai';
import { saveQuestionsToCache, loadQuestionsFromCache } from '@/lib/question-cache';
import { LRUCache } from 'lru-cache';

// Configuration with environment variable support
const CONFIG = {
  MEMORY_CACHE_TTL: process.env.MEMORY_CACHE_TTL ? 
    parseInt(process.env.MEMORY_CACHE_TTL) : 10 * 60 * 1000, // 10 minutes default
  MEMORY_CACHE_MAX_ITEMS: process.env.MEMORY_CACHE_MAX_ITEMS ? 
    parseInt(process.env.MEMORY_CACHE_MAX_ITEMS) : 100, // Max 100 items in memory
  API_TIMEOUT: process.env.API_TIMEOUT ? 
    parseInt(process.env.API_TIMEOUT) : 60000, // 60 seconds default
  MAX_RETRIES: process.env.MAX_RETRIES ? 
    parseInt(process.env.MAX_RETRIES) : 2 // Max retries for API calls
};

// Use LRUCache for memory caching with automatic TTL expiration
const questionCache = new LRUCache<string, {
  questions: Question[],
  timestamp: number,
  isPersonalized: boolean
}>({
  max: CONFIG.MEMORY_CACHE_MAX_ITEMS,
  ttl: CONFIG.MEMORY_CACHE_TTL,
  updateAgeOnGet: true // Reset TTL when cache entry is accessed
});

// Map to track pending requests and prevent duplicates
const pendingRequests = new Map<string, Promise<Question[]>>();

/**
 * Sanitizes inputs to prevent cache poisoning
 */
function sanitizeInput(input: string): string {
  return String(input).replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Generate a unique cache key with sanitized inputs
 */
function generateCacheKey(type: string, category: string = '', userId: string = ''): string {
  return `${sanitizeInput(type)}:${sanitizeInput(category)}:${sanitizeInput(userId)}`;
}

/**
 * Retry with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = CONFIG.MAX_RETRIES,
  baseDelayMs: number = 1000
): Promise<T> {
  let lastError: unknown;
  
  for (let retry = 0; retry <= maxRetries; retry++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;
      
      if (retry < maxRetries) {
        // Calculate delay using exponential backoff
        const delayMs = baseDelayMs * Math.pow(2, retry);
        console.log(`Retry ${retry + 1}/${maxRetries} after ${delayMs}ms`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }
  }
  
  throw lastError;
}

/**
 * Track and log request metrics
 */
const metrics = {
  totalRequests: 0,
  cacheHits: { memory: 0, file: 0 },
  cacheMisses: 0,
  errors: 0,
  
  logRequest(cacheType: 'memory' | 'file' | 'miss'): void {
    this.totalRequests++;
    if (cacheType === 'memory') this.cacheHits.memory++;
    else if (cacheType === 'file') this.cacheHits.file++;
    else this.cacheMisses++;
    
    // Log metrics periodically
    if (this.totalRequests % 100 === 0) {
      console.log(`[METRICS] Requests: ${this.totalRequests}, ` +
        `Cache Hits: ${this.cacheHits.memory + this.cacheHits.file} ` +
        `(Memory: ${this.cacheHits.memory}, File: ${this.cacheHits.file}), ` +
        `Misses: ${this.cacheMisses}, ` +
        `Hit Rate: ${((this.cacheHits.memory + this.cacheHits.file) / this.totalRequests * 100).toFixed(2)}%, ` +
        `Errors: ${this.errors}`
      );
    }
  },
  
  logError(): void {
    this.errors++;
  }
};

export async function POST(request: Request) {
  // Create a unique request ID for tracking
  const requestId = `req-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  let timeoutId: NodeJS.Timeout | null = null;
  
  try {
    // Set up API timeout - will be cleared in finally block
    timeoutId = setTimeout(() => {
      console.error(`[${requestId}] API route timeout after ${CONFIG.API_TIMEOUT / 1000} seconds`);
      metrics.logError();
    }, CONFIG.API_TIMEOUT);

    // Log when API is called for debugging purposes
    console.log(`[${requestId}] API route /api/questions/openai called at`, new Date().toISOString());
    
    let requestData;
    try {
      requestData = await request.json();
      console.log(`[${requestId}] Request payload received:`, JSON.stringify({
        type: requestData.type,
        category: requestData.category,
        userId: requestData.userId ? '[PRESENT]' : '[MISSING]',
        formData: requestData.formData ? '[PRESENT]' : '[MISSING]',
        realtime: requestData.realtime,
        bypassCache: requestData.bypassCache,
        skipStorage: requestData.skipStorage
      }));
    } catch (parseError: unknown) {
      console.error(`[${requestId}] Failed to parse request JSON:`, 
        parseError instanceof Error ? parseError.message : String(parseError));
      metrics.logError();
      return NextResponse.json(
        { error: 'Invalid JSON in request body', requestId },
        { status: 400 }
      );
    }
    
    const { 
      type, 
      category, 
      formData, 
      userId, 
      batchSize, 
      realtime = true,
      skipStorage = false,
      useOpenAI = true, // Default to true to always use OpenAI
      personalizationRequired = true, // Default to true to ensure personalization
      bypassCache = false // New parameter to force fresh question generation
    } = requestData;

    // Validate section type
    const validSectionTypes: SectionType[] = ['aptitude', 'programming', 'employability'];
    if (!type || !validSectionTypes.includes(type)) {
      console.error(`[${requestId}] Invalid question type: ${type}. Must be one of: ${validSectionTypes.join(', ')}`);
      metrics.logError();
      return NextResponse.json(
        { error: `Invalid question type: ${type}. Must be one of: ${validSectionTypes.join(', ')}`, requestId },
        { status: 400 }
      );
    }

    // Validate category for employability section
    if (type === 'employability' && category) {
      const validEmployabilityCategories = [
        'communication', 'teamwork', 'professional', 'problem_solving', 
        'core', 'soft', 'leadership', 'domain'
      ];
      
      if (!validEmployabilityCategories.includes(category)) {
        console.error(`[${requestId}] Invalid employability category: ${category}. Must be one of: ${validEmployabilityCategories.join(', ')}`);
        metrics.logError();
        return NextResponse.json(
          { error: `Invalid employability category: ${category}`, requestId },
          { status: 400 }
        );
      }
    }

    // Always use the standard batch size from promptLayer
    const standardBatchSize = promptLayer.getBatchSize();
    
    // Try to load from cache if not bypassing cache
    let questions: Question[] | null = null;
    let isFromFileCache = false;
    let isPersonalized = false;
    
    // Generate a consistent cache key
    const cacheKey = generateCacheKey(type, category || '', userId || '');
    
    if (!bypassCache) {
      // First check in-memory cache
      const cachedData = questionCache.get(cacheKey);
      
      if (cachedData && cachedData.questions?.length > 0) {
        console.log(`[${requestId}] Returning in-memory cached questions for ${type}:${category}`);
        metrics.logRequest('memory');
        
        return NextResponse.json({
          questions: cachedData.questions,
          isPersonalized: cachedData.isPersonalized,
          userId,
          provider: 'openai',
          real_time: realtime,
          timestamp: Date.now(),
          batch_size: standardBatchSize,
          cached: true,
          cacheSource: 'memory',
          requestId
        });
      }
      
      // Then try to load from file cache
      try {
        questions = await loadQuestionsFromCache(
          type as SectionType,
          category as EmployabilityCategory,
          userId
        );
        
        if (questions && questions.length > 0) {
          console.log(`[${requestId}] Using questions from file cache for ${type}:${category}`);
          isFromFileCache = true;
          isPersonalized = true; // Consider file-cached questions as personalized
          metrics.logRequest('file');
          
          // Update in-memory cache as well
          questionCache.set(cacheKey, {
            questions,
            timestamp: Date.now(),
            isPersonalized: true
          });
        }
      } catch (cacheError: unknown) {
        console.error(`[${requestId}] Error loading from file cache:`, 
          cacheError instanceof Error ? cacheError.message : String(cacheError));
        // Continue to generate questions if cache fails
      }
    }
    
    // If we have valid questions from cache, return them
    if (questions && questions.length > 0) {
      // Add metadata to questions
      const timestamp = Date.now();
      questions = questions.map((q, index) => ({
        ...q,
        id: q.id || `openai-${type}-${category || ''}-${index + 1}-${timestamp}`,
        generated_at: new Date().toISOString(),
        personalized: true
      }));
      
      return NextResponse.json({
        questions,
        isPersonalized: true,
        userId,
        provider: 'openai',
        real_time: realtime,
        timestamp: timestamp,
        batch_size: standardBatchSize,
        cached: true,
        cacheSource: 'file',
        requestId
      });
    }
    
    // Log cache miss
    metrics.logRequest('miss');
    
    // Check for a pending request for the same parameters to prevent duplicates
    if (pendingRequests.has(cacheKey)) {
      console.log(`[${requestId}] Reusing pending request for ${type}:${category}`);
      questions = await pendingRequests.get(cacheKey)!;
      
      if (questions && questions.length > 0) {
        return NextResponse.json({
          questions,
          isPersonalized: true,
          userId,
          provider: 'openai',
          real_time: realtime,
          timestamp: Date.now(),
          batch_size: standardBatchSize,
          cached: false,
          cacheSource: 'fresh',
          requestId
        });
      }
    }
    
    // Generate questions based on the specified type and optional parameters
    console.log(`[${requestId}] Generating questions for type: ${type}, category: ${category || 'none'} using OpenAI (batch size: ${standardBatchSize})`);
    
    // Log OpenAI configuration for debugging
    const apiKey = process.env.OPENAI_API_KEY || '';
    console.log(`[${requestId}] OpenAI API key check: ${apiKey ? 'Present' : 'Missing'}`);
    console.log(`[${requestId}] Skip storage mode: ${skipStorage ? 'Enabled' : 'Disabled'}`);
    
    // Verify API key is available
    if (!apiKey) {
      console.error(`[${requestId}] No OpenAI API key provided - cannot generate questions`);
      metrics.logError();
      return NextResponse.json(
        { error: 'OpenAI API key is required but not configured', requestId },
        { status: 500 }
      );
    }
    
    // Check if personalization is required but no form data is provided
    if (personalizationRequired && (!formData || Object.keys(formData).length === 0)) {
      console.error(`[${requestId}] Form data is required for personalization`);
      metrics.logError();
      return NextResponse.json(
        { error: 'Form data is required for question generation', requestId },
        { status: 400 }
      );
    }
    
    // Validate formData structure if present
    if (formData) {
      const requiredFields = ['name', 'email', 'interestedDomain'];
      const missingFields = requiredFields.filter(field => !formData[field]);
      
      if (missingFields.length > 0) {
        console.error(`[${requestId}] Form data is missing required fields: ${missingFields.join(', ')}`);
        metrics.logError();
        return NextResponse.json(
          { error: `Form data is missing required fields: ${missingFields.join(', ')}`, requestId },
          { status: 400 }
        );
      }
      
      // Enhanced logging to ensure we have all the necessary data
      console.log(`[${requestId}] User profile data: Name: ${formData.name}, Email: ${formData.email.slice(0, 3)}***@***, Degree: ${formData.degree || 'N/A'}, Interested domain: ${formData.interestedDomain || 'N/A'}`);
    }
    
    // Create the generation promise and register it in pendingRequests
    const generatePromise = (async () => {
      try {
        // Log start time for performance tracking
        const startTime = Date.now();
        
        // Use retry logic with exponential backoff
        questions = await retryWithBackoff(
          async () => generatePersonalizedQuestions(
            formData, 
            type as SectionType, 
            category as EmployabilityCategory,
            standardBatchSize
          ),
          CONFIG.MAX_RETRIES
        );
        
        // Log completion time for performance tracking
        const endTime = Date.now();
        console.log(`[${requestId}] OpenAI request completed in ${endTime - startTime}ms`);
        
        if (!questions || questions.length === 0) {
          console.error(`[${requestId}] OpenAI returned empty questions array`);
          throw new Error('OpenAI returned empty questions array');
        }
        
        console.log(`[${requestId}] Generated ${questions.length} personalized questions using OpenAI`);
        isPersonalized = true;
        
        // Save to file cache for future use
        if (!skipStorage) {
          await saveQuestionsToCache(
            questions,
            type as SectionType,
            category as EmployabilityCategory,
            userId
          );
        }
        
        // Cache the questions in memory
        questionCache.set(cacheKey, {
          questions,
          timestamp: Date.now(),
          isPersonalized: true
        });
        
        // Clone the questions array for safety
        return [...questions];
      } finally {
        // Clean up the pending request entry
        pendingRequests.delete(cacheKey);
      }
    })();
    
    // Register the pending request
    pendingRequests.set(cacheKey, generatePromise);
    
    // Wait for questions to be generated
    try {
      questions = await generatePromise;
    } catch (error: unknown) {
      console.error(`[${requestId}] Error generating personalized questions with OpenAI:`, 
        error instanceof Error ? error.message : String(error));
      console.error(`[${requestId}] Error details:`, 
        typeof error === 'object' ? JSON.stringify(error) : String(error));
      
      metrics.logError();
      
      // Check for specific error types for better error reporting
      let errorMessage = 'Failed to generate questions with OpenAI';
      let statusCode = 500;
      
      if (error instanceof Error) {
        errorMessage = error.message;
        
        // Handle specific error types
        if (errorMessage.includes('timeout') || errorMessage.includes('aborted')) {
          errorMessage = 'OpenAI request timed out. Please try again.';
          statusCode = 504; // Gateway Timeout
        } else if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
          errorMessage = 'OpenAI rate limit exceeded. Please try again later.';
          statusCode = 429; // Too Many Requests
        } else if (errorMessage.includes('API key')) {
          errorMessage = 'OpenAI API authentication failed. Please contact support.';
          statusCode = 500; // Internal Server Error
        }
      }
      
      return NextResponse.json(
        { 
          error: errorMessage,
          timestamp: Date.now(),
          requestId
        },
        { status: statusCode }
      );
    }
    
    // Ensure all questions have unique IDs with timestamps for real-time uniqueness
    const timestamp = Date.now();
    questions = questions.map((q, index) => ({
      ...q,
      id: q.id || `openai-${type}-${category || ''}-${index + 1}-${timestamp}`,
      generated_at: new Date().toISOString(),
      personalized: isPersonalized || isFromFileCache // Questions from cache are also considered personalized
    }));

    // Validate questions to ensure consistent structure
    if (questions && Array.isArray(questions)) {
      try {
        questions = promptLayer.validateQuestions(questions, type as SectionType, category as EmployabilityCategory);
        console.log(`[${requestId}] Validated ${questions.length} questions for section ${type}`);
      } catch (validationError: unknown) {
        console.error(`[${requestId}] Error validating questions:`, 
          validationError instanceof Error ? validationError.message : String(validationError));
        // Continue with unvalidated questions rather than failing completely
      }
    }
    
    // Filter questions by section type to ensure they match the requested section
    questions = questions.filter(q => {
      // For aptitude questions
      if (type === 'aptitude' && q.category) {
        return ['numerical', 'logical', 'pattern', 'problem-solving'].includes(q.category);
      }
      // For programming questions
      else if (type === 'programming' && q.category) {
        return ['algorithms', 'data structures', 'debugging', 'concepts'].includes(q.category);
      }
      // For employability questions
      else if (type === 'employability' && q.category) {
        return ['communication', 'teamwork', 'professional', 'problem_solving', 'core', 'soft', 'leadership', 'domain'].includes(q.category);
      }
      // Keep questions with missing categories (will be fixed by frontend)
      return true;
    });
    
    console.log(`[${requestId}] Returning ${questions.length} questions after filtering by section type`);

    return NextResponse.json({
      questions,
      isPersonalized: isPersonalized || isFromFileCache,
      userId,
      provider: 'openai',
      real_time: realtime,
      timestamp: timestamp,
      batch_size: standardBatchSize,
      cached: isFromFileCache,
      cacheSource: 'fresh',
      requestId
    });
  } catch (error: unknown) {
    console.error(`[${requestId}] Error in questions API route:`, 
      error instanceof Error ? error.message : String(error));
    console.error(`[${requestId}] Stack trace:`, 
      error instanceof Error ? error.stack : 'No stack trace available');
    
    metrics.logError();
    
    return NextResponse.json(
      { 
        error: `Failed to generate questions: ${error instanceof Error ? error.message : String(error)}`,
        timestamp: Date.now(),
        requestId
      },
      { status: 500 }
    );
  } finally {
    // Always clear the timeout to prevent memory leaks
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
} 