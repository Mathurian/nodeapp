/**
 * Contests Controller Tests
 * Comprehensive test coverage for ContestsController endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { ContestsController } from '../../../src/controllers/contestsController';
import { ContestService } from '../../../src/services/ContestService';
import { sendSuccess, sendCreated, sendNoContent, sendError } from '../../../src/utils/responseHelpers';
import { container } from '../../../src/config/container';

// Mock dependencies
jest.mock('../../../src/services/ContestService');
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/config/container');

describe('ContestsController', () => {
  let controller: ContestsController;
  let mockContestService: jest.Mocked<ContestService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  // Mock data
  const mockContest = {
    id: 'contest-1',
    eventId: 'event-1',
    name: 'Talent Competition',
    description: 'Annual talent show',
    contestantNumberingMode: 'SEQUENTIAL',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-01'),
    archived: false,
  };

  const mockContestWithDetails = {
    ...mockContest,
    event: { id: 'event-1', name: 'Spring Festival' },
    categories: [
      { id: 'cat-1', name: 'Singing' },
      { id: 'cat-2', name: 'Dancing' },
    ],
    _count: {
      categories: 2,
      contestants: 15,
    },
  };

  const mockContests = [
    mockContest,
    {
      id: 'contest-2',
      eventId: 'event-1',
      name: 'Dance Competition',
      description: 'Modern dance showcase',
      contestantNumberingMode: 'BY_CATEGORY',
      createdAt: new Date('2025-01-02'),
      updatedAt: new Date('2025-01-02'),
      archived: false,
    },
  ];

  const mockStats = {
    totalCategories: 5,
    totalContestants: 25,
    totalScores: 120,
    averageScore: 87.5,
    completionRate: 0.95,
  };

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock service
    mockContestService = {
      getContestWithDetails: jest.fn(),
      getContestsByEventId: jest.fn(),
      createContest: jest.fn(),
      updateContest: jest.fn(),
      deleteContest: jest.fn(),
      archiveContest: jest.fn(),
      unarchiveContest: jest.fn(),
      getContestStats: jest.fn(),
      searchContests: jest.fn(),
    } as any;

    // Mock container resolve
    (container.resolve as jest.Mock).mockReturnValue(mockContestService);

    // Create controller instance
    controller = new ContestsController();

    // Setup mock request and response
    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'admin' },
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();

    // Mock response helpers
    (sendSuccess as jest.Mock).mockImplementation((res, data) => res.json({ success: true, data }));
    (sendCreated as jest.Mock).mockImplementation((res, data) => res.status(201).json({ success: true, data }));
    (sendNoContent as jest.Mock).mockImplementation((res) => res.status(204).send());
    (sendError as jest.Mock).mockImplementation((res, message, status) => res.status(status).json({ success: false, error: message }));
  });

  describe('getContestById', () => {
    it('should return 200 with contest details when contest exists', async () => {
      mockReq.params = { id: 'contest-1' };
      mockContestService.getContestWithDetails.mockResolvedValue(mockContestWithDetails as any);

      await controller.getContestById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.getContestWithDetails).toHaveBeenCalledWith('contest-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockContestWithDetails, 'Contest retrieved successfully');
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};

      await controller.getContestById(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
      expect(mockContestService.getContestWithDetails).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { id: 'contest-1' };
      mockContestService.getContestWithDetails.mockRejectedValue(error);

      await controller.getContestById(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestsByEvent', () => {
    it('should return contests for event when eventId provided', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.query = {};
      mockContestService.getContestsByEventId.mockResolvedValue(mockContests as any);

      await controller.getContestsByEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.getContestsByEventId).toHaveBeenCalledWith('event-1', false, true);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockContests, 'Contests retrieved successfully');
    });

    it('should include archived contests when includeArchived=true', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.query = { includeArchived: 'true' };
      mockContestService.getContestsByEventId.mockResolvedValue(mockContests as any);

      await controller.getContestsByEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.getContestsByEventId).toHaveBeenCalledWith('event-1', true, true);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockContests, 'Contests retrieved successfully');
    });

    it('should return 400 when eventId is missing', async () => {
      mockReq.params = {};

      await controller.getContestsByEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Event ID is required', 400);
      expect(mockContestService.getContestsByEventId).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockReq.params = { eventId: 'event-1' };
      mockContestService.getContestsByEventId.mockRejectedValue(error);

      await controller.getContestsByEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createContest', () => {
    it('should create contest with valid data', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.body = {
        name: 'New Contest',
        description: 'Contest description',
        contestantNumberingMode: 'SEQUENTIAL',
      };
      mockContestService.createContest.mockResolvedValue(mockContest as any);

      await controller.createContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.createContest).toHaveBeenCalledWith({
        eventId: 'event-1',
        name: 'New Contest',
        description: 'Contest description',
        contestantNumberingMode: 'SEQUENTIAL',
      });
      expect(sendCreated).toHaveBeenCalledWith(mockRes, mockContest, 'Contest created successfully');
    });

    it('should return 400 when eventId is missing', async () => {
      mockReq.params = {};
      mockReq.body = { name: 'New Contest' };

      await controller.createContest(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Event ID is required', 400);
      expect(mockContestService.createContest).not.toHaveBeenCalled();
    });

    it('should create contest with minimal data', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.body = { name: 'Minimal Contest' };
      mockContestService.createContest.mockResolvedValue(mockContest as any);

      await controller.createContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.createContest).toHaveBeenCalledWith({
        eventId: 'event-1',
        name: 'Minimal Contest',
        description: undefined,
        contestantNumberingMode: undefined,
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Validation error');
      mockReq.params = { eventId: 'event-1' };
      mockReq.body = { name: 'Test' };
      mockContestService.createContest.mockRejectedValue(error);

      await controller.createContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateContest', () => {
    it('should update contest with valid data', async () => {
      mockReq.params = { id: 'contest-1' };
      mockReq.body = {
        name: 'Updated Contest',
        description: 'Updated description',
        contestantNumberingMode: 'BY_CATEGORY',
      };
      const updatedContest = { ...mockContest, ...mockReq.body };
      mockContestService.updateContest.mockResolvedValue(updatedContest as any);

      await controller.updateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.updateContest).toHaveBeenCalledWith('contest-1', {
        name: 'Updated Contest',
        description: 'Updated description',
        contestantNumberingMode: 'BY_CATEGORY',
      });
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, updatedContest, 'Contest updated successfully');
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};
      mockReq.body = { name: 'Updated' };

      await controller.updateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
      expect(mockContestService.updateContest).not.toHaveBeenCalled();
    });

    it('should update only provided fields', async () => {
      mockReq.params = { id: 'contest-1' };
      mockReq.body = { name: 'New Name Only' };
      mockContestService.updateContest.mockResolvedValue(mockContest as any);

      await controller.updateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.updateContest).toHaveBeenCalledWith('contest-1', {
        name: 'New Name Only',
        description: undefined,
        contestantNumberingMode: undefined,
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Not found');
      mockReq.params = { id: 'contest-1' };
      mockReq.body = { name: 'Test' };
      mockContestService.updateContest.mockRejectedValue(error);

      await controller.updateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteContest', () => {
    it('should delete contest and return 204', async () => {
      mockReq.params = { id: 'contest-1' };
      mockContestService.deleteContest.mockResolvedValue(undefined);

      await controller.deleteContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.deleteContest).toHaveBeenCalledWith('contest-1');
      expect(sendNoContent).toHaveBeenCalledWith(mockRes);
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};

      await controller.deleteContest(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
      expect(mockContestService.deleteContest).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Cannot delete contest with active categories');
      mockReq.params = { id: 'contest-1' };
      mockContestService.deleteContest.mockRejectedValue(error);

      await controller.deleteContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('archiveContest', () => {
    it('should archive contest successfully', async () => {
      mockReq.params = { id: 'contest-1' };
      const archivedContest = { ...mockContest, archived: true };
      mockContestService.archiveContest.mockResolvedValue(archivedContest as any);

      await controller.archiveContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.archiveContest).toHaveBeenCalledWith('contest-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, archivedContest, 'Contest archived successfully');
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};

      await controller.archiveContest(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
      expect(mockContestService.archiveContest).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Contest not found');
      mockReq.params = { id: 'contest-1' };
      mockContestService.archiveContest.mockRejectedValue(error);

      await controller.archiveContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('reactivateContest', () => {
    it('should reactivate contest successfully', async () => {
      mockReq.params = { id: 'contest-1' };
      const reactivatedContest = { ...mockContest, archived: false };
      mockContestService.unarchiveContest.mockResolvedValue(reactivatedContest as any);

      await controller.reactivateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.unarchiveContest).toHaveBeenCalledWith('contest-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, reactivatedContest, 'Contest reactivated successfully');
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};

      await controller.reactivateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
      expect(mockContestService.unarchiveContest).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Contest not found');
      mockReq.params = { id: 'contest-1' };
      mockContestService.unarchiveContest.mockRejectedValue(error);

      await controller.reactivateContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getArchivedContests', () => {
    it('should return archived contests for specific event', async () => {
      mockReq.query = { eventId: 'event-1' };
      const archivedContests = [{ ...mockContest, archived: true }];
      mockContestService.getContestsByEventId.mockResolvedValue(archivedContests as any);

      await controller.getArchivedContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.getContestsByEventId).toHaveBeenCalledWith('event-1', true, true);
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, archivedContests, 'Archived contests retrieved successfully');
    });

    it('should return empty array when no eventId provided', async () => {
      mockReq.query = {};

      await controller.getArchivedContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.getContestsByEventId).not.toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, [], 'Archived contests retrieved successfully');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockReq.query = { eventId: 'event-1' };
      mockContestService.getContestsByEventId.mockRejectedValue(error);

      await controller.getArchivedContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getContestStats', () => {
    it('should return contest statistics', async () => {
      mockReq.params = { id: 'contest-1' };
      mockContestService.getContestStats.mockResolvedValue(mockStats as any);

      await controller.getContestStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.getContestStats).toHaveBeenCalledWith('contest-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStats, 'Contest statistics retrieved successfully');
    });

    it('should return 400 when contest ID is missing', async () => {
      mockReq.params = {};

      await controller.getContestStats(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Contest ID is required', 400);
      expect(mockContestService.getContestStats).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Contest not found');
      mockReq.params = { id: 'contest-1' };
      mockContestService.getContestStats.mockRejectedValue(error);

      await controller.getContestStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('searchContests', () => {
    it('should search contests with query string', async () => {
      mockReq.query = { query: 'talent' };
      const searchResults = [mockContest];
      mockContestService.searchContests.mockResolvedValue(searchResults as any);

      await controller.searchContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.searchContests).toHaveBeenCalledWith('talent');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, searchResults, 'Search results retrieved successfully');
    });

    it('should return 400 when query is missing', async () => {
      mockReq.query = {};

      await controller.searchContests(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Search query is required', 400);
      expect(mockContestService.searchContests).not.toHaveBeenCalled();
    });

    it('should return 400 when query is not a string', async () => {
      mockReq.query = { query: 123 };

      await controller.searchContests(mockReq as Request, mockRes as Response, mockNext);

      expect(sendError).toHaveBeenCalledWith(mockRes, 'Search query is required', 400);
      expect(mockContestService.searchContests).not.toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      mockReq.query = { query: 'nonexistent' };
      mockContestService.searchContests.mockResolvedValue([]);

      await controller.searchContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.searchContests).toHaveBeenCalledWith('nonexistent');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, [], 'Search results retrieved successfully');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Search error');
      mockReq.query = { query: 'talent' };
      mockContestService.searchContests.mockRejectedValue(error);

      await controller.searchContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('Edge Cases', () => {
    it('should handle service returning null gracefully', async () => {
      mockReq.params = { id: 'contest-1' };
      mockContestService.getContestWithDetails.mockResolvedValue(null as any);

      await controller.getContestById(mockReq as Request, mockRes as Response, mockNext);

      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Contest retrieved successfully');
    });

    it('should handle very long contest names', async () => {
      const longName = 'A'.repeat(500);
      mockReq.params = { eventId: 'event-1' };
      mockReq.body = { name: longName };
      mockContestService.createContest.mockResolvedValue(mockContest as any);

      await controller.createContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.createContest).toHaveBeenCalledWith(
        expect.objectContaining({ name: longName })
      );
    });

    it('should handle special characters in search query', async () => {
      const specialQuery = 'test@#$%^&*()';
      mockReq.query = { query: specialQuery };
      mockContestService.searchContests.mockResolvedValue([]);

      await controller.searchContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockContestService.searchContests).toHaveBeenCalledWith(specialQuery);
    });

    it('should handle array query parameter for includeArchived', async () => {
      mockReq.params = { eventId: 'event-1' };
      mockReq.query = { includeArchived: ['true', 'false'] }; // Array instead of string
      mockContestService.getContestsByEventId.mockResolvedValue(mockContests as any);

      await controller.getContestsByEvent(mockReq as Request, mockRes as Response, mockNext);

      // Should not equal 'true' when it's an array
      expect(mockContestService.getContestsByEventId).toHaveBeenCalledWith('event-1', false, true);
    });
  });
});
