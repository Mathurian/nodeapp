import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class AdvancedReportingService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    generateScoreReport(eventId?: string, contestId?: string, categoryId?: string): Promise<{
        scores: any;
        total: any;
    }>;
    generateSummaryReport(eventId: string): Promise<{
        event: any;
        contests: any;
        categories: any;
        totalScores: any;
    }>;
}
//# sourceMappingURL=AdvancedReportingService.d.ts.map