/**
 * Scoring Controller
 * Handles HTTP requests for score management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoringService, SubmitScoreDTO, UpdateScoreDTO } from '../services/ScoringService';
import { ContestantScoreFilterService } from '../services/ContestantScoreFilterService';
import { AuditLogService } from '../services/AuditLogService';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendCreated,
  sendNoContent,
  errorResponse
} from '../utils/responseHelpers';
import { ErrorCode } from '../types/errors';
import { createRequestLogger } from '../utils/logger';
import { PrismaClient, Prisma } from '@prisma/client';
import { requireAuthAndTenant } from '../utils/requestValidation';
import { parsePaginationQuery, getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { resolveBioFromCandidates } from '../utils/bioResolver';
import { applyCertificationStage, refreshJudgeStage } from '../utils/certificationPipeline';

export class ScoringController {
  private scoringService: ScoringService;
  private contestantFilterService: ContestantScoreFilterService;
  private prisma: PrismaClient;

  constructor() {
    this.scoringService = container.resolve(ScoringService);
    this.contestantFilterService = container.resolve(ContestantScoreFilterService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  /**
   * Get scores for a category
   * PHASE 2.1: Enforces contestant score visibility restrictions
   */
  getScores = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      const categoryId = req.params['categoryId']!;
      const contestantId = req.query['contestantId'] as string | undefined;
      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';
      const userRole = req.user?.role;
      const userId = req.user?.id;

      log.debug('Fetching scores', { categoryId, contestantId, tenantId, userRole });

      // PHASE 2.1: Enforce contestant filtering for CONTESTANT role
      if (userRole === 'CONTESTANT' && userId) {
        // Get user's contestantId
        const user = await this.prisma.user.findUnique({
          where: { id: userId, tenantId },
          select: { contestantId: true }
        });

        const userContestantId = user?.contestantId || null;

        // Use the ContestantScoreFilterService to get filtered scores
        const filteredScores = await this.contestantFilterService.filterScoresByCategory(
          categoryId,
          userId,
          userRole as any,
          userContestantId,
          tenantId
        );

        log.info('Scores retrieved successfully (filtered for contestant)', {
          categoryId,
          contestantId: userContestantId,
          count: filteredScores.length
        });

        sendSuccess(res, filteredScores);
        return;
      }

      // For non-contestant roles, use original logic
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
      // Guard: Ensure user is authenticated and tenant context exists
      if (!requireAuthAndTenant(req, res)) return;

      const categoryId = req.params['categoryId']!;
      const contestantId = req.params['contestantId']!;
      const { criteriaId, score, comments } = req.body;

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

      const newScore = await this.scoringService.submitScore(data, req.user.id, req.user.tenantId);

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

      const tenantId = req.tenantId || req.user?.tenantId || 'default_tenant';
      const userRole = req.user?.role;

      const existingScore = await this.prisma.score.findFirst({
        where: { id: scoreId, tenantId },
        select: {
          id: true,
          score: true,
          isLocked: true,
          isCertified: true,
          judgeId: true,
          lockedAt: true,
          lockedBy: true,
          certifiedAt: true,
          certifiedBy: true
        }
      });

      if (!existingScore) {
        log.warn('Score not found for update', { scoreId });
        errorResponse(res, 'Score not found', ErrorCode.NOT_FOUND, 404);
        return;
      }

      const scoreChanged = data.score !== undefined && data.score !== existingScore.score;
      const isCommentOnlyUpdate = !scoreChanged && data.comments !== undefined;

      // Non-admins can only update their own scores
      const isAdminLike = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';
      if (!isAdminLike && existingScore.judgeId !== req.user?.judgeId) {
        log.warn('Attempt to update another judge\'s score', {
          scoreId,
          userId: req.user?.id,
          userJudgeId: req.user?.judgeId,
          scoreJudgeId: existingScore.judgeId
        });
        errorResponse(res, 'Can only update your own scores', ErrorCode.AUTHORIZATION_ERROR, 403);
        return;
      }

      // Comments are editable regardless of certification/lock status.
      if (isCommentOnlyUpdate) {
        await this.prisma.score.update({
          where: { id: scoreId },
          data: {
            comment: data.comments,
            updatedAt: new Date()
          }
        });

        const updatedScore = await this.prisma.score.findUnique({
          where: { id: scoreId },
          include: {
            contestant: {
              select: {
                id: true,
                name: true,
                contestantNumber: true
              }
            },
            judge: {
              select: {
                id: true,
                name: true
              }
            },
            category: {
              select: {
                id: true,
                name: true,
                scoreCap: true
              }
            }
          }
        });

        sendSuccess(res, updatedScore);
        return;
      }

      // Score value changes require unlocked + uncertified state.
      // RACE CONDITION FIX: Use atomic update with all conditions in WHERE clause
      const whereConditions: any = {
        id: scoreId,
        tenantId: tenantId,
        isLocked: false,
        isCertified: false
      };

      if (!isAdminLike) {
        whereConditions.judgeId = req.user?.judgeId;
      }

      // Atomic update: all checks happen in the database query
      const updateResult = await this.prisma.score.updateMany({
        where: whereConditions,
        data: {
          score: data.score,
          ...(data.comments !== undefined && { comment: data.comments }),
          updatedAt: new Date()
        }
      });

      // If no rows were updated, determine the specific reason
      if (updateResult.count === 0) {
        if (existingScore.isLocked) {
          log.warn('Attempt to update locked score', {
            scoreId,
            userId: req.user?.id,
            lockedAt: existingScore.lockedAt,
            lockedBy: existingScore.lockedBy
          });
          errorResponse(res, 'Cannot modify locked score', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        if (existingScore.isCertified) {
          log.warn('Attempt to update certified score', {
            scoreId,
            userId: req.user?.id,
            certifiedAt: existingScore.certifiedAt,
            certifiedBy: existingScore.certifiedBy
          });
          errorResponse(res, 'Cannot modify certified score', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        if (existingScore.judgeId !== req.user?.judgeId) {
          log.warn('Attempt to update another judge\'s score', {
            scoreId,
            userId: req.user?.id,
            userJudgeId: req.user?.judgeId,
            scoreJudgeId: existingScore.judgeId
          });
          errorResponse(res, 'Can only update your own scores', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        // Shouldn't reach here, but handle gracefully
        errorResponse(res, 'Score could not be updated', ErrorCode.INTERNAL_ERROR, 500);
        return;
      }

      // Fetch the updated score for response and audit log
      const updatedScore = await this.prisma.score.findUnique({
        where: { id: scoreId },
        include: {
          contestant: {
            select: {
              id: true,
              name: true,
              contestantNumber: true
            }
          },
          judge: {
            select: {
              id: true,
              name: true
            }
          },
          category: {
            select: {
              id: true,
              name: true,
              scoreCap: true
            }
          }
        }
      });

      log.info('Score updated successfully', { scoreId });

      // Audit log: score update
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logEntityChange({
          action: 'score.updated',
          entityType: 'Score',
          entityId: scoreId,
          oldData: null, // Old data not available in atomic pattern
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
      const userRole = req.user?.role;

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
        sendNotFound(res, 'Score not found');
        return;
      }

      // RACE CONDITION FIX: Use atomic delete with all conditions in WHERE clause
      const whereConditions: any = {
        id: scoreId,
        tenantId: tenantId,
        isLocked: false,
        isCertified: false
      };

      // Non-admins can only delete their own scores
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        whereConditions.judgeId = req.user?.judgeId;
      }

      // Atomic delete: all checks happen in the database query
      const deleteResult = await this.prisma.score.deleteMany({
        where: whereConditions
      });

      // If no rows were deleted, determine the specific reason
      if (deleteResult.count === 0) {
        // Re-query to determine failure reason
        const existingScore = await this.prisma.score.findFirst({
          where: { id: scoreId, tenantId: tenantId },
          select: {
            id: true,
            isLocked: true,
            isCertified: true,
            judgeId: true,
            lockedAt: true,
            lockedBy: true,
            certifiedAt: true,
            certifiedBy: true
          }
        });

        if (!existingScore) {
          log.warn('Score not found or already deleted', { scoreId });
          errorResponse(res, 'Score not found', ErrorCode.NOT_FOUND, 404);
          return;
        }

        if (existingScore.isLocked) {
          log.warn('Attempt to delete locked score', {
            scoreId,
            userId: req.user?.id,
            lockedAt: existingScore.lockedAt,
            lockedBy: existingScore.lockedBy
          });
          errorResponse(res, 'Cannot delete locked score', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        if (existingScore.isCertified) {
          log.warn('Attempt to delete certified score', {
            scoreId,
            userId: req.user?.id,
            certifiedAt: existingScore.certifiedAt,
            certifiedBy: existingScore.certifiedBy
          });
          errorResponse(res, 'Cannot delete certified score', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        if (existingScore.judgeId !== req.user?.judgeId) {
          log.warn('Attempt to delete another judge\'s score', {
            scoreId,
            userId: req.user?.id,
            userJudgeId: req.user?.judgeId,
            scoreJudgeId: existingScore.judgeId
          });
          errorResponse(res, 'Can only delete your own scores', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        // Shouldn't reach here, but handle gracefully
        errorResponse(res, 'Score could not be deleted', ErrorCode.INTERNAL_ERROR, 500);
        return;
      }

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
        errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
        return;
      }

      log.info('Score certification requested', { scoreId, certifiedBy: req.user.id });

      const certifiedScore = await this.scoringService.certifyScore(scoreId, req.user.id, req.user.tenantId);

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
      const { typedSignature, drawnSignatureData, signatureFilePath } = req.body || {};

      if (!req.user) {
        errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
        return;
      }

      if (!typedSignature && !drawnSignatureData && !signatureFilePath) {
        errorResponse(res, 'A typed, drawn, or file signature is required to certify scores', ErrorCode.VALIDATION_ERROR, 400);
        return;
      }

      log.info('Category scores certification requested', { categoryId, certifiedBy: req.user.id });

      const result = await this.scoringService.certifyScores(
        categoryId,
        req.user.id,
        req.user.tenantId,
        {
          userRole: req.user.role,
          judgeId: req.user.judgeId ?? req.user.judge?.id ?? null
        }
      );

      const judgeId = req.user.judgeId || req.user.judge?.id || null;
      if (judgeId) {
        await this.prisma.judgeCertification.upsert({
          where: {
            tenantId_categoryId_judgeId: {
              tenantId: req.user.tenantId,
              categoryId,
              judgeId
            }
          },
          create: {
            tenantId: req.user.tenantId,
            categoryId,
            judgeId,
            signatureName: typedSignature || req.user.name || req.user.email || 'Judge Certification'
          },
          update: {
            certifiedAt: new Date(),
            signatureName: typedSignature || req.user.name || req.user.email || 'Judge Certification'
          }
        });
        await refreshJudgeStage(this.prisma, req.user.tenantId, categoryId);
      } else if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
        await applyCertificationStage({
          prisma: this.prisma,
          tenantId: req.user.tenantId,
          categoryId,
          role: 'JUDGE',
          userId: req.user.id,
          certifiedBy: req.user.id
        });
      }

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const scoreId = req.params['scoreId']!;

      log.info('Score unsigned requested', { scoreId });

      const unsignedScore = await this.scoringService.unsignScore(scoreId, req.user.tenantId);

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const judgeId = req.params['judgeId']!;

      log.debug('Fetching scores by judge', { judgeId });

      const scores = await this.scoringService.getScoresByJudge(judgeId, req.user.tenantId);

      log.info('Scores by judge retrieved successfully', { judgeId, count: scores.length });
      sendSuccess(res, scores);
    } catch (error) {
      log.error('Get scores by judge error', { error: (error as Error).message, judgeId: req.params['judgeId'] });
      return next(error);
    }
  };

  /**
   * Get scores by contestant
   * PHASE 2.1: Enforces contestant can only view their own scores
   */
  getScoresByContestant = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const contestantId = req.params['contestantId']!;
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userId = req.user.id;

      log.debug('Fetching scores by contestant', { contestantId, userRole });

      // PHASE 2.1: Enforce ownership for CONTESTANT role
      if (userRole === 'CONTESTANT' && userId) {
        // Get user's contestantId
        const user = await this.prisma.user.findUnique({
          where: { id: userId, tenantId },
          select: { contestantId: true }
        });

        // Verify user owns this contestant
        if (user?.contestantId !== contestantId) {
          log.warn('Contestant attempting to view another contestant\'s scores', {
            userId,
            userContestantId: user?.contestantId,
            requestedContestantId: contestantId
          });
          errorResponse(res, 'You can only view your own scores', ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }
      }

      // Fetch scores
      const scores = await this.scoringService.getScoresByContestant(contestantId, tenantId);

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
   * PHASE 2.1: Enforces contestant visibility restrictions and ownership
   */
  getScoresByContest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'scoring');
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const contestId = req.params['contestId']!;
      const tenantId = req.user.tenantId;
      const userRole = req.user.role;
      const userId = req.user.id;

      log.debug('Fetching scores by contest', { contestId, userRole });

      // PHASE 2.1: Check visibility restrictions for CONTESTANT role
      if (userRole === 'CONTESTANT' && userId) {
        // Check if scores are visible for this contest
        const areVisible = await this.contestantFilterService.areScoresVisible(
          contestId,
          userRole as any,
          tenantId
        );

        if (!areVisible) {
          // Get release status for informative error message
          const releaseStatus = await this.contestantFilterService.getScoreReleaseStatus(
            contestId,
            tenantId
          );

          log.warn('Contestant attempting to view restricted scores', {
            userId,
            contestId,
            reason: releaseStatus.reason
          });

          errorResponse(res, releaseStatus.reason, ErrorCode.AUTHORIZATION_ERROR, 403);
          return;
        }

        // Get user's contestantId
        const user = await this.prisma.user.findUnique({
          where: { id: userId, tenantId },
          select: { contestantId: true }
        });

        const userContestantId = user?.contestantId || null;

        // Fetch all scores and filter to only show contestant's own scores
        const allScores = await this.scoringService.getScoresByContest(contestId, tenantId);
        const filteredScores = await this.contestantFilterService.filterScoresForContestant(
          allScores as any,
          userContestantId,
          userRole as any
        );

        log.info('Scores by contest retrieved successfully (filtered for contestant)', {
          contestId,
          contestantId: userContestantId,
          count: filteredScores.length
        });

        sendSuccess(res, filteredScores);
        return;
      }

      // For non-contestant roles, use original logic
      const scores = await this.scoringService.getScoresByContest(contestId, tenantId);

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
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const contestId = req.params['contestId']!;

      log.debug('Fetching contest statistics', { contestId });

      const stats = await this.scoringService.getContestStats(contestId, req.user.tenantId);

      log.info('Contest statistics retrieved successfully', { contestId });
      sendSuccess(res, stats);
    } catch (error) {
      log.error('Get contest stats error', { error: (error as Error).message, contestId: req.params['contestId'] });
      return next(error);
    }
  };

  getCategories = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = req.user.tenantId;
      const userRole = String(req.user.role || '').toUpperCase();
      const contestId = req.query['contestId'] as string | undefined;

      const where: Prisma.CategoryWhereInput = {
        tenantId,
        deletedAt: null // Manual soft-delete filter (middleware skipped due to nested includes)
      };

      // Judges should only see categories they are actively assigned to.
      if (userRole === 'JUDGE') {
        let judgeId = req.user.judgeId || req.user.judge?.id || null;
        const scoringEligibleStatuses = ['PENDING', 'ACTIVE'] as const;

        if (!judgeId) {
          const userRecord = await this.prisma.user.findFirst({
            where: {
              id: req.user.id,
              tenantId
            },
            select: {
              judgeId: true
            }
          });
          judgeId = userRecord?.judgeId || null;
        }

        if (!judgeId) {
          return sendSuccess(res, []);
        }

        where.OR = [
          // Category-level assignment
          {
            assignments: {
              some: {
                tenantId,
                judgeId,
                status: {
                  in: [...scoringEligibleStatuses]
                }
              }
            }
          },
          // Contest-level assignment (categoryId is null) grants visibility to all categories in that contest
          {
            contest: {
              assignments: {
                some: {
                  tenantId,
                  judgeId,
                  categoryId: null,
                  status: {
                    in: [...scoringEligibleStatuses]
                  }
                }
              }
            }
          }
        ];
      }

      if (contestId) {
        where.contestId = contestId;
      }
      // Don't set contestId at all if using eventId filter
      // This allows Prisma to use the nested contest.eventId filter properly

      const categories = (await this.prisma.category.findMany({
        where,
        include: {
          contest: {
            select: {
              id: true,
              name: true,
              deletedAt: true, // Include to filter soft-deleted contests
              event: {
                select: {
                  id: true,
                  name: true,
                  deletedAt: true // Include to filter soft-deleted events
                }
              }
            }
          },
          _count: {
            select: {
              scores: true,
              categoryContestants: true
            }
          },
          categoryContestants: {
            select: {
              contestant: {
                select: {
                  id: true,
                  name: true,
                  contestantNumber: true,
                  bio: true,
                  imagePath: true,
                  users: {
                    select: {
                      bio: true,
                      contestantBio: true,
                      imagePath: true
                    }
                  }
                }
              }
            }
          }
        } as any,
        orderBy: { name: 'asc' }
      } as any)) as any;

      // Filter out categories with soft-deleted contests or events
      const filteredCategories = categories.filter((cat: any) => {
        if (cat.contest?.deletedAt) return false; // Exclude if contest is deleted
        if (cat.contest?.event?.deletedAt) return false; // Exclude if event is deleted
        return true;
      }).map((cat: any) => {
        const contestants = Array.isArray(cat.categoryContestants)
          ? cat.categoryContestants.map((cc: any) => {
              const contestant = cc.contestant;
              if (!contestant) return null;

              const user = Array.isArray(contestant.users) ? contestant.users[0] : null;
              const resolvedBio = resolveBioFromCandidates([
                user?.contestantBio,
                user?.bio,
                contestant.bio,
              ]);
              const combinedImagePath = contestant.imagePath || user?.imagePath || null;

              return {
                id: contestant.id,
                name: contestant.name,
                contestantNumber: contestant.contestantNumber,
                bio: resolvedBio.bio,
                imagePath: combinedImagePath,
                bioFilePath: resolvedBio.bioFilePath
              };
            }).filter(Boolean)
          : [];

        // Remove deletedAt fields from response
        if (cat.contest) {
          delete cat.contest.deletedAt;
          if (cat.contest.event) {
            delete cat.contest.event.deletedAt;
          }
        }
        delete cat.categoryContestants;
        cat.contestants = contestants;
        return cat;
      });

      return sendSuccess(res, filteredCategories);
    } catch (error) {
      return next(error);
    }
  };

  certifyTotals = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      const { signatureName, typedSignature, drawnSignatureData, signatureFilePath, comments } = req.body;

      if (!req.user) {
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      if (!signatureName && !typedSignature && !drawnSignatureData && !signatureFilePath) {
        return errorResponse(res, 'A typed, drawn, or file signature is required to certify totals', ErrorCode.VALIDATION_ERROR, 400);
      }

      // SECURITY FIX: Verify user has TALLY_MASTER role
      const allowedRoles = ['TALLY_MASTER', 'ADMIN', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(req.user.role)) {
        return errorResponse(res, `Access denied. Only ${allowedRoles.join(', ')} can certify totals.`, ErrorCode.AUTHORIZATION_ERROR, 403);
      }

      // Check if category exists
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId!,
          tenantId: req.user.tenantId,
          deletedAt: null
        }
      });

      if (!category) {
        return sendNotFound(res, 'Category not found');
      }

      // Create or update category certification for TALLY_MASTER
      const certification = await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId: req.user.tenantId,
            categoryId: categoryId!,
            role: 'TALLY_MASTER'
          }
        },
        create: {
          categoryId: categoryId!,
          role: 'TALLY_MASTER',
          userId: req.user.id,
          signatureName: signatureName || typedSignature || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null,
          tenantId: req.user.tenantId
        },
        update: {
          userId: req.user.id,
          signatureName: signatureName || typedSignature || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null,
          certifiedAt: new Date()
        },
      });

      await applyCertificationStage({
        prisma: this.prisma,
        tenantId: req.user.tenantId,
        categoryId: categoryId!,
        role: 'TALLY_MASTER',
        comments: comments || null,
        userId: req.user.id,
        certifiedBy: req.user.id
      });

      return sendSuccess(res, certification, 'Totals certified successfully by Tally Master');
    } catch (error) {
      return next(error);
    }
  };

  finalCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      const { signatureName, typedSignature, drawnSignatureData, signatureFilePath, comments } = req.body;

      if (!req.user) {
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      if (!signatureName && !typedSignature && !drawnSignatureData && !signatureFilePath) {
        return errorResponse(res, 'A typed, drawn, or file signature is required for final certification', ErrorCode.VALIDATION_ERROR, 400);
      }

      // SECURITY FIX: Verify user has AUDITOR role
      const allowedRoles = ['AUDITOR', 'ADMIN', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(req.user.role)) {
        return errorResponse(res, `Access denied. Only ${allowedRoles.join(', ')} can perform final certification.`, ErrorCode.AUTHORIZATION_ERROR, 403);
      }

      // Check if category exists
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId: req.user.tenantId,
          deletedAt: null
        }
      });

      if (!category) {
        return sendNotFound(res, 'Category not found');
      }

      // Check if Tally Master has certified
      const tallyMasterCert = await this.prisma.categoryCertification.findUnique({
        where: {
          tenantId_categoryId_role: {
            tenantId: req.user.tenantId,
            categoryId: categoryId!,
            role: 'TALLY_MASTER'
          }
        }
      });

      if (!tallyMasterCert) {
        return sendBadRequest(res, 'Tally Master must certify totals first');
      }

      // Create or update category certification for AUDITOR
      const certification = await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId: req.user.tenantId,
            categoryId: categoryId!,
            role: 'AUDITOR'
          }
        },
        create: {
          categoryId: categoryId!,
          role: 'AUDITOR',
          userId: req.user.id,
          signatureName: signatureName || typedSignature || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null,
          tenantId: req.user.tenantId
        },
        update: {
          userId: req.user.id,
          signatureName: signatureName || typedSignature || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
          comments: comments || null,
          certifiedAt: new Date()
        },
      });

      await applyCertificationStage({
        prisma: this.prisma,
        tenantId: req.user.tenantId,
        categoryId: categoryId!,
        role: 'AUDITOR',
        comments: comments || null,
        userId: req.user.id,
        certifiedBy: req.user.id
      });

      return sendSuccess(res, certification, 'Final certification completed by Auditor');
    } catch (error) {
      return next(error);
    }
  };

  requestDeduction = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestantId, categoryId, contestId, amount, reason, scope } = req.body;

      if (!req.user) {
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      if (!contestantId || amount === undefined || !reason) {
        return errorResponse(res, 'contestantId, amount, and reason are required', ErrorCode.VALIDATION_ERROR, 400);
      }

      // Support contest-level "general" deductions by resolving a deterministic carrier category.
      let resolvedCategoryId = categoryId as string | undefined;
      let normalizedReason = String(reason || '').trim();
      const isGeneralScope = scope === 'GENERAL' || (!resolvedCategoryId && !!contestId);
      if (!resolvedCategoryId && !contestId) {
        return errorResponse(res, 'categoryId is required unless contestId is provided for GENERAL scope', ErrorCode.VALIDATION_ERROR, 400);
      }

      // Verify category and contestant exist with tenant validation
      const contestant = await this.prisma.contestant.findFirst({
        where: {
          id: contestantId,
          tenantId: req.user.tenantId
        }
      });

      if (!contestant) {
        return sendNotFound(res, 'Contestant not found');
      }

      if (!resolvedCategoryId && contestId) {
        const contestCategories = await this.prisma.category.findMany({
          where: {
            contestId,
            tenantId: req.user.tenantId
          },
          orderBy: { createdAt: 'asc' },
          select: { id: true }
        });
        if (contestCategories.length === 0) {
          return sendNotFound(res, 'No categories found for contest');
        }
        resolvedCategoryId = contestCategories[0]!.id;
      }

      const category = await this.prisma.category.findFirst({
        where: {
          id: resolvedCategoryId,
          tenantId: req.user.tenantId
        }
      });

      if (!category) {
        return sendNotFound(res, 'Category not found');
      }
      if (isGeneralScope && !normalizedReason.startsWith('[GENERAL]')) {
        normalizedReason = `[GENERAL] ${normalizedReason}`;
      }

      // Initiator must certify the deduction when submitting it.
      const deductionRequest = await this.prisma.$transaction(async (tx) => {
        const created = await tx.deductionRequest.create({
          data: {
            contestantId,
            categoryId: resolvedCategoryId!,
            amount,
            reason: normalizedReason,
            requestedById: req.user!.id,
            status: 'PENDING',
            tenantId: req.user!.tenantId
          },
        });

        await tx.deductionApproval.create({
          data: {
            requestId: created.id,
            approvedById: req.user!.id,
            role: req.user!.role,
            isHeadJudge: false,
            tenantId: req.user!.tenantId
          }
        });

        return created;
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
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      // Additional certifiers must be high-trust roles only.
      const allowedRoles = ['AUDITOR', 'BOARD', 'ORGANIZER', 'ADMIN', 'SUPER_ADMIN'];
      if (!allowedRoles.includes(req.user.role)) {
        return errorResponse(res, `Access denied. Only ${allowedRoles.join(', ')} can approve deductions.`, ErrorCode.AUTHORIZATION_ERROR, 403);
      }

      // SECURITY FIX #12: Defense in depth - validate tenant ID
      const deduction = await this.prisma.deductionRequest.findFirst({
        where: {
          id: deductionId!,
          tenantId: req.user.tenantId
        }
      });

      if (!deduction) {
        return sendNotFound(res, 'Deduction request not found');
      }

      if (deduction.status !== 'PENDING') {
        return sendBadRequest(res, `Deduction request already ${deduction.status.toLowerCase()}`);
      }

      // Initiator certifies at creation; this endpoint is for the 2 additional approvers.
      if (deduction.requestedById === req.user.id) {
        return sendBadRequest(res, 'Request initiator is already certified; additional approvers must be different users');
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.deductionApproval.upsert({
          where: {
            tenantId_requestId_approvedById: {
              tenantId: req.user!.tenantId,
              requestId: deductionId!,
              approvedById: req.user!.id
            }
          },
          create: {
            requestId: deductionId!,
            approvedById: req.user!.id,
            role: req.user!.role,
            isHeadJudge: !!isHeadJudge,
            tenantId: req.user!.tenantId
          },
          update: {
            role: req.user!.role,
            isHeadJudge: !!isHeadJudge,
            approvedAt: new Date()
          }
        });

        const approvals = await tx.deductionApproval.findMany({
          where: {
            requestId: deductionId!,
            tenantId: req.user!.tenantId
          },
          select: {
            approvedById: true
          }
        });

        const approverIds = new Set(approvals.map((a) => a.approvedById));
        const hasInitiator = approverIds.has(deduction.requestedById);
        const additionalApprovals = Array.from(approverIds).filter((id) => id !== deduction.requestedById).length;

        return tx.deductionRequest.update({
          where: { id: deductionId! },
          data: {
            status: hasInitiator && additionalApprovals >= 2 ? 'APPROVED' : 'PENDING'
          },
          include: {
            approvals: {
              select: {
                id: true,
                approvedById: true,
                role: true,
                approvedAt: true
              },
              orderBy: { approvedAt: 'asc' }
            }
          }
        });
      });

      const message = updated.status === 'APPROVED'
        ? 'Deduction request approved successfully'
        : 'Certification recorded. Additional approvals are still required';
      return sendSuccess(res, updated, message);
    } catch (error) {
      return next(error);
    }
  };

  rejectDeduction = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { deductionId } = req.params;

      if (!req.user) {
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      // SECURITY FIX #12: Defense in depth - validate tenant ID
      const deduction = await this.prisma.deductionRequest.findFirst({
        where: {
          id: deductionId,
          tenantId: req.user.tenantId
        }
      });

      if (!deduction) {
        return sendNotFound(res, 'Deduction request not found');
      }

      if (deduction.status !== 'PENDING') {
        return sendBadRequest(res, `Deduction request already ${deduction.status.toLowerCase()}`);
      }

      const updated = await this.prisma.deductionRequest.update({
        where: {
          id: deductionId,
          tenantId: req.user.tenantId
        },
        data: { status: 'REJECTED' }
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
      const tenantId = (req as any).user?.tenantId || (req as any).tenantId;

      // SECURITY FIX (2026-01-13): Add tenant isolation to prevent cross-tenant data access
      const where: any = {
        tenantId  // Enforce tenant boundary - CRITICAL SECURITY FIX
      };
      if (status) where.status = status;
      if (categoryId) where.categoryId = categoryId;
      if (contestantId) where.contestantId = contestantId;

      // SECURITY FIX (2026-01-13): Add pagination to prevent DoS attacks
      const paginationOptions = parsePaginationQuery(req.query);
      const paginationParams = getPaginationParams(paginationOptions);

      const [deductions, total] = await Promise.all([
        this.prisma.deductionRequest.findMany({
          where,
          include: {
            category: {
              select: {
                id: true,
                name: true,
              }
            },
            contestant: {
              select: {
                id: true,
                name: true,
                contestantNumber: true
              }
            },
            requestedBy: {
              select: {
                id: true,
                name: true
              }
            },
            approvals: {
              select: {
                id: true,
                approvedById: true,
                role: true,
                approvedAt: true
              },
              orderBy: {
                approvedAt: 'asc'
              }
            }
          },
          ...paginationParams,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.deductionRequest.count({ where })
      ]);

      const withApprovalState = deductions.map((deduction: any) => {
        const uniqueApproverIds = new Set<string>((deduction.approvals || []).map((a: any) => a.approvedById));
        const hasInitiatorCertification = uniqueApproverIds.has(deduction.requestedById);
        const additionalApprovals = Array.from(uniqueApproverIds).filter((id) => id !== deduction.requestedById).length;

        return {
          ...deduction,
          approvalState: {
            hasInitiatorCertification,
            additionalApprovals,
            requiredAdditionalApprovals: 2,
            approvalsTotal: uniqueApproverIds.size,
            readyForApproval: hasInitiatorCertification && additionalApprovals >= 2
          }
        };
      });

      return sendSuccess(res, createPaginatedResponse(withApprovalState, total, paginationOptions));
    } catch (error) {
      return next(error);
    }
  };

  certifyJudgeContestScores = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId, contestId } = req.body;

      if (!req.user) {
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      if (!judgeId || !contestId) {
        return errorResponse(res, 'judgeId and contestId are required', ErrorCode.VALIDATION_ERROR, 400);
      }

      // Verify judge and contest exist with tenant validation
      const [judge, contest] = await Promise.all([
        this.prisma.user.findFirst({
          where: {
            id: judgeId,
            tenantId: req.user.tenantId
          }
        }),
        this.prisma.contest.findFirst({
          where: {
            id: contestId,
            tenantId: req.user.tenantId
          }
        })
      ]);

      if (!judge) {
        return sendNotFound(res, 'Judge not found');
      }
      if (!contest) {
        return sendNotFound(res, 'Contest not found');
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
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }

      // Check if category exists
      const category = await this.prisma.category.findFirst({
        where: {
          id: categoryId,
          tenantId: req.user.tenantId,
          deletedAt: null
        }
      });

      if (!category) {
        return sendNotFound(res, 'Category not found');
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
