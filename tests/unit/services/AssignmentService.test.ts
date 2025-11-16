/**
 * AssignmentService Unit Tests
 */

import 'reflect-metadata';
import { AssignmentService, CreateAssignmentInput, UpdateAssignmentInput, AssignmentFilters } from '../../../src/services/AssignmentService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('AssignmentService', () => {
  let service: AssignmentService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockAssignment = {
    id: 'assignment-1',
    judgeId: 'judge-1',
    categoryId: 'category-1',
    contestId: 'contest-1',
    eventId: 'event-1',
    status: 'ACTIVE',
    assignedAt: new Date(),
    assignedBy: 'user-1',
    notes: 'Test assignment',
    priority: 5,
    judge: { id: 'judge-1', name: 'Judge 1', email: 'judge1@test.com', bio: null, isHeadJudge: false },
    category: { id: 'category-1', name: 'Talent', description: 'Talent category', scoreCap: 100 },
    contest: { id: 'contest-1', name: 'Contest 1', description: 'Test Contest' },
    event: { id: 'event-1', name: 'Event 1', startDate: new Date(), endDate: new Date() },
    assignedByUser: { id: 'user-1', name: 'Admin', email: 'admin@test.com', role: 'ADMIN' }
  };

  const mockCategory = {
    id: 'category-1',
    contestId: 'contest-1',
    contest: {
      id: 'contest-1',
      eventId: 'event-1',
      event: { id: 'event-1' }
    }
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new AssignmentService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getAllAssignments', () => {
    const filters: AssignmentFilters = {
      status: 'ACTIVE',
      judgeId: 'judge-1'
    };

    beforeEach(() => {
      (mockPrisma.assignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);
      (mockPrisma.categoryJudge.findMany as jest.Mock).mockResolvedValue([]);
    });

    it('should return all assignments with filters', async () => {
      const result = await service.getAllAssignments(filters);

      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'ACTIVE',
            judgeId: 'judge-1'
          })
        })
      );
      expect(result).toEqual([mockAssignment]);
    });

    it('should return empty array when no assignments found', async () => {
      (mockPrisma.assignment.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getAllAssignments({});

      expect(result).toEqual([]);
    });

    it('should combine Assignment and CategoryJudge records', async () => {
      const categoryJudge = {
        categoryId: 'category-2',
        judgeId: 'judge-1',
        judge: { id: 'judge-1', name: 'Judge 1', email: 'judge1@test.com', bio: null, isHeadJudge: false },
        category: {
          id: 'category-2',
          name: 'Dance',
          description: 'Dance category',
          scoreCap: 100,
          contest: {
            id: 'contest-1',
            name: 'Contest 1',
            description: 'Test Contest',
            event: {
              id: 'event-1',
              name: 'Event 1',
              startDate: new Date(),
              endDate: new Date()
            }
          }
        }
      };
      (mockPrisma.categoryJudge.findMany as jest.Mock).mockResolvedValue([categoryJudge]);

      const result = await service.getAllAssignments({});

      expect(result.length).toBeGreaterThan(0);
    });

    it('should apply categoryId filter', async () => {
      const result = await service.getAllAssignments({ categoryId: 'category-1' });

      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'category-1'
          })
        })
      );
    });

    it('should apply contestId filter', async () => {
      const result = await service.getAllAssignments({ contestId: 'contest-1' });

      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            contestId: 'contest-1'
          })
        })
      );
    });

    it('should apply eventId filter', async () => {
      const result = await service.getAllAssignments({ eventId: 'event-1' });

      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            eventId: 'event-1'
          })
        })
      );
    });
  });

  describe('createAssignment', () => {
    const assignmentData: CreateAssignmentInput = {
      judgeId: 'judge-1',
      categoryId: 'category-1',
      notes: 'New assignment',
      priority: 5
    };

    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assignment.create as jest.Mock).mockResolvedValue(mockAssignment);
    });

    it('should create new assignment successfully', async () => {
      const result = await service.createAssignment(assignmentData, 'user-1');

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        include: {
          contest: {
            include: {
              event: true
            }
          }
        }
      });
      expect(mockPrisma.assignment.create).toHaveBeenCalled();
      expect(result).toEqual(mockAssignment);
    });

    it('should throw error when judgeId is missing', async () => {
      await expect(
        service.createAssignment({ categoryId: 'category-1' } as any, 'user-1')
      ).rejects.toThrow();
    });

    it('should throw error when neither categoryId nor contestId provided', async () => {
      await expect(
        service.createAssignment({ judgeId: 'judge-1' } as any, 'user-1')
      ).rejects.toThrow('Either categoryId or contestId is required');
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createAssignment(assignmentData, 'user-1')
      ).rejects.toThrow('Category not found');
    });

    it('should throw error when assignment already exists', async () => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);

      await expect(
        service.createAssignment(assignmentData, 'user-1')
      ).rejects.toThrow('Assignment already exists');
    });

    it('should create assignment with contestId when no categoryId', async () => {
      const contestData = {
        judgeId: 'judge-1',
        contestId: 'contest-1',
        eventId: 'event-1'
      };
      (mockPrisma.assignment.create as jest.Mock).mockResolvedValue(mockAssignment);

      const result = await service.createAssignment(contestData, 'user-1');

      expect(mockPrisma.assignment.create).toHaveBeenCalled();
      expect(result).toEqual(mockAssignment);
    });

    it('should fetch eventId from contest when contestId provided without eventId', async () => {
      const contestData = {
        judgeId: 'judge-1',
        contestId: 'contest-1'
      };
      (mockPrisma.contest.findUnique as jest.Mock).mockResolvedValue({
        id: 'contest-1',
        eventId: 'event-1',
        event: { id: 'event-1' }
      });
      (mockPrisma.assignment.create as jest.Mock).mockResolvedValue(mockAssignment);

      const result = await service.createAssignment(contestData, 'user-1');

      expect(mockPrisma.contest.findUnique).toHaveBeenCalled();
      expect(result).toEqual(mockAssignment);
    });
  });

  describe('getAssignmentById', () => {
    beforeEach(() => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);
    });

    it('should return assignment by id', async () => {
      const result = await service.getAssignmentById('assignment-1');

      expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        include: expect.any(Object)
      });
      expect(result).toEqual(mockAssignment);
    });

    it('should throw error when assignment not found', async () => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getAssignmentById('nonexistent')
      ).rejects.toThrow('Assignment not found');
    });
  });

  describe('updateAssignment', () => {
    const updateData: UpdateAssignmentInput = {
      status: 'COMPLETED',
      notes: 'Updated notes',
      priority: 10
    };

    beforeEach(() => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);
      (mockPrisma.assignment.update as jest.Mock).mockResolvedValue({
        ...mockAssignment,
        ...updateData
      });
    });

    it('should update assignment successfully', async () => {
      const result = await service.updateAssignment('assignment-1', updateData);

      expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment-1' }
      });
      expect(mockPrisma.assignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: updateData,
        include: expect.any(Object)
      });
      expect(result.status).toBe('COMPLETED');
    });

    it('should throw error when assignment not found', async () => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateAssignment('nonexistent', updateData)
      ).rejects.toThrow('Assignment not found');
    });
  });

  describe('deleteAssignment', () => {
    beforeEach(() => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(mockAssignment);
      (mockPrisma.assignment.delete as jest.Mock).mockResolvedValue(mockAssignment);
    });

    it('should delete assignment successfully', async () => {
      await service.deleteAssignment('assignment-1');

      expect(mockPrisma.assignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment-1' }
      });
      expect(mockPrisma.assignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' }
      });
    });

    it('should throw error when assignment not found', async () => {
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.deleteAssignment('nonexistent')
      ).rejects.toThrow('Assignment not found');
    });
  });

  describe('getAssignmentsForJudge', () => {
    beforeEach(() => {
      (mockPrisma.assignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);
    });

    it('should return assignments for specific judge', async () => {
      const result = await service.getAssignmentsForJudge('judge-1');

      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
        where: { judgeId: 'judge-1' },
        include: expect.any(Object),
        orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }]
      });
      expect(result).toEqual([mockAssignment]);
    });
  });

  describe('getAssignmentsForCategory', () => {
    beforeEach(() => {
      (mockPrisma.assignment.findMany as jest.Mock).mockResolvedValue([mockAssignment]);
    });

    it('should return assignments for specific category', async () => {
      const result = await service.getAssignmentsForCategory('category-1');

      expect(mockPrisma.assignment.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'category-1' },
        include: expect.any(Object),
        orderBy: [{ priority: 'desc' }, { assignedAt: 'desc' }]
      });
      expect(result).toEqual([mockAssignment]);
    });
  });

  describe('bulkAssignJudges', () => {
    const judgeIds = ['judge-1', 'judge-2', 'judge-3'];

    beforeEach(() => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(mockCategory);
      (mockPrisma.assignment.findUnique as jest.Mock).mockResolvedValue(null);
      (mockPrisma.assignment.create as jest.Mock).mockResolvedValue(mockAssignment);
    });

    it('should bulk assign judges to category', async () => {
      const result = await service.bulkAssignJudges('category-1', judgeIds, 'user-1');

      expect(mockPrisma.category.findUnique).toHaveBeenCalledWith({
        where: { id: 'category-1' },
        include: {
          contest: {
            include: {
              event: true
            }
          }
        }
      });
      expect(result).toBe(3);
    });

    it('should skip existing assignments', async () => {
      (mockPrisma.assignment.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockAssignment)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null);

      const result = await service.bulkAssignJudges('category-1', judgeIds, 'user-1');

      expect(result).toBe(2); // Only 2 new assignments created
    });

    it('should throw error when category not found', async () => {
      (mockPrisma.category.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.bulkAssignJudges('nonexistent', judgeIds, 'user-1')
      ).rejects.toThrow('Category not found');
    });
  });

  describe('getJudges', () => {
    const mockJudges = [
      { id: 'judge-1', name: 'Judge 1', email: 'judge1@test.com', bio: null, isHeadJudge: false },
      { id: 'judge-2', name: 'Judge 2', email: 'judge2@test.com', bio: null, isHeadJudge: true }
    ];

    beforeEach(() => {
      (mockPrisma.judge.findMany as jest.Mock).mockResolvedValue(mockJudges);
    });

    it('should return all judges', async () => {
      const result = await service.getJudges();

      expect(mockPrisma.judge.findMany).toHaveBeenCalledWith({
        select: expect.any(Object),
        orderBy: {
          name: 'asc'
        }
      });
      expect(result).toEqual(mockJudges);
    });
  });

  describe('createJudge', () => {
    const judgeData = {
      name: 'New Judge',
      email: 'newjudge@test.com',
      bio: 'Bio',
      isHeadJudge: false
    };

    beforeEach(() => {
      (mockPrisma.judge.create as jest.Mock).mockResolvedValue({
        id: 'judge-new',
        ...judgeData
      });
    });

    it('should create new judge successfully', async () => {
      const result = await service.createJudge(judgeData);

      expect(mockPrisma.judge.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New Judge',
          email: 'newjudge@test.com'
        })
      });
      expect(result.name).toBe('New Judge');
    });

    it('should throw error when name is missing', async () => {
      await expect(
        service.createJudge({ email: 'test@test.com' })
      ).rejects.toThrow();
    });
  });

  describe('bulkDeleteJudges', () => {
    const judgeIds = ['judge-1', 'judge-2'];

    beforeEach(() => {
      (mockPrisma.judge.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });
    });

    it('should bulk delete judges', async () => {
      const result = await service.bulkDeleteJudges(judgeIds);

      expect(mockPrisma.judge.deleteMany).toHaveBeenCalledWith({
        where: {
          id: {
            in: judgeIds
          }
        }
      });
      expect(result.deletedCount).toBe(2);
    });

    it('should throw error when no judge IDs provided', async () => {
      await expect(
        service.bulkDeleteJudges([])
      ).rejects.toThrow('No judge IDs provided');
    });
  });

  describe('removeAllAssignmentsForCategory', () => {
    beforeEach(() => {
      (mockPrisma.assignment.deleteMany as jest.Mock).mockResolvedValue({ count: 5 });
    });

    it('should remove all assignments for category', async () => {
      const result = await service.removeAllAssignmentsForCategory('category-1');

      expect(mockPrisma.assignment.deleteMany).toHaveBeenCalledWith({
        where: { categoryId: 'category-1' }
      });
      expect(result).toBe(5);
    });
  });
});
