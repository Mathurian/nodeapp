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

      await service.getAll({ tenantId: 'tenant-1', role: 'BOARD', contestId: 'contest-1' });

      expect(mockPrisma.roleAssignment.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', role: 'BOARD', contestId: 'contest-1' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [{ assignedAt: 'desc' }],
      });
    });
  });

  describe('create', () => {
    const baseData = {
      tenantId: 'tenant-1',
      userId: 'user-1',
      role: 'BOARD',
      contestId: 'contest-1',
      assignedBy: 'admin-1',
    };

    it('creates a scoped role assignment', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.create(baseData);

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          role: 'BOARD',
          contestId: 'contest-1',
          eventId: null,
          categoryId: null,
          notes: null,
          assignedBy: 'admin-1',
        },
      });
    });

    it('stores notes when provided', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.create({ ...baseData, notes: '  Assigned during clone review  ' });

      expect(mockPrisma.roleAssignment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          notes: 'Assigned during clone review',
        }),
      });
    });

    it('rejects missing tenantId, userId, or role', async () => {
      await expect(service.create({ ...baseData, tenantId: '' })).rejects.toThrow(
        'tenantId, userId and role are required'
      );
      await expect(service.create({ ...baseData, userId: '' })).rejects.toThrow(
        'tenantId, userId and role are required'
      );
      await expect(service.create({ ...baseData, role: '' })).rejects.toThrow(
        'tenantId, userId and role are required'
      );
    });

    it('rejects missing scope', async () => {
      await expect(
        service.create({
          tenantId: 'tenant-1',
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
      mockPrisma.user.findFirst.mockResolvedValue(null);

      await expect(service.create(baseData)).rejects.toThrow(NotFoundError);
    });

    it('rejects duplicate active assignments', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.contest.findFirst.mockResolvedValue({ id: 'contest-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' } as any);

      await expect(service.create(baseData)).rejects.toThrow('This assignment already exists');
    });

    it('supports event and category scoped assignments', async () => {
      mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' } as any);
      mockPrisma.event.findFirst.mockResolvedValue({ id: 'event-1' } as any);
      mockPrisma.category.findFirst.mockResolvedValue({ id: 'category-1' } as any);
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);
      mockPrisma.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.create({
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'AUDITOR',
        eventId: 'event-1',
        assignedBy: 'admin-1',
      });
      await service.create({
        tenantId: 'tenant-1',
        userId: 'user-1',
        role: 'TALLY_MASTER',
        categoryId: 'category-1',
        assignedBy: 'admin-1',
      });

      expect(mockPrisma.roleAssignment.create).toHaveBeenNthCalledWith(1, {
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          role: 'AUDITOR',
          contestId: null,
          eventId: 'event-1',
          categoryId: null,
          notes: null,
          assignedBy: 'admin-1',
        },
      });
      expect(mockPrisma.roleAssignment.create).toHaveBeenNthCalledWith(2, {
        data: {
          tenantId: 'tenant-1',
          userId: 'user-1',
          role: 'TALLY_MASTER',
          contestId: null,
          eventId: null,
          categoryId: 'category-1',
          notes: null,
          assignedBy: 'admin-1',
        },
      });
    });
  });

  describe('update', () => {
    it('updates notes and isActive within tenant scope', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' } as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ id: 'assignment-1', isActive: false } as any);

      await service.update('assignment-1', { tenantId: 'tenant-1', notes: ' updated ', isActive: false });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: { notes: 'updated', isActive: false },
      });
    });

    it('allows empty updates', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' } as any);
      mockPrisma.roleAssignment.update.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.update('assignment-1', { tenantId: 'tenant-1' });

      expect(mockPrisma.roleAssignment.update).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
        data: {},
      });
    });

    it('throws when updating a missing assignment', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);

      await expect(service.update('missing', { tenantId: 'tenant-1' })).rejects.toThrow(NotFoundError);
    });
  });

  describe('delete', () => {
    it('deletes an existing assignment', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue({ id: 'assignment-1' } as any);
      mockPrisma.roleAssignment.delete.mockResolvedValue({ id: 'assignment-1' } as any);

      await service.delete('assignment-1', 'tenant-1');

      expect(mockPrisma.roleAssignment.findFirst).toHaveBeenCalledWith({
        where: { id: 'assignment-1', tenantId: 'tenant-1' },
      });
      expect(mockPrisma.roleAssignment.delete).toHaveBeenCalledWith({
        where: { id: 'assignment-1' },
      });
    });

    it('throws when deleting a missing assignment', async () => {
      mockPrisma.roleAssignment.findFirst.mockResolvedValue(null);

      await expect(service.delete('missing', 'tenant-1')).rejects.toThrow(NotFoundError);
    });
  });
});
