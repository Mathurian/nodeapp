/**
 * Database Test Helpers
 * Comprehensive helpers for database setup, teardown, and seed data management
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';

export const prismaTestClient = new PrismaClient();

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
    await prismaTestClient.score.deleteMany();
    await prismaTestClient.assignment.deleteMany();
    await prismaTestClient.certification.deleteMany();
    await prismaTestClient.category.deleteMany();
    await prismaTestClient.contest.deleteMany();
    await prismaTestClient.event.deleteMany();
    await prismaTestClient.emceeScript.deleteMany();
    await prismaTestClient.printReport.deleteMany();
    await prismaTestClient.setting.deleteMany();
    await prismaTestClient.categoryTemplate.deleteMany();
    await prismaTestClient.contestant.deleteMany();
    await prismaTestClient.judge.deleteMany();
    await prismaTestClient.user.deleteMany();
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

  // Create admin user
  const adminUser = await prismaTestClient.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      name: 'testadmin',
      preferredName: 'Test Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
      sessionVersion: 1,
    },
  });

  // Create judge user
  const judgeUser = await prismaTestClient.user.upsert({
    where: { email: 'judge@test.com' },
    update: {},
    create: {
      email: 'judge@test.com',
      name: 'testjudge',
      preferredName: 'Test Judge',
      password: hashedPassword,
      role: UserRole.JUDGE,
      isActive: true,
      sessionVersion: 1,
    },
  });

  // Create contestant user
  const contestantUser = await prismaTestClient.user.upsert({
    where: { email: 'contestant@test.com' },
    update: {},
    create: {
      email: 'contestant@test.com',
      name: 'testcontestant',
      preferredName: 'Test Contestant',
      password: hashedPassword,
      role: UserRole.CONTESTANT,
      isActive: true,
      sessionVersion: 1,
    },
  });

  return {
    adminUser,
    judgeUser,
    contestantUser,
  };
};

/**
 * Seed comprehensive test data
 */
export const seedComprehensiveData = async () => {
  const users = await seedMinimalData();

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
      contestantNumberingMode: 'MANUAL',
    },
  });

  // Create test contest
  const contest = await prismaTestClient.contest.create({
    data: {
      name: 'Test Contest',
      eventId: event.id,
      description: 'Test contest',
      date: new Date('2024-06-01'),
    },
  });

  // Create test categories
  const category1 = await prismaTestClient.category.create({
    data: {
      name: 'Test Category 1',
      contestId: contest.id,
      maxScore: 100,
      minScore: 0,
      scoreType: 'NUMERIC',
    },
  });

  const category2 = await prismaTestClient.category.create({
    data: {
      name: 'Test Category 2',
      contestId: contest.id,
      maxScore: 100,
      minScore: 0,
      scoreType: 'NUMERIC',
    },
  });

  // Create judge
  const judge = await prismaTestClient.judge.create({
    data: {
      email: 'judge@test.com',
      name: 'Test Judge',
      userId: users.judgeUser.id,
    },
  });

  // Create contestant
  const contestant = await prismaTestClient.contestant.create({
    data: {
      email: 'contestant@test.com',
      name: 'Test Contestant',
      userId: users.contestantUser.id,
      number: 1,
    },
  });

  // Create assignment
  const assignment = await prismaTestClient.assignment.create({
    data: {
      judgeId: judge.id,
      categoryId: category1.id,
    },
  });

  return {
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
  callback: (tx: any) => Promise<T>
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
