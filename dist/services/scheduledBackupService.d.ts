import { PrismaClient } from '@prisma/client';
declare class ScheduledBackupService {
    private prisma;
    private jobs;
    private isRunning;
    constructor(prismaClient: PrismaClient);
    start(): Promise<void>;
    stop(): Promise<void>;
    loadBackupSettings(): Promise<void>;
    scheduleBackup(setting: any): Promise<void>;
    runScheduledBackup(setting: any): Promise<void>;
    cleanupOldBackups(setting: any): Promise<void>;
    updateBackupSchedule(setting: any): Promise<void>;
    reloadSettings(): Promise<void>;
    runManualBackup(settingId: string): Promise<{
        success: boolean;
        message?: string;
        error?: string;
    }>;
    getActiveSchedules(): Array<{
        backupType: string;
        frequency: string;
        isActive: boolean;
    }>;
}
export default ScheduledBackupService;
export { ScheduledBackupService };
//# sourceMappingURL=scheduledBackupService.d.ts.map