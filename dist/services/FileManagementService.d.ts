import { BaseService } from './BaseService';
export declare class FileManagementService extends BaseService {
    private readonly UPLOAD_DIR;
    getFileInfo(filename: string): Promise<{
        name: string;
        size: number;
        created: Date;
        modified: Date;
    }>;
    moveFile(filename: string, newPath: string): Promise<{
        success: boolean;
        newPath: string;
    }>;
    copyFile(filename: string, newPath: string): Promise<{
        success: boolean;
        newPath: string;
    }>;
}
//# sourceMappingURL=FileManagementService.d.ts.map