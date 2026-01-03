/**
 * Active Session Tracker
 * Tracks currently logged-in users and exposes session metrics
 */

import { injectable, inject } from 'tsyringe';
import { MetricsService } from './MetricsService';
import { createLogger } from '../utils/logger';
import { Gauge } from 'prom-client';

interface SessionInfo {
  userId: string;
  tenantId: string;
  loginTime: number;
  lastActivity: number;
  userAgent?: string;
}

@injectable()
export class ActiveSessionTracker {
  private log = createLogger('session-tracker');
  private sessions: Map<string, SessionInfo> = new Map();
  private cleanupInterval: NodeJS.Timeout | null = null;
  private activeSessionsGauge: Gauge<string>;
  private tenantsWithSessions: Set<string> = new Set();

  // Session timeout in milliseconds (default: 24 hours to match typical JWT expiry)
  private readonly SESSION_TIMEOUT_MS = 24 * 60 * 60 * 1000;

  constructor(
    @inject(MetricsService) private metricsService: MetricsService
  ) {
    // Create a gauge for active sessions
    const registry = this.metricsService.getRegistry();
    this.activeSessionsGauge = new Gauge({
      name: 'active_user_sessions_total',
      help: 'Number of currently active user sessions (logged in users)',
      labelNames: ['tenant_id'],
      registers: [registry],
    });

    this.log.info('Active session tracker initialized');
  }

  /**
   * Start the session tracker with periodic cleanup
   */
  start(cleanupIntervalMs: number = 60000): void {
    if (this.cleanupInterval) {
      this.log.warn('Session tracker already running');
      return;
    }

    this.log.info(`Starting session tracker (cleanup interval: ${cleanupIntervalMs}ms)`);

    // Run cleanup periodically
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredSessions();
    }, cleanupIntervalMs);
  }

  /**
   * Stop the session tracker
   */
  stop(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      this.log.info('Session tracker stopped');
    }
  }

  /**
   * Track a new user login
   */
  trackLogin(userId: string, tenantId: string, userAgent?: string): void {
    const sessionInfo: SessionInfo = {
      userId,
      tenantId,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      userAgent,
    };

    this.sessions.set(userId, sessionInfo);
    this.updateMetrics();

    this.log.debug(`Session started for user ${userId}, total active: ${this.sessions.size}`);
  }

  /**
   * Track a user logout
   */
  trackLogout(userId: string): void {
    const removed = this.sessions.delete(userId);
    if (removed) {
      this.updateMetrics();
      this.log.debug(`Session ended for user ${userId}, total active: ${this.sessions.size}`);
    }
  }

  /**
   * Update last activity timestamp for a user
   */
  trackActivity(userId: string): void {
    const session = this.sessions.get(userId);
    if (session) {
      session.lastActivity = Date.now();
    }
  }

  /**
   * Get current active session count
   */
  getActiveSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get active session count for a specific tenant
   */
  getActiveSessionCountByTenant(tenantId: string): number {
    let count = 0;
    for (const session of this.sessions.values()) {
      if (session.tenantId === tenantId) {
        count++;
      }
    }
    return count;
  }

  /**
   * Get all active sessions (for admin/debugging)
   */
  getActiveSessions(): SessionInfo[] {
    return Array.from(this.sessions.values());
  }

  /**
   * Cleanup expired sessions based on inactivity
   */
  private cleanupExpiredSessions(): void {
    const now = Date.now();
    let expiredCount = 0;

    for (const [userId, session] of this.sessions.entries()) {
      const inactiveTime = now - session.lastActivity;

      if (inactiveTime > this.SESSION_TIMEOUT_MS) {
        this.sessions.delete(userId);
        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      this.updateMetrics();
      this.log.info(`Cleaned up ${expiredCount} expired sessions, ${this.sessions.size} sessions remaining`);
    }
  }

  /**
   * Update Prometheus metrics
   */
  private updateMetrics(): void {
    // Group sessions by tenant
    const sessionsByTenant = new Map<string, number>();

    for (const session of this.sessions.values()) {
      const currentCount = sessionsByTenant.get(session.tenantId) || 0;
      sessionsByTenant.set(session.tenantId, currentCount + 1);
      this.tenantsWithSessions.add(session.tenantId);
    }

    // Update gauge for each tenant that currently has sessions
    for (const [tenantId, count] of sessionsByTenant.entries()) {
      this.activeSessionsGauge.set({ tenant_id: tenantId }, count);
    }

    // Reset gauge to 0 for tenants that previously had sessions but now have none
    for (const tenantId of this.tenantsWithSessions) {
      if (!sessionsByTenant.has(tenantId)) {
        this.activeSessionsGauge.set({ tenant_id: tenantId }, 0);
        this.log.debug(`Reset session count to 0 for tenant ${tenantId}`);
      }
    }
  }
}

export default ActiveSessionTracker;
