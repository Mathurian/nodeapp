import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class CategoryCertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getCertificationProgress(categoryId: string): Promise<{
        categoryId: string;
        judgeProgress: {
            contestantsCertified: any;
            totalContestants: any;
            isCategoryCertified: boolean;
        };
        tallyMasterProgress: {
            isCategoryCertified: boolean;
        };
        auditorProgress: {
            isCategoryCertified: boolean;
        };
        boardProgress: {
            isCategoryCertified: boolean;
        };
    }>;
    certifyCategory(categoryId: string, userId: string, userRole: string, tenantId: string): Promise<{
        id: string;
        role: string;
        tenantId: string;
        userId: string;
        categoryId: string;
        certifiedAt: Date;
        comments: string | null;
        signatureName: string | null;
    }>;
}
//# sourceMappingURL=CategoryCertificationService.d.ts.map