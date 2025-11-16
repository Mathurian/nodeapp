import { BaseService } from './BaseService';
export interface LogFileInfo {
    name: string;
    size: number;
    sizeFormatted: string;
    modifiedAt: string;
    path: string;
}
export declare class LogFilesService extends BaseService {
    private readonly LOG_DIRECTORY;
    private formatFileSize;
    private ensureLogDirectory;
    private validateFilename;
    getLogFiles(): Promise<{
        files: LogFileInfo[];
        directory: string;
    }>;
    getLogFileContents(filename: string, lines?: number): Promise<any>;
    getLogFilePath(filename: string): Promise<string>;
    cleanupOldLogs(daysToKeep: number): Promise<any>;
    deleteLogFile(filename: string): Promise<void>;
}
//# sourceMappingURL=LogFilesService.d.ts.map