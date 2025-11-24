/**
 * HashiCorp Vault Secret Store
 *
 * Optional integration with HashiCorp Vault
 * Requires node-vault package
 *
 * Installation:
 *   npm install node-vault
 *
 * Configuration:
 *   SECRETS_PROVIDER=vault
 *   VAULT_ADDR=http://localhost:8200
 *   VAULT_TOKEN=your-vault-token
 *   VAULT_NAMESPACE=your-namespace (optional)
 *   VAULT_PATH=secret (KV mount path)
 *   VAULT_KV_VERSION=v2 (v1 or v2)
 */

import {
  ISecretProvider,
  SecretMetadata,
  VaultSecretStoreConfig,
} from '../../types/secrets.types';

// Minimal type for node-vault client (no official types available)
interface VaultClient {
  read(path: string): Promise<{ data?: { data?: Record<string, unknown>; versions?: Record<string, unknown> } }>;
  write(path: string, data: unknown): Promise<void>;
  delete(path: string): Promise<void>;
  list(path: string): Promise<{ data?: { keys?: string[] } }>;
  health?: () => Promise<unknown>;
  [key: string]: unknown; // Allow other methods
}

export class VaultSecretStore implements ISecretProvider {
  private vault: VaultClient | null = null;
  private config: VaultSecretStoreConfig;
  private kvVersion: 'v1' | 'v2';
  private mountPath: string;

  constructor(config?: VaultSecretStoreConfig) {
    this.config = {
      address: config?.address || 'http://localhost:8200',
      token: config?.token,
      namespace: config?.namespace,
      path: config?.path || 'secret',
      version: config?.version || 'v2',
    };

    this.kvVersion = this.config.version || 'v2';
    this.mountPath = this.config.path || 'secret';

    try {
      // Lazy load node-vault
      const nodeVault = require('node-vault');

      const vaultOptions: {
        apiVersion: string;
        endpoint: string;
        token?: string;
        namespace?: string;
      } = {
        apiVersion: 'v1',
        endpoint: this.config.address,
      };

      if (this.config.token) {
        vaultOptions.token = this.config.token;
      }

      if (this.config.namespace) {
        vaultOptions.namespace = this.config.namespace;
      }

      this.vault = nodeVault(vaultOptions);
    } catch (error) {
      throw new Error('node-vault not installed. Run: npm install node-vault');
    }
  }

  /**
   * Get full secret path
   */
  private getSecretPath(key: string): string {
    if (this.kvVersion === 'v2') {
      return `${this.mountPath}/data/${key}`;
    } else {
      return `${this.mountPath}/${key}`;
    }
  }

  /**
   * Get metadata path for KV v2
   */
  private getMetadataPath(key: string): string {
    return `${this.mountPath}/metadata/${key}`;
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | null> {
    try {
      if (!this.vault) {
        throw new Error('Vault client not initialized');
      }
      const response = await this.vault.read(this.getSecretPath(key));

      if (this.kvVersion === 'v2') {
        // KV v2 stores data in response.data.data
        const data = response?.data?.data;
        return data?.value || data?.[key] || null;
      } else {
        // KV v1 stores data in response.data
        const data = response?.data;
        return data?.value || data?.[key] || null;
      }
    } catch (error: unknown) {
      const errorObj = error as { response?: { statusCode?: number } };
      if (errorObj.response?.statusCode === 404) {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting secret "${key}" from Vault:`, errorMessage);
      throw error;
    }
  }

  /**
   * Set a secret value
   */
  async set(key: string, value: string, expiresAt?: Date): Promise<void> {
    try {
      const secretData: {
        value: string;
        metadata: {
          key: string;
          createdAt: string;
          updatedAt: string;
          version: number;
          expiresAt?: string;
        };
      } = {
        value,
        metadata: {
          key,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
          expiresAt: expiresAt?.toISOString(),
        },
      };

      if (this.kvVersion === 'v2') {
        // KV v2 requires data wrapped in { data: {...} }
        if (!this.vault) {
          throw new Error('Vault client not initialized');
        }
        await this.vault.write(this.getSecretPath(key), {
          data: secretData,
        });
      } else {
        // KV v1 writes data directly
        if (!this.vault) {
          throw new Error('Vault client not initialized');
        }
        await this.vault.write(this.getSecretPath(key), secretData);
      }
    } catch (error) {
      console.error(`Error setting secret "${key}" in Vault:`, error);
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  async delete(key: string): Promise<void> {
    try {
      if (!this.vault) {
        throw new Error('Vault client not initialized');
      }
      if (this.kvVersion === 'v2') {
        // KV v2 has soft delete that preserves versions
        await this.vault.delete(this.getSecretPath(key));
      } else {
        // KV v1 deletes permanently
        await this.vault.delete(this.getSecretPath(key));
      }
    } catch (error: unknown) {
      const errorObj = error as { response?: { statusCode?: number } };
      if (errorObj.response?.statusCode !== 404) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error deleting secret "${key}" from Vault:`, errorMessage);
        throw error;
      }
    }
  }

