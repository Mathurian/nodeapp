import { BaseEntity } from '../models/base.types';
export interface GenerateReportDto {
    eventId?: string;
    contestId?: string;
    categoryId?: string;
    reportType: ReportType;
    format?: ReportFormat;
    includeScores?: boolean;
    includeComments?: boolean;
    includeDeductions?: boolean;
}
export interface ReportResponseDto extends BaseEntity {
    name: string;
    type: ReportType;
    eventId: string | null;
    contestId: string | null;
    categoryId: string | null;
    generatedBy: string;
    format: ReportFormat;
    status: ReportStatus;
    fileUrl: string | null;
}
export type ReportType = 'FULL' | 'SUMMARY' | 'SCORES' | 'RANKINGS' | 'WINNERS' | 'CERTIFICATION' | 'AUDIT' | 'CUSTOM';
export type ReportFormat = 'PDF' | 'CSV' | 'XLSX' | 'JSON';
export type ReportStatus = 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
//# sourceMappingURL=report.dto.d.ts.map