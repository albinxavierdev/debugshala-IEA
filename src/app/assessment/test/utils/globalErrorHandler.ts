import { errorHandler } from '@/lib/error-handler';

/**
 * Initialize global error handlers for assessment module
 * This catches unhandled errors across the assessment module
 */
export function setupGlobalErrorHandlers(): void {
  // Skip in test environment to avoid polluting test output
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  // Helper to check if an error is telemetry-related (avoid cascading errors)
  const isTelemetryError = (error: any, url?: string): boolean => {
    // Check the error message for telemetry keywords
    const errorMsg = error?.message || String(error);
    if (errorMsg.includes('telemetry') || 
        (url && url.includes('/api/telemetry'))) {
      return true;
    }
    // Check the stack trace for telemetry references
    const stack = error?.stack || '';
    return stack.includes('telemetry') || 
           stack.includes('sendTelemetryToServer') ||
           stack.includes('errorHandling.ts');
  };

  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    // Skip telemetry-related errors to prevent cascading issues
    if (isTelemetryError(event.reason)) {
      console.warn('Unhandled telemetry rejection (suppressed from global handler)');
      return;
    }
    
    // Skip AbortController errors which are expected in some scenarios
    if (event.reason instanceof DOMException && 
        (event.reason.name === 'AbortError' || event.reason.code === 20)) {
      console.log('Unhandled abort error (suppressed from global handler)');
      return;
    }

    // For all other errors, log to telemetry
    const errorMessage = `Unhandled Promise Rejection: ${event.reason?.message || 'Unknown promise rejection'}`;
    errorHandler.logError(errorMessage, {
      additionalInfo: { 
        source: 'globalErrorHandler',
        type: 'unhandledrejection',
        stack: event.reason?.stack || 'No stack trace available'
      }
    });
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    // Skip if the error is related to network resources
    if (event.filename && (
      event.filename.endsWith('.js') || 
      event.filename.endsWith('.css') ||
      event.filename.includes('chunk')
    )) {
      errorHandler.logError(`Resource Error: Failed to load resource: ${event.filename}`, {
        additionalInfo: { source: 'globalErrorHandler', type: 'resource' }
      });
      return;
    }

    // Skip telemetry-related errors to prevent cascading issues
    if (isTelemetryError(event.error)) {
      console.warn('Uncaught telemetry error (suppressed from global handler)');
      return;
    }

    // For regular errors, log full details
    errorHandler.logError(`Uncaught Error: ${event.message || 'Unknown error'}`, { 
      additionalInfo: {
        source: 'globalErrorHandler',
        type: 'uncaught',
        location: `${event.filename}:${event.lineno}:${event.colno}`,
        stack: event.error?.stack || 'No stack trace available'
      }
    });
  });

  // Enhance fetch to catch network errors
  const originalFetch = window.fetch;
  window.fetch = async function(input, init) {
    try {
      const response = await originalFetch(input, init);
      
      // Track failed requests (4xx/5xx)
      if (!response.ok) {
        // Skip monitoring telemetry endpoints to avoid cascading issues
        const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;
        if (url && url.includes('/api/telemetry')) {
          return response; // Don't log telemetry endpoint failures
        }
        
        // Log other API failures
        const statusText = response.statusText || `HTTP ${response.status}`;
        errorHandler.logError(`Fetch Error: Request failed: ${statusText}`, { 
          additionalInfo: {
            source: 'globalErrorHandler', 
            type: 'fetch',
            status: response.status,
            url: url || 'unknown' 
          }
        });
      }
      
      return response;
    } catch (error) {
      // Skip if the error is from a telemetry endpoint
      const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input?.url;
      if (isTelemetryError(error, url)) {
        console.warn('Fetch telemetry error (suppressed from global handler)');
        throw error; // Re-throw to maintain expected behavior
      }
      
      // Skip abort errors which are expected in many scenarios
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.log('Fetch aborted (suppressed from global handler)');
        throw error; // Re-throw to maintain expected behavior
      }

      // Log network errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown network error';
      errorHandler.logError(`Network Error: ${errorMessage}`, { 
        additionalInfo: {
          source: 'globalErrorHandler', 
          type: 'network',
          url: url || 'unknown',
          offline: typeof navigator !== 'undefined' ? !navigator.onLine : 'unknown',
          stack: error instanceof Error ? error.stack : 'No stack trace'
        }
      });
      
      throw error; // Re-throw to maintain expected behavior
    }
  };
}