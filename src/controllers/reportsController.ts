/**
 * Reports Controller
 * Handles HTTP requests for report generation, templates, and distribution
 * Delegates business logic to service layer
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { ReportGenerationService } from '../services/ReportGenerationService';
import { ReportExportService } from '../services/ReportExportService';
import { ReportTemplateService } from '../services/ReportTemplateService';
import { ReportEmailService, ReportEmailDispatchSummary } from '../services/ReportEmailService';
import { ReportInstanceService } from '../services/ReportInstanceService';
import { sendUnauthorized } from '../utils/responseHelpers';
import { PermissionScopeService } from '../services/PermissionScopeService';

type ReportScopeSummary = {
  eventId: string | null;
  eventName: string | null;
  contestIds: string[];
  contestNames: string[];
  filterMode: 'all_contests_in_event' | 'selected_contests' | 'single_contest' | 'system' | null;
};

/**
 * Reports Controller Class
 */
export class ReportsController {
  private generationService: ReportGenerationService;
  private exportService: ReportExportService;
  private templateService: ReportTemplateService;
  private emailService: ReportEmailService;
  private instanceService: ReportInstanceService;
  private permissionScopeService: PermissionScopeService;

  constructor() {
    this.generationService = container.resolve(ReportGenerationService);
    this.exportService = container.resolve(ReportExportService);
    this.templateService = container.resolve(ReportTemplateService);
    this.emailService = container.resolve(ReportEmailService);
    this.instanceService = container.resolve(ReportInstanceService);
    this.permissionScopeService = container.resolve(PermissionScopeService);
  }

  private getRequestPrisma(req: Request, res: Response): PrismaClient | null {
    if (!req.prisma) {
      res.status(500).json({ error: 'Database context not initialized' });
      return null;
    }
    return req.prisma;
  }

  private async requireTenantScopedReportAccess(
    req: Request,
    res: Response,
    operation: 'read' | 'write'
  ): Promise<{ tenantId: string; userId: string; userRole: string; requestPrisma: PrismaClient } | null> {
    if (!req.user) {
      sendUnauthorized(res);
      return null;
    }

    const tenantId = (req as any).tenantId || req.user.tenantId;
    if (!tenantId) {
      res.status(400).json({ error: 'Tenant context is required' });
      return null;
    }

    const scope = await this.permissionScopeService.resolveUserScope(
      req.user.role as any,
      'reports',
      tenantId,
      req.user,
      operation
    );

    if (!scope.tenantWide) {
      res.status(403).json({
        error: 'Access denied',
        message: 'You do not have tenant-wide report scope access',
      });
      return null;
    }

    const requestPrisma = this.getRequestPrisma(req, res);
    if (!requestPrisma) {
      return null;
    }

    return {
      tenantId,
      userId: req.user.id,
      userRole: req.user.role,
      requestPrisma,
    };
  }

  private normalizeContestIds(rawValue: unknown): string[] {
    if (!Array.isArray(rawValue)) {
      return [];
    }

    return Array.from(
      new Set(
        rawValue
          .map((contestId) => String(contestId || '').trim())
          .filter(Boolean),
      ),
    );
  }

  private parseStoredReportData(data: unknown): Record<string, any> {
    if (typeof data === 'string') {
      const trimmed = data.trim();
      if (!trimmed || trimmed === '{}') {
        return {};
      }

      try {
        return JSON.parse(trimmed);
      } catch {
        return {};
      }
    }

    if (data && typeof data === 'object') {
      return data as Record<string, any>;
    }

    return {};
  }

