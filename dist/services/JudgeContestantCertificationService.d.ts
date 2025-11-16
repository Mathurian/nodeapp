import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class JudgeContestantCertificationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getCertifications(judgeId?: string, categoryId?: string, contestantId?: string): Promise<{
        id: string;
        categoryId: string;
        judgeId: string;
        contestantId: string;
        certifiedAt: Date;
        comments: string | null;
    }[]>;
    certify(data: any): Promise<{
        id: string;
        categoryId: string;
        judgeId: string;
        contestantId: string;
        certifiedAt: Date;
        comments: string | null;
    }>;
    uncertify(id: string): Promise<void>;
    getCategoryCertificationStatus(categoryId: string): Promise<{
        categoryId: string;
        categoryName: string;
        totalJudges: number;
        totalContestants: number;
        expectedCertifications: number;
        completedCertifications: number;
        completionPercentage: number;
        certificationsByJudge: unknown[];
        certificationsByContestant: unknown[];
        allCertifications: {
            id: string;
            categoryId: string;
            judgeId: string;
            contestantId: string;
            certifiedAt: Date;
            comments: string | null;
        }[];
    }>;
}
//# sourceMappingURL=JudgeContestantCertificationService.d.ts.map