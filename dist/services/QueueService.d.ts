import { Queue, Worker, Job, JobsOptions } from 'bullmq';
export declare class QueueService {
    private static instance;
    private connection;
    private queues;
    private workers;
    private logger;
    private constructor();
    static getInstance(): QueueService;
    getQueue(name: string): Queue;
    addJob<T = any>(queueName: string, jobName: string, data: T, options?: JobsOptions): Promise<Job<T>>;
    addScheduledJob<T = any>(queueName: string, jobName: string, data: T, cronExpression: string, options?: Omit<JobsOptions, 'repeat'>): Promise<Job<T>>;
    createWorker<T = any>(queueName: string, processor: (job: Job<T>) => Promise<any>, concurrency?: number): Worker;
    getJob(queueName: string, jobId: string): Promise<Job | undefined>;
    getQueueStats(queueName: string): Promise<{
        queue: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
    }>;
    getAllQueueStats(): Promise<{
        queue: string;
        waiting: number;
        active: number;
        completed: number;
        failed: number;
        delayed: number;
        total: number;
    }[]>;
    getJobs(queueName: string, state: 'waiting' | 'active' | 'completed' | 'failed' | 'delayed', start?: number, end?: number): Promise<Job<any, any, string>[]>;
    retryJob(queueName: string, jobId: string): Promise<void>;
    removeJob(queueName: string, jobId: string): Promise<void>;
    cleanQueue(queueName: string, grace?: number, type?: 'completed' | 'failed'): Promise<void>;
    pauseQueue(queueName: string): Promise<void>;
    resumeQueue(queueName: string): Promise<void>;
    private setupEventListeners;
    shutdown(): Promise<void>;
}
declare const _default: QueueService;
export default _default;
//# sourceMappingURL=QueueService.d.ts.map