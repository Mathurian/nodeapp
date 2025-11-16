import { SecretsProviderConfig } from '../types/secrets.types';
export declare function getSecretsConfig(): SecretsProviderConfig;
export declare const REQUIRED_SECRETS: string[];
export declare const OPTIONAL_SECRETS: string[];
export declare const SENSITIVE_PATTERNS: RegExp[];
export declare function isSensitiveKey(key: string): boolean;
export declare function maskSecretValue(value: string): string;
export declare function isValidSecretKey(key: string): boolean;
export declare function validateSecretValue(key: string, value: string): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=secrets.config.d.ts.map