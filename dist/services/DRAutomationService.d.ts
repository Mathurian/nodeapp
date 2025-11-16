export interface DRConfigInput {
    tenantId?: string;
    backupFrequency?: string;
    backupRetentionDays?: number;
    enableAutoBackup?: boolean;
    enablePITR?: boolean;
    enableDRTesting?: boolean;
    drTestFrequency?: string;
    backupLocations?: any[];
    rtoMinutes?: number;
    rpoMinutes?: number;
    alertEmail?: string;
    enableFailover?: boolean;
    healthCheckInterval?: number;
}
export interface BackupScheduleInput {
    tenantId?: string;
    name: string;
    backupType?: string;
    frequency: string;
    enabled?: boolean;
    retentionDays?: number;
    targets?: any[];
    compression?: boolean;
    encryption?: boolean;
}
export interface BackupTargetInput {
    tenantId?: string;
    name: string;
    type: string;
    config: any;
    enabled?: boolean;
    priority?: number;
}
export interface BackupResult {
    success: boolean;
    backupId?: string;
    location?: string;
    size?: number;
    duration?: number;
    error?: string;
}
export interface RestoreResult {
    success: boolean;
    duration?: number;
    error?: string;
}
export declare class DRAutomationService {
    static getDRConfig(tenantId?: string): Promise<any>;
    static updateDRConfig(id: string, input: DRConfigInput): Promise<any>;
    static createBackupSchedule(input: BackupScheduleInput): Promise<any>;
    static updateBackupSchedule(id: string, input: Partial<BackupScheduleInput>): Promise<any>;
    static deleteBackupSchedule(id: string): Promise<void>;
    static listBackupSchedules(tenantId?: string): Promise<any[]>;
    static createBackupTarget(input: BackupTargetInput): Promise<any>;
    static updateBackupTarget(id: string, input: Partial<BackupTargetInput>): Promise<any>;
    static deleteBackupTarget(id: string): Promise<void>;
    static listBackupTargets(tenantId?: string): Promise<any[]>;
    static verifyBackupTarget(id: string): Promise<boolean>;
    static executeBackup(scheduleId: string): Promise<BackupResult>;
    static executeDRTest(backupId: string, testType?: string): Promise<any>;
    static getDRMetrics(tenantId?: string, metricType?: string, days?: number): Promise<any[]>;
    static getDRDashboard(tenantId?: string): Promise<any>;
    static checkRTORPOViolations(tenantId?: string): Promise<any>;
    private static calculateNextRun;
    private static replicateToTargets;
    private static replicateToTarget;
    private static recordMetric;
}
export default DRAutomationService;
//# sourceMappingURL=DRAutomationService.d.ts.map