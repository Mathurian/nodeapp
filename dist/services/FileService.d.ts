import { BaseService } from './BaseService';
export declare class FileService extends BaseService {
    private readonly UPLOAD_DIR;
    listFiles(directory?: string): Promise<{
        name: string;
        isDirectory: boolean;
        path: string;
    }[]>;
    getFilePath(filename: string): Promise<string>;
    deleteFile(filename: string): Promise<void>;
}
//# sourceMappingURL=FileService.d.ts.map