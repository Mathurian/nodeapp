/**
 * Reports Controller
 * Handles HTTP requests for report generation, templates, and distribution
 * Delegates business logic to service layer
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ReportGenerationService } from '../services/ReportGenerationService';
import { ReportExportService } from '../services/ReportExportService';
import { ReportTemplateService } from '../services/ReportTemplateService';
import { ReportEmailService } from '../services/ReportEmailService';
import { ReportInstanceService } from '../services/ReportInstanceService';

/**
 * Reports Controller Class
 */
export class ReportsController {
  private generationService: ReportGenerationService;
  private exportService: ReportExportService;
  private templateService: ReportTemplateService;
  private emailService: ReportEmailService;
  private instanceService: ReportInstanceService;

  constructor() {
    this.generationService = container.resolve(ReportGenerationService);
    this.exportService = container.resolve(ReportExportService);
    this.templateService = container.resolve(ReportTemplateService);
    this.emailService = container.resolve(ReportEmailService);
    this.instanceService = container.resolve(ReportInstanceService);
  }

  /**
   * Get all report templates
   */
  getTemplates = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await this.templateService.getAllTemplates();
      res.json({ data: templates });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Create a new report template
   */
  createTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { name, template, parameters, type } = req.body;
      const reportTemplate = await this.templateService.createTemplate({
        name,
        template: template || '{}',
        parameters: parameters || '{}',
        type: type || 'event'
      });
      res.status(201).json(reportTemplate);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Update an existing report template
   */
  updateTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      const updates = req.body;
      if (!id) {
        res.status(400).json({ error: 'Template ID is required' });
        return;
      }
      const updated = await this.templateService.updateTemplate(id, updates);
      res.json(updated);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a report template
   */
  deleteTemplate = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Template ID is required' });
        return;
      }
      await this.templateService.deleteTemplate(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate a report
   */
  generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, eventId, contestId } = req.body;
      const userId = (req as any).user?.id;

      let reportData;
      if (type === 'event' && eventId) {
        reportData = await this.generationService.generateEventReportData(eventId, userId);
      } else if (type === 'contest' && contestId) {
        reportData = await this.generationService.generateContestResultsData(contestId, userId);
      } else if (type === 'system') {
        reportData = await this.generationService.generateSystemAnalyticsData(userId);
      } else {
        res.status(400).json({ error: 'Invalid report type or missing parameters' });
        return;
      }

      res.status(201).json(reportData);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Generate contestant reports (bulk)
   * Note: This would need to be implemented in the service layer
   */
  generateContestantReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contestId } = req.body;
      const userId = (req as any).user?.id;

      // For now, delegate to contest results report
      const reportData = await this.generationService.generateContestResultsData(contestId, userId);

      res.json({
        message: 'Contest results report generated',
        data: reportData
      });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Get all report instances
   */
  getReportInstances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, format, startDate, endDate } = req.query;

      const instances = await this.instanceService.getInstances({
        type: type as string | undefined,
        format: format as string | undefined,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined
      });

      res.json({ data: instances });
    } catch (error) {
      next(error);
    }
  };

  /**
   * Delete a report instance
   */
  deleteReportInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Instance ID is required' });
        return;
      }
      await this.instanceService.deleteInstance(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export report to PDF
   */
  exportToPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const reportData = await this.getReportData(id);

      const buffer = await this.exportService.exportReport(reportData, 'pdf');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.pdf`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export report to Excel
   */
  exportToExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const reportData = await this.getReportData(id);

      const buffer = await this.exportService.exportReport(reportData, 'excel');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.xlsx`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Export report to CSV
   */
  exportToCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const reportData = await this.getReportData(id);

      const buffer = await this.exportService.exportReport(reportData, 'csv');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.csv`);
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  };

  /**
   * Helper to get report data from instance ID
   */
  private async getReportData(instanceId: string): Promise<any> {
    const prisma = require('../utils/prisma');
    const instance = await prisma.reportInstance.findUnique({
      where: { id: instanceId }
    });
    if (!instance) {
      throw new Error('Report instance not found');
    }
    return typeof instance.data === 'string' ? JSON.parse(instance.data) : instance.data;
  }

  /**
   * Send report via email
   */
  sendReportEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reportId, recipients, subject, message, format } = req.body;
      const userId = (req as any).user?.id || 'system';

      const reportData = await this.getReportData(reportId);

      await this.emailService.sendReportEmail({
        recipients,
        subject,
        message,
        reportData,
        format: format || 'pdf',
        userId
      });

      res.json({ message: 'Report emailed successfully' });
    } catch (error) {
      next(error);
    }
  };
}

// Create and export controller instance
const controller = new ReportsController();

// Export individual controller methods for route binding
export const getTemplates = controller.getTemplates;
export const createTemplate = controller.createTemplate;
export const updateTemplate = controller.updateTemplate;
export const deleteTemplate = controller.deleteTemplate;
export const generateReport = controller.generateReport;
export const generateContestantReports = controller.generateContestantReports;
export const getReportInstances = controller.getReportInstances;
export const deleteReportInstance = controller.deleteReportInstance;
export const exportToPDF = controller.exportToPDF;
export const exportToExcel = controller.exportToExcel;
export const exportToCSV = controller.exportToCSV;
export const sendReportEmail = controller.sendReportEmail;
