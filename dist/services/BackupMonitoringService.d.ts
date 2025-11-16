import { EventEmitter } from 'events';
export interface BackupLogData {
    type: 'full' | 'incremental' | 'pitr_base';
    status: 'running' | 'success' | 'failed';
    startedAt: Date;
    completedAt?: Date;
    duration?: number;
    size?: bigint | number;
    location: string;
    errorMessage?: string;
    metadata?: Record<string, any>;
}
export interface BackupStats {
    totalBackups: number;
    successfulBackups: number;
    failedBackups: number;
    successRate: number;
    lastBackupTime?: Date;
    lastBackupStatus?: string;
    totalSize: bigint;
    averageDuration: number;
    backupHealth: 'healthy' | 'warning' | 'critical';
    issues: string[];
}
export interface BackupHealthCheck {
    isHealthy: boolean;
    issues: string[];
    lastBackup?: {
        type: string;
        status: string;
        timestamp: Date;
        ageHours: number;
    };
    recentFailures: number;
    diskSpace?: {
        available: number;
        used: number;
        total: number;
    };
}
declare class BackupMonitoringService extends EventEmitter {
    private static instance;
    private constructor();
    static getInstance(): BackupMonitoringService;
    logBackup(data: BackupLogData, tenantId?: string): Promise<any>;
    updateBackupLog(id: string, data: Partial<BackupLogData>): Promise<any>;
    getBackupHistory(options?: {
        limit?: number;
        offset?: number;
        type?: string;
        status?: string;
        startDate?: Date;
        endDate?: Date;
    }): Promise<{
        backups: any[];
        total: number;
    }>;
    getLatestBackup(type?: string): Promise<any | null>;
    getBackupStats(days?: number): Promise<BackupStats>;
    checkBackupHealth(): Promise<BackupHealthCheck>;
    private handleBackupFailure;
    cleanupOldLogs(retentionDays?: number): Promise<number>;
    getBackupSizeTrend(days?: number): Promise<Array<{
        date: string;
        size: number;
    }>>;
    detectSizeAnomalies(): Promise<{
        hasAnomaly: boolean;
        details?: {
            currentSize: number;
            averageSize: number;
            deviation: number;
        };
    }>;
}
export default BackupMonitoringService;
//# sourceMappingURL=BackupMonitoringService.d.ts.map