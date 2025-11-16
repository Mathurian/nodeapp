/**
 * Type declarations for cache utility
 */

export interface InMemoryCache {
  get(key: string): any | null;
  set(key: string, value: any, ttlSeconds?: number): void;
  delete(key: string): void;
  deletePattern(pattern: string): void;
  clear(): void;
  getStats(): { size: number; keys: string[] };
}

export interface UserCache {
  getById(userId: string): any | null;
  setById(userId: string, user: any, ttlSeconds?: number): void;
  invalidate(userId: string): void;
  invalidateAll(): void;
}

export const cache: InMemoryCache;
export const userCache: UserCache;

// Legacy exports for backward compatibility
export function getCached<T = any>(key: string): Promise<T | null>;
export function setCached<T = any>(key: string, value: T, ttl?: number): Promise<void>;
export function invalidateCache(pattern: string): Promise<void>;
export function clearCache(): Promise<void>;
