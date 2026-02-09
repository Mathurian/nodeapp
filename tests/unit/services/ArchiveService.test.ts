/**
 * ArchiveService Unit Tests
 * Comprehensive tests for archive operations
 */

import 'reflect-metadata';
import { ArchiveService } from '../../../src/services/ArchiveService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError } from '../../../src/services/BaseService';

describe('ArchiveService', () => {
  let service: ArchiveService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockEvent = {
    id: 'event-1',
    tenantId: 'tenant-1',
    name: 'Test Event',
    description: 'Test Description',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-02'),
    archived: false,
    location: 'Test Venue',
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockArchivedEvent = {
    id: 'archive-1',
    tenantId: 'tenant-1',
    eventId: 'event-1',
    name: 'Test Event',
    description: 'Test Description',
    startDate: new Date('2025-12-01'),
    endDate: new Date('2025-12-02'),
    archivedById: 'user-1',
    createdAt: new Date(),
    event: mockEvent
  };

  beforeEach(() => {
    mockPrisma = mockDeep<PrismaClient>();
    service = new ArchiveService(mockPrisma as any);
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockReset(mockPrisma);
  });

  describe('constructor', () => {
    it('should create an instance', () => {
      expect(service).toBeDefined();
      expect(service).toBeInstanceOf(ArchiveService);
    });
  });

  describe('getAllArchives', () => {
    it('should return all archived events with pagination', async () => {
      mockPrisma.archivedEvent.findMany.mockResolvedValue([mockArchivedEvent] as any);
      mockPrisma.archivedEvent.count.mockResolvedValue(1);

      const result = await service.getAllArchives();

      expect(result.data).toEqual([mockArchivedEvent]);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });

    it('should return empty array when no archives exist', async () => {
      mockPrisma.archivedEvent.findMany.mockResolvedValue([]);
      mockPrisma.archivedEvent.count.mockResolvedValue(0);

      const result = await service.getAllArchives();

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
    });

    it('should order archives by id descending', async () => {
      const archives = [
        { ...mockArchivedEvent, id: 'archive-1', createdAt: new Date('2025-01-01') },
        { ...mockArchivedEvent, id: 'archive-2', createdAt: new Date('2025-02-01') }
      ];
      mockPrisma.archivedEvent.findMany.mockResolvedValue(archives as any);
      mockPrisma.archivedEvent.count.mockResolvedValue(2);

      const result = await service.getAllArchives();

      expect(result.data).toHaveLength(2);
      expect(mockPrisma.archivedEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: 'desc' }
        })
      );
    });
  });

  describe('getActiveEvents', () => {
    it('should return all active (non-archived) events with pagination', async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent] as any);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await service.getActiveEvents();

      expect(result.data).toEqual([mockEvent]);
      expect(result.pagination).toBeDefined();
      expect(result.pagination.total).toBe(1);
    });

    it('should include contest and contestant counts', async () => {
      const eventWithCounts = {
        ...mockEvent,
        _count: { contests: 5, contestants: 20 }
      };
      mockPrisma.event.findMany.mockResolvedValue([eventWithCounts] as any);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await service.getActiveEvents();

      expect((result.data[0] as any)._count.contests).toBe(5);
      expect((result.data[0] as any)._count.contestants).toBe(20);
    });

    it('should return empty array when no active events exist', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await service.getActiveEvents();

      expect(result.data).toEqual([]);
    });
  });

  describe('getArchivedEvents', () => {
    it('should return all archived events with pagination', async () => {
      const archivedEvent = { ...mockEvent, archived: true };
      mockPrisma.event.findMany.mockResolvedValue([archivedEvent] as any);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await service.getArchivedEvents();

      expect(result.data).toEqual([archivedEvent]);
      expect(result.pagination).toBeDefined();
    });

    it('should include contest and contestant counts', async () => {
      const archivedEvent = {
        ...mockEvent,
        archived: true,
        _count: { contests: 3, contestants: 10 }
      };
      mockPrisma.event.findMany.mockResolvedValue([archivedEvent] as any);
      mockPrisma.event.count.mockResolvedValue(1);

      const result = await service.getArchivedEvents();

      expect((result.data[0] as any)._count.contests).toBe(3);
      expect((result.data[0] as any)._count.contestants).toBe(10);
    });

    it('should return empty array when no archived events exist', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);
      mockPrisma.event.count.mockResolvedValue(0);

      const result = await service.getArchivedEvents();

      expect(result.data).toEqual([]);
    });
  });

  describe('archiveItem', () => {
    it('should find event and create archive record with reason and user', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveItem('event-1', 'Event completed', 'user-1');

      expect(result).toEqual(mockArchivedEvent);
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' }
      });
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockEvent.tenantId,
          eventId: 'event-1',
          name: mockEvent.name,
          description: mockEvent.description,
          startDate: mockEvent.startDate,
          endDate: mockEvent.endDate,
          archivedById: 'user-1',
        }
      });
    });

    it('should create archive record without user ID (defaults to system)', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveItem('event-1', 'Archived');

      expect(result).toEqual(mockArchivedEvent);
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          archivedById: 'system',
        })
      });
    });

    it('should throw NotFoundError when event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.archiveItem('invalid-id')).rejects.toThrow(NotFoundError);
    });
  });

  describe('restoreItem', () => {
    it('should delete archive records for event', async () => {
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.restoreItem('event-1');

      expect(result).toEqual({ message: 'Item restored successfully' });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' }
      });
    });

    it('should handle restoring event with no archive records', async () => {
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.restoreItem('event-1');

      expect(result).toEqual({ message: 'Item restored successfully' });
    });

    it('should delete multiple archive records if they exist', async () => {
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 3 } as any);

      const result = await service.restoreItem('event-1');

      expect(result).toEqual({ message: 'Item restored successfully' });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' }
      });
    });
  });

  describe('deleteArchivedItem', () => {
    it('should delete archive records for event', async () => {
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.deleteArchivedItem('event-1');

      expect(result).toEqual({ message: 'Archived item deleted successfully' });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' }
      });
    });

    it('should handle deleting non-existent archive', async () => {
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.deleteArchivedItem('invalid-id');

      expect(result).toEqual({ message: 'Archived item deleted successfully' });
    });
  });

  describe('archiveEvent', () => {
    it('should archive event and create archive record', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: true } as any);
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveEvent('event-1', 'user-1', 'Event completed');

      expect(result).toEqual(mockArchivedEvent);
      expect(mockPrisma.event.findUnique).toHaveBeenCalledWith({
        where: { id: 'event-1' }
      });
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { archived: true }
      });
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: {
          tenantId: mockEvent.tenantId,
          eventId: 'event-1',
          name: mockEvent.name,
          description: mockEvent.description,
          startDate: mockEvent.startDate,
          endDate: mockEvent.endDate,
          archivedById: 'user-1'
        }
      });
    });

    it('should throw error when event not found', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(null);

      await expect(service.archiveEvent('invalid-id', 'user-1')).rejects.toThrow(NotFoundError);
      expect(mockPrisma.event.update).not.toHaveBeenCalled();
      expect(mockPrisma.archivedEvent.create).not.toHaveBeenCalled();
    });

    it('should archive event without reason', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: true } as any);
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveEvent('event-1', 'user-1');

      expect(result).toBeDefined();
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            archivedById: 'user-1'
          })
        })
      );
    });

    it('should handle event with null description', async () => {
      const eventWithoutDesc = { ...mockEvent, description: null };
      mockPrisma.event.findUnique.mockResolvedValue(eventWithoutDesc as any);
      mockPrisma.event.update.mockResolvedValue({ ...eventWithoutDesc, archived: true } as any);
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveEvent('event-1', 'user-1');

      expect(result).toBeDefined();
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          description: null
        })
      });
    });
  });

  describe('restoreEvent', () => {
    it('should restore event and delete archive records', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.restoreEvent('event-1');

      expect(result).toEqual({ message: 'Event restored successfully' });
      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-1' }
      });
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { archived: false }
      });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' }
      });
    });

    it('should restore event even if no archive records exist', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.restoreEvent('event-1');

      expect(result).toEqual({ message: 'Event restored successfully' });
    });

    it('should delete multiple archive records during restore', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 3 } as any);

      const result = await service.restoreEvent('event-1');

      expect(result).toEqual({ message: 'Event restored successfully' });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledTimes(1);
    });

    it('should throw error when event not found', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(null);

      await expect(service.restoreEvent('invalid-id')).rejects.toThrow('Event not found or access denied');
    });

    it('should pass tenantId when provided', async () => {
      mockPrisma.event.findFirst.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 1 } as any);

      await service.restoreEvent('event-1', 'tenant-1');

      expect(mockPrisma.event.findFirst).toHaveBeenCalledWith({
        where: { id: 'event-1', tenantId: 'tenant-1' }
      });
    });
  });

  describe('error handling', () => {
    it('should handle database errors in getAllArchives', async () => {
      mockPrisma.archivedEvent.findMany.mockRejectedValue(new Error('Database error'));

      await expect(service.getAllArchives()).rejects.toThrow('Database error');
    });

    it('should handle database errors in archiveEvent', async () => {
      mockPrisma.event.findUnique.mockResolvedValue(mockEvent as any);
      mockPrisma.event.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.archiveEvent('event-1', 'user-1')).rejects.toThrow('Update failed');
    });

    it('should handle database errors in restoreEvent', async () => {
      mockPrisma.event.findFirst.mockRejectedValue(new Error('Update failed'));

      await expect(service.restoreEvent('event-1')).rejects.toThrow('Update failed');
    });
  });
});
