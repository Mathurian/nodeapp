import { Request, Response, NextFunction } from 'express';
import { requireAuthenticatedUser, requireAuthAndTenant } from '../utils/requestValidation';
import { container } from '../config/container';
import { CategoryCertificationService } from '../services/CategoryCertificationService';
import { sendSuccess, sendNotFound, sendBadRequest, sendUnauthorized, sendForbidden } from '../utils/responseHelpers';
import { PrismaClient } from '@prisma/client';

export class CategoryCertificationController {
  private categoryCertificationService: CategoryCertificationService;
  private prisma: PrismaClient;

  constructor() {
    this.categoryCertificationService = container.resolve(CategoryCertificationService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  getCategoryCertificationProgress = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { categoryId } = req.params;
      const progress = await this.categoryCertificationService.getCertificationProgress(categoryId!);
      return sendSuccess(res, progress);
    } catch (error) {
      return next(error);
    }
  };

  certifyCategory = async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { categoryId } = req.params;
      const certification = await this.categoryCertificationService.certifyCategory(
        categoryId!,
        req.user.id,
        req.user.role,
        req.user.tenantId
      );
      return sendSuccess(res, certification, 'Category certified successfully');
    } catch (error) {
      return next(error);
    }
  };

  certifyContestant = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { contestantId, categoryId } = req.body;

      if (!contestantId || !categoryId) {
        return sendBadRequest(res, 'contestantId and categoryId are required');
      }

      // Create certification record
      const certification = await this.prisma.judgeContestantCertification.create({
        data: {
          judgeId: req.user?.judgeId || '',
          categoryId,
          contestantId,
          certifiedAt: new Date(),
          tenantId: req.user.tenantId
        }
      });

      return sendSuccess(res, certification, 'Contestant certified successfully', 201);
    } catch (error) {
      return next(error);
    }
  };

  certifyJudgeScores = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      if (!req.user) {
        sendUnauthorized(res);
        return;
      }

      const { judgeId, categoryId } = req.body;

      if (!judgeId || !categoryId) {
        return sendBadRequest(res, 'judgeId and categoryId are required');
      }

      // Certify all scores for this judge in this category
      const result = await this.prisma.score.updateMany({
        where: {
          judgeId,
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
        judgeId,
        categoryId,
        certifiedCount: result.count
      }, `Certified ${result.count} scores for judge in category`);
    } catch (error) {
      return next(error);
    }
  };
}

const controller = new CategoryCertificationController();
export const getCategoryCertificationProgress = controller.getCategoryCertificationProgress;
export const certifyCategory = controller.certifyCategory;
export const certifyContestant = controller.certifyContestant;
export const certifyJudgeScores = controller.certifyJudgeScores;
