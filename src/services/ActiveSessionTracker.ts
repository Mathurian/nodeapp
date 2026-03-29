/**
 * Active Session Tracker
 * Tracks currently active users and exposes presence metrics.
 *
 * Live presence is Redis-backed when available so counts survive across
 * requests and can be aggregated safely for monitoring. The in-memory map
 * remains as a fallback when Redis is unavailable.
 */

import { injectable, inject } from 'tsyringe';
import type { Redis } from 'ioredis';
import { Gauge } from 'prom-client';
import { MetricsService } from './MetricsService';
import { createLogger } from '../utils/logger';
import { getCacheService } from './RedisCacheService';
import { env } from '../config/env';

interface SessionInfo {
  userId: string;
  tenantId: string;
  role: string;
  loginTime: number;
  lastActivity: number;
  userAgent?: string;
}

interface PresenceSnapshot {
  liveUsers: number;
  liveUsersByRole: Array<{ role: string; count: number }>;
}

const logger = createLogger('session-tracker');
const normalizePresenceNamespace = (value: string): string =>
  value
    .toLowerCase()
    .replace(/^[a-z]+:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'default';

const resolvePresenceKeyPrefix = (): string => {
  const runtimeScope =
    env.get('APP_URL') ||
    env.get('API_URL') ||
    env.get('FRONTEND_URL') ||
    `${env.get('NODE_ENV')}-${env.get('PORT')}`;

  return `presence:v1:${normalizePresenceNamespace(runtimeScope)}`;
};

const PRESENCE_KEY_PREFIX = resolvePresenceKeyPrefix();
const ALL_TENANTS_KEY = `${PRESENCE_KEY_PREFIX}:tenants`;
const GLOBAL_ZSET_KEY = `${PRESENCE_KEY_PREFIX}:global`;
const USER_ROLES = [
  'SUPER_ADMIN',
  'ADMIN',
  'ORGANIZER',
  'BOARD',
  'JUDGE',
  'CONTESTANT',
  'EMCEE',
  'TALLY_MASTER',
  'AUDITOR',
] as const;

@injectable()
export class ActiveSessionTracker {
  private readonly sessions = new Map<string, SessionInfo>();
  private readonly lastRedisWriteAt = new Map<string, number>();
  private readonly cacheService = getCacheService();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private readonly activeSessionsGauge: Gauge<string>;
  private readonly activeSessionsByRoleGauge: Gauge<string>;
  private readonly activeSessionsGlobalGauge: Gauge<string>;

  // Real-time presence window. Activity inside this window counts as "currently active".
  private readonly LIVE_ACTIVITY_WINDOW_MS = 15 * 60 * 1000;
  // Throttle Redis writes from repeated requests for the same user.
  private readonly WRITE_THROTTLE_MS = 30 * 1000;

  constructor(@inject(MetricsService) private readonly metricsService: MetricsService) {
    const registry = this.metricsService.getRegistry();

    this.activeSessionsGauge = new Gauge({
      name: 'active_user_sessions_total',
      help: 'Number of currently active users by tenant within the live activity window',
      labelNames: ['tenant_id'],
      registers: [registry],
    });

    this.activeSessionsByRoleGauge = new Gauge({
      name: 'active_user_sessions_by_role_total',
      help: 'Number of currently active users by tenant and role within the live activity window',
      labelNames: ['tenant_id', 'role'],
      registers: [registry],
    });

    this.activeSessionsGlobalGauge = new Gauge({
      name: 'active_user_sessions_global_total',
      help: 'Number of currently active users across all tenants within the live activity window',
      registers: [registry],
    });

    logger.info('Active session tracker initialized');
  }

  start(cleanupIntervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      logger.warn('Session tracker already running');
      return;
    }

    logger.info(`Starting session tracker (maintenance interval: ${cleanupIntervalMs}ms)`);

    void this.runMaintenance();
    this.cleanupInterval = setInterval(() => {
      void this.runMaintenance();
    }, cleanupIntervalMs);

    if (this.cleanupInterval.unref) {
      this.cleanupInterval.unref();
    }
  }

  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      logger.info('Session tracker stopped');
    }
  }

  trackLogin(userId: string, tenantId: string, role: string, userAgent?: string): void {
    const sessionInfo: SessionInfo = {
      userId,
      tenantId,
      role: this.normalizeRole(role),
      loginTime: Date.now(),
      lastActivity: Date.now(),
      userAgent,
    };

    void this.recordPresence(sessionInfo, { forceWrite: true, refreshMetrics: true });
  }

  trackLogout(userId: string): void {
    void this.removePresence(userId);
  }

  trackActivity(userId: string, tenantId: string, role: string, userAgent?: string): void {
    const existing = this.sessions.get(userId);
    const now = Date.now();
    const sessionInfo: SessionInfo = {
      userId,
      tenantId,
      role: this.normalizeRole(role),
      loginTime: existing?.loginTime || now,
      lastActivity: now,
      userAgent: userAgent || existing?.userAgent,
    };

    void this.recordPresence(sessionInfo, { forceWrite: false, refreshMetrics: false });
  }

  getLiveWindowMinutes(): number {
    return Math.round(this.LIVE_ACTIVITY_WINDOW_MS / 60000);
  }

  async getPresenceSnapshot(tenantId?: string): Promise<PresenceSnapshot> {
    const client = this.getRedisClient();
    if (client) {
      return this.getRedisPresenceSnapshot(client, tenantId);
    }

    return this.getFallbackPresenceSnapshot(tenantId);
  }

  getActiveSessionCount(): number {
    return this.getFallbackPresenceSnapshot().liveUsers;
  }

  getActiveSessionCountByTenant(tenantId: string): number {
    return this.getFallbackPresenceSnapshot(tenantId).liveUsers;
  }

  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  private getRedisClient(): Redis | null {
    const client = this.cacheService.getClient();
    if (!client || this.cacheService.isUsingMemoryCache()) {
      return null;
    }

    return client;
  }

  private tenantKey(tenantId: string): string {
    return `${PRESENCE_KEY_PREFIX}:tenant:${tenantId}`;
  }

  private tenantRolesKey(tenantId: string): string {
    return `${PRESENCE_KEY_PREFIX}:tenant:${tenantId}:roles`;
  }

  private tenantRoleKey(tenantId: string, role: string): string {
    return `${PRESENCE_KEY_PREFIX}:tenant:${tenantId}:role:${role}`;
  }

  private userSessionKey(userId: string): string {
    return `${PRESENCE_KEY_PREFIX}:user:${userId}`;
  }

  private normalizeRole(role: string): string {
    const normalizedRole = String(role || '').trim().toUpperCase();
    return USER_ROLES.includes(normalizedRole as (typeof USER_ROLES)[number])
      ? normalizedRole
      : 'UNKNOWN';
  }

  private getCutoffTimestamp(now: number = Date.now()): number {
    return now - this.LIVE_ACTIVITY_WINDOW_MS;
  }

  private async recordPresence(
    session: SessionInfo,
    options: { forceWrite: boolean; refreshMetrics: boolean },
  ): Promise<void> {
    this.sessions.set(session.userId, session);

    const client = this.getRedisClient();
    if (!client) {
      if (options.refreshMetrics) {
        this.refreshFallbackMetrics();
      }
      return;
    }

    const now = Date.now();
    const lastWriteAt = this.lastRedisWriteAt.get(session.userId) || 0;
    if (!options.forceWrite && now - lastWriteAt < this.WRITE_THROTTLE_MS) {
      return;
    }

    this.lastRedisWriteAt.set(session.userId, now);

    try {
      await client
        .multi()
        .zadd(GLOBAL_ZSET_KEY, now, session.userId)
        .zadd(this.tenantKey(session.tenantId), now, session.userId)
        .zadd(this.tenantRoleKey(session.tenantId, session.role), now, session.userId)
        .sadd(ALL_TENANTS_KEY, session.tenantId)
        .sadd(this.tenantRolesKey(session.tenantId), session.role)
        .set(
          this.userSessionKey(session.userId),
          JSON.stringify(session),
          'PX',
          this.LIVE_ACTIVITY_WINDOW_MS + this.WRITE_THROTTLE_MS,
        )
        .exec();

      if (options.refreshMetrics) {
        await this.refreshRedisMetrics(client);
      }
    } catch (error) {
      logger.warn('Failed to record user presence in Redis, using fallback map', {
        error: error instanceof Error ? error.message : String(error),
        userId: session.userId,
        tenantId: session.tenantId,
      });
      if (options.refreshMetrics) {
        this.refreshFallbackMetrics();
      }
    }
  }

  private async removePresence(userId: string): Promise<void> {
    const client = this.getRedisClient();
    this.sessions.delete(userId);
    this.lastRedisWriteAt.delete(userId);

    if (!client) {
      this.refreshFallbackMetrics();
      return;
    }

    try {
      const serializedSession = await client.get(this.userSessionKey(userId));
      const session = serializedSession ? (JSON.parse(serializedSession) as SessionInfo) : null;

      const multi = client.multi();
      multi.zrem(GLOBAL_ZSET_KEY, userId);
      multi.del(this.userSessionKey(userId));

      if (session?.tenantId) {
        multi.zrem(this.tenantKey(session.tenantId), userId);
        multi.zrem(this.tenantRoleKey(session.tenantId, this.normalizeRole(session.role)), userId);
      }

      await multi.exec();
      await this.refreshRedisMetrics(client);
    } catch (error) {
      logger.warn('Failed to remove user presence from Redis', {
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      this.refreshFallbackMetrics();
    }
  }

  private async runMaintenance(): Promise<void> {
    const client = this.getRedisClient();
    if (client) {
      await this.cleanupRedisPresence(client);
      await this.refreshRedisMetrics(client);
      return;
    }

    this.cleanupExpiredFallbackSessions();
    this.refreshFallbackMetrics();
  }

  private async cleanupRedisPresence(client: Redis): Promise<void> {
    const cutoff = this.getCutoffTimestamp();

    try {
      await client.zremrangebyscore(GLOBAL_ZSET_KEY, '-inf', cutoff);
      const tenantIds = await client.smembers(ALL_TENANTS_KEY);

      await Promise.all(
        tenantIds.map(async (tenantId) => {
          await client.zremrangebyscore(this.tenantKey(tenantId), '-inf', cutoff);
          const roles = await client.smembers(this.tenantRolesKey(tenantId));
          await Promise.all(
            roles.map((role) =>
              client.zremrangebyscore(this.tenantRoleKey(tenantId, role), '-inf', cutoff),
            ),
          );
        }),
      );
    } catch (error) {
      logger.warn('Failed to clean Redis-backed presence state', {
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  private cleanupExpiredFallbackSessions(): void {
    const cutoff = this.getCutoffTimestamp();

    for (const [userId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.sessions.delete(userId);
        this.lastRedisWriteAt.delete(userId);
      }
    }
  }

  private async getRedisPresenceSnapshot(client: Redis, tenantId?: string): Promise<PresenceSnapshot> {
    const cutoff = this.getCutoffTimestamp();

    if (tenantId) {
      const roles = await client.smembers(this.tenantRolesKey(tenantId));
      const [liveUsers, liveUsersByRole] = await Promise.all([
        client.zcount(this.tenantKey(tenantId), cutoff, '+inf'),
        Promise.all(
          roles.map(async (role) => ({
            role,
            count: await client.zcount(this.tenantRoleKey(tenantId, role), cutoff, '+inf'),
          })),
        ),
      ]);

      return {
        liveUsers,
        liveUsersByRole: liveUsersByRole
          .filter((entry) => entry.count > 0)
          .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role)),
      };
    }

    const tenantIds = await client.smembers(ALL_TENANTS_KEY);
    const roleCounts = new Map<string, number>();
    const total = await client.zcount(GLOBAL_ZSET_KEY, cutoff, '+inf');

    await Promise.all(
      tenantIds.map(async (currentTenantId) => {
        const roles = await client.smembers(this.tenantRolesKey(currentTenantId));
        await Promise.all(
          roles.map(async (role) => {
            const count = await client.zcount(this.tenantRoleKey(currentTenantId, role), cutoff, '+inf');
            roleCounts.set(role, (roleCounts.get(role) || 0) + count);
          }),
        );
      }),
    );

    return {
      liveUsers: total,
      liveUsersByRole: Array.from(roleCounts.entries())
        .filter(([, count]) => count > 0)
        .map(([role, count]) => ({ role, count }))
        .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role)),
    };
  }

  private getFallbackPresenceSnapshot(tenantId?: string): PresenceSnapshot {
    const cutoff = this.getCutoffTimestamp();
    const roleCounts = new Map<string, number>();
    let total = 0;

    for (const session of this.sessions.values()) {
      if (session.lastActivity < cutoff) continue;
      if (tenantId && session.tenantId !== tenantId) continue;

      total += 1;
      roleCounts.set(session.role, (roleCounts.get(session.role) || 0) + 1);
    }

    return {
      liveUsers: total,
      liveUsersByRole: Array.from(roleCounts.entries())
        .map(([role, count]) => ({ role, count }))
        .sort((left, right) => right.count - left.count || left.role.localeCompare(right.role)),
    };
  }

  private refreshFallbackMetrics(): void {
    const globalSnapshot = this.getFallbackPresenceSnapshot();
    this.activeSessionsGlobalGauge.set(globalSnapshot.liveUsers);

    const tenants = new Set<string>();
    for (const session of this.sessions.values()) {
      tenants.add(session.tenantId);
    }

    for (const tenantId of tenants) {
      const snapshot = this.getFallbackPresenceSnapshot(tenantId);
      this.activeSessionsGauge.set({ tenant_id: tenantId }, snapshot.liveUsers);

      for (const role of USER_ROLES) {
        const currentRoleCount =
          snapshot.liveUsersByRole.find((entry) => entry.role === role)?.count || 0;
        this.activeSessionsByRoleGauge.set({ tenant_id: tenantId, role }, currentRoleCount);
      }
    }
  }

  private async refreshRedisMetrics(client: Redis): Promise<void> {
    try {
      const globalSnapshot = await this.getRedisPresenceSnapshot(client);
      this.activeSessionsGlobalGauge.set(globalSnapshot.liveUsers);

      const tenantIds = await client.smembers(ALL_TENANTS_KEY);
      await Promise.all(
        tenantIds.map(async (tenantId) => {
          const snapshot = await this.getRedisPresenceSnapshot(client, tenantId);
          this.activeSessionsGauge.set({ tenant_id: tenantId }, snapshot.liveUsers);

          for (const role of USER_ROLES) {
            const currentRoleCount =
              snapshot.liveUsersByRole.find((entry) => entry.role === role)?.count || 0;
            this.activeSessionsByRoleGauge.set({ tenant_id: tenantId, role }, currentRoleCount);
          }
        }),
      );
    } catch (error) {
      logger.warn('Failed to refresh Redis-backed session metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      this.refreshFallbackMetrics();
    }
  }
}

export default ActiveSessionTracker;
