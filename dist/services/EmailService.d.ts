import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export interface EmailConfig {
    enabled: boolean;
    host: string;
    port: number;
    user: string;
    from: string;
}
export declare class EmailService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getConfig(): Promise<EmailConfig>;
    sendEmail(to: string, subject: string, body: string): Promise<{
        success: boolean;
        to: string;
        subject: string;
    }>;
    sendBulkEmail(recipients: string[], subject: string, body: string): Promise<any[]>;
}
//# sourceMappingURL=EmailService.d.ts.map