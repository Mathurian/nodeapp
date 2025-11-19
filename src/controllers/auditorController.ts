import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { AuditorService } from '../services/AuditorService';
import { createRequestLogger } from '../utils/logger';

/**
 * Controller for Auditor functionality
 * Handles score verification, final certification, and audit workflows
 */
export class AuditorController {
  private auditorService: AuditorService;

  constructor() {
    this.auditorService = container.resolve(AuditorService);
  }

  /**
   * Get auditor dashboard statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const stats = await this.auditorService.getStats();
      res.json(stats);
    } catch (error) {
      log.error('Get auditor stats error', error);
      return next(error);
    }
  };

  /**
   * Get pending audits
   */
  getPendingAudits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;

      const result = await this.auditorService.getPendingAudits(page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get pending audits error', error);
      return next(error);
    }
  };

  /**
   * Get completed audits
   */
  getCompletedAudits = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;

      const result = await this.auditorService.getCompletedAudits(page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get completed audits error', error);
      return next(error);
    }
  };

  /**
   * Final certification for a category
   */
  finalCertification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId } = req.params;
      const userId = req.user?.id;

      if (!categoryId || !userId) {
        res.status(400).json({ error: 'Category ID and user required' });
        return;
      }

      const result = await this.auditorService.finalCertification(categoryId, userId);
      res.json(result);
    } catch (error) {
      log.error('Final certification error', error);
      return next(error);
    }
  };

  /**
   * Reject an audit
   */
  rejectAudit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!categoryId || !userId) {
        res.status(400).json({ error: 'Category ID and user required' });
        return;
      }

      const result = await this.auditorService.rejectAudit(categoryId, userId, reason);
      res.json(result);
    } catch (error) {
      log.error('Reject audit error', error);
      return next(error);
    }
  };

  /**
   * Get score verification data
   */
  getScoreVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId, contestantId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      const result = await this.auditorService.getScoreVerification(categoryId, contestantId);
      res.json(result);
    } catch (error) {
      log.error('Get score verification error', error);
      return next(error);
    }
  };

  /**
   * Verify a score
   */
  verifyScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { scoreId } = req.params;
      const { verified, comments, issues } = req.body;
      const userId = req.user?.id;

      if (!scoreId || !userId) {
        res.status(400).json({ error: 'Score ID and user required' });
        return;
      }

      const result = await this.auditorService.verifyScore(scoreId, userId, {
        verified,
        comments,
        issues,
      });

      res.json(result);
    } catch (error) {
      log.error('Verify score error', error);
      return next(error);
    }
  };

  /**
   * Get tally master status
   */
  getTallyMasterStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      const result = await this.auditorService.getTallyMasterStatus(categoryId);
      res.json(result);
    } catch (error) {
      log.error('Get tally master status error', error);
      return next(error);
    }
  };

  /**
   * Get certification workflow
   */
  getCertificationWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      const result = await this.auditorService.getCertificationWorkflow(categoryId);
      res.json(result);
    } catch (error) {
      log.error('Get certification workflow error', error);
      return next(error);
    }
  };

  /**
   * Generate summary report
   */
  generateSummaryReport = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId, includeDetails = false } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.auditorService.generateSummaryReport(
        categoryId,
        userId,
        includeDetails === true || includeDetails === 'true'
      );

      res.json(result);
    } catch (error) {
      log.error('Generate summary report error', error);
      return next(error);
    }
  };

  /**
   * Get audit history
   */
  getAuditHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'auditor');
    try {
      const { categoryId } = req.query;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 20;

      const result = await this.auditorService.getAuditHistory(categoryId as string, page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get audit history error', error);
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new AuditorController();
export const getStats = controller.getStats;
export const getPendingAudits = controller.getPendingAudits;
export const getCompletedAudits = controller.getCompletedAudits;
export const finalCertification = controller.finalCertification;
export const rejectAudit = controller.rejectAudit;
export const getScoreVerification = controller.getScoreVerification;
export const verifyScore = controller.verifyScore;
export const getTallyMasterStatus = controller.getTallyMasterStatus;
export const getCertificationWorkflow = controller.getCertificationWorkflow;
export const generateSummaryReport = controller.generateSummaryReport;
export const getAuditHistory = controller.getAuditHistory;
