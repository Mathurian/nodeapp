import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class ContestCertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getCertificationProgress(contestId: string): Promise<{
        contestId: string;
        tallyMaster: boolean;
        auditor: boolean;
        board: boolean;
        organizer: boolean;
        certifications: any;
    }>;
    certifyContest(contestId: string, userId: string, userRole: string, tenantId: string): Promise<{
        id: string;
        role: string;
        tenantId: string;
        userId: string;
        contestId: string;
        certifiedAt: Date;
        comments: string | null;
    }>;
}
//# sourceMappingURL=ContestCertificationService.d.ts.map