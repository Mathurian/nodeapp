/**
 * Environment Variable Secret Store
 *
 * Provides backward compatibility with traditional .env files
 * This is the simplest provider and requires no additional setup
 */

import { ISecretProvider, SecretMetadata } from '../../types/secrets.types';
import * as fs from 'fs';
import * as path from 'path';

export class EnvSecretStore implements ISecretProvider {
  private envPath: string;
  private secrets: Map<string, string>;

  constructor(envPath?: string) {
    this.envPath = envPath || path.join(process.cwd(), '.env');
    this.secrets = new Map();
    this.loadFromEnv();
  }

  /**
   * Load secrets from process.env
   */
  private loadFromEnv(): void {
    for (const [key, value] of Object.entries(process.env)) {
      if (value) {
        this.secrets.set(key, value);
      }
    }
  }

  /**
   * Get a secret value
   */
  async get(key: string): Promise<string | null> {
    const value = this.secrets.get(key) || process.env[key];
    return value || null;
  }

  /**
   * Set a secret value
   * Note: This updates the in-memory map and appends to .env file
   * For production, use a more robust secret store
   */
  async set(key: string, value: string, _expiresAt?: Date): Promise<void> {
    // Update in-memory
    this.secrets.set(key, value);
    process.env[key] = value;

    // Append to .env file if it exists
    try {
      if (fs.existsSync(this.envPath)) {
        const content = `\n${key}=${value}\n`;
        fs.appendFileSync(this.envPath, content);
      }
    } catch (error) {
      console.warn(`Could not write to .env file: ${error}`);
    }
  }

  /**
   * Delete a secret
   * Note: This only removes from memory, not from .env file
   * Manual .env file editing is required
   */
  async delete(key: string): Promise<void> {
    this.secrets.delete(key);
    delete process.env[key];
  }

  /**
   * List all secret keys
   */
  async list(): Promise<string[]> {
    return Array.from(this.secrets.keys());
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    return this.secrets.has(key) || key in process.env;
  }

  /**
   * Get secret metadata
   * Note: Env provider doesn't support metadata
   */
  async getMetadata(key: string): Promise<SecretMetadata | null> {
    if (await this.exists(key)) {
      return {
        key,
        createdAt: new Date(),
        updatedAt: new Date(),
        version: 1,
      };
    }
    return null;
  }

  /**
   * Rotate a secret
   * Note: Env provider doesn't support versioning, just updates the value
   */
  async rotate(key: string, newValue: string): Promise<void> {
    await this.set(key, newValue);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    // Check if we can read from process.env
    return typeof process.env === 'object';
  }

  /**
   * Parse .env file and return key-value pairs
   */
  private parseEnvFile(): Map<string, string> {
    const envVars = new Map<string, string>();

    try {
      if (!fs.existsSync(this.envPath)) {
        return envVars;
      }

      const content = fs.readFileSync(this.envPath, 'utf-8');
      const lines = content.split('\n');

      for (const line of lines) {
        const trimmed = line.trim();

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) {
          continue;
        }

        // Parse KEY=VALUE format
        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (match && match[1] && match[2]) {
          const key = match[1].trim();
          let value = match[2].trim();

          // Remove quotes if present
          if (
            (value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))
          ) {
            value = value.slice(1, -1);
          }

          envVars.set(key, value);
        }
      }
    } catch (error) {
      console.error('Error parsing .env file:', error);
    }

    return envVars;
  }

  /**
   * Reload secrets from .env file
   */
  async reload(): Promise<void> {
    const fileVars = this.parseEnvFile();
    for (const [key, value] of fileVars.entries()) {
      this.secrets.set(key, value);
      process.env[key] = value;
    }
  }

  /**
   * Get warning messages about .env file usage
   */
  getWarnings(): string[] {
    const warnings: string[] = [];

    // Check if .env file exists
    if (!fs.existsSync(this.envPath)) {
      warnings.push(
        `Warning: .env file not found at ${this.envPath}. Secrets must be provided via environment variables.`
      );
    }

    // Check if .env is in version control (security risk)
    const gitignorePath = path.join(process.cwd(), '.gitignore');
    if (fs.existsSync(gitignorePath)) {
      const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
      if (!gitignore.includes('.env')) {
        warnings.push(
          'Security Warning: .env file is not in .gitignore. Add it to prevent committing secrets.'
        );
      }
    }

    return warnings;
  }
}
