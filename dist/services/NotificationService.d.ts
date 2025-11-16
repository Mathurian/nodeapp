import { Notification } from '@prisma/client';
import { NotificationRepository, CreateNotificationDTO } from '../repositories/NotificationRepository';
import { Server as SocketIOServer } from 'socket.io';
export declare class NotificationService {
    private notificationRepository;
    private io;
    constructor(notificationRepository: NotificationRepository);
    setSocketIO(io: SocketIOServer): void;
    createNotification(data: CreateNotificationDTO): Promise<Notification>;
    broadcastNotification(userIds: string[], notification: Omit<CreateNotificationDTO, 'userId'>): Promise<number>;
    getUserNotifications(userId: string, limit?: number, offset?: number): Promise<Notification[]>;
    getUnreadCount(userId: string): Promise<number>;
    markAsRead(id: string, userId: string): Promise<Notification>;
    markAllAsRead(userId: string): Promise<number>;
    deleteNotification(id: string, userId: string): Promise<Notification>;
    cleanupOldNotifications(userId: string, daysOld?: number): Promise<number>;
    notifyScoreSubmitted(tenantId: string, userId: string, contestantName: string, categoryName: string): Promise<Notification>;
    notifyContestCertified(tenantId: string, userId: string, contestName: string): Promise<Notification>;
    notifyAssignmentChange(tenantId: string, userId: string, contestName: string, action: 'assigned' | 'removed'): Promise<Notification>;
    notifyReportReady(tenantId: string, userId: string, reportName: string, reportId: string): Promise<Notification>;
    notifyCertificationRequired(tenantId: string, userId: string, contestName: string, level: number): Promise<Notification>;
    notifyRoleChange(tenantId: string, userId: string, newRole: string): Promise<Notification>;
    notifyEventStatusChange(tenantId: string, userId: string, eventName: string, newStatus: string): Promise<Notification>;
    notifySystemMaintenance(tenantId: string, message: string, affectedUserIds: string[]): Promise<number>;
    notifyError(tenantId: string, userId: string, title: string, message: string): Promise<Notification>;
}
//# sourceMappingURL=NotificationService.d.ts.map