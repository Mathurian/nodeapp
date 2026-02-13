import { NextFunction, Request, Response } from 'express'
import { container } from 'tsyringe'
import { ScoreGovernanceService } from '../services/ScoreGovernanceService'
import { sendBadRequest, sendSuccess, sendUnauthorized } from '../utils/responseHelpers'

export class ScoreGovernanceController {
  private service: ScoreGovernanceService

  constructor() {
    this.service = container.resolve(ScoreGovernanceService)
  }

  getSettings = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res)
        return
      }
      const settings = await this.service.getSettings(req.user.tenantId)
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
      const updated = await this.service.updateSettings(req.user.tenantId, req.user.id, {
        requiredAdditionalApprovals: Number(req.body?.requiredAdditionalApprovals || 2),
        approverRoles: Array.isArray(req.body?.approverRoles) ? req.body.approverRoles : []
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

      const data = await this.service.getScoreReview(req.user.tenantId, req.user.id, req.user.role, {
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

      const actionType = String(req.body?.actionType || '').toUpperCase()
      const scopeType = String(req.body?.scopeType || '').toUpperCase()
      if (!actionType || !scopeType) {
        return sendBadRequest(res, 'actionType and scopeType are required')
      }

      const created = await this.service.createRequest({
        tenantId: req.user.tenantId,
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
        signature: {
          typedSignature: req.body?.typedSignature,
          drawnSignatureData: req.body?.drawnSignatureData,
          signatureFilePath: req.body?.signatureFilePath
        }
      })

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

      const data = await this.service.getRequests(
        req.user.tenantId,
        {
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

      const id = req.params['id']
      if (!id) {
        return sendBadRequest(res, 'Request ID is required')
      }

      const updated = await this.service.approveRequest(id, req.user.tenantId, req.user.id, req.user.role, {
        typedSignature: req.body?.typedSignature,
        drawnSignatureData: req.body?.drawnSignatureData,
        signatureFilePath: req.body?.signatureFilePath
      })

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

      const id = req.params['id']
      if (!id) {
        return sendBadRequest(res, 'Request ID is required')
      }

      const result = await this.service.rejectRequest(id, req.user.tenantId, req.user.role, String(req.body?.reason || ''))
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
