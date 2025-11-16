/**
 * BulkOperationService Unit Tests
 * Comprehensive tests for bulk operation service
 */

import 'reflect-metadata';
import { BulkOperationService, BulkOperationResult, BulkOperationOptions } from '../../../src/services/BulkOperationService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';

describe('BulkOperationService', () => {
  let service: BulkOperationService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new BulkOperationService();
    // Replace the prisma instance
    (service as any).prisma = mockPrisma;
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('executeBulkOperation', () => {
    it('should successfully execute bulk operation on all items', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeBulkOperation(operation, items);

      expect(result.total).toBe(5);
      expect(result.successful).toBe(5);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should handle errors and continue when continueOnError is true', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Operation failed'))
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Another failure'))
        .mockResolvedValueOnce(undefined);

      const result = await service.executeBulkOperation(operation, items, { continueOnError: true });

      expect(result.total).toBe(5);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0].error).toBe('Operation failed');
      expect(result.errors[1].error).toBe('Another failure');
    });

    it('should stop execution when continueOnError is false and error occurs', async () => {
      const items = [1, 2, 3, 4, 5];
      const operation = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Operation failed'))
        .mockResolvedValue(undefined);

      await expect(
        service.executeBulkOperation(operation, items, { continueOnError: false })
      ).rejects.toThrow('Operation failed');
    });

    it('should process items in batches with custom batch size', async () => {
      const items = Array.from({ length: 25 }, (_, i) => i + 1);
      const operation = jest.fn().mockResolvedValue(undefined);

      await service.executeBulkOperation(operation, items, { batchSize: 5 });

      expect(operation).toHaveBeenCalledTimes(25);
      expect(operation).toHaveBeenNthCalledWith(1, 1);
      expect(operation).toHaveBeenNthCalledWith(5, 5);
      expect(operation).toHaveBeenNthCalledWith(25, 25);
    });

    it('should use default batch size of 10 when not specified', async () => {
      const items = Array.from({ length: 15 }, (_, i) => i + 1);
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeBulkOperation(operation, items);

      expect(result.total).toBe(15);
      expect(result.successful).toBe(15);
      expect(operation).toHaveBeenCalledTimes(15);
    });

    it('should handle empty items array', async () => {
      const items: number[] = [];
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeBulkOperation(operation, items);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(operation).not.toHaveBeenCalled();
    });

    it('should handle non-Error thrown values', async () => {
      const items = [1, 2];
      const operation = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce('String error');

      const result = await service.executeBulkOperation(operation, items, { continueOnError: true });

      expect(result.failed).toBe(1);
      expect(result.errors[0].error).toBe('String error');
    });

    it('should track which items failed with their errors', async () => {
      const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
      const operation = jest.fn()
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Error for item 2'))
        .mockResolvedValueOnce(undefined);

      const result = await service.executeBulkOperation(operation, items, { continueOnError: true });

      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].item).toEqual({ id: 2 });
      expect(result.errors[0].error).toBe('Error for item 2');
    });
  });

  describe('executeBulkOperationWithTransaction', () => {
    it('should execute operation within a transaction successfully', async () => {
      const items = [1, 2, 3];
      const operation = jest.fn().mockResolvedValue(undefined);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });

      await service.executeBulkOperationWithTransaction(operation, items);

      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
      expect(operation).toHaveBeenCalledWith(items, mockPrisma);
    });

    it('should rollback transaction when operation fails', async () => {
      const items = [1, 2, 3];
      const operation = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });

      await expect(
        service.executeBulkOperationWithTransaction(operation, items)
      ).rejects.toThrow('Transaction failed');
    });

    it('should pass transaction context to operation', async () => {
      const items = ['a', 'b', 'c'];
      let receivedTx: any;
      const operation = jest.fn().mockImplementation((items, tx) => {
        receivedTx = tx;
        return Promise.resolve();
      });

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        return await callback(mockPrisma);
      });

      await service.executeBulkOperationWithTransaction(operation, items);

      expect(receivedTx).toBe(mockPrisma);
    });
  });

  describe('bulkCreate', () => {
    it('should successfully bulk create records', async () => {
      const data = [
        { name: 'Item 1', value: 100 },
        { name: 'Item 2', value: 200 },
        { name: 'Item 3', value: 300 }
      ];

      (mockPrisma as any).testModel = {
        createMany: jest.fn().mockResolvedValue({ count: 3 })
      };

      const result = await service.bulkCreate('testModel', data);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect((mockPrisma as any).testModel.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true
      });
    });

    it('should handle bulk create failure', async () => {
      const data = [{ name: 'Item 1' }];

      (mockPrisma as any).testModel = {
        createMany: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      const result = await service.bulkCreate('testModel', data);

      expect(result.total).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Database error');
    });

    it('should skip duplicates when creating records', async () => {
      const data = [
        { email: 'test1@example.com', name: 'User 1' },
        { email: 'test2@example.com', name: 'User 2' }
      ];

      (mockPrisma as any).user = {
        createMany: jest.fn().mockResolvedValue({ count: 1 }) // Only 1 created, 1 was duplicate
      };

      const result = await service.bulkCreate('user', data);

      expect(result.successful).toBe(1);
      expect((mockPrisma as any).user.createMany).toHaveBeenCalledWith({
        data,
        skipDuplicates: true
      });
    });

    it('should handle empty data array for bulk create', async () => {
      const data: any[] = [];

      (mockPrisma as any).testModel = {
        createMany: jest.fn().mockResolvedValue({ count: 0 })
      };

      const result = await service.bulkCreate('testModel', data);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
    });
  });

  describe('bulkUpdate', () => {
    it('should successfully bulk update records', async () => {
      const updates = [
        { id: '1', data: { name: 'Updated 1' } },
        { id: '2', data: { name: 'Updated 2' } },
        { id: '3', data: { name: 'Updated 3' } }
      ];

      (mockPrisma as any).testModel = {
        update: jest.fn().mockResolvedValue({})
      };

      const result = await service.bulkUpdate('testModel', updates);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect((mockPrisma as any).testModel.update).toHaveBeenCalledTimes(3);
    });

    it('should continue updating even when some fail', async () => {
      const updates = [
        { id: '1', data: { name: 'Updated 1' } },
        { id: '2', data: { name: 'Updated 2' } },
        { id: '3', data: { name: 'Updated 3' } }
      ];

      (mockPrisma as any).testModel = {
        update: jest.fn()
          .mockResolvedValueOnce({})
          .mockRejectedValueOnce(new Error('Record not found'))
          .mockResolvedValueOnce({})
      };

      const result = await service.bulkUpdate('testModel', updates);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should call update with correct parameters', async () => {
      const updates = [{ id: 'test-id', data: { name: 'Test Name', active: true } }];

      (mockPrisma as any).testModel = {
        update: jest.fn().mockResolvedValue({})
      };

      await service.bulkUpdate('testModel', updates);

      expect((mockPrisma as any).testModel.update).toHaveBeenCalledWith({
        where: { id: 'test-id' },
        data: { name: 'Test Name', active: true }
      });
    });
  });

  describe('bulkDelete', () => {
    it('should successfully bulk delete records', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      (mockPrisma as any).testModel = {
        deleteMany: jest.fn().mockResolvedValue({ count: 3 })
      };

      const result = await service.bulkDelete('testModel', ids);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect((mockPrisma as any).testModel.deleteMany).toHaveBeenCalledWith({
        where: { id: { in: ids } }
      });
    });

    it('should handle bulk delete failure', async () => {
      const ids = ['id-1', 'id-2'];

      (mockPrisma as any).testModel = {
        deleteMany: jest.fn().mockRejectedValue(new Error('Foreign key constraint'))
      };

      const result = await service.bulkDelete('testModel', ids);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].error).toBe('Foreign key constraint');
    });

    it('should handle partial deletion', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      (mockPrisma as any).testModel = {
        deleteMany: jest.fn().mockResolvedValue({ count: 2 }) // Only 2 deleted
      };

      const result = await service.bulkDelete('testModel', ids);

      expect(result.successful).toBe(2);
    });

    it('should handle empty ids array', async () => {
      const ids: string[] = [];

      (mockPrisma as any).testModel = {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 })
      };

      const result = await service.bulkDelete('testModel', ids);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
    });
  });

  describe('bulkSoftDelete', () => {
    it('should successfully soft delete records by setting active to false', async () => {
      const ids = ['id-1', 'id-2', 'id-3'];

      (mockPrisma as any).testModel = {
        updateMany: jest.fn().mockResolvedValue({ count: 3 })
      };

      const result = await service.bulkSoftDelete('testModel', ids);

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
      expect(result.failed).toBe(0);
      expect((mockPrisma as any).testModel.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ids } },
        data: { active: false }
      });
    });

    it('should handle soft delete failure', async () => {
      const ids = ['id-1', 'id-2'];

      (mockPrisma as any).testModel = {
        updateMany: jest.fn().mockRejectedValue(new Error('Database error'))
      };

      const result = await service.bulkSoftDelete('testModel', ids);

      expect(result.total).toBe(2);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(2);
      expect(result.errors).toHaveLength(1);
    });

    it('should update active field to false', async () => {
      const ids = ['test-id'];

      (mockPrisma as any).testModel = {
        updateMany: jest.fn().mockResolvedValue({ count: 1 })
      };

      await service.bulkSoftDelete('testModel', ids);

      expect((mockPrisma as any).testModel.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { active: false }
        })
      );
    });

    it('should handle partial soft delete', async () => {
      const ids = ['id-1', 'id-2', 'id-3', 'id-4'];

      (mockPrisma as any).testModel = {
        updateMany: jest.fn().mockResolvedValue({ count: 2 })
      };

      const result = await service.bulkSoftDelete('testModel', ids);

      expect(result.total).toBe(4);
      expect(result.successful).toBe(2);
    });

    it('should handle empty ids array for soft delete', async () => {
      const ids: string[] = [];

      (mockPrisma as any).testModel = {
        updateMany: jest.fn().mockResolvedValue({ count: 0 })
      };

      const result = await service.bulkSoftDelete('testModel', ids);

      expect(result.total).toBe(0);
      expect(result.successful).toBe(0);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle very large batch sizes', async () => {
      const items = Array.from({ length: 1000 }, (_, i) => i);
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeBulkOperation(operation, items, { batchSize: 100 });

      expect(result.total).toBe(1000);
      expect(result.successful).toBe(1000);
      expect(operation).toHaveBeenCalledTimes(1000);
    });

    it('should handle single item batch size', async () => {
      const items = [1, 2, 3];
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeBulkOperation(operation, items, { batchSize: 1 });

      expect(result.total).toBe(3);
      expect(result.successful).toBe(3);
    });

    it('should handle complex data types in bulk operations', async () => {
      const complexItems = [
        { nested: { data: { value: 1 } }, array: [1, 2, 3] },
        { nested: { data: { value: 2 } }, array: [4, 5, 6] }
      ];
      const operation = jest.fn().mockResolvedValue(undefined);

      const result = await service.executeBulkOperation(operation, complexItems);

      expect(result.successful).toBe(2);
      expect(operation).toHaveBeenCalledWith(complexItems[0]);
      expect(operation).toHaveBeenCalledWith(complexItems[1]);
    });

    it('should use default continueOnError value of true', async () => {
      const items = [1, 2, 3];
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce(undefined);

      const result = await service.executeBulkOperation(operation, items);

      expect(result.successful).toBe(2);
      expect(result.failed).toBe(1);
    });
  });
});
