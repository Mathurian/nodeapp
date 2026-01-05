/**
 * Permission Migration Script
 * Phase 4: Dynamic CRUD Permissions System
 *
 * Migrates hardcoded permissions to the database
 * This script populates the role_permissions table from the hardcoded PERMISSIONS constant
 *
 * Usage:
 *   npx tsx scripts/migrate-permissions.ts --tenant <tenantId> [--userId <userId>]
 *   npx tsx scripts/migrate-permissions.ts --all [--userId <userId>]
 *
 * Examples:
 *   npx tsx scripts/migrate-permissions.ts --tenant tenant-123 --userId user-456
 *   npx tsx scripts/migrate-permissions.ts --all --userId admin-001
 */

import { PrismaClient, UserRole } from '@prisma/client';
import { PERMISSIONS } from '../src/middleware/permissions';

// Hardcoded permissions from middleware (reference copy)
const HARDCODED_PERMISSIONS = {
  SUPER_ADMIN: ["*"],
  ADMIN: ["*"],
  ORGANIZER: [
    "events:*", "contests:*", "categories:*", "users:*", "reports:*",
    "templates:*", "settings:*", "backup:*", "emcee:*", "category-types:*",
    "assignments:*", "results:*", "contestants:*", "criteria:*", "approvals:*",
    "tracker:*", "scores:read", "commentary:read", "profile:read"
  ],
  BOARD: [
    "events:*", "contests:*", "categories:*", "results:*", "reports:*", "approvals:*",
    "users:*", "settings:*", "emcee:*", "category-types:*",
    "assignments:*", "scores:read", "contestants:*", "criteria:*", "tracker:*",
    "commentary:read", "profile:read"
  ],
  JUDGE: [
    "scores:write", "scores:read", "results:read", "commentary:write",
    "events:read", "contests:read", "categories:read"
  ],
  CONTESTANT: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "commentary:read", "profile:read", "profile:write"
  ],
  EMCEE: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "announcements:write"
  ],
  TALLY_MASTER: [
    "scores:*", "results:*", "events:read", "contests:read", "categories:read",
    "reports:read", "tracker:*", "certifications:write"
  ],
  AUDITOR: [
    "events:read", "contests:read", "categories:read", "results:read",
    "scores:read", "reports:read", "activity-logs:read", "audit-logs:read", "tracker:*",
    "approvals:write", "certifications:write"
  ]
};

interface MigrationOptions {
  tenantId?: string;
  userId: string;
  migrateAll?: boolean;
  dryRun?: boolean;
}

interface MigrationResult {
  success: boolean;
  tenantId: string;
  permissionsCreated: number;
  permissionsSkipped: number;
  errors: string[];
  dryRun: boolean;
}

const prisma = new PrismaClient();

/**
 * Parse permission string into resource and operation
 * Examples:
 *   "*" => { resource: "*", operation: "*" }
 *   "events:*" => { resource: "events", operation: "*" }
 *   "scores:read" => { resource: "scores", operation: "read" }
 */
function parsePermission(permission: string): { resource: string; operation: string } {
  if (permission === "*") {
    return { resource: "*", operation: "*" };
  }

  const parts = permission.split(":");
  if (parts.length === 2) {
    return { resource: parts[0], operation: parts[1] };
  }

  // If no colon, treat as resource with wildcard operation
  return { resource: permission, operation: "*" };
}

/**
 * Migrate permissions for a single tenant
 */
async function migrateTenantPermissions(
  tenantId: string,
  userId: string,
  dryRun: boolean = false
): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    tenantId,
    permissionsCreated: 0,
    permissionsSkipped: 0,
    errors: [],
    dryRun
  };

  console.log(`\n${'='.repeat(80)}`);
  console.log(`Migrating permissions for tenant: ${tenantId}`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'='.repeat(80)}\n`);

  try {
    // Process each role
    for (const [roleName, permissions] of Object.entries(HARDCODED_PERMISSIONS)) {
      const role = roleName as UserRole;
      console.log(`\nProcessing role: ${role}`);
      console.log(`  Permissions: ${permissions.join(', ')}`);

      // Process each permission for this role
      for (const permission of permissions) {
        const { resource, operation } = parsePermission(permission);

        try {
          // Check if permission already exists
          const existing = await prisma.rolePermission.findUnique({
            where: {
              tenantId_role_resource_operation: {
                tenantId,
                role,
                resource,
                operation
              }
            }
          });

          if (existing) {
            console.log(`  ⏭️  Skipped: ${resource}:${operation} (already exists)`);
            result.permissionsSkipped++;
            continue;
          }

          if (!dryRun) {
            // Create permission in database
            await prisma.$transaction([
              // Create role permission
              prisma.rolePermission.create({
                data: {
                  role,
                  resource,
                  operation,
                  allowed: true,
                  tenantId,
                  createdBy: userId
                }
              }),
              // Create audit log
              prisma.permissionAuditLog.create({
                data: {
                  role,
                  resource,
                  operation,
                  previousVal: null,
                  newVal: true,
                  changedBy: userId,
                  tenantId,
                  reason: 'Migration from hardcoded permissions'
                }
              })
            ]);

            console.log(`  ✅ Created: ${resource}:${operation}`);
          } else {
            console.log(`  🔍 Would create: ${resource}:${operation}`);
          }

          result.permissionsCreated++;
        } catch (error) {
          const errorMsg = `Failed to create ${resource}:${operation} for ${role}: ${(error as Error).message}`;
          console.error(`  ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
          result.success = false;
        }
      }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`Migration Summary for ${tenantId}:`);
    console.log(`  ✅ Created: ${result.permissionsCreated}`);
    console.log(`  ⏭️  Skipped: ${result.permissionsSkipped}`);
    console.log(`  ❌ Errors: ${result.errors.length}`);
    console.log(`  Status: ${result.success ? 'SUCCESS' : 'FAILED'}`);
    console.log(`${'='.repeat(80)}\n`);
  } catch (error) {
    result.success = false;
    result.errors.push(`Migration failed: ${(error as Error).message}`);
    console.error(`\n❌ Migration failed: ${(error as Error).message}\n`);
  }

  return result;
}

