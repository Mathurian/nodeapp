import 'reflect-metadata';

import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';
import { RoleAssignmentService } from '../../../src/services/RoleAssignmentService';

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

  describe('getAll', () => {
    it('passes filters through to Prisma', async () => {
      mockPrisma.roleAssignment.findMany.mockResolvedValue([] as any);

      await service.getAll({ role: 'BOARD', contestId: 'contest-1' });

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { role: 'BOARD', contestId: 'contest-1' },
        orderBy: [{ assignedAt: 'desc' }],
      });
    });
  });

  describe('create', () => {
    const baseData = {
      userId: 'user-1',
      role: 'BOARD',
      contestId: 'contest-1',
      assignedBy: 'admin-1',
    };

    it('creates a scoped role assignment', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.create(baseData);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith({
        data: {
          tenantId: '',
          userId: 'user-1',
          role: 'BOARD',
          contestId: 'contest-1',
          eventId: null,
          categoryId: null,
          assignedBy: 'admin-1',
        },
      });
    });

    it('rejects missing userId or role', async () => {
      await expect(service.create({ ...baseData, userId: '' })).rejects.toThrow(
        'userId and role are required'
      );
      await expect(service.create({ ...baseData, role: '' })).rejects.toThrow(
        'userId and role are required'
      );
    });

    it('rejects missing scope', async () => {
      await expect(
        service.create({
          userId: 'user-1',
          role: 'BOARD',
          assignedBy: 'admin-1',
        } as any)
      ).rejects.toThrow('At least one of contestId, eventId, or categoryId is required');
    });

    it('rejects invalid roles', async () => {
      await expect(service.create({ ...baseData, role: 'ADMIN' })).rejects.toThrow('Invalid role');
    });

    it('throws when the user does not exist', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(service.create(baseData)).rejects.toThrow(NotFoundError);
    });

    it('rejects duplicate active assignments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' } as any);

      await expect(service.create(baseData)).rejects.toThrow('This assignment already exists');
    });

    it('supports event and category scoped assignments', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.create({
        userId: 'user-1',
        role: 'AUDITOR',
        eventId: 'event-1',
        assignedBy: 'admin-1',
      });
      await service.create({
        userId: 'user-1',
        role: 'TALLY_MASTER',
        categoryId: 'category-1',
        assignedBy: 'admin-1',
      });

      expect(mockPrisma.roleAssignment.create).toHaveBeenNthCalledWith(1, {
        data: {
          tenantId: '',
          userId: 'user-1',
          role: 'AUDITOR',
          contestId: null,
          eventId: 'event-1',
          categoryId: null,
          assignedBy: 'admin-1',
        },
      });
      expect(mockPrisma.roleAssignment.create).toHaveBeenNthCalledWith(2, {
        data: {
          tenantId: '',
          userId: 'user-1',
          role: 'TALLY_MASTER',
          contestId: null,
          eventId: null,
          categoryId: 'category-1',
          assignedBy: 'admin-1',
        },
      });
    });
  });

  describe('update', () => {
    it('updates isActive only when provided', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue({ id: 'assignment-1' } as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ id: 'assignment-1', isActive: false } as any);

      await service.update('assignment-1', { notes: 'ignored', isActive: false });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { isActive: false },
      });
    });

    it('allows empty updates', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue({ id: 'assignment-1' } as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.update('assignment-1', {});

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: {},
      });
    });

    it('throws when updating a missing assignment', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', {})).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes an existing assignment', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue({ id: 'assignment-1' } as any);
      mockPrisma.roleAssignment.delete.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.delete('assignment-1');

      expect(mockPrisma.roleAssignment.findUnique).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
      expect(mockPrisma.roleAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
    });

    it('throws when deleting a missing assignment', async () => {
      mockPrisma.roleAssignment.findUnique.mockResolvedValue(null);

      await expect(service.delete('missing')).rejects.toThrow(NotFoundError);
    });
  });
});
