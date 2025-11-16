import { PrismaClient, Notification, NotificationType } from '@prisma/client';
export interface CreateNotificationDTO {
    tenantId: string;
    userId: string;
    type: NotificationType;
    title: string;
    message: string;
    link?: string;
    metadata?: Record<string, any>;
}
export interface NotificationFilters {
    userId: string;
    read?: boolean;
    type?: NotificationType;
    limit?: number;
    offset?: number;
}
export declare class NotificationRepository {
    private prisma;
    constructor(prisma: PrismaClient);
    create(data: CreateNotificationDTO): Promise<Notification>;
    createMany(userIds: string[], notification: Omit<CreateNotificationDTO, 'userId'>): Promise<number>;
    findByUser(filters: NotificationFilters): Promise<Notification[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<number>;
    delete(id: string, userId: string): Promise<Notification>;
    deleteOldRead(userId: string, daysOld?: number): Promise<number>;
    findById(id: string): Promise<Notification | null>;
}
//# sourceMappingURL=NotificationRepository.d.ts.map