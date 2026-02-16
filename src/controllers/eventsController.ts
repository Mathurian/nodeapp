/**
 * Events Controller - TypeScript
 * Handles HTTP requests for event management
 */

import { Request, Response, NextFunction } from 'express';
import {
  sendSuccess,
  sendBadRequest,
  sendCreated
} from '../utils/responseHelpers';
import { container } from 'tsyringe';
import { EventService } from '../services/EventService';
import { AuditLogService } from '../services/AuditLogService';
import { createLogger } from '../utils/logger';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('EventsController');

/**
 * Events Controller Class
 */
export class EventsController {
  private eventService: EventService;
  private prisma: PrismaClient;

  constructor() {
    this.eventService = container.resolve(EventService);
    this.prisma = container.resolve<PrismaClient>('PrismaClient');
  }

  private isContestVisibleToContestant(contest: {
    contestantViewRestricted?: boolean | null;
    contestantViewReleaseDate?: Date | null;
    event?: {
      contestantViewRestricted?: boolean | null;
      contestantViewReleaseDate?: Date | null;
    } | null;
  }): boolean {
    const now = new Date();
    const eventRestricted = Boolean(contest.event?.contestantViewRestricted);
    const eventRelease = contest.event?.contestantViewReleaseDate || null;
    if (eventRestricted && (!eventRelease || eventRelease > now)) {
      return false;
    }

    const contestRestricted = Boolean(contest.contestantViewRestricted);
    const contestRelease = contest.contestantViewReleaseDate || null;
    if (contestRestricted && (!contestRelease || contestRelease > now)) {
      return false;
    }

    return true;
  }

  /**
   * Get all events
   */
  getAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { archived, search, createdAfter, createdBefore, sortBy, sortDirection } = req.query;

      const filters: {
        archived?: boolean;
        search?: string;
        tenantId?: string;
        createdAfter?: Date;
        createdBefore?: Date;
        sortBy?: string;
        sortDirection?: 'asc' | 'desc';
      } = {};

      if (archived !== undefined) {
        filters.archived = archived === 'true';
      }
      if (search && typeof search === 'string') {
        filters.search = search;
      }
      if (createdAfter && typeof createdAfter === 'string') {
        filters.createdAfter = new Date(createdAfter);
      }
      if (createdBefore && typeof createdBefore === 'string') {
        filters.createdBefore = new Date(createdBefore);
      }
      if (sortBy && typeof sortBy === 'string') {
        filters.sortBy = sortBy;
      }
      if (sortDirection && (sortDirection === 'asc' || sortDirection === 'desc')) {
        filters.sortDirection = sortDirection as 'asc' | 'desc';
      }

      // CRITICAL: Add tenant filtering for non-SUPER_ADMIN users
      const isSuperAdmin = (req as any).isSuperAdmin;
      const tenantId = (req as any).tenantId || (req as any).user?.tenantId;

      // For SUPER_ADMIN, use req.prisma which bypasses tenant filtering
      let events;
      if (isSuperAdmin && (req as any).prisma) {
        // Use request-specific Prisma client that bypasses tenant filtering for SUPER_ADMIN
        const prisma = (req as any).prisma;
        const whereClause: any = { deletedAt: null };

        if (filters.archived !== undefined) {
          whereClause.archived = filters.archived;
        }
        if (filters.search) {
          whereClause.OR = [
            { name: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } }
          ];
        }
        if (filters.createdAfter) {
          whereClause.createdAt = { ...(whereClause.createdAt || {}), gte: filters.createdAfter };
        }
        if (filters.createdBefore) {
          whereClause.createdAt = { ...(whereClause.createdAt || {}), lte: filters.createdBefore };
        }

