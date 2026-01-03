/**
 * Database Cleanup Script
 * Removes all data except default tenant and admin users
 *
 * Usage: npx ts-node scripts/cleanup-database.ts
 */

import { PrismaClient } from '@prisma/client';
import readline from 'readline';

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function cleanup() {
  console.log('🧹 Database Cleanup Script');
  console.log('=' .repeat(50));
  console.log('This will DELETE ALL DATA except:');
  console.log('  - Default tenant');
  console.log('  - SUPER_ADMIN and ADMIN users');
  console.log('=' .repeat(50));

  const confirm = await askQuestion('\nType "DELETE ALL DATA" to confirm: ');

  if (confirm !== 'DELETE ALL DATA') {
    console.log('❌ Cleanup cancelled');
    rl.close();
    process.exit(0);
  }

  console.log('\n🔍 Finding default tenant and admin users...');

  // Find default tenant (first active tenant or create one)
  let defaultTenant = await prisma.tenant.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: 'asc' },
  });

  if (!defaultTenant) {
    console.log('⚠️  No active tenant found, creating default tenant...');
    defaultTenant = await prisma.tenant.create({
      data: {
        name: 'Default Tenant',
        slug: 'default',
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active',
        scoringType: 'STRAIGHT',
      },
    });
    console.log(`✅ Created default tenant: ${defaultTenant.name} (${defaultTenant.id})`);
  } else {
    console.log(`✅ Found default tenant: ${defaultTenant.name} (${defaultTenant.id})`);
  }

  // Find admin users
  const adminUsers = await prisma.user.findMany({
    where: {
      tenantId: defaultTenant.id,
      role: { in: ['SUPER_ADMIN', 'ADMIN'] },
    },
  });

  console.log(`✅ Found ${adminUsers.length} admin user(s) to preserve`);
  adminUsers.forEach(user => {
    console.log(`   - ${user.email} (${user.role})`);
  });

  const adminUserIds = adminUsers.map(u => u.id);

  console.log('\n🗑️  Starting cleanup...\n');

  try {
    // Delete in correct order to respect foreign key constraints

    // 1. Scores and related data
    console.log('Deleting scores...');
    await prisma.score.deleteMany({});

    // 2. Assignments
    console.log('Deleting assignments...');
    await prisma.assignment.deleteMany({});

    // 3. Category relationships
    console.log('Deleting category-contestant relationships...');
    await prisma.categoryContestant.deleteMany({});

    console.log('Deleting category-judge relationships...');
    await prisma.categoryJudge.deleteMany({});

    // 4. Categories
    console.log('Deleting categories...');
    await prisma.category.deleteMany({});

    // 5. Contest relationships
    console.log('Deleting contest-contestant relationships...');
    await prisma.contestContestant.deleteMany({});

    console.log('Deleting contest-judge relationships...');
    await prisma.contestJudge.deleteMany({});

    // 6. Contests
    console.log('Deleting contests...');
    await prisma.contest.deleteMany({});

    // 7. Events
    console.log('Deleting events...');
    await prisma.event.deleteMany({});

    // 8. Contestants
    console.log('Deleting contestants...');
    await prisma.contestant.deleteMany({});

    // 9. Judges
    console.log('Deleting judges...');
    await prisma.judge.deleteMany({});

    // 10. Certifications
    console.log('Deleting certifications...');
    await prisma.certification.deleteMany({});

    // 11. Notifications
    console.log('Deleting notifications...');
    await prisma.notification.deleteMany({});

    // 12. Notification preferences
    console.log('Deleting notification preferences...');
    await prisma.notificationPreference.deleteMany({});

    // 13. Audit logs
    console.log('Deleting audit logs...');
    await prisma.auditLog.deleteMany({});

    // 14. Emcee scripts
    console.log('Deleting emcee scripts...');
    await prisma.emceeScript.deleteMany({});

    // 15. Criteria
    console.log('Deleting criteria...');
    await prisma.criterion.deleteMany({});

    // 16. Judge comments
    console.log('Deleting judge comments...');
    await prisma.judgeComment.deleteMany({});

    // 17. Judge certifications
    console.log('Deleting judge certifications...');
    await prisma.judgeCertification.deleteMany({});

    // 18. Overall deductions
    console.log('Deleting overall deductions...');
    await prisma.overallDeduction.deleteMany({});

    // 19. Activity logs
    console.log('Deleting activity logs...');
    await prisma.activityLog.deleteMany({});

    // 20. Judge score removal requests
    console.log('Deleting score removal requests...');
    await prisma.judgeScoreRemovalRequest.deleteMany({});

    // 21. Reports
    console.log('Deleting reports...');
    await prisma.report.deleteMany({});

    // 22. Archived events
    console.log('Deleting archived events...');
    await prisma.archivedEvent.deleteMany({});

    // 23. Category templates and template criteria
    console.log('Deleting template criteria...');
    await prisma.templateCriterion.deleteMany({});

    console.log('Deleting category templates...');
    await prisma.categoryTemplate.deleteMany({});

    // 24. Backup logs
    console.log('Deleting backup logs...');
    await prisma.backupLog.deleteMany({});

    // 25. Users (except admin users)
    console.log('Deleting non-admin users...');
    const deletedUsers = await prisma.user.deleteMany({
      where: {
        id: { notIn: adminUserIds },
      },
    });
    console.log(`   Deleted ${deletedUsers.count} user(s)`);

    // 19. Tenants (except default tenant)
    console.log('Deleting non-default tenants...');
    const deletedTenants = await prisma.tenant.deleteMany({
      where: {
        id: { not: defaultTenant.id },
      },
    });
    console.log(`   Deleted ${deletedTenants.count} tenant(s)`);

    console.log('\n✅ Cleanup complete!');
    console.log('\n📊 Remaining data:');
    console.log(`   Tenants: 1 (${defaultTenant.name})`);
    console.log(`   Users: ${adminUsers.length}`);

    // Show final counts
    const finalCounts = {
      events: await prisma.event.count(),
      contests: await prisma.contest.count(),
      categories: await prisma.category.count(),
      contestants: await prisma.contestant.count(),
      judges: await prisma.judge.count(),
      scores: await prisma.score.count(),
      users: await prisma.user.count(),
      tenants: await prisma.tenant.count(),
    };

    console.log('\n📈 Final database counts:');
    Object.entries(finalCounts).forEach(([table, count]) => {
      console.log(`   ${table}: ${count}`);
    });

  } catch (error) {
    console.error('\n❌ Error during cleanup:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
    rl.close();
  }
}

cleanup()
  .then(() => {
    console.log('\n✨ Database cleanup finished successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
