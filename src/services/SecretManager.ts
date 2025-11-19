/**
 * Secret Manager Service
 *
 * Flexible secrets management with multiple provider support
 * Implements strategy pattern for easy provider switching
 */

import { injectable } from 'tsyringe';
import {
  ISecretProvider,
  SecretsProviderConfig,
  SecretMetadata,
  SecretValidationResult,
  SecretMigrationResult,
} from '../types/secrets.types';
import { LocalSecretStore } from './secrets/LocalSecretStore';
import { EnvSecretStore } from './secrets/EnvSecretStore';
import { env } from '../config/env';

@injectable()
export class SecretManager {
  private static instance: SecretManager | null = null;
  private provider: ISecretProvider;
  private config: SecretsProviderConfig;
  private requiredSecrets: string[] = [
    'JWT_SECRET',
    'SESSION_SECRET',
    'CSRF_SECRET',
    'DATABASE_URL',
  ];

  constructor() {
    this.config = this.loadConfiguration();
    this.provider = this.initializeProvider();
  }

  /**
   * Get singleton instance of SecretManager
   */
  static getInstance(): SecretManager {
    if (!SecretManager.instance) {
      SecretManager.instance = new SecretManager();
    }
    return SecretManager.instance;
  }

  /**
   * Load secrets configuration from environment
   */
  private loadConfiguration(): SecretsProviderConfig {
    const provider = (env.get('SECRETS_PROVIDER') || 'env') as 'local' | 'env' | 'aws' | 'vault';

    const config: SecretsProviderConfig = {
      provider,
      rotation: {
        enabled: env.get('SECRETS_ROTATION_ENABLED') === 'true',
        intervalDays: parseInt(env.get('SECRETS_ROTATION_INTERVAL_DAYS') || '90', 10),
        notifyBeforeDays: parseInt(env.get('SECRETS_ROTATION_NOTIFY_DAYS') || '7', 10),
      },
    };

    // Load provider-specific configuration
    switch (provider) {
      case 'local':
        config.local = {
          encryptionKey: (env.get('SECRETS_ENCRYPTION_KEY') as string | undefined),
          storePath: (env.get('SECRETS_STORE_PATH') as string | undefined) || './secrets.encrypted',
          backupPath: (env.get('SECRETS_BACKUP_PATH') as string | undefined) || './backups/secrets',
          autoBackup: env.get('SECRETS_AUTO_BACKUP') !== 'false',
        };
        break;

      case 'aws':
        config.aws = {
          region: (env.get('AWS_REGION') as string | undefined) || 'us-east-1',
          accessKeyId: (env.get('AWS_ACCESS_KEY_ID') as string | undefined),
          secretAccessKey: (env.get('AWS_SECRET_ACCESS_KEY') as string | undefined),
          prefix: (env.get('AWS_SECRETS_PREFIX') as string | undefined) || 'event-manager',
        };
        break;

      case 'vault':
        config.vault = {
          address: (env.get('VAULT_ADDR') as string | undefined) || 'http://localhost:8200',
          token: (env.get('VAULT_TOKEN') as string | undefined),
          namespace: env.get('VAULT_NAMESPACE'),
          path: env.get('VAULT_PATH') || 'secret',
          version: (env.get('VAULT_KV_VERSION') || 'v2') as 'v1' | 'v2',
        };
        break;

      case 'env':
      default:
        // No additional configuration needed for env provider
        break;
    }

    return config;
  }

