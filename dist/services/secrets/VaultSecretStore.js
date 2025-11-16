"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VaultSecretStore = void 0;
class VaultSecretStore {
    vault;
    config;
    kvVersion;
    mountPath;
    constructor(config) {
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
            const nodeVault = require('node-vault');
            const vaultOptions = {
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
        }
        catch (error) {
            throw new Error('node-vault not installed. Run: npm install node-vault');
        }
    }
    getSecretPath(key) {
        if (this.kvVersion === 'v2') {
            return `${this.mountPath}/data/${key}`;
        }
        else {
            return `${this.mountPath}/${key}`;
        }
    }
    getMetadataPath(key) {
        return `${this.mountPath}/metadata/${key}`;
    }
    async get(key) {
        try {
            const response = await this.vault.read(this.getSecretPath(key));
            if (this.kvVersion === 'v2') {
                const data = response?.data?.data;
                return data?.value || data?.[key] || null;
            }
            else {
                const data = response?.data;
                return data?.value || data?.[key] || null;
            }
        }
        catch (error) {
            if (error.response?.statusCode === 404) {
                return null;
            }
            console.error(`Error getting secret "${key}" from Vault:`, error);
            throw error;
        }
    }
    async set(key, value, expiresAt) {
        try {
            const secretData = {
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
                await this.vault.write(this.getSecretPath(key), {
                    data: secretData,
                });
            }
            else {
                await this.vault.write(this.getSecretPath(key), secretData);
            }
        }
        catch (error) {
            console.error(`Error setting secret "${key}" in Vault:`, error);
            throw error;
        }
    }
    async delete(key) {
        try {
            if (this.kvVersion === 'v2') {
                await this.vault.delete(this.getSecretPath(key));
            }
            else {
                await this.vault.delete(this.getSecretPath(key));
            }
        }
        catch (error) {
            if (error.response?.statusCode !== 404) {
                console.error(`Error deleting secret "${key}" from Vault:`, error);
                throw error;
            }
        }
    }
    async list() {
        try {
            let listPath;
            if (this.kvVersion === 'v2') {
                listPath = `${this.mountPath}/metadata`;
            }
            else {
                listPath = this.mountPath;
            }
            const response = await this.vault.list(listPath);
            return response?.data?.keys || [];
        }
        catch (error) {
            if (error.response?.statusCode === 404) {
                return [];
            }
            console.error('Error listing secrets from Vault:', error);
            return [];
        }
    }
    async exists(key) {
        try {
            await this.vault.read(this.getSecretPath(key));
            return true;
        }
        catch (error) {
            if (error.response?.statusCode === 404) {
                return false;
            }
            throw error;
        }
    }
    async getMetadata(key) {
        try {
            if (this.kvVersion === 'v2') {
                const response = await this.vault.read(this.getMetadataPath(key));
                const vaultMetadata = response?.data;
                if (vaultMetadata) {
                    const secret = await this.vault.read(this.getSecretPath(key));
                    const customMetadata = secret?.data?.data?.metadata;
                    return {
                        key,
                        createdAt: customMetadata?.createdAt
                            ? new Date(customMetadata.createdAt)
                            : new Date(vaultMetadata.created_time),
                        updatedAt: customMetadata?.updatedAt
                            ? new Date(customMetadata.updatedAt)
                            : new Date(vaultMetadata.updated_time),
                        version: vaultMetadata.current_version || 1,
                        expiresAt: customMetadata?.expiresAt
                            ? new Date(customMetadata.expiresAt)
                            : undefined,
                        rotationDate: customMetadata?.rotationDate
                            ? new Date(customMetadata.rotationDate)
                            : undefined,
                    };
                }
            }
            else {
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
        }
        catch (error) {
            if (error.response?.statusCode === 404) {
                return null;
            }
            throw error;
        }
    }
    async rotate(key, newValue) {
        const metadata = await this.getMetadata(key);
        if (!metadata) {
            throw new Error(`Secret "${key}" not found`);
        }
        const secretData = {
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
        if (this.kvVersion === 'v2') {
            await this.vault.write(this.getSecretPath(key), {
                data: secretData,
            });
        }
        else {
            await this.vault.write(this.getSecretPath(key), secretData);
        }
    }
    async healthCheck() {
        try {
            const health = await this.vault.health();
            return health?.initialized && !health?.sealed;
        }
        catch (error) {
            console.error('Vault health check failed:', error);
            return false;
        }
    }
    getClient() {
        return this.vault;
    }
    async permanentlyDelete(key) {
        if (this.kvVersion === 'v2') {
            try {
                await this.vault.delete(this.getMetadataPath(key));
            }
            catch (error) {
                if (error.response?.statusCode !== 404) {
                    console.error(`Error permanently deleting secret "${key}":`, error);
                    throw error;
                }
            }
        }
        else {
            await this.delete(key);
        }
    }
    async undelete(key, versions) {
        if (this.kvVersion === 'v2') {
            try {
                const path = `${this.mountPath}/undelete/${key}`;
                await this.vault.write(path, {
                    versions: versions || [await this.getLatestVersion(key)],
                });
            }
            catch (error) {
                console.error(`Error undeleting secret "${key}":`, error);
                throw error;
            }
        }
        else {
            throw new Error('Undelete is only supported in KV v2');
        }
    }
    async getLatestVersion(key) {
        if (this.kvVersion === 'v2') {
            const metadata = await this.getMetadata(key);
            return metadata?.version || 1;
        }
        return 1;
    }
    async listVersions(key) {
        if (this.kvVersion === 'v2') {
            try {
                const response = await this.vault.read(this.getMetadataPath(key));
                const versions = response?.data?.versions;
                if (versions) {
                    return Object.keys(versions)
                        .map((v) => parseInt(v, 10))
                        .filter((v) => !isNaN(v));
                }
            }
            catch (error) {
                console.error(`Error listing versions for secret "${key}":`, error);
            }
        }
        return [];
    }
    async getVersion(key, version) {
        if (this.kvVersion === 'v2') {
            try {
                const path = this.getSecretPath(key) + `?version=${version}`;
                const response = await this.vault.read(path);
                const data = response?.data?.data;
                return data?.value || data?.[key] || null;
            }
            catch (error) {
                if (error.response?.statusCode === 404) {
                    return null;
                }
                throw error;
            }
        }
        else {
            throw new Error('Versioning is only supported in KV v2');
        }
    }
}
exports.VaultSecretStore = VaultSecretStore;
//# sourceMappingURL=VaultSecretStore.js.map