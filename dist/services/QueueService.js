"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const logger_1 = require("../utils/logger");
class QueueService {
    static instance;
    connection;
    queues;
    workers;
    logger;
    constructor() {
        this.logger = new logger_1.Logger('QueueService');
        const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
        this.connection = new ioredis_1.default(redisUrl, {
            maxRetriesPerRequest: null,
            enableReadyCheck: false,
        });
        this.queues = new Map();
        this.workers = new Map();
        this.setupEventListeners();
    }
    static getInstance() {
        if (!QueueService.instance) {
            QueueService.instance = new QueueService();
        }
        return QueueService.instance;
    }
    getQueue(name) {
        if (!this.queues.has(name)) {
            const queue = new bullmq_1.Queue(name, {
                connection: this.connection,
                defaultJobOptions: {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: {
                        age: 3600,
                        count: 1000,
                    },
                    removeOnFail: {
                        age: 86400,
                    },
                },
            });
            this.queues.set(name, queue);
        }
        return this.queues.get(name);
    }
    async addJob(queueName, jobName, data, options) {
        const queue = this.getQueue(queueName);
        const job = await queue.add(jobName, data, options);
        this.logger.info('Job added to queue', {
            queue: queueName,
            jobId: job.id,
            jobName,
        });
        return job;
    }
    async addScheduledJob(queueName, jobName, data, cronExpression, options) {
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
    createWorker(queueName, processor, concurrency = 1) {
        if (this.workers.has(queueName)) {
            this.logger.warn('Worker already exists for queue', { queue: queueName });
            return this.workers.get(queueName);
        }
        const worker = new bullmq_1.Worker(queueName, processor, {
            connection: this.connection,
            concurrency,
        });
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
    async getJob(queueName, jobId) {
        const queue = this.getQueue(queueName);
        return await queue.getJob(jobId);
    }
    async getQueueStats(queueName) {
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
    async getAllQueueStats() {
        const stats = await Promise.all(Array.from(this.queues.keys()).map((queueName) => this.getQueueStats(queueName)));
        return stats;
    }
    async getJobs(queueName, state, start = 0, end = 10) {
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
    async retryJob(queueName, jobId) {
        const job = await this.getJob(queueName, jobId);
        if (job) {
            await job.retry();
            this.logger.info('Job retried', { queue: queueName, jobId });
        }
        else {
            this.logger.warn('Job not found for retry', { queue: queueName, jobId });
        }
    }
    async removeJob(queueName, jobId) {
        const job = await this.getJob(queueName, jobId);
        if (job) {
            await job.remove();
            this.logger.info('Job removed', { queue: queueName, jobId });
        }
        else {
            this.logger.warn('Job not found for removal', { queue: queueName, jobId });
        }
    }
    async cleanQueue(queueName, grace = 3600000, type = 'completed') {
        const queue = this.getQueue(queueName);
        await queue.clean(grace, 1000, type);
        this.logger.info('Queue cleaned', { queue: queueName, type, grace });
    }
    async pauseQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.pause();
        this.logger.info('Queue paused', { queue: queueName });
    }
    async resumeQueue(queueName) {
        const queue = this.getQueue(queueName);
        await queue.resume();
        this.logger.info('Queue resumed', { queue: queueName });
    }
    setupEventListeners() {
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
    async shutdown() {
        this.logger.info('Shutting down queue service...');
        await Promise.all(Array.from(this.workers.values()).map((worker) => worker.close()));
        await Promise.all(Array.from(this.queues.values()).map((queue) => queue.close()));
        await this.connection.quit();
        this.logger.info('Queue service shutdown complete');
    }
}
exports.QueueService = QueueService;
exports.default = QueueService.getInstance();
//# sourceMappingURL=QueueService.js.map