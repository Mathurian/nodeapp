/**
 * Reports Controller
 * Handles HTTP requests for report generation, templates, and distribution
 * Delegates business logic to service layer
 */

import { Request, Response, NextFunction } from 'express';
import { requireAuthenticatedUser, requireAuthAndTenant } from '../utils/requestValidation';
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
  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const templates = await this.templateService.getAllTemplates(req.user.tenantId);
      res.json({ data: templates });
    } catch (error) {
      return next(error);
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
        type: type || 'event',
        tenantId: req.user.tenantId
      });
      res.status(201).json(reportTemplate);
    } catch (error) {
      return next(error);
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
      const updated = await this.templateService.updateTemplate(id, req.user.tenantId, updates);
      res.json(updated);
    } catch (error) {
      return next(error);
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
      await this.templateService.deleteTemplate(id, req.user.tenantId);
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Generate a report
   * SECURITY FIX: Now validates user access to events/contests before generating reports
   */
  generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, eventId, contestId } = req.body;
      const userId = (req as any).user?.id;
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // Get Prisma client for authorization checks
      const prisma = require('../config/database').default;

      let reportData;
      if (type === 'event' && eventId) {
        // SECURITY: Verify user has access to this event
        const event = await prisma.event.findFirst({
          where: {
            id: eventId,
            // SUPER_ADMIN can access all events, others must match tenantId
            ...(userRole !== 'SUPER_ADMIN' && { tenantId })
          }
        });

        if (!event) {
          res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to generate reports for this event'
          });
          return;
        }

        reportData = await this.generationService.generateEventReportData(eventId, userId);
      } else if (type === 'contest' && contestId) {
        // SECURITY: Verify user has access to this contest
        const contest = await prisma.contest.findFirst({
          where: {
            id: contestId,
            // SUPER_ADMIN can access all contests, others must match tenantId
            ...(userRole !== 'SUPER_ADMIN' && { tenantId })
          }
        });

        if (!contest) {
          res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to generate reports for this contest'
          });
          return;
        }

        reportData = await this.generationService.generateContestResultsData(contestId, userId);
      } else if (type === 'system') {
        // SECURITY: Pass tenantId and userRole for proper tenant scoping
        reportData = await this.generationService.generateSystemAnalyticsData(userId, tenantId, userRole);
      } else {
        res.status(400).json({ error: 'Invalid report type or missing parameters' });
        return;
      }

      res.status(201).json(reportData);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Generate contestant reports (bulk)
   * SECURITY FIX: Now validates user access to contest before generating reports
   */
  generateContestantReports = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { contestId } = req.body;
      const userId = (req as any).user?.id;
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // Get Prisma client for authorization checks
      const prisma = require('../config/database').default;

      // SECURITY: Verify user has access to this contest
      const contest = await prisma.contest.findFirst({
        where: {
          id: contestId,
          // SUPER_ADMIN can access all contests, others must match tenantId
          ...(userRole !== 'SUPER_ADMIN' && { tenantId })
        }
      });

      if (!contest) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to generate reports for this contest'
        });
        return;
      }

      // For now, delegate to contest results report
      const reportData = await this.generationService.generateContestResultsData(contestId, userId);

      res.json({
        message: 'Contest results report generated',
        data: reportData
      });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get all report instances
   * SECURITY FIX: Now filters by tenantId to prevent cross-tenant data leakage
   */
  getReportInstances = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { type, format, startDate, endDate } = req.query;
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // Get Prisma client for tenant filtering
      const prisma = require('../config/database').default;

      // SECURITY: Build tenant filter - SUPER_ADMIN sees all, others see only their tenant
      const tenantFilter = userRole === 'SUPER_ADMIN' ? {} : { tenantId };

      const instances = await prisma.reportInstance.findMany({
        where: {
          ...tenantFilter,
          ...(type && { type: type as string }),
          ...(format && { format: format as string }),
          ...((startDate || endDate) && {
            generatedAt: {
              ...(startDate && { gte: new Date(startDate as string) }),
              ...(endDate && { lte: new Date(endDate as string) })
            }
          })
        },
        orderBy: { generatedAt: 'desc' }
      });

      res.json({ data: instances });
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete a report instance
   * SECURITY FIX: Now validates tenant access before deletion
   */
  deleteReportInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Instance ID is required' });
        return;
      }
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // Get Prisma client for authorization checks
      const prisma = require('../config/database').default;

      // SECURITY: Verify user has access to this report instance
      const instance = await prisma.reportInstance.findFirst({
        where: {
          id,
          // SUPER_ADMIN can delete any instance, others must match tenantId
          ...(userRole !== 'SUPER_ADMIN' && { tenantId })
        }
      });

      if (!instance) {
        res.status(403).json({
          error: 'Access denied',
          message: 'You do not have permission to delete this report instance'
        });
        return;
      }

      await this.instanceService.deleteInstance(id);
      res.status(204).send();
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Export report to PDF
   * SECURITY FIX: Now validates tenant access before export
   */
  exportToPDF = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // SECURITY: Validate tenant access to report
      const reportData = await this.getReportData(id, tenantId, userRole);

      const buffer = await this.exportService.exportReport(reportData, 'pdf');

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.pdf`);
      res.send(buffer);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Export report to Excel
   * SECURITY FIX: Now validates tenant access before export
   */
  exportToExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // SECURITY: Validate tenant access to report
      const reportData = await this.getReportData(id, tenantId, userRole);

      const buffer = await this.exportService.exportReport(reportData, 'excel');

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.xlsx`);
      res.send(buffer);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Export report to CSV
   * SECURITY FIX: Now validates tenant access before export
   */
  exportToCSV = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // SECURITY: Validate tenant access to report
      const reportData = await this.getReportData(id, tenantId, userRole);

      const buffer = await this.exportService.exportReport(reportData, 'csv');

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=report-${id}.csv`);
      res.send(buffer);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Helper to get report data from instance ID
   * SECURITY FIX: Now validates tenant access to report instances
   */
  private async getReportData(instanceId: string, tenantId: string, userRole: string): Promise<any> {
    const prisma = require('../config/database').default;
    const instance = await prisma.reportInstance.findFirst({
      where: {
        id: instanceId,
        // SUPER_ADMIN can access all report instances, others must match tenantId
        ...(userRole !== 'SUPER_ADMIN' && { tenantId })
      }
    });
    if (!instance) {
      throw new Error('Report instance not found or access denied');
    }
    return typeof instance.data === 'string' ? JSON.parse(instance.data) : instance.data;
  }

  /**
   * Send report via email
   * SECURITY FIX: Now validates tenant access before sending report
   */
  sendReportEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { reportId, recipients, subject, message, format } = req.body;
      const userId = (req as any).user?.id || 'system';
      const tenantId = (req as any).user?.tenantId;
      const userRole = (req as any).user?.role;

      // SECURITY: Validate tenant access to report
      const reportData = await this.getReportData(reportId, tenantId, userRole);

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
      return next(error);
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
