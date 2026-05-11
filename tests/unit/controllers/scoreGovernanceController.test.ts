import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ScoreGovernanceController } from '../../../src/controllers/scoreGovernanceController';
import { ScoreGovernanceService } from '../../../src/services/ScoreGovernanceService';
import * as responseHelpers from '../../../src/utils/responseHelpers';

jest.mock('../../../src/services/ScoreGovernanceService');

describe('ScoreGovernanceController', () => {
  let controller: ScoreGovernanceController;
  let mockService: jest.Mocked<ScoreGovernanceService>;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockService = {
      getScoreReview: jest.fn(),
      getRequests: jest.fn(),
    } as any;

    jest.spyOn(container, 'resolve').mockReturnValue(mockService as any);
    jest.spyOn(responseHelpers, 'sendSuccess').mockImplementation(() => undefined as any);

    controller = new ScoreGovernanceController();

    mockReq = {
      query: {},
      body: {},
      params: {},
      tenantId: 'tenant-1',
      user: {
        id: 'user-1',
        role: 'AUDITOR',
        tenantId: 'tenant-1',
      },
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('forwards eventId into getScoreReview filters', async () => {
    mockReq.query = {
      eventId: 'event-1',
      contestId: 'contest-1',
      categoryId: 'category-1',
      contestantId: 'contestant-1',
    };
    mockService.getScoreReview.mockResolvedValue([]);

    await controller.getScoreReview(mockReq as Request, mockRes as Response, mockNext);

    expect(mockService.getScoreReview).toHaveBeenCalledWith('tenant-1', 'user-1', 'AUDITOR', {
      eventId: 'event-1',
      contestId: 'contest-1',
      categoryId: 'category-1',
      contestantId: 'contestant-1',
    });
  });

  it('forwards eventId into getRequests filters', async () => {
    mockReq.query = {
      eventId: 'event-1',
      contestId: 'contest-1',
      categoryId: 'category-1',
      contestantId: 'contestant-1',
      status: 'PENDING',
      actionType: 'adjust',
    };
    mockService.getRequests.mockResolvedValue([]);

    await controller.getRequests(mockReq as Request, mockRes as Response, mockNext);

    expect(mockService.getRequests).toHaveBeenCalledWith(
      'tenant-1',
      {
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'category-1',
        contestantId: 'contestant-1',
        status: 'PENDING',
        actionType: 'ADJUST',
      },
      { userId: 'user-1', userRole: 'AUDITOR' }
    );
  });
});
