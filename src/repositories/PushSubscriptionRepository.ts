import { injectable } from 'tsyringe';
import { PrismaClient, PushSubscription } from '@prisma/client';
import prisma from '../config/database';

export interface PushSubscriptionInput {
  tenantId: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  expirationTime?: number | null;
  userAgent?: string | null;
}

@injectable()
export class PushSubscriptionRepository {
  constructor(private prismaClient: PrismaClient = prisma) {}

  async upsert(data: PushSubscriptionInput): Promise<PushSubscription> {
    const expirationTime = typeof data.expirationTime === 'number'
      ? new Date(data.expirationTime)
      : null;

    return this.prismaClient.pushSubscription.upsert({
      where: {
        tenantId_endpoint: {
          tenantId: data.tenantId,
          endpoint: data.endpoint,
        },
      },
      update: {
        userId: data.userId,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        expirationTime,
        userAgent: data.userAgent || null,
        isActive: true,
        lastUsedAt: new Date(),
      },
      create: {
        tenantId: data.tenantId,
        userId: data.userId,
        endpoint: data.endpoint,
        p256dh: data.keys.p256dh,
        auth: data.keys.auth,
        expirationTime,
        userAgent: data.userAgent || null,
        isActive: true,
        lastUsedAt: new Date(),
      },
    });
  }

  async findActiveByUserIds(tenantId: string, userIds: string[]): Promise<PushSubscription[]> {
    if (userIds.length === 0) {
      return [];
    }

    const now = new Date();
    return this.prismaClient.pushSubscription.findMany({
      where: {
        tenantId,
        userId: { in: userIds },
        isActive: true,
        OR: [
          { expirationTime: null },
          { expirationTime: { gt: now } },
        ],
      },
    });
  }

  async findActiveByUserId(tenantId: string, userId: string): Promise<PushSubscription[]> {
    return this.findActiveByUserIds(tenantId, [userId]);
  }

  async deactivateByEndpoint(tenantId: string, userId: string, endpoint: string): Promise<number> {
    const result = await this.prismaClient.pushSubscription.updateMany({
      where: {
        tenantId,
        userId,
        endpoint,
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  async deactivateInvalidEndpoints(tenantId: string, endpoints: string[]): Promise<number> {
    if (endpoints.length === 0) {
      return 0;
    }

    const result = await this.prismaClient.pushSubscription.updateMany({
      where: {
        tenantId,
        endpoint: { in: endpoints },
      },
      data: {
        isActive: false,
      },
    });

    return result.count;
  }

  async removeByEndpoint(tenantId: string, userId: string, endpoint: string): Promise<number> {
    const result = await this.prismaClient.pushSubscription.deleteMany({
      where: {
        tenantId,
        userId,
        endpoint,
      },
    });

    return result.count;
  }

  async touchByEndpoints(tenantId: string, endpoints: string[]): Promise<number> {
    if (endpoints.length === 0) {
      return 0;
    }

    const result = await this.prismaClient.pushSubscription.updateMany({
      where: {
        tenantId,
        endpoint: { in: endpoints },
      },
      data: {
        lastUsedAt: new Date(),
      },
    });

    return result.count;
  }
}
