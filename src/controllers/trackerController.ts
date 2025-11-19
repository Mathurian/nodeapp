import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { TrackerService } from '../services/TrackerService';
import { sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class TrackerController {
  private trackerService: TrackerService;
  private prisma: PrismaClient;

  constructor() {
    this.trackerService = container.resolve(TrackerService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getScoringProgressByContest = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { contestId } = req.params;
      const progress = await this.trackerService.getScoringProgressByContest(contestId!);
      return sendSuccess(res, progress);
    } catch (error) {
      return next(error);
    }
  };

  getScoringProgressByCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { categoryId } = req.params;
      const progress = await this.trackerService.getScoringProgressByCategory(categoryId!);
      return sendSuccess(res, progress);
    } catch (error) {
      return next(error);
    }
  };

  getJudgeScoringProgress = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { judgeId } = req.params;
      const eventId = req.query['eventId'] as string | undefined;

      if (!judgeId) {
        return sendSuccess(res, {}, 'Judge ID is required', 400);
      }

      const where: any = { judgeId };
      if (eventId) {
        where.category = {
          contest: { eventId }
        };
      }

      const [totalAssignments, scoredAssignments, certifiedScores] = await Promise.all([
        this.prisma.assignment.count({ where: { judgeId, eventId } }),
        this.prisma.score.count({ where }),
        this.prisma.score.count({ where: { ...where, isCertified: true } })
      ]);

      const progress = {
        judgeId,
        totalAssignments,
        scoredAssignments,
        certifiedScores,
        completionRate: totalAssignments > 0 ? ((scoredAssignments / totalAssignments) * 100).toFixed(2) : '0',
        certificationRate: scoredAssignments > 0 ? ((certifiedScores / scoredAssignments) * 100).toFixed(2) : '0'
      };

      return sendSuccess(res, progress);
    } catch (error) {
      return next(error);
    }
  };

  getCertificationStatus = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        return sendSuccess(res, {}, 'Category ID is required', 400);
      }

      const certification = await this.prisma.certification.findFirst({
        where: { categoryId },
        orderBy: { createdAt: 'desc' }
      });

      if (!certification) {
        return sendSuccess(res, { status: 'NOT_STARTED', categoryId });
      }

      const status = {
        categoryId,
        status: 'IN_PROGRESS' as string,
        judgeCertified: certification.judgeCertified || false,
        tallyMasterCertified: certification.tallyCertified || false,
        auditorCertified: certification.auditorCertified || false,
        boardApproved: certification.boardApproved || false,
        certifiedAt: certification.certifiedAt,
        certifiedBy: certification.certifiedBy
      };

      if (certification.boardApproved) {
        status.status = 'COMPLETE';
      }

      return sendSuccess(res, status);
    } catch (error) {
      return next(error);
    }
  };

  getPendingCertifications = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const role = req.query['role'] as string | undefined;
      const eventId = req.query['eventId'] as string | undefined;

      const where: any = {};

      if (role === 'JUDGE') {
        where.judgeCertified = false;
      } else if (role === 'TALLY_MASTER') {
        where.judgeCertified = true;
        where.tallyCertified = false;
      } else if (role === 'AUDITOR') {
        where.tallyCertified = true;
        where.auditorCertified = false;
      } else if (role === 'BOARD') {
        where.auditorCertified = true;
        where.boardApproved = false;
      }

      if (eventId) {
        where.eventId = eventId;
      }

      const pendingCertifications = await this.prisma.certification.findMany({
        where,
        // include removed - no relations in schema
        orderBy: { createdAt: 'desc' }
      });

      return sendSuccess(res, {
        role,
        eventId,
        count: pendingCertifications.length,
        certifications: pendingCertifications
      });
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new TrackerController();
export const getScoringProgressByContest = controller.getScoringProgressByContest;
export const getScoringProgressByCategory = controller.getScoringProgressByCategory;
export const getJudgeScoringProgress = controller.getJudgeScoringProgress;
export const getCertificationStatus = controller.getCertificationStatus;
export const getPendingCertifications = controller.getPendingCertifications;
