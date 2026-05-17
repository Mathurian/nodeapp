import { NextFunction, Request, Response } from 'express';
import { container } from 'tsyringe';
import { ScoreDelegationService } from '../services/ScoreDelegationService';
import { sendBadRequest, sendCreated, sendSuccess, sendUnauthorized } from '../utils/responseHelpers';
import { resolveRequestTenantId } from '../utils/tenantContext';

type ScoreDelegationScopeLevel = 'CATEGORY' | 'CONTEST' | 'EVENT' | 'TENANT';
type ScoreDelegationCoverageMode = 'SELECTED_JUDGES' | 'ALL_JUDGES_IN_SCOPE';

const parseScopeLevel = (value: unknown): ScoreDelegationScopeLevel | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['CATEGORY', 'CONTEST', 'EVENT', 'TENANT'].includes(normalized)) {
    return normalized as ScoreDelegationScopeLevel;
  }
  return null;
};

const parseCoverageMode = (value: unknown): ScoreDelegationCoverageMode | null => {
  const normalized = String(value || '').trim().toUpperCase();
  if (['SELECTED_JUDGES', 'ALL_JUDGES_IN_SCOPE'].includes(normalized)) {
    return normalized as ScoreDelegationCoverageMode;
  }
  return null;
};

export class ScoreDelegationController {
  private service: ScoreDelegationService;

  constructor() {
    this.service = container.resolve(ScoreDelegationService);
  }

  private getEffectiveTenantId(req: Request): string | null {
    return resolveRequestTenantId(req, { allowSuperAdminQueryOverride: true });
  }

  listGrants = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const grants = await this.service.listGrants(
        tenantId,
        req.user,
        {
          activeOnly: String(req.query['activeOnly'] || '').toLowerCase() === 'true',
          delegateUserId: typeof req.query['delegateUserId'] === 'string' ? req.query['delegateUserId'] : undefined,
        },
      );

      return sendSuccess(res, grants);
    } catch (error) {
      return next(error);
    }
  };

  getEligibleJudges = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const categoryId = typeof req.query['categoryId'] === 'string' ? req.query['categoryId'] : '';
      if (!categoryId) {
        return sendBadRequest(res, 'categoryId is required');
      }

      const judges = await this.service.getEligibleJudgesForDelegate(req.user.id, tenantId, categoryId, req.user.role);
      return sendSuccess(res, judges);
    } catch (error) {
      return next(error);
    }
  };

  validateGrant = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const categoryId = String(req.body?.categoryId || '').trim();
      const representedJudgeId = String(req.body?.representedJudgeId || '').trim();
      if (!categoryId || !representedJudgeId) {
        return sendBadRequest(res, 'categoryId and representedJudgeId are required');
      }

      const result = await this.service.validateDelegatedAccess(
        req.user.id,
        tenantId,
        representedJudgeId,
        categoryId,
      );

      return sendSuccess(res, {
        valid: true,
        grantId: result.grant.id,
        representedJudgeId,
        categoryId,
      });
    } catch (error) {
      return next(error);
    }
  };

  createGrant = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const scopeLevel = parseScopeLevel(req.body?.scopeLevel);
      const coverageMode = parseCoverageMode(req.body?.coverageMode);
      if (!scopeLevel || !coverageMode) {
        return sendBadRequest(res, 'scopeLevel and coverageMode are required');
      }

      const judgeIds = Array.isArray(req.body?.judgeIds)
        ? req.body.judgeIds.filter((value: unknown): value is string => typeof value === 'string' && value.trim().length > 0)
        : [];

      const created = await this.service.createGrant({
        tenantId,
        delegateUserId: String(req.body?.delegateUserId || '').trim(),
        grantedById: req.user.id,
        scopeLevel,
        coverageMode,
        judgeIds,
        categoryId: req.body?.categoryId || null,
        contestId: req.body?.contestId || null,
        eventId: req.body?.eventId || null,
        startsAt: req.body?.startsAt || null,
        expiresAt: req.body?.expiresAt || null,
        reason: req.body?.reason,
      });

      return sendCreated(res, created, 'Score delegation grant created');
    } catch (error) {
      return next(error);
    }
  };

  revokeGrant = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const id = String(req.params['id'] || '').trim();
      if (!id) {
        return sendBadRequest(res, 'Grant ID is required');
      }

      const revoked = await this.service.revokeGrant(
        id,
        tenantId,
        req.user.id,
        typeof req.body?.reason === 'string' ? req.body.reason : undefined,
      );

      return sendSuccess(res, revoked, 'Score delegation grant revoked');
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new ScoreDelegationController();

export const listScoreDelegationGrants = controller.listGrants;
export const getEligibleDelegatedJudges = controller.getEligibleJudges;
export const validateScoreDelegationGrant = controller.validateGrant;
export const createScoreDelegationGrant = controller.createGrant;
export const revokeScoreDelegationGrant = controller.revokeGrant;
