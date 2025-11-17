import { PrismaClient, ScoreFile } from '@prisma/client';
import { BaseService } from './BaseService';
export interface UploadScoreFileDTO {
    categoryId: string;
    judgeId: string;
    contestantId?: string;
    tenantId: string;
    fileName: string;
    fileType: string;
    filePath: string;
    fileSize: number;
    notes?: string;
}
export interface UpdateScoreFileDTO {
    status?: 'pending' | 'approved' | 'rejected';
    notes?: string;
}
export interface ScoreFileInfo {
    id: string;
    categoryId: string;
    judgeId: string;
    contestantId: string | null;
    fileName: string;
    fileType: string;
    filePath: string;
    fileSize: number;
    uploadedById: string;
    status: string;
    notes: string | null;
    createdAt: Date;
    updatedAt: Date;
}
export declare class ScoreFileService extends BaseService {
    private prisma;
    constructor(prisma: PrismaClient);
    uploadScoreFile(data: UploadScoreFileDTO, uploadedById: string): Promise<ScoreFile>;
    getScoreFileById(id: string, tenantId: string): Promise<ScoreFile | null>;
    getScoreFilesByCategory(categoryId: string, tenantId: string): Promise<ScoreFile[]>;
    getScoreFilesByJudge(judgeId: string, tenantId: string): Promise<ScoreFile[]>;
    getScoreFilesByContestant(contestantId: string, tenantId: string): Promise<ScoreFile[]>;
    updateScoreFile(id: string, tenantId: string, data: UpdateScoreFileDTO, _userId: string, userRole: string): Promise<ScoreFile>;
    deleteScoreFile(id: string, tenantId: string, userId: string, userRole: string): Promise<void>;
    getAllScoreFiles(tenantId: string, filters?: {
        categoryId?: string;
        judgeId?: string;
        contestantId?: string;
        status?: string;
    }): Promise<ScoreFile[]>;
}
//# sourceMappingURL=ScoreFileService.d.ts.map