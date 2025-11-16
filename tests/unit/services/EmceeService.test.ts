/**
 * EmceeService Tests
 *
 * Comprehensive test suite for emcee script management, bio retrieval,
 * and event/contest/category navigation functionality.
 *
 * Test Coverage:
 * - Script management (CRUD operations)
 * - Bio management (contestants and judges)
 * - Event/Contest/Category retrieval
 * - History and pagination
 * - Error handling
 * - Validation
 */

import { describe, it, expect, beforeEach, vi } from '@jest/globals';
import { mock, MockProxy } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EmceeService } from '../../src/services/EmceeService';
import { NotFoundError, ValidationError } from '../../src/services/BaseService';

describe('EmceeService', () => {
  let service: EmceeService;
  let prismaMock: MockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mock<PrismaClient>();
    service = new EmceeService(prismaMock as any);
  });

  describe('getStats', () => {
    it('should return dashboard statistics', async () => {
      prismaMock.emceeScript.count.mockResolvedValue(15);
      prismaMock.event.count.mockResolvedValue(5);
      prismaMock.contest.count.mockResolvedValue(12);
      prismaMock.category.count.mockResolvedValue(30);

      const result = await service.getStats();

      expect(result).toEqual({
        totalScripts: 15,
        totalEvents: 5,
        totalContests: 12,
        totalCategories: 30,
      });
      expect(prismaMock.emceeScript.count).toHaveBeenCalledTimes(1);
      expect(prismaMock.event.count).toHaveBeenCalledTimes(1);
      expect(prismaMock.contest.count).toHaveBeenCalledTimes(1);
      expect(prismaMock.category.count).toHaveBeenCalledTimes(1);
    });

    it('should handle zero counts', async () => {
      prismaMock.emceeScript.count.mockResolvedValue(0);
      prismaMock.event.count.mockResolvedValue(0);
      prismaMock.contest.count.mockResolvedValue(0);
      prismaMock.category.count.mockResolvedValue(0);

      const result = await service.getStats();

      expect(result).toEqual({
        totalScripts: 0,
        totalEvents: 0,
        totalContests: 0,
        totalCategories: 0,
      });
    });
  });

  describe('getScripts', () => {
    it('should retrieve all scripts when no filters provided', async () => {
      const mockScripts = [
        { id: 's1', title: 'Opening', order: 1 },
        { id: 's2', title: 'Closing', order: 2 },
      ];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({});

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: {},
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by eventId', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', eventId: 'e1' }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({ eventId: 'e1' });

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by contestId', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', contestId: 'c1' }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({ contestId: 'c1' });

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { contestId: 'c1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by categoryId', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', categoryId: 'cat1' }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({ categoryId: 'cat1' });

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by multiple criteria', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1' }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      await service.getScripts({ eventId: 'e1', contestId: 'c1', categoryId: 'cat1' });

      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1', contestId: 'c1', categoryId: 'cat1' },
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should return empty array when no scripts found', async () => {
      prismaMock.emceeScript.findMany.mockResolvedValue([]);

      const result = await service.getScripts({ eventId: 'e1' });

      expect(result).toEqual([]);
    });
  });

  describe('getScript', () => {
    it('should retrieve a script with all relations', async () => {
      const mockScript = {
        id: 's1',
        title: 'Opening Ceremony',
        content: 'Welcome everyone...',
        event: { id: 'e1', name: 'Spring Event' },
        contest: { id: 'c1', name: 'Talent Show' },
        category: { id: 'cat1', name: 'Solo Performance' },
        author: { id: 'u1', name: 'John Doe' },
      };

      prismaMock.emceeScript.findUnique.mockResolvedValue(mockScript as any);

      const result = await service.getScript('s1');

      expect(result).toEqual(mockScript);
      expect(prismaMock.emceeScript.findUnique).toHaveBeenCalledWith({
        where: { id: 's1' },
        include: {
          event: {
            select: {
              id: true,
              name: true,
              description: true,
              startDate: true,
              endDate: true,
            },
          },
          contest: {
            select: {
              id: true,
              name: true,
              description: true,
              startTime: true,
              endTime: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              maxScore: true,
            },
          },
          author: {
            select: {
              id: true,
              name: true,
              preferredName: true,
              email: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundError when script does not exist', async () => {
      prismaMock.emceeScript.findUnique.mockResolvedValue(null);

      await expect(service.getScript('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.getScript('nonexistent')).rejects.toThrow('Script with ID nonexistent not found');
    });

    it('should handle script with null relations', async () => {
      const mockScript = {
        id: 's1',
        title: 'Generic Script',
        content: 'Content...',
        event: null,
        contest: null,
        category: null,
        author: null,
      };

      prismaMock.emceeScript.findUnique.mockResolvedValue(mockScript as any);

      const result = await service.getScript('s1');

      expect(result).toEqual(mockScript);
    });
  });

  describe('getContestantBios', () => {
    it('should retrieve contestant bios by categoryId', async () => {
      const mockAssignments = [
        {
          contestant: {
            id: 'cont1',
            users: [{ id: 'u1', name: 'Alice Smith', bio: 'Bio...' }],
            contestContestants: [],
            categoryContestants: [],
          },
        },
      ];

      prismaMock.categoryContestant.findMany.mockResolvedValue(mockAssignments as any);

      const result = await service.getContestantBios({ categoryId: 'cat1' });

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('cont1');
      expect(prismaMock.categoryContestant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { categoryId: 'cat1' },
        })
      );
    });

    it('should retrieve contestant bios by eventId', async () => {
      const mockContests = [{ id: 'c1' }, { id: 'c2' }];
      const mockCategories = [{ id: 'cat1' }, { id: 'cat2' }];
      const mockAssignments = [
        { contestant: { id: 'cont1', users: [], contestContestants: [], categoryContestants: [] } },
      ];

      prismaMock.contest.findMany.mockResolvedValue(mockContests as any);
      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      prismaMock.categoryContestant.findMany.mockResolvedValue(mockAssignments as any);

      const result = await service.getContestantBios({ eventId: 'e1' });

      expect(result).toHaveLength(1);
      expect(prismaMock.contest.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1' },
        select: { id: true },
      });
    });

    it('should retrieve contestant bios by contestId', async () => {
      const mockCategories = [{ id: 'cat1' }, { id: 'cat2' }];
      const mockAssignments = [
        { contestant: { id: 'cont1', users: [], contestContestants: [], categoryContestants: [] } },
      ];

      prismaMock.category.findMany.mockResolvedValue(mockCategories as any);
      prismaMock.categoryContestant.findMany.mockResolvedValue(mockAssignments as any);

      const result = await service.getContestantBios({ contestId: 'c1' });

      expect(result).toHaveLength(1);
      expect(prismaMock.category.findMany).toHaveBeenCalledWith({
        where: { contestId: 'c1' },
        select: { id: true },
      });
    });

    it('should return empty array when no categories found', async () => {
      prismaMock.contest.findMany.mockResolvedValue([]);
      prismaMock.category.findMany.mockResolvedValue([]);

      const result = await service.getContestantBios({ eventId: 'e1' });

      expect(result).toEqual([]);
    });

    it('should deduplicate contestants', async () => {
      const mockAssignments = [
        { contestant: { id: 'cont1', name: 'Alice', users: [], contestContestants: [], categoryContestants: [] } },
        { contestant: { id: 'cont1', name: 'Alice', users: [], contestContestants: [], categoryContestants: [] } },
        { contestant: { id: 'cont2', name: 'Bob', users: [], contestContestants: [], categoryContestants: [] } },
      ];

      prismaMock.categoryContestant.findMany.mockResolvedValue(mockAssignments as any);

      const result = await service.getContestantBios({ categoryId: 'cat1' });

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('cont1');
      expect(result[1].id).toBe('cont2');
    });

    it('should sort contestants by name', async () => {
      const mockAssignments = [
        { contestant: { id: 'cont1', name: 'Zoe', users: [], contestContestants: [], categoryContestants: [] } },
        { contestant: { id: 'cont2', name: 'Alice', users: [], contestContestants: [], categoryContestants: [] } },
      ];

      prismaMock.category.findMany.mockResolvedValue([{ id: 'cat1' }] as any);
      prismaMock.categoryContestant.findMany.mockResolvedValue(mockAssignments as any);

      const result = await service.getContestantBios({ contestId: 'c1' });

      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Zoe');
    });
  });

  describe('getJudgeBios', () => {
    it('should retrieve judge bios by categoryId', async () => {
      const mockAssignments = [{ judgeId: 'j1' }, { judgeId: 'j2' }];
      const mockJudges = [
        { id: 'j1', name: 'Judge One', users: [{ id: 'u1' }] },
        { id: 'j2', name: 'Judge Two', users: [{ id: 'u2' }] },
      ];
      const mockUsers = [
        { id: 'u1', name: 'Judge One', email: 'j1@test.com', role: 'JUDGE', judge: { id: 'j1' } },
        { id: 'u2', name: 'Judge Two', email: 'j2@test.com', role: 'JUDGE', judge: { id: 'j2' } },
      ];

      prismaMock.assignment.findMany.mockResolvedValue(mockAssignments as any);
      prismaMock.judge.findMany.mockResolvedValue(mockJudges as any);
      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.getJudgeBios({ categoryId: 'cat1' });

      expect(result).toHaveLength(2);
      expect(prismaMock.assignment.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat1' },
        select: { judgeId: true },
        distinct: ['judgeId'],
      });
    });

    it('should retrieve judge bios by eventId', async () => {
      const mockContests = [{ id: 'c1' }];
      const mockAssignments = [{ judgeId: 'j1' }];
      const mockJudges = [{ id: 'j1', name: 'Judge One', users: [{ id: 'u1' }] }];
      const mockUsers = [{ id: 'u1', name: 'Judge One', role: 'JUDGE', judge: { id: 'j1' } }];

      prismaMock.contest.findMany.mockResolvedValue(mockContests as any);
      prismaMock.assignment.findMany.mockResolvedValue(mockAssignments as any);
      prismaMock.judge.findMany.mockResolvedValue(mockJudges as any);
      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.getJudgeBios({ eventId: 'e1' });

      expect(result).toHaveLength(1);
    });

    it('should retrieve judge bios by contestId', async () => {
      const mockAssignments = [{ judgeId: 'j1' }];
      const mockJudges = [{ id: 'j1', name: 'Judge One', users: [{ id: 'u1' }] }];
      const mockUsers = [{ id: 'u1', name: 'Judge One', role: 'JUDGE', judge: { id: 'j1' } }];

      prismaMock.assignment.findMany.mockResolvedValue(mockAssignments as any);
      prismaMock.judge.findMany.mockResolvedValue(mockJudges as any);
      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.getJudgeBios({ contestId: 'c1' });

      expect(result).toHaveLength(1);
      expect(prismaMock.assignment.findMany).toHaveBeenCalledWith({
        where: { contestId: { in: ['c1'] } },
        select: { judgeId: true },
        distinct: ['judgeId'],
      });
    });

    it('should return empty array when no judges assigned', async () => {
      prismaMock.assignment.findMany.mockResolvedValue([]);

      const result = await service.getJudgeBios({ categoryId: 'cat1' });

      expect(result).toEqual([]);
    });

    it('should filter by judge roles', async () => {
      const mockAssignments = [{ judgeId: 'j1' }];
      const mockJudges = [{ id: 'j1', users: [{ id: 'u1' }] }];

      prismaMock.assignment.findMany.mockResolvedValue(mockAssignments as any);
      prismaMock.judge.findMany.mockResolvedValue(mockJudges as any);
      prismaMock.user.findMany.mockResolvedValue([]);

      await service.getJudgeBios({ categoryId: 'cat1' });

      expect(prismaMock.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            role: { in: ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'] },
          }),
        })
      );
    });

    it('should return all judges when no filters provided', async () => {
      const mockUsers = [
        { id: 'u1', name: 'Judge One', role: 'JUDGE', judge: { id: 'j1' } },
      ];

      prismaMock.user.findMany.mockResolvedValue(mockUsers as any);

      const result = await service.getJudgeBios({});

      expect(result).toHaveLength(1);
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          role: { in: ['JUDGE', 'TALLY_MASTER', 'AUDITOR', 'BOARD', 'ORGANIZER'] },
          judgeId: { not: null },
        },
        select: expect.any(Object),
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('getEvents', () => {
    it('should retrieve all events with nested relations', async () => {
      const mockEvents = [
        {
          id: 'e1',
          name: 'Spring Event',
          contests: [
            {
              id: 'c1',
              name: 'Talent Show',
              categories: [{ id: 'cat1', name: 'Solo' }],
            },
          ],
        },
      ];

      prismaMock.event.findMany.mockResolvedValue(mockEvents as any);

      const result = await service.getEvents();

      expect(result).toEqual(mockEvents);
      expect(prismaMock.event.findMany).toHaveBeenCalledWith({
        include: {
          contests: {
            include: {
              categories: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  scoreCap: true,
                },
              },
            },
          },
        },
        orderBy: { startDate: 'asc' },
      });
    });

    it('should return empty array when no events exist', async () => {
      prismaMock.event.findMany.mockResolvedValue([]);

      const result = await service.getEvents();

      expect(result).toEqual([]);
    });
  });

  describe('getEvent', () => {
    it('should retrieve a specific event with relations', async () => {
      const mockEvent = {
        id: 'e1',
        name: 'Spring Event',
        contests: [{ id: 'c1', categories: [] }],
      };

      prismaMock.event.findUnique.mockResolvedValue(mockEvent as any);

      const result = await service.getEvent('e1');

      expect(result).toEqual(mockEvent);
    });

    it('should throw NotFoundError when event does not exist', async () => {
      prismaMock.event.findUnique.mockResolvedValue(null);

      await expect(service.getEvent('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.getEvent('nonexistent')).rejects.toThrow('Event with ID nonexistent not found');
    });
  });

  describe('getContests', () => {
    it('should retrieve all contests when no eventId provided', async () => {
      const mockContests = [
        {
          id: 'c1',
          name: 'Contest 1',
          event: { id: 'e1', name: 'Event 1' },
          categories: [],
        },
      ];

      prismaMock.contest.findMany.mockResolvedValue(mockContests as any);

      const result = await service.getContests();

      expect(result).toEqual(mockContests);
      expect(prismaMock.contest.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
      });
    });

    it('should filter contests by eventId', async () => {
      const mockContests = [{ id: 'c1', eventId: 'e1' }];

      prismaMock.contest.findMany.mockResolvedValue(mockContests as any);

      await service.getContests('e1');

      expect(prismaMock.contest.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1' },
        include: expect.any(Object),
      });
    });
  });

  describe('getContest', () => {
    it('should retrieve a specific contest with relations', async () => {
      const mockContest = {
        id: 'c1',
        name: 'Talent Show',
        event: { id: 'e1', name: 'Spring Event' },
        categories: [{ id: 'cat1', name: 'Solo' }],
      };

      prismaMock.contest.findUnique.mockResolvedValue(mockContest as any);

      const result = await service.getContest('c1');

      expect(result).toEqual(mockContest);
    });

    it('should throw NotFoundError when contest does not exist', async () => {
      prismaMock.contest.findUnique.mockResolvedValue(null);

      await expect(service.getContest('nonexistent')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getEmceeHistory', () => {
    it('should retrieve paginated script history', async () => {
      const mockScripts = [
        { id: 's1', title: 'Script 1', isActive: true },
        { id: 's2', title: 'Script 2', isActive: true },
      ];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);
      prismaMock.emceeScript.count.mockResolvedValue(25);

      const result = await service.getEmceeHistory(2, 10);

      expect(result.scripts).toEqual(mockScripts);
      expect(result.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        pages: 3,
      });
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10,
      });
    });

    it('should use default pagination values', async () => {
      prismaMock.emceeScript.findMany.mockResolvedValue([]);
      prismaMock.emceeScript.count.mockResolvedValue(0);

      const result = await service.getEmceeHistory();

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(10);
    });
  });

  describe('uploadScript', () => {
    it('should create a new script with content', async () => {
      const mockScript = {
        id: 's1',
        title: 'Opening Script',
        content: 'Welcome everyone!',
      };

      prismaMock.emceeScript.create.mockResolvedValue(mockScript as any);

      const result = await service.uploadScript({
        title: 'Opening Script',
        content: 'Welcome everyone!',
        eventId: 'e1',
      });

      expect(result).toEqual(mockScript);
      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: {
          title: 'Opening Script',
          content: 'Welcome everyone!',
          filePath: null,
          eventId: 'e1',
          contestId: null,
          categoryId: null,
          order: 0,
        },
      });
    });

    it('should create a script with file path', async () => {
      const mockScript = {
        id: 's1',
        title: 'Script',
        content: 'Script file: /uploads/script.pdf',
        filePath: '/uploads/script.pdf',
      };

      prismaMock.emceeScript.create.mockResolvedValue(mockScript as any);

      const result = await service.uploadScript({
        title: 'Script',
        filePath: '/uploads/script.pdf',
      });

      expect(result.filePath).toBe('/uploads/script.pdf');
    });

    it('should throw ValidationError when title is missing', async () => {
      await expect(
        service.uploadScript({ title: '' } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when both content and filePath are missing', async () => {
      await expect(
        service.uploadScript({ title: 'Test' })
      ).rejects.toThrow('Content or file is required');
    });

    it('should set custom order', async () => {
      prismaMock.emceeScript.create.mockResolvedValue({} as any);

      await service.uploadScript({
        title: 'Script',
        content: 'Content',
        order: 5,
      });

      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 5 }),
      });
    });

    it('should handle all relation IDs', async () => {
      prismaMock.emceeScript.create.mockResolvedValue({} as any);

      await service.uploadScript({
        title: 'Script',
        content: 'Content',
        eventId: 'e1',
        contestId: 'c1',
        categoryId: 'cat1',
      });

      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'e1',
          contestId: 'c1',
          categoryId: 'cat1',
        }),
      });
    });
  });

  describe('updateScript', () => {
    it('should update script properties', async () => {
      const mockUpdated = {
        id: 's1',
        title: 'Updated Title',
        content: 'Updated content',
      };

      prismaMock.emceeScript.update.mockResolvedValue(mockUpdated as any);

      const result = await service.updateScript('s1', {
        title: 'Updated Title',
        content: 'Updated content',
      });

      expect(result).toEqual(mockUpdated);
      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          title: 'Updated Title',
          content: 'Updated content',
          eventId: null,
          contestId: null,
          categoryId: null,
          order: 0,
        },
      });
    });

    it('should update script order', async () => {
      prismaMock.emceeScript.update.mockResolvedValue({} as any);

      await service.updateScript('s1', { order: 10 });

      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({ order: 10 }),
      });
    });

    it('should clear relation IDs when set to null', async () => {
      prismaMock.emceeScript.update.mockResolvedValue({} as any);

      await service.updateScript('s1', {
        eventId: null,
        contestId: null,
        categoryId: null,
      });

      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({
          eventId: null,
          contestId: null,
          categoryId: null,
        }),
      });
    });
  });

  describe('deleteScript', () => {
    it('should delete a script', async () => {
      prismaMock.emceeScript.delete.mockResolvedValue({} as any);

      await service.deleteScript('s1');

      expect(prismaMock.emceeScript.delete).toHaveBeenCalledWith({
        where: { id: 's1' },
      });
    });

    it('should propagate Prisma errors', async () => {
      prismaMock.emceeScript.delete.mockRejectedValue(new Error('Record not found'));

      await expect(service.deleteScript('nonexistent')).rejects.toThrow('Record not found');
    });
  });

  describe('getScriptFileInfo', () => {
    it('should retrieve script file information', async () => {
      const mockScript = {
        id: 's1',
        title: 'Script',
        filePath: '/uploads/script.pdf',
      };

      prismaMock.emceeScript.findUnique.mockResolvedValue(mockScript as any);

      const result = await service.getScriptFileInfo('s1');

      expect(result).toEqual(mockScript);
    });

    it('should throw NotFoundError when script does not exist', async () => {
      prismaMock.emceeScript.findUnique.mockResolvedValue(null);

      await expect(service.getScriptFileInfo('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when script has no filePath', async () => {
      const mockScript = {
        id: 's1',
        title: 'Script',
        filePath: null,
      };

      prismaMock.emceeScript.findUnique.mockResolvedValue(mockScript as any);

      await expect(service.getScriptFileInfo('s1')).rejects.toThrow(NotFoundError);
      await expect(service.getScriptFileInfo('s1')).rejects.toThrow('Script file with ID s1 not found');
    });
  });
});
