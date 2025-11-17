import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AdvancedReportingService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    generateScoreReport(eventId?: string, contestId?: string, categoryId?: string): Promise<{
        scores: ({
            category: never;
            contestant: never;
            judge: never;
        } & {
            score: number | null;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            tenantId: string;
            isLocked: boolean;
            lockedAt: Date | null;
            categoryId: string;
            criterionId: string | null;
            allowCommentEdit: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            comment: string | null;
            isCertified: boolean;
            lockedBy: string | null;
        })[];
        total: number;
    }>;
    generateSummaryReport(eventId: string): Promise<{
        event: string;
        contests: any;
        categories: any;
        totalScores: any;
    }>;
}
//# sourceMappingURL=AdvancedReportingService.d.ts.map