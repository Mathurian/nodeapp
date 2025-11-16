import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
interface MFASetupResponse {
    secret: string;
    qrCode: string;
    backupCodes: string[];
    manualEntryKey: string;
}
interface MFAVerifyResponse {
    success: boolean;
    message: string;
    remainingBackupCodes?: number;
}
export declare class MFAService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    generateMFASecret(userId: string): Promise<MFASetupResponse>;
    enableMFA(userId: string, secret: string, token: string, backupCodes: string[]): Promise<{
        success: boolean;
        message: string;
    }>;
    disableMFA(userId: string, password: string): Promise<{
        success: boolean;
        message: string;
    }>;
    verifyMFAToken(userId: string, token: string): Promise<MFAVerifyResponse>;
    regenerateBackupCodes(userId: string): Promise<string[]>;
    getMFAStatus(userId: string): Promise<{
        enabled: boolean;
        method?: string;
        enrolledAt?: Date;
        backupCodesRemaining?: number;
    }>;
    private generateBackupCodes;
    private hashBackupCode;
}
export default MFAService;
//# sourceMappingURL=MFAService.d.ts.map