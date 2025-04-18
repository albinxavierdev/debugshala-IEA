import { AssessmentError } from "@/types/assessment";

/**
 * AssessmentErrorHandler class manages error handling and telemetry for the assessment module
 */
export class AssessmentErrorHandler {
  private sessionId: string;
  
  constructor() {
    this.sessionId = this.generateSessionId();
  }
  
  /**
   * Create a structured error object
   */
  createError(message: string, category: string, details: Record<string, any> = {}): AssessmentError {
    const error = new Error(message) as AssessmentError;
    error.name = 'AssessmentError';
    error.category = category;
    error.details = details;
    error.timestamp = new Date().toISOString();
    
    // Log the error
    this.logError(error);
    
    return error;
  }
  
  /**
   * Log an error to telemetry and console
   */
  logError(error: AssessmentError | Error): void {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    const isAssessmentError = 'category' in errorObj;
    
    // Prepare error data for logging
    const errorData = {
      message: errorObj.message,
      name: errorObj.name,
      stack: errorObj.stack,
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      ...(isAssessmentError ? {
        category: (errorObj as AssessmentError).category,
        details: (errorObj as AssessmentError).details
      } : {
        category: 'uncategorized',
        details: {}
      })
    };
    
    // Log to console
    console.error('[AssessmentError]', errorData);
    
    // Store in telemetry log
    this.logTelemetry('error', errorData);
  }
  
  /**
   * Log telemetry event
   */
  logTelemetry(event: string, data: Record<string, any> = {}): void {
    try {
      // Get existing telemetry log
      const storage = typeof window !== 'undefined' ? window.localStorage : null;
      if (!storage) return;
      
      const telemetryLog = JSON.parse(storage.getItem('assessmentTelemetry') || '[]');
      
      // Add new event
      telemetryLog.push({
        event,
        data,
        timestamp: new Date().toISOString(),
        sessionId: this.sessionId
      });
      
      // Keep only recent entries (max 100)
      if (telemetryLog.length > 100) {
        telemetryLog.splice(0, telemetryLog.length - 100);
      }
      
      // Save back to storage
      storage.setItem('assessmentTelemetry', JSON.stringify(telemetryLog));
      
      // Optionally send to server if online
      this.sendTelemetryToServer(event, data).catch(() => {
        // Ignore server send failures
      });
    } catch (error) {
      console.error('Failed to log telemetry:', error);
    }
  }
  
  /**
   * Send telemetry to server if online
   */
  private async sendTelemetryToServer(event: string, data: Record<string, any>): Promise<void> {
    // Skip telemetry if offline
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      return;
    }
    
    try {
      // Prepare payload - ensure it's valid JSON
      const payload = {
        event: event || 'unknown_event', 
        data: data || {},
        sessionId: this.sessionId || `fallback-${Date.now()}`,
        timestamp: new Date().toISOString()
      };
      
      // Use AbortController for timeout with proper error handling
      const controller = new AbortController();
      let timeoutId: NodeJS.Timeout | null = null;
      
      // Set a shorter timeout for telemetry to avoid blocking important operations
      const TELEMETRY_TIMEOUT_MS = 1500; // 1.5 seconds max
      
      // Create an already resolved promise for the fetch operation
      const fetchPromiseWithTimeout = new Promise<Response | null>((resolve) => {
        // Set up timeout that will resolve with null on timeout
        timeoutId = setTimeout(() => {
          console.log('Telemetry request timed out, aborting');
          controller.abort('timeout');
          resolve(null); // Resolve with null to indicate timeout
        }, TELEMETRY_TIMEOUT_MS);
        
        // Start the fetch but don't await it here
        fetch('/api/telemetry', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Telemetry-Source': 'assessment-module' 
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          // Don't follow redirects
          redirect: 'error',
          // Add cache control
          cache: 'no-store'
        }).then(response => {
          // Clear timeout and resolve with the response
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          resolve(response);
        }).catch(error => {
          // Clear timeout and handle fetch errors
          if (timeoutId) {
            clearTimeout(timeoutId);
            timeoutId = null;
          }
          
          // Log the error if in development mode but don't reject
          if (process.env.NODE_ENV === 'development') {
            if (error instanceof DOMException && error.name === 'AbortError') {
              console.log('Telemetry request aborted (non-blocking)');
            } else {
              console.warn('Telemetry fetch failed (non-blocking):', 
                error instanceof Error ? error.message : 'Unknown error');
            }
          }
          
          resolve(null); // Resolve with null to indicate error
        });
      });
      
      // Wait for either successful response or timeout
      const response = await fetchPromiseWithTimeout;
      
      // Return early if we timed out or had an error (response is null)
      if (!response) {
        return;
      }
      
      // Check for successful response
      if (!response.ok) {
        console.warn(`Telemetry server returned ${response.status}`);
        return;
      }
      
      // Success - telemetry was sent
      if (process.env.NODE_ENV === 'development') {
        console.log(`Telemetry event '${event}' sent successfully`);
      }
    } catch (error) {
      // Catch-all protection - never break the app with telemetry
      if (process.env.NODE_ENV === 'development') {
        console.warn('Unexpected telemetry error (non-blocking):', 
          error instanceof Error ? error.message : 'Unknown error');
      }
    }
  }
  
  /**
   * Generate a unique session ID
   */
  private generateSessionId(): string {
    // Try to reuse existing session ID from storage
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (storage) {
      const existingId = storage.getItem('assessmentSessionId');
      if (existingId) return existingId;
      
      // Generate new ID if none exists
      const newId = Math.random().toString(36).substring(2, 15) + 
                   Math.random().toString(36).substring(2, 15);
      storage.setItem('assessmentSessionId', newId);
      return newId;
    }
    
    // Fallback for SSR
    return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  }
  
  /**
   * Implement exponential backoff for retrying operations
   */
  async withRetry<T>(
    operation: () => Promise<T>, 
    options: {
      maxRetries?: number;
      initialDelay?: number;
      maxDelay?: number;
      onRetry?: (attempt: number, error: Error) => void;
    } = {}
  ): Promise<T> {
    const { 
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 10000,
      onRetry = () => {}
    } = options;
    
    let retryCount = 0;
    let lastError: Error = new Error('Unknown error');
    
    while (retryCount <= maxRetries) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (retryCount === maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = Math.min(
          initialDelay * Math.pow(2, retryCount) + Math.random() * 1000,
          maxDelay
        );
        
        // Log retry attempt
        console.log(`Attempt ${retryCount + 1} failed. Retrying in ${delay}ms...`);
        
        // Notify caller
        onRetry(retryCount + 1, lastError);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
      }
    }
    
    // Log failure after all retries
    this.logError(
      this.createError(
        `Operation failed after ${maxRetries} retries: ${lastError.message}`,
        'retry-failed',
        { lastError, maxRetries }
      )
    );
    
    throw lastError;
  }
}

// Export singleton instance
export const errorHandler = new AssessmentErrorHandler(); 