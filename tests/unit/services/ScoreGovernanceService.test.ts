import 'reflect-metadata';
import { UserRole, PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ScoreGovernanceService } from '../../../src/services/ScoreGovernanceService';

describe('ScoreGovernanceService', () => {
  let service: ScoreGovernanceService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ScoreGovernanceService(mockPrisma as any, {} as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('getScoreReview', () => {
    it('applies event-aware category scoping before loading scores', async () => {
      mockPrisma.category.findMany.mockResolvedValue([{ id: 'category-1' }] as any);
      mockPrisma.score.findMany.mockResolvedValue([] as any);

      await service.getScoreReview('tenant-1', 'user-1', UserRole.ADMIN, {
        eventId: 'event-1',
        contestId: 'contest-1',
      });

      expect(mockPrisma.category.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            deletedAt: null,
            contestId: 'contest-1',
            contest: { eventId: 'event-1' },
          }),
        })
      );
      expect(mockPrisma.score.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            categoryId: { in: ['category-1'] },
          }),
        })
      );
    });
  });
});
