import { BaseService } from './BaseService';
import { PrismaClient } from '@prisma/client';
export declare class EmceeService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    getStats(): Promise<{
        totalScripts: number;
        totalEvents: number;
        totalContests: number;
        totalCategories: number;
    }>;
    getScripts(filters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
        file_path: string | null;
    }[]>;
    getScript(scriptId: string): Promise<any>;
    getContestantBios(filters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
    }): Promise<any>;
    getJudgeBios(filters: {
        eventId?: string;
        contestId?: string;
        categoryId?: string;
    }): Promise<any>;
    getEvents(): Promise<any>;
    getEvent(eventId: string): Promise<any>;
    getContests(eventId?: string): Promise<any>;
    getContest(contestId: string): Promise<any>;
    getEmceeHistory(page?: number, limit?: number): Promise<{
        scripts: any;
        pagination: {
            page: number;
            limit: number;
            total: number;
            pages: number;
        };
    }>;
    uploadScript(data: {
        title: string;
        content?: string;
        filePath?: string | null;
        eventId?: string | null;
        contestId?: string | null;
        categoryId?: string | null;
        order?: number;
        tenantId?: string;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
        file_path: string | null;
    }>;
    updateScript(id: string, data: {
        title?: string;
        content?: string;
        eventId?: string | null;
        contestId?: string | null;
        categoryId?: string | null;
        order?: number;
    }): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
        file_path: string | null;
    }>;
    deleteScript(id: string): Promise<void>;
    getScriptFileInfo(scriptId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        tenantId: string;
        categoryId: string | null;
        eventId: string | null;
        contestId: string | null;
        title: string;
        order: number | null;
        content: string;
        file_path: string | null;
    }>;
}
//# sourceMappingURL=EmceeService.d.ts.map