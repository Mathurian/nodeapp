/**
 * Local Encrypted Secret Store
 *
 * Stores secrets in an encrypted file using AES-256-GCM encryption
 * Provides a secure, self-contained secret management solution
 * No third-party dependencies required
 */

import {
  ISecretProvider,
  SecretMetadata,
  LocalSecretStoreConfig,
} from '../../types/secrets.types';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

interface EncryptedSecret {
  key: string;
  encryptedValue: string;
  iv: string; // Initialization vector for AES-GCM
  authTag: string; // Authentication tag for integrity
  metadata: SecretMetadata;
}

interface SecretStore {
  version: number;
  secrets: EncryptedSecret[];
  createdAt: string;
  updatedAt: string;
}

export class LocalSecretStore implements ISecretProvider {
  private config: LocalSecretStoreConfig;
  private encryptionKey: Buffer;
  private store: SecretStore;
  private storePath: string;
  private algorithm = 'aes-256-gcm';
  private keyDerivationIterations = 100000;

  constructor(config?: LocalSecretStoreConfig) {
    this.config = {
      storePath: config?.storePath || path.join(process.cwd(), 'secrets.encrypted'),
      backupPath: config?.backupPath || path.join(process.cwd(), 'backups', 'secrets'),
      autoBackup: config?.autoBackup !== false,
      encryptionKey: config?.encryptionKey,
    };

    this.storePath = this.config.storePath!;
    this.encryptionKey = this.deriveEncryptionKey();
    this.store = this.loadStore();
  }

  /**
   * Derive encryption key from master key or generate one
   */
  private deriveEncryptionKey(): Buffer {
    const masterKey =
      this.config.encryptionKey ||
      process.env.SECRETS_ENCRYPTION_KEY ||
      this.generateMasterKey();

    // Use PBKDF2 to derive a strong encryption key
    const salt = this.getOrCreateSalt();
    return crypto.pbkdf2Sync(
      masterKey,
      salt,
      this.keyDerivationIterations,
      32, // 256 bits for AES-256
      'sha256'
    );
  }

  /**
   * Get or create salt for key derivation
   */
  private getOrCreateSalt(): Buffer {
    const saltPath = path.join(path.dirname(this.storePath), '.salt');

    try {
      if (fs.existsSync(saltPath)) {
        return fs.readFileSync(saltPath);
      } else {
        const salt = crypto.randomBytes(32);
        fs.mkdirSync(path.dirname(saltPath), { recursive: true });
        fs.writeFileSync(saltPath, salt, { mode: 0o600 });
        return salt;
      }
    } catch (error) {
      console.error('Error handling salt:', error);
      // Fallback to static salt (less secure, but allows operation)
      return crypto.createHash('sha256').update('fallback-salt').digest();
    }
  }

  /**
   * Generate a new master key
   */
  private generateMasterKey(): string {
    const key = crypto.randomBytes(32).toString('base64');
    console.warn(
      '\n⚠️  WARNING: No encryption key provided. Generated a new master key.'
    );
    console.warn('Save this key securely and set SECRETS_ENCRYPTION_KEY:\n');
    console.warn(`export SECRETS_ENCRYPTION_KEY="${key}"\n`);
    return key;
  }

