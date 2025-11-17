import { Request, Response, NextFunction } from 'express';
import { container } from '../config/container';
import { JudgeContestantCertificationService } from '../services/JudgeContestantCertificationService';
import { successResponse, sendSuccess } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class JudgeContestantCertificationController {
  private judgeContestantCertificationService: JudgeContestantCertificationService;
  private prisma: PrismaClient;

  constructor() {
    this.judgeContestantCertificationService = container.resolve(JudgeContestantCertificationService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getCertifications = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { judgeId, categoryId, contestantId } = req.query;
      const certifications = await this.judgeContestantCertificationService.getCertifications(
        judgeId as string | undefined,
        categoryId as string | undefined,
        contestantId as string | undefined
      );
      return sendSuccess(res, certifications);
    } catch (error) {
      return next(error);
    }
  };

  certify = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { judgeId, categoryId, contestantId } = req.body;
      const certification = await this.judgeContestantCertificationService.certify({
        judgeId,
        categoryId,
        contestantId
      });
      return sendSuccess(res, certification, 'Certification created', 201);
    } catch (error) {
      return next(error);
    }
  };

  uncertify = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await this.judgeContestantCertificationService.uncertify(id);
      return sendSuccess(res, null, 'Certification deleted');
    } catch (error) {
      return next(error);
    }
  };

  certifyContestantScores = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { contestantId, categoryId } = req.body;

      if (!contestantId || !categoryId) {
        return sendSuccess(res, {}, 'contestantId and categoryId are required', 400);
      }

      // Certify all scores for this contestant in this category
      const result = await this.prisma.score.updateMany({
        where: {
          contestantId,
          categoryId,
          isCertified: false
        },
        data: {
          isCertified: true,
          certifiedAt: new Date(),
          certifiedBy: req.user?.id || null
        }
      });

      return sendSuccess(res, {
        contestantId,
        categoryId,
        certifiedCount: result.count
      }, `Certified ${result.count} scores for contestant in category`);
    } catch (error) {
      return next(error);
    }
  };

  getCategoryCertificationStatus = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;
      if (!categoryId) {
        return sendSuccess(res, {}, 'Category ID is required', 400);
      }

      const status = await this.judgeContestantCertificationService.getCategoryCertificationStatus(categoryId);
      return sendSuccess(res, status, 'Category certification status retrieved successfully');
    } catch (error) {
      return next(error);
    }
  };

  certifyCategory = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { categoryId } = req.params;

      if (!categoryId) {
        return sendSuccess(res, {}, 'Category ID is required', 400);
      }

      // Certify all scores in this category
      const result = await this.prisma.score.updateMany({
        where: {
          categoryId,
          isCertified: false
        },
        data: {
          isCertified: true,
          certifiedAt: new Date(),
          certifiedBy: req.user?.id || null
        }
      });

      return sendSuccess(res, {
        categoryId,
        certifiedCount: result.count
      }, `Certified ${result.count} scores in category`);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new JudgeContestantCertificationController();
export const getCertifications = controller.getCertifications;
export const certify = controller.certify;
export const uncertify = controller.uncertify;
export const certifyContestantScores = controller.certifyContestantScores;
export const getCategoryCertificationStatus = controller.getCategoryCertificationStatus;
export const certifyCategory = controller.certifyCategory;
