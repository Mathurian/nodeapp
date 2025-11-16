import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';
import { PrintTemplate, PrintTemplateInput, PrintEventReportInput, PrintContestResultsInput, PrintJudgePerformanceInput, PrintOutput } from '../types/print.types';
export declare class PrintService extends BaseService {
    private prisma;
    private readonly templatesDir;
    constructor(prisma: PrismaClient);
    private ensureTemplatesDir;
    getPrintTemplates(): Promise<PrintTemplate[]>;
    createPrintTemplate(data: PrintTemplateInput, userId: string): Promise<any>;
    updatePrintTemplate(id: string, data: Partial<PrintTemplateInput>): Promise<any>;
    deletePrintTemplate(id: string): Promise<void>;
    printEventReport(input: PrintEventReportInput, userName: string): Promise<PrintOutput>;
    printContestResults(input: PrintContestResultsInput, userName: string): Promise<PrintOutput>;
    printJudgePerformance(input: PrintJudgePerformanceInput, userName: string): Promise<PrintOutput>;
    getContestantReport(id: string): Promise<any>;
    getJudgeReport(id: string): Promise<any>;
    getCategoryReport(id: string): Promise<any>;
    getContestReport(id: string): Promise<any>;
    getArchivedContestReport(id: string): Promise<any>;
    private getTemplateContent;
    private generateReport;
    private calculateScoreDistribution;
    private getDefaultEventTemplate;
    private getDefaultContestTemplate;
    private getDefaultJudgeTemplate;
}
//# sourceMappingURL=PrintService.d.ts.map