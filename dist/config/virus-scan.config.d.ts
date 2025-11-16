export type ClamAVMode = 'docker' | 'native-tcp' | 'native-socket' | 'disabled';
export interface VirusScanConfig {
    enabled: boolean;
    mode: ClamAVMode;
    host: string;
    port: number;
    socketPath?: string;
    timeout: number;
    maxFileSize: number;
    quarantinePath: string;
    scanOnUpload: boolean;
    removeInfected: boolean;
    notifyOnInfection: boolean;
    fallbackBehavior: 'allow' | 'reject';
    connectionRetries: number;
}
export declare const detectClamAVMode: () => ClamAVMode;
export declare const getVirusScanConfig: () => VirusScanConfig;
export declare enum ScanStatus {
    CLEAN = "clean",
    INFECTED = "infected",
    ERROR = "error",
    SKIPPED = "skipped",
    TOO_LARGE = "too_large"
}
export interface ScanResult {
    status: ScanStatus;
    virus?: string;
    file: string;
    size: number;
    scannedAt: Date;
    duration: number;
    error?: string;
}
declare const _default: {
    getVirusScanConfig: () => VirusScanConfig;
    ScanStatus: typeof ScanStatus;
};
export default _default;
//# sourceMappingURL=virus-scan.config.d.ts.map