/**
 * Assignment Validation Middleware - Comprehensive Unit Tests
 * Tests all validation functions with proper mocking
 */

import { Request, Response, NextFunction } from 'express';
import {
  validateAssignmentCreation,
  validateAssignmentUpdate,
  validateAssignmentDeletion,
  validateBulkAssignmentOperation,
  validateAssignmentQuery,
} from '../../../src/middleware/assignmentValidation';

// Mock Prisma
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
  },
  category: {
    findUnique: jest.fn(),
  },
  contest: {
    findUnique: jest.fn(),
  },
  event: {
    findUnique: jest.fn(),
  },
  assignment: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
  },
  score: {
    count: jest.fn(),
  },
  categoryContestant: {
    count: jest.fn(),
  },
};

// Mock the prisma module
jest.mock('../../../src/utils/prisma', () => mockPrisma);

describe('Assignment Validation Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: {
        id: 'user-123',
        role: 'ADMIN',
      } as any,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    } as any;

    next = jest.fn();

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('validateAssignmentCreation', () => {
    it('should validate successful assignment creation with category', async () => {
      const judgeUser = {
        id: 'judge-123',
        email: 'judge@test.com',
        role: 'JUDGE',
        judge: { id: 'judge-123' },
      };

      const category = {
        id: 'category-123',
        contestId: 'contest-123',
        contest: {
          id: 'contest-123',
          eventId: 'event-123',
          event: {
            id: 'event-123',
            startDate: new Date('2024-06-01'),
            endDate: new Date('2024-06-03'),
            name: 'Test Event',
          },
        },
      };

      req.body = {
        judgeId: 'judge-123',
        categoryId: 'category-123',
        eventId: 'event-123',
        contestId: 'contest-123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(judgeUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.assignment.findFirst.mockResolvedValue(null); // No existing assignment
      mockPrisma.assignment.findMany.mockResolvedValue([]); // No overlapping assignments
      mockPrisma.assignment.count.mockResolvedValue(2); // Current assignments < max (5)

      await validateAssignmentCreation(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.validationData).toBeDefined();
      expect(req.validationData?.judge).toEqual(judgeUser);
      expect(req.validationData?.category).toEqual(category);
    });

    it('should reject if judge not found', async () => {
      req.body = {
        judgeId: 'nonexistent-judge',
        categoryId: 'category-123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(null);

      await validateAssignmentCreation(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Judge not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject if user is not a JUDGE', async () => {
      const nonJudgeUser = {
        id: 'user-123',
        role: 'CONTESTANT',
        judge: null,
      };

      req.body = {
        judgeId: 'user-123',
        categoryId: 'category-123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(nonJudgeUser);

      await validateAssignmentCreation(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'User must have JUDGE role to be assigned',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject if category not found', async () => {
      const judgeUser = {
        id: 'judge-123',
        role: 'JUDGE',
        judge: { id: 'judge-123' },
      };

      req.body = {
        judgeId: 'judge-123',
        categoryId: 'nonexistent-category',
      };

      mockPrisma.user.findUnique.mockResolvedValue(judgeUser);
      mockPrisma.category.findUnique.mockResolvedValue(null);

      await validateAssignmentCreation(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: 'Category not found' });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject if assignment already exists', async () => {
      const judgeUser = {
        id: 'judge-123',
        role: 'JUDGE',
        judge: { id: 'judge-123' },
      };

      const category = {
        id: 'category-123',
        contestId: 'contest-123',
        contest: {
          id: 'contest-123',
          event: {
            startDate: new Date(),
            endDate: new Date(),
          },
        },
      };

      req.body = {
        judgeId: 'judge-123',
        categoryId: 'category-123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(judgeUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.assignment.findFirst.mockResolvedValue({ id: 'existing-assignment' });

      await validateAssignmentCreation(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Judge is already assigned to this contest/category',
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject if category is at maximum capacity', async () => {
      const judgeUser = {
        id: 'judge-123',
        role: 'JUDGE',
        judge: { id: 'judge-123' },
      };

      const category = {
        id: 'category-123',
        contestId: 'contest-123',
        contest: {
          id: 'contest-123',
          event: {
            startDate: new Date(),
            endDate: new Date(),
            name: 'Test Event',
          },
        },
      };

      req.body = {
        judgeId: 'judge-123',
        categoryId: 'category-123',
      };

      mockPrisma.user.findUnique.mockResolvedValue(judgeUser);
      mockPrisma.category.findUnique.mockResolvedValue(category);
      mockPrisma.assignment.findFirst.mockResolvedValue(null);
      mockPrisma.assignment.findMany.mockResolvedValue([]); // No overlapping
      mockPrisma.assignment.count
        .mockResolvedValueOnce(5) // Category capacity check: already at max (5)
        .mockResolvedValueOnce(2); // Judge workload check: under max

      await validateAssignmentCreation(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Category has reached maximum judge capacity (5)',
        currentAssignments: 5,
        maxCapacity: 5,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateAssignmentUpdate', () => {
    it('should validate successful status update', async () => {
      const assignment = {
        id: 'assignment-123',
        judgeId: 'judge-123',
        categoryId: 'category-123',
        status: 'PENDING',
        judge: {
          id: 'judge-123',
          user: {
            id: 'user-123',
            role: 'JUDGE',
          },
        },
        category: {
          contest: {
            event: {},
          },
        },
      };

      req.params = { id: 'assignment-123' };
      req.body = { status: 'ACTIVE' };
      req.user = { id: 'user-123', role: 'ADMIN' } as any;

      mockPrisma.assignment.findUnique.mockResolvedValue(assignment);

      await validateAssignmentUpdate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.validationData).toBeDefined();
    });

    it('should reject invalid status transitions', async () => {
      const assignment = {
        id: 'assignment-123',
        status: 'COMPLETED',
        judge: { user: {} },
        category: { contest: { event: {} } },
      };

      req.params = { id: 'assignment-123' };
      req.body = { status: 'ACTIVE' }; // Can't go from COMPLETED to ACTIVE
      req.user = { id: 'admin-123', role: 'ADMIN' } as any;

      mockPrisma.assignment.findUnique.mockResolvedValue(assignment);

      await validateAssignmentUpdate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Invalid status transition'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject if judge tries to modify another judge\'s assignment', async () => {
      const assignment = {
        id: 'assignment-123',
        judgeId: 'other-judge',
        status: 'PENDING',
        judge: { user: { id: 'other-user' } },
        category: { contest: { event: {} } },
      };

      req.params = { id: 'assignment-123' };
      req.body = { status: 'ACTIVE' };
      req.user = { id: 'current-user', role: 'JUDGE' } as any;

      mockPrisma.assignment.findUnique.mockResolvedValue(assignment);

      await validateAssignmentUpdate(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Judges can only modify their own assignments',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateAssignmentDeletion', () => {
    it('should validate successful deletion for pending assignment', async () => {
      const assignment = {
        id: 'assignment-123',
        status: 'PENDING',
        judgeId: 'judge-123',
        categoryId: 'category-123',
        judge: {
          id: 'judge-123',
          role: 'JUDGE',
        },
        category: {
          contest: { event: {} },
        },
      };

      req.params = { id: 'assignment-123' };
      req.user = { id: 'admin-123', role: 'ADMIN' } as any;

      mockPrisma.assignment.findUnique.mockResolvedValue(assignment);
      mockPrisma.score.count.mockResolvedValue(0);

      await validateAssignmentDeletion(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject deletion of active assignment', async () => {
      const assignment = {
        id: 'assignment-123',
        status: 'ACTIVE',
        judge: {},
        category: { contest: { event: {} } },
      };

      req.params = { id: 'assignment-123' };
      req.user = { id: 'admin-123', role: 'ADMIN' } as any;

      mockPrisma.assignment.findUnique.mockResolvedValue(assignment);

      await validateAssignmentDeletion(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.stringContaining('Cannot delete assignment with status ACTIVE'),
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject deletion if scores exist', async () => {
      const assignment = {
        id: 'assignment-123',
        status: 'PENDING',
        judgeId: 'judge-123',
        categoryId: 'category-123',
        judge: {},
        category: { contest: { event: {} } },
      };

      req.params = { id: 'assignment-123' };
      req.user = { id: 'admin-123', role: 'ADMIN' } as any;

      mockPrisma.assignment.findUnique.mockResolvedValue(assignment);
      mockPrisma.score.count.mockResolvedValue(5); // Scores exist

      await validateAssignmentDeletion(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Cannot delete assignment: scores have been submitted',
        dependentScores: 5,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateBulkAssignmentOperation', () => {
    it('should validate bulk status update', async () => {
      const assignments = [
        {
          id: 'assignment-1',
          status: 'PENDING',
          judge: { user: {} },
          category: { contest: { event: {} } },
        },
        {
          id: 'assignment-2',
          status: 'PENDING',
          judge: { user: {} },
          category: { contest: { event: {} } },
        },
      ];

      req.body = {
        operation: 'updateStatus',
        assignmentIds: ['assignment-1', 'assignment-2'],
        data: { status: 'ACTIVE' },
      };

      mockPrisma.assignment.findMany.mockResolvedValue(assignments);

      await validateBulkAssignmentOperation(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
      expect(req.validationData?.assignments).toEqual(assignments);
    });

    it('should reject if assignments not found', async () => {
      req.body = {
        operation: 'updateStatus',
        assignmentIds: ['assignment-1', 'assignment-2'],
        data: { status: 'ACTIVE' },
      };

      mockPrisma.assignment.findMany.mockResolvedValue([{ id: 'assignment-1' }]); // Only 1 found

      await validateBulkAssignmentOperation(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Some assignments not found',
        requested: 2,
        found: 1,
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('validateAssignmentQuery', () => {
    it('should validate query parameters', async () => {
      req.query = {
        status: 'ACTIVE',
        judgeId: 'judge-123',
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      mockPrisma.user.findUnique.mockResolvedValue({ id: 'judge-123' });

      await validateAssignmentQuery(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid status filter', async () => {
      req.query = {
        status: 'INVALID_STATUS',
      };

      await validateAssignmentQuery(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid status filter',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });

    it('should reject invalid sort field', async () => {
      req.query = {
        sortBy: 'invalidField',
      };

      await validateAssignmentQuery(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid sort field',
        })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });
});
