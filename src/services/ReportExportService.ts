/**
 * Report Export Service
 * Handles PDF, Excel, and CSV export generation
 */

import { injectable } from 'tsyringe';
// @ts-ignore - pdfkit types not available
import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { BaseService } from './BaseService';
import { ReportData } from './ReportGenerationService';

export type ExportFormat = 'pdf' | 'excel' | 'csv';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

interface CSVRow {
  field: string;
  value: string | number;
}

@injectable()
export class ReportExportService extends BaseService {
  /**
   * Export report to specified format
   */
  async exportReport(
    reportData: ReportData,
    format: ExportFormat
  ): Promise<Buffer> {
    try {
      switch (format) {
        case 'pdf':
          return this.generatePDFBuffer(reportData);
        case 'excel':
          return this.generateExcelBuffer(reportData);
        case 'csv':
          return this.generateCSVBuffer(reportData);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      this.handleError(error, { method: 'exportReport', format });
    }
  }

  /**
   * Generate PDF buffer from report data
   */
  async generatePDFBuffer(reportData: ReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks: Buffer[] = [];
        doc.on('data', (chunk: Buffer) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Header
        doc.fontSize(20).text('Event Report', { align: 'center' });
        doc.moveDown();

        // Metadata
        if (reportData.metadata) {
          doc.fontSize(10);
          doc.text(`Generated: ${reportData.metadata.generatedAt}`);
          doc.text(`Report Type: ${reportData.metadata.reportType}`);
          doc.moveDown();
        }

        // Event Information
        if (reportData.event) {
          doc.fontSize(16).text('Event Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Name: ${reportData.event.name}`);
          if (reportData.event.description) {
            doc.text(`Description: ${reportData.event.description}`);
          }
          doc.moveDown();
        }

        // Contest Information
        if (reportData.contest) {
          doc.fontSize(16).text('Contest Information', { underline: true });
          doc.fontSize(12);
          doc.text(`Name: ${reportData.contest.name}`);
          if (reportData.contest.description) {
            doc.text(`Description: ${reportData.contest.description}`);
          }
          doc.moveDown();
        }

        // Winners/Results
        if (reportData.winners && reportData.winners.length > 0) {
          doc.fontSize(16).text('Winners/Results', { underline: true });
          doc.fontSize(12);

          reportData.winners.forEach((winner, index) => {
            const name = winner.contestant?.name || 'Unknown';
            doc.text(
              `${index + 1}. ${name} - Score: ${winner.totalScore}` +
              (winner.totalPossibleScore ? ` / ${winner.totalPossibleScore}` : '')
            );
          });
          doc.moveDown();
        }

        // Statistics
        if (reportData.statistics) {
          doc.fontSize(16).text('Statistics', { underline: true });
          doc.fontSize(12);

          Object.entries(reportData.statistics).forEach(([key, value]) => {
            if (typeof value !== 'object') {
              const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              doc.text(`${label}: ${value}`);
            }
          });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Generate Excel buffer from report data
   */
  async generateExcelBuffer(reportData: ReportData): Promise<Buffer> {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Event Manager System';
      workbook.created = new Date();

      // Main sheet
      const worksheet = workbook.addWorksheet('Report');

      // Header
      worksheet.addRow(['Event Report']);
      worksheet.getCell('A1').font = { size: 16, bold: true };
      worksheet.addRow([]);

      // Metadata
      if (reportData.metadata) {
        worksheet.addRow(['Generated:', reportData.metadata.generatedAt]);
        worksheet.addRow(['Report Type:', reportData.metadata.reportType]);
        worksheet.addRow([]);
      }

      // Event Information
      if (reportData.event) {
        worksheet.addRow(['Event Information']);
        worksheet.addRow(['Name:', reportData.event.name]);
        if (reportData.event.description) {
          worksheet.addRow(['Description:', reportData.event.description]);
        }
        worksheet.addRow([]);
      }

      // Winners
      if (reportData.winners && reportData.winners.length > 0) {
        worksheet.addRow(['Winners/Results']);
        worksheet.addRow(['Rank', 'Contestant', 'Score', 'Possible Score']);

        reportData.winners.forEach((winner, index) => {
          worksheet.addRow([
            index + 1,
            winner.contestant?.name || 'Unknown',
            winner.totalScore,
            winner.totalPossibleScore || 'N/A'
          ]);
        });
        worksheet.addRow([]);
      }

      // Statistics
      if (reportData.statistics) {
        worksheet.addRow(['Statistics']);
        Object.entries(reportData.statistics).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            worksheet.addRow([label, value]);
          }
        });
      }

      // Auto-fit columns
      if (worksheet.columns) {
        worksheet.columns.forEach((column: any) => {
          if (column && column.values) {
            const lengths = column.values.map((v: any) => v ? v.toString().length : 10);
            const maxLength = Math.max(...lengths);
            column.width = maxLength < 10 ? 10 : maxLength + 2;
          }
        });
      }

      const buffer = await workbook.xlsx.writeBuffer();
      return Buffer.from(buffer);
    } catch (error) {
      this.handleError(error, { method: 'generateExcelBuffer' });
    }
  }

  /**
   * Generate CSV buffer from report data
   */
  async generateCSVBuffer(reportData: ReportData): Promise<Buffer> {
    try {
      const rows: CSVRow[] = [];

      // Header
      rows.push({ field: 'Event Report', value: '' });
      rows.push({ field: '', value: '' });

      // Metadata
      if (reportData.metadata) {
        rows.push({ field: 'Generated', value: reportData.metadata.generatedAt });
        rows.push({ field: 'Report Type', value: reportData.metadata.reportType });
        rows.push({ field: '', value: '' });
      }

      // Event Information
      if (reportData.event) {
        rows.push({ field: 'Event Information', value: '' });
        rows.push({ field: 'Name', value: reportData.event.name });
        if (reportData.event.description) {
          rows.push({ field: 'Description', value: reportData.event.description });
        }
        rows.push({ field: '', value: '' });
      }

      // Winners
      if (reportData.winners && reportData.winners.length > 0) {
        rows.push({ field: 'Winners/Results', value: '' });
        rows.push({ field: 'Rank', value: 'Contestant,Score,Possible Score' });

        reportData.winners.forEach((winner, index) => {
          const name = winner.contestant?.name || 'Unknown';
          const score = winner.totalScore;
          const possible = winner.totalPossibleScore || 'N/A';
          rows.push({ field: index + 1, value: `${name},${score},${possible}` });
        });
        rows.push({ field: '', value: '' });
      }

      // Statistics
      if (reportData.statistics) {
        rows.push({ field: 'Statistics', value: '' });
        Object.entries(reportData.statistics).forEach(([key, value]) => {
          if (typeof value !== 'object') {
            const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
            rows.push({ field: label, value });
          }
        });
      }

      // Convert to CSV string
      const csvContent = rows.map(row => `"${row.field}","${row.value}"`).join('\n');
      return Buffer.from(csvContent, 'utf-8');
    } catch (error) {
      this.handleError(error, { method: 'generateCSVBuffer' });
    }
  }

  /**
   * Get MIME type for export format
   */
  getMimeType(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'application/pdf';
      case 'excel':
        return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      case 'csv':
        return 'text/csv';
      default:
        return 'application/octet-stream';
    }
  }

  /**
   * Get file extension for export format
   */
  getFileExtension(format: ExportFormat): string {
    switch (format) {
      case 'pdf':
        return 'pdf';
      case 'excel':
        return 'xlsx';
      case 'csv':
        return 'csv';
      default:
        return 'bin';
    }
  }

  /**
   * Generate filename for export
   */
  generateFilename(reportType: string, format: ExportFormat): string {
    const timestamp = new Date().toISOString().split('T')[0];
    const sanitizedType = reportType.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    return `${sanitizedType}_${timestamp}.${this.getFileExtension(format)}`;
  }
}
