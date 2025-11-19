import { Queue, Worker, Job, JobsOptions } from 'bullmq';
import Redis from 'ioredis';
import { Logger } from '../utils/logger';
import { env } from '../config/env';

/**
 * Queue Service
 *
 * Manages background job processing using BullMQ
 *
 * Features:
 * - Multiple queues for different job types
 * - Job prioritization
 * - Retry logic with exponential backoff
 * - Job progress tracking
 * - Dead letter queue for failed jobs
 * - Scheduled/cron jobs
 *
 * Queue Types:
 * - email: Email sending jobs
 * - reports: Report generation jobs
 * - import: Data import jobs
 * - export: Data export jobs
 * - maintenance: System maintenance jobs
 */

export class QueueService {
  private static instance: QueueService;
  private connection: Redis;
  private queues: Map<string, Queue>;
  private workers: Map<string, Worker>;
  private logger: Logger;

  private constructor() {
    this.logger = new Logger('QueueService');

    // Create Redis connection
    const redisUrl = env.get('REDIS_URL') || 'redis://localhost:6379';
    this.connection = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.queues = new Map();
    this.workers = new Map();

    this.setupEventListeners();
  }

  static getInstance(): QueueService {
    if (!QueueService.instance) {
      QueueService.instance = new QueueService();
    }
    return QueueService.instance;
  }

  /**
   * Get or create a queue
   */
  getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.connection,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 3600, // Keep completed jobs for 1 hour
            count: 1000, // Keep last 1000 completed jobs
          },
          removeOnFail: {
            age: 86400, // Keep failed jobs for 24 hours
          },
        },
      });

      this.queues.set(name, queue);

      // Note: QueueScheduler was removed in BullMQ v2+
      // Delayed jobs are now handled automatically by Workers
    }

    return this.queues.get(name)!;
  }

  /**
   * Add a job to a queue
   */
  async addJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    options?: JobsOptions
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, options);

    this.logger.info('Job added to queue', {
      queue: queueName,
      jobId: job.id,
      jobName,
    });

    return job;
  }

  /**
   * Add a scheduled job (cron)
   */
  async addScheduledJob<T = any>(
    queueName: string,
    jobName: string,
    data: T,
    cronExpression: string,
    options?: Omit<JobsOptions, 'repeat'>
  ): Promise<Job<T>> {
    const queue = this.getQueue(queueName);
    const job = await queue.add(jobName, data, {
      ...options,
      repeat: {
        pattern: cronExpression,
      },
    });

    this.logger.info('Scheduled job added', {
      queue: queueName,
      jobId: job.id,
      jobName,
      cron: cronExpression,
    });

    return job;
  }

  /**
   * Create a worker to process jobs
   */
  createWorker<T = any>(
    queueName: string,
    processor: (job: Job<T>) => Promise<any>,
    concurrency: number = 1
  ): Worker {
    if (this.workers.has(queueName)) {
      this.logger.warn('Worker already exists for queue', { queue: queueName });
      return this.workers.get(queueName)!;
    }

    const worker = new Worker(queueName, processor, {
      connection: this.connection,
      concurrency,
    });

    // Setup worker event listeners
    worker.on('completed', (job) => {
      this.logger.info('Job completed', {
        queue: queueName,
        jobId: job.id,
        jobName: job.name,
      });
    });

    worker.on('failed', (job, error) => {
      this.logger.error('Job failed', {
        queue: queueName,
        jobId: job?.id,
        jobName: job?.name,
        error: error.message,
        attempts: job?.attemptsMade,
      });
    });

    worker.on('stalled', (jobId) => {
      this.logger.warn('Job stalled', {
        queue: queueName,
        jobId,
      });
    });

    worker.on('error', (error) => {
      this.logger.error('Worker error', {
        queue: queueName,
        error: error.message,
      });
    });

    this.workers.set(queueName, worker);

    this.logger.info('Worker created', {
      queue: queueName,
      concurrency,
    });

    return worker;
  }

  /**
   * Get job by ID
   */
  async getJob(queueName: string, jobId: string): Promise<Job | undefined> {
    const queue = this.getQueue(queueName);
    return await queue.getJob(jobId);
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string) {
    const queue = this.getQueue(queueName);

    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      queue: queueName,
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllQueueStats() {
    const stats = await Promise.all(
      Array.from(this.queues.keys()).map((queueName) =>
        this.getQueueStats(queueName)
      )
    );

    return stats;
  }

  /**
   * Get jobs in a specific state
   */
  async getJobs(
    queueName: string,
    state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed',
    start: number = 0,
    end: number = 10
  ) {
    const queue = this.getQueue(queueName);

    switch (state) {
      case 'waiting':
        return await queue.getWaiting(start, end);
      case 'active':
        return await queue.getActive(start, end);
      case 'completed':
        return await queue.getCompleted(start, end);
      case 'failed':
        return await queue.getFailed(start, end);
      case 'delayed':
        return await queue.getDelayed(start, end);
      default:
        return [];
    }
  }

  /**
   * Retry a failed job
   */
  async retryJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);

    if (job) {
      await job.retry();
      this.logger.info('Job retried', { queue: queueName, jobId });
    } else {
      this.logger.warn('Job not found for retry', { queue: queueName, jobId });
    }
  }

  /**
   * Remove a job
   */
  async removeJob(queueName: string, jobId: string): Promise<void> {
    const job = await this.getJob(queueName, jobId);

    if (job) {
      await job.remove();
      this.logger.info('Job removed', { queue: queueName, jobId });
    } else {
      this.logger.warn('Job not found for removal', { queue: queueName, jobId });
    }
  }

  /**
   * Clean old jobs from queue
   */
  async cleanQueue(
    queueName: string,
    grace: number = 3600000,
    type: 'completed' | 'failed' = 'completed'
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.clean(grace, 1000, type);

    this.logger.info('Queue cleaned', { queue: queueName, type, grace });
  }

  /**
   * Pause queue
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();

    this.logger.info('Queue paused', { queue: queueName });
  }

  /**
   * Resume queue
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();

    this.logger.info('Queue resumed', { queue: queueName });
  }

  /**
   * Setup global event listeners
   */
  private setupEventListeners(): void {
    this.connection.on('error', (error) => {
      this.logger.error('Redis connection error', { error: error.message });
    });

    this.connection.on('connect', () => {
      this.logger.info('Redis connected');
    });

    this.connection.on('reconnecting', () => {
      this.logger.warn('Redis reconnecting');
    });
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down queue service...');

    // Close all workers
    await Promise.all(
      Array.from(this.workers.values()).map((worker) => worker.close())
    );

    // Note: QueueScheduler was removed in BullMQ v2+

    // Close all queues
    await Promise.all(
      Array.from(this.queues.values()).map((queue) => queue.close())
    );

    // Close Redis connection
    await this.connection.quit();

    this.logger.info('Queue service shutdown complete');
  }
}

// Export singleton instance
export default QueueService.getInstance();
