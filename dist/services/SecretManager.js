"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var SecretManager_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecretManager = void 0;
const tsyringe_1 = require("tsyringe");
const LocalSecretStore_1 = require("./secrets/LocalSecretStore");
const EnvSecretStore_1 = require("./secrets/EnvSecretStore");
let SecretManager = class SecretManager {
    static { SecretManager_1 = this; }
    static instance = null;
    provider;
    config;
    requiredSecrets = [
        'JWT_SECRET',
        'SESSION_SECRET',
        'CSRF_SECRET',
        'DATABASE_URL',
    ];
    constructor() {
        this.config = this.loadConfiguration();
        this.provider = this.initializeProvider();
    }
    static getInstance() {
        if (!SecretManager_1.instance) {
            SecretManager_1.instance = new SecretManager_1();
        }
        return SecretManager_1.instance;
    }
    loadConfiguration() {
        const provider = (process.env.SECRETS_PROVIDER || 'env');
        const config = {
            provider,
            rotation: {
                enabled: process.env.SECRETS_ROTATION_ENABLED === 'true',
                intervalDays: parseInt(process.env.SECRETS_ROTATION_INTERVAL_DAYS || '90', 10),
                notifyBeforeDays: parseInt(process.env.SECRETS_ROTATION_NOTIFY_DAYS || '7', 10),
            },
        };
        switch (provider) {
            case 'local':
                config.local = {
                    encryptionKey: process.env.SECRETS_ENCRYPTION_KEY,
                    storePath: process.env.SECRETS_STORE_PATH || './secrets.encrypted',
                    backupPath: process.env.SECRETS_BACKUP_PATH || './backups/secrets',
                    autoBackup: process.env.SECRETS_AUTO_BACKUP !== 'false',
                };
                break;
            case 'aws':
                config.aws = {
                    region: process.env.AWS_REGION || 'us-east-1',
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
                    prefix: process.env.AWS_SECRETS_PREFIX || 'event-manager',
                };
                break;
            case 'vault':
                config.vault = {
                    address: process.env.VAULT_ADDR || 'http://localhost:8200',
                    token: process.env.VAULT_TOKEN,
                    namespace: process.env.VAULT_NAMESPACE,
                    path: process.env.VAULT_PATH || 'secret',
                    version: (process.env.VAULT_KV_VERSION || 'v2'),
                };
                break;
            case 'env':
            default:
                break;
        }
        return config;
    }
    initializeProvider() {
        switch (this.config.provider) {
            case 'local':
                return new LocalSecretStore_1.LocalSecretStore(this.config.local);
            case 'env':
                return new EnvSecretStore_1.EnvSecretStore();
            case 'aws':
                try {
                    const { AWSSecretStore } = require('./secrets/AWSSecretStore');
                    return new AWSSecretStore(this.config.aws);
                }
                catch (error) {
                    console.warn('AWS Secrets Manager not available, falling back to env');
                    return new EnvSecretStore_1.EnvSecretStore();
                }
            case 'vault':
                try {
                    const { VaultSecretStore } = require('./secrets/VaultSecretStore');
                    return new VaultSecretStore(this.config.vault);
                }
                catch (error) {
                    console.warn('HashiCorp Vault not available, falling back to env');
                    return new EnvSecretStore_1.EnvSecretStore();
                }
            default:
                console.warn(`Unknown secrets provider: ${this.config.provider}, using env`);
                return new EnvSecretStore_1.EnvSecretStore();
        }
    }
    async get(key) {
        try {
            return await this.provider.get(key);
        }
        catch (error) {
            console.error(`Error getting secret "${key}":`, error);
            return null;
        }
    }
    async getOrThrow(key) {
        const value = await this.get(key);
        if (value === null) {
            throw new Error(`Required secret "${key}" not found`);
        }
        return value;
    }
    async set(key, value, expiresAt) {
        try {
            await this.provider.set(key, value, expiresAt);
        }
        catch (error) {
            console.error(`Error setting secret "${key}":`, error);
            throw error;
        }
    }
    async delete(key) {
        try {
            await this.provider.delete(key);
        }
        catch (error) {
            console.error(`Error deleting secret "${key}":`, error);
            throw error;
        }
    }
    async list() {
        try {
            return await this.provider.list();
        }
        catch (error) {
            console.error('Error listing secrets:', error);
            return [];
        }
    }
    async exists(key) {
        try {
            return await this.provider.exists(key);
        }
        catch (error) {
            console.error(`Error checking secret "${key}":`, error);
            return false;
        }
    }
    async getMetadata(key) {
        try {
            return await this.provider.getMetadata(key);
        }
        catch (error) {
            console.error(`Error getting metadata for secret "${key}":`, error);
            return null;
        }
    }
    async rotate(key, newValue) {
        try {
            await this.provider.rotate(key, newValue);
        }
        catch (error) {
            console.error(`Error rotating secret "${key}":`, error);
            throw error;
        }
    }
    async validate() {
        const result = {
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
                if (metadata.expiresAt && new Date() > metadata.expiresAt) {
                    result.expired.push(key);
                    result.valid = false;
                }
                if (this.config.rotation?.enabled && metadata.rotationDate) {
                    const rotationIntervalMs = this.config.rotation.intervalDays * 24 * 60 * 60 * 1000;
                    const nextRotation = new Date(metadata.rotationDate.getTime() + rotationIntervalMs);
                    if (new Date() > nextRotation) {
                        result.requiresRotation.push(key);
                    }
                }
            }
        }
        return result;
    }
    async migrate(targetProvider, secretKeys) {
        const result = {
            success: true,
            migrated: [],
            failed: [],
            total: 0,
        };
        try {
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
                }
                catch (error) {
                    result.failed.push({
                        key,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    });
                    result.success = false;
                }
            }
        }
        catch (error) {
            result.success = false;
            console.error('Migration failed:', error);
        }
        return result;
    }
    async healthCheck() {
        try {
            return await this.provider.healthCheck();
        }
        catch (error) {
            console.error('Secret provider health check failed:', error);
            return false;
        }
    }
    getProviderName() {
        return this.config.provider;
    }
    getConfiguration() {
        return { ...this.config };
    }
    setRequiredSecrets(secrets) {
        this.requiredSecrets = secrets;
    }
    getRequiredSecrets() {
        return [...this.requiredSecrets];
    }
};
exports.SecretManager = SecretManager;
exports.SecretManager = SecretManager = SecretManager_1 = __decorate([
    (0, tsyringe_1.injectable)(),
    __metadata("design:paramtypes", [])
], SecretManager);
//# sourceMappingURL=SecretManager.js.map