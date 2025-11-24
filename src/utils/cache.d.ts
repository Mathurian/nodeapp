/**
 * Type declarations for cache utility
 */

export interface InMemoryCache {
  get(key: string): unknown | null;
  set(key: string, value: unknown, ttlSeconds?: number): void;
  delete(key: string): void;
  deletePattern(pattern: string): void;
  clear(): void;
  getStats(): { size: number; keys: string[] };
}

export interface UserCache {
  getById(userId: string): unknown | null;
  setById(userId: string, user: unknown, ttlSeconds?: number): void;
  invalidate(userId: string): void;
  invalidateAll(): void;
}

export const cache: InMemoryCache;
export const userCache: UserCache;

// Legacy exports for backward compatibility
export function getCached<T = unknown>(key: string): Promise<T | null>;
export function setCached<T = unknown>(key: string, value: T, ttl?: number): Promise<void>;
export function invalidateCache(pattern: string): Promise<void>;
export function clearCache(): Promise<void>;
