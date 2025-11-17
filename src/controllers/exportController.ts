import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { ExportService } from '../services/ExportService';
import { sendSuccess } from '../utils/responseHelpers';

export class ExportController {
  private exportService: ExportService;

  constructor() {
    this.exportService = container.resolve(ExportService);
  }

  /**
   * Export event data to Excel
   */
  exportEventToExcel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { eventId, includeDetails = false } = req.body;

      if (!eventId) {
        res.status(400).json({ error: 'Event ID is required' });
        return;
      }

      const filepath = await this.exportService.exportEventToExcel(
        eventId,
        Boolean(includeDetails)
      );

      sendSuccess(res, { filepath }, 'Event exported to Excel successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Export contest results to CSV
   */
  exportContestResultsToCSV = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { contestId } = req.body;

      if (!contestId) {
        res.status(400).json({ error: 'Contest ID is required' });
        return;
      }

      const filepath = await this.exportService.exportContestResultsToCSV(contestId);

      sendSuccess(res, { filepath }, 'Contest results exported to CSV successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Export judge performance to XML
   */
  exportJudgePerformanceToXML = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { judgeId } = req.body;

      if (!judgeId) {
        res.status(400).json({ error: 'Judge ID is required' });
        return;
      }

      const filepath = await this.exportService.exportJudgePerformanceToXML(judgeId);

      sendSuccess(res, { filepath }, 'Judge performance exported to XML successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Export system analytics to PDF
   */
  exportSystemAnalyticsToPDF = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const { startDate, endDate } = req.body;

      const filepath = await this.exportService.exportSystemAnalyticsToPDF(
        startDate,
        endDate
      );

      sendSuccess(res, { filepath }, 'System analytics exported to PDF successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get export history
   */
  getExportHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = (req as any).user;
      const { limit } = req.query;

      const result = await this.exportService.getExportHistory(
        user.id,
        limit ? Number(limit) : undefined
      );

      sendSuccess(res, result, result.message);
    } catch (error) {
      return next(error);
    }
  };
}

// Export controller instance and methods
const controller = new ExportController();
export const exportEventToExcel = controller.exportEventToExcel;
export const exportContestResultsToCSV = controller.exportContestResultsToCSV;
export const exportJudgePerformanceToXML = controller.exportJudgePerformanceToXML;
export const exportSystemAnalyticsToPDF = controller.exportSystemAnalyticsToPDF;
export const getExportHistory = controller.getExportHistory;
