import 'reflect-metadata';
import { Request, Response } from 'express';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';
import { BulkUserController } from '../../../src/controllers/BulkUserController';
import { BulkOperationService } from '../../../src/services/BulkOperationService';
import { CSVService } from '../../../src/services/CSVService';
import { UserService } from '../../../src/services/UserService';
import { EmailService } from '../../../src/services/EmailService';

jest.mock('../../../src/utils/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}));

describe('BulkUserController', () => {
  let controller: BulkUserController;
  let bulkOperationService: DeepMockProxy<BulkOperationService>;
  let csvService: DeepMockProxy<CSVService>;
  let userService: DeepMockProxy<UserService>;
  let emailService: DeepMockProxy<EmailService>;
  let req: Partial<Request>;
  let res: Partial<Response>;

  beforeEach(() => {
    bulkOperationService = mockDeep<BulkOperationService>();
    csvService = mockDeep<CSVService>();
    userService = mockDeep<UserService>();
    emailService = mockDeep<EmailService>();

    controller = new BulkUserController(
      bulkOperationService,
      csvService,
      userService,
      emailService
    );

    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 'admin-1', role: 'ADMIN', tenantId: 'tenant-1' } as any,
      file: { buffer: Buffer.from('csv') } as any,
      tenantId: 'tenant-1',
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      send: jest.fn().mockReturnThis(),
    };
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(bulkOperationService);
    mockReset(csvService);
    mockReset(userService);
    mockReset(emailService);
  });

  it('sends welcome emails for imported users without failing the import when email dispatch succeeds', async () => {
    const parsedCsv = [{ email: 'judge@test.com', name: 'Judge Judy', role: 'JUDGE' }];
    csvService.parseCSV.mockReturnValue(parsedCsv as any);
    csvService.validateUsersImport.mockResolvedValue({
      total: 1,
      successful: 1,
      failed: 0,
      errors: [],
      data: parsedCsv,
    } as any);
    userService.createUser.mockResolvedValue({
      id: 'user-1',
      email: 'judge@test.com',
      name: 'Judge Judy',
    } as any);
    emailService.sendWelcomeEmailIfEnabled.mockResolvedValue({
      success: true,
      to: 'judge@test.com',
      subject: 'Welcome to Tenant',
    } as any);
    bulkOperationService.executeBulkOperation.mockImplementation(async (operation, items) => {
      for (const item of items as any[]) {
        await operation(item);
      }
      return { total: items.length, successful: items.length, failed: 0, errors: [] };
    });

    await controller.importUsers(req as Request, res as Response);

    expect(userService.createUser).toHaveBeenCalledWith({
      email: 'judge@test.com',
      name: 'Judge Judy',
      role: 'JUDGE',
      tenantId: 'tenant-1',
    });
    expect(emailService.sendWelcomeEmailIfEnabled).toHaveBeenCalledWith(
      'judge@test.com',
      'Judge Judy',
      expect.objectContaining({
        tenantId: 'tenant-1',
        userId: 'user-1',
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'User import completed',
      })
    );
  });
});
