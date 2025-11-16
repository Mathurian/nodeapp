"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initializeEmailWorker = exports.EmailJobProcessor = void 0;
const BaseJobProcessor_1 = require("./BaseJobProcessor");
const QueueService_1 = __importDefault(require("../services/QueueService"));
const logger_1 = require("../utils/logger");
class EmailJobProcessor extends BaseJobProcessor_1.BaseJobProcessor {
    emailService;
    constructor(emailService) {
        super('email-job-processor');
        this.emailService = emailService;
    }
    validate(data) {
        super.validate(data);
        if (!data.to) {
            throw new Error('Email recipient (to) is required');
        }
        if (!data.subject) {
            throw new Error('Email subject is required');
        }
        if (!data.html && !data.text && !data.template) {
            throw new Error('Email content (html, text, or template) is required');
        }
    }
    async process(job) {
        this.validate(job.data);
        const { to, subject, html, text, from, cc, bcc, attachments, template } = job.data;
        try {
            await job.updateProgress(25);
            let emailHtml = html;
            let emailText = text;
            if (template) {
                this.logger.info('Email template rendering', {
                    template: template.name,
                    jobId: job.id,
                });
                await job.updateProgress(50);
            }
            else {
                await job.updateProgress(50);
            }
            const toAddress = Array.isArray(to) ? to[0] : to;
            const emailBody = emailHtml || emailText || '';
            const result = await this.emailService.sendEmail(toAddress, subject, emailBody);
            await job.updateProgress(100);
            return {
                success: true,
                timestamp: new Date().toISOString(),
            };
        }
        catch (error) {
            this.logger.error('Failed to send email', {
                jobId: job.id,
                to,
                subject,
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            throw error;
        }
    }
    async onFailed(job, error) {
        await super.onFailed(job, error);
        try {
            this.logger.error('Email permanently failed - saving to database', {
                jobId: job.id,
                to: job.data.to,
                subject: job.data.subject,
                error: error.message,
            });
        }
        catch (logError) {
            this.logger.error('Failed to log email failure', { error: logError });
        }
    }
}
exports.EmailJobProcessor = EmailJobProcessor;
const initializeEmailWorker = (emailService, concurrency = 5) => {
    const processor = new EmailJobProcessor(emailService);
    const initLogger = new logger_1.Logger('EmailWorker');
    const worker = QueueService_1.default.createWorker('email', async (job) => await processor.handle(job), concurrency);
    initLogger.info('Email worker initialized', { concurrency });
    return worker;
};
exports.initializeEmailWorker = initializeEmailWorker;
exports.default = EmailJobProcessor;
//# sourceMappingURL=EmailJobProcessor.js.map