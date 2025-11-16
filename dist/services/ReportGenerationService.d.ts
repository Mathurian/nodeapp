import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export interface ContestantScore {
    contestant: any;
    totalScore: number;
    totalPossibleScore: number | null;
    categoriesParticipated: number;
}
export interface ReportData {
    event?: any;
    contest?: any;
    categories?: any[];
    scores?: any[];
    winners?: ContestantScore[];
    statistics?: any;
    metadata?: {
        generatedAt: string;
        generatedBy?: string;
        reportType: string;
    };
}
export declare class ReportGenerationService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    calculateContestWinners(contest: any): Promise<ContestantScore[]>;
    calculateCategoryTotalPossible(category: any): Promise<number | null>;
    generateEventReportData(eventId: string, userId?: string): Promise<ReportData>;
    generateContestResultsData(contestId: string, userId?: string): Promise<ReportData>;
    generateJudgePerformanceData(judgeId: string, userId?: string): Promise<ReportData>;
    generateSystemAnalyticsData(userId?: string): Promise<ReportData>;
    private calculateCategoryBreakdown;
}
//# sourceMappingURL=ReportGenerationService.d.ts.map