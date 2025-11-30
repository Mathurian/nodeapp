/**
 * Scoring Controller
 * Handles HTTP requests for score management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoringService, SubmitScoreDTO, UpdateScoreDTO } from '../services/ScoringService';
import { AuditLogService } from '../services/AuditLogService';
import { sendSuccess, sendCreated, sendError, sendNoContent } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';
import { PrismaClient, Prisma } from '@prisma/client';

export class ScoringController {
  private scoringService: ScoringService;
  private prisma: PrismaClient;

  constructor() {
    this.scoringService = container.resolve(ScoringService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  /**
   * Get scores for a category
   */
  getScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const categoryId = req.params['categoryId']!;
      const contestantId = req.params['contestantId'];
      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';

      log.debug('Fetching scores', { categoryId, contestantId, tenantId });

      // Fix: Pass tenantId as second parameter, contestantId as third
      const scores = await this.scoringService.getScoresByCategory(categoryId, tenantId, contestantId);

      log.info('Scores retrieved successfully', { categoryId, contestantId, count: scores.length });
      sendSuccess(res, scores);
    } catch (error) {
      log.error('Get scores error', { error: (error as Error).message, categoryId: req.params['categoryId'] });
      return next(error);
    }
  };

  /**
   * Submit a new score
   */
  submitScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const categoryId = req.params['categoryId']!;
      const contestantId = req.params['contestantId']!;
      const { criteriaId, score, comments } = req.body;

      if (!req.user) {
        sendError(res, 'User not authenticated', 401);
        return;
      }

      const data: SubmitScoreDTO = {
        categoryId,
        contestantId,
        criteriaId,
        score,
        comments
      };

      log.info('Score submission requested', {
        categoryId,
        contestantId,
        criteriaId,
        score,
        hasComments: !!comments,
        userId: req.user.id
      });

      const newScore = await this.scoringService.submitScore(data, req.user.id, req.user!.tenantId);

      log.info('Score submitted successfully', { scoreId: newScore.id });

      // Audit log: score submission
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'score.submitted',
          'Score',
          newScore.id,
          req,
          undefined,
          {
            categoryId,
            contestantId,
            criteriaId,
            score,
            judgeId: req.user.id
          }
        );
      } catch (auditError) {
        log.error('Failed to log score submission audit', { error: auditError });
      }

      sendCreated(res, newScore);
    } catch (error) {
      log.error('Submit score error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Update an existing score
   */
  updateScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const scoreId = req.params['scoreId']!;
      const { score, comments } = req.body;

      const data: UpdateScoreDTO = {
        score,
        comments
      };

      log.info('Score update requested', { scoreId });

      // Get old score for change tracking with tenant filtering
      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';
      const oldScore = await this.prisma.score.findFirst({
        where: {
          id: scoreId,
          tenantId: tenantId
        }
      });

      // SECURITY: Check if score exists
      if (!oldScore) {
        log.warn('Score not found for update', { scoreId });
        sendError(res, 'Score not found', 404);
        return;
      }

      // SECURITY: Check if score is locked
      if (oldScore.isLocked) {
        log.warn('Attempt to update locked score', {
          scoreId,
          userId: req.user?.id,
          lockedAt: oldScore.lockedAt,
          lockedBy: oldScore.lockedBy
        });
        sendError(res, 'Cannot modify locked score', 403);
        return;
      }

      // SECURITY: Check if score is certified
      if (oldScore.isCertified) {
        log.warn('Attempt to update certified score', {
          scoreId,
          userId: req.user?.id,
          certifiedAt: oldScore.certifiedAt,
          certifiedBy: oldScore.certifiedBy
        });
        sendError(res, 'Cannot modify certified score', 403);
        return;
      }

      // SECURITY: Verify judge owns score (unless admin)
      const userRole = req.user?.role;
      if (
        userRole !== 'SUPER_ADMIN' &&
        userRole !== 'ADMIN' &&
        oldScore.judgeId !== req.user?.judgeId
      ) {
        log.warn('Attempt to update another judge\'s score', {
          scoreId,
          userId: req.user?.id,
          userJudgeId: req.user?.judgeId,
          scoreJudgeId: oldScore.judgeId
        });
        sendError(res, 'Can only update your own scores', 403);
        return;
      }

      const updatedScore = await this.scoringService.updateScore(scoreId, data, tenantId);

      log.info('Score updated successfully', { scoreId });

      // Audit log: score update with change tracking
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logEntityChange({
          action: 'score.updated',
          entityType: 'Score',
          entityId: scoreId,
          oldData: oldScore,
          newData: updatedScore,
          req,
          tenantId
        });
      } catch (auditError) {
        log.error('Failed to log score update audit', { error: auditError });
      }

      sendSuccess(res, updatedScore);
    } catch (error) {
      log.error('Update score error', { error: (error as Error).message, scoreId: req.params['scoreId'] });
      return next(error);
    }
  };

  /**
   * Delete a score
   */
  deleteScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const scoreId = req.params['scoreId']!;
      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';

      log.info('Score deletion requested', { scoreId });

      // Get score data before deletion for audit log with tenant filtering
      const score = await this.prisma.score.findFirst({
        where: {
          id: scoreId,
          tenantId: tenantId
        }
      });

      // SECURITY: Check if score exists
      if (!score) {
        log.warn('Score not found for deletion', { scoreId });
        sendError(res, 'Score not found', 404);
        return;
      }

      // SECURITY: Check if score is locked or certified
      if (score.isLocked) {
        log.warn('Attempt to delete locked score', {
          scoreId,
          userId: req.user?.id,
          lockedAt: score.lockedAt,
          lockedBy: score.lockedBy
        });
        sendError(res, 'Cannot delete locked score', 403);
        return;
      }

      if (score.isCertified) {
        log.warn('Attempt to delete certified score', {
          scoreId,
          userId: req.user?.id,
          certifiedAt: score.certifiedAt,
          certifiedBy: score.certifiedBy
        });
        sendError(res, 'Cannot delete certified score', 403);
        return;
      }

      // SECURITY: Verify judge owns score (unless admin)
      const userRole = req.user?.role;
      if (
        userRole !== 'SUPER_ADMIN' &&
        userRole !== 'ADMIN' &&
        score.judgeId !== req.user?.judgeId
      ) {
        log.warn('Attempt to delete another judge\'s score', {
          scoreId,
          userId: req.user?.id,
          userJudgeId: req.user?.judgeId,
          scoreJudgeId: score.judgeId
        });
        sendError(res, 'Can only delete your own scores', 403);
        return;
      }

      await this.scoringService.deleteScore(scoreId, tenantId);

      // Audit log: score deletion
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'score.deleted',
          'Score',
          scoreId,
          req,
          undefined,
          {
            categoryId: score?.categoryId,
            contestantId: score?.contestantId,
            criterionId: score?.criterionId,
            score: score?.score
          }
        );
      } catch (auditError) {
        log.error('Failed to log score deletion audit', { error: auditError });
      }

      log.info('Score deleted successfully', { scoreId });
      sendNoContent(res);
    } catch (error) {
      log.error('Delete score error', { error: (error as Error).message, scoreId: req.params['scoreId'] });
      return next(error);
    }
  };

  /**
   * Certify a single score
   */
  certifyScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const scoreId = req.params['scoreId']!;

      if (!req.user) {
        sendError(res, 'User not authenticated', 401);
        return;
      }

      log.info('Score certification requested', { scoreId, certifiedBy: req.user.id });

      const certifiedScore = await this.scoringService.certifyScore(scoreId, req.user.id, req.user!.tenantId);

      log.info('Score certified successfully', { scoreId });

      // Audit log: score certification
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'score.certified',
          'Score',
          scoreId,
          req,
          undefined,
          { certifiedBy: req.user.id, certifiedAt: new Date() }
        );
      } catch (auditError) {
        log.error('Failed to log score certification audit', { error: auditError });
      }

      sendSuccess(res, certifiedScore);
    } catch (error) {
      log.error('Certify score error', { error: (error as Error).message, scoreId: req.params['scoreId'] });
      return next(error);
    }
  };

  /**
   * Certify all scores for a category
   */
  certifyScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const categoryId = req.params['categoryId']!;

      if (!req.user) {
        sendError(res, 'User not authenticated', 401);
        return;
      }

      log.info('Category scores certification requested', { categoryId, certifiedBy: req.user.id });

      const result = await this.scoringService.certifyScores(categoryId, req.user.id, req.user!.tenantId);

      log.info('Category scores certified successfully', { categoryId, certified: result.certified });
      sendSuccess(res, result);
    } catch (error) {
      log.error('Certify scores error', { error: (error as Error).message, categoryId: req.params['categoryId'] });
      return next(error);
    }
  };

  /**
   * Unsign a score (remove certification)
   */
  unsignScore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const scoreId = req.params['scoreId']!;

      log.info('Score unsigned requested', { scoreId });

      const unsignedScore = await this.scoringService.unsignScore(scoreId, req.user!.tenantId);

      log.info('Score unsigned successfully', { scoreId });
      sendSuccess(res, unsignedScore);
    } catch (error) {
      log.error('Unsign score error', { error: (error as Error).message, scoreId: req.params['scoreId'] });
      return next(error);
    }
  };

  /**
   * Get scores by judge
   */
  getScoresByJudge = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const judgeId = req.params['judgeId']!;

      log.debug('Fetching scores by judge', { judgeId });

      const scores = await this.scoringService.getScoresByJudge(judgeId, req.user!.tenantId);

      log.info('Scores by judge retrieved successfully', { judgeId, count: scores.length });
      sendSuccess(res, scores);
    } catch (error) {
      log.error('Get scores by judge error', { error: (error as Error).message, judgeId: req.params['judgeId'] });
      return next(error);
    }
  };

  /**
   * Get scores by contestant
   */
  getScoresByContestant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const contestantId = req.params['contestantId']!;

      log.debug('Fetching scores by contestant', { contestantId });

      const scores = await this.scoringService.getScoresByContestant(contestantId, req.user!.tenantId);

      log.info('Scores by contestant retrieved successfully', { contestantId, count: scores.length });
      sendSuccess(res, scores);
    } catch (error) {
      log.error('Get scores by contestant error', {
        error: (error as Error).message,
        contestantId: req.params['contestantId']
      });
      return next(error);
    }
  };

  /**
   * Get scores by contest
   */
  getScoresByContest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const contestId = req.params['contestId']!;

      log.debug('Fetching scores by contest', { contestId });

      const scores = await this.scoringService.getScoresByContest(contestId, req.user!.tenantId);

      log.info('Scores by contest retrieved successfully', { contestId, count: scores.length });
      sendSuccess(res, scores);
    } catch (error) {
      log.error('Get scores by contest error', { error: (error as Error).message, contestId: req.params['contestId'] });
      return next(error);
    }
  };

  /**
   * Get contest score statistics
   */
  getContestStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const contestId = req.params['contestId']!;

      log.debug('Fetching contest statistics', { contestId });

      const stats = await this.scoringService.getContestStats(contestId, req.user!.tenantId);

      log.info('Contest statistics retrieved successfully', { contestId });
      sendSuccess(res, stats);
    } catch (error) {
      log.error('Get contest stats error', { error: (error as Error).message, contestId: req.params['contestId'] });
      return next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const contestId = req.query['contestId'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;

      const where: Prisma.CategoryWhereInput = {
        tenantId: req.user!.tenantId
      };
      if (contestId) where.contestId = contestId;
      if (eventId && !contestId) {
        // Only use nested filter if not using contestId
        where.contestId = undefined;
      }

      const categories = (await this.prisma.category.findMany({
        where,
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              event: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          _count: {
            select: {
              scores: true,
              contestants: true
            }
          }
        } as any,
        orderBy: { name: 'asc' }
      } as any)) as any;

      return sendSuccess(res, categories);
    } catch (error) {
      return next(error);
    }
  };

  certifyTotals = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      const { signatureName, comments } = req.body;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      // Check if category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId! }
      });

      if (!category) {
        return sendSuccess(res, {}, 'Category not found', 404);
      }

      // Create or update category certification for TALLY_MASTER
      const certification = await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId: req.user!.tenantId,
            categoryId: categoryId!,
            role: 'TALLY_MASTER'
          }
        },
        create: {
          categoryId: categoryId!,
          role: 'TALLY_MASTER',
          userId: req.user.id,
          signatureName: signatureName || null,
          comments: comments || null,
          tenantId: req.user!.tenantId
        },
        update: {
          userId: req.user.id,
          signatureName: signatureName || null,
          comments: comments || null,
          certifiedAt: new Date()
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, certification, 'Totals certified successfully by Tally Master');
    } catch (error) {
      return next(error);
    }
  };

  finalCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      const { signatureName, comments } = req.body;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      // Check if category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return sendSuccess(res, {}, 'Category not found', 404);
      }

      // Check if Tally Master has certified
      const tallyMasterCert = await this.prisma.categoryCertification.findUnique({
        where: {
          tenantId_categoryId_role: {
            tenantId: req.user!.tenantId,
            categoryId: categoryId!,
            role: 'TALLY_MASTER'
          }
        }
      });

      if (!tallyMasterCert) {
        return sendSuccess(res, {}, 'Tally Master must certify totals first', 400);
      }

      // Create or update category certification for AUDITOR
      const certification = await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId: req.user!.tenantId,
            categoryId: categoryId!,
            role: 'AUDITOR'
          }
        },
        create: {
          categoryId: categoryId!,
          role: 'AUDITOR',
          userId: req.user.id,
          signatureName: signatureName || null,
          comments: comments || null,
          tenantId: req.user!.tenantId
        },
        update: {
          userId: req.user.id,
          signatureName: signatureName || null,
          comments: comments || null,
          certifiedAt: new Date()
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, certification, 'Final certification completed by Auditor');
    } catch (error) {
      return next(error);
    }
  };

  requestDeduction = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestantId, categoryId, amount, reason } = req.body;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if (!contestantId || !categoryId || amount === undefined || !reason) {
        return sendSuccess(res, {}, 'contestantId, categoryId, amount, and reason are required', 400);
      }

      // Verify category and contestant exist
      const [category, contestant] = await Promise.all([
        this.prisma.category.findUnique({ where: { id: categoryId } }),
        this.prisma.contestant.findUnique({ where: { id: contestantId } })
      ]);

      if (!category) {
        return sendSuccess(res, {}, 'Category not found', 404);
      }
      if (!contestant) {
        return sendSuccess(res, {}, 'Contestant not found', 404);
      }

      const deductionRequest = await this.prisma.deductionRequest.create({
        data: {
          contestantId,
          categoryId,
          amount,
          reason,
          requestedById: req.user.id,
          status: 'PENDING',
          tenantId: req.user!.tenantId
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, deductionRequest, 'Deduction request created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  approveDeduction = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deductionId } = req.params;
      const { isHeadJudge } = req.body;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      const deduction = await this.prisma.deductionRequest.findUnique({
        where: { id: deductionId! }
      });

      if (!deduction) {
        return sendSuccess(res, {}, 'Deduction request not found', 404);
      }

      if (deduction.status !== 'PENDING') {
        return sendSuccess(res, {}, `Deduction request already ${deduction.status.toLowerCase()}`, 400);
      }

      // Create approval record
      await this.prisma.deductionApproval.create({
        data: {
          requestId: deductionId!,
          approvedById: req.user.id,
          role: req.user.role,
          isHeadJudge: isHeadJudge || false,
          tenantId: req.user!.tenantId
        }
      });

      // Update deduction request status to APPROVED
      const updated = await this.prisma.deductionRequest.update({
        where: { id: deductionId! },
        data: { status: 'APPROVED' },
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Deduction request approved successfully');
    } catch (error) {
      return next(error);
    }
  };

  rejectDeduction = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deductionId } = req.params;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      const deduction = await this.prisma.deductionRequest.findUnique({
        where: { id: deductionId }
      });

      if (!deduction) {
        return sendSuccess(res, {}, 'Deduction request not found', 404);
      }

      if (deduction.status !== 'PENDING') {
        return sendSuccess(res, {}, `Deduction request already ${deduction.status.toLowerCase()}`, 400);
      }

      const updated = await this.prisma.deductionRequest.update({
        where: { id: deductionId },
        data: { status: 'REJECTED' }
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Deduction request rejected');
    } catch (error) {
      return next(error);
    }
  };

  getDeductions = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const status = req.query['status'] as string | undefined;
      const categoryId = req.query['categoryId'] as string | undefined;
      const contestantId = req.query['contestantId'] as string | undefined;

      const where: any = {};
      if (status) where.status = status;
      if (categoryId) where.categoryId = categoryId;
      if (contestantId) where.contestantId = contestantId;

      const deductions = await this.prisma.deductionRequest.findMany({
        where,
        // include removed - no relations in schema
        orderBy: { createdAt: 'desc' }
      });

      return sendSuccess(res, deductions);
    } catch (error) {
      return next(error);
    }
  };

  certifyJudgeContestScores = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId, contestId } = req.body;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      if (!judgeId || !contestId) {
        return sendSuccess(res, {}, 'judgeId and contestId are required', 400);
      }

      // Verify judge and contest exist
      const [judge, contest] = await Promise.all([
        this.prisma.user.findUnique({ where: { id: judgeId } }),
        this.prisma.contest.findUnique({ where: { id: contestId } })
      ]);

      if (!judge) {
        return sendSuccess(res, {}, 'Judge not found', 404);
      }
      if (!contest) {
        return sendSuccess(res, {}, 'Contest not found', 404);
      }

      // Get all categories in this contest
      const categories = await this.prisma.category.findMany({
        where: { contestId },
        select: { id: true }
      });

      const categoryIds = categories.map(c => c.id);

      // Certify all scores for this judge in all categories of this contest
      const result = await this.prisma.score.updateMany({
        where: {
          judgeId,
          categoryId: { in: categoryIds },
          isCertified: false
        },
        data: {
          isCertified: true,
          certifiedAt: new Date(),
          certifiedBy: req.user.id
        }
      });

      return sendSuccess(res, {
        judgeId,
        contestId,
        certifiedCount: result.count,
        certifiedBy: req.user.id,
        certifiedAt: new Date()
      }, `Certified ${result.count} scores for judge in contest`);
    } catch (error) {
      return next(error);
    }
  };

  uncertifyCategory = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;

      if (!req.user) {
        return sendError(res, 'User not authenticated', 401);
      }

      // Check if category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return sendSuccess(res, {}, 'Category not found', 404);
      }

      // Remove all role-based certifications for this category
      const deletedCertifications = await this.prisma.categoryCertification.deleteMany({
        where: { categoryId }
      });

      // Uncertify all scores in this category
      const uncertifiedScores = await this.prisma.score.updateMany({
        where: {
          categoryId,
          isCertified: true
        },
        data: {
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null
        }
      });

      return sendSuccess(res, {
        categoryId,
        removedCertifications: deletedCertifications.count,
        uncertifiedScores: uncertifiedScores.count
      }, 'Category uncertified successfully');
    } catch (error) {
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new ScoringController();

export const getScores = controller.getScores;
export const submitScore = controller.submitScore;
export const updateScore = controller.updateScore;
export const deleteScore = controller.deleteScore;
export const certifyScore = controller.certifyScore;
export const certifyScores = controller.certifyScores;
export const unsignScore = controller.unsignScore;
export const getScoresByJudge = controller.getScoresByJudge;
export const getScoresByContestant = controller.getScoresByContestant;
export const getScoresByContest = controller.getScoresByContest;
export const getContestStats = controller.getContestStats;
export const getCategories = controller.getCategories;
export const certifyTotals = controller.certifyTotals;
export const finalCertification = controller.finalCertification;
export const requestDeduction = controller.requestDeduction;
export const approveDeduction = controller.approveDeduction;
export const rejectDeduction = controller.rejectDeduction;
export const getDeductions = controller.getDeductions;
export const certifyJudgeContestScores = controller.certifyJudgeContestScores;
export const uncertifyCategory = controller.uncertifyCategory;
