import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { CertificationService } from '../services/CertificationService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class CertificationController {
  private certificationService: CertificationService;
  private prisma: PrismaClient;

  constructor() {
    this.certificationService = container.resolve(CertificationService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getOverallStatus = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const status = await this.certificationService.getOverallStatus(eventId);
      return sendSuccess(res, status);
    } catch (error) {
      next(error);
    }
  };

  certifyAll = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { eventId } = req.params;
      const result = await this.certificationService.certifyAll(eventId, req.user!.id, req.user!.role);
      return sendSuccess(res, result, 'All categories certified');
    } catch (error) {
      next(error);
    }
  };

  getAllCertifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 50;
      const status = req.query.status as string | undefined;
      const eventId = req.query.eventId as string | undefined;
      const contestId = req.query.contestId as string | undefined;
      const categoryId = req.query.categoryId as string | undefined;

      const skip = (page - 1) * limit;
      const where: any = {};

      if (status) where.status = status;
      if (eventId) where.eventId = eventId;
      if (contestId) where.contestId = contestId;
      if (categoryId) where.categoryId = categoryId;

      const [certifications, total] = await Promise.all([
        this.prisma.certification.findMany({
          where,
          // include removed - no relations in schema
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
      next(error);
    }
  };

  createCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId, contestId, eventId, comments } = req.body;

      if (!categoryId || !contestId || !eventId) {
        return sendSuccess(res, {}, 'categoryId, contestId, and eventId are required', 400);
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
        return sendSuccess(res, {}, 'Certification already exists for this category/contest/event', 409);
      }

      // Verify that the category, contest, and event exist
      const [category, contest, event] = await Promise.all([
        this.prisma.category.findUnique({ where: { id: categoryId } }),
        this.prisma.contest.findUnique({ where: { id: contestId } }),
        this.prisma.event.findUnique({ where: { id: eventId } })
      ]);

      if (!category) {
        return sendSuccess(res, {}, 'Category not found', 404);
      }
      if (!contest) {
        return sendSuccess(res, {}, 'Contest not found', 404);
      }
      if (!event) {
        return sendSuccess(res, {}, 'Event not found', 404);
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
        // include removed - no relations in schema
      });

      return sendSuccess(res, certification, 'Certification created successfully', 201);
    } catch (error) {
      next(error);
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
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      const updateData: any = {};
      if (status !== undefined) updateData.status = status;
      if (comments !== undefined) updateData.comments = comments;
      if (totalSteps !== undefined) updateData.totalSteps = totalSteps;

      const certification = await this.prisma.certification.update({
        where: { id },
        data: updateData,
        // include removed - no relations in schema
      });

      return sendSuccess(res, certification, 'Certification updated successfully');
    } catch (error) {
      next(error);
    }
  };

  deleteCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      await this.prisma.certification.delete({
        where: { id }
      });

      return sendSuccess(res, {}, 'Certification deleted successfully');
    } catch (error) {
      next(error);
    }
  };

  getCertificationById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;

      const certification = await this.prisma.certification.findUnique({
        where: { id },
        // include removed - no relations in schema
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      return sendSuccess(res, certification);
    } catch (error) {
      next(error);
    }
  };

  certifyJudge = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      if (certification.judgeCertified) {
        return sendSuccess(res, {}, 'Judge certification already completed', 400);
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          judgeCertified: true,
          currentStep: 2,
          status: 'IN_PROGRESS',
          comments: comments || certification.comments
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Judge certification completed successfully');
    } catch (error) {
      next(error);
    }
  };

  certifyTally = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      if (!certification.judgeCertified) {
        return sendSuccess(res, {}, 'Judge must certify first', 400);
      }

      if (certification.tallyCertified) {
        return sendSuccess(res, {}, 'Tally Master certification already completed', 400);
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          tallyCertified: true,
          currentStep: 3,
          status: 'IN_PROGRESS',
          comments: comments || certification.comments
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Tally Master certification completed successfully');
    } catch (error) {
      next(error);
    }
  };

  certifyAuditor = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      if (!certification.tallyCertified) {
        return sendSuccess(res, {}, 'Tally Master must certify first', 400);
      }

      if (certification.auditorCertified) {
        return sendSuccess(res, {}, 'Auditor certification already completed', 400);
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          auditorCertified: true,
          currentStep: 4,
          status: 'IN_PROGRESS',
          comments: comments || certification.comments
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Auditor certification completed successfully');
    } catch (error) {
      next(error);
    }
  };

  approveBoard = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { comments } = req.body;

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      if (!certification.auditorCertified) {
        return sendSuccess(res, {}, 'Auditor must certify first', 400);
      }

      if (certification.boardApproved) {
        return sendSuccess(res, {}, 'Board approval already completed', 400);
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          boardApproved: true,
          status: 'CERTIFIED',
          certifiedAt: new Date(),
          certifiedBy: req.user?.id || null,
          comments: comments || certification.comments
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Board approval completed - Certification finalized');
    } catch (error) {
      next(error);
    }
  };

  rejectCertification = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      const { rejectionReason } = req.body;

      if (!rejectionReason) {
        return sendSuccess(res, {}, 'Rejection reason is required', 400);
      }

      const certification = await this.prisma.certification.findUnique({
        where: { id }
      });

      if (!certification) {
        return sendSuccess(res, {}, 'Certification not found', 404);
      }

      if (certification.status === 'CERTIFIED') {
        return sendSuccess(res, {}, 'Cannot reject a finalized certification', 400);
      }

      const updated = await this.prisma.certification.update({
        where: { id },
        data: {
          status: 'REJECTED',
          rejectionReason,
          certifiedBy: req.user?.id || null
        },
        // include removed - no relations in schema
      });

      return sendSuccess(res, updated, 'Certification rejected');
    } catch (error) {
      next(error);
    }
  };

  getCertificationStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const eventId = req.query.eventId as string | undefined;
      const contestId = req.query.contestId as string | undefined;

      const where: any = {};
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
      next(error);
    }
  };
}

const controller = new CertificationController();
export const getOverallStatus = controller.getOverallStatus;
export const certifyAll = controller.certifyAll;
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
