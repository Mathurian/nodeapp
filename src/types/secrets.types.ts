/**
 * Secrets Management Types
 *
 * Defines types for the flexible secrets management system
 */

/**
 * Secret metadata
 */
export interface SecretMetadata {
  key: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  rotationDate?: Date;
  expiresAt?: Date;
}

/**
 * Secret value with metadata
 */
export interface Secret {
  key: string;
  value: string;
  metadata: SecretMetadata;
}

/**
 * Secret rotation configuration
 */
export interface SecretRotationConfig {
  enabled: boolean;
  intervalDays: number;
  notifyBeforeDays: number;
}

/**
 * Secrets provider configuration
 */
export interface SecretsProviderConfig {
  provider: 'local' | 'env' | 'aws' | 'vault';
  local?: LocalSecretStoreConfig;
  aws?: AWSSecretStoreConfig;
  vault?: VaultSecretStoreConfig;
  rotation?: SecretRotationConfig;
}

/**
 * Local secret store configuration
 */
export interface LocalSecretStoreConfig {
  encryptionKey?: string; // Master key for encryption (loaded from env or file)
  storePath?: string; // Path to encrypted secrets file
  backupPath?: string; // Path to backup directory
  autoBackup?: boolean;
}

/**
 * AWS Secrets Manager configuration
 */
export interface AWSSecretStoreConfig {
  region: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  prefix?: string; // Prefix for secret names
}

/**
 * HashiCorp Vault configuration
 */
export interface VaultSecretStoreConfig {
  address: string;
  token?: string;
  namespace?: string;
  path: string; // KV mount path
  version?: 'v1' | 'v2';
}

/**
 * Secret provider interface
 */
export interface ISecretProvider {
  /**
   * Get a secret value by key
   */
  get(key: string): Promise<string | null>;

  /**
   * Set a secret value
   */
  set(key: string, value: string, expiresAt?: Date): Promise<void>;

  /**
   * Delete a secret
   */
  delete(key: string): Promise<void>;

  /**
   * List all secret keys
   */
  list(): Promise<string[]>;

  /**
   * Check if a secret exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Get secret metadata
   */
  getMetadata(key: string): Promise<SecretMetadata | null>;

  /**
   * Rotate a secret (generate new version)
   */
  rotate(key: string, newValue: string): Promise<void>;

  /**
   * Health check
   */
  healthCheck(): Promise<boolean>;
}

/**
 * Secret migration result
 */
export interface SecretMigrationResult {
  success: boolean;
  migrated: string[];
  failed: { key: string; error: string }[];
  total: number;
}

/**
 * Secret validation result
 */
export interface SecretValidationResult {
  valid: boolean;
  missing: string[];
  expired: string[];
  requiresRotation: string[];
}
