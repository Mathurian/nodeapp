import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { ArchiveService } from '../services/ArchiveService';
import { createRequestLogger } from '../utils/logger';

/**
 * Controller for Archive management
 * Handles archiving and restoring events
 */
export class ArchiveController {
  private archiveService: ArchiveService;

  constructor() {
    this.archiveService = container.resolve(ArchiveService);
  }

  /**
   * Get all archives
   */
  getAllArchives = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const archives = await this.archiveService.getAllArchives();
      res.json(archives);
    } catch (error) {
      log.error('Get archives error:', error);
      next(error);
    }
  };

  /**
   * Get active events
   */
  getActiveEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const events = await this.archiveService.getActiveEvents();
      res.json(events);
    } catch (error) {
      log.error('Get active events error:', error);
      next(error);
    }
  };

  /**
   * Get archived events
   */
  getArchivedEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const events = await this.archiveService.getArchivedEvents();
      res.json(events);
    } catch (error) {
      log.error('Get archived events error:', error);
      next(error);
    }
  };

  /**
   * Archive an item
   */
  archiveItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const { type, id } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!id) {
        res.status(400).json({ error: 'Item ID required' });
        return;
      }

      const archive = await this.archiveService.archiveItem(id, reason, userId);
      res.json(archive);
    } catch (error) {
      log.error('Archive item error:', error);
      next(error);
    }
  };

  /**
   * Restore an item
   */
  restoreItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const { type, id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Item ID required' });
        return;
      }

      const result = await this.archiveService.restoreItem(id);
      res.json(result);
    } catch (error) {
      log.error('Restore item error:', error);
      next(error);
    }
  };

  /**
   * Delete an archived item
   */
  deleteArchivedItem = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const { type, id } = req.params;

      if (!id) {
        res.status(400).json({ error: 'Item ID required' });
        return;
      }

      const result = await this.archiveService.deleteArchivedItem(id);
      res.json(result);
    } catch (error) {
      log.error('Delete archived item error:', error);
      next(error);
    }
  };

  /**
   * Archive an event
   */
  archiveEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const { eventId } = req.params;
      const { reason } = req.body;
      const userId = req.user?.id;

      if (!eventId || !userId) {
        res.status(400).json({ error: 'Event ID and user required' });
        return;
      }

      const archive = await this.archiveService.archiveEvent(eventId, userId, reason);
      res.json(archive);
    } catch (error) {
      log.error('Archive event error:', error);
      next(error);
    }
  };

  /**
   * Restore an event
   */
  restoreEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'archive');
    try {
      const { eventId } = req.params;

      if (!eventId) {
        res.status(400).json({ error: 'Event ID required' });
        return;
      }

      const result = await this.archiveService.restoreEvent(eventId);
      res.json(result);
    } catch (error) {
      log.error('Restore event error:', error);
      next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new ArchiveController();
export const getAllArchives = controller.getAllArchives;
export const getActiveEvents = controller.getActiveEvents;
export const getArchivedEvents = controller.getArchivedEvents;
export const archiveItem = controller.archiveItem;
export const restoreItem = controller.restoreItem;
export const deleteArchivedItem = controller.deleteArchivedItem;
export const archiveEvent = controller.archiveEvent;
export const restoreEvent = controller.restoreEvent;
