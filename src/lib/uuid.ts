/**
 * UUID generator utility
 * This file contains utilities for generating and validating UUIDs
 */

/**
 * Generate a UUID v4 (random) string
 * This is a more robust implementation than simple replacement
 */
export function generateUUID(): string {
  // For browsers that support the Web Crypto API
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Validate if a string is a valid UUID v4
 */
export function isValidUUID(uuid: string): boolean {
  // RFC 4122 compliant UUID v4 regex
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
} 