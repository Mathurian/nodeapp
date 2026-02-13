import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { sendSuccess, sendNotFound, sendBadRequest, sendConflict } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { applyCertificationStage, refreshJudgeStage } from '../utils/certificationPipeline';

export class CertificationController {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getAllCertifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query['page'] as string) || 1;
      const limit = parseInt(req.query['limit'] as string) || 50;
      const status = req.query['status'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const categoryId = req.query['categoryId'] as string | undefined;

      const skip = (page - 1) * limit;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      const where: any = { tenantId };

      if (status) where.status = status;
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;
      if (categoryId) where.categoryId = categoryId;
      if (req.user?.role === 'JUDGE') where.userId = req.user.id;

      const [certifications, total] = await Promise.all([
        this.prisma.certification.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' }
        }),
        this.prisma.certification.count({ where })
      ]);

      return sendSuccess(res, {
        certifications,
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

  createCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId, contestId, eventId, comments } = req.body;

      if (!categoryId || !contestId || !eventId) {
        return sendBadRequest(res, 'categoryId, contestId, and eventId are required');
      }

      // Check if certification already exists for this combination
      const existing = await this.prisma.certification.findUnique({
        where: {
          tenantId_categoryId_contestId_eventId: {
            tenantId: (req as any).tenantId!,
            categoryId,
            contestId,
            eventId
          }
        }
      });

      if (existing) {
        return sendConflict(res, 'Certification already exists for this category/contest/event');
      }

      // SECURITY FIX #12: Defense in depth - validate tenant ownership
      const tenantId = (req as any).tenantId!;
      const [category, contest, event] = await Promise.all([
        this.prisma.category.findFirst({ where: { id: categoryId, tenantId } }),
        this.prisma.contest.findFirst({ where: { id: contestId, tenantId } }),
        this.prisma.event.findFirst({ where: { id: eventId, tenantId } })
      ]);

      if (!category) {
        return sendNotFound(res, 'Category not found or access denied');
      }
      if (!contest) {
        return sendNotFound(res, 'Contest not found or access denied');
      }
      if (!event) {
        return sendNotFound(res, 'Event not found or access denied');
      }

      const certification = await this.prisma.certification.create({
        data: {
          tenantId: (req as any).tenantId!,
          categoryId,
          contestId,
          eventId,
          userId: req.user?.id || null,
          status: 'PENDING',
          currentStep: 1,
          totalSteps: 4,
          comments: comments || null
        },
      });

      return sendSuccess(res, certification, 'Certification created successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  updateCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { status, comments, totalSteps } = req.body;

      const existing = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!existing) {
        return sendNotFound(res, 'Certification not found');
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (comments !== undefined) updateData.comments = comments;
      if (totalSteps !== undefined) updateData.totalSteps = totalSteps;

      const certification = await this.prisma.certification.update({
        where: { id },
        data: updateData,
      });

      return sendSuccess(res, certification, 'Certification updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  deleteCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendNotFound(res, 'Certification not found');
      }

      await this.prisma.certification.delete({
        where: { id }
      });

      return sendSuccess(res, {}, 'Certification deleted successfully');
    } catch (error) {
      return next(error);
    }
  };

  getCertificationById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const tenantId = (req as any).tenantId || req.user?.tenantId;

      const certification = await this.prisma.certification.findUnique({
        where: { id },
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      return sendSuccess(res, certification);
    } catch (error) {
      return next(error);
    }
  };

  certifyJudge = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (certification.judgeCertified) {
        return sendBadRequest(res, 'Judge certification already completed');
      }

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'JUDGE',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      await refreshJudgeStage(this.prisma, tenantId, certification.categoryId);

      return sendSuccess(res, updated, 'Judge certification completed successfully');
    } catch (error) {
      return next(error);
    }
  };

  certifyTally = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (!certification.judgeCertified) {
        return sendBadRequest(res, 'Judge must certify first');
      }

      if (certification.tallyCertified) {
        return sendBadRequest(res, 'Tally Master certification already completed');
      }

      await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId: certification.categoryId,
            role: 'TALLY_MASTER'
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'TALLY_MASTER',
          userId: req.user?.id || ''
        },
        update: {
          userId: req.user?.id || '',
          certifiedAt: new Date(),
          comments: comments || null
        }
      });

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'TALLY_MASTER',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      return sendSuccess(res, updated, 'Tally Master certification completed successfully');
    } catch (error) {
      return next(error);
    }
  };

  certifyAuditor = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (!certification.tallyCertified) {
        return sendBadRequest(res, 'Tally Master must certify first');
      }

      if (certification.auditorCertified) {
        return sendBadRequest(res, 'Auditor certification already completed');
      }

      await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId: certification.categoryId,
            role: 'AUDITOR'
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'AUDITOR',
          userId: req.user?.id || ''
        },
        update: {
          userId: req.user?.id || '',
          certifiedAt: new Date(),
          comments: comments || null
        }
      });

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'AUDITOR',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      return sendSuccess(res, updated, 'Auditor certification completed successfully');
    } catch (error) {
      return next(error);
    }
  };

  approveBoard = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        return sendBadRequest(res, 'Tenant context is required');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification || certification.tenantId !== tenantId) {
        return sendNotFound(res, 'Certification not found');
      }

      if (!certification.auditorCertified) {
        return sendBadRequest(res, 'Auditor must certify first');
      }

      if (certification.boardApproved) {
        return sendBadRequest(res, 'Board approval already completed');
      }

      await this.prisma.categoryCertification.upsert({
        where: {
          tenantId_categoryId_role: {
            tenantId,
            categoryId: certification.categoryId,
            role: 'BOARD'
          }
        },
        create: {
          tenantId,
          categoryId: certification.categoryId,
          role: 'BOARD',
          userId: req.user?.id || ''
        },
        update: {
          userId: req.user?.id || '',
          certifiedAt: new Date(),
          comments: comments || null
        }
      });

      const updated = await applyCertificationStage({
        prisma: this.prisma,
        tenantId,
        categoryId: certification.categoryId,
        role: 'BOARD',
        comments: comments || certification.comments,
        userId: req.user?.id || null,
        certifiedBy: req.user?.id || null
      });

      return sendSuccess(res, updated, 'Board approval completed - Certification finalized');
    } catch (error) {
      return next(error);
    }
  };

  rejectCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return sendBadRequest(res, 'Rejection reason is required');
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendNotFound(res, 'Certification not found');
      }

      if (certification.status === 'CERTIFIED') {
        return sendBadRequest(res, 'Cannot reject a finalized certification');
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          certifiedBy: req.user?.id || null
        },
      });

      return sendSuccess(res, updated, 'Certification rejected');
    } catch (error) {
      return next(error);
    }
  };

  getCertificationStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const eventId = req.query['eventId'] as string | undefined;
      const contestId = req.query['contestId'] as string | undefined;
      const tenantId = (req as any).tenantId || req.user?.tenantId;

      const where: any = { tenantId };
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;

      const [
        total,
        pending,
        inProgress,
        certified,
        rejected,
        judgeCertified,
        tallyCertified,
        auditorCertified,
        boardApproved
      ] = await Promise.all([
        this.prisma.certification.count({ where }),
        this.prisma.certification.count({ where: { ...where, status: 'PENDING' } }),
        this.prisma.certification.count({ where: { ...where, status: 'IN_PROGRESS' } }),
        this.prisma.certification.count({ where: { ...where, status: 'CERTIFIED' } }),
        this.prisma.certification.count({ where: { ...where, status: 'REJECTED' } }),
        this.prisma.certification.count({ where: { ...where, judgeCertified: true } }),
        this.prisma.certification.count({ where: { ...where, tallyCertified: true } }),
        this.prisma.certification.count({ where: { ...where, auditorCertified: true } }),
        this.prisma.certification.count({ where: { ...where, boardApproved: true } })
      ]);

      const stats = {
        total,
        byStatus: {
          pending,
          inProgress,
          certified,
          rejected
        },
        byStage: {
          judgeCertified,
          tallyCertified,
          auditorCertified,
          boardApproved
        },
        completionRate: total > 0 ? ((certified / total) * 100).toFixed(2) + '%' : '0%',
        rejectionRate: total > 0 ? ((rejected / total) * 100).toFixed(2) + '%' : '0%',
        averageStep: total > 0
          ? ((judgeCertified + tallyCertified + auditorCertified + boardApproved) / total).toFixed(2)
          : '0'
      };

      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new CertificationController();
export const getAllCertifications = controller.getAllCertifications;
export const createCertification = controller.createCertification;
export const updateCertification = controller.updateCertification;
export const deleteCertification = controller.deleteCertification;
export const getCertificationById = controller.getCertificationById;
export const certifyJudge = controller.certifyJudge;
export const certifyTally = controller.certifyTally;
export const certifyAuditor = controller.certifyAuditor;
export const approveBoard = controller.approveBoard;
export const rejectCertification = controller.rejectCertification;
export const getCertificationStats = controller.getCertificationStats;
