/**
 * ContestCertificationController Unit Tests
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { ContestCertificationController } from '../../../src/controllers/contestCertificationController';
import { ContestCertificationService } from '../../../src/services/ContestCertificationService';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/ContestCertificationService');

describe('ContestCertificationController', () => {
  let controller: ContestCertificationController;
  let mockService: jest.Mocked<ContestCertificationService>;
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
      certifyContest: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockService);

    controller = new ContestCertificationController();

    mockReq = {
      params: {},
      body: {},
      user: { id: 'user-1', role: 'TALLY_MASTER', judgeId: undefined },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getContestCertificationProgress', () => {
    it('should return certification progress', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const mockProgress = {
        contestId: 'contest-1',
        totalCategories: 5,
        certifiedCategories: 3,
        progress: 60,
      };
      mockService.getCertificationProgress.mockResolvedValue(mockProgress as any);

      await controller.getContestCertificationProgress(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getCertificationProgress).toHaveBeenCalledWith('contest-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockProgress);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const error = new Error('Service error');
      mockService.getCertificationProgress.mockRejectedValue(error);

      await controller.getContestCertificationProgress(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('certifyContest', () => {
    it('should certify contest successfully', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const mockCertification = {
        id: 'cert-1',
        contestId: 'contest-1',
        status: 'CERTIFIED',
      };
      mockService.certifyContest.mockResolvedValue(mockCertification as any);

      await controller.certifyContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.certifyContest).toHaveBeenCalledWith('contest-1', 'user-1', 'TALLY_MASTER');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockCertification, 'Contest certified successfully');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const error = new Error('Certification failed');
      mockService.certifyContest.mockRejectedValue(error);

      await controller.certifyContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
