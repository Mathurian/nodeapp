import { NextFunction, Request, Response } from 'express';
import { container } from '../config/container';
import { JudgeScheduleService } from '../services/JudgeScheduleService';
import { sendError, sendSuccess, sendUnauthorized } from '../utils/responseHelpers';

export class JudgeScheduleController {
  private judgeScheduleService: JudgeScheduleService;

  constructor() {
    this.judgeScheduleService = container.resolve(JudgeScheduleService);
  }

  listSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const requestedJudgeId = typeof req.query['judgeId'] === 'string' ? req.query['judgeId'] : undefined;
      const eventId = typeof req.query['eventId'] === 'string' ? req.query['eventId'] : undefined;
      const includePast = req.query['includePast'] === 'true';
      const effectiveJudgeId = req.user.role === 'JUDGE'
        ? (req.user.judgeId || req.user.judge?.id || undefined)
        : requestedJudgeId;

      if (req.user.role === 'JUDGE' && !effectiveJudgeId) {
        sendError(res, 'Judge account is not linked to a judge profile', 400);
        return;
      }

      const schedules = await this.judgeScheduleService.listSchedules(req.user.tenantId, {
        judgeId: effectiveJudgeId,
        eventId,
        includePast,
      });

      sendSuccess(res, schedules, 'Judge schedules retrieved successfully');
    } catch (error) {
      next(error);
    }
  };

  importSchedules = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      if (!req.file) {
        sendError(res, 'CSV file is required', 400);
        return;
      }

      const result = await this.judgeScheduleService.importFromCsvBuffer(
        req.file.buffer,
        req.user.tenantId,
        req.user.id,
      );

      sendSuccess(res, result, 'Judge schedule import completed');
    } catch (error) {
      next(error);
    }
  };

  downloadTemplate = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const csv = this.judgeScheduleService.getTemplateCsv();
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=judge-schedule-template.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  };
}

const controller = new JudgeScheduleController();

export const listJudgeSchedules = controller.listSchedules;
export const importJudgeSchedules = controller.importSchedules;
export const downloadJudgeScheduleTemplate = controller.downloadTemplate;