  /**
   * List all secret keys
   */
  async list(): Promise<string[]> {
    try {
      let listPath: string;

      if (this.kvVersion === 'v2') {
        listPath = `${this.mountPath}/metadata`;
      } else {
        listPath = this.mountPath;
      }

      const response = await this.vault.list(listPath);

      return response?.data?.keys || [];
    } catch (error: unknown) {
      const errorObj = error as { response?: { statusCode?: number } };
      if (errorObj.response?.statusCode === 404) {
        return [];
      }
      console.error('Error listing secrets from Vault:', error);
      return [];
    }
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      if (!this.vault) {
        return false;
      }
      await this.vault.read(this.getSecretPath(key));
      return true;
    } catch (error: unknown) {
      const errorObj = error as { response?: { statusCode?: number } };
      if (errorObj.response?.statusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Get secret metadata
   */
  async getMetadata(key: string): Promise<SecretMetadata | null> {
    try {
      if (!this.vault) {
        return null;
      }
      if (this.kvVersion === 'v2') {
        // KV v2 has dedicated metadata endpoint
        const response = await this.vault.read(this.getMetadataPath(key));
        const vaultMetadata = response?.data;

        if (vaultMetadata && typeof vaultMetadata === 'object') {
          // Also get the secret data to check for custom metadata
          const secret = await this.vault.read(this.getSecretPath(key));
          const secretData = secret?.data as { data?: { metadata?: Record<string, unknown> } } | undefined;
          const customMetadata = secretData?.data?.metadata;
          const vaultMeta = vaultMetadata as Record<string, unknown>;

          return {
            key,
            createdAt: customMetadata && typeof customMetadata === 'object' && typeof customMetadata['createdAt'] === 'string'
              ? new Date(customMetadata['createdAt'])
              : new Date(vaultMeta['created_time'] as string || Date.now()),
            updatedAt: customMetadata && typeof customMetadata === 'object' && typeof customMetadata['updatedAt'] === 'string'
              ? new Date(customMetadata['updatedAt'])
              : new Date(vaultMeta['updated_time'] as string || Date.now()),
            version: (vaultMeta['current_version'] as number) || 1,
            expiresAt: customMetadata && typeof customMetadata === 'object' && typeof customMetadata['expiresAt'] === 'string'
              ? new Date(customMetadata['expiresAt'])
              : undefined,
            rotationDate: customMetadata && typeof customMetadata === 'object' && typeof customMetadata['rotationDate'] === 'string'
              ? new Date(customMetadata['rotationDate'])
              : undefined,
          };
        }
      } else {
        // KV v1 doesn't have metadata endpoint
        const exists = await this.exists(key);
        if (exists) {
          return {
            key,
            createdAt: new Date(),
            updatedAt: new Date(),
            version: 1,
          };
        }
      }

      return null;
    } catch (error: unknown) {
      const errorObj = error as { response?: { statusCode?: number } };
      if (errorObj.response?.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Rotate a secret
   */
  async rotate(key: string, newValue: string): Promise<void> {
        const metadata = await this.getMetadata(key);
        if (!metadata) {
          throw new Error(`Secret "${key}" not found`);
        }

        // Set the new value (Vault will automatically version it)
        const secretData: {
          value: string;
          metadata: {
            key: string;
            createdAt: string;
            updatedAt: string;
            rotationDate: string;
            version: number;
            expiresAt?: string;
          };
        } = {
          value: newValue,
          metadata: {
            key,
            createdAt: metadata.createdAt.toISOString(),
            updatedAt: new Date().toISOString(),
            rotationDate: new Date().toISOString(),
            version: metadata.version + 1,
            expiresAt: metadata.expiresAt?.toISOString(),
          },
        };

    if (!this.vault) {
      throw new Error('Vault client not initialized');
    }
    if (this.kvVersion === 'v2') {
      await this.vault.write(this.getSecretPath(key), {
        data: secretData,
      });
    } else {
      await this.vault.write(this.getSecretPath(key), secretData);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      if (!this.vault) {
        return false;
      }
      // Check Vault health endpoint
      const health = this.vault.health ? await this.vault.health() : null;
      if (health && typeof health === 'object' && 'initialized' in health && 'sealed' in health) {
        return (health as { initialized?: boolean; sealed?: boolean }).initialized === true && 
               (health as { initialized?: boolean; sealed?: boolean }).sealed !== true;
      }
      return false;
    } catch (error) {
      console.error('Vault health check failed:', error);
      return false;
    }
  }

  /**
   * Get Vault client for advanced operations
   */
  getClient(): VaultClient | null {
    return this.vault;
  }

  /**
   * Permanently delete a secret and all versions (KV v2 only)
   */
  async permanentlyDelete(key: string): Promise<void> {
    if (this.kvVersion === 'v2') {
      try {
        if (!this.vault) {
          throw new Error('Vault client not initialized');
        }
        await this.vault.delete(this.getMetadataPath(key));
      } catch (error: unknown) {
        const errorObj = error as { response?: { statusCode?: number } };
        if (errorObj.response?.statusCode !== 404) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          console.error(`Error permanently deleting secret "${key}":`, errorMessage);
          throw error;
        }
      }
    } else {
      // KV v1 doesn't have versions, regular delete is permanent
      await this.delete(key);
    }
  }

  /**
   * Undelete a secret (restore from soft delete, KV v2 only)
   */
  async undelete(key: string, versions?: number[]): Promise<void> {
    if (this.kvVersion === 'v2') {
      try {
        const path = `${this.mountPath}/undelete/${key}`;
        if (!this.vault) {
          throw new Error('Vault client not initialized');
        }
        await this.vault.write(path, {
          versions: versions || [await this.getLatestVersion(key)],
        });
      } catch (error) {
        console.error(`Error undeleting secret "${key}":`, error);
        throw error;
      }
    } else {
      throw new Error('Undelete is only supported in KV v2');
    }
  }

  /**
   * Get the latest version number (KV v2 only)
   */
  private async getLatestVersion(key: string): Promise<number> {
    if (this.kvVersion === 'v2') {
      const metadata = await this.getMetadata(key);
      return metadata?.version || 1;
    }
    return 1;
  }

  /**
   * List secret versions (KV v2 only)
   */
  async listVersions(key: string): Promise<number[]> {
    if (this.kvVersion === 'v2') {
      try {
        if (!this.vault) {
          throw new Error('Vault client not initialized');
        }
        const response = await this.vault.read(this.getMetadataPath(key));
        const versions = (response?.data as { versions?: Record<string, unknown> })?.versions;

        if (versions) {
          return Object.keys(versions)
            .map((v) => parseInt(v, 10))
            .filter((v) => !isNaN(v));
        }
      } catch (error) {
        console.error(`Error listing versions for secret "${key}":`, error);
      }
    }
    return [];
  }

  /**
   * Get a specific version of a secret (KV v2 only)
   */
  async getVersion(key: string, version: number): Promise<string | null> {
    if (this.kvVersion === 'v2') {
      try {
        if (!this.vault) {
          throw new Error('Vault client not initialized');
        }
        const path = this.getSecretPath(key) + `?version=${version}`;
        const response = await this.vault.read(path);
        const responseData = response?.data as { data?: Record<string, unknown> } | undefined;
        const data = responseData?.data;
        if (data && typeof data === 'object') {
          const value = data['value'] as string | undefined;
          const keyValue = data[key] as string | undefined;
          return value || keyValue || null;
        }
        return null;
      } catch (error: unknown) {
        const errorObj = error as { response?: { statusCode?: number } };
        if (errorObj.response?.statusCode === 404) {
          return null;
        }
        throw error;
      }
    } else {
      throw new Error('Versioning is only supported in KV v2');
    }
  }
}
