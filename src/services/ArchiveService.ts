import { injectable, inject } from 'tsyringe';
import { PrismaClient } from '@prisma/client';
import { BaseService } from './BaseService';

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
   * Get all archives
   */
  async getAllArchives() {
    return await (this.prisma.archivedEvent.findMany as any)({
      include: {
        event: true,
      } ,
      orderBy: { id: 'desc' },
    });
  }

  /**
   * Get active events
   */
  async getActiveEvents() {
    return await this.prisma.event.findMany({
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
    });
  }

  /**
   * Get archived events
   */
  async getArchivedEvents() {
    return await this.prisma.event.findMany({
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
    });
  }

  /**
   * Archive an item
   */
  async archiveItem(id: string, reason?: string, userId?: string) {
    // Fetch event to get required fields
    const event: any = await this.prisma.event.findUnique({
      where: { id },
    });

    if (!event) {
      throw this.notFoundError('Event', id);
    }

    const archive: any = await this.prisma.archivedEvent.create({
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
  async archiveEvent(eventId: string, userId: string, reason?: string) {
    const event: any = await this.prisma.event.findUnique({
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
    const archive: any = await this.prisma.archivedEvent.create({
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
  async restoreEvent(eventId: string) {
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
