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

import 'reflect-metadata';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mockDeep, DeepMockProxy, mockReset } from 'jest-mock-extended';
import { PrismaClient } from '@prisma/client';
import { EmceeService } from '../../../src/services/EmceeService';
import { BioService } from '../../../src/services/BioService';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('EmceeService', () => {
  let service: EmceeService;
  let prismaMock: DeepMockProxy<PrismaClient>;

  beforeEach(() => {
    prismaMock = mockDeep<PrismaClient>();
    service = new EmceeService(prismaMock as any);
  });

  afterEach(() => {
    mockReset(prismaMock);
    jest.restoreAllMocks();
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
        { id: 's1', title: 'Opening', content: '', filePath: null, order: 1, event: null, contest: null, category: null },
        { id: 's2', title: 'Closing', content: '', filePath: null, order: 2, event: null, contest: null, category: null },
      ];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({});

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by eventId', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', content: '', filePath: null, eventId: 'e1', event: null, contest: null, category: null }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({ eventId: 'e1' });

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1' },
        include: expect.any(Object),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by contestId', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', content: '', filePath: null, contestId: 'c1', event: null, contest: null, category: null }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({ contestId: 'c1' });

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { contestId: 'c1' },
        include: expect.any(Object),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by categoryId', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', content: '', filePath: null, categoryId: 'cat1', event: null, contest: null, category: null }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      const result = await service.getScripts({ categoryId: 'cat1' });

      expect(result).toEqual(mockScripts);
      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { categoryId: 'cat1' },
        include: expect.any(Object),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should filter scripts by multiple criteria', async () => {
      const mockScripts = [{ id: 's1', title: 'Script 1', content: '', filePath: null, event: null, contest: null, category: null }];

      prismaMock.emceeScript.findMany.mockResolvedValue(mockScripts as any);

      await service.getScripts({ eventId: 'e1', contestId: 'c1', categoryId: 'cat1' });

      expect(prismaMock.emceeScript.findMany).toHaveBeenCalledWith({
        where: { eventId: 'e1', contestId: 'c1', categoryId: 'cat1' },
        include: expect.any(Object),
        orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
      });
    });

    it('should return empty array when no scripts found', async () => {
      prismaMock.emceeScript.findMany.mockResolvedValue([]);

      const result = await service.getScripts({ eventId: 'e1' });

      expect(result).toEqual([]);
    });

    it('should normalize legacy file placeholder content in script lists', async () => {
      prismaMock.emceeScript.findMany.mockResolvedValue([
        {
          id: 's1',
          title: 'Script 1',
          content: 'Script file: /uploads/emcee/script.pdf',
          filePath: '/uploads/emcee/script.pdf',
          event: null,
          contest: null,
          category: null,
        },
      ] as any);

      const result = await service.getScripts({});

      expect(result[0]?.content).toBe('');
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
      };

      prismaMock.emceeScript.findFirst.mockResolvedValue(mockScript as any);

      const result = await service.getScript('s1');

      expect(result).toEqual(mockScript);
      expect(prismaMock.emceeScript.findFirst).toHaveBeenCalledWith({
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
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              description: true,
              scoreCap: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundError when script does not exist', async () => {
      prismaMock.emceeScript.findFirst.mockResolvedValue(null);

      await expect(service.getScript('nonexistent')).rejects.toThrow(NotFoundError);
      await expect(service.getScript('nonexistent')).rejects.toThrow("Script with identifier 'nonexistent' not found");
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

      prismaMock.emceeScript.findFirst.mockResolvedValue(mockScript as any);

      const result = await service.getScript('s1');

      expect(result).toEqual(mockScript);
    });
  });

  describe('getContestantBios', () => {
    it('should delegate contestant bios to BioService with shared filters', async () => {
      const mockContestants = [
        { id: 'cont1', name: 'Alice Smith', bio: 'Bio...', contests: [] },
      ];
      const bioSpy = jest
        .spyOn(BioService.prototype, 'getContestantBios')
        .mockResolvedValue(mockContestants as any);

      const result = await service.getContestantBios(
        { eventId: 'event-1', contestId: 'contest-1', categoryId: 'cat-1', tenantId: 'tenant-1' }
      );

      expect(result).toEqual(mockContestants);
      expect(bioSpy).toHaveBeenCalledWith(
        {
          eventId: 'event-1',
          contestId: 'contest-1',
          categoryId: 'cat-1',
        },
        'tenant-1'
      );
    });

    it('should require tenant context for contestant bios', async () => {
      await expect(
        service.getContestantBios({ eventId: 'event-1' })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.getContestantBios({ eventId: 'event-1' })
      ).rejects.toThrow('Tenant context required');
    });
  });

  describe('getJudgeBios', () => {
    it('should delegate judge bios to BioService with shared filters', async () => {
      const mockJudges = [
        { id: 'judge-1', name: 'Judge One', bio: 'Bio...', contests: [] },
      ];
      const bioSpy = jest.spyOn(BioService.prototype, 'getJudgeBios').mockResolvedValue(mockJudges as any);

      const result = await service.getJudgeBios({
        eventId: 'event-1',
        contestId: 'contest-1',
        categoryId: 'cat-1',
        tenantId: 'tenant-1',
      });

      expect(result).toEqual(mockJudges);
      expect(bioSpy).toHaveBeenCalledWith(
        {
          eventId: 'event-1',
          contestId: 'contest-1',
          categoryId: 'cat-1',
        },
        'tenant-1'
      );
    });

    it('should require tenant context for judge bios', async () => {
      await expect(
        service.getJudgeBios({ categoryId: 'cat-1' })
      ).rejects.toThrow(ValidationError);

      await expect(
        service.getJudgeBios({ categoryId: 'cat-1' })
      ).rejects.toThrow('Tenant context required');
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
      await expect(service.getEvent('nonexistent')).rejects.toThrow("Event with identifier 'nonexistent' not found");
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
        { id: 's1', title: 'Script 1', isActive: true, content: '' },
        { id: 's2', title: 'Script 2', isActive: true, content: '' },
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

      prismaMock.event.findFirst.mockResolvedValue({ id: 'e1' } as any);
      prismaMock.emceeScript.create.mockResolvedValue(mockScript as any);

      const result = await service.uploadScript({
        title: 'Opening Script',
        content: 'Welcome everyone!',
        eventId: 'e1',
        tenantId: 'tenant1',
      });

      expect(result).toEqual(mockScript);
      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: {
          tenantId: 'tenant1',
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
        content: '',
        filePath: '/uploads/script.pdf',
      };

      prismaMock.emceeScript.create.mockResolvedValue(mockScript as any);

      const result = await service.uploadScript({
        title: 'Script',
        filePath: '/uploads/script.pdf',
        tenantId: 'tenant1',
      });

      expect(result.filePath).toBe('/uploads/script.pdf');
      expect(result.content).toBe('');
    });

    it('should throw ValidationError when title is missing', async () => {
      await expect(
        service.uploadScript({ title: '', tenantId: 'tenant1' } as any)
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when both content and filePath are missing', async () => {
      await expect(
        service.uploadScript({ title: 'Test', tenantId: 'tenant1' })
      ).rejects.toThrow('Content or file is required');
    });

    it('should set custom order', async () => {
      prismaMock.emceeScript.create.mockResolvedValue({} as any);

      await service.uploadScript({
        title: 'Script',
        content: 'Content',
        order: 5,
        tenantId: 'tenant1',
      });

      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ order: 5 }),
      });
    });

    it('should handle all relation IDs', async () => {
      prismaMock.emceeScript.create.mockResolvedValue({} as any);
      prismaMock.event.findFirst.mockResolvedValue({ id: 'e1' } as any);
      prismaMock.contest.findFirst.mockResolvedValue({ id: 'c1', eventId: 'e1' } as any);
      prismaMock.category.findFirst.mockResolvedValue({
        id: 'cat1',
        contestId: 'c1',
        contest: { eventId: 'e1' },
      } as any);

      await service.uploadScript({
        title: 'Script',
        content: 'Content',
        eventId: 'e1',
        contestId: 'c1',
        categoryId: 'cat1',
        tenantId: 'tenant1',
      });

      expect(prismaMock.emceeScript.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          eventId: 'e1',
          contestId: 'c1',
          categoryId: 'cat1',
        }),
      });
    });

    it('should reject mismatched contest and event scope', async () => {
      prismaMock.event.findFirst.mockResolvedValue({ id: 'e1' } as any);
      prismaMock.contest.findFirst.mockResolvedValue({ id: 'c1', eventId: 'e2' } as any);

      await expect(
        service.uploadScript({
          title: 'Script',
          content: 'Content',
          eventId: 'e1',
          contestId: 'c1',
          tenantId: 'tenant1',
        })
      ).rejects.toThrow('Selected contest does not belong to the selected event');
    });
  });

  describe('updateScript', () => {
    it('should update script properties', async () => {
      const mockUpdated = {
        id: 's1',
        title: 'Updated Title',
        content: 'Updated content',
      };

      prismaMock.emceeScript.findFirst.mockResolvedValue({
        id: 's1',
        title: 'Original Title',
        content: 'Original content',
        eventId: null,
        contestId: null,
        categoryId: null,
        filePath: null,
        event: null,
        contest: null,
        category: null,
      } as any);
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
        },
      });
    });

    it('should update script order', async () => {
      prismaMock.emceeScript.findFirst.mockResolvedValue({
        id: 's1',
        title: 'Original Title',
        content: 'Original content',
        eventId: null,
        contestId: null,
        categoryId: null,
        filePath: null,
        event: null,
        contest: null,
        category: null,
      } as any);
      prismaMock.emceeScript.update.mockResolvedValue({} as any);

      await service.updateScript('s1', { order: 10 });

      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: expect.objectContaining({ order: 10 }),
      });
    });

    it('should clear relation IDs when set to null', async () => {
      prismaMock.emceeScript.findFirst.mockResolvedValue({
        id: 's1',
        title: 'Original Title',
        content: 'Original content',
        eventId: 'e1',
        contestId: 'c1',
        categoryId: 'cat1',
        filePath: null,
        event: null,
        contest: null,
        category: null,
      } as any);
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

    it('should preserve existing scope when only metadata changes', async () => {
      prismaMock.emceeScript.findFirst.mockResolvedValue({
        id: 's1',
        title: 'Original Title',
        content: 'Original content',
        eventId: 'e1',
        contestId: 'c1',
        categoryId: 'cat1',
        filePath: null,
        event: null,
        contest: null,
        category: null,
      } as any);
      prismaMock.emceeScript.update.mockResolvedValue({} as any);

      await service.updateScript('s1', {
        title: 'Updated only',
      });

      expect(prismaMock.emceeScript.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          title: 'Updated only',
        },
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

      prismaMock.emceeScript.findFirst.mockResolvedValue(mockScript as any);

      const result = await service.getScriptFileInfo('s1');

      expect(result).toEqual(mockScript);
    });

    it('should throw NotFoundError when script does not exist', async () => {
      prismaMock.emceeScript.findFirst.mockResolvedValue(null);

      await expect(service.getScriptFileInfo('nonexistent')).rejects.toThrow(NotFoundError);
    });

    it('should throw NotFoundError when script has no filePath', async () => {
      const mockScript = {
        id: 's1',
        title: 'Script',
        filePath: null,
      };

      prismaMock.emceeScript.findFirst.mockResolvedValue(mockScript as any);

      await expect(service.getScriptFileInfo('s1')).rejects.toThrow(NotFoundError);
      await expect(service.getScriptFileInfo('s1')).rejects.toThrow("Script file with identifier 's1' not found");
    });
  });
});
