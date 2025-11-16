import { BaseService } from './BaseService';
export declare class FileBackupService extends BaseService {
    private readonly BACKUP_DIR;
    private readonly UPLOAD_DIR;
    createBackup(): Promise<{
        success: boolean;
        backupPath: string;
        timestamp: string;
    }>;
    listBackups(): Promise<string[]>;
    deleteBackup(backupName: string): Promise<void>;
}
//# sourceMappingURL=FileBackupService.d.ts.map