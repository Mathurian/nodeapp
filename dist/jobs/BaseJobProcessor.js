"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseJobProcessor = void 0;
const logger_1 = require("../utils/logger");
class BaseJobProcessor {
    jobName;
    logger;
    constructor(jobName) {
        this.jobName = jobName;
        this.logger = new logger_1.Logger(jobName);
    }
    async handle(job) {
        const startTime = Date.now();
        try {
            this.logger.info(`Processing job: ${this.jobName}`, {
                jobId: job.id,
                jobName: job.name,
                attempt: job.attemptsMade,
            });
            await job.updateProgress(0);
            const result = await this.process(job);
            await job.updateProgress(100);
            const duration = Date.now() - startTime;
            this.logger.info(`Job completed: ${this.jobName}`, {
                jobId: job.id,
                duration: `${duration}ms`,
            });
            return result;
        }
        catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Job failed: ${this.jobName}`, {
                jobId: job.id,
                error: error instanceof Error ? error.message : 'Unknown error',
                duration: `${duration}ms`,
                attempt: job.attemptsMade,
            });
            throw error;
        }
    }
    validate(data) {
        if (!data) {
            throw new Error('Job data is required');
        }
    }
    async onFailed(job, error) {
        this.logger.error(`Job permanently failed: ${this.jobName}`, {
            jobId: job.id,
            error: error.message,
            attempts: job.attemptsMade,
        });
    }
    async onCompleted(job, result) {
        this.logger.info(`Job completed successfully: ${this.jobName}`, {
            jobId: job.id,
            result,
        });
    }
}
exports.BaseJobProcessor = BaseJobProcessor;
exports.default = BaseJobProcessor;
//# sourceMappingURL=BaseJobProcessor.js.map