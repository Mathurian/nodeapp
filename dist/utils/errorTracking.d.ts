export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export interface ErrorEntry {
    id: string;
    timestamp: string;
    severity: ErrorSeverity;
    message: string;
    stack?: string;
    context?: {
        user?: string;
        requestId?: string;
        method?: string;
        path?: string;
        ip?: string;
        userAgent?: string;
        [key: string]: any;
    };
    error?: any;
}
export interface ErrorStats {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recent: ErrorEntry[];
    topErrors: Array<{
        message: string;
        count: number;
    }>;
}
declare class ErrorTracker {
    private errors;
    private readonly maxErrors;
    private readonly errorLogPath;
    constructor();
    private ensureLogDirectory;
    private loadErrorsFromDisk;
    private saveErrorsToDisk;
    trackError(error: Error | any, severity?: ErrorSeverity, context?: ErrorEntry['context']): Promise<string>;
    private generateErrorId;
    private sanitizeError;
    private logToConsole;
    private notifyCriticalError;
    getStats(): ErrorStats;
    getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[];
    getErrorsInTimeRange(startDate: Date, endDate: Date): ErrorEntry[];
    clearOldErrors(daysToKeep?: number): Promise<number>;
    exportErrors(filePath: string): Promise<void>;
}
declare const errorTracker: ErrorTracker;
export declare function trackError(error: Error | any, severity?: ErrorSeverity, context?: ErrorEntry['context']): Promise<string>;
export declare function getErrorStats(): ErrorStats;
export declare function getErrorsBySeverity(severity: ErrorSeverity): ErrorEntry[];
export declare function getErrorsInTimeRange(startDate: Date, endDate: Date): ErrorEntry[];
export declare function clearOldErrors(daysToKeep?: number): Promise<number>;
export declare function exportErrors(filePath: string): Promise<void>;
export default errorTracker;
//# sourceMappingURL=errorTracking.d.ts.map