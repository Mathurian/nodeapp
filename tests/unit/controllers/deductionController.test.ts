/**
 * DeductionController Unit Tests
 */

import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import { DeductionController } from '../../../src/controllers/deductionController';
import { DeductionService } from '../../../src/services/DeductionService';
import { sendSuccess, sendCreated } from '../../../src/utils/responseHelpers';
import { container } from 'tsyringe';

jest.mock('../../../src/utils/responseHelpers');
jest.mock('../../../src/services/DeductionService');

describe('DeductionController', () => {
  let controller: DeductionController;
  let mockService: jest.Mocked<DeductionService>;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.MockedFunction<NextFunction>;

  beforeEach(() => {
    jest.clearAllMocks();

    (sendSuccess as jest.Mock).mockImplementation((res, data, message) => {
      return res.json({ success: true, data, message });
    });

    (sendCreated as jest.Mock).mockImplementation((res, data, message) => {
      return res.status(201).json({ success: true, data, message });
    });

    mockService = {
      createDeductionRequest: jest.fn(),
      getPendingDeductions: jest.fn(),
      approveDeduction: jest.fn(),
      rejectDeduction: jest.fn(),
      getApprovalStatus: jest.fn(),
      getDeductionHistory: jest.fn(),
    } as any;

    (container.resolve as jest.Mock) = jest.fn(() => mockService);

    controller = new DeductionController();

    mockReq = {
      params: {},
      body: {},
      query: {},
      user: { id: 'user-1', role: 'JUDGE' },
    } as any;

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    mockNext = jest.fn();
  });

  describe('createDeductionRequest', () => {
    it('should create deduction request successfully', async () => {
      mockReq.body = {
        contestantId: 'cont-1',
        categoryId: 'cat-1',
        amount: '5.5',
        reason: 'Late arrival penalty',
      };
      const mockDeduction = { id: 'ded-1', amount: 5.5 };
      mockService.createDeductionRequest.mockResolvedValue(mockDeduction as any);

      await controller.createDeductionRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.createDeductionRequest).toHaveBeenCalledWith({
        contestantId: 'cont-1',
        categoryId: 'cat-1',
        amount: 5.5,
        reason: 'Late arrival penalty',
        requestedBy: 'user-1',
      });
      expect(sendCreated).toHaveBeenCalledWith(mockRes, mockDeduction, 'Deduction request created successfully');
    });

    it('should parse amount as float', async () => {
      mockReq.body = {
        contestantId: 'cont-1',
        categoryId: 'cat-1',
        amount: '10.75',
        reason: 'Costume violation',
      };
      mockService.createDeductionRequest.mockResolvedValue({ id: 'ded-2' } as any);

      await controller.createDeductionRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.createDeductionRequest).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 10.75 })
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.body = { contestantId: 'cont-1', categoryId: 'cat-1', amount: '5', reason: 'Test' };
      const error = new Error('Creation failed');
      mockService.createDeductionRequest.mockRejectedValue(error);

      await controller.createDeductionRequest(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getPendingDeductions', () => {
    it('should get pending deductions for user', async () => {
      mockReq.user = { id: 'user-1', role: 'TALLY_MASTER' };
      const mockDeductions = [
        { id: 'ded-1', amount: 5.5, status: 'PENDING' },
        { id: 'ded-2', amount: 3.0, status: 'PENDING' },
      ];
      mockService.getPendingDeductions.mockResolvedValue(mockDeductions as any);

      await controller.getPendingDeductions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getPendingDeductions).toHaveBeenCalledWith('TALLY_MASTER', 'user-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockDeductions, 'Pending deductions retrieved successfully');
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('Retrieval failed');
      mockService.getPendingDeductions.mockRejectedValue(error);

      await controller.getPendingDeductions(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('approveDeduction', () => {
    it('should approve deduction successfully', async () => {
      mockReq.params = { id: 'ded-1' };
      mockReq.body = { signature: 'John Doe', notes: 'Approved by board' };
      mockReq.user = { id: 'user-1', role: 'BOARD_MEMBER' };
      const mockResult = { id: 'ded-1', status: 'APPROVED', message: 'Deduction approved' };
      mockService.approveDeduction.mockResolvedValue(mockResult as any);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.approveDeduction).toHaveBeenCalledWith(
        'ded-1',
        'user-1',
        'BOARD_MEMBER',
        'John Doe',
        'Approved by board'
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Deduction approved');
    });

    it('should handle approval without notes', async () => {
      mockReq.params = { id: 'ded-2' };
      mockReq.body = { signature: 'Jane Smith' };
      mockService.approveDeduction.mockResolvedValue({ message: 'Approved' } as any);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.approveDeduction).toHaveBeenCalledWith(
        'ded-2',
        'user-1',
        'JUDGE',
        'Jane Smith',
        undefined
      );
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'ded-1' };
      mockReq.body = { signature: 'Test' };
      const error = new Error('Approval failed');
      mockService.approveDeduction.mockRejectedValue(error);

      await controller.approveDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('rejectDeduction', () => {
    it('should reject deduction successfully', async () => {
      mockReq.params = { id: 'ded-1' };
      mockReq.body = { reason: 'Invalid penalty' };
      mockService.rejectDeduction.mockResolvedValue(undefined);

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.rejectDeduction).toHaveBeenCalledWith('ded-1', 'user-1', 'Invalid penalty');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, null, 'Deduction rejected successfully');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'ded-1' };
      mockReq.body = { reason: 'Test' };
      const error = new Error('Rejection failed');
      mockService.rejectDeduction.mockRejectedValue(error);

      await controller.rejectDeduction(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getApprovalStatus', () => {
    it('should get approval status', async () => {
      mockReq.params = { id: 'ded-1' };
      const mockStatus = {
        id: 'ded-1',
        status: 'APPROVED',
        approvedBy: 'user-2',
        approvedAt: new Date(),
      };
      mockService.getApprovalStatus.mockResolvedValue(mockStatus as any);

      await controller.getApprovalStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getApprovalStatus).toHaveBeenCalledWith('ded-1');
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockStatus, 'Approval status retrieved successfully');
    });

    it('should call next with error when service throws', async () => {
      mockReq.params = { id: 'ded-1' };
      const error = new Error('Status retrieval failed');
      mockService.getApprovalStatus.mockRejectedValue(error);

      await controller.getApprovalStatus(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('getDeductionHistory', () => {
    it('should get deduction history with default pagination', async () => {
      const mockResult = {
        deductions: [{ id: 'ded-1' }, { id: 'ded-2' }],
        total: 2,
        page: 1,
        limit: 50,
      };
      mockService.getDeductionHistory.mockResolvedValue(mockResult as any);

      await controller.getDeductionHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getDeductionHistory).toHaveBeenCalledWith(
        {
          status: undefined,
          categoryId: undefined,
          contestantId: undefined,
        },
        1,
        50
      );
      expect(sendSuccess).toHaveBeenCalledWith(mockRes, mockResult, 'Deduction history retrieved successfully');
    });

    it('should get deduction history with filters', async () => {
      mockReq.query = {
        page: '2',
        limit: '25',
        status: 'APPROVED',
        categoryId: 'cat-1',
        contestantId: 'cont-1',
      };
      mockService.getDeductionHistory.mockResolvedValue({ deductions: [], total: 0 } as any);

      await controller.getDeductionHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockService.getDeductionHistory).toHaveBeenCalledWith(
        {
          status: 'APPROVED',
          categoryId: 'cat-1',
          contestantId: 'cont-1',
        },
        2,
        25
      );
    });

    it('should call next with error when service throws', async () => {
      const error = new Error('History retrieval failed');
      mockService.getDeductionHistory.mockRejectedValue(error);

      await controller.getDeductionHistory(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
