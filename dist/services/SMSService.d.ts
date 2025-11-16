import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export interface SMSSettings {
    enabled: boolean;
    apiKey: string;
    apiSecret: string;
    fromNumber: string;
    provider: string;
}
export declare class SMSService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getSettings(): Promise<SMSSettings>;
    updateSettings(data: SMSSettings, userId?: string): Promise<void>;
    sendSMS(to: string, message: string): Promise<any>;
}
//# sourceMappingURL=SMSService.d.ts.map