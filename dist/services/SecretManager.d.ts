import { ISecretProvider, SecretsProviderConfig, SecretMetadata, SecretValidationResult, SecretMigrationResult } from '../types/secrets.types';
export declare class SecretManager {
    private static instance;
    private provider;
    private config;
    private requiredSecrets;
    constructor();
    static getInstance(): SecretManager;
    private loadConfiguration;
    private initializeProvider;
    get(key: string): Promise<string | null>;
    getOrThrow(key: string): Promise<string>;
    set(key: string, value: string, expiresAt?: Date): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<SecretMetadata | null>;
    rotate(key: string, newValue: string): Promise<void>;
    validate(): Promise<SecretValidationResult>;
    migrate(targetProvider: ISecretProvider, secretKeys?: string[]): Promise<SecretMigrationResult>;
    healthCheck(): Promise<boolean>;
    getProviderName(): string;
    getConfiguration(): SecretsProviderConfig;
    setRequiredSecrets(secrets: string[]): void;
    getRequiredSecrets(): string[];
}
//# sourceMappingURL=SecretManager.d.ts.map