/**
 * Migrate permissions for all tenants
 */
async function migrateAllTenants(
  userId: string,
  dryRun: boolean = false
): Promise<MigrationResult[]> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Migrating permissions for ALL tenants`);
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`);
  console.log(`${'='.repeat(80)}\n`);

  // Get all unique tenant IDs from the database
  const tenants = await prisma.user.findMany({
    select: { tenantId: true },
    distinct: ['tenantId']
  });

  if (tenants.length === 0) {
    console.log('⚠️  No tenants found in database');
    return [];
  }

  console.log(`Found ${tenants.length} tenant(s)\n`);

  const results: MigrationResult[] = [];

  for (const tenant of tenants) {
    const result = await migrateTenantPermissions(tenant.tenantId, userId, dryRun);
    results.push(result);
  }

  // Overall summary
  const totalCreated = results.reduce((sum, r) => sum + r.permissionsCreated, 0);
  const totalSkipped = results.reduce((sum, r) => sum + r.permissionsSkipped, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);
  const successCount = results.filter(r => r.success).length;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`OVERALL MIGRATION SUMMARY:`);
  console.log(`  Tenants processed: ${results.length}`);
  console.log(`  Successful: ${successCount}`);
  console.log(`  Failed: ${results.length - successCount}`);
  console.log(`  Total permissions created: ${totalCreated}`);
  console.log(`  Total permissions skipped: ${totalSkipped}`);
  console.log(`  Total errors: ${totalErrors}`);
  console.log(`${'='.repeat(80)}\n`);

  return results;
}

/**
 * Parse command line arguments
 */
function parseArgs(): MigrationOptions | null {
  const args = process.argv.slice(2);
  const options: MigrationOptions = {
    userId: 'system-migration',
    migrateAll: false,
    dryRun: false
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case '--tenant':
        if (i + 1 < args.length) {
          options.tenantId = args[++i];
        } else {
          console.error('❌ Error: --tenant requires a value');
          return null;
        }
        break;

      case '--userId':
      case '--user':
        if (i + 1 < args.length) {
          options.userId = args[++i];
        } else {
          console.error('❌ Error: --userId requires a value');
          return null;
        }
        break;

      case '--all':
        options.migrateAll = true;
        break;

      case '--dry-run':
      case '--dryrun':
        options.dryRun = true;
        break;

      case '--help':
      case '-h':
        printUsage();
        return null;

      default:
        console.error(`❌ Error: Unknown argument: ${arg}`);
        return null;
    }
  }

  // Validation
  if (!options.migrateAll && !options.tenantId) {
    console.error('❌ Error: Either --tenant or --all must be specified');
    printUsage();
    return null;
  }

  if (options.migrateAll && options.tenantId) {
    console.error('❌ Error: Cannot specify both --tenant and --all');
    printUsage();
    return null;
  }

  return options;
}

/**
 * Print usage information
 */
function printUsage() {
  console.log(`
Permission Migration Script
===========================

Migrates hardcoded permissions to the database.

Usage:
  npx tsx scripts/migrate-permissions.ts --tenant <tenantId> [--userId <userId>] [--dry-run]
  npx tsx scripts/migrate-permissions.ts --all [--userId <userId>] [--dry-run]

Options:
  --tenant <id>     Migrate permissions for a specific tenant
  --all             Migrate permissions for all tenants in the database
  --userId <id>     User ID to record as the creator (default: 'system-migration')
  --dry-run         Preview changes without modifying the database
  --help, -h        Show this help message

Examples:
  # Migrate for specific tenant (dry run)
  npx tsx scripts/migrate-permissions.ts --tenant tenant-123 --dry-run

  # Migrate for specific tenant (live)
  npx tsx scripts/migrate-permissions.ts --tenant tenant-123 --userId admin-001

  # Migrate for all tenants (dry run)
  npx tsx scripts/migrate-permissions.ts --all --dry-run

  # Migrate for all tenants (live)
  npx tsx scripts/migrate-permissions.ts --all --userId admin-001
  `);
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                     Permission Migration Script                           ║
║                  Phase 4: Dynamic CRUD Permissions System                 ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  const options = parseArgs();
  if (!options) {
    process.exit(1);
  }

  try {
    if (options.migrateAll) {
      await migrateAllTenants(options.userId, options.dryRun);
    } else if (options.tenantId) {
      await migrateTenantPermissions(options.tenantId, options.userId, options.dryRun);
    }

    console.log('✅ Migration completed successfully!\n');

    if (options.dryRun) {
      console.log('ℹ️  This was a DRY RUN. No changes were made to the database.');
      console.log('   Run without --dry-run to apply changes.\n');
    } else {
      console.log('💡 Next steps:');
      console.log('   1. Run validation script: npx tsx scripts/validate-permissions.ts');
      console.log('   2. Enable dynamic permissions: ENABLE_DYNAMIC_PERMISSIONS=true');
      console.log('   3. Monitor permission denials for any issues\n');
    }
  } catch (error) {
    console.error(`\n❌ Fatal error: ${(error as Error).message}\n`);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export {
  migrateTenantPermissions,
  migrateAllTenants,
  parsePermission,
  MigrationOptions,
  MigrationResult
};
