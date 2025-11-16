import { ISecretProvider, SecretMetadata } from '../../types/secrets.types';
export declare class EnvSecretStore implements ISecretProvider {
    private envPath;
    private secrets;
    constructor(envPath?: string);
    private loadFromEnv;
    get(key: string): Promise<string | null>;
    set(key: string, value: string, _expiresAt?: Date): Promise<void>;
    delete(key: string): Promise<void>;
    list(): Promise<string[]>;
    exists(key: string): Promise<boolean>;
    getMetadata(key: string): Promise<SecretMetadata | null>;
    rotate(key: string, newValue: string): Promise<void>;
    healthCheck(): Promise<boolean>;
    private parseEnvFile;
    reload(): Promise<void>;
    getWarnings(): string[];
}
//# sourceMappingURL=EnvSecretStore.d.ts.map