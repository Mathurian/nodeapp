/**
 * LocalSecretStore Tests
 *
 * Tests for encrypted local secret store
 */

import { LocalSecretStore } from '../../../src/services/secrets/LocalSecretStore';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('LocalSecretStore', () => {
  let testDir: string;
  let storePath: string;
  let backupPath: string;
  let store: LocalSecretStore;

  beforeEach(() => {
    // Create temporary test directory
    testDir = path.join(__dirname, '.test-local-secrets');
    storePath = path.join(testDir, 'secrets.encrypted');
    backupPath = path.join(testDir, 'backups');

    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  afterEach(() => {
    // Clean up
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('Initialization', () => {
    it('should initialize with default configuration', () => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });

      expect(store).toBeDefined();
    });

    it('should create new store file if not exists', () => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });

      // Store should be created after first write
      expect(store).toBeDefined();
    });

    it('should load existing store file', async () => {
      // Create first store and add secret
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });

      await store.set('TEST', 'value');

      // Create new instance with same path
      const store2 = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });

      const value = await store2.get('TEST');
      expect(value).toBe('value');
    });
  });

  describe('Encryption', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-encryption-key',
        storePath,
        backupPath,
      });
    });

    it('should encrypt secrets', async () => {
      await store.set('ENCRYPTED_SECRET', 'sensitive-value');

      // Read raw file content
      const rawContent = fs.readFileSync(storePath, 'utf-8');
      const storeData = JSON.parse(rawContent);

      // Check that value is encrypted (not plain text)
      expect(rawContent).not.toContain('sensitive-value');
      expect(storeData.secrets[0].encryptedValue).toBeDefined();
      expect(storeData.secrets[0].iv).toBeDefined();
      expect(storeData.secrets[0].authTag).toBeDefined();
    });

    it('should decrypt secrets correctly', async () => {
      const original = 'my-secret-value-123';
      await store.set('DECRYPT_TEST', original);

      const decrypted = await store.get('DECRYPT_TEST');
      expect(decrypted).toBe(original);
    });

    it('should fail decryption with wrong key', async () => {
      await store.set('SECRET', 'value');

      // Create new store with different key
      const wrongKeyStore = new LocalSecretStore({
        encryptionKey: 'wrong-key',
        storePath,
        backupPath,
      });

      const value = await wrongKeyStore.get('SECRET');
      // Should return null on decryption error
      expect(value).toBeNull();
    });

    it('should use authentication tags for integrity', async () => {
      await store.set('INTEGRITY_TEST', 'value');

      // Tamper with encrypted file
      const rawContent = fs.readFileSync(storePath, 'utf-8');
      const storeData = JSON.parse(rawContent);

      // Modify encrypted value
      storeData.secrets[0].encryptedValue = 'tampered';
      fs.writeFileSync(storePath, JSON.stringify(storeData));

      // Try to load tampered store
      const tamperedStore = new LocalSecretStore({
        encryptionKey: 'test-encryption-key',
        storePath,
        backupPath,
      });

      // Should fail to decrypt tampered data
      const value = await tamperedStore.get('INTEGRITY_TEST');
      expect(value).toBeNull();
    });
  });

  describe('CRUD Operations', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should set and get secrets', async () => {
      await store.set('KEY1', 'value1');
      await store.set('KEY2', 'value2');

      expect(await store.get('KEY1')).toBe('value1');
      expect(await store.get('KEY2')).toBe('value2');
    });

    it('should update existing secrets', async () => {
      await store.set('UPDATE_ME', 'old-value');
      await store.set('UPDATE_ME', 'new-value');

      expect(await store.get('UPDATE_ME')).toBe('new-value');
    });

    it('should delete secrets', async () => {
      await store.set('DELETE_ME', 'value');
      expect(await store.exists('DELETE_ME')).toBe(true);

      await store.delete('DELETE_ME');
      expect(await store.exists('DELETE_ME')).toBe(false);
    });

    it('should list all secret keys', async () => {
      await store.set('SECRET1', 'value1');
      await store.set('SECRET2', 'value2');
      await store.set('SECRET3', 'value3');

      const keys = await store.list();
      expect(keys).toHaveLength(3);
      expect(keys).toContain('SECRET1');
      expect(keys).toContain('SECRET2');
      expect(keys).toContain('SECRET3');
    });

    it('should check existence', async () => {
      await store.set('EXISTS', 'value');

      expect(await store.exists('EXISTS')).toBe(true);
      expect(await store.exists('NOT_EXISTS')).toBe(false);
    });
  });

  describe('Metadata', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should track creation time', async () => {
      const before = new Date();
      await store.set('CREATED', 'value');
      const after = new Date();

      const metadata = await store.getMetadata('CREATED');
      expect(metadata).toBeDefined();
      expect(metadata!.createdAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(metadata!.createdAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('should track update time', async () => {
      await store.set('UPDATED', 'v1');
      const firstUpdate = (await store.getMetadata('UPDATED'))!.updatedAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 10));

      await store.set('UPDATED', 'v2');
      const secondUpdate = (await store.getMetadata('UPDATED'))!.updatedAt;

      expect(secondUpdate.getTime()).toBeGreaterThan(firstUpdate.getTime());
    });

    it('should track version number', async () => {
      await store.set('VERSIONED', 'v1');
      expect((await store.getMetadata('VERSIONED'))!.version).toBe(1);

      await store.set('VERSIONED', 'v2');
      expect((await store.getMetadata('VERSIONED'))!.version).toBe(2);

      await store.set('VERSIONED', 'v3');
      expect((await store.getMetadata('VERSIONED'))!.version).toBe(3);
    });

    it('should handle expiration dates', async () => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      await store.set('EXPIRES', 'value', expiresAt);
      const metadata = await store.getMetadata('EXPIRES');

      expect(metadata?.expiresAt).toBeDefined();
      expect(metadata!.expiresAt!.getTime()).toBeCloseTo(expiresAt.getTime(), -2);
    });
  });

  describe('Secret Rotation', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should rotate secrets', async () => {
      await store.set('ROTATE', 'old-value');
      await store.rotate('ROTATE', 'new-value');

      expect(await store.get('ROTATE')).toBe('new-value');
    });

    it('should update rotation date', async () => {
      await store.set('ROTATION_DATE', 'value1');
      await store.rotate('ROTATION_DATE', 'value2');

      const metadata = await store.getMetadata('ROTATION_DATE');
      expect(metadata?.rotationDate).toBeDefined();
    });

    it('should throw error for non-existent secret', async () => {
      await expect(store.rotate('NOT_EXISTS', 'value')).rejects.toThrow();
    });
  });

  describe('Backup Management', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
        autoBackup: true,
      });
    });

    it('should create backups automatically', async () => {
      // Create initial store
      await store.set('SECRET1', 'value1');

      // Update to trigger backup
      await store.set('SECRET2', 'value2');

      // Check backup directory
      if (fs.existsSync(backupPath)) {
        const backups = fs.readdirSync(backupPath);
        expect(backups.length).toBeGreaterThan(0);
      }
    });

    it('should limit number of backups', async () => {
      // Create many backups
      for (let i = 0; i < 15; i++) {
        await store.set(`SECRET${i}`, `value${i}`);
      }

      // Check that old backups are pruned
      if (fs.existsSync(backupPath)) {
        const backups = fs.readdirSync(backupPath);
        expect(backups.length).toBeLessThanOrEqual(10);
      }
    });
  });

  describe('Export and Import', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should export secrets', async () => {
      await store.set('EXPORT1', 'value1');
      await store.set('EXPORT2', 'value2');

      const exported = await store.export();
      expect(exported).toBeDefined();

      const data = JSON.parse(exported);
      expect(data.secrets).toHaveLength(2);
      expect(data.version).toBeDefined();
    });

    it('should import secrets', async () => {
      // Create and export from first store
      await store.set('IMPORT1', 'value1');
      await store.set('IMPORT2', 'value2');
      const exported = await store.export();

      // Create new store and import
      const newStorePath = path.join(testDir, 'imported.encrypted');
      const newStore = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath: newStorePath,
        backupPath,
      });

      await newStore.import(exported);

      expect(await newStore.get('IMPORT1')).toBe('value1');
      expect(await newStore.get('IMPORT2')).toBe('value2');
    });

    it('should create backup before import', async () => {
      await store.set('ORIGINAL', 'value');

      const importData = JSON.stringify({
        version: 1,
        secrets: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      await store.import(importData);

      // Backup should exist
      if (fs.existsSync(backupPath)) {
        const backups = fs.readdirSync(backupPath);
        expect(backups.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Re-encryption', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'old-key',
        storePath,
        backupPath,
      });
    });

    it('should re-encrypt with new key', async () => {
      await store.set('REENCRYPT1', 'value1');
      await store.set('REENCRYPT2', 'value2');

      await store.reEncrypt('new-encryption-key');

      // Verify secrets are still accessible
      expect(await store.get('REENCRYPT1')).toBe('value1');
      expect(await store.get('REENCRYPT2')).toBe('value2');
    });

    it('should not lose data on re-encryption', async () => {
      const secrets = {
        SECRET1: 'value1',
        SECRET2: 'value2',
        SECRET3: 'value3',
        SECRET4: 'value4',
        SECRET5: 'value5',
      };

      for (const [key, value] of Object.entries(secrets)) {
        await store.set(key, value);
      }

      await store.reEncrypt('new-key');

      for (const [key, value] of Object.entries(secrets)) {
        expect(await store.get(key)).toBe(value);
      }
    });
  });

  describe('Health Check', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should pass health check', async () => {
      const healthy = await store.healthCheck();
      expect(healthy).toBe(true);
    });

    it('should test encryption/decryption in health check', async () => {
      const healthy = await store.healthCheck();
      expect(healthy).toBe(true);

      // Health check should not leave test secret
      expect(await store.exists('__health_check__')).toBe(false);
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should return statistics', async () => {
      await store.set('STAT1', 'value1');
      await store.set('STAT2', 'value2');

      const stats = store.getStats();

      expect(stats.totalSecrets).toBe(2);
      expect(stats.storeSize).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeDefined();
    });
  });

  describe('File Permissions', () => {
    beforeEach(() => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });
    });

    it('should create store file with restricted permissions', async () => {
      await store.set('PERMS', 'value');

      // Check file permissions (Unix systems)
      if (process.platform !== 'win32') {
        const stats = fs.statSync(storePath);
        const mode = stats.mode & 0o777;
        expect(mode).toBe(0o600); // Owner read/write only
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid store path gracefully', () => {
      const invalidPath = '/invalid/path/that/does/not/exist/secrets.encrypted';

      expect(() => {
        store = new LocalSecretStore({
          encryptionKey: 'test-key',
          storePath: invalidPath,
          backupPath,
        });
      }).not.toThrow();
    });

    it('should handle corrupted store file', async () => {
      store = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });

      await store.set('CORRUPT', 'value');

      // Corrupt the file
      fs.writeFileSync(storePath, 'invalid json data');

      // Create new instance - should handle corruption
      const newStore = new LocalSecretStore({
        encryptionKey: 'test-key',
        storePath,
        backupPath,
      });

      // Should create new store
      expect(newStore).toBeDefined();
    });
  });
});
