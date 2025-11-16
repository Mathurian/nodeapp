import { ISecretProvider, SecretMetadata, LocalSecretStoreConfig } from '../../types/secrets.types';
export declare class LocalSecretStore implements ISecretProvider {
    private config;
    private encryptionKey;
    private store;
    private storePath;
    private algorithm;
    private keyDerivationIterations;
    constructor(config?: LocalSecretStoreConfig);
    private deriveEncryptionKey;
    private getOrCreateSalt;
    private generateMasterKey;
    private loadStore;
    private saveStore;
    private createBackup;
    private pruneOldBackups;
    private encrypt;
    private decrypt;
    private findSecret;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expiresAt?: Date): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<SecretMetadata | null>;
    rotate(key: string, newValue: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    export(): Promise<string>;
    import(data: string): Promise<void>;
    reEncrypt(newKey: string): Promise<void>;
    getStats(): {
        totalSecrets: number;
        storeSize: number;
        lastUpdated: string;
        backupCount: number;
    };
}
//# sourceMappingURL=LocalSecretStore.d.ts.map