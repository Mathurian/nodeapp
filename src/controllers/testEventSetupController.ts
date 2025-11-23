/**
 * Test Event Setup Controller
 * Handles HTTP requests for test event creation
 */

import { Request, Response, NextFunction } from 'express';
import { container } from 'tsyringe';
import { TestEventSetupService, TestEventConfig } from '../services/TestEventSetupService';
import { sendCreated, sendSuccess } from '../utils/responseHelpers';
import { createRequestLogger } from '../utils/logger';

export class TestEventSetupController {
  private testEventSetupService: TestEventSetupService;

  constructor() {
    this.testEventSetupService = container.resolve(TestEventSetupService);
  }

  /**
   * Create a test event with configurable options
   */
  createTestEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'testEventSetup');
    try {
      const config: TestEventConfig = req.body;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      const result = await this.testEventSetupService.createTestEvent(
        config,
        req.user.id,
        req.user.role
      );

      log.info('Test event created', { eventId: result.eventId, userId: req.user.id });
      sendCreated(res, result, result.message);
    } catch (error) {
      log.error('Create test event error', { error: (error as Error).message });
      return next(error);
    }
  };

  /**
   * Delete a test event and optionally its tenant
   */
  deleteTestEvent = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const log = createRequestLogger(req, 'testEventSetup');
    try {
      const { eventId } = req.params;
      const { deleteTenant } = req.query;

      if (!req.user) {
        throw new Error('User not authenticated');
      }

      if (!eventId) {
        throw new Error('Event ID is required');
      }

      const result = await this.testEventSetupService.deleteTestEvent(
        eventId,
        req.user.role,
        deleteTenant === 'true'
      );

      log.info('Test event deleted', { eventId, userId: req.user.id, deleteTenant });
      sendSuccess(res, result.deletedCounts, result.message);
    } catch (error) {
      log.error('Delete test event error', { error: (error as Error).message });
      return next(error);
    }
  };
}

// Create controller instance and export methods
const controller = new TestEventSetupController();

export const createTestEvent = controller.createTestEvent;
export const deleteTestEvent = controller.deleteTestEvent;


