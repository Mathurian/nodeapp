import { BaseService } from './BaseService';
import { ReportData } from './ReportGenerationService';
export type ExportFormat = 'pdf' | 'excel' | 'csv';
export interface ExportOptions {
    format: ExportFormat;
    filename?: string;
    metadata?: Record<string, any>;
}
export declare class ReportExportService extends BaseService {
    exportReport(reportData: ReportData, format: ExportFormat): Promise<Buffer>;
    generatePDFBuffer(reportData: ReportData): Promise<Buffer>;
    generateExcelBuffer(reportData: ReportData): Promise<Buffer>;
    generateCSVBuffer(reportData: ReportData): Promise<Buffer>;
    getMimeType(format: ExportFormat): string;
    getFileExtension(format: ExportFormat): string;
    generateFilename(reportType: string, format: ExportFormat): string;
}
//# sourceMappingURL=ReportExportService.d.ts.map