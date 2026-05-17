import { NextFunction, Request, Response } from 'express'
import { container } from 'tsyringe'
import { ScoreGovernanceService } from '../services/ScoreGovernanceService'
import { sendBadRequest, sendSuccess, sendUnauthorized } from '../utils/responseHelpers'

export class ScoreGovernanceController {
  private service: ScoreGovernanceService

  constructor() {
    this.service = container.resolve(ScoreGovernanceService)
  }

  private buildActorContext(request: any) {
    const requestor = request?.requestedBy
      ? {
          id: request.requestedBy.id || request.requestedById || null,
          name: request.requestedBy.name || null,
          email: request.requestedBy.email || null,
          role: request.requestedBy.role || request.requesterRole || null,
          boardRole: request.requestedBy.boardRole || null
        }
      : (request?.requestedById
        ? {
            id: request.requestedById,
            name: null,
            email: null,
            role: request.requesterRole || null,
            boardRole: request.requesterBoardRoleSnapshot || null
          }
        : null)

    const approvers = Array.isArray(request?.approvals)
      ? request.approvals.map((approval: any) => ({
          id: approval.approvedById || null,
          name: approval.approvedByName || null,
          email: approval.approvedByEmail || null,
          role: approval.approverRole || null,
          boardRole: approval.effectiveBoardRoleSnapshot || approval.approverBoardRoleSnapshot || null,
          approvedAt: approval.approvedAt || null
        }))
      : []

    return { requestor, approvers }
  }

  private setGovernanceActivityContext(res: Response, request: any): void {
    res.locals['activityContext'] = {
      governanceRequestId: request?.id || null,
      actionType: request?.actionType || null,
      scopeType: request?.scopeType || null,
      status: request?.status || null,
      ...this.buildActorContext(request)
    }
  }

  private getEffectiveTenantId(req: Request): string | undefined {
    if (!req.user) return req.tenantId
    if (req.user.role === 'SUPER_ADMIN') {
      return (req.query['tenantId'] as string | undefined) || req.tenantId || req.user.tenantId
    }
    return req.tenantId || req.user.tenantId
  }

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')
      const settings = await this.service.getSettings(tenantId)
      return sendSuccess(res, settings)
    } catch (error) {
      return next(error)
    }
  }

  updateSettings = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')
      const updated = await this.service.updateSettings(tenantId, req.user.id, {
        requiredAdditionalApprovals: Number(req.body?.requiredAdditionalApprovals || 2),
        approverRoles: Array.isArray(req.body?.approverRoles) ? req.body.approverRoles : [],
        allowDelegateJudgeCertification: Boolean(req.body?.allowDelegateJudgeCertification),
      })
      return sendSuccess(res, updated, 'Score governance settings updated')
    } catch (error) {
      return next(error)
    }
  }

  getScoreReview = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')

      const data = await this.service.getScoreReview(tenantId, req.user.id, req.user.role, {
        eventId: req.query['eventId'] as string | undefined,
        contestId: req.query['contestId'] as string | undefined,
        categoryId: req.query['categoryId'] as string | undefined,
        contestantId: req.query['contestantId'] as string | undefined
      })

      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  }

  createRequest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')

      const actionType = String(req.body?.actionType || '').toUpperCase()
      const scopeType = String(req.body?.scopeType || '').toUpperCase()
      if (!actionType || !scopeType) {
        return sendBadRequest(res, 'actionType and scopeType are required')
      }

      const created = await this.service.createRequest({
        tenantId,
        userId: req.user.id,
        userRole: req.user.role,
        actionType: actionType as any,
        scopeType: scopeType as any,
        targetCertificationLevel: req.body?.targetCertificationLevel,
        eventId: req.body?.eventId,
        contestId: req.body?.contestId,
        categoryId: req.body?.categoryId,
        contestantId: req.body?.contestantId,
        judgeId: req.body?.judgeId,
        scoreId: req.body?.scoreId,
        reason: req.body?.reason,
        adjustmentDelta: req.body?.adjustmentDelta,
        signature: {
          typedSignature: req.body?.typedSignature,
          drawnSignatureData: req.body?.drawnSignatureData,
          signatureFilePath: req.body?.signatureFilePath
        }
      })

      this.setGovernanceActivityContext(res, created)
      return sendSuccess(res, created, 'Governance request created successfully')
    } catch (error) {
      return next(error)
    }
  }

  getRequests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')

      const data = await this.service.getRequests(
        tenantId,
        {
          eventId: req.query['eventId'] as string | undefined,
          contestId: req.query['contestId'] as string | undefined,
          categoryId: req.query['categoryId'] as string | undefined,
          contestantId: req.query['contestantId'] as string | undefined,
          status: req.query['status'] as any,
          actionType: (req.query['actionType'] as string | undefined)?.toUpperCase() as any
        },
        { userId: req.user.id, userRole: req.user.role }
      )

      return sendSuccess(res, data)
    } catch (error) {
      return next(error)
    }
  }

  approveRequest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')

      const id = req.params['id']
      if (!id) {
        return sendBadRequest(res, 'Request ID is required')
      }

      const updated = await this.service.approveRequest(id, tenantId, req.user.id, req.user.role, {
        typedSignature: req.body?.typedSignature,
        drawnSignatureData: req.body?.drawnSignatureData,
        signatureFilePath: req.body?.signatureFilePath
      })

      this.setGovernanceActivityContext(res, updated)
      return sendSuccess(res, updated, 'Governance request certification recorded')
    } catch (error) {
      return next(error)
    }
  }

  rejectRequest = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const tenantId = this.getEffectiveTenantId(req)
      if (!tenantId) return sendBadRequest(res, 'Tenant context is required')

      const id = req.params['id']
      if (!id) {
        return sendBadRequest(res, 'Request ID is required')
      }

      const result = await this.service.rejectRequest(id, tenantId, req.user.id, req.user.role, String(req.body?.reason || ''))
      this.setGovernanceActivityContext(res, result)
      return sendSuccess(res, result, 'Governance request rejected')
    } catch (error) {
      return next(error)
    }
  }
}

const controller = new ScoreGovernanceController()
export const getScoreGovernanceSettings = controller.getSettings
export const updateScoreGovernanceSettings = controller.updateSettings
export const getScoreReview = controller.getScoreReview
export const createScoreGovernanceRequest = controller.createRequest
export const getScoreGovernanceRequests = controller.getRequests
export const approveScoreGovernanceRequest = controller.approveRequest
export const rejectScoreGovernanceRequest = controller.rejectRequest
