import { Request, Response } from 'express';
import { injectable, inject } from 'tsyringe';
import { BulkOperationService } from '../services/BulkOperationService';
import { ContestService } from '../services/ContestService';
import { createLogger } from '../utils/logger';

@injectable()
export class BulkContestController {
  constructor(
    @inject(BulkOperationService) private bulkOperationService: BulkOperationService,
    @inject(ContestService) private contestService: ContestService
  ) {}

  private logger = createLogger('BulkContestController');

  /**
   * POST /api/bulk/contests/delete
   * Delete multiple contests
   */
  async deleteContests(req: Request, res: Response): Promise<void> {
    try {
      const { contestIds } = req.body;

      if (!Array.isArray(contestIds) || contestIds.length === 0) {
        res.status(400).json({ error: 'contestIds array is required' });
        return;
      }

      const result = await this.bulkOperationService.executeBulkOperation(
        async (contestId: string) => {
          await this.contestService.deleteContest(contestId);
        },
        contestIds,
        { batchSize: 10, continueOnError: true }
      );

      this.logger.info('Bulk delete contests completed', {
        userId: req.user?.id,
        count: contestIds.length,
        result
      });

      res.json({
        message: 'Bulk delete completed',
        result
      });
    } catch (error) {
      this.logger.error('Bulk delete contests failed', { error });
      res.status(500).json({
        error: 'Failed to delete contests',
        details: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
