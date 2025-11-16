/**
 * EmceeController Unit Tests
 * Comprehensive test coverage for EmceeController endpoints
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { EmceeController } from '../../../src/controllers/emceeController';
import { EmceeService } from '../../../src/services/EmceeService';
import { createRequestLogger } from '../../../src/utils/logger';
import { sendSuccess } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

// Mock dependencies
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/EmceeService');

describe('EmceeController', () => {
  let controller: EmceeController;
  let mockEmceeService: jest.Mocked<EmceeService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;
  let mockLog: any;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    mockLog = {
      debug: jest.fn(),
      info: jest.fn(),
      error: jest.fn(),
    };
    (createRequestLogger as jest.Mock).mockReturnValue(mockLog);

    // Mock sendSuccess helper
    (sendSuccess as jest.Mock).mockImplementation((res, data, message) => {
      return res.json({ success: true, data, message });
    });

    // Create mock service
    mockEmceeService = {
      getStats: jest.fn(),
      getScripts: jest.fn(),
      getScript: jest.fn(),
      getContestantBios: jest.fn(),
      getJudgeBios: jest.fn(),
      getEvents: jest.fn(),
      getEvent: jest.fn(),
      getContests: jest.fn(),
      getContest: jest.fn(),
      getEmceeHistory: jest.fn(),
      uploadScript: jest.fn(),
      updateScript: jest.fn(),
      deleteScript: jest.fn(),
      getScriptFileInfo: jest.fn(),
    } as any;

    // Mock container
    (container.resolve as jest.Mock) = jest.fn(() => mockEmceeService);

    controller = new EmceeController();

    mockReq = {
      params: {},
      query: {},
      body: {},
      user: { id: 'user-1', role: 'EMCEE' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('getStats', () => {
    it('should return emcee dashboard statistics', async () => {
      const mockStats = {
        totalScripts: 15,
        totalEvents: 5,
        activeContests: 3,
        upcomingEvents: 2,
        recentActivity: [
          { id: 'activity-1', type: 'script_created', timestamp: new Date() },
        ],
      };

      mockEmceeService.getStats.mockResolvedValue(mockStats as any);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getStats).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockStats);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockEmceeService.getStats.mockRejectedValue(error);

      await controller.getStats(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get emcee stats error:', error);
    });
  });

  describe('getScripts', () => {
    it('should return all scripts without filters', async () => {
      const mockScripts = [
        { id: 'script-1', title: 'Opening Script', content: 'Welcome...' },
        { id: 'script-2', title: 'Closing Script', content: 'Thank you...' },
      ];

      mockEmceeService.getScripts.mockResolvedValue(mockScripts as any);

      await controller.getScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScripts).toHaveBeenCalledWith({
        eventId: undefined,
        contestId: undefined,
        categoryId: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockScripts);
    });

    it('should return scripts filtered by eventId', async () => {
      mockReq.query = { eventId: 'event-1' };
      const mockScripts = [
        { id: 'script-1', title: 'Event Opening', eventId: 'event-1' },
      ];

      mockEmceeService.getScripts.mockResolvedValue(mockScripts as any);

      await controller.getScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScripts).toHaveBeenCalledWith({
        eventId: 'event-1',
        contestId: undefined,
        categoryId: undefined,
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockScripts);
    });

    it('should return scripts filtered by contestId and categoryId', async () => {
      mockReq.query = { contestId: 'contest-1', categoryId: 'cat-1' };
      const mockScripts = [
        { id: 'script-3', title: 'Category Script', contestId: 'contest-1', categoryId: 'cat-1' },
      ];

      mockEmceeService.getScripts.mockResolvedValue(mockScripts as any);

      await controller.getScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScripts).toHaveBeenCalledWith({
        eventId: undefined,
        contestId: 'contest-1',
        categoryId: 'cat-1',
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockEmceeService.getScripts.mockRejectedValue(error);

      await controller.getScripts(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get scripts error:', error);
    });
  });

  describe('getScript', () => {
    it('should return script by ID', async () => {
      mockReq.params = { scriptId: 'script-1' };
      const mockScript = {
        id: 'script-1',
        title: 'Opening Remarks',
        content: 'Ladies and gentlemen...',
        filePath: '/uploads/emcee/script1.pdf',
      };

      mockEmceeService.getScript.mockResolvedValue(mockScript as any);

      await controller.getScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScript).toHaveBeenCalledWith('script-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockScript);
    });

    it('should return 400 when scriptId is missing', async () => {
      mockReq.params = {};

      await controller.getScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
      expect(mockEmceeService.getScript).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { scriptId: 'script-1' };
      const error = new Error('Script not found');
      mockEmceeService.getScript.mockRejectedValue(error);

      await controller.getScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get script error:', error);
    });
  });

  describe('getContestantBios', () => {
    it('should return contestant bios without filters', async () => {
      const mockContestants = [
        { id: 'cont-1', name: 'John Doe', bio: 'Vocalist', age: 25 },
        { id: 'cont-2', name: 'Jane Smith', bio: 'Dancer', age: 22 },
      ];

      mockEmceeService.getContestantBios.mockResolvedValue(mockContestants as any);

      await controller.getContestantBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getContestantBios).toHaveBeenCalledWith({
        eventId: undefined,
        contestId: undefined,
        categoryId: undefined,
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockContestants,
        'Contestant bios retrieved successfully'
      );
    });

    it('should return contestant bios filtered by query parameters', async () => {
      mockReq.query = { eventId: 'event-1', categoryId: 'cat-1' };
      const mockContestants = [
        { id: 'cont-3', name: 'Alice Johnson', categoryId: 'cat-1' },
      ];

      mockEmceeService.getContestantBios.mockResolvedValue(mockContestants as any);

      await controller.getContestantBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getContestantBios).toHaveBeenCalledWith({
        eventId: 'event-1',
        contestId: undefined,
        categoryId: 'cat-1',
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Fetch error');
      mockEmceeService.getContestantBios.mockRejectedValue(error);

      await controller.getContestantBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get contestant bios error:', error);
    });
  });

  describe('getJudgeBios', () => {
    it('should return judge bios without filters', async () => {
      const mockJudges = [
        { id: 'judge-1', name: 'Dr. Smith', expertise: 'Vocal', yearsExperience: 15 },
        { id: 'judge-2', name: 'Prof. Lee', expertise: 'Dance', yearsExperience: 10 },
      ];

      mockEmceeService.getJudgeBios.mockResolvedValue(mockJudges as any);

      await controller.getJudgeBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getJudgeBios).toHaveBeenCalledWith({
        eventId: undefined,
        contestId: undefined,
        categoryId: undefined,
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockJudges,
        'Judge bios retrieved successfully'
      );
    });

    it('should return judge bios filtered by all parameters', async () => {
      mockReq.query = { eventId: 'event-1', contestId: 'contest-1', categoryId: 'cat-1' };
      const mockJudges = [
        { id: 'judge-3', name: 'Ms. Brown', eventId: 'event-1', categoryId: 'cat-1' },
      ];

      mockEmceeService.getJudgeBios.mockResolvedValue(mockJudges as any);

      await controller.getJudgeBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getJudgeBios).toHaveBeenCalledWith({
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'cat-1',
      });
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockEmceeService.getJudgeBios.mockRejectedValue(error);

      await controller.getJudgeBios(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get judge bios error:', error);
    });
  });

  describe('getEvents', () => {
    it('should return all events', async () => {
      const mockEvents = [
        { id: 'event-1', name: 'Spring Competition', date: new Date('2025-05-15') },
        { id: 'event-2', name: 'Summer Showcase', date: new Date('2025-07-20') },
      ];

      mockEmceeService.getEvents.mockResolvedValue(mockEvents as any);

      await controller.getEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getEvents).toHaveBeenCalledWith();
      expect(mockRes.json).toHaveBeenCalledWith(mockEvents);
    });

    it('should handle empty event list', async () => {
      mockEmceeService.getEvents.mockResolvedValue([]);

      await controller.getEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.json).toHaveBeenCalledWith([]);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database connection error');
      mockEmceeService.getEvents.mockRejectedValue(error);

      await controller.getEvents(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get events error:', error);
    });
  });

  describe('getEvent', () => {
    it('should return event by ID', async () => {
      mockReq.params = { eventId: 'event-1' };
      const mockEvent = {
        id: 'event-1',
        name: 'Spring Competition',
        date: new Date('2025-05-15'),
        location: 'Main Auditorium',
      };

      mockEmceeService.getEvent.mockResolvedValue(mockEvent as any);

      await controller.getEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getEvent).toHaveBeenCalledWith('event-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockEvent);
    });

    it('should return 400 when eventId is missing', async () => {
      mockReq.params = {};

      await controller.getEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Event ID required' });
      expect(mockEmceeService.getEvent).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { eventId: 'event-1' };
      const error = new Error('Event not found');
      mockEmceeService.getEvent.mockRejectedValue(error);

      await controller.getEvent(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get event error:', error);
    });
  });

  describe('getContests', () => {
    it('should return contests without eventId filter', async () => {
      const mockContests = [
        { id: 'contest-1', name: 'Vocal Performance', eventId: 'event-1' },
        { id: 'contest-2', name: 'Dance Competition', eventId: 'event-2' },
      ];

      mockEmceeService.getContests.mockResolvedValue(mockContests as any);

      await controller.getContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getContests).toHaveBeenCalledWith(undefined);
      expect(mockRes.json).toHaveBeenCalledWith(mockContests);
    });

    it('should return contests filtered by eventId', async () => {
      mockReq.query = { eventId: 'event-1' };
      const mockContests = [
        { id: 'contest-1', name: 'Vocal Performance', eventId: 'event-1' },
      ];

      mockEmceeService.getContests.mockResolvedValue(mockContests as any);

      await controller.getContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getContests).toHaveBeenCalledWith('event-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockContests);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Query failed');
      mockEmceeService.getContests.mockRejectedValue(error);

      await controller.getContests(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get contests error:', error);
    });
  });

  describe('getContest', () => {
    it('should return contest by ID', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const mockContest = {
        id: 'contest-1',
        name: 'Vocal Performance',
        eventId: 'event-1',
        categories: [],
      };

      mockEmceeService.getContest.mockResolvedValue(mockContest as any);

      await controller.getContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getContest).toHaveBeenCalledWith('contest-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockContest);
    });

    it('should return 400 when contestId is missing', async () => {
      mockReq.params = {};

      await controller.getContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Contest ID required' });
      expect(mockEmceeService.getContest).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { contestId: 'contest-1' };
      const error = new Error('Contest not found');
      mockEmceeService.getContest.mockRejectedValue(error);

      await controller.getContest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get contest error:', error);
    });
  });

  describe('getEmceeHistory', () => {
    it('should return paginated history with default pagination', async () => {
      const mockHistory = {
        data: [
          { id: 'hist-1', action: 'script_created', timestamp: new Date() },
          { id: 'hist-2', action: 'event_accessed', timestamp: new Date() },
        ],
        page: 1,
        limit: 10,
        total: 2,
        hasMore: false,
      };

      mockEmceeService.getEmceeHistory.mockResolvedValue(mockHistory as any);

      await controller.getEmceeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getEmceeHistory).toHaveBeenCalledWith(1, 10);
      expect(mockRes.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should return paginated history with custom pagination', async () => {
      mockReq.query = { page: '3', limit: '20' };
      const mockHistory = {
        data: [],
        page: 3,
        limit: 20,
        total: 45,
        hasMore: true,
      };

      mockEmceeService.getEmceeHistory.mockResolvedValue(mockHistory as any);

      await controller.getEmceeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getEmceeHistory).toHaveBeenCalledWith(3, 20);
      expect(mockRes.json).toHaveBeenCalledWith(mockHistory);
    });

    it('should handle invalid pagination parameters', async () => {
      mockReq.query = { page: 'invalid', limit: 'bad' };
      const mockHistory = {
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        hasMore: false,
      };

      mockEmceeService.getEmceeHistory.mockResolvedValue(mockHistory as any);

      await controller.getEmceeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getEmceeHistory).toHaveBeenCalledWith(1, 10);
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Database error');
      mockEmceeService.getEmceeHistory.mockRejectedValue(error);

      await controller.getEmceeHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get emcee history error:', error);
    });
  });

  describe('uploadScript', () => {
    it('should upload script successfully without file', async () => {
      mockReq.body = {
        title: 'Opening Remarks',
        content: 'Welcome to the competition',
        eventId: 'event-1',
        order: '1',
      };

      const mockScript = {
        id: 'script-new',
        title: 'Opening Remarks',
        content: 'Welcome to the competition',
        filePath: null,
        eventId: 'event-1',
        order: 1,
      };

      mockEmceeService.uploadScript.mockResolvedValue(mockScript as any);

      await controller.uploadScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.uploadScript).toHaveBeenCalledWith({
        title: 'Opening Remarks',
        content: 'Welcome to the competition',
        filePath: null,
        eventId: 'event-1',
        contestId: undefined,
        categoryId: undefined,
        order: 1,
      });
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith(mockScript);
    });

    it('should upload script with file attachment', async () => {
      mockReq.body = {
        title: 'Closing Script',
        content: 'Thank you for attending',
        contestId: 'contest-1',
        categoryId: 'cat-1',
        order: '2',
      };
      mockReq.file = {
        filename: 'closing-script-123.pdf',
      } as any;

      const mockScript = {
        id: 'script-new-2',
        title: 'Closing Script',
        filePath: '/uploads/emcee/closing-script-123.pdf',
        contestId: 'contest-1',
        categoryId: 'cat-1',
        order: 2,
      };

      mockEmceeService.uploadScript.mockResolvedValue(mockScript as any);

      await controller.uploadScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.uploadScript).toHaveBeenCalledWith(
        expect.objectContaining({
          filePath: '/uploads/emcee/closing-script-123.pdf',
          order: 2,
        })
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should handle default order value', async () => {
      mockReq.body = {
        title: 'Script Without Order',
        content: 'Content',
      };

      const mockScript = {
        id: 'script-3',
        title: 'Script Without Order',
        order: 0,
      };

      mockEmceeService.uploadScript.mockResolvedValue(mockScript as any);

      await controller.uploadScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.uploadScript).toHaveBeenCalledWith(
        expect.objectContaining({
          order: 0,
        })
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { title: 'Test', content: 'Content' };
      const error = new Error('Upload failed');
      mockEmceeService.uploadScript.mockRejectedValue(error);

      await controller.uploadScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Upload script error:', error);
    });
  });

  describe('updateScript', () => {
    it('should update script successfully', async () => {
      mockReq.params = { id: 'script-1' };
      mockReq.body = {
        title: 'Updated Title',
        content: 'Updated content',
        eventId: 'event-2',
        order: '5',
      };

      const mockUpdatedScript = {
        id: 'script-1',
        title: 'Updated Title',
        content: 'Updated content',
        eventId: 'event-2',
        order: 5,
      };

      mockEmceeService.updateScript.mockResolvedValue(mockUpdatedScript as any);

      await controller.updateScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.updateScript).toHaveBeenCalledWith('script-1', {
        title: 'Updated Title',
        content: 'Updated content',
        eventId: 'event-2',
        contestId: undefined,
        categoryId: undefined,
        order: 5,
      });
      expect(mockRes.json).toHaveBeenCalledWith(mockUpdatedScript);
    });

    it('should return 400 when script ID is missing', async () => {
      mockReq.params = {};
      mockReq.body = { title: 'Test' };

      await controller.updateScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
      expect(mockEmceeService.updateScript).not.toHaveBeenCalled();
    });

    it('should handle partial updates', async () => {
      mockReq.params = { id: 'script-1' };
      mockReq.body = { title: 'New Title Only' };

      const mockUpdatedScript = {
        id: 'script-1',
        title: 'New Title Only',
        order: 0,
      };

      mockEmceeService.updateScript.mockResolvedValue(mockUpdatedScript as any);

      await controller.updateScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.updateScript).toHaveBeenCalledWith('script-1', {
        title: 'New Title Only',
        content: undefined,
        eventId: undefined,
        contestId: undefined,
        categoryId: undefined,
        order: 0,
      });
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'script-1' };
      mockReq.body = { title: 'Test' };
      const error = new Error('Update failed');
      mockEmceeService.updateScript.mockRejectedValue(error);

      await controller.updateScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Update script error:', error);
    });
  });

  describe('deleteScript', () => {
    it('should delete script successfully', async () => {
      mockReq.params = { id: 'script-1' };
      mockEmceeService.deleteScript.mockResolvedValue(undefined);

      await controller.deleteScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.deleteScript).toHaveBeenCalledWith('script-1');
      expect(mockRes.status).toHaveBeenCalledWith(204);
      expect(mockRes.send).toHaveBeenCalled();
    });

    it('should return 400 when script ID is missing', async () => {
      mockReq.params = {};

      await controller.deleteScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
      expect(mockEmceeService.deleteScript).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'script-1' };
      const error = new Error('Delete failed');
      mockEmceeService.deleteScript.mockRejectedValue(error);

      await controller.deleteScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Delete script error:', error);
    });
  });

  describe('toggleScript', () => {
    it('should return script by ID (legacy endpoint)', async () => {
      mockReq.params = { id: 'script-1' };
      const mockScript = {
        id: 'script-1',
        title: 'Legacy Script',
        content: 'Content',
      };

      mockEmceeService.getScript.mockResolvedValue(mockScript as any);

      await controller.toggleScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScript).toHaveBeenCalledWith('script-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockScript);
    });

    it('should return 400 when script ID is missing', async () => {
      mockReq.params = {};

      await controller.toggleScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
      expect(mockEmceeService.getScript).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'script-1' };
      const error = new Error('Script not found');
      mockEmceeService.getScript.mockRejectedValue(error);

      await controller.toggleScript(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Toggle script error:', error);
    });
  });

  describe('serveScriptFile', () => {
    it('should stream script file successfully', async () => {
      mockReq.params = { scriptId: 'script-1' };
      const mockScript = {
        id: 'script-1',
        filePath: '/uploads/emcee/script.pdf',
      };

      mockEmceeService.getScriptFileInfo.mockResolvedValue(mockScript as any);

      // Mock fs and path
      const mockFileStream = {
        pipe: jest.fn(),
      };
      const fs = require('fs');
      const path = require('path');

      jest.spyOn(fs, 'createReadStream').mockReturnValue(mockFileStream);
      jest.spyOn(path, 'join').mockReturnValue('/var/www/event-manager/uploads/emcee/script.pdf');

      await controller.serveScriptFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScriptFileInfo).toHaveBeenCalledWith('script-1');
      expect(mockFileStream.pipe).toHaveBeenCalledWith(mockRes);
    });

    it('should return 404 when script has no file', async () => {
      mockReq.params = { scriptId: 'script-2' };
      const mockScript = {
        id: 'script-2',
        filePath: null,
      };

      mockEmceeService.getScriptFileInfo.mockResolvedValue(mockScript as any);

      await controller.serveScriptFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script file not found' });
    });

    it('should return 400 when scriptId is missing', async () => {
      mockReq.params = {};

      await controller.serveScriptFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
      expect(mockEmceeService.getScriptFileInfo).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { scriptId: 'script-1' };
      const error = new Error('File read error');
      mockEmceeService.getScriptFileInfo.mockRejectedValue(error);

      await controller.serveScriptFile(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Serve script file error:', error);
    });
  });

  describe('getFileViewUrl', () => {
    it('should return file view URL successfully', async () => {
      mockReq.params = { scriptId: 'script-1' };
      const mockScript = {
        id: 'script-1',
        filePath: '/uploads/emcee/script.pdf',
      };

      mockEmceeService.getScriptFileInfo.mockResolvedValue(mockScript as any);

      await controller.getFileViewUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockEmceeService.getScriptFileInfo).toHaveBeenCalledWith('script-1');
      expect(mockRes.json).toHaveBeenCalledWith({
        viewUrl: '/api/emcee/scripts/script-1/view',
        expiresIn: 300,
      });
    });

    it('should return 400 when scriptId is missing', async () => {
      mockReq.params = {};

      await controller.getFileViewUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({ error: 'Script ID required' });
      expect(mockEmceeService.getScriptFileInfo).not.toHaveBeenCalled();
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { scriptId: 'script-1' };
      const error = new Error('Script not found');
      mockEmceeService.getScriptFileInfo.mockRejectedValue(error);

      await controller.getFileViewUrl(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockLog.error).toHaveBeenCalledWith('Get file view URL error:', error);
    });
  });
});
