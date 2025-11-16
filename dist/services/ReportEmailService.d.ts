import { BaseService } from './BaseService';
import { ReportData } from './ReportGenerationService';
import { ReportExportService, ExportFormat } from './ReportExportService';
export interface EmailReportDTO {
    recipients: string[];
    subject?: string;
    message?: string;
    reportData: ReportData;
    format: ExportFormat;
    userId: string;
}
export interface EmailTemplate {
    subject: string;
    html: string;
    text: string;
}
export declare class ReportEmailService extends BaseService {
    private exportService;
    constructor(exportService: ReportExportService);
    sendReportEmail(data: EmailReportDTO): Promise<void>;
    private renderEmailTemplate;
    private isValidEmail;
    sendBatchReportEmails(emails: EmailReportDTO[]): Promise<{
        sent: number;
        failed: number;
        errors: string[];
    }>;
    scheduleReportEmail(data: EmailReportDTO, scheduledAt: Date): Promise<{
        scheduled: boolean;
        scheduledAt: Date;
    }>;
}
//# sourceMappingURL=ReportEmailService.d.ts.map