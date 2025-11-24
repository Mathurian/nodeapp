import { injectable, inject } from 'tsyringe';
import { PrismaClient, Prisma } from '@prisma/client';
import { BaseService } from './BaseService';
import { PaginationOptions, PaginatedResponse } from '../utils/pagination';

// P2-4: Proper type definitions for archive responses
type ArchivedEventWithEvent = Prisma.ArchivedEventGetPayload<{
  include: { event: true };
}>;

type EventWithCounts = Prisma.EventGetPayload<{
  include: {
    _count: {
      select: {
        contests: true;
        contestants: true;
      };
    };
  };
}>;

/**
 * Service for Archive management
 * Handles archiving and restoring events
 */
@injectable()
export class ArchiveService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }
  /**
   * Get all archives (P2-1: Add pagination, P2-4: Proper typing)
   */
  async getAllArchives(options?: PaginationOptions): Promise<PaginatedResponse<ArchivedEventWithEvent>> {
    const { skip, take } = this.getPaginationParams(options);

    const [archives, total] = await Promise.all([
      (this.prisma.archivedEvent.findMany as any)({
        include: {
          event: true,
        },
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.archivedEvent.count(),
    ]);

    return this.createPaginatedResponse(archives, total, options);
  }

  /**
   * Get active events (P2-1: Add pagination, P2-4: Proper typing)
   */
  async getActiveEvents(options?: PaginationOptions): Promise<PaginatedResponse<EventWithCounts>> {
    const { skip, take } = this.getPaginationParams(options);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { archived: false },
        include: {
          _count: {
            select: {
              contests: true,
              contestants: true,
            },
          },
        } as any,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.event.count({
        where: { archived: false },
      }),
    ]);

    return this.createPaginatedResponse(events as any, total, options);
  }

  /**
   * Get archived events (P2-1: Add pagination, P2-4: Proper typing)
   */
  async getArchivedEvents(options?: PaginationOptions): Promise<PaginatedResponse<EventWithCounts>> {
    const { skip, take } = this.getPaginationParams(options);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where: { archived: true },
        include: {
          _count: {
            select: {
              contests: true,
              contestants: true,
            },
          },
        } as any,
        orderBy: { id: 'desc' },
        skip,
        take,
      }),
      this.prisma.event.count({
        where: { archived: true },
      }),
    ]);

    return this.createPaginatedResponse(events as any, total, options);
  }

  /**
   * Archive an item
   */
  async archiveItem(id: string, _reason?: string, userId?: string) {
    // Fetch event to get required fields
    const event = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw this.notFoundError('Event', id);
    }

    const archive = await this.prisma.archivedEvent.create({
      data: {
        tenantId: event.tenantId,
        eventId: id,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        archivedById: userId || 'system',
      },
    });

    return archive;
  }

  /**
   * Restore an item
   */
  async restoreItem(id: string) {
    await this.prisma.archivedEvent.deleteMany({
      where: {
        eventId: id,
      },
    });

    return { message: 'Item restored successfully' };
  }

  /**
   * Delete an archived item
   */
  async deleteArchivedItem(id: string) {
    await this.prisma.archivedEvent.deleteMany({
      where: {
        eventId: id,
      },
    });

    return { message: 'Archived item deleted successfully' };
  }

  /**
   * Archive an event
   */
  async archiveEvent(eventId: string, userId: string, _reason?: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw this.notFoundError('Event', eventId);
    }

    // Update event to archived status
    await this.prisma.event.update({
      where: { id: eventId },
      data: { archived: true },
    });

    // Create archived event record
    const archive = await this.prisma.archivedEvent.create({
      data: {
        tenantId: event.tenantId,
        eventId,
        name: event.name,
        description: event.description,
        startDate: event.startDate,
        endDate: event.endDate,
        archivedById: userId,
      },
    });

    return archive;
  }

  /**
   * Restore an event
   */
  async restoreEvent(eventId: string, tenantId?: string) {
    // Verify event exists and belongs to tenant
    const event = await this.prisma.event.findFirst({
      where: {
        id: eventId,
        ...(tenantId && { tenantId }),
      },
    });

    if (!event) {
      throw new Error('Event not found or access denied');
    }

    await this.prisma.event.update({
      where: { id: eventId },
      data: { archived: false },
    });

    await this.prisma.archivedEvent.deleteMany({
      where: {
        eventId,
      },
    });

    return { message: 'Event restored successfully' };
  }
}
