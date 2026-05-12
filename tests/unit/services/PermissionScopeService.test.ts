import 'reflect-metadata';
import { PermissionScopeLevel, PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { PermissionScopeService } from '../../../src/services/PermissionScopeService';

describe('PermissionScopeService', () => {
  let service: PermissionScopeService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new PermissionScopeService(mockPrisma as unknown as PrismaClient);
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  it('keeps assignment-scoped judges limited to assigned contests and categories', async () => {
    mockPrisma.rolePermissionScope.findUnique.mockResolvedValue(null as never);
    mockPrisma.assignment.findMany.mockResolvedValue([
      {
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'category-1',
      },
      {
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'category-2',
      },
    ] as never);

    const result = await service.resolveUserScope(
      'JUDGE',
      'deductions',
      'tenant-1',
      {
        id: 'user-1',
        judgeId: 'judge-1',
      }
    );

    expect(result).toEqual({
      level: PermissionScopeLevel.ASSIGNMENT,
      tenantWide: false,
      eventIds: [],
      contestIds: ['contest-1'],
      categoryIds: ['category-1', 'category-2'],
    });
  });

  it('preserves explicit event-level assignments for assignment-scoped tally users', async () => {
    mockPrisma.rolePermissionScope.findUnique.mockResolvedValue({
      scope: PermissionScopeLevel.ASSIGNMENT,
    } as never);
    mockPrisma.tallyMasterAssignment.findMany.mockResolvedValue([
      {
        eventId: 'event-9',
        contestId: null,
        categoryId: null,
      },
    ] as never);

    const result = await service.resolveUserScope(
      'TALLY_MASTER',
      'deductions',
      'tenant-1',
      {
        id: 'user-1',
      }
    );

    expect(result).toEqual({
      level: PermissionScopeLevel.ASSIGNMENT,
      tenantWide: false,
      eventIds: ['event-9'],
      contestIds: [],
      categoryIds: [],
    });
  });
});
