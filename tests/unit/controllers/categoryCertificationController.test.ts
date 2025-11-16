/**
 * CategoryCertificationController Unit Tests
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { CategoryCertificationController } from '../../../src/controllers/categoryCertificationController';
import { CategoryCertificationService } from '../../../src/services/CategoryCertificationService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';

jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/CategoryCertificationService');

describe('CategoryCertificationController', () => {
  let controller: CategoryCertificationController;
  let mockService: jest.Mocked<CategoryCertificationService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });

    mockService = {
      getCertificationProgress: jest.fn(),
      certifyCategory: jest.fn(),
    } as any;

    mockPrisma = mockDeep<PrismaClient>();

    (container.resolve as jest.Mock) = jest.fn((service) => {
      if (service === 'PrismaClient') return mockPrisma;
      return mockService;
    });

    controller = new CategoryCertificationController();

    mockReq = {
      params: {},
      body: {},
      user: { id: 'user-1', role: 'JUDGE', judgeId: 'judge-1' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getCategoryCertificationProgress', () => {
    it('should return certification progress', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockProgress = {
        categoryId: 'cat-1',
        totalContestants: 10,
        certifiedContestants: 8,
        progress: 80,
      };
      mockService.getCertificationProgress.mockResolvedValue(mockProgress as any);

      await controller.getCategoryCertificationProgress(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getCertificationProgress).toHaveBeenCalledWith('cat-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProgress);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockService.getCertificationProgress.mockRejectedValue(error);

      await controller.getCategoryCertificationProgress(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyCategory', () => {
    it('should certify category successfully', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockCertification = {
        id: 'cert-1',
        categoryId: 'cat-1',
        status: 'CERTIFIED',
      };
      mockService.certifyCategory.mockResolvedValue(mockCertification as any);

      await controller.certifyCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.certifyCategory).toHaveBeenCalledWith('cat-1', 'user-1', 'JUDGE');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCertification, 'Category certified successfully');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Certification failed');
      mockService.certifyCategory.mockRejectedValue(error);

      await controller.certifyCategory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyContestant', () => {
    it('should certify contestant successfully', async () => {
      mockReq.body = { contestantId: 'cont-1', categoryId: 'cat-1' };
      const mockCertification = {
        id: 'cert-1',
        judgeId: 'judge-1',
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };
      mockPrisma.judgeContestantCertification.create.mockResolvedValue(mockCertification as any);

      await controller.certifyContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.judgeContestantCertification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          judgeId: 'judge-1',
          categoryId: 'cat-1',
          contestantId: 'cont-1',
        }),
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCertification, 'Contestant certified successfully', 201);
    });

    it('should return 400 when contestantId missing', async () => {
      mockReq.body = { categoryId: 'cat-1' };

      await controller.certifyContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'contestantId and categoryId are required', 400);
    });

    it('should return 400 when categoryId missing', async () => {
      mockReq.body = { contestantId: 'cont-1' };

      await controller.certifyContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'contestantId and categoryId are required', 400);
    });

    it('should call next with error when prisma throws', async () => {
      mockReq.body = { contestantId: 'cont-1', categoryId: 'cat-1' };
      const error = new Error('Database error');
      mockPrisma.judgeContestantCertification.create.mockRejectedValue(error);

      await controller.certifyContestant(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyJudgeScores', () => {
    it('should certify judge scores successfully', async () => {
      mockReq.body = { judgeId: 'judge-1', categoryId: 'cat-1' };
      mockPrisma.score.updateMany.mockResolvedValue({ count: 5 } as any);

      await controller.certifyJudgeScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockPrisma.score.updateMany).toHaveBeenCalledWith({
        where: {
          judgeId: 'judge-1',
          categoryId: 'cat-1',
          isCertified: false,
        },
        data: expect.objectContaining({
          isCertified: true,
          certifiedBy: 'user-1',
        }),
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({ certifiedCount: 5 }),
        'Certified 5 scores for judge in category'
      );
    });

    it('should return 400 when judgeId missing', async () => {
      mockReq.body = { categoryId: 'cat-1' };

      await controller.certifyJudgeScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'judgeId and categoryId are required', 400);
    });

    it('should return 400 when categoryId missing', async () => {
      mockReq.body = { judgeId: 'judge-1' };

      await controller.certifyJudgeScores(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, {}, 'judgeId and categoryId are required', 400);
    });

    it('should call next with error when prisma throws', async () => {
      mockReq.body = { judgeId: 'judge-1', categoryId: 'cat-1' };
      const error = new Error('Update failed');
      mockPrisma.score.updateMany.mockRejectedValue(error);

      await controller.certifyJudgeScores(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
