import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { EmceeService } from '../services/EmceeService';
import { createRequestLogger } from '../utils/logger';
import { sendSuccess } from '../utils/responseHelpers';

/**
 * Controller for Emcee functionality
 * Handles scripts, contestant/judge bios, and event access
 */
export class EmceeController {
  private emceeService: EmceeService;

  constructor() {
    this.emceeService = container.resolve(EmceeService);
  }

  /**
   * Get emcee dashboard statistics
   */
  getStats = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const stats = await this.emceeService.getStats();
      res.json(stats);
    } catch (error) {
      log.error('Get emcee stats error:', error);
      return next(error);
    }
  };

  /**
   * Get scripts filtered by event/contest/category
   */
  getScripts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { eventId, contestId, categoryId } = req.query;

      const scripts = await this.emceeService.getScripts({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string,
      });

      res.json(scripts);
    } catch (error) {
      log.error('Get scripts error:', error);
      return next(error);
    }
  };

  /**
   * Get specific script by ID
   */
  getScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { scriptId } = req.params;
      if (!scriptId) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }
      const script = await this.emceeService.getScript(scriptId);
      res.json(script);
    } catch (error) {
      log.error('Get script error:', error);
      return next(error);
    }
  };

  /**
   * Get contestant bios
   */
  getContestantBios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { eventId, contestId, categoryId } = req.query;

      const contestants = await this.emceeService.getContestantBios({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string,
      });

      sendSuccess(res, contestants, 'Contestant bios retrieved successfully');
    } catch (error) {
      log.error('Get contestant bios error:', error);
      return next(error);
    }
  };

  /**
   * Get judge bios
   */
  getJudgeBios = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { eventId, contestId, categoryId } = req.query;

      const judges = await this.emceeService.getJudgeBios({
        eventId: eventId as string,
        contestId: contestId as string,
        categoryId: categoryId as string,
      });

      sendSuccess(res, judges, 'Judge bios retrieved successfully');
    } catch (error) {
      log.error('Get judge bios error:', error);
      return next(error);
    }
  };

  /**
   * Get all events
   */
  getEvents = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const events = await this.emceeService.getEvents();
      res.json(events);
    } catch (error) {
      log.error('Get events error:', error);
      return next(error);
    }
  };

  /**
   * Get specific event
   */
  getEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { eventId } = req.params;
      if (!eventId) {
        res.status(400).json({ error: 'Event ID required' });
        return;
      }
      const event = await this.emceeService.getEvent(eventId);
      res.json(event);
    } catch (error) {
      log.error('Get event error:', error);
      return next(error);
    }
  };

  /**
   * Get contests
   */
  getContests = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { eventId } = req.query;
      const contests = await this.emceeService.getContests(eventId as string);
      res.json(contests);
    } catch (error) {
      log.error('Get contests error:', error);
      return next(error);
    }
  };

  /**
   * Get specific contest
   */
  getContest = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { contestId } = req.params;
      if (!contestId) {
        res.status(400).json({ error: 'Contest ID required' });
        return;
      }
      const contest = await this.emceeService.getContest(contestId);
      res.json(contest);
    } catch (error) {
      log.error('Get contest error:', error);
      return next(error);
    }
  };

  /**
   * Get emcee history
   */
  getEmceeHistory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const history = await this.emceeService.getEmceeHistory(page, limit);
      res.json(history);
    } catch (error) {
      log.error('Get emcee history error:', error);
      return next(error);
    }
  };

  /**
   * Upload/create new script
   */
  uploadScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { title, content, eventId, contestId, categoryId, order } = req.body;

      let filePath: string | null = null;
      if (req.file) {
        filePath = `/uploads/emcee/${req.file.filename}`;
      }

      const script = await this.emceeService.uploadScript({
        title,
        content,
        filePath,
        eventId,
        contestId,
        categoryId,
        order: order ? parseInt(order) : 0,
      });

      res.status(201).json(script);
    } catch (error) {
      log.error('Upload script error:', error);
      return next(error);
    }
  };

  /**
   * Update existing script
   */
  updateScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }
      const { title, content, eventId, contestId, categoryId, order } = req.body;

      const script = await this.emceeService.updateScript(id, {
        title,
        content,
        eventId,
        contestId,
        categoryId,
        order: order ? parseInt(order) : 0,
      });

      res.json(script);
    } catch (error) {
      log.error('Update script error:', error);
      return next(error);
    }
  };

  /**
   * Delete script
   */
  deleteScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }
      await this.emceeService.deleteScript(id);
      res.status(204).send();
    } catch (error) {
      log.error('Delete script error:', error);
      return next(error);
    }
  };

  /**
   * Toggle script (legacy endpoint - just returns script)
   */
  toggleScript = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }
      const script = await this.emceeService.getScript(id);
      res.json(script);
    } catch (error) {
      log.error('Toggle script error:', error);
      return next(error);
    }
  };

  /**
   * Serve script file
   */
  serveScriptFile = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { scriptId } = req.params;
      if (!scriptId) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }
      const script = await this.emceeService.getScriptFileInfo(scriptId);

      if (!script.filePath) {
        res.status(404).json({ error: 'Script file not found' });
        return;
      }

      const path = require('path');
      const fs = require('fs');
      const filePath = path.join(__dirname, '../../', script.filePath);

      // Stream file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (error) {
      log.error('Serve script file error:', error);
      return next(error);
    }
  };

  /**
   * Get file view URL
   */
  getFileViewUrl = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'emcee');
    try {
      const { scriptId } = req.params;
      if (!scriptId) {
        res.status(400).json({ error: 'Script ID required' });
        return;
      }
      await this.emceeService.getScriptFileInfo(scriptId);

      const viewUrl = `/api/emcee/scripts/${scriptId}/view`;
      res.json({ viewUrl, expiresIn: 300 });
    } catch (error) {
      log.error('Get file view URL error:', error);
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new EmceeController();
export const getStats = controller.getStats;
export const getScripts = controller.getScripts;
export const getScript = controller.getScript;
export const getContestantBios = controller.getContestantBios;
export const getJudgeBios = controller.getJudgeBios;
export const getEvents = controller.getEvents;
export const getEvent = controller.getEvent;
export const getContests = controller.getContests;
export const getContest = controller.getContest;
export const getEmceeHistory = controller.getEmceeHistory;
export const uploadScript = controller.uploadScript;
export const updateScript = controller.updateScript;
export const deleteScript = controller.deleteScript;
export const toggleScript = controller.toggleScript;
export const serveScriptFile = controller.serveScriptFile;
export const getFileViewUrl = controller.getFileViewUrl;
