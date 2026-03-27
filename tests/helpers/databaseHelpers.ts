/**
 * Database Test Helpers
 * Comprehensive helpers for database setup, teardown, and seed data management
 */

import { PrismaClient, UserRole, ContestantNumberingMode, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

export const prismaTestClient = new PrismaClient();

const TEST_TENANT_SLUG = 'test-helpers-default';
const TEST_TENANT_NAME = 'Test Helpers Tenant';

const getOrCreateTestTenant = async () => {
  return prismaTestClient.tenant.upsert({
    where: { slug: TEST_TENANT_SLUG },
    update: {
      name: TEST_TENANT_NAME,
      isActive: true,
      planType: 'enterprise',
      subscriptionStatus: 'active',
    },
    create: {
      name: TEST_TENANT_NAME,
      slug: TEST_TENANT_SLUG,
      isActive: true,
      planType: 'enterprise',
      subscriptionStatus: 'active',
    },
  });
};

const buildUserUniqueWhere = (tenantId: string, email: string): Prisma.UserWhereUniqueInput => ({
  tenantId_email: {
    tenantId,
    email,
  },
});

const buildContestantUniqueWhere = (
  tenantId: string,
  email: string
): Prisma.ContestantWhereUniqueInput => ({
  tenantId_email: {
    tenantId,
    email,
  },
});

const createTenantScopedUser = async (
  tenantId: string,
  email: string,
  name: string,
  preferredName: string,
  role: UserRole,
  password: string
) => {
  return prismaTestClient.user.upsert({
    where: buildUserUniqueWhere(tenantId, email),
    update: {
      name,
      preferredName,
      password,
      role,
      isActive: true,
      sessionVersion: 1,
    },
    create: {
      email,
      name,
      preferredName,
      password,
      role,
      isActive: true,
      sessionVersion: 1,
      tenantId,
    },
  });
};

/**
 * Database setup - Clean slate before tests
 */
export const setupDatabase = async (): Promise<void> => {
  try {
    // Ensure test database connection
    await prismaTestClient.$connect();
  } catch (error) {
    console.error('Failed to connect to test database:', error);
    throw error;
  }
};

/**
 * Database teardown - Cleanup after tests
 */
export const teardownDatabase = async (): Promise<void> => {
  try {
    await prismaTestClient.$disconnect();
  } catch (error) {
    console.error('Failed to disconnect from test database:', error);
  }
};

/**
 * Clean all test data from database
 * WARNING: This deletes ALL data - only use in test environment!
 */
export const cleanAllTestData = async (): Promise<void> => {
  if (process.env.NODE_ENV !== 'test') {
    throw new Error('cleanAllTestData can only be called in test environment');
  }

  try {
    // Delete in correct order to respect foreign key constraints
    await prismaTestClient.auditLog.deleteMany();
    await prismaTestClient.activityLog.deleteMany();
    await prismaTestClient.score.deleteMany();
    await prismaTestClient.assignment.deleteMany();
    await prismaTestClient.certification.deleteMany();
    await prismaTestClient.categoryContestant.deleteMany();
    await prismaTestClient.categoryJudge.deleteMany();
    await prismaTestClient.contestContestant.deleteMany();
    await prismaTestClient.contestJudge.deleteMany();
    await prismaTestClient.category.deleteMany();
    await prismaTestClient.contest.deleteMany();
    await prismaTestClient.event.deleteMany();
    await prismaTestClient.emceeScript.deleteMany();
    await prismaTestClient.reportInstance.deleteMany();
    await prismaTestClient.systemSetting.deleteMany();
    await prismaTestClient.categoryTemplate.deleteMany();
    await prismaTestClient.contestant.deleteMany();
    await prismaTestClient.judge.deleteMany();
    await prismaTestClient.user.deleteMany();
    await prismaTestClient.tenant.deleteMany({
      where: {
        OR: [
          { slug: TEST_TENANT_SLUG },
          { slug: { startsWith: 'test-' } },
          { slug: { startsWith: 'e2e-' } },
        ],
      },
    });
  } catch (error) {
    console.error('Failed to clean test data:', error);
    throw error;
  }
};

/**
 * Seed minimal required data for tests
 */
export const seedMinimalData = async () => {
  const hashedPassword = await bcrypt.hash('TestPass123!', 10);
  const tenant = await getOrCreateTestTenant();

  // Create admin user
  const adminUser = await createTenantScopedUser(
    tenant.id,
    'admin@test.com',
    'testadmin',
    'Test Admin',
    UserRole.ADMIN,
    hashedPassword
  );

  // Create judge user
  const judgeUser = await createTenantScopedUser(
    tenant.id,
    'judge@test.com',
    'testjudge',
    'Test Judge',
    UserRole.JUDGE,
    hashedPassword
  );

  // Create contestant user
  const contestantUser = await createTenantScopedUser(
    tenant.id,
    'contestant@test.com',
    'testcontestant',
    'Test Contestant',
    UserRole.CONTESTANT,
    hashedPassword
  );

  return {
    tenant,
    adminUser,
    judgeUser,
    contestantUser,
  };
};

/**
 * Seed comprehensive test data
 */
export const seedComprehensiveData = async () => {
  const { tenant, ...users } = await seedMinimalData();

  // Create test event
  const event = await prismaTestClient.event.create({
    data: {
      name: 'Test Event',
      description: 'Test event for comprehensive testing',
      startDate: new Date('2024-06-01'),
      endDate: new Date('2024-06-03'),
      location: 'Test Venue',
      archived: false,
      maxContestants: 100,
      contestantNumberingMode: ContestantNumberingMode.MANUAL,
      tenantId: tenant.id,
    },
  });

  // Create test contest
  const contest = await prismaTestClient.contest.create({
    data: {
      name: 'Test Contest',
      eventId: event.id,
      description: 'Test contest',
      tenantId: tenant.id,
      contestantNumberingMode: ContestantNumberingMode.MANUAL,
      nextContestantNumber: 1,
    },
  });

  // Create test categories
  const category1 = await prismaTestClient.category.create({
    data: {
      name: 'Test Category 1',
      contestId: contest.id,
      scoreCap: 100,
      contestantMin: 0,
      tenantId: tenant.id,
    },
  });

  const category2 = await prismaTestClient.category.create({
    data: {
      name: 'Test Category 2',
      contestId: contest.id,
      scoreCap: 100,
      contestantMin: 0,
      tenantId: tenant.id,
    },
  });

  // Create judge
  const judge = await prismaTestClient.judge.create({
    data: {
      email: 'judge@test.com',
      name: 'Test Judge',
      tenantId: tenant.id,
    },
  });
  await prismaTestClient.user.update({
    where: { id: users.judgeUser.id },
    data: { judgeId: judge.id },
  });

  // Create contestant
  const contestant = await prismaTestClient.contestant.create({
    data: {
      email: 'contestant@test.com',
      name: 'Test Contestant',
      contestantNumber: 1,
      tenantId: tenant.id,
    },
  });
  await prismaTestClient.user.update({
    where: { id: users.contestantUser.id },
    data: { contestantId: contestant.id },
  });

  await prismaTestClient.categoryContestant.create({
    data: {
      categoryId: category1.id,
      contestantId: contestant.id,
      tenantId: tenant.id,
    },
  });

  // Create assignment
  const assignment = await prismaTestClient.assignment.create({
    data: {
      judgeId: judge.id,
      categoryId: category1.id,
      contestId: contest.id,
      eventId: event.id,
      assignedBy: users.adminUser.id,
      status: 'ACTIVE',
      tenantId: tenant.id,
    },
  });

  return {
    tenant,
    ...users,
    event,
    contest,
    categories: [category1, category2],
    judge,
    contestant,
    assignment,
  };
};

/**
 * Transaction wrapper for isolated test execution
 */
export const runInTransaction = async <T>(
  callback: (tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> => {
  return await prismaTestClient.$transaction(async (tx) => {
    return await callback(tx);
  });
};

/**
 * Create test snapshot - useful for reset between tests
 */
export const createDatabaseSnapshot = async () => {
  // Store current counts for verification
  const counts = {
    users: await prismaTestClient.user.count(),
    events: await prismaTestClient.event.count(),
    contests: await prismaTestClient.contest.count(),
    categories: await prismaTestClient.category.count(),
    judges: await prismaTestClient.judge.count(),
    contestants: await prismaTestClient.contestant.count(),
    scores: await prismaTestClient.score.count(),
    assignments: await prismaTestClient.assignment.count(),
  };

  return counts;
};

/**
 * Verify database is in clean state
 */
export const verifyCleanState = async () => {
  const counts = await createDatabaseSnapshot();
  const totalRecords = Object.values(counts).reduce((sum, count) => sum + count, 0);
  return totalRecords === 0;
};

/**
 * Get database statistics
 */
export const getDatabaseStats = async () => {
  return {
    users: await prismaTestClient.user.count(),
    activeUsers: await prismaTestClient.user.count({ where: { isActive: true } }),
    events: await prismaTestClient.event.count(),
    archivedEvents: await prismaTestClient.event.count({ where: { archived: true } }),
    contests: await prismaTestClient.contest.count(),
    categories: await prismaTestClient.category.count(),
    judges: await prismaTestClient.judge.count(),
    contestants: await prismaTestClient.contestant.count(),
    scores: await prismaTestClient.score.count(),
    assignments: await prismaTestClient.assignment.count(),
    auditLogs: await prismaTestClient.auditLog.count(),
  };
};
