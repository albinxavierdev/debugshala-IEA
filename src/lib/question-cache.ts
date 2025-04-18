import fs from 'fs';
import path from 'path';
import { Question, SectionType } from '@/types/assessment';
import { EmployabilityCategory } from './openai';
import pLimit from 'p-limit';

// Cache directory setup
const CACHE_DIR = path.join(process.cwd(), 'cache');

// Configuration with environment variable support
const CONFIG = {
  QUESTIONS_CACHE_EXPIRY: process.env.FILE_CACHE_TTL ? 
    parseInt(process.env.FILE_CACHE_TTL) : 24 * 60 * 60 * 1000, // 24 hours default
  IO_CONCURRENCY: process.env.CACHE_IO_CONCURRENCY ? 
    parseInt(process.env.CACHE_IO_CONCURRENCY) : 5 // Limit concurrent I/O operations
};

// Create I/O limiting queue to prevent event loop blocking
const ioLimit = pLimit(CONFIG.IO_CONCURRENCY);

// Ensure cache directory exists
try {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    console.log(`Created questions cache directory at ${CACHE_DIR}`);
  }
} catch (error: unknown) {
  console.error('Failed to create cache directory:', 
    error instanceof Error ? error.message : String(error));
}

// Interface for cache entry metadata
interface QuestionCacheEntry {
  sectionType: SectionType;
  category?: string;
  userId?: string;
  timestamp: number;
  questions: Question[];
  version: number; // Schema version for future compatibility
}

// Current cache schema version
const CACHE_SCHEMA_VERSION = 1;

/**
 * Sanitizes input strings to prevent cache poisoning attacks
 */
function sanitizeInput(input: string): string {
  return String(input).replace(/[^a-zA-Z0-9_-]/g, '');
}

/**
 * Generates a unique cache filename for the specific question request
 */
function getCacheFilename(sectionType: SectionType, category?: string, userId?: string): string {
  const safeSectionType = sanitizeInput(sectionType);
  const safeCategory = category ? sanitizeInput(category) : 'general';
  const safeUserPart = userId ? `-${sanitizeInput(userId).substring(0, 8)}` : '';
  
  return `questions-${safeSectionType}-${safeCategory}${safeUserPart}.json`;
}

/**
 * Validates that loaded questions match expected structure
 */
function validateQuestions(questions: any[]): boolean {
  if (!Array.isArray(questions) || questions.length === 0) {
    return false;
  }
  
  return questions.every(q => 
    q && 
    typeof q.id === 'string' && 
    typeof q.question === 'string' && 
    Array.isArray(q.options) &&
    q.options.length > 0 &&
    (typeof q.correctAnswer === 'string' || typeof q.correctAnswer === 'number')
  );
}

/**
 * Saves questions to a JSON cache file
 */
export async function saveQuestionsToCache(
  questions: Question[],
  sectionType: SectionType,
  category?: EmployabilityCategory,
  userId?: string
): Promise<boolean> {
  // Use queue to prevent too many concurrent file operations
  return ioLimit(async () => {
    try {
      // Validate input before saving
      if (!Array.isArray(questions) || questions.length === 0) {
        console.warn('Cannot save empty or invalid questions array to cache');
        return false;
      }
      
      const cacheFilename = getCacheFilename(sectionType, category, userId);
      const cachePath = path.join(CACHE_DIR, cacheFilename);
      
      const cacheEntry: QuestionCacheEntry = {
        sectionType,
        category,
        userId,
        timestamp: Date.now(),
        questions,
        version: CACHE_SCHEMA_VERSION
      };
      
      await fs.promises.writeFile(cachePath, JSON.stringify(cacheEntry, null, 2));
      console.log(`Saved ${questions.length} questions to cache: ${cacheFilename}`);
      return true;
    } catch (error: unknown) {
      console.error('Failed to save questions to cache:', 
        error instanceof Error ? error.message : String(error));
      return false;
    }
  });
}

/**
 * Loads questions from a JSON cache file if available and not expired
 */
