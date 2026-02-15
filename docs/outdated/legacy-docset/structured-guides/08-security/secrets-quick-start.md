# Secrets Management - Quick Start Guide

Get up and running with secure secrets management in under 5 minutes.

## Choose Your Path

### Path 1: Keep Using .env Files (No Changes Required)

Your existing `.env` file works as-is. Nothing to do!

The system automatically detects and uses environment variables.

### Path 2: Upgrade to Encrypted Local Store (Recommended)

**Step 1:** Initialize the secret store

```bash
npm run secrets -- init
```

This generates:
- Master encryption key
- `.env.secrets` configuration file
- Updates `.gitignore`

**Step 2:** Source the configuration

```bash
source .env.secrets
```

**Step 3:** Add your secrets

```bash
npm run secrets -- set JWT_SECRET "your-jwt-secret-here"
npm run secrets -- set SESSION_SECRET "your-session-secret-here"
npm run secrets -- set CSRF_SECRET "your-csrf-secret-here"
npm run secrets -- set DATABASE_URL "postgresql://user:pass@host/db"
```

**Step 4:** Validate

```bash
npm run secrets -- validate
```

You should see: `✓ All required secrets are valid`

**Step 5:** Start your application

```bash
npm run dev
```

**Done!** Your secrets are now encrypted with AES-256.

## Migrate from .env to Encrypted Store

Already using `.env`? Migrate in seconds:

```bash
# 1. Initialize new store
npm run secrets -- init

# 2. Source configuration
source .env.secrets

# 3. Migrate all secrets
npm run secrets -- migrate local

# 4. Validate
npm run secrets -- validate

# 5. Test your app
npm run dev

# 6. Backup and remove old .env (optional)
cp .env .env.backup
# rm .env  # Only after confirming everything works!
```

## Essential Commands

### View Secrets

```bash
# List all secrets
npm run secrets -- list

# Get a specific secret
npm run secrets -- get JWT_SECRET

# Check if exists
npm run secrets -- exists JWT_SECRET
```

### Manage Secrets

```bash
# Add/update a secret
npm run secrets -- set API_KEY "new-value"

# Delete a secret
npm run secrets -- delete OLD_SECRET

# Rotate a secret
npm run secrets -- rotate JWT_SECRET "new-value"
```

### Maintenance

```bash
# Check system health
npm run secrets -- health

# View statistics
npm run secrets -- stats

# Validate all required secrets
npm run secrets -- validate
```

### Backup & Restore

```bash
# Export backup
npm run secrets -- export backup.json

# Import from backup
npm run secrets -- import backup.json
```

## Required Secrets

Your application needs these secrets:

1. `JWT_SECRET` - JWT token signing key
2. `SESSION_SECRET` - Session encryption key
3. `CSRF_SECRET` - CSRF token encryption key
4. `DATABASE_URL` - Database connection string

## Security Tips

### 1. Protect Your Master Key

The master encryption key is in `.env.secrets`. **Never commit this file!**

```bash
# Verify .env.secrets is in .gitignore
cat .gitignore | grep .env.secrets
```

### 2. Backup Your Master Key

Store it securely:
- Password manager (1Password, LastPass, etc.)
- Cloud parameter store (AWS SSM, etc.)
- Hardware security module (HSM)

### 3. Rotate Secrets Regularly

```bash
# Rotate JWT secret every 90 days
npm run secrets -- rotate JWT_SECRET "$(openssl rand -base64 32)"
```

### 4. Validate on Startup

Add to your application startup:

```typescript
import { SecretManager } from './services/SecretManager';

async function startup() {
  const secretManager = new SecretManager();
  const validation = await secretManager.validate();

  if (!validation.valid) {
    console.error('Missing secrets:', validation.missing);
    process.exit(1);
  }

  // Continue startup...
}
```

## Troubleshooting

### "Secret not found"

Make sure you've set the secret:

```bash
npm run secrets -- list
npm run secrets -- set MISSING_SECRET "value"
```

### "Failed to decrypt"

Wrong encryption key. Make sure `SECRETS_ENCRYPTION_KEY` is set:

```bash
source .env.secrets
echo $SECRETS_ENCRYPTION_KEY
```

### "Master key not set"

Run init command:

```bash
npm run secrets -- init
source .env.secrets
```

### Permission Errors

Fix file permissions:

```bash
chmod 600 secrets.encrypted
chmod 600 .env.secrets
```

## Full Documentation

For complete documentation, see:
- [Secrets Management Guide](SECRETS_MANAGEMENT.md)
- [Implementation Report](../PHASE1_IMPLEMENTATION_REPORT.md)

## Support

Having issues? Run diagnostics:

```bash
npm run secrets -- health
npm run secrets -- validate
npm run secrets -- stats
```

Check logs:
```bash
tail -f logs/event-manager.log
```

---

**Need Help?** Check the [full documentation](SECRETS_MANAGEMENT.md) or [troubleshooting guide](SECRETS_MANAGEMENT.md#troubleshooting).
