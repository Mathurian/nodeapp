/**
 * Report Service Interface
 */

import { GenerateReportDto, ReportResponseDto } from '../dtos/report.dto'
import { PaginationParams, PaginatedResponse } from '../models/base.types'

export interface IReportService {
  /**
   * Generate a new report
   */
  generateReport(data: GenerateReportDto, userId: string): Promise<ReportResponseDto>

  /**
   * Get report by ID
   */
  getReportById(id: string): Promise<ReportResponseDto | null>

  /**
   * Get all reports with pagination
   */
  getReports(params: PaginationParams): Promise<PaginatedResponse<ReportResponseDto>>

  /**
   * Get reports by event
   */
  getReportsByEvent(eventId: string): Promise<ReportResponseDto[]>

  /**
   * Get reports by contest
   */
  getReportsByContest(contestId: string): Promise<ReportResponseDto[]>

  /**
   * Get reports by category
   */
  getReportsByCategory(categoryId: string): Promise<ReportResponseDto[]>

  /**
   * Delete report
   */
  deleteReport(id: string): Promise<void>

  /**
   * Export report to file
   */
  exportReport(id: string, format: string): Promise<Buffer>

  /**
   * Get report download URL
   */
  getReportDownloadUrl(id: string): Promise<string>
}
