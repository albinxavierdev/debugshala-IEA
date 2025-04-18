import { AssessmentResult } from '@/types/assessment';

const CACHE_PREFIX = 'assessment_report_';
const CACHE_EXPIRY = 1000 * 60 * 60; // 1 hour

interface CacheEntry {
  data: AssessmentResult;
  timestamp: number;
}

export function getCachedReport(userId: string): AssessmentResult | null {
  try {
    const cacheKey = CACHE_PREFIX + userId;
    const cachedData = localStorage.getItem(cacheKey);
    
    if (!cachedData) {
      return null;
    }
    
    const entry: CacheEntry = JSON.parse(cachedData);
    const now = Date.now();
    
    // Check if cache has expired
    if (now - entry.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return entry.data;
  } catch (error) {
    console.warn('Error reading from cache:', error);
    return null;
  }
}

export function cacheReport(userId: string, report: AssessmentResult): void {
  try {
    const cacheKey = CACHE_PREFIX + userId;
    const entry: CacheEntry = {
      data: report,
      timestamp: Date.now()
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(entry));
  } catch (error) {
    console.warn('Error writing to cache:', error);
  }
}

export function clearCachedReport(userId: string): void {
  try {
    const cacheKey = CACHE_PREFIX + userId;
    localStorage.removeItem(cacheKey);
  } catch (error) {
    console.warn('Error clearing cache:', error);
  }
}

interface CacheOptions {
  ttl: number; // Time to live in milliseconds
  realtime?: boolean; // Flag to bypass cache for real-time data
}

interface CacheItem<T> {
  data: T;
  expiry: number;
}

class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheItem<any>>;
  private defaultTTL: number = 30 * 1000; // 30 seconds default (reduced from 5 minutes)

  private constructor() {
    this.cache = new Map();
    
    // Setup cache cleanup interval
    if (typeof window !== 'undefined') {
      setInterval(() => this.cleanup(), 60 * 1000); // Cleanup every minute
    }
  }

  static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  /**
   * Set a cache item
   * @param key Cache key
   * @param data Data to cache
   * @param options Cache options
   */
  set<T>(key: string, data: T, options?: Partial<CacheOptions>): void {
    // If realtime flag is set to true, don't cache
    if (options?.realtime === true) {
      return;
    }
    
    const ttl = options?.ttl || this.defaultTTL;
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  /**
   * Get a cache item
   * @param key Cache key
   * @param options Cache options
   * @returns Cached data or null if not found/expired
   */
  get<T>(key: string, options?: Partial<CacheOptions>): T | null {
    // If realtime flag is set to true, bypass cache
    if (options?.realtime === true) {
      return null;
    }
    
    const item = this.cache.get(key);
    
    // Check if item exists and hasn't expired
    if (item && item.expiry > Date.now()) {
      return item.data as T;
    }
    
    // Remove expired item
    if (item) {
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Remove an item from cache
   * @param key Cache key
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clean up expired cache items
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (item.expiry <= now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get wrapper - get cached data or fetch and cache it
   * @param key Cache key
   * @param fetchFn Function to fetch data if not cached
   * @param options Cache options
   * @returns Data from cache or freshly fetched
   */
  async getOrFetch<T>(
    key: string, 
    fetchFn: () => Promise<T>, 
    options?: Partial<CacheOptions>
  ): Promise<T> {
    // If realtime flag is set, always fetch fresh data
    if (options?.realtime === true) {
      const data = await fetchFn();
      return data;
    }
    
    // Try to get from cache first
    const cachedData = this.get<T>(key, options);
    if (cachedData !== null) {
      return cachedData;
    }
    
    // Fetch fresh data
    const data = await fetchFn();
    
    // Cache the result
    this.set(key, data, options);
    
    return data;
  }

  /**
   * Invalidate cache keys by prefix
   * @param prefix Cache key prefix to invalidate
   */
  invalidateByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }
}

export const cache = Cache.getInstance();

 