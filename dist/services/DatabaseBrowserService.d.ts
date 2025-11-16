import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class DatabaseBrowserService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getTables(): Promise<string[]>;
    getTableData(tableName: string, page?: number, limit?: number): Promise<{
        table: string;
        data: any;
        pagination: {
            page: number;
            limit: number;
            total: any;
            pages: number;
        };
    }>;
    getTableSchema(tableName: string): Promise<{
        table: string;
        message: string;
    }>;
}
//# sourceMappingURL=DatabaseBrowserService.d.ts.map