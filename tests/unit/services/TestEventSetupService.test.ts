/**
 * TestEventSetupService Unit Tests
 * Comprehensive test coverage for test event creation and data seeding
 */

import 'reflect-metadata';
import { TestEventSetupService, TestEventConfig } from '../../../src/services/TestEventSetupService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { ForbiddenError, ValidationError } from '../../../src/services/BaseService';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('TestEventSetupService', () => {
  let service: TestEventSetupService;
  let mockPrisma: DeepMockProxy<PrismaClient>;
  let mockTransaction: any;

  const adminUserId = 'admin-123';
  const organizerUserId = 'organizer-123';
  const defaultTenantId = 'tenant-123';

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new TestEventSetupService(mockPrisma as any);

    // Setup transaction mock with all required methods for TestEventSetupService
    mockTransaction = {
      event: { create: jest.fn(), delete: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      user: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn(), count: jest.fn() },
      contest: { create: jest.fn(), deleteMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      category: { create: jest.fn(), deleteMany: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      criterion: { create: jest.fn(), createMany: jest.fn(), update: jest.fn() },
      judge: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      contestant: { create: jest.fn(), update: jest.fn(), findUnique: jest.fn() },
      roleAssignment: { create: jest.fn(), update: jest.fn() },
      categoryJudge: { create: jest.fn(), update: jest.fn() },
      categoryContestant: { create: jest.fn(), deleteMany: jest.fn(), update: jest.fn() },
      contestContestant: { create: jest.fn(), update: jest.fn() },
      contestJudge: { create: jest.fn(), update: jest.fn() },
      assignment: { create: jest.fn(), deleteMany: jest.fn() },
      auditorAssignment: { deleteMany: jest.fn() },
      tallyMasterAssignment: { deleteMany: jest.fn() },
      tenant: { create: jest.fn(), delete: jest.fn(), findUnique: jest.fn() }
    };

    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockTransaction);
    });
    mockTransaction.tenant.findUnique.mockResolvedValue({
      id: defaultTenantId,
      slug: 'test',
      name: 'Test Tenant',
    });

    // Mock tenant lookup (used outside transaction for email domain)
    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: defaultTenantId,
      slug: 'test',
      name: 'Test Tenant',
    } as any);

    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_123');

    jest.clearAllMocks();

    // Re-setup mocks that clearAllMocks would have cleared
    mockPrisma.$transaction.mockImplementation(async (callback: any) => {
      return callback(mockTransaction);
    });

    mockPrisma.tenant.findUnique.mockResolvedValue({
      id: defaultTenantId,
      slug: 'test',
      name: 'Test Tenant',
    } as any);

    (mockBcrypt.hash as jest.Mock).mockResolvedValue('hashed_password_123');
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(TestEventSetupService);
    });

    it('should extend BaseService', () => {
      expect(service).toHaveProperty('forbiddenError');
      expect(service).toHaveProperty('validationError');
    });
  });

  describe('createTestEvent', () => {
    const basicConfig: TestEventConfig = {
      eventName: 'Test Event',
      contestCount: 2,
      categoriesPerContest: 3,
      contestantsPerCategory: 5,
      judgesPerCategory: 3
    };

    const mockEvent = {
      id: 'event-123',
      name: 'Test Event',
      description: 'Test event created by test setup service',
      startDate: expect.any(Date),
      endDate: expect.any(Date),
      location: 'Test Location'
    };

    describe('authorization', () => {
      it('should allow admin to create test event', async () => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });

        const result = await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(result).toHaveProperty('eventId');
        expect(result).toHaveProperty('message');
        expect(result.eventId).toBe('event-123');
      });

      it('should throw ForbiddenError when non-admin tries to create test event', async () => {
        await expect(
          service.createTestEvent(basicConfig, organizerUserId, 'ORGANIZER', defaultTenantId)
        ).rejects.toThrow(ForbiddenError);

        expect(mockPrisma.$transaction).not.toHaveBeenCalled();
      });

      it('should throw ForbiddenError for judge role', async () => {
        await expect(
          service.createTestEvent(basicConfig, 'judge-1', 'JUDGE', defaultTenantId)
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw ForbiddenError for contestant role', async () => {
        await expect(
          service.createTestEvent(basicConfig, 'contestant-1', 'CONTESTANT', defaultTenantId)
        ).rejects.toThrow(ForbiddenError);
      });

      it('should throw ForbiddenError for auditor role', async () => {
        await expect(
          service.createTestEvent(basicConfig, 'auditor-1', 'AUDITOR', defaultTenantId)
        ).rejects.toThrow(ForbiddenError);
      });
    });

    describe('validation', () => {
      it('should throw ValidationError when contestCount is less than 1', async () => {
        const config = { ...basicConfig, contestCount: 0 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when contestCount is greater than 10', async () => {
        const config = { ...basicConfig, contestCount: 11 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when categoriesPerContest is less than 1', async () => {
        const config = { ...basicConfig, categoriesPerContest: 0 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when categoriesPerContest is greater than 10', async () => {
        const config = { ...basicConfig, categoriesPerContest: 11 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when contestantsPerCategory is less than 1', async () => {
        const config = { ...basicConfig, contestantsPerCategory: 0 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when contestantsPerCategory is greater than 50', async () => {
        const config = { ...basicConfig, contestantsPerCategory: 51 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when judgesPerCategory is less than 1', async () => {
        const config = { ...basicConfig, judgesPerCategory: 0 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should throw ValidationError when judgesPerCategory is greater than 15', async () => {
        const config = { ...basicConfig, judgesPerCategory: 16 };

        await expect(
          service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow(ValidationError);
      });

      it('should accept valid boundary values', async () => {
        const config: TestEventConfig = {
          contestCount: 10,
          categoriesPerContest: 10,
          contestantsPerCategory: 50,
          judgesPerCategory: 15
        };

        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });

        const result = await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(result).toHaveProperty('eventId');
      });
    });

    describe('event creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create event with provided name', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.event.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: 'Test Event'
          })
        });
      });

      it('should create event with default name when not provided', async () => {
        const config = { ...basicConfig };
        delete config.eventName;

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.event.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: expect.stringContaining('Test Event')
          })
        });
      });

      it('should create event with start and end dates', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.event.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            startDate: expect.any(Date),
            endDate: expect.any(Date)
          })
        });
      });

      it('should set end date 7 days after start date', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const createCall = mockTransaction.event.create.mock.calls[0][0];
        const startDate = createCall.data.startDate;
        const endDate = createCall.data.endDate;

        const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
        expect(daysDiff).toBe(7);
      });
    });

    describe('organizer creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create default number of organizers', async () => {
        const config = { ...basicConfig };
        delete (config as any).organizers;

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const organizerCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'ORGANIZER'
        );
        expect(organizerCalls.length).toBe(2);
      });

      it('should create specified number of organizers', async () => {
        const config = { ...basicConfig, organizers: 5 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const organizerCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'ORGANIZER'
        );
        expect(organizerCalls.length).toBe(5);
      });

      it('should create organizers with correct data structure', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const organizerCall = mockTransaction.user.create.mock.calls.find(
          (call: any) => call[0].data.role === 'ORGANIZER'
        );

        expect(organizerCall[0].data).toMatchObject({
          name: expect.stringContaining('Test Organizer'),
          email: expect.stringContaining('organizer'),
          password: 'hashed_password_123',
          role: 'ORGANIZER',
          isActive: true
        });
      });
    });

    describe('board user creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create default number of board users', async () => {
        const config = { ...basicConfig };
        delete (config as any).boardUsers;

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const boardCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'BOARD'
        );
        expect(boardCalls.length).toBe(2);
      });

      it('should create specified number of board users', async () => {
        const config = { ...basicConfig, boardUsers: 3 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const boardCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'BOARD'
        );
        expect(boardCalls.length).toBe(3);
      });

      it('should create board users with correct data structure', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const boardCall = mockTransaction.user.create.mock.calls.find(
          (call: any) => call[0].data.role === 'BOARD'
        );

        expect(boardCall[0].data).toMatchObject({
          name: expect.stringContaining('Test Board'),
          email: expect.stringContaining('board'),
          password: 'hashed_password_123',
          role: 'BOARD',
          isActive: true
        });
      });
    });

    describe('contest creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create specified number of contests', async () => {
        const config = { ...basicConfig, contestCount: 3 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.contest.create).toHaveBeenCalledTimes(3);
      });

      it('should create contests with correct event association', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.contest.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            eventId: 'event-123',
            name: expect.stringContaining('Test Contest')
          })
        });
      });

      it('should create contests with unique names', async () => {
        const config = { ...basicConfig, contestCount: 3 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const contestNames = mockTransaction.contest.create.mock.calls.map(
          (call: any) => call[0].data.name
        );
        const uniqueNames = new Set(contestNames);
        expect(uniqueNames.size).toBe(3);
      });
    });

    describe('tally master creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create default tally masters per contest', async () => {
        const config = { ...basicConfig, contestCount: 2 };
        delete (config as any).tallyMastersPerContest;

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const tallyCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'TALLY_MASTER'
        );
        expect(tallyCalls.length).toBe(2);
      });

      it('should create specified tally masters per contest', async () => {
        const config = { ...basicConfig, contestCount: 2, tallyMastersPerContest: 3 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const tallyCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'TALLY_MASTER'
        );
        expect(tallyCalls.length).toBe(6);
      });

      it('should assign tally masters to contests', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const tallyAssignments = mockTransaction.roleAssignment.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'TALLY_MASTER'
        );
        expect(tallyAssignments.length).toBeGreaterThan(0);
      });
    });

    describe('auditor creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create default auditors per contest', async () => {
        const config = { ...basicConfig, contestCount: 2 };
        delete (config as any).auditorsPerContest;

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const auditorCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'AUDITOR'
        );
        expect(auditorCalls.length).toBe(2);
      });

      it('should create specified auditors per contest', async () => {
        const config = { ...basicConfig, contestCount: 2, auditorsPerContest: 2 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        const auditorCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'AUDITOR'
        );
        expect(auditorCalls.length).toBe(4);
      });

      it('should assign auditors to contests', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const auditorAssignments = mockTransaction.roleAssignment.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'AUDITOR'
        );
        expect(auditorAssignments.length).toBeGreaterThan(0);
      });
    });

    describe('category creation', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create specified categories per contest', async () => {
        const config = { ...basicConfig, contestCount: 2, categoriesPerContest: 4 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.category.create).toHaveBeenCalledTimes(8);
      });

      it('should create categories with default score cap', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.category.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            scoreCap: 100
          })
        });
      });

      it('should create criteria for each category', async () => {
        const config = { ...basicConfig, contestCount: 1, categoriesPerContest: 2 };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.criterion.createMany).toHaveBeenCalledTimes(2);
      });

      it('should create criteria with correct max scores totaling 100', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const criteriaCall = mockTransaction.criterion.createMany.mock.calls[0][0];
        const totalMaxScore = criteriaCall.data.reduce((sum: number, crit: any) => sum + crit.maxScore, 0);
        expect(totalMaxScore).toBe(100);
      });
    });

    describe('judge creation and assignment', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create specified judges per contest', async () => {
        // judgesPerCategory is actually per-contest in the implementation
        const config: TestEventConfig = {
          contestCount: 1,
          categoriesPerContest: 2,
          judgesPerCategory: 4,
          contestantsPerCategory: 1
        };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        // judges are created per contest, not per category
        expect(mockTransaction.judge.create).toHaveBeenCalledTimes(4);
      });

      it('should create user accounts for judges', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const judgeUserCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'JUDGE'
        );
        expect(judgeUserCalls.length).toBeGreaterThan(0);
      });

      it('should assign judges to categories when assignJudgesToCategories is true', async () => {
        const config = { ...basicConfig, assignJudgesToCategories: true };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.categoryJudge.create).toHaveBeenCalled();
      });

      it('should not assign judges to categories when assignJudgesToCategories is false', async () => {
        const config = { ...basicConfig, assignJudgesToCategories: false };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.categoryJudge.create).not.toHaveBeenCalled();
      });

      it('should create judges with bio', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.judge.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            name: expect.any(String),
            email: expect.any(String),
            bio: expect.stringContaining('Test judge bio')
          })
        });
      });
    });

    describe('contestant creation and assignment', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should create specified contestants per category', async () => {
        const config: TestEventConfig = {
          contestCount: 1,
          categoriesPerContest: 2,
          contestantsPerCategory: 6,
          judgesPerCategory: 1
        };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.contestant.create).toHaveBeenCalledTimes(12);
      });

      it('should create user accounts for contestants', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const contestantUserCalls = mockTransaction.user.create.mock.calls.filter(
          (call: any) => call[0].data.role === 'CONTESTANT'
        );
        expect(contestantUserCalls.length).toBeGreaterThan(0);
      });

      it('should assign contestants to categories when assignContestantsToCategories is true', async () => {
        const config = { ...basicConfig, assignContestantsToCategories: true };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.categoryContestant.create).toHaveBeenCalled();
      });

      it('should not assign contestants to categories when assignContestantsToCategories is false', async () => {
        const config = { ...basicConfig, assignContestantsToCategories: false };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.categoryContestant.create).not.toHaveBeenCalled();
      });

      it('should assign contestants to contests when assignContestantsToCategories is true', async () => {
        const config = { ...basicConfig, assignContestantsToCategories: true };

        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.contestContestant.create).toHaveBeenCalled();
      });

      it('should create contestants with contestant numbers', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.contestant.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            contestantNumber: expect.any(Number)
          })
        });
      });

      it('should create contestants with bio', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockTransaction.contestant.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            bio: expect.stringContaining('Test contestant bio')
          })
        });
      });
    });

    describe('password hashing', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should hash password before creating users', async () => {
        const config = { ...basicConfig, defaultPassword: 'password123' };
        await service.createTestEvent(config, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 10);
      });

      it('should use hashed password for all user accounts', async () => {
        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        const userCalls = mockTransaction.user.create.mock.calls;
        userCalls.forEach((call: any) => {
          expect(call[0].data.password).toBe('hashed_password_123');
        });
      });
    });

    describe('transaction handling', () => {
      it('should execute all operations in a transaction', async () => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });

        await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(mockPrisma.$transaction).toHaveBeenCalled();
      });

      it('should rollback transaction on error', async () => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'ra-1' });
        mockTransaction.contest.create.mockRejectedValue(new Error('Contest creation failed'));

        await expect(
          service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId)
        ).rejects.toThrow('Contest creation failed');
      });
    });

    describe('return value', () => {
      beforeEach(() => {
        mockTransaction.event.create.mockResolvedValue(mockEvent);
        mockTransaction.user.create.mockResolvedValue({ id: 'user-1' });
        mockTransaction.contest.create.mockResolvedValue({ id: 'contest-1' });
        mockTransaction.category.create.mockResolvedValue({ id: 'category-1' });
        mockTransaction.judge.create.mockResolvedValue({ id: 'judge-1' });
        mockTransaction.contestant.create.mockResolvedValue({ id: 'contestant-1' });
        mockTransaction.criterion.createMany.mockResolvedValue({ count: 3 });
        mockTransaction.roleAssignment.create.mockResolvedValue({ id: 'assignment-1' });
        mockTransaction.categoryJudge.create.mockResolvedValue({ id: 'catjudge-1' });
        mockTransaction.categoryContestant.create.mockResolvedValue({ id: 'catcontestant-1' });
        mockTransaction.contestContestant.create.mockResolvedValue({ id: 'contestcontestant-1' });
        mockTransaction.contestJudge.create.mockResolvedValue({ id: 'contestjudge-1' });
        mockTransaction.assignment.create.mockResolvedValue({ id: 'assign-1' });
      });

      it('should return eventId and message', async () => {
        const result = await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(result).toHaveProperty('eventId');
        expect(result).toHaveProperty('message');
        expect(typeof result.eventId).toBe('string');
        expect(typeof result.message).toBe('string');
      });

      it('should return message indicating success', async () => {
        const result = await service.createTestEvent(basicConfig, adminUserId, 'ADMIN', defaultTenantId);

        expect(result.message).toContain('created successfully');
      });
    });
  });
});
