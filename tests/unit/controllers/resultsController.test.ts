/**
 * Results Controller Tests
 * Comprehensive test coverage for ResultsController endpoints
 * Tests role-based access control and results aggregation
 */

import { Request, Response, NextFunction } from 'express';
import { ResultsController } from '../../../src/controllers/resultsController';
import { ResultsService } from '../../../src/services/ResultsService';
import { container } from 'tsyringe';
import { createRequestLogger } from '../../../src/utils/logger';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/ResultsService');
jest.mock('../../../src/utils/logger');

describe('ResultsController', () => {
  let controller: ResultsController;
  let mockResultsService: jest.Mocked<ResultsService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockResults = [
    {
      id: 'result-1',
      contestantId: 'contestant-1',
      categoryId: 'cat-1',
      totalScore: 95.5,
      rank: 1,
    },
    {
      id: 'result-2',
      contestantId: 'contestant-2',
      categoryId: 'cat-1',
      totalScore: 92.0,
      rank: 2,
    },
  ];

  const mockCategories = [
    { id: 'cat-1', name: 'Singing', contestId: 'contest-1' },
    { id: 'cat-2', name: 'Dancing', contestId: 'contest-1' },
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    (createRequestLogger as jest.Mock).mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    });

    mockResultsService = {
      getAllResults: jest.fn(),
      getCategories: jest.fn(),
      getContestantResults: jest.fn(),
      getCategoryResults: jest.fn(),
      getContestResults: jest.fn(),
      getEventResults: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockResultsService);

    controller = new ResultsController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: UserRole.ADMIN },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getAllResults', () => {
    it('should return paginated results for authenticated user', async () => {
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockReq.query = { page: '2', limit: '20', offset: '20' };
      mockResultsService.getAllResults.mockResolvedValue({
        results: mockResults,
        total: 50,
      } as any);

      await controller.getAllResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getAllResults).toHaveBeenCalledWith({
        userRole: UserRole.JUDGE,
        userId: 'user-1',
        offset: 20,
        limit: 20,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        results: mockResults,
        pagination: {
          page: 2,
          limit: 20,
          total: 50,
          pages: 3,
        },
      });
    });

    it('should use default pagination values', async () => {
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockReq.query = {};
      mockResultsService.getAllResults.mockResolvedValue({
        results: mockResults,
        total: 100,
      } as any);

      await controller.getAllResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getAllResults).toHaveBeenCalledWith({
        userRole: UserRole.ADMIN,
        userId: 'user-1',
        offset: 0,
        limit: 50,
      });
      expect(mockRes.json).toHaveBeenCalledWith({
        results: mockResults,
        pagination: {
          page: 1,
          limit: 50,
          total: 100,
          pages: 2,
        },
      });
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.user = undefined;

      await controller.getAllResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
      expect(mockResultsService.getAllResults).not.toHaveBeenCalled();
    });

    it('should return 401 when user role is missing', async () => {
      mockReq.user = { id: 'user-1' };

      await controller.getAllResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockResultsService.getAllResults.mockRejectedValue(error);

      await controller.getAllResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      mockResultsService.getCategories.mockResolvedValue(mockCategories as any);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getCategories).toHaveBeenCalled();
      expect(mockRes.json).toHaveBeenCalledWith(mockCategories);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockResultsService.getCategories.mockRejectedValue(error);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestantResults', () => {
    it('should return results for contestant', async () => {
      mockReq.params = { contestantId: 'contestant-1' };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockResultsService.getContestantResults.mockResolvedValue(mockResults as any);

      await controller.getContestantResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getContestantResults).toHaveBeenCalledWith({
        contestantId: 'contestant-1',
        userRole: UserRole.ADMIN,
        userId: 'user-1',
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockResults);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { contestantId: 'contestant-1' };
      mockReq.user = undefined;

      await controller.getContestantResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('should return 403 when access is denied', async () => {
      const error = new Error('Access denied. You can only view your own results.');
      mockReq.params = { contestantId: 'contestant-1' };
      mockReq.user = { id: 'user-1', role: UserRole.CONTESTANT };
      mockResultsService.getContestantResults.mockRejectedValue(error);

      await controller.getContestantResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: error.message });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error for non-access errors', async () => {
      const error = new Error('Database error');
      mockReq.params = { contestantId: 'contestant-1' };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockResultsService.getContestantResults.mockRejectedValue(error);

      await controller.getContestantResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategoryResults', () => {
    it('should return results for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockResultsService.getCategoryResults.mockResolvedValue(mockResults as any);

      await controller.getCategoryResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getCategoryResults).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        userRole: UserRole.JUDGE,
        userId: 'user-1',
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockResults);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = undefined;

      await controller.getCategoryResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('should return 404 when category not found', async () => {
      const error = new Error('Category not found');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockResultsService.getCategoryResults.mockRejectedValue(error);

      await controller.getCategoryResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Category not found' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 403 when not assigned to category', async () => {
      const error = new Error('Not assigned to this category');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockResultsService.getCategoryResults.mockRejectedValue(error);

      await controller.getCategoryResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not assigned to this category' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should call next with error for other errors', async () => {
      const error = new Error('Database error');
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockResultsService.getCategoryResults.mockRejectedValue(error);

      await controller.getCategoryResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestResults', () => {
    it('should return results for contest', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: UserRole.TALLY_MASTER };
      mockResultsService.getContestResults.mockResolvedValue(mockResults as any);

      await controller.getContestResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getContestResults).toHaveBeenCalledWith({
        contestId: 'contest-1',
        userRole: UserRole.TALLY_MASTER,
        userId: 'user-1',
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockResults);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { contestId: 'contest-1' };
      mockReq.user = undefined;

      await controller.getContestResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('should return 404 when contest not found', async () => {
      const error = new Error('Contest not found');
      mockReq.params = { contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: UserRole.TALLY_MASTER };
      mockResultsService.getContestResults.mockRejectedValue(error);

      await controller.getContestResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contest not found' });
    });

    it('should return 403 when not assigned to contest', async () => {
      const error = new Error('Not assigned to this contest');
      mockReq.params = { contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockResultsService.getContestResults.mockRejectedValue(error);

      await controller.getContestResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not assigned to this contest' });
    });

    it('should call next with error for other errors', async () => {
      const error = new Error('Database error');
      mockReq.params = { contestId: 'contest-1' };
      mockReq.user = { id: 'user-1', role: UserRole.TALLY_MASTER };
      mockResultsService.getContestResults.mockRejectedValue(error);

      await controller.getContestResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getEventResults', () => {
    it('should return results for event', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockResultsService.getEventResults.mockResolvedValue(mockResults as any);

      await controller.getEventResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getEventResults).toHaveBeenCalledWith({
        eventId: 'event-1',
        userRole: UserRole.ADMIN,
        userId: 'user-1',
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockResults);
    });

    it('should return 401 when user is not authenticated', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.user = undefined;

      await controller.getEventResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized',
      });
    });

    it('should return 404 when event not found', async () => {
      const error = new Error('Event not found');
      mockReq.params = { eventId: 'event-1' };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockResultsService.getEventResults.mockRejectedValue(error);

      await controller.getEventResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Event not found' });
    });

    it('should return 403 when not assigned to event', async () => {
      const error = new Error('Not assigned to this event');
      mockReq.params = { eventId: 'event-1' };
      mockReq.user = { id: 'user-1', role: UserRole.JUDGE };
      mockResultsService.getEventResults.mockRejectedValue(error);

      await controller.getEventResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Not assigned to this event' });
    });

    it('should call next with error for other errors', async () => {
      const error = new Error('Database error');
      mockReq.params = { eventId: 'event-1' };
      mockReq.user = { id: 'user-1', role: UserRole.ADMIN };
      mockResultsService.getEventResults.mockRejectedValue(error);

      await controller.getEventResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Role-based Access Control', () => {
    it('should allow ADMIN to access all results', async () => {
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockReq.query = {};
      mockResultsService.getAllResults.mockResolvedValue({
        results: mockResults,
        total: 10,
      } as any);

      await controller.getAllResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getAllResults).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: UserRole.ADMIN,
          userId: 'admin-1',
        })
      );
    });

    it('should allow JUDGE to access assigned results', async () => {
      mockReq.user = { id: 'judge-1', role: UserRole.JUDGE };
      mockReq.params = { categoryId: 'cat-1' };
      mockResultsService.getCategoryResults.mockResolvedValue(mockResults as any);

      await controller.getCategoryResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getCategoryResults).toHaveBeenCalledWith(
        expect.objectContaining({
          userRole: UserRole.JUDGE,
          userId: 'judge-1',
        })
      );
    });

    it('should allow CONTESTANT to view own results', async () => {
      mockReq.user = { id: 'contestant-1', role: UserRole.CONTESTANT };
      mockReq.params = { contestantId: 'contestant-1' };
      mockResultsService.getContestantResults.mockResolvedValue(mockResults as any);

      await controller.getContestantResults(mockReq as Request, mockRes as Response, mockNext);

      expect(mockResultsService.getContestantResults).toHaveBeenCalledWith(
        expect.objectContaining({
          contestantId: 'contestant-1',
          userRole: UserRole.CONTESTANT,
          userId: 'contestant-1',
        })
      );
    });
  });
});
