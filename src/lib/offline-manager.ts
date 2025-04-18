import { errorHandler } from './error-handler';
import { ErrorLevel } from './error-handler';

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body: any;
  timestamp: number;
  retries: number;
  maxRetries: number;
}

/**
 * Offline Manager to handle application functionality when network connection is lost
 * - Detects online/offline status
 * - Queues failed API requests for retry when online
 * - Provides offline-first capabilities
 */
class OfflineManager {
  private static instance: OfflineManager;
  private isOnline: boolean = true;
  private requestQueue: QueuedRequest[] = [];
  private queuedRequestsStorageKey = 'debugshala_queued_requests';
  private offlineDataStorageKey = 'debugshala_offline_data';
  private maxRetries = 3;
  private retryInterval = 5000; // 5 seconds
  private retryTimer: NodeJS.Timeout | null = null;
  private listeners: Array<(online: boolean) => void> = [];

  constructor() {
    if (typeof window !== 'undefined') {
      // Initialize online status
      this.isOnline = navigator.onLine;
      
      // Set up event listeners for network status changes
      window.addEventListener('online', this.handleOnline);
      window.addEventListener('offline', this.handleOffline);
      
      // Load any queued requests from local storage
      this.loadQueuedRequests();
    }
  }

  static getInstance(): OfflineManager {
    if (!OfflineManager.instance) {
      OfflineManager.instance = new OfflineManager();
    }
    return OfflineManager.instance;
  }

  /**
   * Check if the device is currently online
   */
  getIsOnline(): boolean {
    return this.isOnline;
  }

  /**
   * Subscribe to connection status changes
   * @param listener Callback function that receives online status
   * @returns Unsubscribe function
   */
  subscribeToConnectionChanges(listener: (online: boolean) => void): () => void {
    this.listeners.push(listener);
    
    // Immediately call with current status
    listener(this.isOnline);
    
    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Handle online event
   */
  private handleOnline = (): void => {
    this.isOnline = true;
    
    // Notify listeners
    this.notifyListeners();
    
    // Notify user
    errorHandler.showErrorToast(
      "Your connection has been restored.",
      {
        title: "Back Online",
        level: ErrorLevel.INFO,
        additionalInfo: {
          connectionStatus: 'online',
          timestamp: new Date().toISOString()
        }
      }
    );
    
    // Process queued requests
    this.processQueue();
  }

  /**
   * Handle offline event
   */
  private handleOffline = (): void => {
    this.isOnline = false;
    
    // Notify listeners
    this.notifyListeners();
    
    // Notify user
    errorHandler.showErrorToast(
      "You are currently offline. Some features may be unavailable.",
      {
        title: "Offline Mode",
        level: ErrorLevel.WARNING,
        additionalInfo: {
          connectionStatus: 'offline',
          timestamp: new Date().toISOString()
        }
      }
    );
  }

  /**
   * Notify all connection status listeners
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.isOnline);
      } catch (error) {
        console.error('Error in connection status listener:', error);
      }
    });
  }

  /**
   * Queue a failed API request for retry when online
   */
  queueRequest(url: string, method: string, body: any): string {
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    const queuedRequest: QueuedRequest = {
      id: requestId,
      url,
      method,
      body,
      timestamp: Date.now(),
      retries: 0,
      maxRetries: this.maxRetries
    };
    
    this.requestQueue.push(queuedRequest);
    this.saveQueuedRequests();
    
    // If we're online but the request failed for other reasons,
    // start the retry process
    if (this.isOnline && !this.retryTimer) {
      this.scheduleRetry();
    }
    
    return requestId;
  }

  /**
   * Remove a request from the queue (e.g., if it was handled manually)
   */
  removeQueuedRequest(requestId: string): void {
    this.requestQueue = this.requestQueue.filter(req => req.id !== requestId);
    this.saveQueuedRequests();
  }

  /**
   * Schedule retry of queued requests
   */
  private scheduleRetry(): void {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
    
    this.retryTimer = setTimeout(() => {
      this.processQueue();
      this.retryTimer = null;
    }, this.retryInterval);
  }

  /**
   * Process the queue of pending requests
   */
  private async processQueue(): Promise<void> {
    if (!this.isOnline || this.requestQueue.length === 0) {
      return;
    }
    
    const currentQueue = [...this.requestQueue];
    let hasFailures = false;
    
    // Process each request in the queue
    for (const request of currentQueue) {
      // Skip if we've gone offline during processing
      if (!this.isOnline) {
        hasFailures = true;
        break;
      }
      
      try {
        await fetch(request.url, {
          method: request.method,
          headers: {
            'Content-Type': 'application/json'
          },
          body: request.method !== 'GET' ? JSON.stringify(request.body) : undefined
        });
        
        // If successful, remove from queue
        this.removeQueuedRequest(request.id);
      } catch (error) {
        hasFailures = true;
        
        // Increment retry count
        request.retries++;
        
        // Remove if max retries exceeded
        if (request.retries >= request.maxRetries) {
          this.removeQueuedRequest(request.id);
          
          // Notify about permanently failed request
          errorHandler.showErrorToast(
            `Request to ${request.url} failed permanently after ${request.maxRetries} attempts.`,
            {
              title: "Sync Failed",
              level: ErrorLevel.ERROR,
              additionalInfo: {
                requestId: request.id,
                url: request.url,
                attempts: request.retries,
                timestamp: new Date().toISOString()
              }
            }
          );
        }
      }
    }
    
    this.saveQueuedRequests();
    
    // If we still have failures, schedule another retry
    if (hasFailures && this.requestQueue.length > 0) {
      this.scheduleRetry();
    }
  }

  /**
   * Save the current request queue to local storage
   */
  private saveQueuedRequests(): void {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(
          this.queuedRequestsStorageKey,
          JSON.stringify(this.requestQueue)
        );
      } catch (error) {
        console.error('Failed to save queued requests to localStorage:', error);
      }
    }
  }

  /**
   * Load queued requests from local storage
   */
  private loadQueuedRequests(): void {
    if (typeof window !== 'undefined') {
      try {
        const savedQueue = localStorage.getItem(this.queuedRequestsStorageKey);
        if (savedQueue) {
          this.requestQueue = JSON.parse(savedQueue);
          
          // If we have queued requests and we're online, start processing
          if (this.requestQueue.length > 0 && this.isOnline) {
            this.processQueue();
          }
        }
      } catch (error) {
        console.error('Failed to load queued requests from localStorage:', error);
        // Reset the queue if loading fails
        this.requestQueue = [];
      }
    }
  }

  /**
   * Create an offline-aware fetch wrapper
   * Queues failed requests when offline and retries when online
   */
  fetch(url: string, options: RequestInit = {}): Promise<Response> {
    // If we're offline, queue the request and throw error
    if (!this.isOnline) {
      const method = options.method || 'GET';
      const body = options.body ? JSON.parse(options.body as string) : undefined;
      
      this.queueRequest(url, method, body);
      
      return Promise.reject(new Error('Currently offline. Request queued for later.'));
    }
    
    // Otherwise perform the fetch normally
    return fetch(url, options).catch(error => {
      // If the error is likely due to network issues, queue for retry
      if (error.message.includes('network') || error.message.includes('failed to fetch')) {
        const method = options.method || 'GET';
        const body = options.body ? JSON.parse(options.body as string) : undefined;
        
        this.queueRequest(url, method, body);
      }
      
      throw error;
    });
  }

  /**
   * Store data for offline use
   */
  storeOfflineData(key: string, data: any): void {
    if (typeof window !== 'undefined') {
      try {
        const offlineData = JSON.parse(
          localStorage.getItem(this.offlineDataStorageKey) || '{}'
        );
        
        offlineData[key] = {
          data,
          timestamp: Date.now()
        };
        
        localStorage.setItem(this.offlineDataStorageKey, JSON.stringify(offlineData));
      } catch (error) {
        console.error('Failed to store offline data:', error);
      }
    }
  }

  /**
   * Retrieve data stored for offline use
   */
  getOfflineData(key: string): { data: any; timestamp: number } | null {
    if (typeof window !== 'undefined') {
      try {
        const offlineData = JSON.parse(
          localStorage.getItem(this.offlineDataStorageKey) || '{}'
        );
        
        return offlineData[key] || null;
      } catch (error) {
        console.error('Failed to retrieve offline data:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Clear all offline data
   */
  clearOfflineData(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.offlineDataStorageKey);
    }
  }

  /**
   * Clean up event listeners
   */
  dispose(): void {
    if (typeof window !== 'undefined') {
      window.removeEventListener('online', this.handleOnline);
      window.removeEventListener('offline', this.handleOffline);
      
      if (this.retryTimer) {
        clearTimeout(this.retryTimer);
      }
    }
  }
}

// Export a singleton instance
export const offlineManager = OfflineManager.getInstance();

// Add a method to store test progress
export function storeTestProgress(data: any): void {
  // Use localStorage to persist test progress
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('debugshala_test_progress', JSON.stringify({
        ...data,
        timestamp: new Date().toISOString()
      }));
      console.log('Test progress stored at:', new Date().toISOString());
    } catch (error) {
      console.error('Failed to store test progress:', error);
    }
  }
}

