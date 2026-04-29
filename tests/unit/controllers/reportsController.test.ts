/**
 * ReportsController Unit Tests
 * Comprehensive test coverage for ReportsController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { ReportsController } from '../../../src/controllers/reportsController';
import { ReportGenerationService } from '../../../src/services/ReportGenerationService';
import { ReportExportService } from '../../../src/services/ReportExportService';
import { ReportTemplateService } from '../../../src/services/ReportTemplateService';
import { ReportEmailService } from '../../../src/services/ReportEmailService';
import { ReportInstanceService } from '../../../src/services/ReportInstanceService';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/services/ReportGenerationService');
jest.mock('../../../src/services/ReportExportService');
jest.mock('../../../src/services/ReportTemplateService');
jest.mock('../../../src/services/ReportEmailService');
jest.mock('../../../src/services/ReportInstanceService');

// Mock the database module used by the controller for authorization checks
const mockPrisma = {
  event: { findFirst: jest.fn() },
  contest: { findFirst: jest.fn() },
  reportInstance: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
  },
};
jest.mock('../../../src/config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Also mock the old prisma path in case it's still referenced
jest.mock('../../../src/utils/prisma', () => mockPrisma);

describe('ReportsController', () => {
  let controller: ReportsController;
  let mockGenerationService: jest.Mocked<ReportGenerationService>;
  let mockExportService: jest.Mocked<ReportExportService>;
  let mockTemplateService: jest.Mocked<ReportTemplateService>;
  let mockEmailService: jest.Mocked<ReportEmailService>;
  let mockInstanceService: jest.Mocked<ReportInstanceService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock services
    mockGenerationService = {
      generateEventReportData: jest.fn(),
      generateContestResultsData: jest.fn(),
      generateSystemAnalyticsData: jest.fn(),
    } as any;

    mockExportService = {
      exportReport: jest.fn(),
    } as any;

    mockTemplateService = {
      getAllTemplates: jest.fn(),
      createTemplate: jest.fn(),
      updateTemplate: jest.fn(),
      deleteTemplate: jest.fn(),
    } as any;

    mockEmailService = {
      sendReportEmail: jest.fn(),
    } as any;

    mockInstanceService = {
      createInstance: jest.fn(),
      getInstances: jest.fn(),
      deleteInstance: jest.fn(),
    } as any;

    // Mock container resolution
    (container.resolve as jest.Mock) = jest.fn((service) => {
      if (service === ReportGenerationService) return mockGenerationService;
      if (service === ReportExportService) return mockExportService;
      if (service === ReportTemplateService) return mockTemplateService;
      if (service === ReportEmailService) return mockEmailService;
      if (service === ReportInstanceService) return mockInstanceService;
      return {};
    });

    controller = new ReportsController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' },
      prisma: mockPrisma,
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
      setHeader: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getTemplates', () => {
    it('should return all report templates', async () => {
      const mockTemplates = [
        { id: '1', name: 'Event Report', type: 'event', template: '{}' },
        { id: '2', name: 'Contest Results', type: 'contest', template: '{}' },
      ];

      mockTemplateService.getAllTemplates.mockResolvedValue(mockTemplates as any);

      await controller.getTemplates(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTemplateService.getAllTemplates).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith({ data: mockTemplates });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockTemplateService.getAllTemplates.mockRejectedValue(error);

      await controller.getTemplates(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createTemplate', () => {
    it('should create a new template with all fields', async () => {
      const templateData = {
        name: 'New Template',
        template: '{"layout":"custom"}',
        parameters: '{"fields":["name","score"]}',
        type: 'contest',
      };

      const mockTemplate = {
        id: 'template-1',
        ...templateData,
        createdAt: new Date(),
      };

      mockReq.body = templateData;
      mockTemplateService.createTemplate.mockResolvedValue(mockTemplate as any);

      await controller.createTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith({
        ...templateData,
        tenantId: 'tenant-1',
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockTemplate);
    });

    it('should use defaults for missing optional fields', async () => {
      mockReq.body = { name: 'Simple Template' };
      mockTemplateService.createTemplate.mockResolvedValue({ id: 'template-2' } as any);

      await controller.createTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockTemplateService.createTemplate).toHaveBeenCalledWith({
        name: 'Simple Template',
        template: '{}',
        parameters: '{}',
        type: 'event',
        tenantId: 'tenant-1',
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Creation failed');
      mockReq.body = { name: 'Test' };
      mockTemplateService.createTemplate.mockRejectedValue(error);

      await controller.createTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateTemplate', () => {
    it('should update template successfully', async () => {
      const updates = { name: 'Updated Template', template: '{"updated":true}' };
      const mockUpdated = { id: 'template-1', ...updates };

      mockReq.params = { id: 'template-1' };
      mockReq.body = updates;
      mockTemplateService.updateTemplate.mockResolvedValue(mockUpdated as any);

      await controller.updateTemplate(mockReq as Request, mockRes as Response, mockNext);

      // Controller now passes tenantId as second parameter
      expect(mockTemplateService.updateTemplate).toHaveBeenCalledWith('template-1', 'tenant-1', updates);
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdated);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};
      mockReq.body = { name: 'Updated' };

      await controller.updateTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Update failed');
      mockReq.params = { id: 'template-1' };
      mockReq.body = { name: 'Updated' };
      mockTemplateService.updateTemplate.mockRejectedValue(error);

      await controller.updateTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteTemplate', () => {
    it('should delete template successfully', async () => {
      mockReq.params = { id: 'template-1' };
      mockTemplateService.deleteTemplate.mockResolvedValue(undefined);

      await controller.deleteTemplate(mockReq as Request, mockRes as Response, mockNext);

      // Controller now passes tenantId as second parameter
      expect(mockTemplateService.deleteTemplate).toHaveBeenCalledWith('template-1', 'tenant-1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.deleteTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Template ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Delete failed');
      mockReq.params = { id: 'template-1' };
      mockTemplateService.deleteTemplate.mockRejectedValue(error);

      await controller.deleteTemplate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('generateReport', () => {
    it('should generate event report', async () => {
      const mockReportData = { eventId: 'event-1', data: { participants: 50 } };

      mockReq.body = { type: 'event', eventId: 'event-1' };
      // Mock auth check - event exists and user has access
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1', tenantId: 'tenant-1' });
      mockGenerationService.generateEventReportData.mockResolvedValue(mockReportData as any);
      mockInstanceService.createInstance.mockResolvedValue({ id: 'inst-1' } as any);

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGenerationService.generateEventReportData).toHaveBeenCalledWith(
        'event-1',
        'user-1'
      );
      expect(mockInstanceService.createInstance).toHaveBeenCalledWith({
        type: 'event',
        name: 'Event Summary Report',
        generatedById: 'user-1',
        format: 'PDF',
        tenantId: 'tenant-1',
        data: JSON.stringify(mockReportData),
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          instance: { id: 'inst-1' },
          preview: mockReportData,
        },
      });
    });

    it('should generate contest report', async () => {
      const mockReportData = { contestId: 'contest-1', results: [] };

      mockReq.body = { type: 'contest', contestId: 'contest-1' };
      // Mock auth check - contest exists and user has access
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1', tenantId: 'tenant-1' });
      mockGenerationService.generateContestResultsData.mockResolvedValue(mockReportData as any);
      mockInstanceService.createInstance.mockResolvedValue({ id: 'inst-2' } as any);

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGenerationService.generateContestResultsData).toHaveBeenCalledWith(
        'contest-1',
        'user-1'
      );
      expect(mockInstanceService.createInstance).toHaveBeenCalledWith({
        type: 'contest',
        name: 'Contest Results Report',
        generatedById: 'user-1',
        format: 'PDF',
        tenantId: 'tenant-1',
        data: JSON.stringify(mockReportData),
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          instance: { id: 'inst-2' },
          preview: mockReportData,
        },
      });
    });

    it('should generate system analytics report', async () => {
      const mockReportData = { analytics: { totalEvents: 10 } };

      mockReq.body = { type: 'system' };
      mockGenerationService.generateSystemAnalyticsData.mockResolvedValue(mockReportData as any);
      mockInstanceService.createInstance.mockResolvedValue({ id: 'inst-3' } as any);

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      // Controller now passes tenantId and userRole
      expect(mockGenerationService.generateSystemAnalyticsData).toHaveBeenCalledWith('user-1', 'tenant-1', 'ADMIN');
      expect(mockInstanceService.createInstance).toHaveBeenCalledWith({
        type: 'system',
        name: 'System Analytics Report',
        generatedById: 'user-1',
        format: 'PDF',
        tenantId: 'tenant-1',
        data: JSON.stringify(mockReportData),
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        data: {
          instance: { id: 'inst-3' },
          preview: mockReportData,
        },
      });
    });

    it('should return 400 for invalid report type', async () => {
      mockReq.body = { type: 'invalid' };

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Invalid report type or missing parameters',
      });
    });

    it('should return 400 when event report missing eventId', async () => {
      mockReq.body = { type: 'event' };

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Generation failed');
      mockReq.body = { type: 'event', eventId: 'event-1' };
      // Mock auth check passes
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1', tenantId: 'tenant-1' });
      mockGenerationService.generateEventReportData.mockRejectedValue(error);

      await controller.generateReport(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('generateContestantReports', () => {
    it('should generate contestant reports', async () => {
      const mockReportData = { contestId: 'contest-1', contestants: [] };

      mockReq.body = { contestId: 'contest-1' };
      // Mock auth check
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1', tenantId: 'tenant-1' });
      mockGenerationService.generateContestResultsData.mockResolvedValue(mockReportData as any);

      await controller.generateContestantReports(mockReq as Request, mockRes as Response, mockNext);

      expect(mockGenerationService.generateContestResultsData).toHaveBeenCalledWith(
        'contest-1',
        'user-1'
      );
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Contest results report generated',
        data: mockReportData,
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Generation failed');
      mockReq.body = { contestId: 'contest-1' };
      // Mock auth check passes
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1', tenantId: 'tenant-1' });
      mockGenerationService.generateContestResultsData.mockRejectedValue(error);

      await controller.generateContestantReports(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getReportInstances', () => {
    it('should return all report instances with filters', async () => {
      const mockInstances = [
        { id: 'inst-1', type: 'event', format: 'pdf' },
        { id: 'inst-2', type: 'contest', format: 'excel' },
      ];

      mockReq.query = {
        type: 'event',
        format: 'pdf',
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };

      // Controller now uses prisma directly for tenant-filtered queries
      mockPrisma.reportInstance.findMany.mockResolvedValue(mockInstances);

      await controller.getReportInstances(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.reportInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            type: 'event',
            format: 'pdf',
          }),
          orderBy: { generatedAt: 'desc' },
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({ data: mockInstances });
    });

    it('should handle query without filters', async () => {
      mockReq.query = {};
      mockPrisma.reportInstance.findMany.mockResolvedValue([]);

      await controller.getReportInstances(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.reportInstance.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
          orderBy: { generatedAt: 'desc' },
        })
      );
      expect(mockRes.json).toHaveBeenCalledWith({ data: [] });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query failed');
      mockReq.query = {};
      mockPrisma.reportInstance.findMany.mockRejectedValue(error);

      await controller.getReportInstances(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteReportInstance', () => {
    it('should delete report instance successfully', async () => {
      mockReq.params = { id: 'inst-1' };
      // Mock auth check - instance exists and user has access
      mockPrisma.reportInstance.findFirst.mockResolvedValue({ id: 'inst-1', tenantId: 'tenant-1' });
      mockInstanceService.deleteInstance.mockResolvedValue(undefined);

      await controller.deleteReportInstance(mockReq as Request, mockRes as Response, mockNext);

      expect(mockInstanceService.deleteInstance).toHaveBeenCalledWith('inst-1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.deleteReportInstance(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Instance ID is required' });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Delete failed');
      mockReq.params = { id: 'inst-1' };
      // Mock auth check passes
      mockPrisma.reportInstance.findFirst.mockResolvedValue({ id: 'inst-1', tenantId: 'tenant-1' });
      mockInstanceService.deleteInstance.mockRejectedValue(error);

      await controller.deleteReportInstance(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('exportToPDF', () => {
    it('should export report to PDF', async () => {
      const mockBuffer = Buffer.from('PDF content');
      const mockReportData = { title: 'Test Report', data: [] };

      mockReq.params = { id: 'report-1' };

      // Mock the getReportData helper (uses prisma.reportInstance.findFirst with tenant check)
      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-1',
        data: JSON.stringify(mockReportData),
      });

      mockExportService.exportReport.mockResolvedValue(mockBuffer);

      await controller.exportToPDF(mockReq as Request, mockRes as Response, mockNext);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(mockReportData, 'pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=report-report-1.pdf'
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.exportToPDF(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Report ID is required' });
    });

    it('should call next with error when report not found', async () => {
      mockReq.params = { id: 'nonexistent' };

      mockPrisma.reportInstance.findFirst.mockResolvedValue(null);

      await controller.exportToPDF(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('exportToExcel', () => {
    it('should export report to Excel', async () => {
      const mockBuffer = Buffer.from('Excel content');
      const mockReportData = { title: 'Test Report', data: [] };

      mockReq.params = { id: 'report-2' };

      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-2',
        data: mockReportData, // Already parsed object
      });

      mockExportService.exportReport.mockResolvedValue(mockBuffer);

      await controller.exportToExcel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(mockReportData, 'excel');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=report-report-2.xlsx'
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.exportToExcel(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Report ID is required' });
    });
  });

  describe('exportToCSV', () => {
    it('should export report to CSV', async () => {
      const mockBuffer = Buffer.from('CSV content');
      const mockReportData = { title: 'Test Report', data: [] };

      mockReq.params = { id: 'report-3' };

      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-3',
        data: JSON.stringify(mockReportData),
      });

      mockExportService.exportReport.mockResolvedValue(mockBuffer);

      await controller.exportToCSV(mockReq as Request, mockRes as Response, mockNext);

      expect(mockExportService.exportReport).toHaveBeenCalledWith(mockReportData, 'csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename=report-report-3.csv'
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockBuffer);
    });

    it('should return 400 when id is missing', async () => {
      mockReq.params = {};

      await controller.exportToCSV(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Report ID is required' });
    });
  });

  describe('sendReportEmail', () => {
    it('should send report via email successfully', async () => {
      const emailData = {
        reportId: 'report-1',
        recipients: ['user@example.com'],
        subject: 'Your Report',
        message: 'Please find the report attached',
        format: 'pdf',
      };

      const mockReportData = { title: 'Test Report', data: [] };

      mockReq.body = emailData;

      // Mock getReportData (uses findFirst with tenant check)
      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-1',
        data: JSON.stringify(mockReportData),
      });

      const dispatchSummary = { total: 1, sent: 1, failed: 0, skipped: 0 };
      mockEmailService.sendReportEmail.mockResolvedValue(dispatchSummary);

      await controller.sendReportEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmailService.sendReportEmail).toHaveBeenCalledWith({
        recipients: ['user@example.com'],
        subject: 'Your Report',
        message: 'Please find the report attached',
        html: undefined,
        reportData: mockReportData,
        format: 'pdf',
        userId: 'user-1',
        tenantId: 'tenant-1',
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        message: 'Report emailed successfully',
        data: dispatchSummary,
      });
    });

    it('should use default format when not provided', async () => {
      mockReq.body = {
        reportId: 'report-1',
        recipients: ['user@example.com'],
        subject: 'Report',
        message: 'Message',
      };

      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-1',
        data: '{}',
      });

      mockEmailService.sendReportEmail.mockResolvedValue({ total: 1, sent: 1, failed: 0, skipped: 0 });

      await controller.sendReportEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmailService.sendReportEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          format: 'pdf',
        })
      );
    });

    it('should use system userId when user not authenticated', async () => {
      mockReq.user = undefined;
      mockReq.body = {
        reportId: 'report-1',
        recipients: ['user@example.com'],
        subject: 'Report',
        message: 'Message',
      };

      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-1',
        data: '{}',
      });

      mockEmailService.sendReportEmail.mockResolvedValue({ total: 1, sent: 1, failed: 0, skipped: 0 });

      await controller.sendReportEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmailService.sendReportEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'system',
        })
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Email failed');
      mockReq.body = {
        reportId: 'report-1',
        recipients: ['user@example.com'],
        subject: 'Report',
        message: 'Message',
      };

      mockPrisma.reportInstance.findFirst.mockResolvedValue({
        id: 'report-1',
        data: '{}',
      });

      mockEmailService.sendReportEmail.mockRejectedValue(error);

      await controller.sendReportEmail(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
