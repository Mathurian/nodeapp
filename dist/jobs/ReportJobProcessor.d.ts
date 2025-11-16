import { Job } from 'bullmq';
import { BaseJobProcessor } from './BaseJobProcessor';
export interface ReportJobData {
    reportType: 'event' | 'scoring' | 'audit' | 'custom';
    format: 'pdf' | 'csv' | 'xlsx' | 'html';
    parameters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
        startDate?: string;
        endDate?: string;
        userId?: string;
        [key: string]: any;
    };
    requestedBy: string;
    notifyEmail?: string;
}
export declare class ReportJobProcessor extends BaseJobProcessor<ReportJobData> {
    private reportsDir;
    constructor();
    protected validate(data: ReportJobData): void;
    process(job: Job<ReportJobData>): Promise<any>;
    private fetchReportData;
    private fetchEventReportData;
    private fetchScoringReportData;
    private fetchAuditReportData;
    private generateReportFile;
    private generateCSV;
    private generateHTML;
    private formatFileSize;
}
export declare const initializeReportWorker: (concurrency?: number) => import("bullmq").Worker<any, any, string>;
export default ReportJobProcessor;
//# sourceMappingURL=ReportJobProcessor.d.ts.map