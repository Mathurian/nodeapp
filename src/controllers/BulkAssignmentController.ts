import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { BulkOperationService } from '../services/BulkOperationService';
import { AssignmentService } from '../services/AssignmentService';
import { createLogger } from '../utils/logger';

@injectable()
export class BulkAssignmentController {
  constructor(
    @inject(BulkOperationService) private bulkOperationService: BulkOperationService,
    @inject(AssignmentService) private assignmentService: AssignmentService
  ) {}

  private logger = createLogger('BulkAssignmentController');

  /**
   * POST /api/bulk/assignments/create
   * Create multiple assignments
   */
  async createAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { assignments } = req.body;

      if (!Array.isArray(assignments) || assignments.length === 0) {
        res.status(400).json({ error: 'assignments array is required' });
        return;
      }

      // Validate each assignment has required fields
      for (const assignment of assignments) {
        if (!assignment.judgeId || !assignment.contestId) {
          res.status(400).json({
            error: 'Each assignment must have judgeId and contestId'
          });
          return;
        }
      }

      const createdAssignments: any[] = [];

      const userId = (req as any).user?.id || 'system';

      const result = await this.bulkOperationService.executeBulkOperation(
        async (assignmentData: any) => {
          const created = await this.assignmentService.createAssignment(assignmentData, userId);
          createdAssignments.push(created);
        },
        assignments,
        { batchSize: 10, continueOnError: true }
      );

      this.logger.info('Bulk create assignments completed', {
        userId: req.user?.id,
        count: assignments.length,
        result
      });

      res.json({
        message: 'Bulk create assignments completed',
        result,
        assignments: createdAssignments
      });
    } catch (error) {
      this.logger.error('Bulk create assignments failed', { error });
      res.status(500).json({
        error: 'Failed to create assignments',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/bulk/assignments/delete
   * Delete multiple assignments
   */
  async deleteAssignments(req: Request, res: Response): Promise<void> {
    try {
      const { assignmentIds } = req.body;

      if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        res.status(400).json({ error: 'assignmentIds array is required' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (assignmentId: string) => {
          await this.assignmentService.deleteAssignment(assignmentId);
        },
        assignmentIds,
        { batchSize: 10, continueOnError: true }
      );

      this.logger.info('Bulk delete assignments completed', {
        userId: req.user?.id,
        count: assignmentIds.length,
        result
      });

      res.json({
        message: 'Bulk delete assignments completed',
        result
      });
    } catch (error) {
      this.logger.error('Bulk delete assignments failed', { error });
      res.status(500).json({
        error: 'Failed to delete assignments',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * POST /api/bulk/assignments/reassign
   * Reassign judges for multiple assignments
   */
  async reassignJudges(req: Request, res: Response): Promise<void> {
    try {
      const { assignmentIds, newJudgeId } = req.body;

      if (!Array.isArray(assignmentIds) || assignmentIds.length === 0) {
        res.status(400).json({ error: 'assignmentIds array is required' });
        return;
      }

      if (!newJudgeId) {
        res.status(400).json({ error: 'newJudgeId is required' });
        return;
      }

      const userId = (req as any).user?.id || 'system';

      // Note: UpdateAssignmentInput doesn't include judgeId, so we need to delete and recreate
      // For now, just update the status as a workaround
      const result = await this.bulkOperationService.executeBulkOperation(
        async (assignmentId: string) => {
          // Get the assignment first
          const assignment = await this.assignmentService.getAssignmentById(assignmentId);
          // Delete old assignment
          await this.assignmentService.deleteAssignment(assignmentId);
          // Create new assignment with new judge
          await this.assignmentService.createAssignment({
            judgeId: newJudgeId,
            contestId: assignment.contestId || undefined,
            categoryId: assignment.categoryId || undefined,
            eventId: assignment.eventId || undefined,
            notes: assignment.notes || undefined,
            priority: assignment.priority || undefined
          }, userId);
        },
        assignmentIds,
        { batchSize: 10, continueOnError: true }
      );

      this.logger.info('Bulk reassign judges completed', {
        userId: req.user?.id,
        count: assignmentIds.length,
        newJudgeId,
        result
      });

      res.json({
        message: 'Bulk reassign judges completed',
        result
      });
    } catch (error) {
      this.logger.error('Bulk reassign judges failed', { error });
      res.status(500).json({
        error: 'Failed to reassign judges',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