  /**
   * Initialize the appropriate secrets provider
   */
  private initializeProvider(): ISecretProvider {
    switch (this.config.provider) {
      case 'local':
        return new LocalSecretStore(this.config.local);

      case 'env':
        return new EnvSecretStore();

      case 'aws':
        // Lazy load to avoid requiring AWS SDK if not used
        try {
          const { AWSSecretStore } = require('./secrets/AWSSecretStore');
          return new AWSSecretStore(this.config.aws);
        } catch (error) {
          console.warn('AWS Secrets Manager not available, falling back to env');
          return new EnvSecretStore();
        }

      case 'vault':
        // Lazy load to avoid requiring Vault client if not used
        try {
          const { VaultSecretStore } = require('./secrets/VaultSecretStore');
          return new VaultSecretStore(this.config.vault);
        } catch (error) {
          console.warn('HashiCorp Vault not available, falling back to env');
          return new EnvSecretStore();
        }

      default:
        console.warn(`Unknown secrets provider: ${this.config.provider}, using env`);
        return new EnvSecretStore();
    }
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | null> {
    try {
      return await this.provider.get(key);
    } catch (error) {
      console.error(`Error getting secret "${key}":`, error);
      return null;
    }
  }

  /**
   * Get a secret value or throw if not found
   */
  async getOrThrow(key: string): Promise<string> {
    const value = await this.get(key);
    if (value === null) {
      throw new Error(`Required secret "${key}" not found`);
    }
    return value;
  }

  /**
   * Set a secret value
   */
  async set(key: string, value: string, expiresAt?: Date): Promise<void> {
    try {
      await this.provider.set(key, value, expiresAt);
    } catch (error) {
      console.error(`Error setting secret "${key}":`, error);
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  async delete(key: string): Promise<void> {
    try {
      await this.provider.delete(key);
    } catch (error) {
      console.error(`Error deleting secret "${key}":`, error);
      throw error;
    }
  }

  /**
   * List all secret keys
   */
  async list(): Promise<string[]> {
    try {
      return await this.provider.list();
    } catch (error) {
      console.error('Error listing secrets:', error);
      return [];
    }
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      return await this.provider.exists(key);
    } catch (error) {
      console.error(`Error checking secret "${key}":`, error);
      return false;
    }
  }

  /**
   * Get secret metadata
   */
  async getMetadata(key: string): Promise<SecretMetadata | null> {
    try {
      return await this.provider.getMetadata(key);
    } catch (error) {
      console.error(`Error getting metadata for secret "${key}":`, error);
      return null;
    }
  }

  /**
   * Rotate a secret
   */
  async rotate(key: string, newValue: string): Promise<void> {
    try {
      await this.provider.rotate(key, newValue);
    } catch (error) {
      console.error(`Error rotating secret "${key}":`, error);
      throw error;
    }
  }

  /**
   * Validate all required secrets are present
   */
  async validate(): Promise<SecretValidationResult> {
    const result: SecretValidationResult = {
      valid: true,
      missing: [],
      expired: [],
      requiresRotation: [],
    };

    for (const key of this.requiredSecrets) {
      const exists = await this.exists(key);
      if (!exists) {
        result.missing.push(key);
        result.valid = false;
        continue;
      }

      const metadata = await this.getMetadata(key);
      if (metadata) {
        // Check if expired
        if (metadata.expiresAt && new Date() > metadata.expiresAt) {
          result.expired.push(key);
          result.valid = false;
        }

        // Check if rotation needed
        if (this.config.rotation?.enabled && metadata.rotationDate) {
          const rotationIntervalMs =
            this.config.rotation.intervalDays * 24 * 60 * 60 * 1000;
          const nextRotation = new Date(
            metadata.rotationDate.getTime() + rotationIntervalMs
          );
          if (new Date() > nextRotation) {
            result.requiresRotation.push(key);
          }
        }
      }
    }

    return result;
  }

  /**
   * Migrate secrets from one provider to another
   */
  async migrate(
    targetProvider: ISecretProvider,
    secretKeys?: string[]
  ): Promise<SecretMigrationResult> {
    const result: SecretMigrationResult = {
      success: true,
      migrated: [],
      failed: [],
      total: 0,
    };

    try {
      // Get keys to migrate
      const keys = secretKeys || (await this.list());
      result.total = keys.length;

      for (const key of keys) {
        try {
          const value = await this.get(key);
          if (value) {
            const metadata = await this.getMetadata(key);
            await targetProvider.set(key, value, metadata?.expiresAt);
            result.migrated.push(key);
          }
        } catch (error) {
          result.failed.push({
            key,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          result.success = false;
        }
      }
    } catch (error) {
      result.success = false;
      console.error('Migration failed:', error);
    }

    return result;
  }

  /**
   * Health check for the current provider
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.provider.healthCheck();
    } catch (error) {
      console.error('Secret provider health check failed:', error);
      return false;
    }
  }

  /**
   * Get current provider name
   */
  getProviderName(): string {
    return this.config.provider;
  }

  /**
   * Get provider configuration
   */
  getConfiguration(): SecretsProviderConfig {
    return { ...this.config };
  }

  /**
   * Set required secrets list
   */
  setRequiredSecrets(secrets: string[]): void {
    this.requiredSecrets = secrets;
  }

  /**
   * Get required secrets list
   */
  getRequiredSecrets(): string[] {
    return [...this.requiredSecrets];
  }
}
