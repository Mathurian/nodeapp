/**
 * Permission Cache Service
 * Phase 4: Dynamic CRUD Permissions - Caching Strategy
 *
 * Manages permission caching for optimal performance
 * Provides cache warming, invalidation, and monitoring
 */

import { injectable, inject } from 'tsyringe';
import { CacheService } from './CacheService';
import { DynamicPermissionService } from './DynamicPermissionService';
import { UserRole } from '@prisma/client';
import { BaseService } from './BaseService';

export interface CacheStats {
  total: number;
  cached: number;
  hitRate: number;
  roleStats: Record<string, boolean>;
}

export interface CacheWarmupResult {
  success: boolean;
  rolesWarmed: number;
  errors: string[];
  duration: number;
}

@injectable()
export class PermissionCacheService extends BaseService {
  private readonly TTL = 300; // 5 minutes (300 seconds)
  private readonly CACHE_KEY_PREFIX = 'permissions';

  constructor(
    @inject('CacheService') private cacheService: CacheService,
    @inject('DynamicPermissionService') private dynamicPermissionService: DynamicPermissionService
  ) {
    super();
  }

  /**
   * Warm cache for all roles (on startup or after migration)
   * Preloads permissions for all roles to minimize initial latency
   */
  async warmCache(tenantId: string): Promise<CacheWarmupResult> {
    const startTime = Date.now();
    const result: CacheWarmupResult = {
      success: true,
      rolesWarmed: 0,
      errors: [],
      duration: 0
    };

    const roles: UserRole[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'ORGANIZER',
      'BOARD',
      'TALLY_MASTER',
      'AUDITOR',
      'JUDGE',
      'EMCEE',
      'CONTESTANT'
    ];

    for (const role of roles) {
      try {
        // This will cache the permissions as a side effect
        await this.dynamicPermissionService.getPermissions(role, tenantId);
        result.rolesWarmed++;
      } catch (error) {
        result.success = false;
        result.errors.push(`Failed to warm cache for ${role}: ${(error as Error).message}`);
      }
    }

    result.duration = Date.now() - startTime;
    return result;
  }

  /**
   * Warm cache for multiple tenants
   * Useful for multi-tenant environments on server startup
   */
  async warmCacheForTenants(tenantIds: string[]): Promise<Map<string, CacheWarmupResult>> {
    const results = new Map<string, CacheWarmupResult>();

    for (const tenantId of tenantIds) {
      try {
        const result = await this.warmCache(tenantId);
        results.set(tenantId, result);
      } catch (error) {
        results.set(tenantId, {
          success: false,
          rolesWarmed: 0,
          errors: [(error as Error).message],
          duration: 0
        });
      }
    }

    return results;
  }

  /**
   * Invalidate all permission caches for a tenant
   * Call this when permissions are modified
   */
  async invalidateAll(tenantId: string): Promise<number> {
    const pattern = `${this.CACHE_KEY_PREFIX}:${tenantId}:*`;
    return await this.cacheService.invalidatePattern(pattern);
  }

