/**
 * Configuration options for retry mechanism
 */
export interface RetryOptions {
  /** Maximum number of retry attempts */
  maxRetries: number;
  
  /** Initial delay before the first retry (in milliseconds) */
  initialDelay: number;
  
  /** Whether to use exponential backoff for retry delays */
  useExponentialBackoff: boolean;
  
  /** 
   * Maximum delay between retries (in milliseconds) 
   * Only used with exponential backoff
   */
  maxDelay?: number;
  
  /**
   * Optional function to determine if an error is retryable
   * If not provided, all errors will be retried
   */
  isRetryable?: (error: any) => boolean;
  
  /**
   * Optional callback to execute before each retry
   * Useful for logging retry attempts
   */
  onRetry?: (error: any, attemptNumber: number) => void;
}

/**
 * Default retry options
 */
const defaultRetryOptions: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  useExponentialBackoff: true,
  maxDelay: 10000, // 10 seconds
  isRetryable: () => true, // Retry all errors by default
  onRetry: (error, attemptNumber) => {
    console.warn(`Retry attempt ${attemptNumber} after error:`, error);
  }
};

/**
 * Function to calculate delay using exponential backoff
 * Formula: min(initialDelay * (2 ^ attemptNumber), maxDelay)
 */
function calculateBackoffDelay(initialDelay: number, attemptNumber: number, maxDelay: number): number {
  const delay = initialDelay * Math.pow(2, attemptNumber);
  return Math.min(delay, maxDelay);
}

/**
 * Sleep for a specified number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Executes a function with retry capability for handling transient errors
 * 
 * @param fn The function to execute with retry capability
 * @param options Retry configuration options
 * @returns Promise resolving to the result of the function
 * @throws The last error encountered if all retries fail
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  // Merge provided options with defaults
  const retryOptions: RetryOptions = {
    ...defaultRetryOptions,
    ...options
  };
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryOptions.maxRetries; attempt++) {
    try {
      // Execute the function
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Check if we've used all retry attempts
      if (attempt >= retryOptions.maxRetries) {
        break;
      }
      
      // Check if the error is retryable
      if (retryOptions.isRetryable && !retryOptions.isRetryable(error)) {
        break;
      }
      
      // Execute onRetry callback if provided
      if (retryOptions.onRetry) {
        retryOptions.onRetry(error, attempt + 1);
      }
      
      // Calculate delay for next retry
      const delay = retryOptions.useExponentialBackoff
        ? calculateBackoffDelay(
            retryOptions.initialDelay,
            attempt,
            retryOptions.maxDelay || Number.MAX_SAFE_INTEGER
          )
        : retryOptions.initialDelay;
      
      // Wait before next retry
      await sleep(delay);
    }
  }
  
  // If we've reached here, all retries have failed
  throw lastError;
}

/**
 * Common retry patterns for database operations
 */
export const RetryPatterns = {
  /**
   * Retry pattern for database connection errors
   */
  DatabaseConnection: {
    maxRetries: 5,
    initialDelay: 500,
    useExponentialBackoff: true,
    maxDelay: 10000,
    isRetryable: (error: any) => {
      // Typical connection errors
      const connectionErrorCodes = ['ECONNREFUSED', 'ETIMEDOUT', 'PROTOCOL_CONNECTION_LOST'];
      return (
        connectionErrorCodes.includes(error.code) ||
        error.message?.includes('connection') ||
        error.statusText === 'timeout'
      );
    }
  },
  
  /**
   * Retry pattern for conflict errors (e.g., concurrent writes)
   */
  ConflictResolution: {
    maxRetries: 3,
    initialDelay: 200,
    useExponentialBackoff: true,
    isRetryable: (error: any) => {
      // Typical conflict error codes
      return error.code === '23505' || // Unique violation
             error.code === '40001' || // Serialization failure
             error.code === '409' ||   // HTTP Conflict
             error.statusCode === 409;
    }
  },
  
  /**
   * Retry pattern for rate limit errors
   */
  RateLimit: {
    maxRetries: 3,
    initialDelay: 2000,
    useExponentialBackoff: true,
    maxDelay: 30000,
    isRetryable: (error: any) => {
      // Rate limit error codes
      return error.code === '429' || // Too Many Requests
             error.statusCode === 429 ||
             error.message?.includes('rate limit');
    }
  }
}; 