/**
 * Feature Flag Service
 * Provides feature flag functionality for gradual rollouts, A/B testing, and instant rollbacks
 */

import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import { CacheService } from './CacheService';
import { prisma } from '../config/database';

export enum FeatureFlagStrategy {
  ON = 'ON',                    // Always enabled
  OFF = 'OFF',                  // Always disabled
  PERCENTAGE = 'PERCENTAGE',    // Enable for X% of users
  USER_LIST = 'USER_LIST',      // Enable for specific users
  TENANT_LIST = 'TENANT_LIST',  // Enable for specific tenants
  GRADUAL = 'GRADUAL',          // Gradual rollout over time
}

export interface FeatureFlagConfig {
  enabled: boolean;
  strategy: FeatureFlagStrategy;
  percentage?: number;           // For PERCENTAGE strategy (0-100)
  userIds?: string[];           // For USER_LIST strategy
  tenantIds?: string[];         // For TENANT_LIST strategy
  startDate?: Date;             // For GRADUAL strategy
  endDate?: Date;               // For GRADUAL strategy
  targetPercentage?: number;    // For GRADUAL strategy (final percentage)
}

export interface FeatureFlagContext {
  userId?: string;
  tenantId?: string;
  email?: string;
  role?: string;
  customAttributes?: Record<string, any>;
}

@injectable()
export class FeatureFlagService extends BaseService {
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor(
    @inject('CacheService') private cacheService: CacheService
  ) {
    super();
  }

  /**
   * Get cache key for feature flag
   */
  private getCacheKey(flagName: string): string {
    return `feature-flag:${flagName}`;
  }

  /**
   * Check if a feature flag is enabled for a given context
   */
  async isEnabled(flagName: string, context: FeatureFlagContext = {}): Promise<boolean> {
    try {
      // Get flag configuration (with caching)
      const config = await this.getFlagConfig(flagName);

      if (!config) {
        // Flag doesn't exist - default to disabled
        this.logWarn('Feature flag not found', { flagName });
        return false;
      }

      if (!config.enabled) {
        return false;
      }

      // Evaluate based on strategy
      return this.evaluateStrategy(config, context);
    } catch (error) {
      // Fail open (return false) if there's an error
      this.logError('Error evaluating feature flag', { error, flagName });
      return false;
    }
  }

  /**
   * Get feature flag configuration
   */
  private async getFlagConfig(flagName: string): Promise<FeatureFlagConfig | null> {
    // Try cache first
    const cacheKey = this.getCacheKey(flagName);
    const cached = await this.cacheService.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from database
    const flag = await prisma.featureFlag.findUnique({
      where: { name: flagName },
    });

    if (!flag) {
      return null;
    }

    const config: FeatureFlagConfig = {
      enabled: flag.enabled,
      strategy: flag.strategy as FeatureFlagStrategy,
      percentage: flag.percentage || undefined,
      userIds: flag.userIds || undefined,
      tenantIds: flag.tenantIds || undefined,
      startDate: flag.startDate || undefined,
      endDate: flag.endDate || undefined,
      targetPercentage: flag.targetPercentage || undefined,
    };

    // Cache for 5 minutes
    await this.cacheService.set(cacheKey, JSON.stringify(config), this.CACHE_TTL);

    return config;
  }

  /**
   * Evaluate feature flag based on strategy
   */
  private evaluateStrategy(config: FeatureFlagConfig, context: FeatureFlagContext): boolean {
    switch (config.strategy) {
      case FeatureFlagStrategy.ON:
        return true;

      case FeatureFlagStrategy.OFF:
        return false;

      case FeatureFlagStrategy.PERCENTAGE:
        return this.evaluatePercentage(config.percentage || 0, context);

      case FeatureFlagStrategy.USER_LIST:
        return this.evaluateUserList(config.userIds || [], context);

      case FeatureFlagStrategy.TENANT_LIST:
        return this.evaluateTenantList(config.tenantIds || [], context);

      case FeatureFlagStrategy.GRADUAL:
        return this.evaluateGradual(config, context);

      default:
        return false;
    }
  }

  /**
   * Evaluate percentage-based rollout
   * Uses consistent hashing to ensure same user always gets same result
   */
  private evaluatePercentage(percentage: number, context: FeatureFlagContext): boolean {
    if (percentage <= 0) return false;
    if (percentage >= 100) return true;

    // Use userId for consistency, fall back to tenantId or random
    const identifier = context.userId || context.tenantId || Math.random().toString();

    // Simple hash function
    const hash = this.hashString(identifier);
    const bucket = hash % 100;

    return bucket < percentage;
  }