  /**
   * Invalidate cache for a specific role
   */
  async invalidateRole(role: UserRole, tenantId: string): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${tenantId}:${role}`;
    await this.cacheService.del(cacheKey);
  }

  /**
   * Get cache statistics
   * Useful for monitoring and debugging
   */
  async getStats(tenantId: string): Promise<CacheStats> {
    const roles: UserRole[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'ORGANIZER',
      'BOARD',
      'TALLY_MASTER',
      'AUDITOR',
      'JUDGE',
      'EMCEE',
      'CONTESTANT'
    ];

    let cached = 0;
    const roleStats: Record<string, boolean> = {};

    for (const role of roles) {
      const cacheKey = `${this.CACHE_KEY_PREFIX}:${tenantId}:${role}`;
      const exists = await this.cacheService.exists(cacheKey);
      roleStats[role] = exists;
      if (exists) cached++;
    }

    const total = roles.length;
    const hitRate = total > 0 ? (cached / total) * 100 : 0;

    return {
      total,
      cached,
      hitRate,
      roleStats
    };
  }

  /**
   * Pre-warm cache for frequently accessed roles
   * Useful for optimizing commonly-used roles
   */
  async warmFrequentRoles(tenantId: string, roles: UserRole[]): Promise<number> {
    let warmed = 0;

    for (const role of roles) {
      try {
        await this.dynamicPermissionService.getPermissions(role, tenantId);
        warmed++;
      } catch (error) {
        console.error(`Failed to warm cache for ${role}:`, error);
      }
    }

    return warmed;
  }

  /**
   * Refresh cache for a specific role (force reload)
   */
  async refreshRole(role: UserRole, tenantId: string): Promise<string[]> {
    // Invalidate existing cache
    await this.invalidateRole(role, tenantId);

    // Load fresh data (which will cache it)
    return await this.dynamicPermissionService.getPermissions(role, tenantId);
  }

  /**
   * Refresh cache for all roles in a tenant
   */
  async refreshAll(tenantId: string): Promise<number> {
    // Invalidate all caches first
    await this.invalidateAll(tenantId);

    // Warm cache (reload all)
    const result = await this.warmCache(tenantId);
    return result.rolesWarmed;
  }

  /**
   * Get cache expiration time remaining for a role
   * Returns seconds remaining, or -1 if not cached
   */
  async getCacheTTL(role: UserRole, tenantId: string): Promise<number> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${tenantId}:${role}`;
    const ttl = await this.cacheService.getTTL(cacheKey);
    return ttl;
  }

  /**
   * Set custom TTL for a role's permissions
   * Useful for high-frequency roles that need longer caching
   */
  async setCustomTTL(role: UserRole, tenantId: string, ttlSeconds: number): Promise<void> {
    const cacheKey = `${this.CACHE_KEY_PREFIX}:${tenantId}:${role}`;

    // Get current cached value
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      // Re-set with new TTL
      await this.cacheService.set(cacheKey, cached, ttlSeconds);
    } else {
      // Load and cache with custom TTL
      const permissions = await this.dynamicPermissionService.getPermissions(role, tenantId);
      await this.cacheService.set(cacheKey, JSON.stringify(permissions), ttlSeconds);
    }
  }

  /**
   * Monitor cache performance over time
   * Returns hit rates for each role
   */
  async monitorPerformance(
    tenantId: string,
    durationMinutes: number = 60
  ): Promise<{
    startTime: Date;
    endTime: Date;
    totalChecks: number;
    cacheHits: number;
    cacheMisses: number;
    hitRate: number;
    roleBreakdown: Record<string, { hits: number; misses: number; hitRate: number }>;
  }> {
    // This would require instrumentation in the CacheService
    // For now, return current stats
    const stats = await this.getStats(tenantId);

    const now = new Date();
    const startTime = new Date(now.getTime() - durationMinutes * 60 * 1000);

    return {
      startTime,
      endTime: now,
      totalChecks: stats.total,
      cacheHits: stats.cached,
      cacheMisses: stats.total - stats.cached,
      hitRate: stats.hitRate,
      roleBreakdown: Object.entries(stats.roleStats).reduce((acc, [role, isCached]) => {
        acc[role] = {
          hits: isCached ? 1 : 0,
          misses: isCached ? 0 : 1,
          hitRate: isCached ? 100 : 0
        };
        return acc;
      }, {} as Record<string, { hits: number; misses: number; hitRate: number }>)
    };
  }

  /**
   * Health check for permission cache
   * Returns warnings if cache performance is degraded
   */
  async healthCheck(tenantId: string): Promise<{
    healthy: boolean;
    warnings: string[];
    stats: CacheStats;
  }> {
    const stats = await this.getStats(tenantId);
    const warnings: string[] = [];
    let healthy = true;

    // Check hit rate
    if (stats.hitRate < 50) {
      warnings.push(`Low cache hit rate: ${stats.hitRate.toFixed(1)}% (target: >80%)`);
      healthy = false;
    }

    // Check critical roles
    const criticalRoles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER'];
    for (const role of criticalRoles) {
      if (!stats.roleStats[role]) {
        warnings.push(`Critical role ${role} not cached`);
        healthy = false;
      }
    }

    return {
      healthy,
      warnings,
      stats
    };
  }

  /**
   * Auto-warm cache on schedule
   * Should be called periodically (e.g., every hour) to keep cache fresh
   */
  async scheduledWarmup(tenantId: string): Promise<CacheWarmupResult> {
    const stats = await this.getStats(tenantId);

    // Only warm if hit rate is low or some roles are missing
    if (stats.hitRate < 80 || stats.cached < stats.total) {
      return await this.warmCache(tenantId);
    }

    return {
      success: true,
      rolesWarmed: 0,
      errors: [],
      duration: 0
    };
  }

  /**
   * Clear all permission caches (for all tenants)
   * Use with caution - only for maintenance or debugging
   */
  async clearAllTenantCaches(): Promise<number> {
    const pattern = `${this.CACHE_KEY_PREFIX}:*`;
    return await this.cacheService.invalidatePattern(pattern);
  }
}
