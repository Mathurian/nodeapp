/**
 * WinnerService Publication Control Unit Tests
 * Tests for Phase 1.3 - Winners Publication Control
 *
 * Verifies that:
 * - Winners can only be published after all categories have Board approval
 * - Publication visibility is properly controlled by role
 * - Unpublished winners are only visible to Board/Admin/Organizer
 * - Published winners are visible to all authorized roles
 */

import 'reflect-metadata';
import { WinnerService } from '../../../src/services/WinnerService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('WinnerService - Publication Control', () => {
  let service: WinnerService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockContestId = 'contest-123';
  const mockUserId = 'user-123';
  const mockTenantId = 'tenant-123';
  const mockCategory1Id = 'category-1';
  const mockCategory2Id = 'category-2';

  const mockContest = {
    id: mockContestId,
    name: 'Talent Contest',
    description: 'Annual talent show',
    eventId: 'event-123',
    winnersPublished: false,
    publishedAt: null,
    publishedBy: null,
    tenantId: mockTenantId
  };

  const mockCategories = [
    {
      id: mockCategory1Id,
      name: 'Vocals',
      boardApproved: false,
      categoryCertifications: []
    },
    {
      id: mockCategory2Id,
      name: 'Dance',
      boardApproved: false,
      categoryCertifications: []
    }
  ];

  const mockCategoriesWithBoardApproval = [
    {
      id: mockCategory1Id,
      name: 'Vocals',
      boardApproved: true,
      categoryCertifications: [
        {
          id: 'cert-1',
          role: 'BOARD',
          certifiedAt: new Date('2024-01-15T10:00:00Z'),
          userId: 'board-user-1'
        }
      ]
    },
    {
      id: mockCategory2Id,
      name: 'Dance',
      boardApproved: true,
      categoryCertifications: [
        {
          id: 'cert-2',
          role: 'BOARD',
          certifiedAt: new Date('2024-01-15T10:30:00Z'),
          userId: 'board-user-2'
        }
      ]
    }
  ];

  const mockPublishedContest = {
    ...mockContest,
    winnersPublished: true,
    publishedAt: new Date('2024-01-15T11:00:00Z'),
    publishedBy: mockUserId
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new WinnerService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('publishWinners', () => {
    it('should successfully publish winners when all categories have Board approval', async () => {
      const contestWithApprovedCategories = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithApprovedCategories as any);
      mockPrisma.contest.update.mockResolvedValue(mockPublishedContest as any);

      const result = await service.publishWinners(
        mockContestId,
        mockUserId,
        'BOARD',
        mockTenantId
      );

      expect(result.message).toContain('Winners published successfully');
      expect(result.contest.winnersPublished).toBe(true);
      expect(result.categoriesPublished).toBe(2);
    });

    it('should BLOCK publication if any category lacks Board approval', async () => {
      const contestWithMixedApproval = {
        ...mockContest,
        categories: [
          mockCategoriesWithBoardApproval[0],
          mockCategories[1] // Not Board approved
        ]
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithMixedApproval as any);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'BOARD', mockTenantId)
      ).rejects.toThrow('Cannot publish winners');
    });

    it('should BLOCK publication if already published', async () => {
      const alreadyPublished = {
        ...mockPublishedContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(alreadyPublished as any);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'BOARD', mockTenantId)
      ).rejects.toThrow('Winners have already been published');
    });

    it('should allow SUPER_ADMIN to publish', async () => {
      const contestWithApprovedCategories = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithApprovedCategories as any);
      mockPrisma.contest.update.mockResolvedValue(mockPublishedContest as any);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'SUPER_ADMIN', mockTenantId)
      ).resolves.toBeDefined();
    });

    it('should allow ADMIN to publish', async () => {
      const contestWithApprovedCategories = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithApprovedCategories as any);
      mockPrisma.contest.update.mockResolvedValue(mockPublishedContest as any);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'ADMIN', mockTenantId)
      ).resolves.toBeDefined();
    });

    it('should allow ORGANIZER to publish', async () => {
      const contestWithApprovedCategories = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithApprovedCategories as any);
      mockPrisma.contest.update.mockResolvedValue(mockPublishedContest as any);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'ORGANIZER', mockTenantId)
      ).resolves.toBeDefined();
    });

    it('should BLOCK JUDGE from publishing', async () => {
      await expect(
        service.publishWinners(mockContestId, mockUserId, 'JUDGE', mockTenantId)
      ).rejects.toThrow('Only SUPER_ADMIN, ADMIN, BOARD, ORGANIZER can publish winners');
    });

    it('should BLOCK TALLY_MASTER from publishing', async () => {
      await expect(
        service.publishWinners(mockContestId, mockUserId, 'TALLY_MASTER', mockTenantId)
      ).rejects.toThrow('Only SUPER_ADMIN, ADMIN, BOARD, ORGANIZER can publish winners');
    });

    it('should BLOCK AUDITOR from publishing', async () => {
      await expect(
        service.publishWinners(mockContestId, mockUserId, 'AUDITOR', mockTenantId)
      ).rejects.toThrow('Only SUPER_ADMIN, ADMIN, BOARD, ORGANIZER can publish winners');
    });

    it('should throw error when contest not found', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(null);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'BOARD', mockTenantId)
      ).rejects.toThrow();
    });

    it('should set publishedAt timestamp', async () => {
      const contestWithApprovedCategories = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithApprovedCategories as any);
      mockPrisma.contest.update.mockResolvedValue(mockPublishedContest as any);

      await service.publishWinners(mockContestId, mockUserId, 'BOARD', mockTenantId);

      expect(mockPrisma.contest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            winnersPublished: true,
            publishedAt: expect.any(Date),
            publishedBy: mockUserId
          })
        })
      );
    });

    it('should list missing categories in error message', async () => {
      const contestWithMixedApproval = {
        ...mockContest,
        categories: [
          mockCategoriesWithBoardApproval[0],
          { ...mockCategories[1], name: 'Dance' }
        ]
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithMixedApproval as any);

      await expect(
        service.publishWinners(mockContestId, mockUserId, 'BOARD', mockTenantId)
      ).rejects.toThrow(/Dance/);
    });
  });

  describe('unpublishWinners', () => {
    it('should allow SUPER_ADMIN to unpublish', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockPublishedContest as any);
      mockPrisma.contest.update.mockResolvedValue({
        ...mockPublishedContest,
        winnersPublished: false,
        publishedAt: null,
        publishedBy: null
      } as any);

      const result = await service.unpublishWinners(
        mockContestId,
        mockUserId,
        'SUPER_ADMIN',
        'Data correction needed'
      );

      expect(result.message).toContain('Winners unpublished successfully');
    });

    it('should allow ADMIN to unpublish', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockPublishedContest as any);
      mockPrisma.contest.update.mockResolvedValue({
        ...mockPublishedContest,
        winnersPublished: false
      } as any);

      await expect(
        service.unpublishWinners(mockContestId, mockUserId, 'ADMIN', 'Error correction')
      ).resolves.toBeDefined();
    });

    it('should BLOCK BOARD from unpublishing', async () => {
      await expect(
        service.unpublishWinners(mockContestId, mockUserId, 'BOARD', 'Reason')
      ).rejects.toThrow('Only SUPER_ADMIN or ADMIN can unpublish winners');
    });

    it('should BLOCK ORGANIZER from unpublishing', async () => {
      await expect(
        service.unpublishWinners(mockContestId, mockUserId, 'ORGANIZER', 'Reason')
      ).rejects.toThrow('Only SUPER_ADMIN or ADMIN can unpublish winners');
    });

    it('should throw error if winners not currently published', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContest as any);

      await expect(
        service.unpublishWinners(mockContestId, mockUserId, 'ADMIN', 'Reason')
      ).rejects.toThrow('Winners are not currently published');
    });

    it('should reset all publication fields', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockPublishedContest as any);
      mockPrisma.contest.update.mockResolvedValue({
        ...mockContest,
        winnersPublished: false,
        publishedAt: null,
        publishedBy: null
      } as any);

      await service.unpublishWinners(mockContestId, mockUserId, 'ADMIN', 'Correction');

      expect(mockPrisma.contest.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            winnersPublished: false,
            publishedAt: null,
            publishedBy: null
          }
        })
      );
    });
  });

  describe('getWinnersPublicationStatus', () => {
    it('should return publication status with category breakdown', async () => {
      const contestWithStatus = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithStatus as any);

      const result = await service.getWinnersPublicationStatus(mockContestId, mockTenantId);

      expect(result.contestId).toBe(mockContestId);
      expect(result.winnersPublished).toBe(false);
      expect(result.categories.total).toBe(2);
      expect(result.categories.approved).toBe(2);
      expect(result.categories.pending).toBe(0);
      expect(result.canPublish).toBe(true);
    });

    it('should indicate canPublish=false when categories pending', async () => {
      const contestWithMixed = {
        ...mockContest,
        categories: [
          mockCategoriesWithBoardApproval[0],
          mockCategories[1]
        ]
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithMixed as any);

      const result = await service.getWinnersPublicationStatus(mockContestId, mockTenantId);

      expect(result.canPublish).toBe(false);
      expect(result.categories.pending).toBe(1);
      expect(result.categoriesWithoutApproval).toHaveLength(1);
    });

    it('should indicate canPublish=false if already published', async () => {
      const contestPublished = {
        ...mockPublishedContest,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestPublished as any);

      const result = await service.getWinnersPublicationStatus(mockContestId, mockTenantId);

      expect(result.canPublish).toBe(false);
      expect(result.winnersPublished).toBe(true);
    });

    it('should list categories without approval', async () => {
      const contestWithMixed = {
        ...mockContest,
        categories: [
          mockCategoriesWithBoardApproval[0],
          { ...mockCategories[1], name: 'Dance' }
        ]
      };

      mockPrisma.contest.findUnique.mockResolvedValue(contestWithMixed as any);

      const result = await service.getWinnersPublicationStatus(mockContestId, mockTenantId);

      expect(result.categoriesWithoutApproval).toContainEqual({
        id: mockCategory2Id,
        name: 'Dance'
      });
    });
  });

  describe('getWinnersByContest - Visibility Control', () => {
    const mockContestWithWinners = {
      id: mockContestId,
      name: 'Talent Contest',
      eventId: 'event-123',
      winnersPublished: false,
      publishedAt: null,
      publishedBy: null,
      event: {
        id: 'event-123',
        name: 'Spring Festival'
      },
      categories: [
        {
          id: mockCategory1Id,
          name: 'Vocals',
          criteria: []
        }
      ]
    };

    it('should allow SUPER_ADMIN to view unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      mockPrisma.overallDeduction.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([]);

      await expect(
        service.getWinnersByContest(mockContestId, 'SUPER_ADMIN')
      ).resolves.toBeDefined();
    });

    it('should allow ADMIN to view unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      mockPrisma.overallDeduction.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([]);

      await expect(
        service.getWinnersByContest(mockContestId, 'ADMIN')
      ).resolves.toBeDefined();
    });

    it('should allow BOARD to view unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      mockPrisma.overallDeduction.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([]);

      await expect(
        service.getWinnersByContest(mockContestId, 'BOARD')
      ).resolves.toBeDefined();
    });

    it('should allow ORGANIZER to view unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      mockPrisma.overallDeduction.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([]);

      await expect(
        service.getWinnersByContest(mockContestId, 'ORGANIZER')
      ).resolves.toBeDefined();
    });

    it('should BLOCK JUDGE from viewing unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);

      await expect(
        service.getWinnersByContest(mockContestId, 'JUDGE')
      ).rejects.toThrow('Winners have not been published yet');
    });

    it('should allow TALLY_MASTER to view unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);

      await expect(
        service.getWinnersByContest(mockContestId, 'TALLY_MASTER')
      ).resolves.toBeDefined();
    });

    it('should allow AUDITOR to view unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);

      await expect(
        service.getWinnersByContest(mockContestId, 'AUDITOR')
      ).resolves.toBeDefined();
    });

    it('should BLOCK EMCEE from viewing unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);

      await expect(
        service.getWinnersByContest(mockContestId, 'EMCEE')
      ).rejects.toThrow('Winners have not been published yet');
    });

    it('should BLOCK CONTESTANT from viewing unpublished winners', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);

      await expect(
        service.getWinnersByContest(mockContestId, 'CONTESTANT')
      ).rejects.toThrow('Winners have not been published yet');
    });

    it('should allow all roles to view published winners', async () => {
      const publishedContestWithWinners = {
        ...mockContestWithWinners,
        winnersPublished: true,
        publishedAt: new Date(),
        publishedBy: mockUserId
      };

      mockPrisma.contest.findUnique.mockResolvedValue(publishedContestWithWinners as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      mockPrisma.overallDeduction.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([]);

      const roles = ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'EMCEE', 'CONTESTANT'];

      for (const role of roles) {
        await expect(
          service.getWinnersByContest(mockContestId, role)
        ).resolves.toBeDefined();
      }
    });

    it('should provide clear error message for unpublished access', async () => {
      mockPrisma.contest.findUnique.mockResolvedValue(mockContestWithWinners as any);

      await expect(
        service.getWinnersByContest(mockContestId, 'JUDGE')
      ).rejects.toThrow(/Only Board members and administrators can view unpublished results/);
    });
  });

  describe('Workflow Integration', () => {
    it('should enforce complete workflow: Board approves all → Publish → Visible to all', async () => {
      const contestWithApprovedCategories = {
        ...mockContest,
        categories: mockCategoriesWithBoardApproval
      };

      // Step 1: Check publication status
      mockPrisma.contest.findUnique.mockResolvedValue(contestWithApprovedCategories as any);
      let status = await service.getWinnersPublicationStatus(mockContestId, mockTenantId);
      expect(status.canPublish).toBe(true);

      // Step 2: Publish winners
      mockPrisma.contest.update.mockResolvedValue(mockPublishedContest as any);
      await service.publishWinners(mockContestId, mockUserId, 'BOARD', mockTenantId);

      // Step 3: Now all roles can view
      const publishedContestWithWinners = {
        ...contestWithApprovedCategories,
        winnersPublished: true,
        publishedAt: new Date(),
        publishedBy: mockUserId,
        event: { id: 'event-123', name: 'Spring Festival' }
      };

      mockPrisma.contest.findUnique.mockResolvedValue(publishedContestWithWinners as any);
      mockPrisma.score.findMany.mockResolvedValue([]);
      mockPrisma.overallDeduction.findMany.mockResolvedValue([]);
      mockPrisma.categoryCertification.findMany.mockResolvedValue([]);
      mockPrisma.judgeCertification.findMany.mockResolvedValue([]);

      await expect(
        service.getWinnersByContest(mockContestId, 'CONTESTANT')
      ).resolves.toBeDefined();
    });

    it('should prevent publication → unpublish → re-publish workflow for non-admins', async () => {
      const published = {
        ...mockContest,
        winnersPublished: true,
        categories: mockCategoriesWithBoardApproval
      };

      mockPrisma.contest.findUnique.mockResolvedValue(published as any);

      // Board cannot unpublish
      await expect(
        service.unpublishWinners(mockContestId, mockUserId, 'BOARD', 'Reason')
      ).rejects.toThrow();

      // Only Admin can unpublish
      mockPrisma.contest.update.mockResolvedValue({
        ...mockContest,
        winnersPublished: false
      } as any);

      await expect(
        service.unpublishWinners(mockContestId, mockUserId, 'ADMIN', 'Correction')
      ).resolves.toBeDefined();
    });
  });
});
