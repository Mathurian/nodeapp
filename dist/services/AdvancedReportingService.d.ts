import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AdvancedReportingService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    generateScoreReport(eventId?: string, contestId?: string, categoryId?: string): Promise<{
        scores: ({
            category: {
                contest: {
                    name: string;
                };
                name: string;
            };
            contestant: {
                name: string;
            };
            judge: {
                name: string;
            };
        } & {
            score: number | null;
            id: string;
            judgeId: string;
            contestantId: string;
            createdAt: Date;
            updatedAt: Date;
            isLocked: boolean;
            lockedAt: Date | null;
            categoryId: string;
            criterionId: string | null;
            comment: string | null;
            allowCommentEdit: boolean;
            isCertified: boolean;
            certifiedAt: Date | null;
            certifiedBy: string | null;
            lockedBy: string | null;
        })[];
        total: number;
    }>;
    generateSummaryReport(eventId: string): Promise<{
        event: string;
        contests: number;
        categories: number;
        totalScores: number;
    }>;
}
//# sourceMappingURL=AdvancedReportingService.d.ts.map