export interface BackupTarget {
    id: string;
    name: string;
    type: 'local' | 's3' | 'ftp' | 'sftp' | 'azure' | 'gcp';
    config: any;
    enabled: boolean;
    priority: number;
}
export interface TransferResult {
    success: boolean;
    targetId: string;
    targetName: string;
    remotePath?: string;
    size?: number;
    duration?: number;
    error?: string;
    checksum?: string;
}
export declare class BackupTransferService {
    static uploadToTarget(filepath: string, target: BackupTarget): Promise<TransferResult>;
    private static uploadToLocal;
    private static uploadToS3;
    private static uploadToFTP;
    private static uploadToSFTP;
    private static uploadToAzure;
    private static uploadToGCP;
    private static calculateChecksum;
    static testConnection(target: BackupTarget): Promise<boolean>;
}
export default BackupTransferService;
//# sourceMappingURL=BackupTransferService.d.ts.map