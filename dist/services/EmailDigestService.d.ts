import { NotificationRepository } from '../repositories/NotificationRepository';
import { NotificationPreferenceRepository } from '../repositories/NotificationPreferenceRepository';
import { EmailService } from './EmailService';
export interface DigestNotification {
    id: string;
    type: string;
    title: string;
    message: string;
    link?: string;
    createdAt: Date;
}
export declare class EmailDigestService {
    private notificationRepository;
    private preferenceRepository;
    private emailService;
    constructor(notificationRepository: NotificationRepository, preferenceRepository: NotificationPreferenceRepository, emailService: EmailService);
    sendDailyDigests(): Promise<number>;
    sendWeeklyDigests(): Promise<number>;
    private sendDigests;
    sendDigestToUser(userId: string, frequency: string, tenantId: string): Promise<boolean>;
    private getTimeRange;
    private groupNotifications;
    private generateDigestHTML;
    private getTimeAgo;
    private updateDigestRecord;
    private getNextSendTime;
    getDueDigests(): Promise<Array<{
        userId: string;
        frequency: string;
    }>>;
}
//# sourceMappingURL=EmailDigestService.d.ts.map