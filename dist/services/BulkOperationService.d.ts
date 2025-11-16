export interface BulkOperationResult {
    total: number;
    successful: number;
    failed: number;
    errors: Array<{
        item: any;
        error: string;
    }>;
}
export interface BulkOperationOptions {
    continueOnError?: boolean;
    batchSize?: number;
}
export declare class BulkOperationService {
    private prisma;
    constructor();
    executeBulkOperation<T>(operation: (item: T) => Promise<void>, items: T[], options?: BulkOperationOptions): Promise<BulkOperationResult>;
    executeBulkOperationWithTransaction<T>(operation: (items: T[], tx: any) => Promise<void>, items: T[]): Promise<void>;
    bulkCreate<T extends Record<string, any>>(model: string, data: T[]): Promise<BulkOperationResult>;
    bulkUpdate<T extends Record<string, any>>(model: string, updates: Array<{
        id: string;
        data: T;
    }>): Promise<BulkOperationResult>;
    bulkDelete(model: string, ids: string[]): Promise<BulkOperationResult>;
    bulkSoftDelete(model: string, ids: string[]): Promise<BulkOperationResult>;
}
//# sourceMappingURL=BulkOperationService.d.ts.map