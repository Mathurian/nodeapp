import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { PrintService } from '../services/PrintService';
import { successResponse } from '../utils/responseHelpers';
import { getRequiredParam } from '../utils/routeHelpers';
import {
  PrintTemplateInput,
  PrintEventReportInput,
  PrintContestResultsInput,
  PrintJudgePerformanceInput,
} from '../types/print.types';

/**
 * Print Controller
 * Handles print templates, PDF generation, and report printing
 */
export class PrintController {
  private printService: PrintService;

  constructor() {
    this.printService = container.resolve(PrintService);
  }

  /**
   * Get all print templates
   */
  getPrintTemplates = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const templates = await this.printService.getPrintTemplates();
      successResponse(res, { templates }, 'Print templates retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create custom print template
   */
  createPrintTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const data: PrintTemplateInput = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const template = await this.printService.createPrintTemplate(data, userId);
      successResponse(res, { template }, 'Print template created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update print template
   */
  updatePrintTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      const data: Partial<PrintTemplateInput> = req.body;

      const template = await this.printService.updatePrintTemplate(id, data);
      successResponse(res, { template }, 'Print template updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete print template
   */
  deletePrintTemplate = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      await this.printService.deletePrintTemplate(id);
      successResponse(res, null, 'Print template deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print event report
   */
  printEventReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input: PrintEventReportInput = req.body;
      const userName = req.user?.name || 'Unknown';

      const output = await this.printService.printEventReport(input, userName);

      res.setHeader('Content-Type', output.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${output.filename}"`
      );
      res.send(output.content);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print contest results
   */
  printContestResults = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input: PrintContestResultsInput = req.body;
      const userName = req.user?.name || 'Unknown';

      const output = await this.printService.printContestResults(input, userName);

      res.setHeader('Content-Type', output.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${output.filename}"`
      );
      res.send(output.content);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print judge performance report
   */
  printJudgePerformance = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const input: PrintJudgePerformanceInput = req.body;
      const userName = req.user?.name || 'Unknown';

      const output = await this.printService.printJudgePerformance(input, userName);

      res.setHeader('Content-Type', output.contentType);
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${output.filename}"`
      );
      res.send(output.content);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print contestant report
   */
  printContestantReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      const contestant = await this.printService.getContestantReport(id);
      successResponse(res, contestant, 'Contestant report retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print judge report
   */
  printJudgeReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      const judge = await this.printService.getJudgeReport(id);
      successResponse(res, judge, 'Judge report retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print category report
   */
  printCategoryReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      const category = await this.printService.getCategoryReport(id);
      successResponse(res, category, 'Category report retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print contest report
   */
  printContestReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      const contest = await this.printService.getContestReport(id);
      successResponse(res, contest, 'Contest report retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Print archived contest report
   */
  printArchivedContestReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const id = getRequiredParam(req, 'id');
      const contest = await this.printService.getArchivedContestReport(id);
      successResponse(res, contest, 'Archived contest report retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new PrintController();

export const getPrintTemplates = controller.getPrintTemplates;
export const createPrintTemplate = controller.createPrintTemplate;
export const updatePrintTemplate = controller.updatePrintTemplate;
export const deletePrintTemplate = controller.deletePrintTemplate;
export const printEventReport = controller.printEventReport;
export const printContestResults = controller.printContestResults;
export const printJudgePerformance = controller.printJudgePerformance;
export const printContestantReport = controller.printContestantReport;
export const printJudgeReport = controller.printJudgeReport;
export const printCategoryReport = controller.printCategoryReport;
export const printContestReport = controller.printContestReport;
export const printArchivedContestReport = controller.printArchivedContestReport;
