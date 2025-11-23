import { Job } from 'bullmq';
import { BaseJobProcessor } from './BaseJobProcessor';
import queueService from '../services/QueueService';
import { Logger } from '../utils/logger';
import prisma from '../config/database';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
// @ts-ignore - pdfkit doesn't have type definitions
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

/**
 * Report Job Data Interface
 */
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

/**
 * Report Job Processor
 *
 * Generates reports in the background
 *
 * Features:
 * - Multiple report types and formats
 * - Large dataset handling
 * - Progress tracking
 * - File storage
 * - Email notification when complete
 *
 * @example
 * ```typescript
 * // Queue a report generation
 * await queueService.addJob('reports', 'generate-report', {
 *   reportType: 'event',
 *   format: 'pdf',
 *   parameters: { eventId: '123' },
 *   requestedBy: 'user-id',
 *   notifyEmail: 'user@example.com'
 * });
 * ```
 */
export class ReportJobProcessor extends BaseJobProcessor<ReportJobData> {
  private reportsDir: string;

  constructor() {
    super('report-job-processor');
    this.reportsDir = path.join(process.cwd(), 'generated-reports');
  }

  /**
   * Validate report job data
   */
  protected override validate(data: ReportJobData): void {
    super.validate(data);

    if (!data.reportType) {
      throw new Error('Report type is required');
    }

    if (!data.format) {
      throw new Error('Report format is required');
    }

    if (!data.requestedBy) {
      throw new Error('Requested by user ID is required');
    }

    const validFormats = ['pdf', 'csv', 'xlsx', 'html'];
    if (!validFormats.includes(data.format)) {
      throw new Error(`Invalid format. Must be one of: ${validFormats.join(', ')}`);
    }
  }

  /**
   * Process report generation job
   */
  async process(job: Job<ReportJobData>): Promise<any> {
    this.validate(job.data);

    const { reportType, format, parameters, requestedBy, notifyEmail } = job.data;

    try {
      // Ensure reports directory exists
      await fs.mkdir(this.reportsDir, { recursive: true });

      // Update progress
      await job.updateProgress(10);

      // Fetch data for report
      this.logger.info('Fetching report data', { reportType, parameters });
      const data = await this.fetchReportData(reportType, parameters);

      await job.updateProgress(40);

      // Generate report file
      this.logger.info('Generating report file', { reportType, format });
      const filename = `report-${reportType}-${Date.now()}.${format}`;
      const filePath = path.join(this.reportsDir, filename);

      await this.generateReportFile(data, format, filePath, job);

      await job.updateProgress(80);

      // Get file size
      const stats = await fs.stat(filePath);
      const fileSize = stats.size;

      // Save report metadata to database
      const report = await prisma.report.create({
        data: {
          tenantId: (job.data as any).tenantId || 'default_tenant',
          name: `${reportType} Report`,
          type: reportType,
          parameters: JSON.stringify(parameters),
          format,
          filePath: filePath || '',
          fileSize: fileSize || 0,
          generatedBy: requestedBy
        },
      });

      await job.updateProgress(90);

      // Send notification email if requested
      if (notifyEmail) {
        await queueService.addJob('email', 'send-email', {
          to: notifyEmail,
          subject: 'Your Report is Ready',
          html: `
            <p>Your ${reportType} report has been generated successfully.</p>
            <p>Report ID: ${report.id}</p>
            <p>Format: ${format.toUpperCase()}</p>
            <p>File Size: ${this.formatFileSize(fileSize)}</p>
            <p>You can download it from the reports section.</p>
          `,
        });
      }

      await job.updateProgress(100);

      return {
        success: true,
        reportId: report.id,
        filePath,
        fileSize,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      this.logger.error('Failed to generate report', {
        jobId: job.id,
        reportType,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  }

  /**
   * Fetch data for report
   */
  private async fetchReportData(
    reportType: string,
    parameters: Record<string, any>
  ): Promise<any> {
    switch (reportType) {
      case 'event':
        return await this.fetchEventReportData(parameters);
      case 'scoring':
        return await this.fetchScoringReportData(parameters);
      case 'audit':
        return await this.fetchAuditReportData(parameters);
      default:
        throw new Error(`Unknown report type: ${reportType}`);
    }
  }

  /**
   * Fetch event report data
   */
  private async fetchEventReportData(parameters: Record<string, any>) {
    const { eventId } = parameters;

    if (!eventId) {
      throw new Error('Event ID is required for event report');
    }

    const event: any = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        contests: {
          include: {
            categories: true,
          },
        },
      } as any,
    } as any);

    if (!event) {
      throw new Error(`Event not found: ${eventId}`);
    }

    return event;
  }

  /**
   * Fetch scoring report data
   */
  private async fetchScoringReportData(parameters: Record<string, any>) {
    const { categoryId } = parameters;

    if (!categoryId) {
      throw new Error('Category ID is required for scoring report');
    }

    const scores: any = await prisma.score.findMany({
      where: { categoryId },
      include: {
        judge: true,
        contestant: true,
        criterion: true,
      } as any,
      orderBy: { createdAt: 'desc' },
    } as any);

    return scores;
  }

  /**
   * Fetch audit report data
   */
  private async fetchAuditReportData(parameters: Record<string, any>) {
    const { startDate, endDate, userId } = parameters;

    const where: any = {};

    if (startDate) {
      where.createdAt = { gte: new Date(startDate) };
    }

    if (endDate) {
      where.createdAt = { ...where.createdAt, lte: new Date(endDate) };
    }

    if (userId) {
      where.userId = userId;
    }

    const logs = await prisma.activityLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10000, // Limit to prevent memory issues
    });

