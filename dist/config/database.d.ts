import { PrismaClient } from '@prisma/client';
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export declare function testDatabaseConnection(): Promise<boolean>;
export declare function getDatabasePoolStats(): Promise<any>;
export declare function disconnectDatabase(): Promise<void>;
export declare function checkDatabaseHealth(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
}>;
export declare function executeInTransaction<T>(callback: (tx: any) => Promise<T>): Promise<T>;
export declare function batchExecute<T>(operations: Promise<T>[]): Promise<T[]>;
export default prisma;
//# sourceMappingURL=database.d.ts.map