  private extractReportScopeSummary(reportData: Record<string, any>, reportType?: string): ReportScopeSummary | null {
    const metadata = reportData['metadata'];
    const metadataScope =
      metadata && typeof metadata === 'object' ? (metadata as Record<string, unknown>)['scope'] : null;

    if (metadataScope && typeof metadataScope === 'object') {
      const scope = metadataScope as Record<string, unknown>;
      return {
        eventId: scope['eventId'] ? String(scope['eventId']) : null,
        eventName: scope['eventName'] ? String(scope['eventName']) : null,
        contestIds: Array.isArray(scope['contestIds'])
          ? scope['contestIds'].map((contestId: unknown) => String(contestId || '')).filter(Boolean)
          : [],
        contestNames: Array.isArray(scope['contestNames'])
          ? scope['contestNames'].map((contestName: unknown) => String(contestName || '')).filter(Boolean)
          : [],
        filterMode: (scope['filterMode'] as ReportScopeSummary['filterMode']) || null,
      };
    }

    const contest = reportData['contest'];
    if (contest && typeof contest === 'object' && (contest as Record<string, unknown>)['id']) {
      const contestRecord = contest as Record<string, unknown>;
      const contestEvent =
        contestRecord['event'] && typeof contestRecord['event'] === 'object'
          ? (contestRecord['event'] as Record<string, unknown>)
          : null;
      return {
        eventId: contestEvent?.['id'] ? String(contestEvent['id']) : null,
        eventName: contestEvent?.['name'] ? String(contestEvent['name']) : null,
        contestIds: [String(contestRecord['id'])],
        contestNames: contestRecord['name'] ? [String(contestRecord['name'])] : [],
        filterMode: 'single_contest',
      };
    }

    const event = reportData['event'];
    if (event && typeof event === 'object' && (event as Record<string, unknown>)['id']) {
      const eventRecord = event as Record<string, unknown>;
      const contests = Array.isArray(eventRecord['contests']) ? eventRecord['contests'] : [];
      return {
        eventId: String(eventRecord['id']),
        eventName: eventRecord['name'] ? String(eventRecord['name']) : null,
        contestIds: contests
          .map((contest: Record<string, unknown>) => String(contest['id'] || ''))
          .filter(Boolean),
        contestNames: contests
          .map((contest: Record<string, unknown>) => String(contest['name'] || ''))
          .filter(Boolean),
        filterMode: 'all_contests_in_event',
      };
    }

    if (
      reportType === 'system' ||
      (metadata && typeof metadata === 'object' && (metadata as Record<string, unknown>)['reportType'] === 'system_analytics')
    ) {
      return {
        eventId: null,
        eventName: null,
        contestIds: [],
        contestNames: [],
        filterMode: 'system',
      };
    }

    return null;
  }

  private matchesRequestedScope(
    scopeSummary: ReportScopeSummary | null,
    eventId?: string | null,
    contestIds?: string[],
  ): boolean {
    const normalizedEventId = eventId ? String(eventId) : '';
    const normalizedContestIds = Array.from(new Set((contestIds || []).map((contestId) => String(contestId || '')).filter(Boolean)));

    if (!normalizedEventId && normalizedContestIds.length === 0) {
      return true;
    }

    if (!scopeSummary?.eventId) {
      return false;
    }

    if (normalizedEventId && scopeSummary.eventId !== normalizedEventId) {
      return false;
    }

    if (normalizedContestIds.length === 0) {
      return true;
    }

    return normalizedContestIds.some((contestId) => scopeSummary.contestIds.includes(contestId));
  }

  /**
   * Get all report templates
   */
  getTemplates = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const access = await this.requireTenantScopedReportAccess(req, res, 'read');
      if (!access) return;

      const templates = await this.templateService.getAllTemplates(access.tenantId);
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
      const access = await this.requireTenantScopedReportAccess(req, res, 'write');
      if (!access) return;