    return logs;
  }

  /**
   * Generate report file
   */
  private async generateReportFile(
    data: any,
    format: string,
    filePath: string,
    _job: Job
  ): Promise<void> {
    switch (format) {
      case 'csv':
        await this.generateCSV(data, filePath);
        break;
      case 'html':
        await this.generateHTML(data, filePath);
        break;
      case 'pdf':
        await this.generatePDF(data, filePath);
        break;
      case 'xlsx':
        await this.generateExcel(data, filePath);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }
  }

  /**
   * Generate CSV file
   */
  private async generateCSV(data: any, filePath: string): Promise<void> {
    // Simple CSV generation (you might want to use a library like csv-writer)
    let csv = '';

    if (Array.isArray(data)) {
      if (data.length > 0) {
        // Header row
        const headers = Object.keys(data[0]);
        csv += headers.join(',') + '\n';

        // Data rows
        data.forEach((row) => {
          const values = headers.map((header) => {
            const value = row[header];
            // Escape commas and quotes
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          csv += values.join(',') + '\n';
        });
      }
    } else {
      // Single object - convert to two-row CSV
      const headers = Object.keys(data);
      csv += headers.join(',') + '\n';
      csv += headers.map((h) => data[h]).join(',') + '\n';
    }

    await fs.writeFile(filePath, csv, 'utf-8');
  }

  /**
   * Generate HTML file
   */
  private async generateHTML(data: any, filePath: string): Promise<void> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
  </style>
</head>
<body>
  <h1>Report</h1>
  <pre>${JSON.stringify(data, null, 2)}</pre>
</body>
</html>
    `;

    await fs.writeFile(filePath, html, 'utf-8');
  }

  /**
   * Generate PDF file
   */
  private async generatePDF(data: any, filePath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = createWriteStream(filePath);

        doc.pipe(stream);

        // Title
        doc.fontSize(20).text('Report', { align: 'center' });
        doc.moveDown();

        // Generated timestamp
        doc.fontSize(12).text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Report data
        if (Array.isArray(data)) {
          doc.fontSize(16).text('Report Data', { underline: true });
          doc.moveDown();

          // Display array data as table-like format
          data.slice(0, 100).forEach((item, index) => {
            doc.fontSize(12).text(`Record ${index + 1}:`, { underline: true });
            doc.fontSize(10);
            Object.entries(item).forEach(([key, value]) => {
              const displayValue = value !== null && value !== undefined
                ? String(value).substring(0, 100)
                : 'N/A';
              doc.text(`  ${key}: ${displayValue}`);
            });
            doc.moveDown();
          });

          if (data.length > 100) {
            doc.fontSize(10).text(`... and ${data.length - 100} more records`);
          }
        } else if (typeof data === 'object' && data !== null) {
          // Single object data
          doc.fontSize(16).text('Report Details', { underline: true });
          doc.moveDown();

          doc.fontSize(12);
          Object.entries(data).forEach(([key, value]) => {
            const displayValue = value !== null && value !== undefined
              ? String(value).substring(0, 200)
              : 'N/A';
            doc.text(`${key}: ${displayValue}`);
          });
        } else {
          // Fallback for other data types
          doc.fontSize(12).text(String(data));
        }

        // Footer
        doc.fontSize(8).text(
          'Generated by Event Manager System',
          50,
          doc.page.height - 50,
          { align: 'center' }
        );

        // Finalize PDF
        doc.end();

        stream.on('finish', () => {
          resolve();
        });

        stream.on('error', (error) => {
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel file
   */
  private async generateExcel(data: any, filePath: string): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Event Manager System';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Report Data');

    if (Array.isArray(data) && data.length > 0) {
      // Get column headers from first object
      const headers = Object.keys(data[0]);

      sheet.columns = headers.map(header => ({
        header,
        key: header,
        width: 20,
      }));

      // Add data rows
      data.forEach(row => {
        sheet.addRow(row);
      });

      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    } else if (typeof data === 'object' && data !== null) {
      // Single object - create key-value pairs
      sheet.columns = [
        { header: 'Field', key: 'field', width: 30 },
        { header: 'Value', key: 'value', width: 50 },
      ];

      Object.entries(data).forEach(([key, value]) => {
        sheet.addRow({
          field: key,
          value: value !== null && value !== undefined ? String(value) : 'N/A',
        });
      });

      // Style header row
      sheet.getRow(1).font = { bold: true };
      sheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4472C4' },
      };
      sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    }

    // Add summary sheet
    const summarySheet = workbook.addWorksheet('Summary');
    summarySheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 20 },
    ];

    summarySheet.addRows([
      { metric: 'Report Generated', value: new Date().toLocaleString() },
      { metric: 'Total Records', value: Array.isArray(data) ? data.length : 1 },
      { metric: 'Generated By', value: 'Event Manager System' },
    ]);

    summarySheet.getRow(1).font = { bold: true };
    summarySheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' },
    };
    summarySheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Format file size
   */
  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

/**
 * Initialize Report Queue Worker
 */
export const initializeReportWorker = (concurrency: number = 2) => {
  const processor = new ReportJobProcessor();

  const worker = queueService.createWorker(
    'reports',
    async (job) => await processor.handle(job),
    concurrency
  );

  const initLogger = new Logger('ReportWorker');
  initLogger.info('Report worker initialized', { concurrency });

  return worker;
};

export default ReportJobProcessor;
