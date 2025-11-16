/**
 * DeductionService Tests
 *
 * Comprehensive test suite for deduction request workflow including
 * multi-role approval system (judges, head judge, tally, auditor).
 *
 * Test Coverage:
 * - Deduction request creation
 * - Pending deductions by role
 * - Multi-role approval workflow
 * - Approval status tracking
 * - Deduction rejection
 * - Deduction history with filters
 * - Full approval chain
 * - Score application after approval
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { DeductionService } from '../../src/services/DeductionService';
import { DeductionRepository } from '../../src/repositories/DeductionRepository';
import { NotFoundError, ValidationError } from '../../src/services/BaseService';

describe('DeductionService', () => {
  let service: DeductionService;
  let deductionRepoMock: MockProxy<DeductionRepository>;
  let prismaMock: MockProxy<PrismaClient>;

  beforeEach(() => {
    deductionRepoMock = mock<DeductionRepository>();
    prismaMock = mock<PrismaClient>();
    service = new DeductionService(deductionRepoMock as any);
  });

  describe('createDeductionRequest', () => {
    it('should create a new deduction request', async () => {
      const contestantMock = { id: 'cont1', name: 'Alice' };
      const categoryMock = { id: 'cat1', name: 'Solo' };
      const mockDeduction = {
        id: 'ded1',
        contestantId: 'cont1',
        categoryId: 'cat1',
        amount: 5,
        reason: 'Late entry',
        requestedBy: 'u1',
        status: 'PENDING',
      };

      (prismaMock as any).contestant = { findUnique: vi.fn().mockResolvedValue(contestantMock) };
      (prismaMock as any).category = { findUnique: vi.fn().mockResolvedValue(categoryMock) };
      deductionRepoMock.createDeduction.mockResolvedValue(mockDeduction as any);

      const result = await service.createDeductionRequest({
        contestantId: 'cont1',
        categoryId: 'cat1',
        amount: 5,
        reason: 'Late entry',
        requestedBy: 'u1',
      });

      expect(result).toEqual(mockDeduction);
      expect(deductionRepoMock.createDeduction).toHaveBeenCalledWith({
        contestantId: 'cont1',
        categoryId: 'cat1',
        amount: 5,
        reason: 'Late entry',
        requestedBy: 'u1',
      });
    });

    it('should throw ValidationError when required fields are missing', async () => {
      await expect(
        service.createDeductionRequest({
          contestantId: '',
          categoryId: 'cat1',
          amount: 5,
          reason: 'Test',
          requestedBy: 'u1',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when amount is zero or negative', async () => {
      (prismaMock as any).contestant = { findUnique: vi.fn().mockResolvedValue({ id: 'cont1' }) };
      (prismaMock as any).category = { findUnique: vi.fn().mockResolvedValue({ id: 'cat1' }) };

      await expect(
        service.createDeductionRequest({
          contestantId: 'cont1',
          categoryId: 'cat1',
          amount: 0,
          reason: 'Test',
          requestedBy: 'u1',
        })
      ).rejects.toThrow('Deduction amount must be greater than 0');

      await expect(
        service.createDeductionRequest({
          contestantId: 'cont1',
          categoryId: 'cat1',
          amount: -5,
          reason: 'Test',
          requestedBy: 'u1',
        })
      ).rejects.toThrow('Deduction amount must be greater than 0');
    });

    it('should throw NotFoundError when contestant does not exist', async () => {
      (prismaMock as any).contestant = { findUnique: vi.fn().mockResolvedValue(null) };
      (prismaMock as any).category = { findUnique: vi.fn().mockResolvedValue({ id: 'cat1' }) };

      await expect(
        service.createDeductionRequest({
          contestantId: 'nonexistent',
          categoryId: 'cat1',
          amount: 5,
          reason: 'Test',
          requestedBy: 'u1',
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when category does not exist', async () => {
      (prismaMock as any).contestant = { findUnique: vi.fn().mockResolvedValue({ id: 'cont1' }) };
      (prismaMock as any).category = { findUnique: vi.fn().mockResolvedValue(null) };

      await expect(
        service.createDeductionRequest({
          contestantId: 'cont1',
          categoryId: 'nonexistent',
          amount: 5,
          reason: 'Test',
          requestedBy: 'u1',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe('getPendingDeductions', () => {
    it('should retrieve pending deductions for admin/board roles', async () => {
      const mockDeductions = [
        {
          id: 'ded1',
          amount: 5,
          reason: 'Late',
          status: 'PENDING',
          approvals: [],
        },
      ];

      deductionRepoMock.findPendingWithRelations.mockResolvedValue(mockDeductions as any);

      const result = await service.getPendingDeductions('ADMIN', 'u1');

      expect(result).toHaveLength(1);
      expect(result[0].approvalStatus).toBeDefined();
      expect(deductionRepoMock.findPendingWithRelations).toHaveBeenCalledWith(undefined);
    });

    it('should filter by judge categories', async () => {
      const mockUser = {
        id: 'u1',
        judge: {
          id: 'j1',
          categoryJudges: [
            { categoryId: 'cat1' },
            { categoryId: 'cat2' },
          ],
        },
      };

      (prismaMock as any).user = { findUnique: vi.fn().mockResolvedValue(mockUser) };
      deductionRepoMock.findPendingWithRelations.mockResolvedValue([]);

      await service.getPendingDeductions('JUDGE', 'u1');

      expect(deductionRepoMock.findPendingWithRelations).toHaveBeenCalledWith(['cat1', 'cat2']);
    });

    it('should handle judge with no categories', async () => {
      const mockUser = {
        id: 'u1',
        judge: { id: 'j1', categoryJudges: [] },
      };

      (prismaMock as any).user = { findUnique: vi.fn().mockResolvedValue(mockUser) };
      deductionRepoMock.findPendingWithRelations.mockResolvedValue([]);

      await service.getPendingDeductions('JUDGE', 'u1');

      expect(deductionRepoMock.findPendingWithRelations).toHaveBeenCalledWith([]);
    });

    it('should handle user without judge profile', async () => {
      const mockUser = { id: 'u1', judge: null };

      (prismaMock as any).user = { findUnique: vi.fn().mockResolvedValue(mockUser) };
      deductionRepoMock.findPendingWithRelations.mockResolvedValue([]);

      await service.getPendingDeductions('JUDGE', 'u1');

      expect(deductionRepoMock.findPendingWithRelations).toHaveBeenCalledWith([]);
    });

    it('should add approval status to each deduction', async () => {
      const mockDeductions = [
        {
          id: 'ded1',
          approvals: [
            { role: 'TALLY_MASTER' },
            { role: 'AUDITOR' },
          ],
        },
      ];

      deductionRepoMock.findPendingWithRelations.mockResolvedValue(mockDeductions as any);

      const result = await service.getPendingDeductions('ADMIN', 'u1');

      expect(result[0].approvalStatus.hasTallyMasterApproval).toBe(true);
      expect(result[0].approvalStatus.hasAuditorApproval).toBe(true);
    });
  });

  describe('approveDeduction', () => {
    it('should approve deduction and create approval record', async () => {
      const mockDeduction = {
        id: 'ded1',
        status: 'PENDING',
        contestantId: 'cont1',
        categoryId: 'cat1',
        amount: 5,
        reason: 'Late',
      };

      const mockApproval = {
        id: 'app1',
        deductionRequestId: 'ded1',
        approvedBy: 'u1',
        role: 'TALLY_MASTER',
      };

      const mockApprovals = [
        { role: 'TALLY_MASTER', isHeadJudge: false },
        { role: 'AUDITOR', isHeadJudge: false },
        { role: 'BOARD', isHeadJudge: false },
        { isHeadJudge: true, role: 'JUDGE' },
      ];

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.hasUserApproved.mockResolvedValue(false);
      deductionRepoMock.createApproval.mockResolvedValue(mockApproval as any);
      deductionRepoMock.getApprovals.mockResolvedValue(mockApprovals as any);
      deductionRepoMock.updateStatus.mockResolvedValue(undefined);
      deductionRepoMock.applyDeductionToScores.mockResolvedValue(undefined);

      const result = await service.approveDeduction('ded1', 'u1', 'TALLY_MASTER', 'Signature');

      expect(result.approval).toEqual(mockApproval);
      expect(result.isFullyApproved).toBe(true);
      expect(deductionRepoMock.createApproval).toHaveBeenCalled();
    });

    it('should throw ValidationError when request is not pending', async () => {
      const mockDeduction = { id: 'ded1', status: 'APPROVED' };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);

      await expect(
        service.approveDeduction('ded1', 'u1', 'TALLY_MASTER', 'Signature')
      ).rejects.toThrow('Deduction request is not pending');
    });

    it('should throw ValidationError when user already approved', async () => {
      const mockDeduction = { id: 'ded1', status: 'PENDING' };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.hasUserApproved.mockResolvedValue(true);

      await expect(
        service.approveDeduction('ded1', 'u1', 'TALLY_MASTER', 'Signature')
      ).rejects.toThrow('You have already approved this deduction');
    });

    it('should throw NotFoundError when deduction does not exist', async () => {
      deductionRepoMock.findByIdWithRelations.mockResolvedValue(null);

      await expect(
        service.approveDeduction('nonexistent', 'u1', 'TALLY_MASTER', 'Signature')
      ).rejects.toThrow(NotFoundError);
    });

    it('should not apply deduction when not fully approved', async () => {
      const mockDeduction = {
        id: 'ded1',
        status: 'PENDING',
        contestantId: 'cont1',
        categoryId: 'cat1',
        amount: 5,
        reason: 'Late',
      };

      const mockApprovals = [{ role: 'TALLY_MASTER', isHeadJudge: false }];

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.hasUserApproved.mockResolvedValue(false);
      deductionRepoMock.createApproval.mockResolvedValue({} as any);
      deductionRepoMock.getApprovals.mockResolvedValue(mockApprovals as any);

      const result = await service.approveDeduction('ded1', 'u1', 'TALLY_MASTER', 'Signature');

      expect(result.isFullyApproved).toBe(false);
      expect(deductionRepoMock.applyDeductionToScores).not.toHaveBeenCalled();
    });

    it('should identify head judge correctly', async () => {
      const mockUser = {
        id: 'u1',
        judge: { id: 'j1', isHeadJudge: true },
      };

      const mockDeduction = { id: 'ded1', status: 'PENDING' };

      (prismaMock as any).user = { findUnique: vi.fn().mockResolvedValue(mockUser) };
      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.hasUserApproved.mockResolvedValue(false);
      deductionRepoMock.createApproval.mockResolvedValue({} as any);
      deductionRepoMock.getApprovals.mockResolvedValue([]);

      await service.approveDeduction('ded1', 'u1', 'JUDGE', 'Signature');

      expect(deductionRepoMock.createApproval).toHaveBeenCalledWith(
        'ded1',
        'u1',
        'JUDGE',
        true,
        'Signature',
        undefined
      );
    });

    it('should handle notes in approval', async () => {
      const mockDeduction = { id: 'ded1', status: 'PENDING' };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.hasUserApproved.mockResolvedValue(false);
      deductionRepoMock.createApproval.mockResolvedValue({} as any);
      deductionRepoMock.getApprovals.mockResolvedValue([]);

      await service.approveDeduction('ded1', 'u1', 'TALLY_MASTER', 'Signature', 'Approved notes');

      expect(deductionRepoMock.createApproval).toHaveBeenCalledWith(
        'ded1',
        'u1',
        'TALLY_MASTER',
        false,
        'Signature',
        'Approved notes'
      );
    });

    it('should apply deduction when all required approvals received', async () => {
      const mockDeduction = {
        id: 'ded1',
        status: 'PENDING',
        contestantId: 'cont1',
        categoryId: 'cat1',
        amount: 5,
        reason: 'Late entry',
      };

      const mockApprovals = [
        { role: 'TALLY_MASTER', isHeadJudge: false },
        { role: 'AUDITOR', isHeadJudge: false },
        { role: 'BOARD', isHeadJudge: false },
        { role: 'JUDGE', isHeadJudge: true },
      ];

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.hasUserApproved.mockResolvedValue(false);
      deductionRepoMock.createApproval.mockResolvedValue({} as any);
      deductionRepoMock.getApprovals.mockResolvedValue(mockApprovals as any);
      deductionRepoMock.updateStatus.mockResolvedValue(undefined);
      deductionRepoMock.applyDeductionToScores.mockResolvedValue(undefined);

      await service.approveDeduction('ded1', 'u1', 'BOARD', 'Signature');

      expect(deductionRepoMock.updateStatus).toHaveBeenCalledWith('ded1', 'APPROVED');
      expect(deductionRepoMock.applyDeductionToScores).toHaveBeenCalledWith(
        'cont1',
        'cat1',
        5,
        'Late entry'
      );
    });

    it('should throw ValidationError when signature is missing', async () => {
      await expect(
        service.approveDeduction('ded1', 'u1', 'TALLY_MASTER', '')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('rejectDeduction', () => {
    it('should reject a deduction request', async () => {
      const mockDeduction = { id: 'ded1', status: 'PENDING' };

      deductionRepoMock.findById.mockResolvedValue(mockDeduction as any);
      deductionRepoMock.updateStatus.mockResolvedValue(undefined);

      await service.rejectDeduction('ded1', 'u1', 'Invalid request');

      expect(deductionRepoMock.updateStatus).toHaveBeenCalledWith('ded1', 'REJECTED', {
        rejectionReason: 'Invalid request',
        rejectedBy: 'u1',
        rejectedAt: expect.any(Date),
      });
    });

    it('should throw ValidationError when reason is missing', async () => {
      await expect(
        service.rejectDeduction('ded1', 'u1', '')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw NotFoundError when deduction does not exist', async () => {
      deductionRepoMock.findById.mockResolvedValue(null);

      await expect(
        service.rejectDeduction('nonexistent', 'u1', 'Reason')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when request is not pending', async () => {
      const mockDeduction = { id: 'ded1', status: 'APPROVED' };

      deductionRepoMock.findById.mockResolvedValue(mockDeduction as any);

      await expect(
        service.rejectDeduction('ded1', 'u1', 'Reason')
      ).rejects.toThrow('Deduction request is not pending');
    });
  });

  describe('getApprovalStatus', () => {
    it('should return detailed approval status', async () => {
      const mockDeduction = {
        id: 'ded1',
        amount: 5,
        approvals: [
          { role: 'TALLY_MASTER', isHeadJudge: false },
          { role: 'AUDITOR', isHeadJudge: false },
        ],
      };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);

      const result = await service.getApprovalStatus('ded1');

      expect(result.approvalStatus).toEqual({
        hasHeadJudgeApproval: false,
        hasTallyMasterApproval: true,
        hasAuditorApproval: true,
        hasBoardApproval: false,
        isFullyApproved: false,
        approvalCount: 2,
        requiredApprovals: 4,
      });
    });

    it('should throw NotFoundError when deduction does not exist', async () => {
      deductionRepoMock.findByIdWithRelations.mockResolvedValue(null);

      await expect(service.getApprovalStatus('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should show full approval when all roles have approved', async () => {
      const mockDeduction = {
        id: 'ded1',
        approvals: [
          { role: 'TALLY_MASTER', isHeadJudge: false },
          { role: 'AUDITOR', isHeadJudge: false },
          { role: 'BOARD', isHeadJudge: false },
          { role: 'JUDGE', isHeadJudge: true },
        ],
      };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);

      const result = await service.getApprovalStatus('ded1');

      expect(result.approvalStatus.isFullyApproved).toBe(true);
    });
  });

  describe('getDeductionHistory', () => {
    it('should retrieve deduction history with filters', async () => {
      const mockDeductions = [
        { id: 'ded1', amount: 5, status: 'APPROVED' },
        { id: 'ded2', amount: 10, status: 'PENDING' },
      ];

      deductionRepoMock.findWithFilters.mockResolvedValue({
        deductions: mockDeductions as any,
        total: 2,
      });

      const result = await service.getDeductionHistory({ status: 'APPROVED' }, 1, 50);

      expect(result.deductions).toEqual(mockDeductions);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should calculate pagination correctly', async () => {
      deductionRepoMock.findWithFilters.mockResolvedValue({
        deductions: [],
        total: 125,
      });

      const result = await service.getDeductionHistory({}, 2, 50);

      expect(result.pagination).toEqual({
        page: 2,
        limit: 50,
        total: 125,
        totalPages: 3,
        hasNext: true,
        hasPrev: true,
      });
    });

    it('should handle empty results', async () => {
      deductionRepoMock.findWithFilters.mockResolvedValue({
        deductions: [],
        total: 0,
      });

      const result = await service.getDeductionHistory({});

      expect(result.deductions).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should pass filters to repository', async () => {
      deductionRepoMock.findWithFilters.mockResolvedValue({
        deductions: [],
        total: 0,
      });

      const filters = { categoryId: 'cat1', status: 'PENDING' };
      await service.getDeductionHistory(filters, 1, 50);

      expect(deductionRepoMock.findWithFilters).toHaveBeenCalledWith(filters, 1, 50);
    });
  });

  describe('calculateApprovalStatus', () => {
    it('should identify ADMIN/ORGANIZER as board approval', async () => {
      const mockDeduction = {
        id: 'ded1',
        approvals: [
          { role: 'ADMIN', isHeadJudge: false },
        ],
      };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);

      const result = await service.getApprovalStatus('ded1');

      expect(result.approvalStatus.hasBoardApproval).toBe(true);
    });

    it('should count approvals correctly', async () => {
      const mockDeduction = {
        id: 'ded1',
        approvals: [
          { role: 'TALLY_MASTER' },
          { role: 'AUDITOR' },
          { role: 'JUDGE' },
        ],
      };

      deductionRepoMock.findByIdWithRelations.mockResolvedValue(mockDeduction as any);

      const result = await service.getApprovalStatus('ded1');

      expect(result.approvalStatus.approvalCount).toBe(3);
      expect(result.approvalStatus.requiredApprovals).toBe(4);
    });
  });
});
