/**
 * Events Controller - TypeScript
 * Handles HTTP requests for event management
 */

import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../utils/responseHelpers';
import { container } from 'tsyringe';
import { EventService } from '../services/EventService';
import { AuditLogService } from '../services/AuditLogService';

/**
 * Success response helper
 */
const successResponse = (res: Response, data: unknown, message?: string, status: number = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data,
  });
};

/**
 * Events Controller Class
 */
export class EventsController {
  private eventService: EventService;

  constructor() {
    this.eventService = container.resolve(EventService);
  }

  /**
   * Get all events
   */
  getAllEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { archived, search } = req.query;

      const filters: { archived?: boolean; search?: string } = {};
      if (archived !== undefined) {
        filters.archived = archived === 'true';
      }
      if (search && typeof search === 'string') {
        filters.search = search;
      }

      const events = await this.eventService.getAllEvents(filters);

      // Compute status based on dates
      const now = new Date();
      const eventsWithStatus = events.map(event => {
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

      sendSuccess(res, eventsWithStatus);
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
        return sendSuccess(res, null, 'Event ID is required', 400);
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
        return sendSuccess(res, null, 'Event ID is required', 400);
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
      const event = await this.eventService.createEvent(req.body);

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
        console.error('Failed to log event creation audit:', auditError);
      }

      successResponse(res, event, 'Event created successfully', 201);
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
        return sendSuccess(res, null, 'Event ID is required', 400);
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
        console.error('Failed to log event update audit:', auditError);
      }

      return sendSuccess(res, event, 'Event updated successfully');
    } catch (error) {
      return next(error);
    }
  };

  /**
   * Delete event
   */
  deleteEvent = async (req: Request, res: Response, next: NextFunction): Promise<Response | void> => {
    try {
      const { id } = req.params;
      if (!id) {
        return sendSuccess(res, null, 'Event ID is required', 400);
      }

      // Get event data before deletion for audit log
      const event = await this.eventService.getEventById(id);

      await this.eventService.deleteEvent(id);

      // Audit log: event deletion
      try {
        const auditLogService = container.resolve(AuditLogService);
        await auditLogService.logFromRequest(
          'event.deleted',
          'Event',
          id,
          req,
          undefined,
          { name: event.name, startDate: event.startDate, endDate: event.endDate }
        );
      } catch (auditError) {
        console.error('Failed to log event deletion audit:', auditError);
      }

      return sendSuccess(res, null, 'Event deleted successfully', 204);
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
        return sendSuccess(res, null, 'Event ID is required', 400);
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
        console.error('Failed to log event archive audit:', auditError);
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
        return sendSuccess(res, null, 'Event ID is required', 400);
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
        console.error('Failed to log event unarchive audit:', auditError);
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
        return sendSuccess(res, null, 'Event ID is required', 400);
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
export const archiveEvent = controller.archiveEvent;
export const unarchiveEvent = controller.unarchiveEvent;
export const getEventStats = controller.getEventStats;
export const searchEvents = controller.searchEvents;

export default controller;
