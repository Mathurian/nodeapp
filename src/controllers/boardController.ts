import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { BoardService } from '../services/BoardService';
import { createRequestLogger } from '../utils/logger';

/**
 * Controller for Board functionality
 * Handles certification approvals, emcee scripts, and board-level reports
 */
export class BoardController {
  private boardService: BoardService;

  constructor() {
    this.boardService = container.resolve(BoardService);
  }

  /**
   * Get board dashboard statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const stats = await this.boardService.getStats();
      res.json(stats);
    } catch (error) {
      log.error('Get board stats error', error);
      return next(error);
    }
  };

  /**
   * Get all certifications
   */
  getCertifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const certifications = await this.boardService.getCertifications();
      res.json(certifications);
    } catch (error) {
      log.error('Get certifications error', error);
      return next(error);
    }
  };

  /**
   * Approve category certification
   */
  approveCertification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }

      const result = await this.boardService.approveCertification(id);
      res.json(result);
    } catch (error) {
      log.error('Approve certification error', error);
      return next(error);
    }
  };

  /**
   * Reject category certification
   */
  rejectCertification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }

      const result = await this.boardService.rejectCertification(id, reason);
      res.json(result);
    } catch (error) {
      log.error('Reject certification error', error);
      return next(error);
    }
  };

  /**
   * Get certification status summary
   */
  getCertificationStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const status = await this.boardService.getCertificationStatus();
      res.json(status);
    } catch (error) {
      log.error('Get certification status error', error);
      return next(error);
    }
  };

  /**
   * Get all emcee scripts
   */
  getEmceeScripts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const scripts = await this.boardService.getEmceeScripts();
      res.json(scripts);
    } catch (error) {
      log.error('Get emcee scripts error', error);
      return next(error);
    }
  };

  /**
   * Create emcee script
   */
  createEmceeScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { title, content, type, eventId, contestId, categoryId, order, notes } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const script = await this.boardService.createEmceeScript({
        title,
        content,
        type,
        eventId,
        contestId,
        categoryId,
        order,
        notes,
        userId,
        tenantId: req.user!.tenantId,
      });

      res.status(201).json(script);
    } catch (error) {
      log.error('Create emcee script error', error);
      return next(error);
    }
  };

  /**
   * Update emcee script
   */
  updateEmceeScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { id } = req.params;
      const { title, content, type, eventId, contestId, categoryId, order, notes, isActive } = req.body;

      if (!id) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }

      const script = await this.boardService.updateEmceeScript(id, {
        title,
        content,
        type,
        eventId,
        contestId,
        categoryId,
        order,
        notes,
        isActive,
      });

      res.json(script);
    } catch (error) {
      log.error('Update emcee script error', error);
      return next(error);
    }
  };

  /**
   * Delete emcee script
   */
  deleteEmceeScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }

      const result = await this.boardService.deleteEmceeScript(id);
      res.json(result);
    } catch (error) {
      log.error('Delete emcee script error', error);
      return next(error);
    }
  };

  /**
   * Generate board report
   */
  generateReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { type } = req.body;

      log.warn('Generate report - not fully implemented', { type });
      res.status(501).json({ error: 'Report generation to be implemented in ReportGenerationService' });
    } catch (error) {
      log.error('Generate report error', error);
      return next(error);
    }
  };

  /**
   * Get score removal requests
   */
  getScoreRemovalRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const status = req.query.status as string;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.boardService.getScoreRemovalRequests(status, page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get score removal requests error', error);
      return next(error);
    }
  };

  /**
   * Approve score removal
   */
  approveScoreRemoval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!id || !userId) {
        res.status(400).json({ error: 'Request ID and user required' });
        return;
      }

      const result = await this.boardService.approveScoreRemoval(id, userId, reason);
      res.json(result);
    } catch (error) {
      log.error('Approve score removal error', error);
      return next(error);
    }
  };

  /**
   * Reject score removal
   */
  rejectScoreRemoval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'board');
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!id || !userId) {
        res.status(400).json({ error: 'Request ID and user required' });
        return;
      }

      const result = await this.boardService.rejectScoreRemoval(id, userId, reason);
      res.json(result);
    } catch (error) {
      log.error('Reject score removal error', error);
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new BoardController();
export const getStats = controller.getStats;
export const getCertifications = controller.getCertifications;
export const approveCertification = controller.approveCertification;
export const rejectCertification = controller.rejectCertification;
export const getCertificationStatus = controller.getCertificationStatus;
export const getEmceeScripts = controller.getEmceeScripts;
export const createEmceeScript = controller.createEmceeScript;
export const updateEmceeScript = controller.updateEmceeScript;
export const deleteEmceeScript = controller.deleteEmceeScript;
export const generateReport = controller.generateReport;
export const getScoreRemovalRequests = controller.getScoreRemovalRequests;
export const approveScoreRemoval = controller.approveScoreRemoval;
export const rejectScoreRemoval = controller.rejectScoreRemoval;
