import { ISecretProvider, SecretMetadata, AWSSecretStoreConfig } from '../../types/secrets.types';
export declare class AWSSecretStore implements ISecretProvider {
    private client;
    private config;
    private prefix;
    constructor(config?: AWSSecretStoreConfig);
    private getSecretName;
    private stripPrefix;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, expiresAt?: Date): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<SecretMetadata | null>;
    rotate(key: string, newValue: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    getClient(): any;
    enableAutomaticRotation(key: string, rotationLambdaArn: string, rotationRules: {
        automaticallyAfterDays: number;
    }): Promise<void>;
}
//# sourceMappingURL=AWSSecretStore.d.ts.map