import { PrismaClient, ScoreFile } from '@prisma/client';
import { BaseService } from './BaseService';
export interface UploadScoreFileDTO {
    categoryId: string;
    judgeId: string;
    contestantId?: string;
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
    getScoreFileById(id: string): Promise<ScoreFile | null>;
    getScoreFilesByCategory(categoryId: string): Promise<ScoreFile[]>;
    getScoreFilesByJudge(judgeId: string): Promise<ScoreFile[]>;
    getScoreFilesByContestant(contestantId: string): Promise<ScoreFile[]>;
    updateScoreFile(id: string, data: UpdateScoreFileDTO, userId: string, userRole: string): Promise<ScoreFile>;
    deleteScoreFile(id: string, userId: string, userRole: string): Promise<void>;
    getAllScoreFiles(filters?: {
        categoryId?: string;
        judgeId?: string;
        contestantId?: string;
        status?: string;
    }): Promise<ScoreFile[]>;
}
//# sourceMappingURL=ScoreFileService.d.ts.map