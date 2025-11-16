#!/usr/bin/env ts-node

/**
 * Secrets Management CLI
 *
 * Command-line tool for managing application secrets
 *
 * Usage:
 *   npm run secrets -- <command> [options]
 *
 * Commands:
 *   get <key>                  Get a secret value
 *   set <key> <value>          Set a secret value
 *   delete <key>               Delete a secret
 *   list                       List all secret keys
 *   exists <key>               Check if a secret exists
 *   rotate <key> <newValue>    Rotate a secret
 *   validate                   Validate all required secrets
 *   migrate <provider>         Migrate secrets to another provider
 *   export <file>              Export secrets to a file
 *   import <file>              Import secrets from a file
 *   health                     Check secrets provider health
 *   stats                      Show secrets statistics
 *   init                       Initialize local secret store
 */

import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

import { SecretManager } from '../src/services/SecretManager';
import { LocalSecretStore } from '../src/services/secrets/LocalSecretStore';
import { EnvSecretStore } from '../src/services/secrets/EnvSecretStore';

/**
 * CLI colors for better output
 */
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Print colored message
 */
function print(message: string, color: keyof typeof colors = 'reset'): void {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

/**
 * Print error message
 */
function error(message: string): void {
  print(`Error: ${message}`, 'red');
  process.exit(1);
}

/**
 * Print success message
 */
function success(message: string): void {
  print(`✓ ${message}`, 'green');
}

/**
 * Print warning message
 */
function warning(message: string): void {
  print(`⚠ ${message}`, 'yellow');
}

/**
 * Print info message
 */
function info(message: string): void {
  print(message, 'cyan');
}

/**
 * Prompt for user input
 */
async function prompt(question: string, hideInput = false): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    if (hideInput) {
      // Hide input for sensitive data
      const stdin = process.stdin;
      (stdin as any).setRawMode(true);

      let input = '';
      process.stdout.write(question);

      stdin.on('data', (char) => {
        const c = char.toString('utf8');

        if (c === '\n' || c === '\r' || c === '\u0004') {
          stdin.pause();
          (stdin as any).setRawMode(false);
          process.stdout.write('\n');
          rl.close();
          resolve(input);
        } else if (c === '\u0003') {
          process.exit(0);
        } else if (c === '\u007f') {
          // Backspace
          if (input.length > 0) {
            input = input.slice(0, -1);
            process.stdout.write('\b \b');
          }
        } else {
          input += c;
          process.stdout.write('*');
        }
      });
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

/**
 * Confirm action
 */
async function confirm(question: string): Promise<boolean> {
  const answer = await prompt(`${question} (yes/no): `);
  return answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y';
}

/**
 * Initialize secret manager
 */
async function initSecretManager(): Promise<SecretManager> {
  try {
    return new SecretManager();
  } catch (err) {
    error(`Failed to initialize SecretManager: ${(err as Error).message}`);
    throw err;
  }
}

/**
 * Command: Get a secret
 */
async function cmdGet(key: string): Promise<void> {
  const manager = await initSecretManager();
  const value = await manager.get(key);

  if (value === null) {
    warning(`Secret "${key}" not found`);
    process.exit(1);
  }

  info(`Secret: ${key}`);
  console.log(value);
}

/**
 * Command: Set a secret
 */
async function cmdSet(key: string, value?: string, expiresInDays?: number): Promise<void> {
  const manager = await initSecretManager();

  // If value not provided, prompt for it
  if (!value) {
    value = await prompt(`Enter value for "${key}": `, true);
  }

  // Calculate expiration date if provided
  let expiresAt: Date | undefined;
  if (expiresInDays) {
    expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
  }

  await manager.set(key, value, expiresAt);
  success(`Secret "${key}" has been set`);

  if (expiresAt) {
    info(`Expires at: ${expiresAt.toISOString()}`);
  }
}

/**
 * Command: Delete a secret
 */
async function cmdDelete(key: string, force = false): Promise<void> {
  const manager = await initSecretManager();

  // Check if secret exists
  const exists = await manager.exists(key);
  if (!exists) {
    warning(`Secret "${key}" does not exist`);
    process.exit(1);
  }

  // Confirm deletion
  if (!force) {
    const confirmed = await confirm(`Delete secret "${key}"?`);
    if (!confirmed) {
      info('Cancelled');
      process.exit(0);
    }
  }

  await manager.delete(key);
  success(`Secret "${key}" has been deleted`);
}

/**
 * Command: List all secrets
 */
async function cmdList(): Promise<void> {
  const manager = await initSecretManager();
  const keys = await manager.list();

  if (keys.length === 0) {
    info('No secrets found');
    return;
  }

  info(`Found ${keys.length} secret(s):`);
  for (const key of keys) {
    const metadata = await manager.getMetadata(key);
    if (metadata) {
      console.log(`  ${key} (v${metadata.version}, updated: ${metadata.updatedAt.toISOString()})`);
    } else {
      console.log(`  ${key}`);
    }
  }
}

/**
 * Command: Check if secret exists
 */
async function cmdExists(key: string): Promise<void> {
  const manager = await initSecretManager();
  const exists = await manager.exists(key);

  if (exists) {
    success(`Secret "${key}" exists`);
    const metadata = await manager.getMetadata(key);
    if (metadata) {
      info(`Version: ${metadata.version}`);
      info(`Created: ${metadata.createdAt.toISOString()}`);
      info(`Updated: ${metadata.updatedAt.toISOString()}`);
      if (metadata.expiresAt) {
        info(`Expires: ${metadata.expiresAt.toISOString()}`);
      }
    }
  } else {
    warning(`Secret "${key}" does not exist`);
    process.exit(1);
  }
}

/**
 * Command: Rotate a secret
 */
async function cmdRotate(key: string, newValue?: string): Promise<void> {
  const manager = await initSecretManager();

  // Check if secret exists
  const exists = await manager.exists(key);
  if (!exists) {
    error(`Secret "${key}" does not exist`);
  }

  // If new value not provided, prompt for it
  if (!newValue) {
    newValue = await prompt(`Enter new value for "${key}": `, true);
  }

  await manager.rotate(key, newValue);
  success(`Secret "${key}" has been rotated`);
}

/**
 * Command: Validate required secrets
 */
async function cmdValidate(): Promise<void> {
  const manager = await initSecretManager();
  const result = await manager.validate();

  if (result.valid) {
    success('All required secrets are valid');
  } else {
    error('Secret validation failed');
  }

  if (result.missing.length > 0) {
    warning('Missing secrets:');
    result.missing.forEach((key) => console.log(`  - ${key}`));
  }

  if (result.expired.length > 0) {
    warning('Expired secrets:');
    result.expired.forEach((key) => console.log(`  - ${key}`));
  }

  if (result.requiresRotation.length > 0) {
    warning('Secrets requiring rotation:');
    result.requiresRotation.forEach((key) => console.log(`  - ${key}`));
  }

  if (!result.valid) {
    process.exit(1);
  }
}

/**
 * Command: Migrate secrets to another provider
 */
async function cmdMigrate(targetProvider: string): Promise<void> {
  const manager = await initSecretManager();

  info(`Migrating secrets to ${targetProvider}...`);

  // Create target provider
  let target;
  switch (targetProvider) {
    case 'local':
      target = new LocalSecretStore();
      break;
    case 'env':
      target = new EnvSecretStore();
      break;
    case 'aws':
      try {
        const { AWSSecretStore } = require('../src/services/secrets/AWSSecretStore');
        target = new AWSSecretStore();
      } catch (err) {
        error('AWS Secrets Manager not available');
      }
      break;
    case 'vault':
      try {
        const { VaultSecretStore } = require('../src/services/secrets/VaultSecretStore');
        target = new VaultSecretStore();
      } catch (err) {
        error('HashiCorp Vault not available');
      }
      break;
    default:
      error(`Unknown provider: ${targetProvider}`);
  }

  const result = await manager.migrate(target!);

  if (result.success) {
    success(`Migrated ${result.migrated.length}/${result.total} secrets`);
  } else {
    error(`Migration failed: ${result.failed.length} errors`);
  }

  if (result.failed.length > 0) {
    warning('Failed migrations:');
    result.failed.forEach(({ key, error }) => {
      console.log(`  - ${key}: ${error}`);
    });
  }
}

/**
 * Command: Export secrets
 */
async function cmdExport(file: string): Promise<void> {
  const manager = await initSecretManager();

  // Check if using LocalSecretStore
  if (manager.getProviderName() !== 'local') {
    warning('Export is only supported for local secret store');
    const proceed = await confirm('Export will create an unencrypted JSON file. Continue?');
    if (!proceed) {
      info('Cancelled');
      return;
    }
  }

  const keys = await manager.list();
  const secrets: Record<string, string> = {};

  for (const key of keys) {
    const value = await manager.get(key);
    if (value) {
      secrets[key] = value;
    }
  }

  fs.writeFileSync(file, JSON.stringify(secrets, null, 2), { mode: 0o600 });
  success(`Exported ${keys.length} secrets to ${file}`);
  warning('Warning: The exported file contains unencrypted secrets. Protect it carefully.');
}

/**
 * Command: Import secrets
 */
async function cmdImport(file: string): Promise<void> {
  if (!fs.existsSync(file)) {
    error(`File not found: ${file}`);
  }

  const manager = await initSecretManager();
  const content = fs.readFileSync(file, 'utf-8');
  const secrets = JSON.parse(content);

  let imported = 0;
  for (const [key, value] of Object.entries(secrets)) {
    await manager.set(key, value as string);
    imported++;
  }

  success(`Imported ${imported} secrets from ${file}`);
}

/**
 * Command: Health check
 */
async function cmdHealth(): Promise<void> {
  const manager = await initSecretManager();
  const healthy = await manager.healthCheck();

  if (healthy) {
    success(`Secrets provider (${manager.getProviderName()}) is healthy`);
  } else {
    error(`Secrets provider (${manager.getProviderName()}) health check failed`);
  }
}

/**
 * Command: Statistics
 */
async function cmdStats(): Promise<void> {
  const manager = await initSecretManager();

  info('Secrets Statistics:');
  info(`Provider: ${manager.getProviderName()}`);

  const keys = await manager.list();
  info(`Total secrets: ${keys.length}`);

  if (manager.getProviderName() === 'local') {
    // Get additional stats for local store
    try {
      const { LocalSecretStore } = require('../src/services/secrets/LocalSecretStore');
      const store = new LocalSecretStore();
      const stats = store.getStats();
      info(`Store size: ${(stats.storeSize / 1024).toFixed(2)} KB`);
      info(`Backups: ${stats.backupCount}`);
      info(`Last updated: ${stats.lastUpdated}`);
    } catch (err) {
      // Ignore if not local store
    }
  }

  const config = manager.getConfiguration();
  if (config.rotation?.enabled) {
    info(`Rotation: Enabled (every ${config.rotation.intervalDays} days)`);
  } else {
    info('Rotation: Disabled');
  }
}

/**
 * Command: Initialize local secret store
 */
async function cmdInit(): Promise<void> {
  info('Initializing local secret store...\n');

  // Generate master encryption key
  const masterKey = crypto.randomBytes(32).toString('base64');

  info('Generated master encryption key:');
  print(masterKey, 'yellow');
  console.log();

  // Save to .env.secrets
  const envPath = path.join(process.cwd(), '.env.secrets');
  const envContent = `# Secrets Management Configuration
SECRETS_PROVIDER=local
SECRETS_ENCRYPTION_KEY=${masterKey}
SECRETS_STORE_PATH=./secrets.encrypted
SECRETS_BACKUP_PATH=./backups/secrets
SECRETS_AUTO_BACKUP=true
SECRETS_ROTATION_ENABLED=false
SECRETS_ROTATION_INTERVAL_DAYS=90
`;

  fs.writeFileSync(envPath, envContent, { mode: 0o600 });
  success(`Configuration saved to ${envPath}`);

  // Update .gitignore
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  let gitignore = '';
  if (fs.existsSync(gitignorePath)) {
    gitignore = fs.readFileSync(gitignorePath, 'utf-8');
  }

  const entriesToAdd = [
    '.env.secrets',
    'secrets.encrypted',
    '.salt',
    'backups/secrets/',
  ];

  let updated = false;
  for (const entry of entriesToAdd) {
    if (!gitignore.includes(entry)) {
      gitignore += `\n${entry}`;
      updated = true;
    }
  }

  if (updated) {
    fs.writeFileSync(gitignorePath, gitignore);
    success('Updated .gitignore');
  }

  console.log();
  info('Setup complete! Next steps:');
  info('1. Source the environment file: source .env.secrets');
  info('2. Add secrets: npm run secrets -- set JWT_SECRET <value>');
  info('3. Validate secrets: npm run secrets -- validate');
  console.log();
  warning('IMPORTANT: Backup your master encryption key securely!');
}

/**
 * Main CLI entry point
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    print('Secrets Management CLI\n', 'cyan');
    console.log('Usage: npm run secrets -- <command> [options]\n');
    console.log('Commands:');
    console.log('  get <key>                  Get a secret value');
    console.log('  set <key> <value>          Set a secret value');
    console.log('  delete <key>               Delete a secret');
    console.log('  list                       List all secret keys');
    console.log('  exists <key>               Check if a secret exists');
    console.log('  rotate <key> <newValue>    Rotate a secret');
    console.log('  validate                   Validate all required secrets');
    console.log('  migrate <provider>         Migrate secrets to another provider');
    console.log('  export <file>              Export secrets to a file');
    console.log('  import <file>              Import secrets from a file');
    console.log('  health                     Check secrets provider health');
    console.log('  stats                      Show secrets statistics');
    console.log('  init                       Initialize local secret store');
    process.exit(0);
  }

  const command = args[0];

  try {
    switch (command) {
      case 'get':
        if (!args[1]) error('Missing argument: <key>');
        await cmdGet(args[1]);
        break;

      case 'set':
        if (!args[1]) error('Missing argument: <key>');
        await cmdSet(args[1], args[2], args[3] ? parseInt(args[3], 10) : undefined);
        break;

      case 'delete':
        if (!args[1]) error('Missing argument: <key>');
        await cmdDelete(args[1], args.includes('--force'));
        break;

      case 'list':
        await cmdList();
        break;

      case 'exists':
        if (!args[1]) error('Missing argument: <key>');
        await cmdExists(args[1]);
        break;

      case 'rotate':
        if (!args[1]) error('Missing argument: <key>');
        await cmdRotate(args[1], args[2]);
        break;

      case 'validate':
        await cmdValidate();
        break;

      case 'migrate':
        if (!args[1]) error('Missing argument: <provider>');
        await cmdMigrate(args[1]);
        break;

      case 'export':
        if (!args[1]) error('Missing argument: <file>');
        await cmdExport(args[1]);
        break;

      case 'import':
        if (!args[1]) error('Missing argument: <file>');
        await cmdImport(args[1]);
        break;

      case 'health':
        await cmdHealth();
        break;

      case 'stats':
        await cmdStats();
        break;

      case 'init':
        await cmdInit();
        break;

      default:
        error(`Unknown command: ${command}`);
    }
  } catch (err) {
    error((err as Error).message);
  }
}

// Run CLI
main();
