import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { JudgeUncertificationService } from '../services/JudgeUncertificationService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class JudgeUncertificationController {
  private judgeUncertificationService: JudgeUncertificationService;
  private prisma: PrismaClient;

  constructor() {
    this.judgeUncertificationService = container.resolve(JudgeUncertificationService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getUncertificationRequests = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { status } = req.query;
      const requests = await this.judgeUncertificationService.getUncertificationRequests(status as string | undefined);
      return sendSuccess(res, requests);
    } catch (error) {
      return next(error);
    }
  };

  createUncertificationRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { judgeId, categoryId, reason } = req.body;
      const request = await this.judgeUncertificationService.createUncertificationRequest({
        judgeId,
        categoryId,
        reason,
        requestedBy: req.user!.id,
        userRole: req.user!.role
      });
      return sendSuccess(res, request, 'Uncertification request created. Awaiting co-signatures.');
    } catch (error) {
      return next(error);
    }
  };

  signUncertificationRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { signatureName } = req.body;
      const result = await this.judgeUncertificationService.signRequest(id!, {
        signatureName,
        userId: req.user!.id,
        userRole: req.user!.role
      });
      return sendSuccess(res, result, 'Request signed successfully');
    } catch (error) {
      return next(error);
    }
  };

  executeUncertification = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const result = await this.judgeUncertificationService.executeUncertification(id!);
      return sendSuccess(res, result, 'Uncertification executed successfully');
    } catch (error) {
      return next(error);
    }
  };

  requestUncertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId, categoryId, reason } = req.body;

      if (!judgeId || !categoryId || !reason) {
        return sendSuccess(res, {}, 'judgeId, categoryId, and reason are required', 400);
      }

      if (!req.user) {
        return sendSuccess(res, {}, 'User not authenticated', 401);
      }

      // Verify judge exists
      const judge = await this.prisma.judge.findUnique({
        where: { id: judgeId }
      });

      if (!judge) {
        return sendSuccess(res, {}, 'Judge not found', 404);
      }

      // Verify category exists
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId }
      });

      if (!category) {
        return sendSuccess(res, {}, 'Category not found', 404);
      }

      // Create uncertification request
      const request = await this.prisma.judgeUncertificationRequest.create({
        data: {
          tenantId: req.user.tenantId,
          judgeId,
          categoryId,
          reason,
          requestedBy: req.user.id,
          status: 'PENDING'
        }
      });

      return sendSuccess(res, request, 'Uncertification request created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  approveUncertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      if (!req.user) {
        return sendSuccess(res, {}, 'User not authenticated', 401);
      }

      // Get the uncertification request
      const request = await this.prisma.judgeUncertificationRequest.findUnique({
        where: { id }
      });

      if (!request) {
        return sendSuccess(res, {}, 'Uncertification request not found', 404);
      }

      if (request.status !== 'PENDING') {
        return sendSuccess(res, {}, `Cannot approve ${request.status.toLowerCase()} request`, 400);
      }

      // Approve the request
      const approved = await this.prisma.judgeUncertificationRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedBy: req.user.id,
          approvedAt: new Date()
        }
      });

      // Uncertify all scores for this judge in this category
      await this.prisma.score.updateMany({
        where: {
          judgeId: request.judgeId,
          categoryId: request.categoryId,
          isCertified: true
        },
        data: {
          isCertified: false,
          certifiedAt: null,
          certifiedBy: null
        }
      });

      return sendSuccess(res, approved, 'Uncertification request approved and scores uncertified successfully');
    } catch (error) {
      return next(error);
    }
  };

  rejectUncertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!req.user) {
        return sendSuccess(res, {}, 'User not authenticated', 401);
      }

      if (!rejectionReason) {
        return sendSuccess(res, {}, 'rejectionReason is required', 400);
      }

      // Get the uncertification request
      const request = await this.prisma.judgeUncertificationRequest.findUnique({
        where: { id }
      });

      if (!request) {
        return sendSuccess(res, {}, 'Uncertification request not found', 404);
      }

      if (request.status !== 'PENDING') {
        return sendSuccess(res, {}, `Cannot reject ${request.status.toLowerCase()} request`, 400);
      }

      // Reject the request
      const rejected = await this.prisma.judgeUncertificationRequest.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectedBy: req.user.id,
          rejectedAt: new Date(),
          rejectionReason: rejectionReason
        }
      });

      return sendSuccess(res, rejected, 'Uncertification request rejected successfully');
    } catch (error) {
      return next(error);
    }
  };

  getJudgeUncertificationRequests = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId } = req.params;
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const skip = (page - 1) * limit;
      const status = req.query['status'] as string | undefined;

      if (!judgeId) {
        return sendSuccess(res, {}, 'judgeId is required', 400);
      }

      const where: any = { judgeId };
      if (status) where.status = status;

      const [requests, total] = await Promise.all([
        this.prisma.judgeUncertificationRequest.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.judgeUncertificationRequest.count({ where })
      ]);

      return sendSuccess(res, {
        requests,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: skip + limit < total
        }
      });
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new JudgeUncertificationController();
export const getUncertificationRequests = controller.getUncertificationRequests;
export const createUncertificationRequest = controller.createUncertificationRequest;
export const signUncertificationRequest = controller.signUncertificationRequest;
export const executeUncertification = controller.executeUncertification;
export const requestUncertification = controller.requestUncertification;
export const approveUncertification = controller.approveUncertification;
export const rejectUncertification = controller.rejectUncertification;
export const getJudgeUncertificationRequests = controller.getJudgeUncertificationRequests;
