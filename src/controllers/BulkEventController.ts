import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { BulkOperationService } from '../services/BulkOperationService';
import { EventService } from '../services/EventService';
import { createLogger } from '../utils/logger';

const Logger = createLogger('BulkEventController');

@injectable()
export class BulkEventController {
  constructor(
    @inject(BulkOperationService) private bulkOperationService: BulkOperationService,
    @inject(EventService) private eventService: EventService
  ) {}

  async changeEventStatus(req: Request, res: Response): Promise<void> {
    try {
      const { eventIds, status } = req.body;

      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        res.status(400).json({ error: 'eventIds array is required' });
        return;
      }

      const validStatuses = ['DRAFT', 'SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
      if (!validStatuses.includes(status)) {
        res.status(400).json({
          error: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
        });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (eventId: string) => {
          const event = await this.eventService.getEventById(eventId);
          await this.eventService.updateEvent(eventId, { ...event, status } as any);
        },
        eventIds
      );

      Logger.info('Bulk change event status completed', { result, userId: req.user?.id });

      res.json({
        message: 'Bulk status change completed',
        result
      });
    } catch (error) {
      Logger.error('Bulk change event status failed', { error });
      res.status(500).json({
        error: 'Failed to change event status',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async deleteEvents(req: Request, res: Response): Promise<void> {
    try {
      const { eventIds } = req.body;

      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        res.status(400).json({ error: 'eventIds array is required' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (eventId: string) => {
          await this.eventService.deleteEvent(eventId);
        },
        eventIds
      );

      Logger.info('Bulk delete events completed', { result, userId: req.user?.id });

      res.json({
        message: 'Bulk delete completed',
        result
      });
    } catch (error) {
      Logger.error('Bulk delete events failed', { error });
      res.status(500).json({
        error: 'Failed to delete events',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  async cloneEvents(req: Request, res: Response): Promise<void> {
    try {
      const { eventIds } = req.body;

      if (!Array.isArray(eventIds) || eventIds.length === 0) {
        res.status(400).json({ error: 'eventIds array is required' });
        return;
      }

      const clonedEvents: any[] = [];

      const result = await this.bulkOperationService.executeBulkOperation(
        async (eventId: string) => {
          const event = await this.eventService.getEventById(eventId);
          const cloned = await this.eventService.createEvent({
            ...event,
            name: event.name + ' (Copy)',
            status: 'DRAFT'
          } as any);
          clonedEvents.push(cloned);
        },
        eventIds
      );

      Logger.info('Bulk clone events completed', { result, userId: req.user?.id });

      res.json({
        message: 'Bulk clone completed',
        result,
        clonedEvents
      });
    } catch (error) {
      Logger.error('Bulk clone events failed', { error });
      res.status(500).json({
        error: 'Failed to clone events',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
