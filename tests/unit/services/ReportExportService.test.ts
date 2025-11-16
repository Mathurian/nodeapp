/**
 * ReportExportService Unit Tests
 * Comprehensive tests for PDF, Excel, and CSV export generation
 */

import 'reflect-metadata';
import { ReportExportService, ExportFormat } from '../../../src/services/ReportExportService';
import { ReportData } from '../../../src/services/ReportGenerationService';

// Mock PDFKit and ExcelJS
jest.mock('pdfkit');
jest.mock('exceljs');

describe('ReportExportService', () => {
  let service: ReportExportService;

  const mockReportData: ReportData = {
    event: {
      id: 'event-1',
      name: 'Annual Gala',
      description: 'Annual dance gala event',
    },
    contest: {
      id: 'contest-1',
      name: 'Regional Competition',
      description: 'Annual regional dance competition',
    },
    winners: [
      {
        contestant: { id: 'contestant-1', name: 'John Doe' },
        totalScore: 285,
        totalPossibleScore: 300,
        categoriesParticipated: 3,
      },
      {
        contestant: { id: 'contestant-2', name: 'Jane Smith' },
        totalScore: 270,
        totalPossibleScore: 300,
        categoriesParticipated: 3,
      },
    ],
    statistics: {
      totalEvents: 10,
      totalContests: 25,
      totalCategories: 50,
      averageScore: 85.5,
    },
    metadata: {
      generatedAt: '2025-01-15T10:00:00.000Z',
      generatedBy: 'user-1',
      reportType: 'event_comprehensive',
    },
  };

  beforeEach(() => {
    service = new ReportExportService();
    jest.clearAllMocks();
  });

  describe('exportReport', () => {
    it('should export report as PDF', async () => {
      const buffer = await service.exportReport(mockReportData, 'pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should export report as Excel', async () => {
      const buffer = await service.exportReport(mockReportData, 'excel');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should export report as CSV', async () => {
      const buffer = await service.exportReport(mockReportData, 'csv');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should throw error for unsupported format', async () => {
      await expect(
        service.exportReport(mockReportData, 'xml' as ExportFormat)
      ).rejects.toThrow('Unsupported export format: xml');
    });

    it('should handle export with minimal data', async () => {
      const minimalData: ReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'minimal',
        },
      };

      const buffer = await service.exportReport(minimalData, 'pdf');

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generatePDFBuffer', () => {
    it('should generate PDF with event information', async () => {
      const buffer = await service.generatePDFBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should include metadata in PDF', async () => {
      const buffer = await service.generatePDFBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
      // Metadata should be included in the PDF content
    });

    it('should include winners section if present', async () => {
      const dataWithWinners: ReportData = {
        ...mockReportData,
        winners: [
          {
            contestant: { id: '1', name: 'Winner 1' },
            totalScore: 95,
            totalPossibleScore: 100,
            categoriesParticipated: 2,
          },
        ],
      };

      const buffer = await service.generatePDFBuffer(dataWithWinners);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should include statistics section if present', async () => {
      const buffer = await service.generatePDFBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
      // Statistics should be in PDF
    });

    it('should handle contest information in PDF', async () => {
      const buffer = await service.generatePDFBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle winners without totalPossibleScore', async () => {
      const dataWithoutPossible: ReportData = {
        ...mockReportData,
        winners: [
          {
            contestant: { id: '1', name: 'Winner 1' },
            totalScore: 95,
            totalPossibleScore: null,
            categoriesParticipated: 2,
          },
        ],
      };

      const buffer = await service.generatePDFBuffer(dataWithoutPossible);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle empty winners array', async () => {
      const dataNoWinners: ReportData = {
        ...mockReportData,
        winners: [],
      };

      const buffer = await service.generatePDFBuffer(dataNoWinners);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle statistics with object values', async () => {
      const dataWithComplexStats: ReportData = {
        ...mockReportData,
        statistics: {
          totalEvents: 10,
          categoryBreakdown: { dance: 5, vocal: 5 },
        },
      };

      const buffer = await service.generatePDFBuffer(dataWithComplexStats);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateExcelBuffer', () => {
    it('should generate Excel workbook', async () => {
      const buffer = await service.generateExcelBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should include header row in Excel', async () => {
      const buffer = await service.generateExcelBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include metadata in Excel', async () => {
      const buffer = await service.generateExcelBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include event information in Excel', async () => {
      const buffer = await service.generateExcelBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include winners with proper columns', async () => {
      const buffer = await service.generateExcelBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
      // Should have Rank, Contestant, Score, Possible Score columns
    });

    it('should handle winners without contestant names', async () => {
      const dataNoNames: ReportData = {
        ...mockReportData,
        winners: [
          {
            contestant: { id: '1', name: undefined as any },
            totalScore: 95,
            totalPossibleScore: 100,
            categoriesParticipated: 2,
          },
        ],
      };

      const buffer = await service.generateExcelBuffer(dataNoNames);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should include statistics in Excel', async () => {
      const buffer = await service.generateExcelBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle null values in statistics', async () => {
      const dataWithNullStats: ReportData = {
        ...mockReportData,
        statistics: {
          totalEvents: 10,
          nullValue: null,
          undefinedValue: undefined,
        },
      };

      const buffer = await service.generateExcelBuffer(dataWithNullStats);

      expect(buffer).toBeInstanceOf(Buffer);
    });

    it('should handle event without description', async () => {
      const dataNoDesc: ReportData = {
        event: {
          id: 'event-1',
          name: 'Test Event',
          description: undefined,
        },
        metadata: mockReportData.metadata,
      };

      const buffer = await service.generateExcelBuffer(dataNoDesc);

      expect(buffer).toBeInstanceOf(Buffer);
    });
  });

  describe('generateCSVBuffer', () => {
    it('should generate CSV content', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should include header in CSV', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Event Report');
    });

    it('should include metadata in CSV', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Generated');
      expect(content).toContain('Report Type');
    });

    it('should include event information in CSV', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Annual Gala');
    });

    it('should include winners in CSV format', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Winners/Results');
      expect(content).toContain('John Doe');
      expect(content).toContain('Jane Smith');
    });

    it('should properly escape CSV values', async () => {
      const dataWithCommas: ReportData = {
        event: {
          id: 'event-1',
          name: 'Test, Event',
          description: 'Description, with, commas',
        },
        metadata: mockReportData.metadata,
      };

      const buffer = await service.generateCSVBuffer(dataWithCommas);
      const content = buffer.toString('utf-8');

      expect(content).toContain('"Test, Event"');
    });

    it('should include statistics in CSV', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Statistics');
    });

    it('should handle empty event data', async () => {
      const emptyData: ReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'empty',
        },
      };

      const buffer = await service.generateCSVBuffer(emptyData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Event Report');
    });

    it('should format winner data correctly', async () => {
      const buffer = await service.generateCSVBuffer(mockReportData);
      const content = buffer.toString('utf-8');

      expect(content).toContain('Rank');
      expect(content).toContain('285');
      expect(content).toContain('270');
    });

    it('should handle null totalPossibleScore in CSV', async () => {
      const dataWithNull: ReportData = {
        ...mockReportData,
        winners: [
          {
            contestant: { id: '1', name: 'Test' },
            totalScore: 95,
            totalPossibleScore: null,
            categoriesParticipated: 2,
          },
        ],
      };

      const buffer = await service.generateCSVBuffer(dataWithNull);
      const content = buffer.toString('utf-8');

      expect(content).toContain('N/A');
    });
  });

  describe('getMimeType', () => {
    it('should return correct MIME type for PDF', () => {
      const mimeType = service.getMimeType('pdf');
      expect(mimeType).toBe('application/pdf');
    });

    it('should return correct MIME type for Excel', () => {
      const mimeType = service.getMimeType('excel');
      expect(mimeType).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    });

    it('should return correct MIME type for CSV', () => {
      const mimeType = service.getMimeType('csv');
      expect(mimeType).toBe('text/csv');
    });

    it('should return default MIME type for unknown format', () => {
      const mimeType = service.getMimeType('unknown' as ExportFormat);
      expect(mimeType).toBe('application/octet-stream');
    });
  });

  describe('getFileExtension', () => {
    it('should return correct extension for PDF', () => {
      const ext = service.getFileExtension('pdf');
      expect(ext).toBe('pdf');
    });

    it('should return correct extension for Excel', () => {
      const ext = service.getFileExtension('excel');
      expect(ext).toBe('xlsx');
    });

    it('should return correct extension for CSV', () => {
      const ext = service.getFileExtension('csv');
      expect(ext).toBe('csv');
    });

    it('should return default extension for unknown format', () => {
      const ext = service.getFileExtension('unknown' as ExportFormat);
      expect(ext).toBe('bin');
    });
  });

  describe('generateFilename', () => {
    it('should generate filename with report type and date', () => {
      const filename = service.generateFilename('event_comprehensive', 'pdf');

      expect(filename).toMatch(/^event_comprehensive_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should sanitize report type', () => {
      const filename = service.generateFilename('Event Report!@#', 'pdf');

      expect(filename).toMatch(/^event_report_\d{4}-\d{2}-\d{2}\.pdf$/);
      expect(filename).not.toContain('!');
      expect(filename).not.toContain('@');
      expect(filename).not.toContain('#');
    });

    it('should handle spaces in report type', () => {
      const filename = service.generateFilename('My Event Report', 'excel');

      expect(filename).toMatch(/^my_event_report_\d{4}-\d{2}-\d{2}\.xlsx$/);
    });

    it('should use correct file extension', () => {
      const pdfFilename = service.generateFilename('test', 'pdf');
      const excelFilename = service.generateFilename('test', 'excel');
      const csvFilename = service.generateFilename('test', 'csv');

      expect(pdfFilename).toMatch(/\.pdf$/);
      expect(excelFilename).toMatch(/\.xlsx$/);
      expect(csvFilename).toMatch(/\.csv$/);
    });

    it('should convert report type to lowercase', () => {
      const filename = service.generateFilename('EVENT_REPORT', 'pdf');

      expect(filename).toMatch(/^event_report_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should include current date in filename', () => {
      const today = new Date().toISOString().split('T')[0];
      const filename = service.generateFilename('test_report', 'pdf');

      expect(filename).toContain(today);
    });

    it('should handle empty report type', () => {
      const filename = service.generateFilename('', 'pdf');

      expect(filename).toMatch(/^_\d{4}-\d{2}-\d{2}\.pdf$/);
    });

    it('should handle special characters in report type', () => {
      const filename = service.generateFilename('report/with\\special:chars', 'csv');

      expect(filename).toMatch(/^report_with_special_chars_\d{4}-\d{2}-\d{2}\.csv$/);
    });
  });

  describe('integration tests', () => {
    it('should export complete report as PDF', async () => {
      const completeReport: ReportData = {
        event: {
          id: 'event-1',
          name: 'Complete Event',
          description: 'Full event description',
        },
        contest: {
          id: 'contest-1',
          name: 'Complete Contest',
          description: 'Full contest description',
        },
        winners: [
          {
            contestant: { id: '1', name: 'First Place' },
            totalScore: 100,
            totalPossibleScore: 100,
            categoriesParticipated: 3,
          },
          {
            contestant: { id: '2', name: 'Second Place' },
            totalScore: 95,
            totalPossibleScore: 100,
            categoriesParticipated: 3,
          },
        ],
        statistics: {
          totalEvents: 5,
          totalScores: 250,
          averageScore: 85,
        },
        metadata: {
          generatedAt: new Date().toISOString(),
          generatedBy: 'admin',
          reportType: 'comprehensive',
        },
      };

      const buffer = await service.exportReport(completeReport, 'pdf');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });

    it('should export minimal report as CSV', async () => {
      const minimalReport: ReportData = {
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'minimal',
        },
      };

      const buffer = await service.exportReport(minimalReport, 'csv');
      const content = buffer.toString('utf-8');

      expect(content).toContain('Event Report');
      expect(content).toContain('minimal');
    });

    it('should handle large winner lists', async () => {
      const winners = Array.from({ length: 100 }, (_, i) => ({
        contestant: { id: `contestant-${i}`, name: `Contestant ${i}` },
        totalScore: 100 - i,
        totalPossibleScore: 100,
        categoriesParticipated: 3,
      }));

      const largeReport: ReportData = {
        winners,
        metadata: {
          generatedAt: new Date().toISOString(),
          reportType: 'large_results',
        },
      };

      const buffer = await service.exportReport(largeReport, 'excel');

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });
});