// Add a method to load test progress
export function loadTestProgress(): any {
  // Retrieve test progress from localStorage
  if (typeof window !== 'undefined') {
    try {
      const savedData = localStorage.getItem('debugshala_test_progress');
      if (savedData) {
        const data = JSON.parse(savedData);
        
        // Check if the data is still valid (not older than 3 hours)
        const timestamp = new Date(data.timestamp).getTime();
        const now = new Date().getTime();
        const threeHoursInMs = 3 * 60 * 60 * 1000;
        
        if (now - timestamp > threeHoursInMs) {
          console.log('Test progress data is too old, clearing it');
          localStorage.removeItem('debugshala_test_progress');
          return null;
        }
        
        console.log('Retrieved test progress from:', data.timestamp);
        return data;
      }
    } catch (error) {
      console.error('Failed to load test progress:', error);
    }
  }
  return null;
}

// Check if test is marked as completed
export function isTestCompleted(): boolean {
  if (typeof window !== 'undefined') {
    try {
      // Check for completion flag
      if (localStorage.getItem('debugshala_test_completed') === 'true') {
        return true;
      }
      
      // Also check for stored results as alternative indicator of completion
      if (localStorage.getItem('latest_assessment_results')) {
        return true;
      }
    } catch (error) {
      console.error('Error checking test completion status:', error);
    }
  }
  return false;
}

// Clear all test data
export function clearTestData(): void {
  if (typeof window !== 'undefined') {
    try {
      localStorage.removeItem('debugshala_test_progress');
      localStorage.removeItem('debugshala_test_completed');
      localStorage.removeItem('latest_assessment_results');
      console.log('All test data cleared');
    } catch (error) {
      console.error('Failed to clear test data:', error);
    }
  }
} 