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
        certifications: {
            id: string;
            role: string;
            tenantId: string;
            certifiedAt: Date;
            contestId: string;
            userId: string;
            comments: string | null;
        }[];
    }>;
    certifyContest(contestId: string, userId: string, userRole: string): Promise<{
        id: string;
        role: string;
        tenantId: string;
        certifiedAt: Date;
        contestId: string;
        userId: string;
        comments: string | null;
    }>;
}
//# sourceMappingURL=ContestCertificationService.d.ts.map