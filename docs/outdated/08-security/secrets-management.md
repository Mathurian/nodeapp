# Secrets Management

Comprehensive secrets management system with multiple provider support for the Event Manager application.

## Table of Contents

- [Overview](#overview)
- [Quick Start](#quick-start)
- [Providers](#providers)
  - [Local Encrypted Store (Recommended)](#local-encrypted-store-recommended)
  - [Environment Variables (.env)](#environment-variables-env)
  - [AWS Secrets Manager (Optional)](#aws-secrets-manager-optional)
  - [HashiCorp Vault (Optional)](#hashicorp-vault-optional)
- [CLI Tool](#cli-tool)
- [Migration](#migration)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The Event Manager uses a flexible secrets management system that supports multiple backends:

1. **Local Encrypted Store** (Default) - Self-contained, AES-256 encrypted file
2. **Environment Variables** - Traditional .env file approach
3. **AWS Secrets Manager** - Optional AWS integration
4. **HashiCorp Vault** - Optional Vault integration

The system uses a **strategy pattern** that makes it easy to switch between providers without code changes.

## Quick Start

### Option 1: Local Encrypted Store (Recommended)

Initialize the local secret store:

```bash
npm run secrets -- init
```

This will:
- Generate a master encryption key
- Create `.env.secrets` configuration file
- Update `.gitignore` to exclude sensitive files
- Set up backup directory structure

Source the configuration:

```bash
source .env.secrets
```

Add your secrets:

```bash
npm run secrets -- set JWT_SECRET your-jwt-secret-here
npm run secrets -- set SESSION_SECRET your-session-secret-here
npm run secrets -- set CSRF_SECRET your-csrf-secret-here
npm run secrets -- set DATABASE_URL postgresql://user:pass@localhost:5432/db
```

Validate all required secrets:

```bash
npm run secrets -- validate
```

### Option 2: Continue Using .env Files

Keep using your existing `.env` file - no changes needed!

Set the provider to `env`:

```bash
export SECRETS_PROVIDER=env
```

Or add to your `.env` file:

```env
SECRETS_PROVIDER=env
```

## Providers

### Local Encrypted Store (Recommended)

**Pros:**
- ✅ Self-contained - no external dependencies
- ✅ Strong encryption (AES-256-GCM)
- ✅ Automatic backups
- ✅ Secret rotation support
- ✅ Metadata tracking (version, created/updated dates)

**Cons:**
- ⚠️ Requires careful master key management
- ⚠️ Not suitable for distributed deployments without shared storage

**Configuration:**

```env
SECRETS_PROVIDER=local
SECRETS_ENCRYPTION_KEY=<your-master-key>
SECRETS_STORE_PATH=./secrets.encrypted
SECRETS_BACKUP_PATH=./backups/secrets
SECRETS_AUTO_BACKUP=true
```

**Setup:**

```bash
# Initialize
npm run secrets -- init

# Add secrets
npm run secrets -- set KEY value

# List secrets
npm run secrets -- list

# Get a secret
npm run secrets -- get KEY

# Rotate a secret
npm run secrets -- rotate KEY new-value

# Check stats
npm run secrets -- stats
```

**Security Features:**

- **AES-256-GCM Encryption**: Military-grade encryption
- **PBKDF2 Key Derivation**: 100,000 iterations for brute-force resistance
- **Authentication Tags**: Integrity verification for each secret
- **Automatic Backups**: Last 10 versions kept automatically
- **Secure File Permissions**: 0600 (owner read/write only)

### Environment Variables (.env)

**Pros:**
- ✅ Simple and familiar
- ✅ No setup required
- ✅ Works with existing deployments
- ✅ Compatible with all hosting platforms

**Cons:**
- ⚠️ Secrets stored in plain text
- ⚠️ No rotation support
- ⚠️ No metadata tracking
- ⚠️ Easy to accidentally commit to version control

**Configuration:**

```env
SECRETS_PROVIDER=env
```

**Usage:**

Just use your `.env` file as usual. The application will automatically read from `process.env`.

**Security Tips:**

1. Add `.env` to `.gitignore`
2. Use `.env.example` for templates (without real values)
3. Restrict file permissions: `chmod 600 .env`
4. Never log secret values
5. Rotate secrets regularly

### AWS Secrets Manager (Optional)

**Pros:**
- ✅ Fully managed service
- ✅ Automatic rotation
- ✅ Fine-grained access control (IAM)
- ✅ Audit logging
- ✅ Multi-region replication

**Cons:**
- ⚠️ Requires AWS account
- ⚠️ Additional cost (~$0.40/secret/month + API calls)
- ⚠️ Internet connectivity required
- ⚠️ Vendor lock-in

**Installation:**

```bash
npm install @aws-sdk/client-secrets-manager
```

**Configuration:**

```env
SECRETS_PROVIDER=aws
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_SECRETS_PREFIX=event-manager
```

**IAM Policy Required:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:PutSecretValue",
        "secretsmanager:CreateSecret",
        "secretsmanager:UpdateSecret",
        "secretsmanager:DeleteSecret",
        "secretsmanager:ListSecrets",
        "secretsmanager:DescribeSecret"
      ],
      "Resource": "arn:aws:secretsmanager:*:*:secret:event-manager/*"
    }
  ]
}
```

**Usage:**

```bash
# CLI works the same
npm run secrets -- set JWT_SECRET value
npm run secrets -- get JWT_SECRET
npm run secrets -- list
```

### HashiCorp Vault (Optional)

**Pros:**
- ✅ Enterprise-grade secrets management
- ✅ Dynamic secrets
- ✅ Extensive audit logging
- ✅ Multiple authentication methods
- ✅ Can be self-hosted

**Cons:**
- ⚠️ Requires Vault server
- ⚠️ More complex setup
- ⚠️ Learning curve

**Installation:**

```bash
npm install node-vault
```

**Configuration:**

```env
SECRETS_PROVIDER=vault
VAULT_ADDR=http://localhost:8200
VAULT_TOKEN=<your-vault-token>
VAULT_PATH=secret
VAULT_KV_VERSION=v2
```

**Setup Vault:**

```bash
# Start Vault (development mode)
vault server -dev

# Set environment
export VAULT_ADDR='http://localhost:8200'
export VAULT_TOKEN='dev-token'

# Enable KV v2 secrets engine
vault secrets enable -path=secret kv-v2
```

**Usage:**

```bash
# CLI works the same
npm run secrets -- set JWT_SECRET value
npm run secrets -- get JWT_SECRET
```

## CLI Tool

The `secrets` CLI provides a unified interface for managing secrets across all providers.

### Commands

#### Initialize Local Store

```bash
npm run secrets -- init
```

Generates master key, creates configuration, updates .gitignore.

#### Get a Secret

```bash
npm run secrets -- get JWT_SECRET
```

#### Set a Secret

```bash
# Interactive (prompts for value)
npm run secrets -- set JWT_SECRET

# Non-interactive
npm run secrets -- set JWT_SECRET "my-secret-value"

# With expiration (days)
npm run secrets -- set TEMP_SECRET "value" 30
```

#### Delete a Secret

```bash
# With confirmation prompt
npm run secrets -- delete OLD_SECRET

# Skip confirmation
npm run secrets -- delete OLD_SECRET --force
```

#### List All Secrets

```bash
npm run secrets -- list
```

Shows all secret keys with metadata (version, last updated).

#### Check if Secret Exists

```bash
npm run secrets -- exists JWT_SECRET
```

#### Rotate a Secret

```bash
# Interactive
npm run secrets -- rotate JWT_SECRET

# Non-interactive
npm run secrets -- rotate JWT_SECRET "new-value"
```

#### Validate Secrets

```bash
npm run secrets -- validate
```

Checks that all required secrets are present and valid.

#### Export Secrets

```bash
npm run secrets -- export secrets-backup.json
```

**⚠️ Warning**: Exported file contains unencrypted secrets!

#### Import Secrets

```bash
npm run secrets -- import secrets-backup.json
```

#### Migration

```bash
# Migrate from .env to local encrypted store
npm run secrets -- migrate local

# Migrate to AWS Secrets Manager
npm run secrets -- migrate aws

# Migrate to Vault
npm run secrets -- migrate vault
```

#### Health Check

```bash
npm run secrets -- health
```

#### Statistics

```bash
npm run secrets -- stats
```

Shows secret count, store size, backups, rotation status.

## Migration

### Migrating from .env to Local Store

1. Initialize local store:
   ```bash
   npm run secrets -- init
   ```

2. Source the configuration:
   ```bash
   source .env.secrets
   ```

3. Migrate secrets:
   ```bash
   npm run secrets -- migrate local
   ```

4. Validate:
   ```bash
   npm run secrets -- validate
   ```

5. Test your application

6. Backup and remove old .env file

### Migrating Between Providers

The migration process is seamless:

```bash
# From env to AWS
export SECRETS_PROVIDER=env
npm run secrets -- migrate aws

# Update configuration
export SECRETS_PROVIDER=aws

# Validate
npm run secrets -- validate
```

## Security Best Practices

### 1. Master Key Management

- **Never commit the master key** to version control
- Store master key in a secure location:
  - Password manager (1Password, LastPass)
  - Hardware security module (HSM)
  - AWS Systems Manager Parameter Store
  - Kubernetes secrets (for containerized deployments)

### 2. File Permissions

```bash
# Secure secret files
chmod 600 .env.secrets
chmod 600 secrets.encrypted
chmod 600 .salt

# Secure backup directory
chmod 700 backups/secrets/
```

### 3. Rotation

Enable automatic rotation reminders:

```env
SECRETS_ROTATION_ENABLED=true
SECRETS_ROTATION_INTERVAL_DAYS=90
SECRETS_ROTATION_NOTIFY_DAYS=7
```

Rotate secrets regularly:

```bash
# Generate new values
npm run secrets -- rotate JWT_SECRET
npm run secrets -- rotate SESSION_SECRET
npm run secrets -- rotate CSRF_SECRET
```

### 4. Access Control

- Limit who can access secrets
- Use role-based access control (RBAC)
- Enable audit logging
- Monitor secret access

### 5. Backup

```bash
# Export encrypted backup
npm run secrets -- export backup-$(date +%Y%m%d).json

# Store backup securely
# - Encrypted cloud storage
# - Offline storage
# - Multiple locations
```

### 6. .gitignore

Always exclude sensitive files:

```gitignore
.env
.env.*
!.env.example
secrets.encrypted
.salt
backups/secrets/
```

### 7. Environment Separation

Use different secrets for each environment:

```bash
# Development
SECRETS_PROVIDER=local
SECRETS_STORE_PATH=./secrets.dev.encrypted

# Production
SECRETS_PROVIDER=aws
AWS_SECRETS_PREFIX=event-manager-prod
```

## Troubleshooting

### Issue: "Failed to decrypt secret"

**Cause**: Incorrect master encryption key

**Solution**:
1. Verify `SECRETS_ENCRYPTION_KEY` is set correctly
2. Check if you're using the same key that encrypted the secrets
3. Restore from backup if key is lost

### Issue: "AWS SDK not installed"

**Cause**: Missing AWS SDK package

**Solution**:
```bash
npm install @aws-sdk/client-secrets-manager
```

### Issue: "Vault health check failed"

**Cause**: Vault server not running or token invalid

**Solution**:
1. Check Vault server: `vault status`
2. Verify `VAULT_ADDR` is correct
3. Check token: `vault token lookup`
4. Ensure Vault is unsealed

### Issue: "Secret not found"

**Cause**: Secret doesn't exist in current provider

**Solution**:
1. List secrets: `npm run secrets -- list`
2. Check if using correct provider
3. Migrate from old provider if needed

### Issue: "Permission denied"

**Cause**: Incorrect file permissions

**Solution**:
```bash
chmod 600 secrets.encrypted
chmod 600 .env.secrets
chmod 700 backups/secrets/
```

### Issue: "Master key not set"

**Cause**: `SECRETS_ENCRYPTION_KEY` not in environment

**Solution**:
```bash
# Source the configuration
source .env.secrets

# Or set manually
export SECRETS_ENCRYPTION_KEY="your-key-here"
```

## Programmatic Usage

You can also use the SecretManager in your code:

```typescript
import { SecretManager } from './services/SecretManager';

// Initialize
const secretManager = new SecretManager();

// Get a secret
const jwtSecret = await secretManager.get('JWT_SECRET');

// Set a secret
await secretManager.set('API_KEY', 'new-value');

// Check if exists
const exists = await secretManager.exists('JWT_SECRET');

// Validate all required secrets
const validation = await secretManager.validate();
if (!validation.valid) {
  console.error('Missing secrets:', validation.missing);
}

// Health check
const healthy = await secretManager.healthCheck();
```

## Required Secrets

The application requires these secrets:

1. **JWT_SECRET** - JWT token signing key
2. **SESSION_SECRET** - Session encryption key
3. **CSRF_SECRET** - CSRF token encryption key
4. **DATABASE_URL** - Database connection string

Optional secrets:

- SMTP_* (email configuration)
- REDIS_PASSWORD (Redis authentication)
- AWS_* (AWS services)
- And more...

## Support

For issues or questions:

1. Check this documentation
2. Review error messages
3. Check logs: `logs/event-manager.log`
4. Run health check: `npm run secrets -- health`
5. Validate secrets: `npm run secrets -- validate`

## Changelog

### v1.0.0 (2025-11-12)

- Initial implementation
- Local encrypted store with AES-256
- Environment variable provider
- AWS Secrets Manager integration
- HashiCorp Vault integration
- CLI tool with full CRUD operations
- Migration support
- Comprehensive documentation
