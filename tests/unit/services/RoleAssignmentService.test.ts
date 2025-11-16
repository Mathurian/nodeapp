/**
 * RoleAssignmentService Unit Tests
 * Comprehensive tests for role assignment functionality
 */

import 'reflect-metadata';
import { RoleAssignmentService } from '../../../src/services/RoleAssignmentService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, BadRequestError } from '../../../src/services/BaseService';

describe('RoleAssignmentService', () => {
  let service: RoleAssignmentService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new RoleAssignmentService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(RoleAssignmentService);
    });
  });

  describe('getAll', () => {
    const mockAssignments = [
      {
        id: 'assignment1',
        userId: 'user1',
        role: 'BOARD',
        contestId: 'contest1',
        eventId: null,
        categoryId: null,
        notes: 'Test assignment',
        isActive: true,
        assignedAt: new Date('2024-01-01'),
        user: { id: 'user1', name: 'John Doe', preferredName: 'John', email: 'john@example.com', role: 'BOARD' },
        contest: { id: 'contest1', name: 'Test Contest' },
        event: null,
        category: null
      },
      {
        id: 'assignment2',
        userId: 'user2',
        role: 'TALLY_MASTER',
        contestId: null,
        eventId: 'event1',
        categoryId: null,
        notes: null,
        isActive: true,
        assignedAt: new Date('2024-01-02'),
        user: { id: 'user2', name: 'Jane Smith', preferredName: 'Jane', email: 'jane@example.com', role: 'TALLY_MASTER' },
        contest: null,
        event: { id: 'event1', name: 'Test Event' },
        category: null
      }
    ];

    it('should retrieve all role assignments without filters', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue(mockAssignments as any);

      const result = await service.getAll({});

      expect(result).toEqual(mockAssignments);
      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.objectContaining({
          user: expect.any(Object),
          contest: expect.any(Object),
          event: expect.any(Object),
          category: expect.any(Object)
        }),
        orderBy: [{ assignedAt: 'desc' }]
      });
    });

    it('should filter by role', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([mockAssignments[0]] as any);

      const result = await service.getAll({ role: 'BOARD' });

      expect(result).toHaveLength(1);
      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { role: 'BOARD' },
        include: expect.any(Object),
        orderBy: [{ assignedAt: 'desc' }]
      });
    });

    it('should filter by contestId', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([mockAssignments[0]] as any);

      await service.getAll({ contestId: 'contest1' });

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { contestId: 'contest1' },
        include: expect.any(Object),
        orderBy: [{ assignedAt: 'desc' }]
      });
    });

    it('should filter by eventId', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([mockAssignments[1]] as any);

      await service.getAll({ eventId: 'event1' });

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { eventId: 'event1' },
        include: expect.any(Object),
        orderBy: [{ assignedAt: 'desc' }]
      });
    });

    it('should filter by categoryId', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([] as any);

      await service.getAll({ categoryId: 'category1' });

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'category1' },
        include: expect.any(Object),
        orderBy: [{ assignedAt: 'desc' }]
      });
    });

    it('should apply multiple filters', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([] as any);

      await service.getAll({ role: 'AUDITOR', eventId: 'event1', contestId: 'contest1' });

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { role: 'AUDITOR', eventId: 'event1', contestId: 'contest1' },
        include: expect.any(Object),
        orderBy: [{ assignedAt: 'desc' }]
      });
    });

    it('should sort by assignedAt descending', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue(mockAssignments as any);

      await service.getAll({});

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ assignedAt: 'desc' }]
        })
      );
    });

    it('should return empty array when no assignments found', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([]);

      const result = await service.getAll({ role: 'NONEXISTENT' });

      expect(result).toEqual([]);
    });
  });

  describe('create', () => {
    const validAssignmentData = {
      userId: 'user1',
      role: 'BOARD',
      contestId: 'contest1',
      notes: 'Test notes',
      assignedBy: 'admin1'
    };

    const mockAssignment = {
      id: 'assignment1',
      ...validAssignmentData,
      eventId: null,
      categoryId: null,
      isActive: true,
      assignedAt: new Date(),
      user: { id: 'user1', name: 'John Doe', preferredName: 'John', email: 'john@example.com', role: 'USER' },
      contest: { id: 'contest1', name: 'Test Contest' },
      event: null,
      category: null
    };

    const mockUser = { id: 'user1', name: 'John Doe', email: 'john@example.com' };

    it('should create a new role assignment successfully', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue(mockAssignment as any);

      const result = await service.create(validAssignmentData);

      expect(result).toEqual(mockAssignment);
      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith({
        data: {
          userId: validAssignmentData.userId,
          role: validAssignmentData.role,
          contestId: validAssignmentData.contestId,
          eventId: null,
          categoryId: null,
          notes: validAssignmentData.notes,
          assignedBy: validAssignmentData.assignedBy
        },
        include: expect.any(Object)
      });
    });

    it('should create assignment with eventId', async () => {
      const dataWithEvent = { ...validAssignmentData, eventId: 'event1' };
      delete dataWithEvent.contestId;

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue(mockAssignment as any);

      await service.create(dataWithEvent);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: 'event1',
            contestId: null
          })
        })
      );
    });

    it('should create assignment with categoryId', async () => {
      const dataWithCategory = { ...validAssignmentData, categoryId: 'category1' };
      delete dataWithCategory.contestId;

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue(mockAssignment as any);

      await service.create(dataWithCategory);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'category1',
            contestId: null
          })
        })
      );
    });

    it('should create assignment for TALLY_MASTER role', async () => {
      const tallyData = { ...validAssignmentData, role: 'TALLY_MASTER' };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ ...mockAssignment, role: 'TALLY_MASTER' } as any);

      await service.create(tallyData);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'TALLY_MASTER'
          })
        })
      );
    });

    it('should create assignment for AUDITOR role', async () => {
      const auditorData = { ...validAssignmentData, role: 'AUDITOR' };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ ...mockAssignment, role: 'AUDITOR' } as any);

      await service.create(auditorData);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: 'AUDITOR'
          })
        })
      );
    });

    it('should throw BadRequestError when userId is missing', async () => {
      const invalidData = { ...validAssignmentData };
      delete invalidData.userId;

      await expect(service.create(invalidData as any)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.roleAssignment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when role is missing', async () => {
      const invalidData = { ...validAssignmentData };
      delete invalidData.role;

      await expect(service.create(invalidData as any)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.roleAssignment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when no scope is provided', async () => {
      const invalidData = { ...validAssignmentData };
      delete invalidData.contestId;

      await expect(service.create(invalidData)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError for invalid role', async () => {
      const invalidData = { ...validAssignmentData, role: 'INVALID_ROLE' };

      await expect(service.create(invalidData)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.user.findUnique).not.toHaveBeenCalled();
    });

    it('should throw NotFoundError when user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(validAssignmentData)).rejects.toThrow(NotFoundError);
      expect(mockPrisma.roleAssignment.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestError when assignment already exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(mockAssignment as any);

      await expect(service.create(validAssignmentData)).rejects.toThrow(BadRequestError);
      expect(mockPrisma.roleAssignment.create).not.toHaveBeenCalled();
    });

    it('should create assignment without notes', async () => {
      const dataWithoutNotes = { ...validAssignmentData };
      delete dataWithoutNotes.notes;

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue(mockAssignment as any);

      await service.create(dataWithoutNotes);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: undefined
          })
        })
      );
    });
  });

  describe('update', () => {
    const existingAssignment = {
      id: 'assignment1',
      userId: 'user1',
      role: 'BOARD',
      notes: 'Original notes',
      isActive: true
    };

    const updatedAssignment = {
      ...existingAssignment,
      notes: 'Updated notes',
      user: { id: 'user1', name: 'John Doe', preferredName: 'John', email: 'john@example.com', role: 'BOARD' },
      contest: null,
      event: null,
      category: null
    };

    it('should update assignment notes', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.update.mockResolvedValue(updatedAssignment as any);

      const result = await service.update('assignment1', { notes: 'Updated notes' });

      expect(result).toEqual(updatedAssignment);
      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment1' },
        data: { notes: 'Updated notes' },
        include: expect.any(Object)
      });
    });

    it('should update assignment isActive status', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ ...updatedAssignment, isActive: false } as any);

      await service.update('assignment1', { isActive: false });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment1' },
        data: { isActive: false },
        include: expect.any(Object)
      });
    });

    it('should update both notes and isActive', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.update.mockResolvedValue(updatedAssignment as any);

      await service.update('assignment1', { notes: 'New notes', isActive: false });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment1' },
        data: { notes: 'New notes', isActive: false },
        include: expect.any(Object)
      });
    });

    it('should handle empty update data', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.update.mockResolvedValue(updatedAssignment as any);

      await service.update('assignment1', {});

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment1' },
        data: {},
        include: expect.any(Object)
      });
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.update('nonexistent', { notes: 'Test' })).rejects.toThrow(NotFoundError);
      expect(mockPrisma.roleAssignment.update).not.toHaveBeenCalled();
    });

    it('should set notes to empty string', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ ...updatedAssignment, notes: '' } as any);

      await service.update('assignment1', { notes: '' });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { notes: '' }
        })
      );
    });

    it('should activate inactive assignment', async () => {
      const inactiveAssignment = { ...existingAssignment, isActive: false };
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(inactiveAssignment as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ ...updatedAssignment, isActive: true } as any);

      await service.update('assignment1', { isActive: true });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { isActive: true }
        })
      );
    });
  });

  describe('delete', () => {
    const existingAssignment = {
      id: 'assignment1',
      userId: 'user1',
      role: 'BOARD',
      notes: 'Test assignment',
      isActive: true
    };

    it('should delete assignment successfully', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.delete.mockResolvedValue(existingAssignment as any);

      await service.delete('assignment1');

      expect(mockPrisma.roleAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment1' }
      });
    });

    it('should throw NotFoundError when assignment does not exist', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.delete('nonexistent')).rejects.toThrow(NotFoundError);
      expect(mockPrisma.roleAssignment.delete).not.toHaveBeenCalled();
    });

    it('should delete inactive assignment', async () => {
      const inactiveAssignment = { ...existingAssignment, isActive: false };
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(inactiveAssignment as any);
      mockPrisma.roleAssignment.delete.mockResolvedValue(inactiveAssignment as any);

      await service.delete('assignment1');

      expect(mockPrisma.roleAssignment.delete).toHaveBeenCalled();
    });

    it('should verify assignment existence before deletion', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(existingAssignment as any);
      mockPrisma.roleAssignment.delete.mockResolvedValue(existingAssignment as any);

      await service.delete('assignment1');

      expect(mockPrisma.roleAssignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment1' }
      });
      expect(mockPrisma.roleAssignment.findUnique).toHaveBeenCalledBefore(
        mockPrisma.roleAssignment.delete as any
      );
    });
  });
});
