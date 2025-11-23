/**
 * AWS Secrets Manager Secret Store
 *
 * Optional integration with AWS Secrets Manager
 * Requires @aws-sdk/client-secrets-manager package
 *
 * Installation:
 *   npm install @aws-sdk/client-secrets-manager
 *
 * Configuration:
 *   SECRETS_PROVIDER=aws
 *   AWS_REGION=us-east-1
 *   AWS_ACCESS_KEY_ID=your-access-key
 *   AWS_SECRET_ACCESS_KEY=your-secret-key
 *   AWS_SECRETS_PREFIX=event-manager
 */

import { ISecretProvider, SecretMetadata, AWSSecretStoreConfig } from '../../types/secrets.types';

export class AWSSecretStore implements ISecretProvider {
  private client: any; // AWS SecretsManager client
  private config: AWSSecretStoreConfig;
  private prefix: string;

  constructor(config?: AWSSecretStoreConfig) {
    this.config = {
      region: config?.region || 'us-east-1',
      accessKeyId: config?.accessKeyId,
      secretAccessKey: config?.secretAccessKey,
      prefix: config?.prefix || 'event-manager',
    };

    this.prefix = this.config.prefix || 'event-manager';

    try {
      // Lazy load AWS SDK
      const { SecretsManagerClient } = require('@aws-sdk/client-secrets-manager');

      const clientConfig: any = {
        region: this.config.region,
      };

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      }

      this.client = new SecretsManagerClient(clientConfig);
    } catch (error) {
      throw new Error(
        'AWS SDK not installed. Run: npm install @aws-sdk/client-secrets-manager'
      );
    }
  }

  /**
   * Get full secret name with prefix
   */
  private getSecretName(key: string): string {
    return `${this.prefix}/${key}`;
  }

  /**
   * Strip prefix from secret name
   */
  private stripPrefix(secretName: string): string {
    const prefix = `${this.prefix}/`;
    return secretName.startsWith(prefix) ? secretName.slice(prefix.length) : secretName;
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | null> {
    try {
      const { GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

      const command = new GetSecretValueCommand({
        SecretId: this.getSecretName(key),
      });

      const response = await this.client.send(command);

      if (response.SecretString) {
        // Check if it's JSON (AWS Secrets Manager can store JSON)
        try {
          const parsed = JSON.parse(response.SecretString);
          return parsed.value || parsed[key] || response.SecretString;
        } catch {
          return response.SecretString;
        }
      }

      return null;
    } catch (error: unknown) {
      const errorObj = error as { name?: string };
      if (errorObj.name === 'ResourceNotFoundException') {
        return null;
      }
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`Error getting secret "${key}" from AWS:`, errorMessage);
      throw error;
    }
  }

  /**
   * Set a secret value
   */
  async set(key: string, value: string, expiresAt?: Date): Promise<void> {
    try {
      const {
        CreateSecretCommand,
        UpdateSecretCommand,
        // ResourceExistsException,
      } = require('@aws-sdk/client-secrets-manager');

      const secretName = this.getSecretName(key);

      // Store as JSON with metadata
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

      // Try to create first
      try {
        const createCommand = new CreateSecretCommand({
          Name: secretName,
          SecretString: secretValue,
          Description: `Event Manager secret: ${key}`,
        });

        await this.client.send(createCommand);
      } catch (error: unknown) {
        // If secret exists, update it
        const errorObj = error as { name?: string };
        if (errorObj.name === 'ResourceExistsException') {
          const updateCommand = new UpdateSecretCommand({
            SecretId: secretName,
            SecretString: secretValue,
          });

          await this.client.send(updateCommand);
        } else {
          throw error;
        }
      }
    } catch (error) {
      console.error(`Error setting secret "${key}" in AWS:`, error);
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  async delete(key: string): Promise<void> {
    try {
      const { DeleteSecretCommand } = require('@aws-sdk/client-secrets-manager');

      const command = new DeleteSecretCommand({
        SecretId: this.getSecretName(key),
        ForceDeleteWithoutRecovery: false, // Allow 30-day recovery window
      });

      await this.client.send(command);
    } catch (error: unknown) {
      const errorObj = error as { name?: string };
      if (errorObj.name !== 'ResourceNotFoundException') {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`Error deleting secret "${key}" from AWS:`, errorMessage);
        throw error;
      }
    }
  }

  /**
   * List all secret keys
   */
  async list(): Promise<string[]> {
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
        return response.SecretList.map((secret: any) =>
          this.stripPrefix(secret.Name)
        ).filter((name: string) => name); // Filter out empty names
      }

      return [];
    } catch (error) {
      console.error('Error listing secrets from AWS:', error);
      return [];
    }
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const { DescribeSecretCommand } = require('@aws-sdk/client-secrets-manager');

      const command = new DescribeSecretCommand({
        SecretId: this.getSecretName(key),
      });

      await this.client.send(command);
      return true;
    } catch (error: unknown) {
      const errorObj = error as { name?: string };
      if (errorObj.name === 'ResourceNotFoundException') {
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
      const { DescribeSecretCommand } = require('@aws-sdk/client-secrets-manager');

      const command = new DescribeSecretCommand({
        SecretId: this.getSecretName(key),
      });

      const response = await this.client.send(command);

      // Try to get metadata from secret value
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
        } catch {
          // Not JSON or no metadata
        }
      }

      // Fallback to AWS metadata
      return {
        key,
        createdAt: response.CreatedDate || new Date(),
        updatedAt: response.LastChangedDate || new Date(),
        version: response.VersionIdsToStages ? Object.keys(response.VersionIdsToStages).length : 1,
      };
    } catch (error: unknown) {
      const errorObj = error as { name?: string };
      if (errorObj.name === 'ResourceNotFoundException') {
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

    await this.set(key, newValue);

    // AWS handles versioning automatically
    // We just update the rotation date in metadata
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

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const { ListSecretsCommand } = require('@aws-sdk/client-secrets-manager');

      // Try to list secrets to verify connection
      const command = new ListSecretsCommand({
        MaxResults: 1,
      });

      await this.client.send(command);
      return true;
    } catch (error) {
      console.error('AWS Secrets Manager health check failed:', error);
      return false;
    }
  }

  /**
   * Get AWS Secrets Manager client for advanced operations
   */
  getClient(): any {
    return this.client;
  }

  /**
   * Enable automatic rotation for a secret
   */
  async enableAutomaticRotation(
    key: string,
    rotationLambdaArn: string,
    rotationRules: {
      automaticallyAfterDays: number;
    }
  ): Promise<void> {
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
    } catch (error) {
      console.error(`Error enabling rotation for secret "${key}":`, error);
      throw error;
    }
  }
}
