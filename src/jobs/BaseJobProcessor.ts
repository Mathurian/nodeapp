import { Job } from 'bullmq';
import { container } from 'tsyringe';
import { Logger } from '../utils/logger';
import { ErrorLogService } from '../services/ErrorLogService';

/**
 * Base Job Processor
 *
 * Abstract base class for all job processors
 * Provides common functionality and error handling
 */
export abstract class BaseJobProcessor<T = any> {
  protected readonly jobName: string;
  protected readonly logger: Logger;

  constructor(jobName: string) {
    this.jobName = jobName;
    this.logger = new Logger(jobName);
  }

  /**
   * Process a job
   * Must be implemented by subclasses
   */
  abstract process(job: Job<T>): Promise<any>;

  /**
   * Handle job with error handling and logging
   */
  async handle(job: Job<T>): Promise<any> {
    const startTime = Date.now();

    try {
      this.logger.info(`Processing job: ${this.jobName}`, {
        jobId: job.id,
        jobName: job.name,
        attempt: job.attemptsMade,
      });

      // Update job progress
      await job.updateProgress(0);

      // Process the job
      const result = await this.process(job);

      // Mark as complete
      await job.updateProgress(100);

      const duration = Date.now() - startTime;
      this.logger.info(`Job completed: ${this.jobName}`, {
        jobId: job.id,
        duration: `${duration}ms`,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(`Job failed: ${this.jobName}`, {
        jobId: job.id,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: `${duration}ms`,
        attempt: job.attemptsMade,
      });

      throw error; // Re-throw to let BullMQ handle retries
    }
  }

  /**
   * Validate job data
   * Override in subclasses for specific validation
   */
  protected validate(data: T): void {
    if (!data) {
      throw new Error('Job data is required');
    }
  }

  /**
   * Handle job failure
   * Override in subclasses for custom failure handling
   */
  protected async onFailed(job: Job<T>, error: Error): Promise<void> {
    this.logger.error(`Job permanently failed: ${this.jobName}`, {
      jobId: job.id,
      error: error.message,
      attempts: job.attemptsMade,
    });

    // Log job failure to database
    try {
      const errorLogService = container.resolve(ErrorLogService);
      const tenantId = (job.data as any)?.tenantId;

      await errorLogService.logException(
        error,
        `${this.jobName}:job-failed`,
        {
          jobId: job.id,
          jobName: job.name,
          attempts: job.attemptsMade,
          failedAt: new Date().toISOString(),
        },
        tenantId
      );
    } catch (logError) {
      this.logger.error('Failed to log job error to database', { error: logError });
    }
  }

  /**
   * Handle job completion
   * Override in subclasses for custom completion handling
   */
  protected async onCompleted(job: Job<T>, result: any): Promise<void> {
    this.logger.info(`Job completed successfully: ${this.jobName}`, {
      jobId: job.id,
      result,
    });
  }
}

export default BaseJobProcessor;
