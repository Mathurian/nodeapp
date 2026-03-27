import { injectable } from 'tsyringe';
import { OFFLINE_SYNC_TELEMETRY_CONFIG } from '../config/offlineSyncTelemetry.config';
import { RedisCacheService } from './RedisCacheService';

const TELEMETRY_NAMESPACE = 'offline-sync-telemetry';

@injectable()
export class TelemetryDedupeStore {
  private readonly cache = new RedisCacheService();

  private buildEventKey(tenantId: string, eventId: string): string {
    return `event:${tenantId}:${eventId}`;
  }

  private buildQuotaKey(scope: 'tenant' | 'actor', identifier: string): string {
    return `quota:${scope}:${identifier}`;
  }

  async isDuplicate(tenantId: string, eventId: string): Promise<boolean> {
    return await this.cache.exists(this.buildEventKey(tenantId, eventId), TELEMETRY_NAMESPACE);
  }

  async markSeen(tenantId: string, eventId: string): Promise<void> {
    const ttlSeconds = Math.max(
      1,
      Math.ceil(OFFLINE_SYNC_TELEMETRY_CONFIG.eventDedupeWindowMs / 1000),
    );

    await this.cache.set(
      this.buildEventKey(tenantId, eventId),
      { seenAt: new Date().toISOString() },
      {
        namespace: TELEMETRY_NAMESPACE,
        ttl: ttlSeconds,
      },
    );
  }

  async incrementTenantQuota(tenantId: string, amount: number): Promise<number> {
    return await this.incrementQuotaCounter(this.buildQuotaKey('tenant', tenantId), amount);
  }

  async incrementActorQuota(actorId: string, amount: number): Promise<number> {
    return await this.incrementQuotaCounter(this.buildQuotaKey('actor', actorId), amount);
  }

  private async incrementQuotaCounter(key: string, amount: number): Promise<number> {
    const value = await this.cache.increment(key, amount, TELEMETRY_NAMESPACE);
    await this.cache.expire(
      key,
      OFFLINE_SYNC_TELEMETRY_CONFIG.quotaWindowSeconds,
      TELEMETRY_NAMESPACE,
    );
    return value;
  }
}
