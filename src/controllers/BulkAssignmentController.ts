import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { BulkOperationService } from '../services/BulkOperationService';
import { AssignmentService } from '../services/AssignmentService';
import { createLogger } from '../utils/logger';

type BulkDeleteAssignmentType = 'judge' | 'contestant' | 'tally-master' | 'auditor';

interface BulkDeleteAssignmentItem {
  id?: string;
  categoryId?: string;
  contestantId?: string;
}

interface NormalizedBulkDeleteRequest {
  assignmentType: BulkDeleteAssignmentType;
  items: BulkDeleteAssignmentItem[];
}

@injectable()
export class BulkAssignmentController {
  constructor(
    @inject(BulkOperationService) private bulkOperationService: BulkOperationService,
    @inject(AssignmentService) private assignmentService: AssignmentService
  ) {}

  private logger = createLogger('BulkAssignmentController');

  private getEffectiveTenantId(req: Request): string | undefined {
    return (req as any).tenantId || req.user?.tenantId;
  }

  private normalizeBulkDeleteRequest(body: Record<string, unknown>): NormalizedBulkDeleteRequest {
    const assignmentTypeRaw = typeof body['assignmentType'] === 'string'
      ? body['assignmentType'].trim()
      : '';
    const assignmentType = (assignmentTypeRaw || 'judge') as BulkDeleteAssignmentType;
    const supportedTypes: BulkDeleteAssignmentType[] = [
      'judge',
      'contestant',
      'tally-master',
      'auditor',
    ];

    if (!supportedTypes.includes(assignmentType)) {
      throw new Error('Unsupported assignmentType');
    }

    const rawItems = Array.isArray(body['items']) ? body['items'] : [];
    const assignmentIds = Array.isArray(body['assignmentIds']) ? body['assignmentIds'] : [];
    const items = rawItems.length > 0
      ? rawItems
      : assignmentIds.map((id) => ({ id }));

    if (items.length === 0) {
      throw new Error('Bulk delete items are required');
    }

    if (assignmentType === 'contestant') {
      const normalizedItems = items.map((item) => {
        const candidate = item as BulkDeleteAssignmentItem;
        const categoryId = String(candidate.categoryId || '').trim();
        const contestantId = String(candidate.contestantId || '').trim();
        const id = typeof candidate.id === 'string' ? candidate.id.trim() : undefined;

        if (!categoryId || !contestantId) {
          throw new Error(
            'Contestant bulk delete items must include categoryId and contestantId'
          );
        }

        return { id, categoryId, contestantId };
      });

      return {
        assignmentType,
        items: normalizedItems,
      };
    }

    const normalizedItems = items.map((item) => {
      const candidate = item as BulkDeleteAssignmentItem;
      const id = String(candidate.id || '').trim();

      if (!id) {
        throw new Error(`${assignmentType} bulk delete items must include id`);
      }

      return { id };
    });

    return {
      assignmentType,
      items: normalizedItems,
    };
  }

  private async deleteBulkAssignmentItem(
    assignmentType: BulkDeleteAssignmentType,
    item: BulkDeleteAssignmentItem,
    tenantId: string
  ): Promise<void> {
    switch (assignmentType) {
      case 'judge':
        await this.assignmentService.deleteAssignment(String(item.id), tenantId);
        return;
      case 'contestant':
        await this.assignmentService.removeContestantFromCategory(
          String(item.categoryId),
          String(item.contestantId),
          tenantId
        );
        return;
      case 'tally-master':
        await this.assignmentService.removeTallyMasterAssignment(String(item.id), tenantId);
        return;
      case 'auditor':
        await this.assignmentService.removeAuditorAssignment(String(item.id), tenantId);
        return;
    }
  }

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
      const tenantId = this.getEffectiveTenantId(req);
      if (!tenantId) {
        res.status(400).json({ error: 'Tenant context is required' });
        return;
      }

      const { assignmentType, items } = this.normalizeBulkDeleteRequest(
        (req.body || {}) as Record<string, unknown>
      );

      const result = await this.bulkOperationService.executeBulkOperation(
        async (item: BulkDeleteAssignmentItem) => {
          await this.deleteBulkAssignmentItem(assignmentType, item, tenantId);
        },
        items,
        { batchSize: 10, continueOnError: true }
      );

      this.logger.info('Bulk delete assignments completed', {
        userId: req.user?.id,
        tenantId,
        assignmentType,
        count: items.length,
        result
      });

      res.json({
        message: result.failed > 0
          ? 'Bulk delete assignments completed with partial failures'
          : 'Bulk delete assignments completed',
        assignmentType,
        result
      });
    } catch (error) {
      this.logger.error('Bulk delete assignments failed', { error });
      const errorMessage = error instanceof Error ? error.message : String(error);
      const isValidationError = [
        'Unsupported assignmentType',
        'Bulk delete items are required',
        'Contestant bulk delete items must include categoryId and contestantId',
        'judge bulk delete items must include id',
        'tally-master bulk delete items must include id',
        'auditor bulk delete items must include id',
      ].includes(errorMessage);

      if (isValidationError) {
        res.status(400).json({ error: errorMessage });
        return;
      }

      res.status(500).json({
        error: 'Failed to delete assignments',
        details: errorMessage
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
          if (!assignment) {
            throw new Error(`Assignment ${assignmentId} not found`);
          }
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
