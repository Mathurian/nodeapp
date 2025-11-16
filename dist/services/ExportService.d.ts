import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
export declare class ExportService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    private ensureExportDir;
    exportEventToExcel(eventId: string, includeDetails?: boolean): Promise<string>;
    exportContestResultsToCSV(contestId: string): Promise<string>;
    exportJudgePerformanceToXML(judgeId: string): Promise<string>;
    exportSystemAnalyticsToPDF(startDate?: string, endDate?: string): Promise<string>;
    getExportHistory(userId: string, limit?: number): Promise<{
        exports: any;
        message: string;
    }>;
}
//# sourceMappingURL=ExportService.d.ts.map