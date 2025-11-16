/**
 * Report Repository Interface
 */

import { GenerateReportDto, ReportResponseDto } from '../dtos/report.dto'
import { IBaseRepository } from './base.repository.interface'

export interface IReportRepository extends IBaseRepository<ReportResponseDto, GenerateReportDto, Partial<ReportResponseDto>> {
  /**
   * Find reports by event
   */
  findByEvent(eventId: string): Promise<ReportResponseDto[]>

  /**
   * Find reports by contest
   */
  findByContest(contestId: string): Promise<ReportResponseDto[]>

  /**
   * Find reports by category
   */
  findByCategory(categoryId: string): Promise<ReportResponseDto[]>

  /**
   * Find reports by user
   */
  findByUser(userId: string): Promise<ReportResponseDto[]>

  /**
   * Find reports by type
   */
  findByType(type: string): Promise<ReportResponseDto[]>

  /**
   * Find reports by status
   */
  findByStatus(status: string): Promise<ReportResponseDto[]>

  /**
   * Update report status
   */
  updateStatus(id: string, status: string): Promise<void>

  /**
   * Update report file URL
   */
  updateFileUrl(id: string, fileUrl: string): Promise<void>
}