export async function loadQuestionsFromCache(
  sectionType: SectionType,
  category?: EmployabilityCategory,
  userId?: string
): Promise<Question[] | null> {
  // Use queue to prevent too many concurrent file operations
  return ioLimit(async () => {
    try {
      const cacheFilename = getCacheFilename(sectionType, category, userId);
      const cachePath = path.join(CACHE_DIR, cacheFilename);
      
      // Check if cache file exists
      if (!fs.existsSync(cachePath)) {
        console.log(`No cache file found for ${sectionType}`);
        return null;
      }
      
      // Read and parse cache file
      const cacheData = await fs.promises.readFile(cachePath, 'utf-8');
      let cacheEntry: QuestionCacheEntry;
      
      try {
        cacheEntry = JSON.parse(cacheData);
      } catch (parseError) {
        console.error('Cache file contains invalid JSON, removing corrupted file');
        await fs.promises.unlink(cachePath);
        return null;
      }
      
      // Check schema version compatibility
      if (!cacheEntry.version || cacheEntry.version !== CACHE_SCHEMA_VERSION) {
        console.log(`Cache schema version mismatch, expected v${CACHE_SCHEMA_VERSION}, got v${cacheEntry.version || 'unknown'}`);
        return null;
      }
      
      // Check if cache is expired
      const cacheAge = Date.now() - cacheEntry.timestamp;
      if (cacheAge > CONFIG.QUESTIONS_CACHE_EXPIRY) {
        console.log(`Cache expired for ${sectionType}, age: ${Math.round(cacheAge / 1000 / 60)} minutes`);
        // Schedule async removal of expired file
        fs.promises.unlink(cachePath).catch(err => 
          console.error(`Failed to remove expired cache file: ${cacheFilename}`, err)
        );
        return null;
      }
      
      // Validate loaded questions
      if (!validateQuestions(cacheEntry.questions)) {
        console.warn(`Invalid question format in cache for ${sectionType}, removing corrupted cache`);
        await fs.promises.unlink(cachePath);
        return null;
      }
      
      console.log(`Loaded ${cacheEntry.questions.length} questions from cache for ${sectionType}`);
      return cacheEntry.questions;
    } catch (error: unknown) {
      console.error('Failed to load questions from cache:', 
        error instanceof Error ? error.message : String(error));
      return null;
    }
  });
}

/**
 * Clears expired caches from the cache directory
 */
export async function cleanupExpiredCaches(): Promise<void> {
  // Use queue to prevent too many concurrent file operations
  return ioLimit(async () => {
    try {
      const now = Date.now();
      
      // Get list of files in cache directory
      let files: string[];
      try {
        files = await fs.promises.readdir(CACHE_DIR);
      } catch (readDirError) {
        console.error('Failed to read cache directory:',
          readDirError instanceof Error ? readDirError.message : String(readDirError));
        return;
      }
      
      // Track metrics
      let expiredCount = 0;
      let corruptedCount = 0;
      
      // Process each cache file
      const cleanupPromises = files
        .filter(file => file.startsWith('questions-') && file.endsWith('.json'))
        .map(async (file) => {
          const filePath = path.join(CACHE_DIR, file);
          
          try {
            const data = await fs.promises.readFile(filePath, 'utf-8');
            let cacheEntry: QuestionCacheEntry;
            
            try {
              cacheEntry = JSON.parse(data);
            } catch (parseError) {
              // Remove corrupted JSON files
              await fs.promises.unlink(filePath);
              corruptedCount++;
              console.log(`Removed corrupted cache file: ${file}`);
              return;
            }
            
            // Check for expired cache files
            const cacheAge = now - cacheEntry.timestamp;
            if (cacheAge > CONFIG.QUESTIONS_CACHE_EXPIRY) {
              await fs.promises.unlink(filePath);
              expiredCount++;
              console.log(`Removed expired cache file: ${file}`);
            }
          } catch (fileError) {
            console.error(`Error processing cache file ${file}:`, 
              fileError instanceof Error ? fileError.message : String(fileError));
          }
        });
      
      // Wait for all cleanup operations to complete
      await Promise.all(cleanupPromises);
      
      if (expiredCount > 0 || corruptedCount > 0) {
        console.log(`Cache cleanup complete: Removed ${expiredCount} expired and ${corruptedCount} corrupted files`);
      }
    } catch (error: unknown) {
      console.error('Failed to cleanup expired caches:', 
        error instanceof Error ? error.message : String(error));
    }
  });
}

// Run cache cleanup when the module is loaded
cleanupExpiredCaches().catch(err => 
  console.error('Failed to run initial cache cleanup:', 
    err instanceof Error ? err.message : String(err))
); 