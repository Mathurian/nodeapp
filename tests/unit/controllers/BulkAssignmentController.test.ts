/**
 * BulkAssignmentController Unit Tests
 * Focused coverage for bulk assignment delete request handling
 */

import 'reflect-metadata';
import { Request, Response } from 'express';
import { BulkAssignmentController } from '../../../src/controllers/BulkAssignmentController';
import { BulkOperationService } from '../../../src/services/BulkOperationService';
import { AssignmentService } from '../../../src/services/AssignmentService';

describe('BulkAssignmentController', () => {
  let controller: BulkAssignmentController;
  let bulkOperationService: jest.Mocked<BulkOperationService>;
  let assignmentService: jest.Mocked<AssignmentService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    bulkOperationService = {
      executeBulkOperation: jest.fn(),
    } as any;
    assignmentService = {
      deleteAssignment: jest.fn(),
      removeContestantFromCategory: jest.fn(),
      removeTallyMasterAssignment: jest.fn(),
      removeAuditorAssignment: jest.fn(),
    } as any;
    controller = new BulkAssignmentController(bulkOperationService, assignmentService);

    req = {
      body: {},
      params: {},
      query: {},
      tenantId: 'tenant-1',
      user: { id: 'user-1', role: 'ADMIN', tenantId: 'tenant-1' }
    } as any;
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis()
    };
    jest.clearAllMocks();
  });

  describe('deleteAssignments', () => {
    it('uses the legacy judge assignmentIds payload', async () => {
      req.body = {
        assignmentIds: ['assign-1', 'assign-2'],
      };
      bulkOperationService.executeBulkOperation.mockImplementation(async (operation, items) => {
        for (const item of items as Array<{ id: string }>) {
          await operation(item);
        }
        return {
          total: items.length,
          successful: items.length,
          failed: 0,
          errors: [],
        };
      });

      await controller.deleteAssignments(req as Request, res as Response);

      expect(assignmentService.deleteAssignment).toHaveBeenNthCalledWith(
        1,
        'assign-1',
        'tenant-1'
      );
      expect(assignmentService.deleteAssignment).toHaveBeenNthCalledWith(
        2,
        'assign-2',
        'tenant-1'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentType: 'judge',
          result: expect.objectContaining({
            total: 2,
            successful: 2,
            failed: 0,
          }),
        })
      );
    });

    it('removes contestant assignments using categoryId and contestantId pairs', async () => {
      req.body = {
        assignmentType: 'contestant',
        items: [
          { id: 'contestant_cat-1_cont-1', categoryId: 'cat-1', contestantId: 'cont-1' },
        ],
      };
      bulkOperationService.executeBulkOperation.mockImplementation(async (operation, items) => {
        for (const item of items as Array<{ categoryId: string; contestantId: string }>) {
          await operation(item);
        }
        return {
          total: items.length,
          successful: items.length,
          failed: 0,
          errors: [],
        };
      });

      await controller.deleteAssignments(req as Request, res as Response);

      expect(assignmentService.removeContestantFromCategory).toHaveBeenCalledWith(
        'cat-1',
        'cont-1',
        'tenant-1'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          assignmentType: 'contestant',
        })
      );
    });

    it('returns 400 for invalid contestant bulk delete payloads', async () => {
      req.body = {
        assignmentType: 'contestant',
        items: [{ id: 'broken-item' }],
      };

      await controller.deleteAssignments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Contestant bulk delete items must include categoryId and contestantId'
      });
      expect(bulkOperationService.executeBulkOperation).not.toHaveBeenCalled();
    });

    it('returns 400 when tenant context is missing', async () => {
      req.tenantId = undefined;
      req.user = { id: 'user-1', role: 'ADMIN', tenantId: undefined } as any;
      req.body = {
        assignmentType: 'judge',
        items: [{ id: 'assign-1' }],
      };

      await controller.deleteAssignments(req as Request, res as Response);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Tenant context is required'
      });
    });
  });
});
