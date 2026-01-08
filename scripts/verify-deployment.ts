/**
 * Post-Deployment Verification Script
 * Phase 4: Dynamic CRUD Permissions System
 *
 * Verifies the deployment was successful and all systems are working
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                   Post-Deployment Verification                            ║
║                  Phase 4: Dynamic CRUD Permissions System                 ║
╚════════════════════════════════════════════════════════════════════════════╝
`);

  try {
    // 1. Check role_permissions table
    console.log('\n1️⃣  Checking role_permissions table...');
    const totalPermissions = await prisma.rolePermission.count();
    const permissionsByTenant = await prisma.rolePermission.groupBy({
      by: ['tenantId'],
      _count: true
    });

    console.log(`   ✅ Total permissions: ${totalPermissions}`);
    permissionsByTenant.forEach(t => {
      console.log(`   ✅ Tenant ${t.tenantId}: ${t._count} permissions`);
    });

    // 2. Check permission_audit_logs table
    console.log('\n2️⃣  Checking permission_audit_logs table...');
    const totalAuditLogs = await prisma.permissionAuditLog.count();
    const migrationLogs = await prisma.permissionAuditLog.count({
      where: { reason: 'Migration from hardcoded permissions' }
    });

    console.log(`   ✅ Total audit logs: ${totalAuditLogs}`);
    console.log(`   ✅ Migration audit logs: ${migrationLogs}`);

    // 3. Verify all roles have permissions
    console.log('\n3️⃣  Verifying all roles have permissions...');
    const permissionsByRole = await prisma.rolePermission.groupBy({
      by: ['role', 'tenantId'],
      _count: true
    });

    const roles = ['SUPER_ADMIN', 'ADMIN', 'ORGANIZER', 'BOARD', 'JUDGE', 'CONTESTANT', 'EMCEE', 'TALLY_MASTER', 'AUDITOR'];
    const tenants = await prisma.rolePermission.findMany({
      select: { tenantId: true },
      distinct: ['tenantId']
    });

    let allRolesHavePermissions = true;
    for (const tenant of tenants) {
      for (const role of roles) {
        const found = permissionsByRole.find(
          p => p.role === role && p.tenantId === tenant.tenantId
        );
        if (!found) {
          console.log(`   ❌ Missing permissions for ${role} in tenant ${tenant.tenantId}`);
          allRolesHavePermissions = false;
        } else {
          console.log(`   ✅ ${role} (tenant ${tenant.tenantId}): ${found._count} permissions`);
        }
      }
    }

    if (allRolesHavePermissions) {
      console.log(`   ✅ All roles have permissions`);
    }

    // 4. Sample permission check
    console.log('\n4️⃣  Sampling permission data...');
    const samplePermissions = await prisma.rolePermission.findMany({
      where: { role: 'JUDGE' },
      take: 5,
      select: {
        role: true,
        resource: true,
        operation: true,
        allowed: true,
        tenantId: true
      }
    });

    console.log('   Sample JUDGE permissions:');
    samplePermissions.forEach(p => {
      console.log(`   - ${p.resource}:${p.operation} = ${p.allowed ? 'ALLOWED' : 'DENIED'}`);
    });

    // 5. Check indexes
    console.log('\n5️⃣  Verifying database indexes...');
    const indexCheck = await prisma.$queryRaw`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE tablename IN ('role_permissions', 'permission_audit_logs')
      ORDER BY tablename, indexname;
    `;

    console.log(`   ✅ Found ${(indexCheck as any[]).length} indexes`);
    (indexCheck as any[]).forEach((idx: any) => {
      console.log(`   - ${idx.tablename}.${idx.indexname}`);
    });

    // 6. Summary
    console.log(`
╔════════════════════════════════════════════════════════════════════════════╗
║                         Verification Summary                              ║
╚════════════════════════════════════════════════════════════════════════════╝

✅ Total Permissions: ${totalPermissions}
✅ Total Audit Logs: ${totalAuditLogs}
✅ Migration Logs: ${migrationLogs}
✅ Tenants: ${tenants.length}
✅ Roles per tenant: ${roles.length}
✅ Expected total: ${tenants.length * roles.length * (totalPermissions / tenants.length / roles.length)} permissions per role (avg)

${totalPermissions === migrationLogs && totalPermissions > 0 ? '✅ DEPLOYMENT VERIFIED SUCCESSFULLY' : '⚠️  DEPLOYMENT VERIFICATION WARNINGS DETECTED'}
`);

    // Feature flag status
    const featureFlagEnabled = process.env.ENABLE_DYNAMIC_PERMISSIONS === 'true';
    console.log(`
📊 Current Configuration:
   - ENABLE_DYNAMIC_PERMISSIONS: ${featureFlagEnabled ? '✅ ENABLED' : '⚠️  DISABLED (using hardcoded fallback)'}
   - Mode: ${featureFlagEnabled ? 'Dynamic (database-driven)' : 'Hardcoded (fallback)'}
`);

    if (!featureFlagEnabled) {
      console.log(`
💡 To enable dynamic permissions:
   1. Add to .env: ENABLE_DYNAMIC_PERMISSIONS=true
   2. Restart application: pm2 restart event-manager
   3. Monitor cache hit rates and performance
`);
    }

  } catch (error) {
    console.error(`\n❌ Verification failed: ${(error as Error).message}`);
    console.error((error as Error).stack);
  } finally {
    await prisma.$disconnect();
  }
}

main();
