/**
 * Permission Validation Script
 * Phase 4: Dynamic CRUD Permissions System
 *
 * Validates that dynamic permissions in the database match the hardcoded permissions
 * Useful for verifying migration success and detecting permission drift
 *
 * Usage:
 *   npx tsx scripts/validate-permissions.ts --tenant <tenantId>
 *   npx tsx scripts/validate-permissions.ts --all
 *
 * Examples:
 *   npx tsx scripts/validate-permissions.ts --tenant tenant-123
 *   npx tsx scripts/validate-permissions.ts --all
 *   npx tsx scripts/validate-permissions.ts --all --strict
 */

import { PrismaClient, UserRole } from '@prisma/client';

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

interface ValidationOptions {
  tenantId?: string;
  validateAll?: boolean;
  strict?: boolean;
}

interface RoleValidationResult {
  role: UserRole;
  valid: boolean;
  missingInDatabase: string[];
  extraInDatabase: string[];
  mismatchedAllowed: Array<{ permission: string; hardcoded: boolean; database: boolean }>;
}

interface ValidationResult {
  success: boolean;
  tenantId: string;
  roleResults: RoleValidationResult[];
  totalIssues: number;
  summary: {
    rolesValid: number;
    rolesInvalid: number;
    missingPermissions: number;
    extraPermissions: number;
    mismatchedPermissions: number;
  };
}

const prisma = new PrismaClient();

/**
 * Parse permission string into resource and operation
 */
function parsePermission(permission: string): { resource: string; operation: string } {
  if (permission === "*") {
    return { resource: "*", operation: "*" };
  }

  const parts = permission.split(":");
  if (parts.length === 2) {
    return { resource: parts[0], operation: parts[1] };
  }

  return { resource: permission, operation: "*" };
}

/**
 * Format permission from resource and operation
 */
function formatPermission(resource: string, operation: string): string {
  if (resource === "*" && operation === "*") {
    return "*";
  }
  return `${resource}:${operation}`;
}

/**
 * Normalize permissions array for comparison
 * Converts "*" to "*:*" for consistency
 */
function normalizePermissions(permissions: string[]): string[] {
  return permissions.map(p => {
    if (p === "*") {
      return "*:*";
    }
    return p;
  }).sort();
}

/**
 * Validate permissions for a single role
 */
async function validateRolePermissions(
  role: UserRole,
  tenantId: string
): Promise<RoleValidationResult> {
  const result: RoleValidationResult = {
    role,
    valid: true,
    missingInDatabase: [],
    extraInDatabase: [],
    mismatchedAllowed: []
  };

  // Get hardcoded permissions for this role
  const hardcodedPerms = HARDCODED_PERMISSIONS[role] || [];
  const normalizedHardcoded = normalizePermissions(hardcodedPerms);

  // Get database permissions for this role
  const dbPerms = await prisma.rolePermission.findMany({
    where: {
      role,
      tenantId
    },
    select: {
      resource: true,
      operation: true,
      allowed: true
    }
  });

  // Convert database permissions to string format
  const dbPermStrings = dbPerms.map(p => formatPermission(p.resource, p.operation));
  const normalizedDb = normalizePermissions(dbPermStrings);

  // Find missing permissions (in hardcoded but not in database)
  for (const perm of normalizedHardcoded) {
    if (!normalizedDb.includes(perm)) {
      result.missingInDatabase.push(perm);
      result.valid = false;
    }
  }

  // Find extra permissions (in database but not in hardcoded)
  for (const perm of normalizedDb) {
    if (!normalizedHardcoded.includes(perm)) {
      result.extraInDatabase.push(perm);
      result.valid = false;
    }
  }

  // Check for mismatched 'allowed' values (permission exists but allowed flag differs)
  for (const dbPerm of dbPerms) {
    const permString = formatPermission(dbPerm.resource, dbPerm.operation);
    const normalizedPerm = permString === "*" ? "*:*" : permString;

    // If permission exists in both but allowed is false in database
    if (normalizedHardcoded.includes(normalizedPerm) && !dbPerm.allowed) {
      result.mismatchedAllowed.push({
        permission: normalizedPerm,
        hardcoded: true,
        database: dbPerm.allowed
      });
      result.valid = false;
    }
  }

  return result;
}

/**
 * Validate permissions for a single tenant
 */
