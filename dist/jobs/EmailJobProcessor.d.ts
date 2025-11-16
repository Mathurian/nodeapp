import { Job } from 'bullmq';
import { BaseJobProcessor } from './BaseJobProcessor';
import { EmailService } from '../services/EmailService';
export interface EmailJobData {
    to: string | string[];
    subject: string;
    html?: string;
    text?: string;
    from?: string;
    cc?: string | string[];
    bcc?: string | string[];
    attachments?: Array<{
        filename: string;
        path?: string;
        content?: Buffer | string;
        contentType?: string;
    }>;
    template?: {
        name: string;
        data: Record<string, any>;
    };
    priority?: 'high' | 'normal' | 'low';
}
export declare class EmailJobProcessor extends BaseJobProcessor<EmailJobData> {
    private emailService;
    constructor(emailService: EmailService);
    protected validate(data: EmailJobData): void;
    process(job: Job<EmailJobData>): Promise<any>;
    protected onFailed(job: Job<EmailJobData>, error: Error): Promise<void>;
}
export declare const initializeEmailWorker: (emailService: EmailService, concurrency?: number) => import("bullmq").Worker<any, any, string>;
export default EmailJobProcessor;
//# sourceMappingURL=EmailJobProcessor.d.ts.map