      const { name, template, parameters, type } = req.body;
      const reportTemplate = await this.templateService.createTemplate({
        name,
        template: template || '{}',
        parameters: parameters || '{}',
        type: type || 'event',
        tenantId: access.tenantId
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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

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
      const access = await this.requireTenantScopedReportAccess(req, res, 'write');
      if (!access) return;

      const { type, eventId, contestId } = req.body;
      const contestIds = this.normalizeContestIds(req.body?.contestIds);
      const userId = access.userId;
      const tenantId = access.tenantId;
      const requestPrisma = access.requestPrisma;

      let reportData;
      let reportName = 'Generated Report';
      if (type === 'event' && eventId) {
        const event = await requestPrisma.event.findFirst({
          where: {
            id: eventId,
            tenantId,
          }
        });

        if (!event) {
          res.status(403).json({
            error: 'Access denied',
            message: 'You do not have permission to generate reports for this event'
          });
          return;
        }

        if (contestIds.length > 0) {
          const scopedContests = await requestPrisma.contest.findMany({
            where: {
              id: {
                in: contestIds,
              },
              eventId,
              tenantId,
            },
            select: {
              id: true,
            },
          });

          if (scopedContests.length !== contestIds.length) {
            res.status(400).json({
              error: 'Invalid contest scope',
              message: 'One or more selected contests are not part of the selected event',
            });
            return;
          }
        }

        reportData = await this.generationService.generateEventReportData(eventId, userId, {
          contestIds: contestIds.length > 0 ? contestIds : undefined,
        });
        reportName = 'Event Summary Report';
      } else if (type === 'contest' && contestId) {
        const contest = await requestPrisma.contest.findFirst({
          where: {
            id: contestId,
            tenantId,
            ...(eventId ? { eventId } : {}),
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
        reportName = 'Contest Results Report';
      } else if (type === 'system') {
        reportData = await this.generationService.generateSystemAnalyticsData(userId, tenantId, access.userRole);
        reportName = 'System Analytics Report';
      } else {
        res.status(400).json({ error: 'Invalid report type or missing parameters' });
        return;
      }

      const instance = await this.instanceService.createInstance({
        type,
        name: reportName,
        generatedById: userId,
        format: 'PDF',
        tenantId,
        data: JSON.stringify(reportData ?? {}),
      });

      res.status(201).json({
        data: {
          instance,
          preview: reportData,
        }
      });
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
      const requestPrisma = this.getRequestPrisma(req, res);
      if (!requestPrisma) return;

      // SECURITY: Verify user has access to this contest
      const contest = await requestPrisma.contest.findFirst({
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
      const access = await this.requireTenantScopedReportAccess(req, res, 'read');
      if (!access) return;

      const { type, format, startDate, endDate } = req.query;
      const eventId = typeof req.query['eventId'] === 'string' ? req.query['eventId'] : null;
      const contestIds = Array.from(
        new Set(
          (Array.isArray(req.query['contestId']) ? req.query['contestId'] : [req.query['contestId']])
            .flatMap((contestId) => String(contestId || '').split(','))
            .map((contestId) => contestId.trim())
            .filter(Boolean),
        ),
      );
      const tenantId = access.tenantId;
      const requestPrisma = access.requestPrisma;

      const instances = await requestPrisma.reportInstance.findMany({
        where: {
          tenantId,
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

      const normalizedInstances = instances
        .map((instance) => {
          const reportData = this.parseStoredReportData(instance.data);
          const scopeSummary = this.extractReportScopeSummary(reportData, instance.type);
          return {
            ...instance,
            scopeSummary,
          };
        })
        .filter((instance) => this.matchesRequestedScope(instance.scopeSummary, eventId, contestIds));

      res.json({ data: normalizedInstances });
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
      const access = await this.requireTenantScopedReportAccess(req, res, 'write');
      if (!access) return;

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Instance ID is required' });
        return;
      }
      const tenantId = access.tenantId;
      const requestPrisma = access.requestPrisma;

      const instance = await requestPrisma.reportInstance.findFirst({
        where: {
          id,
          tenantId,
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
      const access = await this.requireTenantScopedReportAccess(req, res, 'read');
      if (!access) return;

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const reportData = await this.getReportData(access.requestPrisma, id, access.tenantId);

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
      const access = await this.requireTenantScopedReportAccess(req, res, 'read');
      if (!access) return;

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const reportData = await this.getReportData(access.requestPrisma, id, access.tenantId);

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
      const access = await this.requireTenantScopedReportAccess(req, res, 'read');
      if (!access) return;

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }
      const reportData = await this.getReportData(access.requestPrisma, id, access.tenantId);

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
  private async getReportData(prisma: PrismaClient, instanceId: string, tenantId: string): Promise<any> {
    const instance = await prisma.reportInstance.findFirst({
      where: {
        id: instanceId,
        tenantId
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
      const access = await this.requireTenantScopedReportAccess(req, res, 'write');
      if (!access) return;

      const { reportId, recipients, subject, message, format, html } = req.body;
      const userId = access.userId || 'system';
      const tenantId = access.tenantId;
      const reportData = await this.getReportData(access.requestPrisma, reportId, tenantId);

      const dispatchSummary: ReportEmailDispatchSummary = await this.emailService.sendReportEmail({
        recipients,
        subject,
        message,
        html,
        reportData,
        format: format || 'pdf',
        userId,
        tenantId
      });

      const responseMessage = dispatchSummary.skipped === dispatchSummary.total
        ? 'Report email skipped because SMTP is disabled for this environment'
        : dispatchSummary.failed > 0
          ? 'Report email processed with partial failures'
          : 'Report emailed successfully';

      res.json({
        message: responseMessage,
        data: dispatchSummary
      });
    } catch (error) {
      return next(error);
    }
  };

  downloadReportInstance = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const access = await this.requireTenantScopedReportAccess(req, res, 'read');
      if (!access) return;

      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Report ID is required' });
        return;
      }

      const reportInstance = await access.requestPrisma.reportInstance.findFirst({
        where: {
          id,
          tenantId: access.tenantId,
        },
      });

      if (!reportInstance) {
        res.status(404).json({ error: 'Report not found' });
        return;
      }

      let parsedData = this.parseStoredReportData(reportInstance.data);
      if (!parsedData || Object.keys(parsedData).length === 0) {
        parsedData = {
          message: 'No report data available',
          reportType: reportInstance.type,
          generatedAt: reportInstance.generatedAt,
        };
      }
      const scopeSummary = this.extractReportScopeSummary(parsedData, reportInstance.type);

      res.json({
        data: {
          id: reportInstance.id,
          name: reportInstance.name,
          type: reportInstance.type,
          format: reportInstance.format || 'PDF',
          generatedAt: reportInstance.generatedAt,
          generatedBy: reportInstance.generatedById || 'System',
          scopeSummary,
          data: parsedData,
        },
      });
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
export const downloadReportInstance = controller.downloadReportInstance;
