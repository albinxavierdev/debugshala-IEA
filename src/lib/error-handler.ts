import { toast } from "@/components/ui/use-toast";

export enum ErrorLevel {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  CRITICAL = 'critical'
}

interface ErrorOptions {
  title?: string;
  level?: ErrorLevel;
  retryAction?: () => void;
  errorId?: string;
  additionalInfo?: Record<string, any>;
}

/**
 * Application error handler that provides consistent error reporting
 * with different notification methods based on context
 */
class ErrorHandler {
  /**
   * Display a toast notification for an error
   */
  showErrorToast(message: string, options?: ErrorOptions): void {
    const title = options?.title || this.getDefaultTitleForLevel(options?.level || ErrorLevel.ERROR);
    
    toast({
      title,
      description: message,
      variant: this.getVariantForLevel(options?.level || ErrorLevel.ERROR),
      duration: this.getDurationForLevel(options?.level || ErrorLevel.ERROR),
      action: options?.retryAction ? {
        label: "Retry",
        onClick: () => {
          if (options.retryAction) options.retryAction();
        }
      } : undefined
    });
    
    // Log error for tracking
    this.logError(message, options);
  }
  
  /**
   * Log an error to console and potentially to a monitoring service
   */
  logError(message: string, options?: ErrorOptions): void {
    const errorData = {
      message,
      level: options?.level || ErrorLevel.ERROR,
      timestamp: new Date().toISOString(),
      errorId: options?.errorId || this.generateErrorId(),
      additionalInfo: options?.additionalInfo || {},
      userAgent: typeof window !== 'undefined' ? window.navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : ''
    };
    
    // Log to console
    console.error('[ErrorHandler]', errorData);
    
    // Could be extended to send to error monitoring service like Sentry
    // if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENABLED === 'true') {
    //   sendToErrorMonitoring(errorData);
    // }
  }
  
  /**
   * Handle an API error consistently across the application
   */
  handleApiError(error: any, fallbackMessage: string, options?: ErrorOptions): void {
    let message = fallbackMessage;
    
    // Try to extract error message from different API response formats
    if (error.response?.data?.error) {
      message = error.response.data.error;
    } else if (error.response?.data?.message) {
      message = error.response.data.message;
    } else if (error.message) {
      message = error.message;
    }
    
    // Display toast with appropriate level based on status code
    let level = options?.level || ErrorLevel.ERROR;
    if (error.response?.status) {
      if (error.response.status >= 500) {
        level = ErrorLevel.CRITICAL;
      } else if (error.response.status === 401 || error.response.status === 403) {
        level = ErrorLevel.WARNING;
      }
    }
    
    this.showErrorToast(message, {
      ...options,
      level,
      additionalInfo: {
        ...options?.additionalInfo,
        statusCode: error.response?.status,
        stack: error.stack
      }
    });
    
    // Check for network/connectivity errors
    if (error.message?.includes('network') || !navigator.onLine) {
      this.handleOfflineError();
    }
  }
  
  /**
   * Handle offline/network errors
   */
  handleOfflineError(): void {
    const isAlreadyNotified = localStorage.getItem('offline_notification_shown');
    
    // Only show once until reconnected
    if (!isAlreadyNotified) {
      this.showErrorToast(
        "You appear to be offline. Some features may be unavailable until you reconnect.",
        {
          title: "Network Connection Lost",
          level: ErrorLevel.WARNING,
          duration: 10000
        }
      );
      
      localStorage.setItem('offline_notification_shown', 'true');
      
      // Set up reconnection listener
      window.addEventListener('online', this.handleReconnection);
    }
  }
  
  /**
   * Handle reconnection event
   */
  handleReconnection = (): void => {
    localStorage.removeItem('offline_notification_shown');
    window.removeEventListener('online', this.handleReconnection);
    
    this.showErrorToast(
      "Your connection has been restored.",
      {
        title: "Back Online",
        level: ErrorLevel.INFO,
        duration: 3000
      }
    );
  }
  
  /**
   * Generate a unique error ID for tracking
   */
  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Get default duration for a toast based on error level
   */
  private getDurationForLevel(level: ErrorLevel): number {
    switch (level) {
      case ErrorLevel.INFO:
        return 3000;
      case ErrorLevel.WARNING:
        return 5000;
      case ErrorLevel.CRITICAL:
        return 10000;
      case ErrorLevel.ERROR:
      default:
        return 7000;
    }
  }
  
  /**
   * Get default title for a toast based on error level
   */
  private getDefaultTitleForLevel(level: ErrorLevel): string {
    switch (level) {
      case ErrorLevel.INFO:
        return "Information";
      case ErrorLevel.WARNING:
        return "Warning";
      case ErrorLevel.CRITICAL:
        return "Critical Error";
      case ErrorLevel.ERROR:
      default:
        return "Error";
    }
  }
  
  /**
   * Get toast variant based on error level
   */
  private getVariantForLevel(level: ErrorLevel): "default" | "destructive" {
    switch (level) {
      case ErrorLevel.INFO:
      case ErrorLevel.WARNING:
        return "default";
      case ErrorLevel.ERROR:
      case ErrorLevel.CRITICAL:
      default:
        return "destructive";
    }
  }
}

// Export a singleton instance
export const errorHandler = new ErrorHandler();