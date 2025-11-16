import { Job } from 'bullmq';
import { Logger } from '../utils/logger';
export declare abstract class BaseJobProcessor<T = any> {
    protected readonly jobName: string;
    protected readonly logger: Logger;
    constructor(jobName: string);
    abstract process(job: Job<T>): Promise<any>;
    handle(job: Job<T>): Promise<any>;
    protected validate(data: T): void;
    protected onFailed(job: Job<T>, error: Error): Promise<void>;
    protected onCompleted(job: Job<T>, result: any): Promise<void>;
}
export default BaseJobProcessor;
//# sourceMappingURL=BaseJobProcessor.d.ts.map