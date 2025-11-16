import { PrismaClient, NotificationPreference } from '@prisma/client';
export interface CreateNotificationPreferenceDTO {
    tenantId: string;
    userId: string;
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
    emailDigestFrequency?: string;
    emailTypes?: string[];
    pushTypes?: string[];
    inAppTypes?: string[];
    quietHoursStart?: number;
    quietHoursEnd?: number;
}
export interface UpdateNotificationPreferenceDTO {
    emailEnabled?: boolean;
    pushEnabled?: boolean;
    inAppEnabled?: boolean;
    emailDigestFrequency?: string;
    emailTypes?: string[];
    pushTypes?: string[];
    inAppTypes?: string[];
    quietHoursStart?: number;
    quietHoursEnd?: number;
}
export declare class NotificationPreferenceRepository {
    private prismaClient;
    constructor(prismaClient?: PrismaClient);
    findByUserId(tenantId: string, userId: string): Promise<NotificationPreference | null>;
    create(data: CreateNotificationPreferenceDTO): Promise<NotificationPreference>;
    update(tenantId: string, userId: string, data: UpdateNotificationPreferenceDTO): Promise<NotificationPreference>;
    getOrCreate(tenantId: string, userId: string): Promise<NotificationPreference>;
    delete(tenantId: string, userId: string): Promise<NotificationPreference>;
    isNotificationTypeEnabled(tenantId: string, userId: string, type: 'email' | 'push' | 'inApp', notificationType?: string): Promise<boolean>;
    isInQuietHours(tenantId: string, userId: string): Promise<boolean>;
    getUsersForDigest(frequency: string): Promise<NotificationPreference[]>;
}
//# sourceMappingURL=NotificationPreferenceRepository.d.ts.map