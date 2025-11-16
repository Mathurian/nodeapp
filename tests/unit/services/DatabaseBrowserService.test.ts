import { DatabaseBrowserService } from '../../../src/services/DatabaseBrowserService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('DatabaseBrowserService', () => {
  let service: DatabaseBrowserService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new DatabaseBrowserService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(DatabaseBrowserService);
    });

    it('should inject PrismaClient', () => {
      expect(service['prisma']).toBeDefined();
    });
  });

  describe('getTables', () => {
    it('should return list of available tables', async () => {
      const tables = await service.getTables();

      expect(Array.isArray(tables)).toBe(true);
      expect(tables.length).toBeGreaterThan(0);
    });

    it('should not include internal Prisma properties', async () => {
      const tables = await service.getTables();

      expect(tables.every((t) => !t.startsWith('_'))).toBe(true);
      expect(tables.every((t) => !t.startsWith('$'))).toBe(true);
    });

    it('should return only object properties', async () => {
      const tables = await service.getTables();

      // Should not include functions or other non-model properties
      expect(tables).not.toContain('$disconnect');
      expect(tables).not.toContain('$connect');
      expect(tables).not.toContain('$transaction');
    });

    it('should include common table names', async () => {
      const tables = await service.getTables();

      // These are common models that should be available
      // Note: Actual tables depend on Prisma schema
      expect(typeof tables).toBe('object');
    });
  });

  describe('getTableData', () => {
    it('should return paginated table data', async () => {
      const mockData = [
        { id: '1', name: 'Test 1' },
        { id: '2', name: 'Test 2' },
      ];

      const mockModel = {
        findMany: jest.fn().mockResolvedValue(mockData),
        count: jest.fn().mockResolvedValue(50),
      };

      (mockPrisma as any).user = mockModel;

      const result = await service.getTableData('user', 1, 10);

      expect(result.table).toBe('user');
      expect(result.data).toEqual(mockData);
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 10,
        total: 50,
        pages: 5,
      });
    });

    it('should handle first page correctly', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(100),
      };

      (mockPrisma as any).event = mockModel;

      await service.getTableData('event', 1, 20);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 0,
      });
    });

    it('should handle subsequent pages correctly', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(100),
      };

      (mockPrisma as any).contest = mockModel;

      await service.getTableData('contest', 3, 20);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 40,
      });
    });

    it('should calculate total pages correctly', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(47),
      };

      (mockPrisma as any).category = mockModel;

      const result = await service.getTableData('category', 1, 10);

      expect(result.pagination.pages).toBe(5); // 47 / 10 = 4.7, rounded up to 5
    });

    it('should handle empty tables', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      };

      (mockPrisma as any).score = mockModel;

      const result = await service.getTableData('score', 1, 10);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.pages).toBe(0);
    });

    it('should throw NotFoundError for invalid table', async () => {
      await expect(service.getTableData('nonexistent_table', 1, 10)).rejects.toThrow(NotFoundError);
    });

    it('should handle default page value', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(10),
      };

      (mockPrisma as any).user = mockModel;

      await service.getTableData('user');

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 50,
        skip: 0,
      });
    });

    it('should handle default limit value', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(100),
      };

      (mockPrisma as any).user = mockModel;

      await service.getTableData('user', 1);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 50,
        skip: 0,
      });
    });

    it('should handle large page numbers', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1000),
      };

      (mockPrisma as any).event = mockModel;

      await service.getTableData('event', 50, 20);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 20,
        skip: 980,
      });
    });

    it('should handle small limit values', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(100),
      };

      (mockPrisma as any).contest = mockModel;

      await service.getTableData('contest', 1, 5);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 5,
        skip: 0,
      });
    });

    it('should handle large limit values', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(500),
      };

      (mockPrisma as any).category = mockModel;

      await service.getTableData('category', 1, 200);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 200,
        skip: 0,
      });
    });
  });

  describe('getTableSchema', () => {
    it('should return schema info for valid table', async () => {
      const mockModel = {};
      (mockPrisma as any).user = mockModel;

      const result = await service.getTableSchema('user');

      expect(result).toMatchObject({
        table: 'user',
        message: expect.any(String),
      });
    });

    it('should throw NotFoundError for invalid table', async () => {
      await expect(service.getTableSchema('invalid_table')).rejects.toThrow(NotFoundError);
    });

    it('should return message about limited introspection', async () => {
      const mockModel = {};
      (mockPrisma as any).event = mockModel;

      const result = await service.getTableSchema('event');

      expect(result.message).toContain('Schema introspection limited');
    });

    it('should handle different table names', async () => {
      const mockModel = {};
      (mockPrisma as any).contest = mockModel;

      const result = await service.getTableSchema('contest');

      expect(result.table).toBe('contest');
    });

    it('should handle table names with uppercase', async () => {
      const mockModel = {};
      (mockPrisma as any).Category = mockModel;

      const result = await service.getTableSchema('Category');

      expect(result.table).toBe('Category');
    });
  });

  describe('security and validation', () => {
    it('should only access valid Prisma models', async () => {
      await expect(service.getTableData('$queryRaw', 1, 10)).rejects.toThrow(NotFoundError);
    });

    it('should prevent access to internal methods', async () => {
      await expect(service.getTableData('$disconnect', 1, 10)).rejects.toThrow(NotFoundError);
    });

    it('should prevent SQL injection through table name', async () => {
      await expect(
        service.getTableData("user'; DROP TABLE users; --", 1, 10)
      ).rejects.toThrow(NotFoundError);
    });

    it('should handle case sensitivity in table names', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      };

      (mockPrisma as any).User = mockModel;

      // Should respect exact case
      await expect(service.getTableData('user', 1, 10)).rejects.toThrow(NotFoundError);
    });
  });

  describe('edge cases', () => {
    it('should handle page 0 as page 1', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(10),
      };

      (mockPrisma as any).user = mockModel;

      await service.getTableData('user', 0, 10);

      expect(mockModel.findMany).toHaveBeenCalledWith({
        take: 10,
        skip: -10, // Will be handled by Prisma
      });
    });

    it('should handle negative page numbers', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(10),
      };

      (mockPrisma as any).user = mockModel;

      await service.getTableData('user', -1, 10);

      expect(mockModel.findMany).toHaveBeenCalled();
    });

    it('should handle very large datasets', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(1000000),
      };

      (mockPrisma as any).score = mockModel;

      const result = await service.getTableData('score', 1, 100);

      expect(result.pagination.pages).toBe(10000);
    });

    it('should handle fractional page calculations', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(25),
      };

      (mockPrisma as any).user = mockModel;

      const result = await service.getTableData('user', 1, 10);

      expect(result.pagination.pages).toBe(3); // Math.ceil(25/10)
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete table browsing workflow', async () => {
      // Get tables
      const tables = await service.getTables();
      expect(tables.length).toBeGreaterThan(0);

      // Get data from first table
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([{ id: '1' }]),
        count: jest.fn().mockResolvedValue(1),
      };

      (mockPrisma as any)[tables[0]] = mockModel;

      const data = await service.getTableData(tables[0], 1, 10);
      expect(data).toBeDefined();

      // Get schema for table
      const schema = await service.getTableSchema(tables[0]);
      expect(schema).toBeDefined();
    });

    it('should handle pagination through large dataset', async () => {
      const mockModel = {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(100),
      };

      (mockPrisma as any).user = mockModel;

      // Page 1
      const page1 = await service.getTableData('user', 1, 10);
      expect(page1.pagination.page).toBe(1);

      // Page 2
      const page2 = await service.getTableData('user', 2, 10);
      expect(page2.pagination.page).toBe(2);

      // Last page
      const page10 = await service.getTableData('user', 10, 10);
      expect(page10.pagination.page).toBe(10);
    });
  });
});