        events = await prisma.event.findMany({
          where: whereClause,
          orderBy: filters.sortBy ? { [filters.sortBy]: filters.sortDirection || 'desc' } : { startDate: 'desc' },
          include: {
            contests: true
          }
        });
      } else {
        // Non-SUPER_ADMIN: use service with tenant filtering
        if (tenantId) {
          filters.tenantId = tenantId;
        }
        events = await this.eventService.getAllEvents(filters);
      }

      // Compute status based on dates
      const now = new Date();
      const eventsWithStatus = events.map((event: any) => {
        let status = 'DRAFT';

        if (event.archived) {
          status = 'ARCHIVED';
        } else if (new Date(event.startDate) <= now && new Date(event.endDate) >= now) {
          status = 'ACTIVE';
        } else if (new Date(event.endDate) < now) {
          status = 'COMPLETED';
        }

        return {
          ...event,
          status,
        };
      });

      let filteredEvents = eventsWithStatus;
      // Contestants should only see their assigned/released events.
      if (req.user?.role === 'CONTESTANT' && req.user.contestantId) {
        const contestantId = req.user.contestantId;
        const contestRows = await this.prisma.contestContestant.findMany({
          where: { contestantId },
          select: {
            contest: {
              select: {
                eventId: true,
                contestantViewRestricted: true,
                contestantViewReleaseDate: true,
                event: {
                  select: {
                    contestantViewRestricted: true,
                    contestantViewReleaseDate: true
                  }
                }
              }
            }
          }
        });
        const categoryRows = await this.prisma.categoryContestant.findMany({
          where: { contestantId },
          select: {
            category: {
              select: {
                contest: {
                  select: {
                    eventId: true,
                    contestantViewRestricted: true,
                    contestantViewReleaseDate: true,
                    event: {
                      select: {
                        contestantViewRestricted: true,
                        contestantViewReleaseDate: true
                      }
                    }
                  }
                }
              }
            }
          }
        });

        const visibleEventIds = new Set<string>();
        contestRows.forEach((row: any) => {
          const contest = row?.contest;
          if (!contest?.eventId) return;
          if (this.isContestVisibleToContestant(contest)) {
            visibleEventIds.add(contest.eventId);
          }
        });
        categoryRows.forEach((row: any) => {
          const contest = row?.category?.contest;
          if (!contest?.eventId) return;
          if (this.isContestVisibleToContestant(contest)) {
            visibleEventIds.add(contest.eventId);
          }
        });

        filteredEvents = filteredEvents.filter((event: any) => {
          return visibleEventIds.has(event.id);
        });
      }

      sendSuccess(res, filteredEvents);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get event by ID
   */
  getEventById = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }
      const event = await this.eventService.getEventById(id);
      return sendSuccess(res, event);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get event with full details
   */
  getEventWithDetails = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }
      const event = await this.eventService.getEventWithDetails(id);
      return sendSuccess(res, event);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get upcoming events
   */
  getUpcomingEvents = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const events = await this.eventService.getUpcomingEvents();
      return sendSuccess(res, events);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get ongoing events
   */
  getOngoingEvents = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const events = await this.eventService.getOngoingEvents();
      return sendSuccess(res, events);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get past events
   */
  getPastEvents = async (_req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const events = await this.eventService.getPastEvents();
      return sendSuccess(res, events);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Create new event
   */
  createEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tenantId = (req as any).tenantId || req.user?.tenantId;
      if (!tenantId) {
        sendBadRequest(res, 'Tenant context is required to create an event');
        return;
      }
      const event = await this.eventService.createEvent({ ...req.body, tenantId });

      // Audit log: event creation
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'event.created',
          'Event',
          event.id,
          req,
          undefined,
          { name: event.name, startDate: event.startDate, endDate: event.endDate }
        );
      } catch (auditError) {
        logger.error('Failed to log event creation audit', { error: auditError });
      }

      sendCreated(res, event, 'Event created successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Update event
   */
  updateEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }

      // Get old data for change tracking
      const oldEvent = await this.eventService.getEventById(id);

      const event = await this.eventService.updateEvent(id, req.body);

      // Audit log: event update with change tracking
      try {
        const auditLogService = container.resolve(AuditLogService);
        const tenantId = (req as any).tenantId || 'default_tenant';
        await auditLogService.logEntityChange({
          action: 'event.updated',
          entityType: 'Event',
          entityId: id,
          oldData: oldEvent,
          newData: event,
          req,
          tenantId
        });
      } catch (auditError) {
        logger.error('Failed to log event update audit', { error: auditError });
      }

      return sendSuccess(res, event, 'Event updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete event (soft delete)
   * S4-3: Soft delete with deletedBy tracking
   */
  deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }

      // Get event data before deletion for audit log
      const event = await this.eventService.getEventById(id);

      // S4-3: Pass userId for deletedBy tracking
      const userId = req.user?.id;
      await this.eventService.deleteEvent(id, userId);

      // Audit log: event deletion
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'event.deleted',
          'Event',
          id,
          req,
          undefined,
          { name: event.name, startDate: event.startDate, endDate: event.endDate, deletedBy: userId }
        );
      } catch (auditError) {
        logger.error('Failed to log event deletion audit', { error: auditError });
      }

      return sendSuccess(res, null, 'Event deleted successfully', 204);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Restore soft-deleted event
   * S4-3: Restore functionality
   */
  restoreEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }

      const restoredEvent = await this.eventService.restoreEvent(id);

      // Audit log: event restoration
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'event.restored',
          'Event',
          id,
          req,
          undefined,
          { name: restoredEvent.name }
        );
      } catch (auditError) {
        logger.error('Failed to log event restoration audit', { error: auditError });
      }

      return sendSuccess(res, restoredEvent, 'Event restored successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Archive event
   */
  archiveEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }
      const event = await this.eventService.archiveEvent(id);

      // Audit log: event archived
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'event.archived',
          'Event',
          id,
          req,
          undefined,
          { name: event.name, archived: true }
        );
      } catch (auditError) {
        logger.error('Failed to log event archive audit', { error: auditError });
      }

      return sendSuccess(res, event, 'Event archived successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Unarchive event
   */
  unarchiveEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }
      const event = await this.eventService.unarchiveEvent(id);

      // Audit log: event unarchived
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'event.unarchived',
          'Event',
          id,
          req,
          undefined,
          { name: event.name, archived: false }
        );
      } catch (auditError) {
        logger.error('Failed to log event unarchive audit', { error: auditError });
      }

      return sendSuccess(res, event, 'Event unarchived successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Get event statistics
   */
  getEventStats = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendBadRequest(res, 'Event ID is required');
      }
      const stats = await this.eventService.getEventStats(id);
      return sendSuccess(res, stats);
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Search events
   */
  searchEvents = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string') {
        return sendSuccess(res, []);
      }

      const events = await this.eventService.searchEvents(q);
      return sendSuccess(res, events);
    } catch (error) {
      return next(error);
    }
  };
}

// Create controller instance
const controller = new EventsController();

// Export individual methods for backward compatibility
export const getAllEvents = controller.getAllEvents;
export const getEventById = controller.getEventById;
export const getEventWithDetails = controller.getEventWithDetails;
export const getUpcomingEvents = controller.getUpcomingEvents;
export const getOngoingEvents = controller.getOngoingEvents;
export const getPastEvents = controller.getPastEvents;
export const createEvent = controller.createEvent;
export const updateEvent = controller.updateEvent;
export const deleteEvent = controller.deleteEvent;
export const restoreEvent = controller.restoreEvent;  // S4-3: Restore soft-deleted events
export const archiveEvent = controller.archiveEvent;
export const unarchiveEvent = controller.unarchiveEvent;
export const getEventStats = controller.getEventStats;
export const searchEvents = controller.searchEvents;

export default controller;
