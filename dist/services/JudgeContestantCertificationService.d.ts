import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class JudgeContestantCertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getCertifications(judgeId?: string, categoryId?: string, contestantId?: string): Promise<{
        id: string;
        judgeId: string;
        contestantId: string;
        tenantId: string;
        categoryId: string;
        certifiedAt: Date;
        comments: string | null;
    }[]>;
    certify(data: any): Promise<{
        id: string;
        judgeId: string;
        contestantId: string;
        tenantId: string;
        categoryId: string;
        certifiedAt: Date;
        comments: string | null;
    }>;
    uncertify(id: string): Promise<void>;
    getCategoryCertificationStatus(categoryId: string): Promise<{
        categoryId: string;
        categoryName: any;
        totalJudges: number;
        totalContestants: number;
        expectedCertifications: number;
        completedCertifications: any;
        completionPercentage: number;
        certificationsByJudge: unknown[];
        certificationsByContestant: unknown[];
        allCertifications: any;
    }>;
}
//# sourceMappingURL=JudgeContestantCertificationService.d.ts.map