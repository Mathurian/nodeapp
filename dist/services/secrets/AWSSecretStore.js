"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSSecretStore = void 0;
class AWSSecretStore {
    client;
    config;
    prefix;
    constructor(config) {
        this.config = {
            region: config?.region || 'us-east-1',
            accessKeyId: config?.accessKeyId,
            secretAccessKey: config?.secretAccessKey,
            prefix: config?.prefix || 'event-manager',
        };
        this.prefix = this.config.prefix || 'event-manager';
        try {
            const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');
            const clientConfig = {
                region: this.config.region,
            };
            if (this.config.accessKeyId && this.config.secretAccessKey) {
                clientConfig.credentials = {
                    accessKeyId: this.config.accessKeyId,
                    secretAccessKey: this.config.secretAccessKey,
                };
            }
            this.client = new SecretsManagerClient(clientConfig);
        }
        catch (error) {
            throw new Error('AWS SDK not installed. Run: npm install @aws-sdk/client-secrets-manager');
        }
    }
    getSecretName(key) {
        return `${this.prefix}/${key}`;
    }
    stripPrefix(secretName) {
        const prefix = `${this.prefix}/`;
        return secretName.startsWith(prefix) ? secretName.slice(prefix.length) : secretName;
    }
    async get(key) {
        try {
            const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new GetSecretValueCommand({
                SecretId: this.getSecretName(key),
            });
            const response = await this.client.send(command);
            if (response.SecretString) {
                try {
                    const parsed = JSON.parse(response.SecretString);
                    return parsed.value || parsed[key] || response.SecretString;
                }
                catch {
                    return response.SecretString;
                }
            }
            return null;
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                return null;
            }
            console.error(`Error getting secret "${key}" from AWS:`, error);
            throw error;
        }
    }
    async set(key, value, expiresAt) {
        try {
            const { CreateSecretCommand, UpdateSecretCommand, ResourceExistsException, } = require('@aws-sdk/client-secrets-manager');
            const secretName = this.getSecretName(key);
            const secretValue = JSON.stringify({
                value,
                metadata: {
                    key,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    version: 1,
                    expiresAt: expiresAt?.toISOString(),
                },
            });
            try {
                const createCommand = new CreateSecretCommand({
                    Name: secretName,
                    SecretString: secretValue,
                    Description: `Event Manager secret: ${key}`,
                });
                await this.client.send(createCommand);
            }
            catch (error) {
                if (error.name === 'ResourceExistsException') {
                    const updateCommand = new UpdateSecretCommand({
                        SecretId: secretName,
                        SecretString: secretValue,
                    });
                    await this.client.send(updateCommand);
                }
                else {
                    throw error;
                }
            }
        }
        catch (error) {
            console.error(`Error setting secret "${key}" in AWS:`, error);
            throw error;
        }
    }
    async delete(key) {
        try {
            const { DeleteSecretCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new DeleteSecretCommand({
                SecretId: this.getSecretName(key),
                ForceDeleteWithoutRecovery: false,
            });
            await this.client.send(command);
        }
        catch (error) {
            if (error.name !== 'ResourceNotFoundException') {
                console.error(`Error deleting secret "${key}" from AWS:`, error);
                throw error;
            }
        }
    }
    async list() {
        try {
            const { ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new ListSecretsCommand({
                Filters: [
                    {
                        Key: 'name',
                        Values: [`${this.prefix}/`],
                    },
                ],
            });
            const response = await this.client.send(command);
            if (response.SecretList) {
                return response.SecretList.map((secret) => this.stripPrefix(secret.Name)).filter((name) => name);
            }
            return [];
        }
        catch (error) {
            console.error('Error listing secrets from AWS:', error);
            return [];
        }
    }
    async exists(key) {
        try {
            const { DescribeSecretCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new DescribeSecretCommand({
                SecretId: this.getSecretName(key),
            });
            await this.client.send(command);
            return true;
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
                return false;
            }
            throw error;
        }
    }
    async getMetadata(key) {
        try {
            const { DescribeSecretCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new DescribeSecretCommand({
                SecretId: this.getSecretName(key),
            });
            const response = await this.client.send(command);
            const value = await this.get(key);
            if (value) {
                try {
                    const parsed = JSON.parse(value);
                    if (parsed.metadata) {
                        return {
                            ...parsed.metadata,
                            createdAt: new Date(parsed.metadata.createdAt),
                            updatedAt: new Date(parsed.metadata.updatedAt),
                            expiresAt: parsed.metadata.expiresAt
                                ? new Date(parsed.metadata.expiresAt)
                                : undefined,
                        };
                    }
                }
                catch {
                }
            }
            return {
                key,
                createdAt: response.CreatedDate || new Date(),
                updatedAt: response.LastChangedDate || new Date(),
                version: response.VersionIdsToStages ? Object.keys(response.VersionIdsToStages).length : 1,
            };
        }
        catch (error) {
            if (error.name === 'ResourceNotFoundException') {
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
        await this.set(key, newValue);
        const secretValue = JSON.stringify({
            value: newValue,
            metadata: {
                ...metadata,
                updatedAt: new Date().toISOString(),
                rotationDate: new Date().toISOString(),
                version: metadata.version + 1,
            },
        });
        const { UpdateSecretCommand } = require('@aws-sdk/client-secrets-manager');
        const command = new UpdateSecretCommand({
            SecretId: this.getSecretName(key),
            SecretString: secretValue,
        });
        await this.client.send(command);
    }
    async healthCheck() {
        try {
            const { ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new ListSecretsCommand({
                MaxResults: 1,
            });
            await this.client.send(command);
            return true;
        }
        catch (error) {
            console.error('AWS Secrets Manager health check failed:', error);
            return false;
        }
    }
    getClient() {
        return this.client;
    }
    async enableAutomaticRotation(key, rotationLambdaArn, rotationRules) {
        try {
            const { RotateSecretCommand } = require('@aws-sdk/client-secrets-manager');
            const command = new RotateSecretCommand({
                SecretId: this.getSecretName(key),
                RotationLambdaARN: rotationLambdaArn,
                RotationRules: {
                    AutomaticallyAfterDays: rotationRules.automaticallyAfterDays,
                },
            });
            await this.client.send(command);
        }
        catch (error) {
            console.error(`Error enabling rotation for secret "${key}":`, error);
            throw error;
        }
    }
}
exports.AWSSecretStore = AWSSecretStore;
//# sourceMappingURL=AWSSecretStore.js.map