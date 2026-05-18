/**
 * Scoring Controller
 * Handles HTTP requests for score management
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoringService, SubmitScoreDTO, UpdateScoreDTO } from '../services/ScoringService';
import { ContestantScoreFilterService } from '../services/ContestantScoreFilterService';
import { AuditLogService } from '../services/AuditLogService';
import { PermissionScopeService } from '../services/PermissionScopeService';
import { ScoreDelegationService } from '../services/ScoreDelegationService';
import { DynamicPermissionService } from '../services/DynamicPermissionService';
import {
  sendSuccess,
  sendNotFound,
  sendBadRequest,
  sendUnauthorized,
  sendCreated,
  sendNoContent,
  sendForbidden,
  errorResponse
} from '../utils/responseHelpers';
import { ErrorCode } from '../types/errors';
import { createRequestLogger } from '../utils/logger';
import { PrismaClient, Prisma, DeductionStatus } from '@prisma/client';
import { requireAuthAndTenant } from '../utils/requestValidation';
import { parsePaginationQuery, getPaginationParams, createPaginatedResponse } from '../utils/pagination';
import { resolveBioFromCandidates } from '../utils/bioResolver';
import { applyCertificationStage, refreshJudgeStage, refreshRoleStages, upsertCategoryRoleCertification } from '../utils/certificationPipeline';
import { resolveRequestTenantId } from '../utils/tenantContext';
import {
  getOfflineWriteTimeoutMs,
  matchOfflineWriteOwnershipRoute,
} from '../config/offlineWriteOwnership.config';
import { withMutationTimeoutTx } from '../utils/dbMutationTimeout';

type DeductionAccessScope = {
  tenantWide: boolean;
  eventIds: string[];
  contestIds: string[];
  categoryIds: string[];
};

type DelegateScoringAccessScope = DeductionAccessScope & {
  hasActiveGrant: boolean;
};

export class ScoringController {
  private scoringService: ScoringService;
  private contestantFilterService: ContestantScoreFilterService;
  private prisma: PrismaClient;
  private permissionScopeService: PermissionScopeService;
  private scoreDelegationService: ScoreDelegationService;
  private dynamicPermissionService: DynamicPermissionService;

  constructor() {
    this.scoringService = container.resolve(ScoringService);
    this.contestantFilterService = container.resolve(ContestantScoreFilterService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
    this.permissionScopeService = container.resolve(PermissionScopeService);
    this.scoreDelegationService = container.resolve(ScoreDelegationService);
    this.dynamicPermissionService = container.resolve(DynamicPermissionService);
  }

  private getEffectiveTenantId(req: Request): string | null {
    return resolveRequestTenantId(req, { allowSuperAdminQueryOverride: true });
  }

  private emptyDeductionAccessScope(): DeductionAccessScope {
    return {
      tenantWide: false,
      eventIds: [],
      contestIds: [],
      categoryIds: [],
    };
  }

  private hasDeductionScope(scope: DeductionAccessScope): boolean {
    return scope.tenantWide ||
      scope.eventIds.length > 0 ||
      scope.contestIds.length > 0 ||
      scope.categoryIds.length > 0;
  }

  private buildDeductionScopeWhere(scope: DeductionAccessScope): Prisma.DeductionRequestWhereInput | null {
    if (scope.tenantWide) return {};

    const clauses: Prisma.DeductionRequestWhereInput[] = [];
    if (scope.categoryIds.length > 0) {
      clauses.push({ categoryId: { in: scope.categoryIds } });
    }
    if (scope.contestIds.length > 0) {
      clauses.push({ category: { contestId: { in: scope.contestIds } } });
    }
    if (scope.eventIds.length > 0) {
      clauses.push({ category: { contest: { eventId: { in: scope.eventIds } } } });
    }

    return clauses.length > 0 ? { OR: clauses } : null;
  }

  private buildCategoryScopeWhere(scope: DeductionAccessScope): Prisma.CategoryWhereInput | null {
    if (scope.tenantWide) return {};

    const clauses: Prisma.CategoryWhereInput[] = [];
    if (scope.categoryIds.length > 0) {
      clauses.push({ id: { in: scope.categoryIds } });
    }
    if (scope.contestIds.length > 0) {
      clauses.push({ contestId: { in: scope.contestIds } });
    }
    if (scope.eventIds.length > 0) {
      clauses.push({ contest: { eventId: { in: scope.eventIds } } });
    }

    return clauses.length > 0 ? { OR: clauses } : null;
  }

  private hasDelegateScoringScope(scope: DelegateScoringAccessScope): boolean {
    return scope.hasActiveGrant && this.hasDeductionScope(scope);
  }

  private buildDelegateScoringCategoryWhere(scope: DelegateScoringAccessScope): Prisma.CategoryWhereInput | null {
    if (!scope.hasActiveGrant) return null;
    return this.buildCategoryScopeWhere(scope);
  }

  private canAccessCategoryInScope(
    scope: DeductionAccessScope,
    category: { id: string; contestId: string; contest: { eventId: string } | null }
  ): boolean {
    if (scope.tenantWide) return true;
    if (scope.categoryIds.includes(category.id)) return true;
    if (scope.contestIds.includes(category.contestId)) return true;
    return Boolean(category.contest?.eventId && scope.eventIds.includes(category.contest.eventId));
  }

  private async getDeductionAccessScope(
    req: Request,
    tenantId: string,
    operation: string = 'read'
  ): Promise<DeductionAccessScope> {
    if (!req.user) return this.emptyDeductionAccessScope();
    return this.permissionScopeService.resolveUserScope(
      req.user.role,
      'deductions',
      tenantId,
      req.user,
      operation
    );
  }

  private async getJudgeCategoryScoreCoverageStatus(
    categoryId: string,
    tenantId: string,
    judgeId: string,
    contestantId?: string,
  ): Promise<{ expected: number; submitted: number; isComplete: boolean }> {
    const contestantWhere = contestantId ? { contestantId } : {};
    const [categoryContestants, criteria, scores] = await Promise.all([
      this.prisma.categoryContestant.findMany({
        where: { tenantId, categoryId, ...contestantWhere },
        select: { contestantId: true },
      }),
      this.prisma.criterion.findMany({
        where: { tenantId, categoryId },
        select: { id: true },
      }),
      this.prisma.score.findMany({
        where: { tenantId, categoryId, judgeId, ...contestantWhere },
        select: { contestantId: true, criterionId: true, score: true },
      }),
    ]);

    const contestantIds = Array.from(new Set(categoryContestants.map((entry) => entry.contestantId)));
    const criterionIds = Array.from(new Set(criteria.map((entry) => entry.id)));
    const expected = criterionIds.length > 0
      ? contestantIds.length * criterionIds.length
      : contestantIds.length;
    const submittedPairs = new Set(
      scores
        .filter((entry) => entry.score !== null && Number.isFinite(Number(entry.score)))
        .map((entry) => `${entry.contestantId}:${entry.criterionId || '__category_total__'}`),
    );
    const submitted = submittedPairs.size;

    return {
      expected,
      submitted,
      isComplete: expected > 0 && submitted >= expected,
    };
  }

  private getRequestJudgeId(req: Request): string | null {
    return req.user?.judgeId || req.user?.judge?.id || null;
  }

  private async canActForJudgeInCategory(
    req: Request,
    tenantId: string,
    representedJudgeId: string,
    categoryId: string,
  ): Promise<boolean> {
    if (!req.user) return false;
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'ADMIN') return true;
    if (this.getRequestJudgeId(req) === representedJudgeId) return true;

    await this.scoreDelegationService.validateDelegatedAccess(
      req.user.id,
      tenantId,
      representedJudgeId,
      categoryId,
    );
    return true;
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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
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
      let judgeFilterId: string | undefined;
      const representedJudgeId = typeof req.query['representedJudgeId'] === 'string'
        ? req.query['representedJudgeId']
        : undefined;
      if (representedJudgeId) {
        await this.canActForJudgeInCategory(req, tenantId, representedJudgeId, categoryId);
        judgeFilterId = representedJudgeId;
      } else if (userRole === 'JUDGE') {
        judgeFilterId = req.user?.judgeId || req.user?.judge?.id;
        if (!judgeFilterId && userId) {
          const linkedUser = await this.prisma.user.findFirst({
            where: { id: userId, tenantId },
            select: { judgeId: true }
          });
          judgeFilterId = linkedUser?.judgeId || undefined;
        }
      }

      const scores = await this.scoringService.getScoresByCategory(categoryId, tenantId, contestantId, judgeFilterId);

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
      const { criteriaId, score, comments, representedJudgeId } = req.body;

      const data: SubmitScoreDTO = {
        categoryId,
        contestantId,
        criteriaId,
        score,
        comments,
        representedJudgeId,
      };

      log.info('Score submission requested', {
        categoryId,
        contestantId,
        criteriaId,
        score,
        hasComments: !!comments,
        userId: req.user.id
      });

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      const newScore = await this.scoringService.submitScore(data, req.user.id, tenantId, timeoutMs);

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
            judgeId: newScore.judgeId,
            enteredByUserId: req.user.id,
            entryMode: (newScore as any).entryMode || 'SELF',
            delegationGrantId: (newScore as any).delegationGrantId || null,
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

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
      const userRole = req.user?.role;

      const existingScore = await this.prisma.score.findFirst({
        where: { id: scoreId, tenantId },
        select: {
          id: true,
          categoryId: true,
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
      const actorJudgeId = this.getRequestJudgeId(req);
      let authorizedJudgeId = actorJudgeId;
      let usingDelegation = false;
      if (!isAdminLike && existingScore.judgeId !== actorJudgeId) {
        await this.canActForJudgeInCategory(req, tenantId, existingScore.judgeId, existingScore.categoryId);
        authorizedJudgeId = existingScore.judgeId;
        usingDelegation = true;
      }
      if (!isAdminLike && !authorizedJudgeId) {
        log.warn('Attempt to update another judge\'s score', {
          scoreId,
          userId: req.user?.id,
          userJudgeId: actorJudgeId,
          scoreJudgeId: existingScore.judgeId
        });
        errorResponse(res, 'Can only update your own scores', ErrorCode.AUTHORIZATION_ERROR, 403);
        return;
      }

      // Comments are editable regardless of certification/lock status.
      if (isCommentOnlyUpdate) {
        const timeoutMs = getOfflineWriteTimeoutMs(
          matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
        );
        await withMutationTimeoutTx(
          async (tx) => {
            await tx.score.update({
              where: { id: scoreId },
              data: {
                comment: data.comments,
                updatedAt: new Date()
              }
            });
          },
          timeoutMs,
          this.prisma,
        );

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
      if (scoreChanged && data.score !== undefined) {
        const scoreMeta = await this.prisma.score.findFirst({
          where: { id: scoreId, tenantId },
          select: {
            criterionId: true,
            categoryId: true,
          }
        });

        if (scoreMeta?.criterionId) {
          const criterion = await this.prisma.criterion.findFirst({
            where: { id: scoreMeta.criterionId, categoryId: scoreMeta.categoryId },
            select: { maxScore: true }
          });
          if (criterion && data.score > Number(criterion.maxScore)) {
            errorResponse(res, `Score cannot exceed criterion max (${criterion.maxScore})`, ErrorCode.VALIDATION_ERROR, 400);
            return;
          }
        } else if (scoreMeta?.categoryId) {
          const category = await this.prisma.category.findFirst({
            where: { id: scoreMeta.categoryId, tenantId },
            select: { scoreCap: true }
          });
          if (category?.scoreCap !== null && category?.scoreCap !== undefined && data.score > Number(category.scoreCap)) {
            errorResponse(res, `Score cannot exceed category cap (${category.scoreCap})`, ErrorCode.VALIDATION_ERROR, 400);
            return;
          }
        }
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
        whereConditions.judgeId = authorizedJudgeId;
      }

      // Atomic update: all checks happen in the database query
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      const updateResult = await withMutationTimeoutTx(
        async (tx) =>
          await tx.score.updateMany({
            where: whereConditions,
            data: {
              score: data.score,
              ...(data.comments !== undefined && { comment: data.comments }),
              updatedAt: new Date()
            }
          }),
        timeoutMs,
        this.prisma,
      );

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

        if (!usingDelegation && existingScore.judgeId !== actorJudgeId) {
          log.warn('Attempt to update another judge\'s score', {
            scoreId,
            userId: req.user?.id,
            userJudgeId: actorJudgeId,
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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
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
      const actorJudgeId = this.getRequestJudgeId(req);
      let authorizedJudgeId = actorJudgeId;
      let usingDelegation = false;
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN' && score.judgeId !== actorJudgeId) {
        await this.canActForJudgeInCategory(req, tenantId, score.judgeId, score.categoryId);
        authorizedJudgeId = score.judgeId;
        usingDelegation = true;
      }

      const whereConditions: any = {
        id: scoreId,
        tenantId: tenantId,
        isLocked: false,
        isCertified: false
      };

      // Non-admins can only delete their own scores
      if (userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN') {
        whereConditions.judgeId = authorizedJudgeId;
      }

      // Atomic delete: all checks happen in the database query
      const timeoutMs = getOfflineWriteTimeoutMs(
        matchOfflineWriteOwnershipRoute(req.method, req.originalUrl || req.path),
      );
      const deleteResult = await withMutationTimeoutTx(
        async (tx) =>
          await tx.score.deleteMany({
            where: whereConditions
          }),
        timeoutMs,
        this.prisma,
      );

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

        if (!usingDelegation && existingScore.judgeId !== actorJudgeId) {
          log.warn('Attempt to delete another judge\'s score', {
            scoreId,
            userId: req.user?.id,
            userJudgeId: actorJudgeId,
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

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
      const certifiedScore = await this.scoringService.certifyScore(scoreId, req.user.id, tenantId);

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
      const { contestantId, typedSignature, drawnSignatureData, signatureFilePath, representedJudgeId } = req.body || {};

      if (!req.user) {
        errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
        return;
      }

      if (!typedSignature && !drawnSignatureData && !signatureFilePath) {
        errorResponse(res, 'A typed, drawn, or file signature is required to certify scores', ErrorCode.VALIDATION_ERROR, 400);
        return;
      }

      log.info('Category scores certification requested', { categoryId, contestantId, certifiedBy: req.user.id });
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
      const certificationContext = await this.scoreDelegationService.resolveCertificationContext(
        req.user,
        tenantId,
        categoryId,
        typeof representedJudgeId === 'string' ? representedJudgeId : null,
      );
      const judgeId = certificationContext?.judgeId || null;
      const isAdminRecoveryPath = !judgeId && !representedJudgeId && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN');
      const isDelegatedCertification = certificationContext?.certificationMode === 'DELEGATED';

      if (!judgeId && !isAdminRecoveryPath) {
        sendBadRequest(
          res,
          'representedJudgeId is required when the current user is certifying scores on behalf of a judge',
        );
        return;
      }

      if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN') {
        const requiredPermission = isDelegatedCertification ? ['delegated-scores', 'certify'] as const : ['scores', 'certify'] as const;
        const hasPermission = await this.dynamicPermissionService.hasPermission(
          req.user.role,
          requiredPermission[0],
          requiredPermission[1],
          tenantId,
        );

        if (!hasPermission) {
          sendForbidden(
            res,
            isDelegatedCertification
              ? 'Delegated score certification permission is required to certify on behalf of a judge'
              : 'Score certification permission is required to certify these scores',
          );
          return;
        }
      }

      if (judgeId) {
        const coverage = await this.getJudgeCategoryScoreCoverageStatus(categoryId, tenantId, judgeId, contestantId);
        if (!coverage.isComplete) {
          sendBadRequest(
            res,
            contestantId
              ? 'All criteria for this contestant must have explicit scores before certification'
              : 'All assigned contestants and criteria must have explicit scores before certification',
          );
          return;
        }
      }

      const result = await this.scoringService.certifyScores(
        categoryId,
        req.user.id,
        tenantId,
        {
          contestantId: contestantId || null,
          userRole: req.user.role,
          judgeId
        }
      );

      if (result.certifiedCount <= 0) {
        sendBadRequest(res, 'No score rows were eligible for certification. Ensure score submissions have finished syncing before certifying.');
        return;
      }

      if (judgeId) {
        const remainingJudgeScores = await this.prisma.score.count({
          where: {
            tenantId,
            categoryId,
            judgeId,
            certifiedAt: null,
          },
        });

        if (remainingJudgeScores === 0) {
          await this.prisma.judgeCertification.upsert({
            where: {
              tenantId_categoryId_judgeId: {
                tenantId,
                categoryId,
                judgeId
              }
            },
            create: {
              tenantId,
              categoryId,
              judgeId,
              signatureName: typedSignature || req.user.name || req.user.email || 'Judge Certification',
              certifiedByUserId: req.user.id,
              certificationMode: certificationContext?.certificationMode || 'SELF',
              delegationGrantId: certificationContext?.delegationGrantId || null,
            },
            update: {
              certifiedAt: new Date(),
              signatureName: typedSignature || req.user.name || req.user.email || 'Judge Certification',
              certifiedByUserId: req.user.id,
              certificationMode: certificationContext?.certificationMode || 'SELF',
              delegationGrantId: certificationContext?.delegationGrantId || null,
            }
          });
          await refreshJudgeStage(this.prisma, tenantId, categoryId, req.user.id);
        }
      } else if (!contestantId && (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN')) {
        await applyCertificationStage({
          prisma: this.prisma,
          tenantId,
          categoryId,
          role: 'JUDGE',
          userId: req.user.id,
          certifiedBy: req.user.id
        });
      }

      log.info('Category scores certified successfully', {
        categoryId,
        certified: result.certified,
        certifiedCount: result.certifiedCount
      });
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

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }

      const unsignedScore = await this.scoringService.unsignScore(scoreId, tenantId);

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

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }

      const scores = await this.scoringService.getScoresByJudge(judgeId, tenantId);

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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
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

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required');
        return;
      }
      const userRole = String(req.user.role || '').toUpperCase();
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const filters: Prisma.CategoryWhereInput[] = [
        {
          tenantId,
          deletedAt: null, // Manual soft-delete filter (middleware skipped due to nested includes)
        },
      ];

      if (contestId) {
        filters.push({ contestId });
      }
      if (eventId) {
        filters.push({ contest: { eventId } });
      }

      if (['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD'].includes(userRole)) {
        const scope = await this.getDeductionAccessScope(req, tenantId);
        const scopeWhere = this.buildCategoryScopeWhere(scope);

        if (!scopeWhere || !this.hasDeductionScope(scope)) {
          return sendSuccess(res, []);
        }

        if (!scope.tenantWide) {
          filters.push(scopeWhere);
        }
      }

      if (userRole === 'DELEGATE') {
        const scope = await this.scoreDelegationService.getDelegateScoringScope(req.user.id, tenantId);
        const scopeWhere = this.buildDelegateScoringCategoryWhere(scope);

        if (!scopeWhere || !this.hasDelegateScoringScope(scope)) {
          return sendSuccess(res, []);
        }

        if (!scope.tenantWide) {
          filters.push(scopeWhere);
        }
      }

      const where: Prisma.CategoryWhereInput = filters.length === 1 ? filters[0]! : { AND: filters };

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
              categoryContestants: true,
            }
          },
          categoryContestants: {
            orderBy: [
              { contestant: { contestantNumber: 'asc' } },
              { contestant: { name: 'asc' } }
            ],
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
                      id: true,
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
        orderBy: [{ name: 'asc' }, { id: 'asc' }]
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
                userId: user?.id || null,
                name: contestant.name,
                contestantNumber: contestant.contestantNumber,
                bio: resolvedBio.bio,
                imagePath: combinedImagePath,
                bioFilePath: resolvedBio.bioFilePath
              };
            }).filter(Boolean)
          : [];

        contestants.sort((left: any, right: any) => {
          const leftNumber = left?.contestantNumber;
          const rightNumber = right?.contestantNumber;
          const leftMissing = leftNumber === null || leftNumber === undefined;
          const rightMissing = rightNumber === null || rightNumber === undefined;

          if (leftMissing !== rightMissing) {
            return leftMissing ? 1 : -1;
          }

          if (!leftMissing && !rightMissing && leftNumber !== rightNumber) {
            return leftNumber - rightNumber;
          }

          const byName = String(left?.name || '').localeCompare(String(right?.name || ''), undefined, {
            sensitivity: 'base',
            numeric: true
          });
          if (byName !== 0) return byName;

          return String(left?.id || '').localeCompare(String(right?.id || ''), undefined, {
            sensitivity: 'base',
            numeric: true
          });
        });

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

      const synced = await refreshRoleStages(this.prisma, req.user.tenantId, categoryId!, req.user.id);
      if (!synced.judgeCertified) {
        return sendBadRequest(res, 'Judge must certify first');
      }
      if (synced.tallyCertified) {
        return sendBadRequest(res, 'Tally Master certification already completed');
      }

      const certification = await upsertCategoryRoleCertification({
        prisma: this.prisma,
        tenantId: req.user.tenantId,
        categoryId: categoryId!,
        role: 'TALLY_MASTER',
        userId: req.user.id,
        boardRoleSnapshot: req.user.role === 'BOARD' ? (req.user.boardRole || null) : null,
        signatureName: signatureName || typedSignature || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: comments || null
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

      const synced = await refreshRoleStages(this.prisma, req.user.tenantId, categoryId!, req.user.id);
      if (!synced.tallyCertified) {
        return sendBadRequest(res, 'Tally Master must certify totals first');
      }
      if (synced.auditorCertified) {
        return sendBadRequest(res, 'Auditor certification already completed');
      }

      // Create or update category certification for AUDITOR
      const certification = await upsertCategoryRoleCertification({
        prisma: this.prisma,
        tenantId: req.user.tenantId,
        categoryId: categoryId!,
        role: 'AUDITOR',
        userId: req.user.id,
        boardRoleSnapshot: req.user.role === 'BOARD' ? (req.user.boardRole || null) : null,
        signatureName: signatureName || typedSignature || (drawnSignatureData ? 'DRAWN_SIGNATURE' : null),
        comments: comments || null
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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      if (!contestantId || amount === undefined || !reason) {
        return errorResponse(res, 'contestantId, amount, and reason are required', ErrorCode.VALIDATION_ERROR, 400);
      }
      const normalizedAmount = Math.abs(Number(amount));
      if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) {
        return errorResponse(res, 'amount must be a positive number', ErrorCode.VALIDATION_ERROR, 400);
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
          tenantId
        }
      });

      if (!contestant) {
        return sendNotFound(res, 'Contestant not found');
      }

      if (!resolvedCategoryId && contestId) {
        const contestCategories = await this.prisma.category.findMany({
          where: {
            contestId,
            tenantId
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
          tenantId
        },
        select: {
          id: true,
          contestId: true,
          contest: {
            select: {
              eventId: true,
            },
          },
        },
      });

      if (!category) {
        return sendNotFound(res, 'Category not found');
      }
      if (contestId && category.contestId !== contestId) {
        return sendBadRequest(res, 'Selected category does not belong to the selected contest');
      }

      const scopeAccess = await this.getDeductionAccessScope(req, tenantId, 'create');
      if (!this.canAccessCategoryInScope(scopeAccess, category)) {
        return errorResponse(
          res,
          'Access denied for the selected deduction scope',
          ErrorCode.AUTHORIZATION_ERROR,
          403
        );
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
            amount: normalizedAmount,
            reason: normalizedReason,
            requestedById: req.user!.id,
            status: 'PENDING',
            tenantId
          },
        });

        await tx.deductionApproval.create({
          data: {
            requestId: created.id,
            approvedById: req.user!.id,
            role: req.user!.role,
            boardRoleSnapshot: req.user!.role === 'BOARD' ? (req.user!.boardRole || null) : null,
            isHeadJudge: false,
            tenantId
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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
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
          tenantId
        },
        select: {
          id: true,
          status: true,
          requestedById: true,
          amount: true,
          reason: true,
          categoryId: true,
          contestantId: true,
          category: {
            select: {
              id: true,
              contestId: true,
              contest: {
                select: {
                  eventId: true,
                },
              },
            },
          },
        },
      });

      if (!deduction) {
        return sendNotFound(res, 'Deduction request not found');
      }

      if (deduction.status !== 'PENDING') {
        return sendBadRequest(res, `Deduction request already ${deduction.status.toLowerCase()}`);
      }

      const scopeAccess = await this.getDeductionAccessScope(req, tenantId, 'approve');
      if (!deduction.category || !this.canAccessCategoryInScope(scopeAccess, deduction.category)) {
        return errorResponse(
          res,
          'Access denied for this deduction request',
          ErrorCode.AUTHORIZATION_ERROR,
          403
        );
      }

      // Initiator certifies at creation; this endpoint is for the 2 additional approvers.
      if (deduction.requestedById === req.user.id) {
        return sendBadRequest(res, 'Request initiator is already certified; additional approvers must be different users');
      }

      const updated = await this.prisma.$transaction(async (tx) => {
        await tx.deductionApproval.upsert({
          where: {
            tenantId_requestId_approvedById: {
              tenantId,
              requestId: deductionId!,
              approvedById: req.user!.id
            }
          },
          create: {
            requestId: deductionId!,
            approvedById: req.user!.id,
            role: req.user!.role,
            boardRoleSnapshot: req.user!.role === 'BOARD' ? (req.user!.boardRole || null) : null,
            isHeadJudge: !!isHeadJudge,
            tenantId
          },
          update: {
            role: req.user!.role,
            boardRoleSnapshot: req.user!.role === 'BOARD' ? (req.user!.boardRole || null) : null,
            isHeadJudge: !!isHeadJudge,
            approvedAt: new Date()
          }
        });

        const approvals = await tx.deductionApproval.findMany({
          where: {
            requestId: deductionId!,
            tenantId
          },
          select: {
            approvedById: true
          }
        });

        const approverIds = new Set(approvals.map((a) => a.approvedById));
        const requestedById = deduction.requestedById;
        const hasInitiator = requestedById ? approverIds.has(requestedById) : false;
        const additionalApprovals = Array.from(approverIds).filter((id) => requestedById ? id !== requestedById : true).length;

        const shouldApprove = hasInitiator && additionalApprovals >= 2;

        const updatedRequest = await tx.deductionRequest.update({
          where: { id: deductionId! },
          data: {
            status: shouldApprove ? 'APPROVED' : 'PENDING'
          },
          include: {
            approvals: {
              select: {
                id: true,
                approvedById: true,
                role: true,
                boardRoleSnapshot: true,
                approvedAt: true
              },
              orderBy: { approvedAt: 'asc' }
            }
          }
        });

        if (shouldApprove) {
          await tx.overallDeduction.upsert({
            where: {
              tenantId_categoryId_contestantId: {
                tenantId,
                categoryId: deduction.categoryId,
                contestantId: deduction.contestantId
              }
            },
            create: {
              tenantId,
              categoryId: deduction.categoryId,
              contestantId: deduction.contestantId,
              deduction: Math.abs(Number(deduction.amount || 0)),
              reason: deduction.reason
            },
            update: {
              deduction: Math.abs(Number(deduction.amount || 0)),
              reason: deduction.reason,
              updatedAt: new Date()
            }
          });
        }

        return updatedRequest;
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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      // SECURITY FIX #12: Defense in depth - validate tenant ID
      const deduction = await this.prisma.deductionRequest.findFirst({
        where: {
          id: deductionId,
          tenantId
        },
        select: {
          id: true,
          status: true,
          category: {
            select: {
              id: true,
              contestId: true,
              contest: {
                select: {
                  eventId: true,
                },
              },
            },
          },
        },
      });

      if (!deduction) {
        return sendNotFound(res, 'Deduction request not found');
      }

      if (deduction.status !== 'PENDING') {
        return sendBadRequest(res, `Deduction request already ${deduction.status.toLowerCase()}`);
      }

      const scopeAccess = await this.getDeductionAccessScope(req, tenantId, 'reject');
      if (!deduction.category || !this.canAccessCategoryInScope(scopeAccess, deduction.category)) {
        return errorResponse(
          res,
          'Access denied for this deduction request',
          ErrorCode.AUTHORIZATION_ERROR,
          403
        );
      }

      const updated = await this.prisma.deductionRequest.update({
        where: {
          id: deductionId
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
      if (!req.user) {
        return errorResponse(res, 'User not authenticated', ErrorCode.AUTHENTICATION_ERROR, 401);
      }
      const status = req.query['status'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const categoryId = req.query['categoryId'] as string | undefined;
      const contestantId = req.query['contestantId'] as string | undefined;
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const scopeAccess = await this.getDeductionAccessScope(req, tenantId, 'read');
      if (!this.hasDeductionScope(scopeAccess)) {
        const paginationOptions = parsePaginationQuery(req.query);
        return sendSuccess(res, createPaginatedResponse([], 0, paginationOptions));
      }

      // SECURITY FIX (2026-01-13): Add pagination to prevent DoS attacks
      const paginationOptions = parsePaginationQuery(req.query);
      const paginationParams = getPaginationParams(paginationOptions);
      const filters: Prisma.DeductionRequestWhereInput[] = [{ tenantId }];
      if (status) {
        const normalizedStatus = String(status).trim().toUpperCase();
        const allowedStatuses: DeductionStatus[] = ['PENDING', 'APPROVED', 'REJECTED'];
        if (!allowedStatuses.includes(normalizedStatus as DeductionStatus)) {
          return sendBadRequest(res, 'Invalid deduction status filter');
        }
        filters.push({ status: normalizedStatus as DeductionStatus });
      }
      if (categoryId) filters.push({ categoryId });
      if (contestantId) filters.push({ contestantId });
      if (contestId) {
        filters.push({ category: { contestId } });
      }
      if (eventId) {
        filters.push({ category: { contest: { eventId } } });
      }

      const scopeWhere = this.buildDeductionScopeWhere(scopeAccess);
      if (scopeWhere && !scopeAccess.tenantWide) {
        filters.push(scopeWhere);
      }

      const where: Prisma.DeductionRequestWhereInput =
        filters.length === 1 ? filters[0]! : { AND: filters };

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
                name: true,
                role: true,
                boardRole: true
              }
            },
            approvals: {
              select: {
                id: true,
                approvedById: true,
                role: true,
                boardRoleSnapshot: true,
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
