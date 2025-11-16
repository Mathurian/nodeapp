"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalSecretStore = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class LocalSecretStore {
    config;
    encryptionKey;
    store;
    storePath;
    algorithm = 'aes-256-gcm';
    keyDerivationIterations = 100000;
    constructor(config) {
        this.config = {
            storePath: config?.storePath || path.join(process.cwd(), 'secrets.encrypted'),
            backupPath: config?.backupPath || path.join(process.cwd(), 'backups', 'secrets'),
            autoBackup: config?.autoBackup !== false,
            encryptionKey: config?.encryptionKey,
        };
        this.storePath = this.config.storePath;
        this.encryptionKey = this.deriveEncryptionKey();
        this.store = this.loadStore();
    }
    deriveEncryptionKey() {
        const masterKey = this.config.encryptionKey ||
            process.env.SECRETS_ENCRYPTION_KEY ||
            this.generateMasterKey();
        const salt = this.getOrCreateSalt();
        return crypto.pbkdf2Sync(masterKey, salt, this.keyDerivationIterations, 32, 'sha256');
    }
    getOrCreateSalt() {
        const saltPath = path.join(path.dirname(this.storePath), '.salt');
        try {
            if (fs.existsSync(saltPath)) {
                return fs.readFileSync(saltPath);
            }
            else {
                const salt = crypto.randomBytes(32);
                fs.mkdirSync(path.dirname(saltPath), { recursive: true });
                fs.writeFileSync(saltPath, salt, { mode: 0o600 });
                return salt;
            }
        }
        catch (error) {
            console.error('Error handling salt:', error);
            return crypto.createHash('sha256').update('fallback-salt').digest();
        }
    }
    generateMasterKey() {
        const key = crypto.randomBytes(32).toString('base64');
        console.warn('\n⚠️  WARNING: No encryption key provided. Generated a new master key.');
        console.warn('Save this key securely and set SECRETS_ENCRYPTION_KEY:\n');
        console.warn(`export SECRETS_ENCRYPTION_KEY="${key}"\n`);
        return key;
    }
    loadStore() {
        try {
            if (fs.existsSync(this.storePath)) {
                const encrypted = fs.readFileSync(this.storePath, 'utf-8');
                return JSON.parse(encrypted);
            }
        }
        catch (error) {
            console.error('Error loading secret store:', error);
        }
        return {
            version: 1,
            secrets: [],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    }
    async saveStore() {
        try {
            if (this.config.autoBackup && fs.existsSync(this.storePath)) {
                await this.createBackup();
            }
            this.store.updatedAt = new Date().toISOString();
            const dir = path.dirname(this.storePath);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            const content = JSON.stringify(this.store, null, 2);
            fs.writeFileSync(this.storePath, content, { mode: 0o600 });
        }
        catch (error) {
            console.error('Error saving secret store:', error);
            throw new Error('Failed to save secrets');
        }
    }
    async createBackup() {
        try {
            if (!this.config.backupPath)
                return;
            const backupDir = this.config.backupPath;
            if (!fs.existsSync(backupDir)) {
                fs.mkdirSync(backupDir, { recursive: true });
            }
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(backupDir, `secrets-${timestamp}.encrypted`);
            fs.copyFileSync(this.storePath, backupPath);
            await this.pruneOldBackups(10);
        }
        catch (error) {
            console.error('Error creating backup:', error);
        }
    }
    async pruneOldBackups(keep) {
        try {
            if (!this.config.backupPath)
                return;
            const files = fs
                .readdirSync(this.config.backupPath)
                .filter((f) => f.startsWith('secrets-') && f.endsWith('.encrypted'))
                .map((f) => ({
                name: f,
                path: path.join(this.config.backupPath, f),
                time: fs.statSync(path.join(this.config.backupPath, f)).mtime,
            }))
                .sort((a, b) => b.time.getTime() - a.time.getTime());
            for (let i = keep; i < files.length; i++) {
                fs.unlinkSync(files[i].path);
            }
        }
        catch (error) {
            console.error('Error pruning backups:', error);
        }
    }
    encrypt(value) {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
        let encrypted = cipher.update(value, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        const authTag = cipher.getAuthTag().toString('base64');
        return {
            encrypted,
            iv: iv.toString('base64'),
            authTag,
        };
    }
    decrypt(encrypted, iv, authTag) {
        const decipher = crypto.createDecipheriv(this.algorithm, this.encryptionKey, Buffer.from(iv, 'base64'));
        decipher.setAuthTag(Buffer.from(authTag, 'base64'));
        let decrypted = decipher.update(encrypted, 'base64', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    findSecret(key) {
        return this.store.secrets.find((s) => s.key === key);
    }
    async get(key) {
        const secret = this.findSecret(key);
        if (!secret)
            return null;
        try {
            return this.decrypt(secret.encryptedValue, secret.iv, secret.authTag);
        }
        catch (error) {
            console.error(`Error decrypting secret "${key}":`, error);
            return null;
        }
    }
    async set(key, value, expiresAt) {
        const { encrypted, iv, authTag } = this.encrypt(value);
        const existingSecret = this.findSecret(key);
        const now = new Date();
        if (existingSecret) {
            existingSecret.encryptedValue = encrypted;
            existingSecret.iv = iv;
            existingSecret.authTag = authTag;
            existingSecret.metadata.updatedAt = now;
            existingSecret.metadata.version += 1;
            if (expiresAt) {
                existingSecret.metadata.expiresAt = expiresAt;
            }
        }
        else {
            const newSecret = {
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
    async delete(key) {
        const index = this.store.secrets.findIndex((s) => s.key === key);
        if (index !== -1) {
            this.store.secrets.splice(index, 1);
            await this.saveStore();
        }
    }
    async list() {
        return this.store.secrets.map((s) => s.key);
    }
    async exists(key) {
        return this.findSecret(key) !== undefined;
    }
    async getMetadata(key) {
        const secret = this.findSecret(key);
        return secret ? { ...secret.metadata } : null;
    }
    async rotate(key, newValue) {
        const existing = this.findSecret(key);
        if (!existing) {
            throw new Error(`Secret "${key}" not found`);
        }
        await this.set(key, newValue);
        const secret = this.findSecret(key);
        if (secret) {
            secret.metadata.rotationDate = new Date();
            await this.saveStore();
        }
    }
    async healthCheck() {
        try {
            const testKey = '__health_check__';
            const testValue = 'test';
            await this.set(testKey, testValue);
            const retrieved = await this.get(testKey);
            await this.delete(testKey);
            return retrieved === testValue;
        }
        catch (error) {
            console.error('Health check failed:', error);
            return false;
        }
    }
    async export() {
        return JSON.stringify(this.store, null, 2);
    }
    async import(data) {
        try {
            const imported = JSON.parse(data);
            if (!imported.version || !Array.isArray(imported.secrets)) {
                throw new Error('Invalid secret store format');
            }
            if (this.config.autoBackup) {
                await this.createBackup();
            }
            this.store = imported;
            await this.saveStore();
        }
        catch (error) {
            console.error('Import failed:', error);
            throw new Error('Failed to import secrets');
        }
    }
    async reEncrypt(newKey) {
        const oldKey = this.encryptionKey;
        try {
            const decrypted = [];
            for (const secret of this.store.secrets) {
                try {
                    const value = this.decrypt(secret.encryptedValue, secret.iv, secret.authTag);
                    decrypted.push({
                        key: secret.key,
                        value,
                        metadata: secret.metadata,
                    });
                }
                catch (error) {
                    console.error(`Failed to decrypt secret "${secret.key}"`, error);
                    throw error;
                }
            }
            const salt = this.getOrCreateSalt();
            this.encryptionKey = crypto.pbkdf2Sync(newKey, salt, this.keyDerivationIterations, 32, 'sha256');
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
        }
        catch (error) {
            this.encryptionKey = oldKey;
            throw new Error('Re-encryption failed: ' + error.message);
        }
    }
    getStats() {
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
        }
        catch (error) {
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
exports.LocalSecretStore = LocalSecretStore;
//# sourceMappingURL=LocalSecretStore.js.map