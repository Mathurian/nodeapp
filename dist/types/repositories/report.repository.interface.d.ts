import { GenerateReportDto, ReportResponseDto } from '../dtos/report.dto';
import { IBaseRepository } from './base.repository.interface';
export interface IReportRepository extends IBaseRepository<ReportResponseDto, GenerateReportDto, Partial<ReportResponseDto>> {
    findByEvent(eventId: string): Promise<ReportResponseDto[]>;
    findByContest(contestId: string): Promise<ReportResponseDto[]>;
    findByCategory(categoryId: string): Promise<ReportResponseDto[]>;
    findByUser(userId: string): Promise<ReportResponseDto[]>;
    findByType(type: string): Promise<ReportResponseDto[]>;
    findByStatus(status: string): Promise<ReportResponseDto[]>;
    updateStatus(id: string, status: string): Promise<void>;
    updateFileUrl(id: string, fileUrl: string): Promise<void>;
}
//# sourceMappingURL=report.repository.interface.d.ts.map