export interface SecretMetadata {
    key: string;
    createdAt: Date;
    updatedAt: Date;
    version: number;
    rotationDate?: Date;
    expiresAt?: Date;
}
export interface Secret {
    key: string;
    value: string;
    metadata: SecretMetadata;
}
export interface SecretRotationConfig {
    enabled: boolean;
    intervalDays: number;
    notifyBeforeDays: number;
}
export interface SecretsProviderConfig {
    provider: 'local' | 'env' | 'aws' | 'vault';
    local?: LocalSecretStoreConfig;
    aws?: AWSSecretStoreConfig;
    vault?: VaultSecretStoreConfig;
    rotation?: SecretRotationConfig;
}
export interface LocalSecretStoreConfig {
    encryptionKey?: string;
    storePath?: string;
    backupPath?: string;
    autoBackup?: boolean;
}
export interface AWSSecretStoreConfig {
    region: string;
    accessKeyId?: string;
    secretAccessKey?: string;
    prefix?: string;
}
export interface VaultSecretStoreConfig {
    address: string;
    token?: string;
    namespace?: string;
    path: string;
    version?: 'v1' | 'v2';
}
export interface ISecretProvider {
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expiresAt?: Date): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<SecretMetadata | null>;
    rotate(key: string, newValue: string): Promise<void>;
    healthCheck(): Promise<boolean>;
}
export interface SecretMigrationResult {
    success: boolean;
    migrated: string[];
    failed: {
        key: string;
        error: string;
    }[];
    total: number;
}
export interface SecretValidationResult {
    valid: boolean;
    missing: string[];
    expired: string[];
    requiresRotation: string[];
}
//# sourceMappingURL=secrets.types.d.ts.map