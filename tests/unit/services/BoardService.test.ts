/**
 * BoardService Tests
 *
 * Comprehensive test suite for board-level functionality including final
 * approval workflow, certification management, and emcee script oversight.
 *
 * Test Coverage:
 * - Dashboard statistics
 * - Certification approval/rejection
 * - Certification status tracking
 * - Emcee script management
 * - Score removal request handling
 * - Final board approval workflow
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { BoardService } from '../../src/services/BoardService';
import { NotFoundError, ValidationError } from '../../src/services/BaseService';

describe('BoardService', () => {
  let service: BoardService;
  let prismaMock: MockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mock<PrismaClient>();
    service = new BoardService(prismaMock as any);
  });

  describe('getStats', () => {
    it('should return board dashboard statistics', async () => {
      const mockCategories = [
        { certifications: [{ type: 'FINAL' }] },
        { certifications: [] },
        { certifications: [{ type: 'TALLY_MASTER' }] },
      ];

      prismaMock.contest.count.mockResolvedValue(10);
      prismaMock.category.count.mockResolvedValue(3);
      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getStats();

      expect(result).toEqual({
        contests: 10,
        categories: 3,
        certified: 1,
        pending: 2,
      });
    });

    it('should handle zero counts', async () => {
      prismaMock.contest.count.mockResolvedValue(0);
      prismaMock.category.count.mockResolvedValue(0);
      prismaMock.category.findMany.mockResolvedValue([]);

      const result = await service.getStats();

      expect(result).toEqual({
        contests: 0,
        categories: 0,
        certified: 0,
        pending: 0,
      });
    });
  });

  describe('getCertifications', () => {
    it('should return categories with final certifications', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Solo',
          contest: { id: 'c1', event: { id: 'e1' } },
          scores: [],
          certifications: [{ type: 'FINAL' }],
        },
        {
          id: 'cat2',
          certifications: [{ type: 'TALLY_MASTER' }],
        },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getCertifications();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cat1');
    });

    it('should exclude categories without final certification', async () => {
      const mockCategories = [
        { certifications: [{ type: 'TALLY_MASTER' }] },
        { certifications: [] },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getCertifications();

      expect(result).toEqual([]);
    });
  });

  describe('approveCertification', () => {
    it('should approve category certification', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', event: { id: 'e1' } },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.category.update.mockResolvedValue({
        ...mockCategory,
        boardApproved: true,
      } as any);

      const result = await service.approveCertification('cat1');

      expect(result.message).toBe('Certification approved');
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 'cat1' },
        data: { boardApproved: true },
      });
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(service.approveCertification('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should return category in response', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', event: { id: 'e1' } },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.category.update.mockResolvedValue(mockCategory as any);

      const result = await service.approveCertification('cat1');

      expect(result.category).toEqual(mockCategory);
    });
  });

  describe('rejectCertification', () => {
    it('should reject category certification with reason', async () => {
      const mockCategory = {
        id: 'cat1',
        name: 'Solo',
        contest: { id: 'c1', event: { id: 'e1' } },
      };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.category.update.mockResolvedValue({
        ...mockCategory,
        boardApproved: false,
        rejectionReason: 'Incomplete scores',
      } as any);

      const result = await service.rejectCertification('cat1', 'Incomplete scores');

      expect(result.message).toBe('Certification rejected');
      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 'cat1' },
        data: {
          boardApproved: false,
          rejectionReason: 'Incomplete scores',
        },
      });
    });

    it('should handle rejection without reason', async () => {
      const mockCategory = { id: 'cat1', contest: { id: 'c1', event: { id: 'e1' } } };

      prismaMock.category.findUnique.mockResolvedValue(mockCategory as any);
      prismaMock.category.update.mockResolvedValue(mockCategory as any);

      await service.rejectCertification('cat1');

      expect(prismaMock.category.update).toHaveBeenCalledWith({
        where: { id: 'cat1' },
        data: {
          boardApproved: false,
          rejectionReason: undefined,
        },
      });
    });

    it('should throw NotFoundError when category does not exist', async () => {
      prismaMock.category.findUnique.mockResolvedValue(null);

      await expect(
        service.rejectCertification('nonexistent', 'reason')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getCertificationStatus', () => {
    it('should return certification status summary', async () => {
      const mockCategories = [
        { certifications: [{ status: 'CERTIFIED' }] },
        { certifications: [{ status: 'PENDING' }] },
        { certifications: [] },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);

      const result = await service.getCertificationStatus();

      expect(result.total).toBe(3);
      expect(result.certified).toBe(1);
      expect(result.pending).toBe(2);
    });

    it('should handle empty categories', async () => {
      prismaMock.category.findMany.mockResolvedValue([]);

      const result = await service.getCertificationStatus();

      expect(result).toEqual({
        total: 0,
        pending: 0,
        certified: 0,
        approved: 0,
      });
    });
  });

  describe('getEmceeScripts', () => {
    it('should retrieve all emcee scripts', async () => {
      const mockScripts = [
        { id: 's1', title: 'Opening' },
        { id: 's2', title: 'Closing' },
      ];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getEmceeScripts();

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no scripts exist', async () => {
      prismaMock.emceeScript.findMany.mockResolvedValue([]);

      const result = await service.getEmceeScripts();

      expect(result).toEqual([]);
    });
  });

  describe('createEmceeScript', () => {
    it('should create a new emcee script', async () => {
      const mockScript = {
        id: 's1',
        title: 'Opening Ceremony',
        content: 'Welcome everyone...',
        isActive: true,
      };

      prismaMock.emceeScript.create.mockResolvedValue(mockScript as any);

      const result = await service.createEmceeScript({
        title: 'Opening Ceremony',
        content: 'Welcome everyone...',
        userId: 'u1',
      });

      expect(result).toEqual(mockScript);
      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: {
          title: 'Opening Ceremony',
          content: 'Welcome everyone...',
          type: undefined,
          eventId: undefined,
          contestId: undefined,
          categoryId: undefined,
          order: 0,
          notes: undefined,
          isActive: true,
          createdBy: 'u1',
        },
      });
    });

    it('should throw ValidationError when title is missing', async () => {
      await expect(
        service.createEmceeScript({ title: '', content: 'Test', userId: 'u1' } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when content is missing', async () => {
      await expect(
        service.createEmceeScript({ title: 'Test', content: '', userId: 'u1' } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should set custom order and relations', async () => {
      prismaMock.emceeScript.create.mockResolvedValue({} as any);

      await service.createEmceeScript({
        title: 'Script',
        content: 'Content',
        eventId: 'e1',
        contestId: 'c1',
        categoryId: 'cat1',
        order: 5,
        userId: 'u1',
      });

      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'e1',
          contestId: 'c1',
          categoryId: 'cat1',
          order: 5,
        }),
      });
    });

    it('should set notes and type', async () => {
      prismaMock.emceeScript.create.mockResolvedValue({} as any);

      await service.createEmceeScript({
        title: 'Script',
        content: 'Content',
        type: 'OPENING',
        notes: 'Important notes',
        userId: 'u1',
      });

      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: 'OPENING',
          notes: 'Important notes',
        }),
      });
    });
  });

  describe('updateEmceeScript', () => {
    it('should update emcee script properties', async () => {
      const mockUpdated = {
        id: 's1',
        title: 'Updated Title',
        content: 'Updated content',
      };

      prismaMock.emceeScript.update.mockResolvedValue(mockUpdated as any);

      const result = await service.updateEmceeScript('s1', {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(result).toEqual(mockUpdated);
      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          title: 'Updated Title',
          content: 'Updated content',
        },
      });
    });

    it('should update isActive status', async () => {
      prismaMock.emceeScript.update.mockResolvedValue({} as any);

      await service.updateEmceeScript('s1', { isActive: false });

      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { isActive: false },
      });
    });

    it('should update order', async () => {
      prismaMock.emceeScript.update.mockResolvedValue({} as any);

      await service.updateEmceeScript('s1', { order: 10 });

      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { order: 10 },
      });
    });
  });

  describe('deleteEmceeScript', () => {
    it('should delete an emcee script', async () => {
      prismaMock.emceeScript.delete.mockResolvedValue({} as any);

      const result = await service.deleteEmceeScript('s1');

      expect(result.message).toBe('Emcee script deleted successfully');
      expect(prismaMock.emceeScript.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
    });

    it('should propagate Prisma errors', async () => {
      prismaMock.emceeScript.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.deleteEmceeScript('nonexistent')).rejects.toThrow('Record not found');
    });
  });

  describe('getScoreRemovalRequests', () => {
    it('should retrieve score removal requests', async () => {
      const mockRequests = [
        {
          id: 'req1',
          judge: { id: 'j1', name: 'Judge One' },
          category: {
            id: 'cat1',
            contest: { id: 'c1', event: { id: 'e1' } },
          },
          score: { id: 's1', contestant: { id: 'cont1' } },
        },
      ];

      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue(mockRequests as any);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(1);

      const result = await service.getScoreRemovalRequests();

      expect(result.requests).toEqual(mockRequests);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        pages: 1,
      });
    });

    it('should filter by status', async () => {
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(0);

      await service.getScoreRemovalRequests('PENDING');

      expect(prismaMock.judgeScoreRemovalRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: 'PENDING' },
        })
      );
    });

    it('should handle pagination', async () => {
      prismaMock.judgeScoreRemovalRequest.findMany.mockResolvedValue([]);
      prismaMock.judgeScoreRemovalRequest.count.mockResolvedValue(45);

      const result = await service.getScoreRemovalRequests(undefined, 2, 20);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        pages: 3,
      });
    });
  });

  describe('approveScoreRemoval', () => {
    it('should approve and execute score removal', async () => {
      const mockRequest = {
        id: 'req1',
        scoreId: 's1',
        score: { id: 's1' },
      };

      prismaMock.judgeScoreRemovalRequest.findUnique.mockResolvedValue(mockRequest as any);
      prismaMock.score.delete.mockResolvedValue({} as any);
      prismaMock.judgeScoreRemovalRequest.update.mockResolvedValue({
        ...mockRequest,
        status: 'APPROVED',
      } as any);

      const result = await service.approveScoreRemoval('req1', 'u1', 'Approved');

      expect(result.status).toBe('APPROVED');
      expect(prismaMock.score.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
      expect(prismaMock.judgeScoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: {
          status: 'APPROVED',
          approvedBy: 'u1',
          approvedAt: expect.any(Date),
          reason: 'Approved',
        },
      });
    });

    it('should throw NotFoundError when request does not exist', async () => {
      prismaMock.judgeScoreRemovalRequest.findUnique.mockResolvedValue(null);

      await expect(
        service.approveScoreRemoval('nonexistent', 'u1')
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('rejectScoreRemoval', () => {
    it('should reject score removal request', async () => {
      const mockUpdated = {
        id: 'req1',
        status: 'REJECTED',
        rejectedBy: 'u1',
        reason: 'Invalid request',
      };

      prismaMock.judgeScoreRemovalRequest.update.mockResolvedValue(mockUpdated as any);

      const result = await service.rejectScoreRemoval('req1', 'u1', 'Invalid request');

      expect(result.status).toBe('REJECTED');
      expect(prismaMock.judgeScoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: {
          status: 'REJECTED',
          rejectedBy: 'u1',
          rejectedAt: expect.any(Date),
          reason: 'Invalid request',
        },
      });
    });

    it('should handle rejection without reason', async () => {
      prismaMock.judgeScoreRemovalRequest.update.mockResolvedValue({} as any);

      await service.rejectScoreRemoval('req1', 'u1');

      expect(prismaMock.judgeScoreRemovalRequest.update).toHaveBeenCalledWith({
        where: { id: 'req1' },
        data: expect.objectContaining({
          status: 'REJECTED',
          reason: undefined,
        }),
      });
    });
  });
});