async function validateTenantPermissions(
  tenantId: string,
  strict: boolean = false
): Promise<ValidationResult> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Validating permissions for tenant: ${tenantId}`);
  console.log(`Mode: ${strict ? 'STRICT' : 'STANDARD'}`);
  console.log(`${'='.repeat(80)}\n`);

  const result: ValidationResult = {
    success: true,
    tenantId,
    roleResults: [],
    totalIssues: 0,
    summary: {
      rolesValid: 0,
      rolesInvalid: 0,
      missingPermissions: 0,
      extraPermissions: 0,
      mismatchedPermissions: 0
    }
  };

  // Validate each role
  const roles = Object.keys(HARDCODED_PERMISSIONS) as UserRole[];
  for (const role of roles) {
    console.log(`Validating role: ${role}`);

    const roleResult = await validateRolePermissions(role, tenantId);
    result.roleResults.push(roleResult);

    if (roleResult.valid) {
      console.log(`  ✅ Valid (matches hardcoded permissions)`);
      result.summary.rolesValid++;
    } else {
      console.log(`  ❌ Invalid (differences detected)`);
      result.summary.rolesInvalid++;
      result.success = false;

      if (roleResult.missingInDatabase.length > 0) {
        console.log(`    Missing in database (${roleResult.missingInDatabase.length}):`);
        roleResult.missingInDatabase.forEach(p => console.log(`      - ${p}`));
        result.summary.missingPermissions += roleResult.missingInDatabase.length;
      }

      if (roleResult.extraInDatabase.length > 0) {
        console.log(`    Extra in database (${roleResult.extraInDatabase.length}):`);
        roleResult.extraInDatabase.forEach(p => console.log(`      - ${p}`));
        result.summary.extraPermissions += roleResult.extraInDatabase.length;

        // In strict mode, extra permissions are errors
        if (strict) {
          result.success = false;
        }
      }

      if (roleResult.mismatchedAllowed.length > 0) {
        console.log(`    Mismatched 'allowed' values (${roleResult.mismatchedAllowed.length}):`);
        roleResult.mismatchedAllowed.forEach(m => {
          console.log(`      - ${m.permission}: hardcoded=${m.hardcoded}, database=${m.database}`);
        });
        result.summary.mismatchedPermissions += roleResult.mismatchedAllowed.length;
      }
    }
  }

  // Calculate total issues
  result.totalIssues =
    result.summary.missingPermissions +
    (strict ? result.summary.extraPermissions : 0) +
    result.summary.mismatchedPermissions;

  // Summary
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Validation Summary for ${tenantId}:`);
  console.log(`  ✅ Valid roles: ${result.summary.rolesValid}`);
  console.log(`  ❌ Invalid roles: ${result.summary.rolesInvalid}`);
  console.log(`  Missing permissions: ${result.summary.missingPermissions}`);
  console.log(`  Extra permissions: ${result.summary.extraPermissions}${strict ? ' (treated as errors)' : ' (warnings)'}`);
  console.log(`  Mismatched allowed flags: ${result.summary.mismatchedPermissions}`);
  console.log(`  Total issues: ${result.totalIssues}`);
  console.log(`  Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`);
  console.log(`${'='.repeat(80)}\n`);

  return result;
}

/**
 * Validate permissions for all tenants
 */
async function validateAllTenants(strict: boolean = false): Promise<ValidationResult[]> {
  console.log(`\n${'='.repeat(80)}`);
  console.log(`Validating permissions for ALL tenants`);
  console.log(`Mode: ${strict ? 'STRICT' : 'STANDARD'}`);
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

  const results: ValidationResult[] = [];

  for (const tenant of tenants) {
    const result = await validateTenantPermissions(tenant.tenantId, strict);
    results.push(result);
  }

  // Overall summary
  const totalRolesValid = results.reduce((sum, r) => sum + r.summary.rolesValid, 0);
  const totalRolesInvalid = results.reduce((sum, r) => sum + r.summary.rolesInvalid, 0);
  const totalMissing = results.reduce((sum, r) => sum + r.summary.missingPermissions, 0);
  const totalExtra = results.reduce((sum, r) => sum + r.summary.extraPermissions, 0);
  const totalMismatched = results.reduce((sum, r) => sum + r.summary.mismatchedPermissions, 0);
  const successCount = results.filter(r => r.success).length;

  console.log(`\n${'='.repeat(80)}`);
  console.log(`OVERALL VALIDATION SUMMARY:`);
  console.log(`  Tenants validated: ${results.length}`);
  console.log(`  Passed: ${successCount}`);
  console.log(`  Failed: ${results.length - successCount}`);
  console.log(`  Total valid roles: ${totalRolesValid}`);
  console.log(`  Total invalid roles: ${totalRolesInvalid}`);
  console.log(`  Total missing permissions: ${totalMissing}`);
  console.log(`  Total extra permissions: ${totalExtra}${strict ? ' (treated as errors)' : ' (warnings)'}`);
  console.log(`  Total mismatched allowed flags: ${totalMismatched}`);
  console.log(`${'='.repeat(80)}\n`);

  return results;
}

