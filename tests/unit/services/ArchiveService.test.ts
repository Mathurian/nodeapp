/**
 * ArchiveService Unit Tests
 * Comprehensive tests for archive operations
 */

import 'reflect-metadata';
import { ArchiveService } from '../../../src/services/ArchiveService';
import { PrismaClient } from '@prisma/client';
import { DeepMockProxy, mockDeep, mockReset } from 'jest-mock-extended';
import { NotFoundError, ValidationError } from '../../../src/services/BaseService';

describe('ArchiveService', () => {
  let service: ArchiveService;
  let mockPrisma: DeepMockProxy<PrismaClient>;

  const mockEvent = {
    id: 'event-1',
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
    it('should return all archived events', async () => {
      mockPrisma.archivedEvent.findMany.mockResolvedValue([mockArchivedEvent] as any);

      const result = await service.getAllArchives();

      expect(result).toEqual([mockArchivedEvent]);
      expect(mockPrisma.archivedEvent.findMany).toHaveBeenCalledWith({
        include: { event: true },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should return empty array when no archives exist', async () => {
      mockPrisma.archivedEvent.findMany.mockResolvedValue([]);

      const result = await service.getAllArchives();

      expect(result).toEqual([]);
    });

    it('should order archives by creation date descending', async () => {
      const archives = [
        { ...mockArchivedEvent, id: 'archive-1', createdAt: new Date('2025-01-01') },
        { ...mockArchivedEvent, id: 'archive-2', createdAt: new Date('2025-02-01') }
      ];
      mockPrisma.archivedEvent.findMany.mockResolvedValue(archives as any);

      const result = await service.getAllArchives();

      expect(result).toHaveLength(2);
      expect(mockPrisma.archivedEvent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' }
        })
      );
    });
  });

  describe('getActiveEvents', () => {
    it('should return all active (non-archived) events', async () => {
      mockPrisma.event.findMany.mockResolvedValue([mockEvent] as any);

      const result = await service.getActiveEvents();

      expect(result).toEqual([mockEvent]);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { archived: false },
        include: {
          _count: {
            select: {
              contests: true,
              contestants: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should include contest and contestant counts', async () => {
      const eventWithCounts = {
        ...mockEvent,
        _count: { contests: 5, contestants: 20 }
      };
      mockPrisma.event.findMany.mockResolvedValue([eventWithCounts] as any);

      const result = await service.getActiveEvents();

      expect(result[0]._count.contests).toBe(5);
      expect(result[0]._count.contestants).toBe(20);
    });

    it('should return empty array when no active events exist', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await service.getActiveEvents();

      expect(result).toEqual([]);
    });
  });

  describe('getArchivedEvents', () => {
    it('should return all archived events', async () => {
      const archivedEvent = { ...mockEvent, archived: true };
      mockPrisma.event.findMany.mockResolvedValue([archivedEvent] as any);

      const result = await service.getArchivedEvents();

      expect(result).toEqual([archivedEvent]);
      expect(mockPrisma.event.findMany).toHaveBeenCalledWith({
        where: { archived: true },
        include: {
          _count: {
            select: {
              contests: true,
              contestants: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should include contest and contestant counts', async () => {
      const archivedEvent = {
        ...mockEvent,
        archived: true,
        _count: { contests: 3, contestants: 10 }
      };
      mockPrisma.event.findMany.mockResolvedValue([archivedEvent] as any);

      const result = await service.getArchivedEvents();

      expect(result[0]._count.contests).toBe(3);
      expect(result[0]._count.contestants).toBe(10);
    });

    it('should return empty array when no archived events exist', async () => {
      mockPrisma.event.findMany.mockResolvedValue([]);

      const result = await service.getArchivedEvents();

      expect(result).toEqual([]);
    });
  });

  describe('archiveItem', () => {
    it('should create archive record with reason and user', async () => {
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveItem('event-1', 'Event completed', 'user-1');

      expect(result).toEqual(mockArchivedEvent);
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          reason: 'Event completed',
          archivedBy: 'user-1'
        }
      });
    });

    it('should create archive record without reason', async () => {
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveItem('event-1', undefined, 'user-1');

      expect(result).toEqual(mockArchivedEvent);
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          reason: undefined,
          archivedBy: 'user-1'
        }
      });
    });

    it('should create archive record without user ID', async () => {
      mockPrisma.archivedEvent.create.mockResolvedValue(mockArchivedEvent as any);

      const result = await service.archiveItem('event-1', 'Archived');

      expect(result).toEqual(mockArchivedEvent);
      expect(mockPrisma.archivedEvent.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          reason: 'Archived',
          archivedBy: undefined
        }
      });
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
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 1 } as any);

      const result = await service.restoreEvent('event-1');

      expect(result).toEqual({ message: 'Event restored successfully' });
      expect(mockPrisma.event.update).toHaveBeenCalledWith({
        where: { id: 'event-1' },
        data: { archived: false }
      });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledWith({
        where: { eventId: 'event-1' }
      });
    });

    it('should restore event even if no archive records exist', async () => {
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 0 } as any);

      const result = await service.restoreEvent('event-1');

      expect(result).toEqual({ message: 'Event restored successfully' });
    });

    it('should delete multiple archive records during restore', async () => {
      mockPrisma.event.update.mockResolvedValue({ ...mockEvent, archived: false } as any);
      mockPrisma.archivedEvent.deleteMany.mockResolvedValue({ count: 3 } as any);

      const result = await service.restoreEvent('event-1');

      expect(result).toEqual({ message: 'Event restored successfully' });
      expect(mockPrisma.archivedEvent.deleteMany).toHaveBeenCalledTimes(1);
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
      mockPrisma.event.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.restoreEvent('event-1')).rejects.toThrow('Update failed');
    });
  });
});
