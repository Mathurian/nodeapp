/**
 * Secrets Configuration
 *
 * Configuration for the flexible secrets management system
 */

import { SecretsProviderConfig } from '../types/secrets.types';

/**
 * Get secrets configuration from environment
 */
export function getSecretsConfig(): SecretsProviderConfig {
  const provider = (process.env['SECRETS_PROVIDER'] || 'env') as 'local' | 'env' | 'aws' | 'vault';

  const config: SecretsProviderConfig = {
    provider,
    rotation: {
      enabled: process.env['SECRETS_ROTATION_ENABLED'] === 'true',
      intervalDays: parseInt(process.env['SECRETS_ROTATION_INTERVAL_DAYS'] || '90', 10),
      notifyBeforeDays: parseInt(process.env['SECRETS_ROTATION_NOTIFY_DAYS'] || '7', 10),
    },
  };

  // Load provider-specific configuration
  switch (provider) {
    case 'local':
      config.local = {
        encryptionKey: process.env['SECRETS_ENCRYPTION_KEY'],
        storePath: process.env['SECRETS_STORE_PATH'] || './secrets.encrypted',
        backupPath: process.env['SECRETS_BACKUP_PATH'] || './backups/secrets',
        autoBackup: process.env['SECRETS_AUTO_BACKUP'] !== 'false',
      };
      break;

    case 'aws':
      config.aws = {
        region: process.env['AWS_REGION'] || 'us-east-1',
        accessKeyId: process.env['AWS_ACCESS_KEY_ID'],
        secretAccessKey: process.env['AWS_SECRET_ACCESS_KEY'],
        prefix: process.env['AWS_SECRETS_PREFIX'] || 'event-manager',
      };
      break;

    case 'vault':
      config.vault = {
        address: process.env['VAULT_ADDR'] || 'http://localhost:8200',
        token: process.env['VAULT_TOKEN'],
        namespace: process.env['VAULT_NAMESPACE'],
        path: process.env['VAULT_PATH'] || 'secret',
        version: (process.env['VAULT_KV_VERSION'] || 'v2') as 'v1' | 'v2',
      };
      break;
  }

  return config;
}

/**
 * Required secrets for the application
 */
export const REQUIRED_SECRETS = [
  'JWT_SECRET',
  'SESSION_SECRET',
  'CSRF_SECRET',
  'DATABASE_URL',
];

/**
 * Optional secrets (won't fail validation if missing)
 */
export const OPTIONAL_SECRETS = [
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'REDIS_PASSWORD',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

/**
 * Secrets that should never be logged or exposed
 */
export const SENSITIVE_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /key/i,
  /api[_-]?key/i,
  /credential/i,
  /private/i,
];

/**
 * Check if a key contains sensitive information
 */
export function isSensitiveKey(key: string): boolean {
  return SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
}

/**
 * Mask sensitive values for logging
 */
export function maskSecretValue(value: string): string {
  if (value.length <= 8) {
    return '********';
  }
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

/**
 * Validate secret key format
 */
export function isValidSecretKey(key: string): boolean {
  // Keys should be uppercase with underscores
  return /^[A-Z][A-Z0-9_]*$/.test(key);
}

/**
 * Validate secret value
 */
export function validateSecretValue(key: string, value: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  // Check minimum length
  if (value.length < 8) {
    errors.push(`Secret value for "${key}" should be at least 8 characters`);
  }

  // Check for common weak patterns
  if (/^(password|secret|test|admin|123456|qwerty)/i.test(value)) {
    errors.push(`Secret value for "${key}" appears to be weak or commonly used`);
  }

  // Specific validation for certain keys
  if (key.includes('URL') && !value.includes('://')) {
    errors.push(`Secret "${key}" should be a valid URL`);
  }

  if (key.includes('EMAIL') && !value.includes('@')) {
    errors.push(`Secret "${key}" should be a valid email address`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
