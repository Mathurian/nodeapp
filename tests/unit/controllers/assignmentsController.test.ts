/**
 * AssignmentsController Unit Tests
 * Comprehensive test coverage for AssignmentsController endpoints
 * Tests judge and contestant assignment operations
 */

import { Request, Response, NextFunction } from 'express';
import { AssignmentsController } from '../../../src/controllers/assignmentsController';
import { AssignmentService } from '../../../src/services/AssignmentService';
import { container } from 'tsyringe';
import { createRequestLogger } from '../../../src/utils/logger';
import { sendSuccess, successResponse, sendError } from '../../../src/utils/responseHelpers';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { UserRole } from '@prisma/client';

// Mock dependencies
jest.mock('../../../src/services/AssignmentService');
jest.mock('../../../src/utils/logger');
jest.mock('../../../src/utils/responseHelpers');

describe('AssignmentsController', () => {
  let controller: AssignmentsController;
  let mockAssignmentService: jest.Mocked<AssignmentService>;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  const mockAssignment = {
    id: 'assign-1',
    judgeId: 'judge-1',
    categoryId: 'cat-1',
    contestId: 'contest-1',
    eventId: 'event-1',
    status: 'ACTIVE',
    assignedBy: 'admin-1',
    createdAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock logger
    (createRequestLogger as jest.Mock).mockReturnValue({
      debug: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    });

    // Mock response helpers
    (sendSuccess as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });
    (successResponse as jest.Mock).mockImplementation((res, data, message, status = 200) => {
      return res.status(status).json({ success: true, data, message });
    });
    (sendError as jest.Mock).mockImplementation((res, message, status = 400) => {
      return res.status(status).json({ success: false, error: message });
    });

    mockAssignmentService = {
      getAllAssignments: jest.fn(),
      createAssignment: jest.fn(),
      getAssignmentById: jest.fn(),
      updateAssignment: jest.fn(),
      deleteAssignment: jest.fn(),
      getAssignmentsForJudge: jest.fn(),
      getAssignmentsForCategory: jest.fn(),
      bulkAssignJudges: jest.fn(),
      removeAllAssignmentsForCategory: jest.fn(),
      getJudges: jest.fn(),
      getCategories: jest.fn(),
      getContestants: jest.fn(),
      assignContestantToCategory: jest.fn(),
      removeContestantFromCategory: jest.fn(),
      getCategoryContestants: jest.fn(),
      getAllContestantAssignments: jest.fn(),
    } as any;

    mockPrisma = mockDeep<PrismaClient>();

    (container.resolve as jest.Mock) = jest.fn((token) => {
      if (token === 'PrismaClient') return mockPrisma;
      if (token === AssignmentService) return mockAssignmentService;
      return mockAssignmentService;
    });

    controller = new AssignmentsController();

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

  describe('getAllAssignments', () => {
    it('should return all assignments', async () => {
      mockReq.query = {};
      const mockAssignments = [mockAssignment];
      mockAssignmentService.getAllAssignments.mockResolvedValue(mockAssignments as any);

      await controller.getAllAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAllAssignments).toHaveBeenCalledWith({
        status: undefined,
        judgeId: undefined,
        categoryId: undefined,
        contestId: undefined,
        eventId: undefined,
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockAssignments,
        'Assignments retrieved successfully'
      );
    });

    it('should filter assignments by judgeId', async () => {
      mockReq.query = { judgeId: 'judge-1' };
      mockAssignmentService.getAllAssignments.mockResolvedValue([mockAssignment] as any);

      await controller.getAllAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAllAssignments).toHaveBeenCalledWith(
        expect.objectContaining({
          judgeId: 'judge-1',
        })
      );
    });

    it('should filter assignments by categoryId and status', async () => {
      mockReq.query = { categoryId: 'cat-1', status: 'ACTIVE' };
      mockAssignmentService.getAllAssignments.mockResolvedValue([mockAssignment] as any);

      await controller.getAllAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAllAssignments).toHaveBeenCalledWith(
        expect.objectContaining({
          categoryId: 'cat-1',
          status: 'ACTIVE',
        })
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.query = {};
      const error = new Error('Service error');
      mockAssignmentService.getAllAssignments.mockRejectedValue(error);

      await controller.getAllAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('createAssignment', () => {
    it('should create an assignment', async () => {
      mockReq.body = {
        judgeId: 'judge-1',
        categoryId: 'cat-1',
      };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockAssignmentService.createAssignment.mockResolvedValue(mockAssignment as any);

      await controller.createAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.createAssignment).toHaveBeenCalledWith(
        mockReq.body,
        'admin-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        mockAssignment,
        'Assignment created successfully',
        201
      );
    });

    it('should handle missing user gracefully', async () => {
      mockReq.body = { judgeId: 'judge-1', categoryId: 'cat-1' };
      mockReq.user = undefined;
      mockAssignmentService.createAssignment.mockResolvedValue(mockAssignment as any);

      await controller.createAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.createAssignment).toHaveBeenCalledWith(
        mockReq.body,
        ''
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = {};
      const error = new Error('Service error');
      mockAssignmentService.createAssignment.mockRejectedValue(error);

      await controller.createAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAssignmentById', () => {
    it('should return assignment by id', async () => {
      mockReq.params = { id: 'assign-1' };
      mockAssignmentService.getAssignmentById.mockResolvedValue(mockAssignment as any);

      await controller.getAssignmentById(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAssignmentById).toHaveBeenCalledWith('assign-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockAssignment);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'assign-1' };
      const error = new Error('Not found');
      mockAssignmentService.getAssignmentById.mockRejectedValue(error);

      await controller.getAssignmentById(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('updateAssignment', () => {
    it('should update assignment', async () => {
      mockReq.params = { id: 'assign-1' };
      mockReq.body = { status: 'INACTIVE' };
      mockAssignmentService.updateAssignment.mockResolvedValue({
        ...mockAssignment,
        status: 'INACTIVE',
      } as any);

      await controller.updateAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.updateAssignment).toHaveBeenCalledWith(
        'assign-1',
        mockReq.body
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        expect.any(Object),
        'Assignment updated successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'assign-1' };
      mockReq.body = {};
      const error = new Error('Service error');
      mockAssignmentService.updateAssignment.mockRejectedValue(error);

      await controller.updateAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteAssignment', () => {
    it('should delete assignment', async () => {
      mockReq.params = { id: 'assign-1' };
      mockAssignmentService.deleteAssignment.mockResolvedValue(undefined);

      await controller.deleteAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.deleteAssignment).toHaveBeenCalledWith('assign-1');
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        null,
        'Assignment deleted successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'assign-1' };
      const error = new Error('Service error');
      mockAssignmentService.deleteAssignment.mockRejectedValue(error);

      await controller.deleteAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAssignmentsForJudge', () => {
    it('should return assignments for a judge', async () => {
      mockReq.params = { judgeId: 'judge-1' };
      const mockAssignments = [mockAssignment];
      mockAssignmentService.getAssignmentsForJudge.mockResolvedValue(
        mockAssignments as any
      );

      await controller.getAssignmentsForJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAssignmentsForJudge).toHaveBeenCalledWith('judge-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockAssignments);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { judgeId: 'judge-1' };
      const error = new Error('Service error');
      mockAssignmentService.getAssignmentsForJudge.mockRejectedValue(error);

      await controller.getAssignmentsForJudge(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getAssignmentsForCategory', () => {
    it('should return assignments for a category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockAssignments = [mockAssignment];
      mockAssignmentService.getAssignmentsForCategory.mockResolvedValue(
        mockAssignments as any
      );

      await controller.getAssignmentsForCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAssignmentsForCategory).toHaveBeenCalledWith('cat-1');
      expect(mockRes.json).toHaveBeenCalledWith(mockAssignments);
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const error = new Error('Service error');
      mockAssignmentService.getAssignmentsForCategory.mockRejectedValue(error);

      await controller.getAssignmentsForCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('bulkAssignJudges', () => {
    it('should bulk assign judges to category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { judgeIds: ['judge-1', 'judge-2', 'judge-3'] };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockAssignmentService.bulkAssignJudges.mockResolvedValue(3);

      await controller.bulkAssignJudges(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.bulkAssignJudges).toHaveBeenCalledWith(
        'cat-1',
        ['judge-1', 'judge-2', 'judge-3'],
        'admin-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { assignedCount: 3 },
        '3 judge(s) assigned successfully'
      );
    });

    it('should handle empty judgeIds array', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { judgeIds: [] };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockAssignmentService.bulkAssignJudges.mockResolvedValue(0);

      await controller.bulkAssignJudges(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.bulkAssignJudges).toHaveBeenCalledWith('cat-1', [], 'admin-1');
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { assignedCount: 0 },
        '0 judge(s) assigned successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockReq.body = { judgeIds: ['judge-1'] };
      const error = new Error('Service error');
      mockAssignmentService.bulkAssignJudges.mockRejectedValue(error);

      await controller.bulkAssignJudges(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('removeAllAssignmentsForCategory', () => {
    it('should remove all assignments for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockAssignmentService.removeAllAssignmentsForCategory.mockResolvedValue(5);

      await controller.removeAllAssignmentsForCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.removeAllAssignmentsForCategory).toHaveBeenCalledWith(
        'cat-1'
      );
      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { removedCount: 5 },
        '5 assignment(s) removed successfully'
      );
    });

    it('should handle zero removals', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      mockAssignmentService.removeAllAssignmentsForCategory.mockResolvedValue(0);

      await controller.removeAllAssignmentsForCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(successResponse).toHaveBeenCalledWith(
        mockRes,
        { removedCount: 0 },
        '0 assignment(s) removed successfully'
      );
    });
  });

  describe('getJudges', () => {
    it('should return all judges', async () => {
      const mockJudges = [
        { id: 'judge-1', name: 'Judge 1' },
        { id: 'judge-2', name: 'Judge 2' },
      ];
      mockAssignmentService.getJudges.mockResolvedValue(mockJudges as any);

      await controller.getJudges(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAssignmentService.getJudges).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockJudges,
        'Judges retrieved successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Service error');
      mockAssignmentService.getJudges.mockRejectedValue(error);

      await controller.getJudges(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const mockCategories = [
        { id: 'cat-1', name: 'Category 1' },
        { id: 'cat-2', name: 'Category 2' },
      ];
      mockAssignmentService.getCategories.mockResolvedValue(mockCategories as any);

      await controller.getCategories(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAssignmentService.getCategories).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockCategories,
        'Categories retrieved successfully'
      );
    });
  });

  describe('getContestants', () => {
    it('should return all contestants', async () => {
      const mockContestants = [
        { id: 'cont-1', name: 'Contestant 1' },
        { id: 'cont-2', name: 'Contestant 2' },
      ];
      mockAssignmentService.getContestants.mockResolvedValue(mockContestants as any);

      await controller.getContestants(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAssignmentService.getContestants).toHaveBeenCalled();
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockContestants,
        'Contestants retrieved successfully'
      );
    });
  });

  describe('assignContestantToCategory', () => {
    it('should assign contestant to a specific category', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };
      const mockContestantAssignment = {
        id: 'assign-1',
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };
      mockAssignmentService.assignContestantToCategory.mockResolvedValue(
        mockContestantAssignment as any
      );

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.assignContestantToCategory).toHaveBeenCalledWith(
        'cat-1',
        'cont-1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockContestantAssignment,
        'Contestant assigned to category successfully',
        201
      );
    });

    it('should assign contestant to all categories in a contest', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        contestantId: 'cont-1',
      };
      const mockCategories = [
        { id: 'cat-1', name: 'Category 1', contest: { id: 'contest-1' } },
        { id: 'cat-2', name: 'Category 2', contest: { id: 'contest-1' } },
      ];
      mockAssignmentService.getCategories.mockResolvedValue(mockCategories as any);
      mockAssignmentService.assignContestantToCategory.mockResolvedValue({
        id: 'assign-1',
      } as any);

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.assignContestantToCategory).toHaveBeenCalledTimes(2);
      expect(mockAssignmentService.assignContestantToCategory).toHaveBeenCalledWith(
        'cat-1',
        'cont-1'
      );
      expect(mockAssignmentService.assignContestantToCategory).toHaveBeenCalledWith(
        'cat-2',
        'cont-1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          assignments: expect.any(Array),
        }),
        expect.stringContaining('2 categories'),
        201
      );
    });

    it('should return 400 when contestantId is missing', async () => {
      mockReq.body = { categoryId: 'cat-1' };

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendError).toHaveBeenCalledWith(mockRes, 'contestantId is required', 400);
      expect(mockAssignmentService.assignContestantToCategory).not.toHaveBeenCalled();
    });

    it('should return 400 when neither categoryId nor contestId is provided', async () => {
      mockReq.body = { contestantId: 'cont-1' };

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'Either categoryId or contestId is required',
        400
      );
    });

    it('should return 400 when no categories found for contest', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        contestantId: 'cont-1',
      };
      mockAssignmentService.getCategories.mockResolvedValue([] as any);

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendError).toHaveBeenCalledWith(
        mockRes,
        'No categories found for the specified contest',
        400
      );
    });

    it('should handle partial success when assigning to multiple categories', async () => {
      mockReq.body = {
        contestId: 'contest-1',
        contestantId: 'cont-1',
      };
      const mockCategories = [
        { id: 'cat-1', name: 'Category 1', contest: { id: 'contest-1' } },
        { id: 'cat-2', name: 'Category 2', contest: { id: 'contest-1' } },
      ];
      mockAssignmentService.getCategories.mockResolvedValue(mockCategories as any);
      mockAssignmentService.assignContestantToCategory
        .mockResolvedValueOnce({ id: 'assign-1' } as any)
        .mockRejectedValueOnce(new Error('Failed to assign'));

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        expect.objectContaining({
          assignments: expect.arrayContaining([{ id: 'assign-1' }]),
          errors: expect.arrayContaining([
            expect.objectContaining({ categoryId: 'cat-2' }),
          ]),
        }),
        expect.stringContaining('1 categories'),
        201
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };
      const error = new Error('Service error');
      mockAssignmentService.assignContestantToCategory.mockRejectedValue(error);

      await controller.assignContestantToCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('removeContestantFromCategory', () => {
    it('should remove contestant from category', async () => {
      mockReq.params = {
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };
      mockAssignmentService.removeContestantFromCategory.mockResolvedValue(undefined);

      await controller.removeContestantFromCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.removeContestantFromCategory).toHaveBeenCalledWith(
        'cat-1',
        'cont-1'
      );
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        null,
        'Contestant removed from category successfully'
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { categoryId: 'cat-1', contestantId: 'cont-1' };
      const error = new Error('Service error');
      mockAssignmentService.removeContestantFromCategory.mockRejectedValue(error);

      await controller.removeContestantFromCategory(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getCategoryContestants', () => {
    it('should return contestants for category', async () => {
      mockReq.params = { categoryId: 'cat-1' };
      const mockContestants = [
        { id: 'cont-1', name: 'Contestant 1' },
        { id: 'cont-2', name: 'Contestant 2' },
      ];
      mockAssignmentService.getCategoryContestants.mockResolvedValue(
        mockContestants as any
      );

      await controller.getCategoryContestants(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getCategoryContestants).toHaveBeenCalledWith('cat-1');
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockContestants,
        'Category contestants retrieved successfully'
      );
    });
  });

  describe('getAllContestantAssignments', () => {
    it('should return all contestant assignments', async () => {
      mockReq.query = {};
      const mockAssignments = [
        { id: 'assign-1', contestantId: 'cont-1', categoryId: 'cat-1' },
      ];
      mockAssignmentService.getAllContestantAssignments.mockResolvedValue(
        mockAssignments as any
      );

      await controller.getAllContestantAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAllContestantAssignments).toHaveBeenCalledWith({
        categoryId: undefined,
        contestId: undefined,
      });
      expect(sendSuccess).toHaveBeenCalledWith(
        mockRes,
        mockAssignments,
        'Contestant assignments retrieved successfully'
      );
    });

    it('should filter contestant assignments by categoryId', async () => {
      mockReq.query = { categoryId: 'cat-1' };
      mockAssignmentService.getAllContestantAssignments.mockResolvedValue([] as any);

      await controller.getAllContestantAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAllContestantAssignments).toHaveBeenCalledWith({
        categoryId: 'cat-1',
        contestId: undefined,
      });
    });
  });

  describe('Alias Methods', () => {
    it('getJudgeAssignments should delegate to getAssignmentsForJudge', async () => {
      mockReq.params = { judgeId: 'judge-1' };
      mockAssignmentService.getAssignmentsForJudge.mockResolvedValue([mockAssignment] as any);

      await controller.getJudgeAssignments(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.getAssignmentsForJudge).toHaveBeenCalledWith('judge-1');
    });

    it('assignJudge should delegate to createAssignment', async () => {
      mockReq.body = { judgeId: 'judge-1', categoryId: 'cat-1' };
      mockReq.user = { id: 'admin-1', role: UserRole.ADMIN };
      mockAssignmentService.createAssignment.mockResolvedValue(mockAssignment as any);

      await controller.assignJudge(mockReq as Request, mockRes as Response, mockNext);

      expect(mockAssignmentService.createAssignment).toHaveBeenCalled();
    });

    it('removeAssignment should delegate to deleteAssignment', async () => {
      mockReq.params = { id: 'assign-1' };
      mockAssignmentService.deleteAssignment.mockResolvedValue(undefined);

      await controller.removeAssignment(
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockAssignmentService.deleteAssignment).toHaveBeenCalledWith('assign-1');
    });
  });
});
