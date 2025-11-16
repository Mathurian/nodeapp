import { ScanResult, VirusScanConfig } from '../config/virus-scan.config';
export declare class VirusScanService {
    private config;
    private scanCache;
    private cacheTimeout;
    constructor();
    isAvailable(): Promise<boolean>;
    private getConnectionInfo;
    scanFile(filePath: string): Promise<ScanResult>;
    scanBuffer(buffer: Buffer, filename?: string): Promise<ScanResult>;
    private performScan;
    private performBufferScan;
    getServiceInfo(): {
        enabled: boolean;
        mode: import("../config/virus-scan.config").ClamAVMode;
        connection: string;
        cacheSize: number;
        config: {
            maxFileSize: number;
            scanOnUpload: boolean;
            removeInfected: boolean;
            fallbackBehavior: "allow" | "reject";
        };
    };
    private parseResponse;
    private handleInfectedFile;
    private quarantineFile;
    private notifyInfection;
    private generateFileHash;
    private isCacheValid;
    clearCache(): void;
    getStatistics(): {
        cacheSize: number;
        config: VirusScanConfig;
    };
    listQuarantinedFiles(): string[];
    getQuarantineMetadata(filename: string): any;
    deleteQuarantinedFile(filename: string): boolean;
}
export declare const getVirusScanService: () => VirusScanService;
export default VirusScanService;
//# sourceMappingURL=VirusScanService.d.ts.map