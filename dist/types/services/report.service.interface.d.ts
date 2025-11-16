import { GenerateReportDto, ReportResponseDto } from '../dtos/report.dto';
import { PaginationParams, PaginatedResponse } from '../models/base.types';
export interface IReportService {
    generateReport(data: GenerateReportDto, userId: string): Promise<ReportResponseDto>;
    getReportById(id: string): Promise<ReportResponseDto | null>;
    getReports(params: PaginationParams): Promise<PaginatedResponse<ReportResponseDto>>;
    getReportsByEvent(eventId: string): Promise<ReportResponseDto[]>;
    getReportsByContest(contestId: string): Promise<ReportResponseDto[]>;
    getReportsByCategory(categoryId: string): Promise<ReportResponseDto[]>;
    deleteReport(id: string): Promise<void>;
    exportReport(id: string, format: string): Promise<Buffer>;
    getReportDownloadUrl(id: string): Promise<string>;
}
//# sourceMappingURL=report.service.interface.d.ts.map