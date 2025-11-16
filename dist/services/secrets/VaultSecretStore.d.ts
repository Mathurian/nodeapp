import { ISecretProvider, SecretMetadata, VaultSecretStoreConfig } from '../../types/secrets.types';
export declare class VaultSecretStore implements ISecretProvider {
    private vault;
    private config;
    private kvVersion;
    private mountPath;
    constructor(config?: VaultSecretStoreConfig);
    private getSecretPath;
    private getMetadataPath;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expiresAt?: Date): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<SecretMetadata | null>;
    rotate(key: string, newValue: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    getClient(): any;
    permanentlyDelete(key: string): Promise<void>;
    undelete(key: string, versions?: number[]): Promise<void>;
    private getLatestVersion;
    listVersions(key: string): Promise<number[]>;
    getVersion(key: string, version: number): Promise<string | null>;
}
//# sourceMappingURL=VaultSecretStore.d.ts.map