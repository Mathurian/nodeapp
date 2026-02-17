import { createLogger } from '../utils/logger';
import { WorkflowService } from './WorkflowService';

const logger = createLogger('WorkflowSchedulerService');

export default class WorkflowSchedulerService {
  private intervalHandle: NodeJS.Timeout | null = null;
  private inProgress = false;

  async start(intervalMs: number = 60000): Promise<void> {
    if (this.intervalHandle) return;
    await this.runCycle();
    this.intervalHandle = setInterval(() => {
      void this.runCycle();
    }, intervalMs);
    logger.info('Workflow scheduler started', { intervalMs });
  }

  stop(): void {
    if (!this.intervalHandle) return;
    clearInterval(this.intervalHandle);
    this.intervalHandle = null;
    logger.info('Workflow scheduler stopped');
  }

  private async runCycle(): Promise<void> {
    if (this.inProgress) return;
    this.inProgress = true;
    try {
      const publishedCount = await WorkflowService.runScheduledWinnerUnlocks(new Date());
      if (publishedCount > 0) {
        logger.info('Scheduled workflow run published winners', { publishedCount });
      }
    } catch (error) {
      logger.error('Scheduled workflow run failed', { error });
    } finally {
      this.inProgress = false;
    }
  }
}

