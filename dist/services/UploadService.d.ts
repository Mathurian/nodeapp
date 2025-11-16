import { PrismaClient, FileCategory } from '@prisma/client';
import { BaseService } from './BaseService';
export interface FileInfo {
    id: string;
    filename: string;
    originalName: string;
    mimetype: string;
    size: number;
    path: string;
    uploadedBy: string;
    category?: FileCategory;
    eventId?: string;
    contestId?: string;
    categoryId?: string;
}
export declare class UploadService extends BaseService {
    private prisma;
    private uploadDir;
    constructor(prisma: PrismaClient);
    private ensureUploadsDir;
    processUploadedFile(file: Express.Multer.File, userId: string, options?: {
        category?: FileCategory;
        eventId?: string;
        contestId?: string;
        categoryId?: string;
        tenantId?: string;
    }): Promise<FileInfo>;
    getFiles(userId?: string): Promise<any[]>;
    deleteFile(fileId: string): Promise<void>;
    getFileById(fileId: string): Promise<any>;
}
//# sourceMappingURL=UploadService.d.ts.map