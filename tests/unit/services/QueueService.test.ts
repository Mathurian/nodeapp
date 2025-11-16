/**
 * QueueService Unit Tests
 * Comprehensive tests for BullMQ-based queue management service
 */

import 'reflect-metadata';
import { QueueService } from '../../../src/services/QueueService';
import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';

// Mock BullMQ and Redis
jest.mock('bullmq');
jest.mock('ioredis');
jest.mock('../../../src/utils/logger');

describe('QueueService', () => {
  let service: QueueService;
  let mockRedis: jest.Mocked<Redis>;
  let mockQueue: jest.Mocked<Queue>;
  let mockWorker: jest.Mocked<Worker>;
  let mockJob: jest.Mocked<Job>;

  beforeEach(() => {
    // Clear all mocks
    jest.clearAllMocks();

    // Mock Redis instance
    mockRedis = {
      on: jest.fn(),
      quit: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Redis as jest.MockedClass<typeof Redis>).mockImplementation(() => mockRedis);

    // Mock Queue
    mockQueue = {
      add: jest.fn(),
      getJob: jest.fn(),
      getWaitingCount: jest.fn(),
      getActiveCount: jest.fn(),
      getCompletedCount: jest.fn(),
      getFailedCount: jest.fn(),
      getDelayedCount: jest.fn(),
      getWaiting: jest.fn(),
      getActive: jest.fn(),
      getCompleted: jest.fn(),
      getFailed: jest.fn(),
      getDelayed: jest.fn(),
      clean: jest.fn(),
      pause: jest.fn(),
      resume: jest.fn(),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Queue as jest.MockedClass<typeof Queue>).mockImplementation(() => mockQueue);

    // Mock Worker
    mockWorker = {
      on: jest.fn().mockReturnThis(),
      close: jest.fn().mockResolvedValue(undefined),
    } as any;

    (Worker as jest.MockedClass<typeof Worker>).mockImplementation(() => mockWorker);

    // Mock Job
    mockJob = {
      id: 'job-123',
      name: 'test-job',
      data: { test: 'data' },
      retry: jest.fn().mockResolvedValue(undefined),
      remove: jest.fn().mockResolvedValue(undefined),
      attemptsMade: 0,
    } as any;

    // Get fresh singleton instance
    service = QueueService.getInstance();
  });

  afterEach(() => {
    jest.resetModules();
  });

  describe('getInstance', () => {
    it('should return singleton instance', () => {
      const instance1 = QueueService.getInstance();
      const instance2 = QueueService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should create Redis connection on initialization', () => {
      expect(Redis).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          maxRetriesPerRequest: null,
          enableReadyCheck: false,
        })
      );
    });

    it('should setup event listeners on Redis connection', () => {
      expect(mockRedis.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockRedis.on).toHaveBeenCalledWith('reconnecting', expect.any(Function));
    });
  });

  describe('getQueue', () => {
    it('should create and return a new queue', () => {
      const queue = service.getQueue('email');
      expect(queue).toBeDefined();
      expect(Queue).toHaveBeenCalledWith(
        'email',
        expect.objectContaining({
          connection: mockRedis,
          defaultJobOptions: expect.objectContaining({
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 1000,
            },
          }),
        })
      );
    });

    it('should return existing queue if already created', () => {
      const queue1 = service.getQueue('email');
      const queue2 = service.getQueue('email');
      expect(queue1).toBe(queue2);
      expect(Queue).toHaveBeenCalledTimes(1);
    });

    it('should create queue with proper retention settings', () => {
      service.getQueue('reports');
      expect(Queue).toHaveBeenCalledWith(
        'reports',
        expect.objectContaining({
          defaultJobOptions: expect.objectContaining({
            removeOnComplete: {
              age: 3600,
              count: 1000,
            },
            removeOnFail: {
              age: 86400,
            },
          }),
        })
      );
    });

    it('should create multiple different queues', () => {
      service.getQueue('email');
      service.getQueue('reports');
      service.getQueue('import');
      expect(Queue).toHaveBeenCalledTimes(3);
    });
  });

  describe('addJob', () => {
    beforeEach(() => {
      mockQueue.add.mockResolvedValue(mockJob);
    });

    it('should add job to queue successfully', async () => {
      const data = { email: 'test@example.com', subject: 'Test' };
      const job = await service.addJob('email', 'send-email', data);

      expect(mockQueue.add).toHaveBeenCalledWith('send-email', data, undefined);
      expect(job).toBe(mockJob);
    });

    it('should add job with custom options', async () => {
      const data = { reportId: '123' };
      const options = { priority: 1, delay: 5000 };

      await service.addJob('reports', 'generate-report', data, options);

      expect(mockQueue.add).toHaveBeenCalledWith('generate-report', data, options);
    });

    it('should add job with high priority', async () => {
      const data = { userId: '123' };
      const options = { priority: 10 };

      await service.addJob('notifications', 'urgent-notification', data, options);

      expect(mockQueue.add).toHaveBeenCalledWith('urgent-notification', data, options);
    });

    it('should add delayed job', async () => {
      const data = { taskId: '456' };
      const options = { delay: 60000 }; // 1 minute delay

      await service.addJob('maintenance', 'scheduled-task', data, options);

      expect(mockQueue.add).toHaveBeenCalledWith('scheduled-task', data, options);
    });

    it('should handle complex job data', async () => {
      const complexData = {
        user: { id: '123', email: 'test@example.com' },
        items: [1, 2, 3],
        metadata: { source: 'api', timestamp: Date.now() },
      };

      await service.addJob('export', 'export-data', complexData);

      expect(mockQueue.add).toHaveBeenCalledWith('export-data', complexData, undefined);
    });
  });

  describe('addScheduledJob', () => {
    beforeEach(() => {
      mockQueue.add.mockResolvedValue(mockJob);
    });

    it('should add scheduled job with cron expression', async () => {
      const data = { reportType: 'daily' };
      const cronExpression = '0 0 * * *'; // Daily at midnight

      const job = await service.addScheduledJob('reports', 'daily-report', data, cronExpression);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'daily-report',
        data,
        expect.objectContaining({
          repeat: {
            pattern: cronExpression,
          },
        })
      );
      expect(job).toBe(mockJob);
    });

    it('should add scheduled job with hourly cron', async () => {
      const data = { type: 'cleanup' };
      const cronExpression = '0 * * * *'; // Every hour

      await service.addScheduledJob('maintenance', 'hourly-cleanup', data, cronExpression);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'hourly-cleanup',
        data,
        expect.objectContaining({
          repeat: { pattern: cronExpression },
        })
      );
    });

    it('should add scheduled job with additional options', async () => {
      const data = { backupType: 'full' };
      const cronExpression = '0 2 * * 0'; // Weekly on Sunday at 2 AM
      const options = { priority: 5 };

      await service.addScheduledJob('maintenance', 'weekly-backup', data, cronExpression, options);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'weekly-backup',
        data,
        expect.objectContaining({
          priority: 5,
          repeat: { pattern: cronExpression },
        })
      );
    });

    it('should handle custom cron patterns', async () => {
      const data = { task: 'custom' };
      const cronExpression = '*/15 * * * *'; // Every 15 minutes

      await service.addScheduledJob('jobs', 'frequent-task', data, cronExpression);

      expect(mockQueue.add).toHaveBeenCalledWith(
        'frequent-task',
        data,
        expect.objectContaining({
          repeat: { pattern: cronExpression },
        })
      );
    });
  });

  describe('createWorker', () => {
    it('should create worker with processor function', () => {
      const processor = jest.fn().mockResolvedValue('result');

      const worker = service.createWorker('email', processor, 1);

      expect(Worker).toHaveBeenCalledWith(
        'email',
        processor,
        expect.objectContaining({
          connection: mockRedis,
          concurrency: 1,
        })
      );
      expect(worker).toBe(mockWorker);
    });

    it('should create worker with higher concurrency', () => {
      const processor = jest.fn().mockResolvedValue('result');

      service.createWorker('reports', processor, 5);

      expect(Worker).toHaveBeenCalledWith(
        'reports',
        processor,
        expect.objectContaining({
          concurrency: 5,
        })
      );
    });

    it('should setup worker event listeners', () => {
      const processor = jest.fn().mockResolvedValue('result');

      service.createWorker('jobs', processor);

      expect(mockWorker.on).toHaveBeenCalledWith('completed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('failed', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('stalled', expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith('error', expect.any(Function));
    });

    it('should return existing worker if already created', () => {
      const processor = jest.fn().mockResolvedValue('result');

      const worker1 = service.createWorker('email', processor);
      const worker2 = service.createWorker('email', processor);

      expect(worker1).toBe(worker2);
      expect(Worker).toHaveBeenCalledTimes(1);
    });

    it('should use default concurrency of 1', () => {
      const processor = jest.fn().mockResolvedValue('result');

      service.createWorker('jobs', processor);

      expect(Worker).toHaveBeenCalledWith(
        'jobs',
        processor,
        expect.objectContaining({
          concurrency: 1,
        })
      );
    });
  });

  describe('getJob', () => {
    it('should retrieve job by ID', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);

      const job = await service.getJob('email', 'job-123');

      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(job).toBe(mockJob);
    });

    it('should return undefined if job not found', async () => {
      mockQueue.getJob.mockResolvedValue(undefined);

      const job = await service.getJob('email', 'non-existent');

      expect(mockQueue.getJob).toHaveBeenCalledWith('non-existent');
      expect(job).toBeUndefined();
    });

    it('should handle multiple job retrievals', async () => {
      mockQueue.getJob.mockResolvedValueOnce(mockJob).mockResolvedValueOnce(undefined);

      const job1 = await service.getJob('email', 'job-123');
      const job2 = await service.getJob('email', 'job-456');

      expect(job1).toBe(mockJob);
      expect(job2).toBeUndefined();
    });
  });

  describe('getQueueStats', () => {
    beforeEach(() => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);
    });

    it('should return queue statistics', async () => {
      const stats = await service.getQueueStats('email');

      expect(stats).toEqual({
        queue: 'email',
        waiting: 5,
        active: 2,
        completed: 100,
        failed: 3,
        delayed: 1,
        total: 111,
      });
    });

    it('should calculate total correctly', async () => {
      const stats = await service.getQueueStats('email');
      expect(stats.total).toBe(stats.waiting + stats.active + stats.completed + stats.failed + stats.delayed);
    });

    it('should handle empty queue', async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);
      mockQueue.getDelayedCount.mockResolvedValue(0);

      const stats = await service.getQueueStats('empty');

      expect(stats.total).toBe(0);
    });

    it('should call all count methods in parallel', async () => {
      await service.getQueueStats('email');

      expect(mockQueue.getWaitingCount).toHaveBeenCalled();
      expect(mockQueue.getActiveCount).toHaveBeenCalled();
      expect(mockQueue.getCompletedCount).toHaveBeenCalled();
      expect(mockQueue.getFailedCount).toHaveBeenCalled();
      expect(mockQueue.getDelayedCount).toHaveBeenCalled();
    });
  });

  describe('getAllQueueStats', () => {
    beforeEach(() => {
      mockQueue.getWaitingCount.mockResolvedValue(5);
      mockQueue.getActiveCount.mockResolvedValue(2);
      mockQueue.getCompletedCount.mockResolvedValue(100);
      mockQueue.getFailedCount.mockResolvedValue(3);
      mockQueue.getDelayedCount.mockResolvedValue(1);
    });

    it('should return statistics for all queues', async () => {
      service.getQueue('email');
      service.getQueue('reports');

      const stats = await service.getAllQueueStats();

      expect(stats).toHaveLength(2);
      expect(stats[0].queue).toBe('email');
      expect(stats[1].queue).toBe('reports');
    });

    it('should return empty array if no queues', async () => {
      const stats = await service.getAllQueueStats();
      expect(stats).toEqual([]);
    });

    it('should include all statistics for each queue', async () => {
      service.getQueue('email');

      const stats = await service.getAllQueueStats();

      expect(stats[0]).toMatchObject({
        queue: 'email',
        waiting: expect.any(Number),
        active: expect.any(Number),
        completed: expect.any(Number),
        failed: expect.any(Number),
        delayed: expect.any(Number),
        total: expect.any(Number),
      });
    });
  });

  describe('getJobs', () => {
    const mockJobs = [mockJob, { ...mockJob, id: 'job-456' }];

    it('should get waiting jobs', async () => {
      mockQueue.getWaiting.mockResolvedValue(mockJobs as any);

      const jobs = await service.getJobs('email', 'waiting', 0, 10);

      expect(mockQueue.getWaiting).toHaveBeenCalledWith(0, 10);
      expect(jobs).toBe(mockJobs);
    });

    it('should get active jobs', async () => {
      mockQueue.getActive.mockResolvedValue(mockJobs as any);

      const jobs = await service.getJobs('email', 'active', 0, 10);

      expect(mockQueue.getActive).toHaveBeenCalledWith(0, 10);
      expect(jobs).toBe(mockJobs);
    });

    it('should get completed jobs', async () => {
      mockQueue.getCompleted.mockResolvedValue(mockJobs as any);

      const jobs = await service.getJobs('email', 'completed', 0, 10);

      expect(mockQueue.getCompleted).toHaveBeenCalledWith(0, 10);
      expect(jobs).toBe(mockJobs);
    });

    it('should get failed jobs', async () => {
      mockQueue.getFailed.mockResolvedValue(mockJobs as any);

      const jobs = await service.getJobs('email', 'failed', 0, 10);

      expect(mockQueue.getFailed).toHaveBeenCalledWith(0, 10);
      expect(jobs).toBe(mockJobs);
    });

    it('should get delayed jobs', async () => {
      mockQueue.getDelayed.mockResolvedValue(mockJobs as any);

      const jobs = await service.getJobs('email', 'delayed', 0, 10);

      expect(mockQueue.getDelayed).toHaveBeenCalledWith(0, 10);
      expect(jobs).toBe(mockJobs);
    });

    it('should use default pagination values', async () => {
      mockQueue.getWaiting.mockResolvedValue(mockJobs as any);

      await service.getJobs('email', 'waiting');

      expect(mockQueue.getWaiting).toHaveBeenCalledWith(0, 10);
    });

    it('should handle custom pagination', async () => {
      mockQueue.getWaiting.mockResolvedValue(mockJobs as any);

      await service.getJobs('email', 'waiting', 20, 50);

      expect(mockQueue.getWaiting).toHaveBeenCalledWith(20, 50);
    });

    it('should return empty array for invalid state', async () => {
      const jobs = await service.getJobs('email', 'invalid' as any);
      expect(jobs).toEqual([]);
    });
  });

  describe('retryJob', () => {
    it('should retry a failed job', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);

      await service.retryJob('email', 'job-123');

      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(mockJob.retry).toHaveBeenCalled();
    });

    it('should handle job not found', async () => {
      mockQueue.getJob.mockResolvedValue(undefined);

      await service.retryJob('email', 'non-existent');

      expect(mockQueue.getJob).toHaveBeenCalledWith('non-existent');
      expect(mockJob.retry).not.toHaveBeenCalled();
    });

    it('should retry multiple jobs', async () => {
      const mockJob2 = { ...mockJob, id: 'job-456', retry: jest.fn().mockResolvedValue(undefined) };
      mockQueue.getJob.mockResolvedValueOnce(mockJob).mockResolvedValueOnce(mockJob2 as any);

      await service.retryJob('email', 'job-123');
      await service.retryJob('email', 'job-456');

      expect(mockJob.retry).toHaveBeenCalled();
      expect(mockJob2.retry).toHaveBeenCalled();
    });
  });

  describe('removeJob', () => {
    it('should remove a job', async () => {
      mockQueue.getJob.mockResolvedValue(mockJob);

      await service.removeJob('email', 'job-123');

      expect(mockQueue.getJob).toHaveBeenCalledWith('job-123');
      expect(mockJob.remove).toHaveBeenCalled();
    });

    it('should handle job not found', async () => {
      mockQueue.getJob.mockResolvedValue(undefined);

      await service.removeJob('email', 'non-existent');

      expect(mockQueue.getJob).toHaveBeenCalledWith('non-existent');
      expect(mockJob.remove).not.toHaveBeenCalled();
    });

    it('should remove multiple jobs', async () => {
      const mockJob2 = { ...mockJob, id: 'job-456', remove: jest.fn().mockResolvedValue(undefined) };
      mockQueue.getJob.mockResolvedValueOnce(mockJob).mockResolvedValueOnce(mockJob2 as any);

      await service.removeJob('email', 'job-123');
      await service.removeJob('email', 'job-456');

      expect(mockJob.remove).toHaveBeenCalled();
      expect(mockJob2.remove).toHaveBeenCalled();
    });
  });

  describe('cleanQueue', () => {
    it('should clean completed jobs with default grace period', async () => {
      await service.cleanQueue('email');

      expect(mockQueue.clean).toHaveBeenCalledWith(3600000, 1000, 'completed');
    });

    it('should clean failed jobs', async () => {
      await service.cleanQueue('email', 3600000, 'failed');

      expect(mockQueue.clean).toHaveBeenCalledWith(3600000, 1000, 'failed');
    });

    it('should clean with custom grace period', async () => {
      const customGrace = 7200000; // 2 hours
      await service.cleanQueue('email', customGrace, 'completed');

      expect(mockQueue.clean).toHaveBeenCalledWith(customGrace, 1000, 'completed');
    });

    it('should clean multiple queues', async () => {
      await service.cleanQueue('email', 3600000, 'completed');
      await service.cleanQueue('reports', 3600000, 'failed');

      expect(mockQueue.clean).toHaveBeenCalledTimes(2);
    });
  });

  describe('pauseQueue', () => {
    it('should pause a queue', async () => {
      await service.pauseQueue('email');

      expect(mockQueue.pause).toHaveBeenCalled();
    });

    it('should pause multiple queues', async () => {
      service.getQueue('email');
      service.getQueue('reports');

      await service.pauseQueue('email');
      await service.pauseQueue('reports');

      expect(mockQueue.pause).toHaveBeenCalledTimes(2);
    });
  });

  describe('resumeQueue', () => {
    it('should resume a queue', async () => {
      await service.resumeQueue('email');

      expect(mockQueue.resume).toHaveBeenCalled();
    });

    it('should resume multiple queues', async () => {
      service.getQueue('email');
      service.getQueue('reports');

      await service.resumeQueue('email');
      await service.resumeQueue('reports');

      expect(mockQueue.resume).toHaveBeenCalledTimes(2);
    });
  });

  describe('shutdown', () => {
    it('should close all workers and queues', async () => {
      const processor = jest.fn().mockResolvedValue('result');
      service.getQueue('email');
      service.getQueue('reports');
      service.createWorker('email', processor);

      await service.shutdown();

      expect(mockWorker.close).toHaveBeenCalled();
      expect(mockQueue.close).toHaveBeenCalledTimes(2);
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle shutdown with no workers', async () => {
      service.getQueue('email');

      await service.shutdown();

      expect(mockQueue.close).toHaveBeenCalled();
      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should handle shutdown with no queues', async () => {
      await service.shutdown();

      expect(mockRedis.quit).toHaveBeenCalled();
    });

    it('should close resources in correct order', async () => {
      const processor = jest.fn().mockResolvedValue('result');
      service.getQueue('email');
      service.createWorker('email', processor);

      const closeOrder: string[] = [];
      mockWorker.close.mockImplementation(async () => { closeOrder.push('worker'); });
      mockQueue.close.mockImplementation(async () => { closeOrder.push('queue'); });
      mockRedis.quit.mockImplementation(async () => { closeOrder.push('redis'); });

      await service.shutdown();

      expect(closeOrder).toEqual(['worker', 'queue', 'redis']);
    });
  });
});
