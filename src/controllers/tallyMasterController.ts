import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { TallyMasterService } from '../services/TallyMasterService';
import { createRequestLogger } from '../utils/logger';
import { UserRole, PrismaClient } from '@prisma/client';

/**
 * Controller for Tally Master functionality
 * Handles score review, bias checking, and certification
 */
export class TallyMasterController {
  private tallyMasterService: TallyMasterService;
  private prisma: PrismaClient;

  constructor() {
    this.tallyMasterService = container.resolve(TallyMasterService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  /**
   * Get tally master dashboard statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const stats = await this.tallyMasterService.getStats();
      res.json(stats);
    } catch (error) {
      log.error('Get tally master stats error', error);
      return next(error);
    }
  };

  /**
   * Get certified categories
   */
  getCertifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.tallyMasterService.getCertifications(page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get certifications error', error);
      return next(error);
    }
  };

  /**
   * Get certification queue
   */
  getCertificationQueue = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.tallyMasterService.getCertificationQueue(page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get certification queue error', error);
      return next(error);
    }
  };

  /**
   * Get pending certifications
   */
  getPendingCertifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await this.tallyMasterService.getPendingCertifications(page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get pending certifications error', error);
      return next(error);
    }
  };

  /**
   * Certify category totals
   */
  certifyTotals = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { categoryId } = req.body;
      const userId = req.user?.id;
      const userRole = req.user?.role as UserRole;

      if (!userId || !userRole) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const result = await this.tallyMasterService.certifyTotals(categoryId, userId, userRole);
      res.json(result);
    } catch (error) {
      log.error('Certify totals error', error);
      return next(error);
    }
  };

  /**
   * Get score review for a category
   */
  getScoreReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      const result = await this.tallyMasterService.getScoreReview(categoryId);
      res.json(result);
    } catch (error) {
      log.error('Get score review error', error);
      return next(error);
    }
  };

  /**
   * Get certification workflow
   */
  getCertificationWorkflow = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      // Since the original implementation was simplified, we'll just return basic info
      const category = await this.tallyMasterService.getScoreReview(categoryId);

      const certificationStatus = {
        totalsCertified: category.category.scoreCap > 0,
        currentStep: 1,
        totalSteps: 2,
        canProceed: true,
        nextStep: 'CERTIFY_TOTALS',
      };

      res.json({
        category: category.category,
        contest: category.contest,
        certificationStatus,
        totalScores: category.totalScores,
      });
    } catch (error) {
      log.error('Get certification workflow error:', error);
      return next(error);
    }
  };

  /**
   * Get bias checking tools
   */
  getBiasCheckingTools = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      const result = await this.tallyMasterService.getBiasCheckingTools(categoryId);
      res.json(result);
    } catch (error) {
      log.error('Get bias checking tools error', error);
      return next(error);
    }
  };

  /**
   * Get tally master history
   */
  getTallyMasterHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const result = await this.tallyMasterService.getTallyMasterHistory(page, limit);
      res.json(result);
    } catch (error) {
      log.error('Get tally master history error', error);
      return next(error);
    }
  };

  /**
   * Request score removal (delegated to separate controller/service)
   */
  requestScoreRemoval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { categoryId, contestId, judgeId, contestantId, reason } = req.body;
      const userId = (req as any).user?.id;

      if (!judgeId) {
        res.status(400).json({ error: 'Judge ID is required' });
        return;
      }

      if (!categoryId && !contestId) {
        res.status(400).json({ error: 'Either categoryId or contestId is required' });
        return;
      }

      // If contestId is provided, create requests for all categories in that contest
      if (contestId) {
        const categories = await this.prisma.category.findMany({
          where: { contestId },
          select: { id: true }
        });

        if (categories.length === 0) {
          res.status(404).json({ error: 'No categories found for this contest' });
          return;
        }

        // Get all contestants for these categories if contestantId is not provided
        let contestantIds: string[] = [];
        if (contestantId) {
          contestantIds = [contestantId];
        } else {
          const categoryContestants = await this.prisma.categoryContestant.findMany({
            where: { categoryId: { in: categories.map(c => c.id) } },
            select: { contestantId: true },
            distinct: ['contestantId']
          });
          contestantIds = categoryContestants.map(cc => cc.contestantId);
        }

        // Create removal requests for each category-contestant combination
        const requests = [];
        for (const category of categories) {
          for (const cId of contestantIds) {
            const request = await this.prisma.judgeScoreRemovalRequest.create({
              data: {
                categoryId: category.id,
                contestantId: cId,
                judgeId,
                reason: reason || 'Score removal requested',
                status: 'PENDING'
              }
            });
            requests.push(request);
          }
        }

        res.json({
          success: true,
          message: `Created ${requests.length} score removal request(s)`,
          requests: requests
        });
      } else {
        // Single category request
        if (!contestantId) {
          res.status(400).json({ error: 'Contestant ID is required for category-level requests' });
          return;
        }

        const request = await this.prisma.judgeScoreRemovalRequest.create({
          data: {
            categoryId,
            contestantId,
            judgeId,
            reason: reason || 'Score removal requested',
            status: 'PENDING'
          }
        });

        res.json({
          success: true,
          message: 'Score removal request created successfully',
          request: request
        });
      }
    } catch (error) {
      log.error('Request score removal error', error);
      return next(error);
    }
  };

  /**
   * Get score removal requests
   */
  getScoreRemovalRequests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const status = req.query.status as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;
      const contestId = req.query.contestId as string | undefined;

      const result = await this.tallyMasterService.getScoreRemovalRequests(page, limit, status, categoryId, contestId);
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
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      res.status(501).json({ error: 'Score removal approval to be implemented in ScoreRemovalService' });
    } catch (error) {
      log.error('Approve score removal error', error);
      return next(error);
    }
  };

  /**
   * Reject score removal
   */
  rejectScoreRemoval = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      res.status(501).json({ error: 'Score removal rejection to be implemented in ScoreRemovalService' });
    } catch (error) {
      log.error('Reject score removal error', error);
      return next(error);
    }
  };

  /**
   * Get contestant scores
   */
  getContestantScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      res.status(501).json({ error: 'Get contestant scores to be implemented' });
    } catch (error) {
      log.error('Get contestant scores error', error);
      return next(error);
    }
  };

  /**
   * Get judge scores
   */
  getJudgeScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      res.status(501).json({ error: 'Get judge scores to be implemented' });
    } catch (error) {
      log.error('Get judge scores error', error);
      return next(error);
    }
  };

  /**
   * Get category judges
   */
  getCategoryJudges = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        res.status(400).json({ error: 'Category ID required' });
        return;
      }
      const judges = await this.tallyMasterService.getCategoryJudges(categoryId);
      res.json(judges);
    } catch (error) {
      log.error('Get category judges error', error);
      return next(error);
    }
  };

  /**
   * Remove judge contestant scores
   */
  removeJudgeContestantScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      res.status(501).json({ error: 'Remove judge contestant scores to be implemented' });
    } catch (error) {
      log.error('Remove judge contestant scores error', error);
      return next(error);
    }
  };

  /**
   * Get contest score review
   */
  getContestScoreReview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { contestId } = req.params;
      if (!contestId) {
        res.status(400).json({ error: 'Contest ID required' });
        return;
      }
      const result = await this.tallyMasterService.getContestScoreReview(contestId);
      res.json(result);
    } catch (error) {
      log.error('Get contest score review error', error);
      return next(error);
    }
  };

  /**
   * Get contest certifications
   */
  getContestCertifications = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'tallyMaster');
    try {
      const { contestId } = req.params;
      if (!contestId) {
        res.status(400).json({ error: 'Contest ID is required' });
        return;
      }
      
      const result = await this.tallyMasterService.getContestCertifications(contestId);
      res.json(result);
    } catch (error) {
      log.error('Get contest certifications error', error);
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new TallyMasterController();
export const getStats = controller.getStats;
export const getCertifications = controller.getCertifications;
export const getCertificationQueue = controller.getCertificationQueue;
export const getPendingCertifications = controller.getPendingCertifications;
export const certifyTotals = controller.certifyTotals;
export const getScoreReview = controller.getScoreReview;
export const getCertificationWorkflow = controller.getCertificationWorkflow;
export const getBiasCheckingTools = controller.getBiasCheckingTools;
export const getTallyMasterHistory = controller.getTallyMasterHistory;
export const requestScoreRemoval = controller.requestScoreRemoval;
export const getScoreRemovalRequests = controller.getScoreRemovalRequests;
export const approveScoreRemoval = controller.approveScoreRemoval;
export const rejectScoreRemoval = controller.rejectScoreRemoval;
export const getContestantScores = controller.getContestantScores;
export const getJudgeScores = controller.getJudgeScores;
export const getCategoryJudges = controller.getCategoryJudges;
export const removeJudgeContestantScores = controller.removeJudgeContestantScores;
export const getContestScoreReview = controller.getContestScoreReview;
export const getContestCertifications = controller.getContestCertifications;