/**
 * Parse command line arguments
 */
function parseArgs(): ValidationOptions | null {
  const args = process.argv.slice(2);
  const options: ValidationOptions = {
    validateAll: false,
    strict: false
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

      case '--all':
        options.validateAll = true;
        break;

      case '--strict':
        options.strict = true;
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
  if (!options.validateAll && !options.tenantId) {
    console.error('❌ Error: Either --tenant or --all must be specified');
    printUsage();
    return null;
  }

  if (options.validateAll && options.tenantId) {
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
Permission Validation Script
============================

Validates that dynamic permissions in the database match the hardcoded permissions.

Usage:
  npx tsx scripts/validate-permissions.ts --tenant <tenantId> [--strict]
  npx tsx scripts/validate-permissions.ts --all [--strict]

Options:
  --tenant <id>     Validate permissions for a specific tenant
  --all             Validate permissions for all tenants in the database
  --strict          Treat extra permissions as errors (default: warnings only)
  --help, -h        Show this help message

Validation Checks:
  1. Missing permissions: Permissions in hardcoded but not in database
  2. Extra permissions: Permissions in database but not in hardcoded (warnings by default)
  3. Mismatched 'allowed' flags: Permission exists but 'allowed' is false in database

Standard Mode:
  - Missing permissions are errors
  - Extra permissions are warnings
  - Mismatched 'allowed' flags are errors

Strict Mode:
  - All of the above, plus extra permissions are treated as errors

Examples:
  # Validate specific tenant (standard mode)
  npx tsx scripts/validate-permissions.ts --tenant tenant-123

  # Validate specific tenant (strict mode)
  npx tsx scripts/validate-permissions.ts --tenant tenant-123 --strict

  # Validate all tenants (standard mode)
  npx tsx scripts/validate-permissions.ts --all

  # Validate all tenants (strict mode)
  npx tsx scripts/validate-permissions.ts --all --strict
  `);
}

/**
 * Main execution
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   Permission Validation Script                            ║
║                  Phase 4: Dynamic CRUD Permissions System                 ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  const options = parseArgs();
  if (!options) {
    process.exit(1);
  }

  try {
    let results: ValidationResult | ValidationResult[];

    if (options.validateAll) {
      results = await validateAllTenants(options.strict);
      const allPassed = Array.isArray(results) && results.every(r => r.success);

      if (allPassed) {
        console.log('✅ Validation PASSED for all tenants!\n');
        process.exit(0);
      } else {
        console.log('❌ Validation FAILED for one or more tenants.\n');
        console.log('💡 To fix issues:');
        console.log('   1. Run migration script: npx tsx scripts/migrate-permissions.ts');
        console.log('   2. Or manually fix permissions using the Permission Management UI\n');
        process.exit(1);
      }
    } else if (options.tenantId) {
      const result = await validateTenantPermissions(options.tenantId, options.strict);

      if (result.success) {
        console.log('✅ Validation PASSED!\n');
        process.exit(0);
      } else {
        console.log('❌ Validation FAILED.\n');
        console.log('💡 To fix issues:');
        console.log(`   npx tsx scripts/migrate-permissions.ts --tenant ${options.tenantId}\n`);
        process.exit(1);
      }
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
  validateTenantPermissions,
  validateAllTenants,
  validateRolePermissions,
  parsePermission,
  formatPermission,
  normalizePermissions,
  ValidationOptions,
  ValidationResult,
  RoleValidationResult
};