  /**
   * Evaluate user list strategy
   */
  private evaluateUserList(userIds: string[], context: FeatureFlagContext): boolean {
    if (!context.userId) return false;
    return userIds.includes(context.userId);
  }

  /**
   * Evaluate tenant list strategy
   */
  private evaluateTenantList(tenantIds: string[], context: FeatureFlagContext): boolean {
    if (!context.tenantId) return false;
    return tenantIds.includes(context.tenantId);
  }

  /**
   * Evaluate gradual rollout strategy
   * Increases percentage from 0 to target over time period
   */
  private evaluateGradual(config: FeatureFlagConfig, context: FeatureFlagContext): boolean {
    const now = new Date();
    const startDate = config.startDate;
    const endDate = config.endDate;
    const targetPercentage = config.targetPercentage || 100;

    if (!startDate || !endDate) {
      return false;
    }

    // Before start date - disabled
    if (now < startDate) {
      return false;
    }

    // After end date - use target percentage
    if (now >= endDate) {
      return this.evaluatePercentage(targetPercentage, context);
    }

    // During rollout - calculate current percentage
    const totalDuration = endDate.getTime() - startDate.getTime();
    const elapsed = now.getTime() - startDate.getTime();
    const currentPercentage = (elapsed / totalDuration) * targetPercentage;

    return this.evaluatePercentage(Math.floor(currentPercentage), context);
  }

  /**
   * Simple hash function for consistent bucketing
   */
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Create or update a feature flag
   */
  async setFlag(
    name: string,
    config: Partial<FeatureFlagConfig>,
    description?: string
  ): Promise<void> {
    try {
      await prisma.featureFlag.upsert({
        where: { name },
        create: {
          name,
          description: description || '',
          enabled: config.enabled ?? false,
          strategy: config.strategy || FeatureFlagStrategy.OFF,
          percentage: config.percentage,
          userIds: config.userIds,
          tenantIds: config.tenantIds,
          startDate: config.startDate,
          endDate: config.endDate,
          targetPercentage: config.targetPercentage,
        },
        update: {
          enabled: config.enabled,
          strategy: config.strategy,
          percentage: config.percentage,
          userIds: config.userIds,
          tenantIds: config.tenantIds,
          startDate: config.startDate,
          endDate: config.endDate,
          targetPercentage: config.targetPercentage,
          description,
        },
      });

      // Invalidate cache
      await this.cacheService.del(this.getCacheKey(name));

      this.logInfo('Feature flag updated', { name, config });
    } catch (error) {
      return this.handleError(error, { operation: 'setFlag', name });
    }
  }

  /**
   * Get all feature flags
   */
  async getAllFlags(): Promise<any[]> {
    try {
      return await prisma.featureFlag.findMany({
        orderBy: { name: 'asc' },
      });
    } catch (error) {
      return this.handleError(error, { operation: 'getAllFlags' });
    }
  }

  /**
   * Delete a feature flag
   */
  async deleteFlag(name: string): Promise<void> {
    try {
      await prisma.featureFlag.delete({
        where: { name },
      });

      // Invalidate cache
      await this.cacheService.del(this.getCacheKey(name));

      this.logInfo('Feature flag deleted', { name });
    } catch (error) {
      return this.handleError(error, { operation: 'deleteFlag', name });
    }
  }

  /**
   * Get feature flag evaluation for a context (for debugging)
   */
  async evaluateAllFlags(context: FeatureFlagContext): Promise<Record<string, boolean>> {
    try {
      const flags = await this.getAllFlags();
      const evaluations: Record<string, boolean> = {};

      for (const flag of flags) {
        evaluations[flag.name] = await this.isEnabled(flag.name, context);
      }

      return evaluations;
    } catch (error) {
      return this.handleError(error, { operation: 'evaluateAllFlags' });
    }
  }

  /**
   * Invalidate cache for a feature flag
   */
  async invalidateCache(flagName: string): Promise<void> {
    await this.cacheService.del(this.getCacheKey(flagName));
  }

  /**
   * Invalidate all feature flag caches
   */
  async invalidateAllCaches(): Promise<void> {
    await this.cacheService.invalidatePattern('feature-flag:*');
  }
}
