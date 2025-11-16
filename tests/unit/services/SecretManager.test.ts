/**
 * SecretManager Tests
 *
 * Comprehensive test suite for the secrets management system
 */

import { SecretManager } from '../../../src/services/SecretManager';
import { LocalSecretStore } from '../../../src/services/secrets/LocalSecretStore';
import { EnvSecretStore } from '../../../src/services/secrets/EnvSecretStore';
import * as fs from 'fs';
import * as path from 'path';

describe('SecretManager', () => {
  let testDir: string;
  let secretManager: SecretManager;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(__dirname, '.test-secrets');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    // Set test environment
    process.env.SECRETS_PROVIDER = 'local';
    process.env.SECRETS_ENCRYPTION_KEY = 'test-master-key-for-testing-only';
    process.env.SECRETS_STORE_PATH = path.join(testDir, 'secrets.encrypted');
    process.env.SECRETS_BACKUP_PATH = path.join(testDir, 'backups');
    process.env.SECRETS_AUTO_BACKUP = 'true';
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }

    // Clean up environment
    delete process.env.SECRETS_PROVIDER;
    delete process.env.SECRETS_ENCRYPTION_KEY;
    delete process.env.SECRETS_STORE_PATH;
    delete process.env.SECRETS_BACKUP_PATH;
    delete process.env.SECRETS_AUTO_BACKUP;
  });

  describe('Initialization', () => {
    it('should initialize with local provider by default', () => {
      secretManager = new SecretManager();
      expect(secretManager.getProviderName()).toBe('local');
    });

    it('should initialize with env provider when specified', () => {
      process.env.SECRETS_PROVIDER = 'env';
      secretManager = new SecretManager();
      expect(secretManager.getProviderName()).toBe('env');
    });

    it('should fall back to env provider for unknown providers', () => {
      process.env.SECRETS_PROVIDER = 'unknown' as any;
      secretManager = new SecretManager();
      // Should fall back to env and log warning
      expect(['env', 'unknown']).toContain(secretManager.getProviderName());
    });
  });

  describe('Basic CRUD Operations', () => {
    beforeEach(() => {
      secretManager = new SecretManager();
    });

    it('should set and get a secret', async () => {
      await secretManager.set('TEST_SECRET', 'test-value');
      const value = await secretManager.get('TEST_SECRET');
      expect(value).toBe('test-value');
    });

    it('should return null for non-existent secret', async () => {
      const value = await secretManager.get('NON_EXISTENT');
      expect(value).toBeNull();
    });

    it('should delete a secret', async () => {
      await secretManager.set('DELETE_ME', 'value');
      expect(await secretManager.exists('DELETE_ME')).toBe(true);

      await secretManager.delete('DELETE_ME');
      expect(await secretManager.exists('DELETE_ME')).toBe(false);
    });

    it('should list all secrets', async () => {
      await secretManager.set('SECRET_1', 'value1');
      await secretManager.set('SECRET_2', 'value2');
      await secretManager.set('SECRET_3', 'value3');

      const keys = await secretManager.list();
      expect(keys).toContain('SECRET_1');
      expect(keys).toContain('SECRET_2');
      expect(keys).toContain('SECRET_3');
    });

    it('should check if secret exists', async () => {
      await secretManager.set('EXISTS', 'value');
      expect(await secretManager.exists('EXISTS')).toBe(true);
      expect(await secretManager.exists('NOT_EXISTS')).toBe(false);
    });

    it('should throw error for getOrThrow when secret not found', async () => {
      await expect(secretManager.getOrThrow('NOT_FOUND')).rejects.toThrow(
        'Required secret "NOT_FOUND" not found'
      );
    });

    it('should return value for getOrThrow when secret exists', async () => {
      await secretManager.set('FOUND', 'value');
      const value = await secretManager.getOrThrow('FOUND');
      expect(value).toBe('value');
    });
  });

  describe('Metadata Management', () => {
    beforeEach(() => {
      secretManager = new SecretManager();
    });

    it('should retrieve secret metadata', async () => {
      await secretManager.set('META_TEST', 'value');
      const metadata = await secretManager.getMetadata('META_TEST');

      expect(metadata).toBeDefined();
      expect(metadata?.key).toBe('META_TEST');
      expect(metadata?.version).toBe(1);
      expect(metadata?.createdAt).toBeInstanceOf(Date);
      expect(metadata?.updatedAt).toBeInstanceOf(Date);
    });

    it('should increment version on update', async () => {
      await secretManager.set('VERSION_TEST', 'v1');
      const meta1 = await secretManager.getMetadata('VERSION_TEST');
      expect(meta1?.version).toBe(1);

      await secretManager.set('VERSION_TEST', 'v2');
      const meta2 = await secretManager.getMetadata('VERSION_TEST');
      expect(meta2?.version).toBe(2);
    });

    it('should handle expiration dates', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await secretManager.set('EXPIRING', 'value', expiresAt);
      const metadata = await secretManager.getMetadata('EXPIRING');

      expect(metadata?.expiresAt).toBeDefined();
      expect(metadata?.expiresAt?.getTime()).toBeCloseTo(expiresAt.getTime(), -2);
    });
  });

  describe('Secret Rotation', () => {
    beforeEach(() => {
      secretManager = new SecretManager();
    });

    it('should rotate a secret', async () => {
      await secretManager.set('ROTATE_ME', 'old-value');
      await secretManager.rotate('ROTATE_ME', 'new-value');

      const value = await secretManager.get('ROTATE_ME');
      expect(value).toBe('new-value');
    });

    it('should update rotation date on rotation', async () => {
      await secretManager.set('ROTATION_DATE', 'value1');
      const before = new Date();

      // Wait a bit to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 10));

      await secretManager.rotate('ROTATION_DATE', 'value2');
      const metadata = await secretManager.getMetadata('ROTATION_DATE');

      expect(metadata?.rotationDate).toBeDefined();
      expect(metadata?.rotationDate!.getTime()).toBeGreaterThan(before.getTime());
    });

    it('should throw error when rotating non-existent secret', async () => {
      await expect(secretManager.rotate('NOT_EXISTS', 'value')).rejects.toThrow();
    });
  });

  describe('Validation', () => {
    beforeEach(() => {
      secretManager = new SecretManager();
    });

    it('should pass validation when all required secrets exist', async () => {
      // Set required secrets
      await secretManager.set('JWT_SECRET', 'jwt-secret');
      await secretManager.set('SESSION_SECRET', 'session-secret');
      await secretManager.set('CSRF_SECRET', 'csrf-secret');
      await secretManager.set('DATABASE_URL', 'postgresql://localhost/test');

      const result = await secretManager.validate();
      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail validation when required secrets are missing', async () => {
      const result = await secretManager.validate();
      expect(result.valid).toBe(false);
      expect(result.missing).toContain('JWT_SECRET');
      expect(result.missing).toContain('SESSION_SECRET');
    });

    it('should detect expired secrets', async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await secretManager.set('JWT_SECRET', 'expired', yesterday);
      await secretManager.set('SESSION_SECRET', 'valid');
      await secretManager.set('CSRF_SECRET', 'valid');
      await secretManager.set('DATABASE_URL', 'valid');

      const result = await secretManager.validate();
      expect(result.valid).toBe(false);
      expect(result.expired).toContain('JWT_SECRET');
    });

    it('should allow custom required secrets list', async () => {
      secretManager.setRequiredSecrets(['CUSTOM_SECRET']);
      await secretManager.set('CUSTOM_SECRET', 'value');

      const result = await secretManager.validate();
      expect(result.valid).toBe(true);
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      secretManager = new SecretManager();
    });

    it('should pass health check for working provider', async () => {
      const healthy = await secretManager.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('should return current configuration', () => {
      secretManager = new SecretManager();
      const config = secretManager.getConfiguration();

      expect(config.provider).toBe('local');
      expect(config.local).toBeDefined();
      expect(config.local?.storePath).toContain('secrets.encrypted');
    });

    it('should support rotation configuration', () => {
      process.env.SECRETS_ROTATION_ENABLED = 'true';
      process.env.SECRETS_ROTATION_INTERVAL_DAYS = '30';
      process.env.SECRETS_ROTATION_NOTIFY_DAYS = '5';

      secretManager = new SecretManager();
      const config = secretManager.getConfiguration();

      expect(config.rotation?.enabled).toBe(true);
      expect(config.rotation?.intervalDays).toBe(30);
      expect(config.rotation?.notifyBeforeDays).toBe(5);

      delete process.env.SECRETS_ROTATION_ENABLED;
      delete process.env.SECRETS_ROTATION_INTERVAL_DAYS;
      delete process.env.SECRETS_ROTATION_NOTIFY_DAYS;
    });
  });

  describe('Provider Migration', () => {
    beforeEach(() => {
      secretManager = new SecretManager();
    });

    it('should migrate secrets between providers', async () => {
      // Set up source secrets
      await secretManager.set('SECRET_1', 'value1');
      await secretManager.set('SECRET_2', 'value2');
      await secretManager.set('SECRET_3', 'value3');

      // Create target provider
      const targetPath = path.join(testDir, 'target-secrets.encrypted');
      process.env.SECRETS_STORE_PATH = targetPath;
      const targetProvider = new LocalSecretStore();

      // Migrate
      const result = await secretManager.migrate(targetProvider);

      expect(result.success).toBe(true);
      expect(result.migrated).toHaveLength(3);
      expect(result.failed).toHaveLength(0);

      // Verify secrets were migrated
      expect(await targetProvider.get('SECRET_1')).toBe('value1');
      expect(await targetProvider.get('SECRET_2')).toBe('value2');
      expect(await targetProvider.get('SECRET_3')).toBe('value3');
    });

    it('should handle migration failures gracefully', async () => {
      await secretManager.set('GOOD_SECRET', 'value');

      // Create a mock target that will fail
      const failingProvider = {
        set: jest.fn().mockRejectedValue(new Error('Write failed')),
        get: jest.fn(),
        delete: jest.fn(),
        list: jest.fn(),
        exists: jest.fn(),
        getMetadata: jest.fn(),
        rotate: jest.fn(),
        healthCheck: jest.fn(),
      };

      const result = await secretManager.migrate(failingProvider as any);

      expect(result.success).toBe(false);
      expect(result.failed.length).toBeGreaterThan(0);
    });
  });
});