  /**
   * Load secrets store from disk or create new one
   */
  private loadStore(): SecretStore {
    try {
      if (fs.existsSync(this.storePath)) {
        const encrypted = fs.readFileSync(this.storePath, 'utf-8');
        return JSON.parse(encrypted) as SecretStore;
      }
    } catch (error) {
      console.error('Error loading secret store:', error);
    }

    // Create new store
    return {
      version: 1,
      secrets: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Save secrets store to disk
   */
  private async saveStore(): Promise<void> {
    try {
      // Create backup if enabled
      if (this.config.autoBackup && fs.existsSync(this.storePath)) {
        await this.createBackup();
      }

      // Update timestamp
      this.store.updatedAt = new Date().toISOString();

      // Ensure directory exists
      const dir = path.dirname(this.storePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Write store
      const content = JSON.stringify(this.store, null, 2);
      fs.writeFileSync(this.storePath, content, { mode: 0o600 });
    } catch (error) {
      console.error('Error saving secret store:', error);
      throw new Error('Failed to save secrets');
    }
  }

  /**
   * Create a backup of the current store
   */
  private async createBackup(): Promise<void> {
    try {
      if (!this.config.backupPath) return;

      const backupDir = this.config.backupPath;
      if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupPath = path.join(backupDir, `secrets-${timestamp}.encrypted`);

      fs.copyFileSync(this.storePath, backupPath);

      // Keep only last 10 backups
      await this.pruneOldBackups(10);
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }

  /**
   * Prune old backups, keeping only the most recent N
   */
  private async pruneOldBackups(keep: number): Promise<void> {
    try {
      if (!this.config.backupPath) return;

      const files = fs
        .readdirSync(this.config.backupPath)
        .filter((f) => f.startsWith('secrets-') && f.endsWith('.encrypted'))
        .map((f) => ({
          name: f,
          path: path.join(this.config.backupPath!, f),
          time: fs.statSync(path.join(this.config.backupPath!, f)).mtime,
        }))
        .sort((a, b) => b.time.getTime() - a.time.getTime());

      // Delete old backups
      for (let i = keep; i < files.length; i++) {
        fs.unlinkSync(files[i].path);
      }
    } catch (error) {
      console.error('Error pruning backups:', error);
    }
  }

  /**
   * Encrypt a value using AES-256-GCM
   */
  private encrypt(value: string): { encrypted: string; iv: string; authTag: string } {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);

    let encrypted = cipher.update(value, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    const authTag = (cipher as any).getAuthTag().toString('base64');

    return {
      encrypted,
      iv: iv.toString('base64'),
      authTag,
    };
  }

  /**
   * Decrypt a value using AES-256-GCM
   */
  private decrypt(encrypted: string, iv: string, authTag: string): string {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(iv, 'base64')
    );

    (decipher as any).setAuthTag(Buffer.from(authTag, 'base64'));

    let decrypted = decipher.update(encrypted, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Find a secret by key
   */
  private findSecret(key: string): EncryptedSecret | undefined {
    return this.store.secrets.find((s) => s.key === key);
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | null> {
    const secret = this.findSecret(key);
    if (!secret) return null;

    try {
      return this.decrypt(secret.encryptedValue, secret.iv, secret.authTag);
    } catch (error) {
      console.error(`Error decrypting secret "${key}":`, error);
      return null;
    }
  }

  /**
   * Set a secret value
   */
  async set(key: string, value: string, expiresAt?: Date): Promise<void> {
    const { encrypted, iv, authTag } = this.encrypt(value);

    const existingSecret = this.findSecret(key);
    const now = new Date();

    if (existingSecret) {
      // Update existing secret
      existingSecret.encryptedValue = encrypted;
      existingSecret.iv = iv;
      existingSecret.authTag = authTag;
      existingSecret.metadata.updatedAt = now;
      existingSecret.metadata.version += 1;
      if (expiresAt) {
        existingSecret.metadata.expiresAt = expiresAt;
      }
    } else {
      // Create new secret
      const newSecret: EncryptedSecret = {
        key,
        encryptedValue: encrypted,
        iv,
        authTag,
        metadata: {
          key,
          createdAt: now,
          updatedAt: now,
          version: 1,
          expiresAt,
        },
      };
      this.store.secrets.push(newSecret);
    }

    await this.saveStore();
  }

  /**
   * Delete a secret
   */
  async delete(key: string): Promise<void> {
    const index = this.store.secrets.findIndex((s) => s.key === key);
    if (index !== -1) {
      this.store.secrets.splice(index, 1);
      await this.saveStore();
    }
  }

  /**
   * List all secret keys
   */
  async list(): Promise<string[]> {
    return this.store.secrets.map((s) => s.key);
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    return this.findSecret(key) !== undefined;
  }

  /**
   * Get secret metadata
   */
  async getMetadata(key: string): Promise<SecretMetadata | null> {
    const secret = this.findSecret(key);
    return secret ? { ...secret.metadata } : null;
  }

  /**
   * Rotate a secret
   */
  async rotate(key: string, newValue: string): Promise<void> {
    const existing = this.findSecret(key);
    if (!existing) {
      throw new Error(`Secret "${key}" not found`);
    }

    await this.set(key, newValue);

    // Update rotation date
    const secret = this.findSecret(key);
    if (secret) {
      secret.metadata.rotationDate = new Date();
      await this.saveStore();
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      // Try to read and write a test secret
      const testKey = '__health_check__';
      const testValue = 'test';

      await this.set(testKey, testValue);
      const retrieved = await this.get(testKey);
      await this.delete(testKey);

      return retrieved === testValue;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Export secrets (encrypted) for backup
   */
  async export(): Promise<string> {
    return JSON.stringify(this.store, null, 2);
  }

  /**
   * Import secrets from backup
   */
  async import(data: string): Promise<void> {
    try {
      const imported = JSON.parse(data) as SecretStore;

      // Validate structure
      if (!imported.version || !Array.isArray(imported.secrets)) {
        throw new Error('Invalid secret store format');
      }

      // Create backup before import
      if (this.config.autoBackup) {
        await this.createBackup();
      }

      // Replace store
      this.store = imported;
      await this.saveStore();
    } catch (error) {
      console.error('Import failed:', error);
      throw new Error('Failed to import secrets');
    }
  }

  /**
   * Re-encrypt all secrets with a new key
   */
  async reEncrypt(newKey: string): Promise<void> {
    const oldKey = this.encryptionKey;

    try {
      // Decrypt all secrets with old key
      const decrypted: Array<{ key: string; value: string; metadata: SecretMetadata }> =
        [];

      for (const secret of this.store.secrets) {
        try {
          const value = this.decrypt(secret.encryptedValue, secret.iv, secret.authTag);
          decrypted.push({
            key: secret.key,
            value,
            metadata: secret.metadata,
          });
        } catch (error) {
          console.error(`Failed to decrypt secret "${secret.key}"`, error);
          throw error;
        }
      }

      // Update encryption key
      const salt = this.getOrCreateSalt();
      this.encryptionKey = crypto.pbkdf2Sync(
        newKey,
        salt,
        this.keyDerivationIterations,
        32,
        'sha256'
      );

      // Re-encrypt all secrets with new key
      this.store.secrets = [];
      for (const { key, value, metadata } of decrypted) {
        const { encrypted, iv, authTag } = this.encrypt(value);
        this.store.secrets.push({
          key,
          encryptedValue: encrypted,
          iv,
          authTag,
          metadata: {
            ...metadata,
            updatedAt: new Date(),
          },
        });
      }

      await this.saveStore();
    } catch (error) {
      // Restore old key on failure
      this.encryptionKey = oldKey;
      throw new Error('Re-encryption failed: ' + (error as Error).message);
    }
  }

  /**
   * Get store statistics
   */
  getStats(): {
    totalSecrets: number;
    storeSize: number;
    lastUpdated: string;
    backupCount: number;
  } {
    let storeSize = 0;
    let backupCount = 0;

    try {
      if (fs.existsSync(this.storePath)) {
        storeSize = fs.statSync(this.storePath).size;
      }

      if (this.config.backupPath && fs.existsSync(this.config.backupPath)) {
        backupCount = fs
          .readdirSync(this.config.backupPath)
          .filter((f) => f.startsWith('secrets-') && f.endsWith('.encrypted')).length;
      }
    } catch (error) {
      console.error('Error getting stats:', error);
    }

    return {
      totalSecrets: this.store.secrets.length,
      storeSize,
      lastUpdated: this.store.updatedAt,
      backupCount,
    };
  }
}
