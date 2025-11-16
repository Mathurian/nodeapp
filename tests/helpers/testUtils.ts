/**
 * Test Utilities for Integration Tests
 * Provides common helpers for authentication, database operations, and assertions
 */

import { PrismaClient, UserRole } from '@prisma/client';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

export const prisma = new PrismaClient();

/**
 * Generate a valid JWT token for testing
 */
export const generateAuthToken = (userId: string, role: UserRole = UserRole.ADMIN): string => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  return jwt.sign(
    {
      userId,
      role,
      sessionVersion: 1,
    },
    secret,
    { expiresIn: '24h' }
  );
};

/**
 * Create a test user in the database
 */
export const createTestUser = async (
  overrides: {
    email?: string;
    name?: string;
    role?: UserRole;
    password?: string;
    isActive?: boolean;
  } = {}
) => {
  const timestamp = Date.now();
  const hashedPassword = await bcrypt.hash(overrides.password || 'TestPass123!', 10);

  return prisma.user.create({
    data: {
      email: overrides.email || `test-${timestamp}@example.com`,
      name: overrides.name || `test-user-${timestamp}`,
      password: hashedPassword,
      role: overrides.role || UserRole.CONTESTANT,
      isActive: overrides.isActive !== undefined ? overrides.isActive : true,
      sessionVersion: 1,
    },
  });
};

/**
 * Create a test event
 */
export const createTestEvent = async (overrides: any = {}) => {
  const timestamp = Date.now();
  const startDate = overrides.startDate || new Date();
  const endDate = overrides.endDate || new Date(Date.now() + 86400000); // 1 day later
  
  return prisma.event.create({
    data: {
      name: overrides.name || `Test Event ${timestamp}`,
      description: overrides.description || 'Test event description',
      startDate: startDate,
      endDate: endDate,
      location: overrides.location || 'Test Location',
      archived: overrides.archived !== undefined ? overrides.archived : false,
      maxContestants: overrides.maxContestants || null,
      contestantNumberingMode: overrides.contestantNumberingMode || 'MANUAL',
      ...overrides,
    },
  });
};

/**
 * Create a test contest
 */
export const createTestContest = async (eventId: string, overrides: any = {}) => {
  const timestamp = Date.now();
  return prisma.contest.create({
    data: {
      name: overrides.name || `Test Contest ${timestamp}`,
      eventId,
      description: overrides.description || 'Test contest description',
      date: overrides.date || new Date(),
      ...overrides,
    },
  });
};

/**
 * Create a test category
 */
export const createTestCategory = async (contestId: string, overrides: any = {}) => {
  const timestamp = Date.now();
  return prisma.category.create({
    data: {
      name: overrides.name || `Test Category ${timestamp}`,
      contestId,
      ...overrides,
    },
  });
};

/**
 * Clean up test data by prefix
 */
export const cleanupTestData = async (prefix = 'test-') => {
  // Delete in correct order to respect foreign key constraints
  
  // Delete scores first (they reference categories, judges, contestants)
  await prisma.score.deleteMany({
    where: {
      OR: [
        { category: { name: { contains: prefix } } },
        { judge: { email: { contains: prefix } } },
        { contestant: { email: { contains: prefix } } },
      ],
    },
  });

  // Delete assignments (they reference judges and categories)
  await prisma.assignment.deleteMany({
    where: {
      OR: [
        { judge: { email: { contains: prefix } } },
        { category: { name: { contains: prefix } } },
      ],
    },
  });

  // Delete categories
  await prisma.category.deleteMany({
    where: {
      name: { contains: prefix },
    },
  });

  // Delete contests
  await prisma.contest.deleteMany({
    where: {
      name: { contains: prefix },
    },
  });

  // Delete events
  await prisma.event.deleteMany({
    where: {
      name: { contains: prefix },
    },
  });

  // Delete users (this will cascade to judges/contestants if they're linked)
  await prisma.user.deleteMany({
    where: {
      OR: [
        { email: { contains: prefix } },
        { name: { contains: prefix } },
      ],
    },
  });

  // Delete judges and contestants that might not be linked to users
  await prisma.judge.deleteMany({
    where: {
      email: { contains: prefix },
    },
  });

  await prisma.contestant.deleteMany({
    where: {
      email: { contains: prefix },
    },
  });
};

/**
 * Wait for async operations (useful for testing real-time features)
 */
export const wait = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms));
};

/**
 * Generate unique test identifier
 */
export const uniqueTestId = (): string => {
  return `test-${Date.now()}-${Math.random().toString(36).substring(7)}`;
};

/**
 * Assert response has standard API structure
 */
export const assertApiResponse = (response: any, expectedStatus: number) => {
  expect(response.status).toBe(expectedStatus);

  if (expectedStatus >= 200 && expectedStatus < 300) {
    expect(response.body).toHaveProperty('success');
    if (response.body.data !== undefined) {
      expect(response.body).toHaveProperty('data');
    }
  } else {
    expect(response.body).toHaveProperty('error');
    expect(response.body).toHaveProperty('message');
  }
};

/**
 * Create multiple test users with different roles
 */
export const createTestUsersWithRoles = async () => {
  const roles: UserRole[] = [
    UserRole.ADMIN,
    UserRole.JUDGE,
    UserRole.CONTESTANT,
    UserRole.EMCEE,
    UserRole.TALLY_MASTER,
  ];

  const users: any = {};

  for (const role of roles) {
    const user = await createTestUser({ role });
    users[role.toLowerCase()] = user;
    users[`${role.toLowerCase()}Token`] = generateAuthToken(user.id, role);
  }

  return users;
};

/**
 * Disconnect Prisma (use in afterAll)
 */
export const disconnectPrisma = async () => {
  await prisma.$disconnect();
};
