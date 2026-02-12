/**
 * Contract Tests Setup Utilities
 * Provides helper functions for creating test data with proper tenant isolation
 */

import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { container } from 'tsyringe';

const JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
const DEFAULT_TENANT_ID = 'default-tenant';

/**
 * Get the Prisma client from the DI container
 */
export function getPrismaClient(): PrismaClient {
  return container.resolve<PrismaClient>('PrismaClient');
}

/**
 * Ensure the default tenant exists
 */
export async function ensureDefaultTenant(prisma: PrismaClient): Promise<string> {
  // First check by ID
  const existingById = await prisma.tenant.findUnique({
    where: { id: DEFAULT_TENANT_ID },
  });

  if (existingById) {
    return existingById.id;
  }

  // Check by slug (might exist with different ID)
  const existingBySlug = await prisma.tenant.findUnique({
    where: { slug: 'default' },
  });

  if (existingBySlug) {
    return existingBySlug.id;
  }

  // Create new tenant only if neither exists
  try {
    const tenant = await prisma.tenant.create({
      data: {
        id: DEFAULT_TENANT_ID,
        name: 'Default Organization',
        slug: 'default',
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active',
        settings: {},
      },
    });
    return tenant.id;
  } catch (error: unknown) {
    // Handle race condition - tenant might have been created by another test
    const existingTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { id: DEFAULT_TENANT_ID },
          { slug: 'default' },
        ],
      },
    });
    if (existingTenant) {
      return existingTenant.id;
    }
    throw error;
  }
}

/**
 * Create a test user with proper tenant association
 */
export async function createTestUser(
  prisma: PrismaClient,
  options: {
    email: string;
    name: string;
    role: UserRole;
    password?: string;
  }
): Promise<{ id: string; email: string; role: UserRole; tenantId: string }> {
  const tenantId = await ensureDefaultTenant(prisma);
  const hashedPassword = await bcrypt.hash(options.password || 'password123', 10);

  // Use any to bypass TypeScript strict checking for Prisma's complex input types
  const user = await (prisma.user.create as any)({
    data: {
      email: options.email,
      name: options.name,
      password: hashedPassword,
      role: options.role,
      isActive: true,
      sessionVersion: 1,
      tenantId,
    },
  });

  return { id: user.id, email: user.email, role: user.role, tenantId };
}

/**
 * Create a test event with proper tenant association
 */
export async function createTestEvent(
  prisma: PrismaClient,
  options: {
    name: string;
    description?: string;
    startDate: Date;
    endDate: Date;
    location?: string;
  }
): Promise<{ id: string; name: string }> {
  const tenantId = await ensureDefaultTenant(prisma);

  // Use any to bypass TypeScript strict checking for Prisma's complex input types
  const event = await (prisma.event.create as any)({
    data: {
      name: options.name,
      description: options.description || null,
      startDate: options.startDate,
      endDate: options.endDate,
      location: options.location || null,
      tenantId,
    },
  });

  return { id: event.id, name: event.name };
}

/**
 * Create a test contest with proper tenant association
 */
export async function createTestContest(
  prisma: PrismaClient,
  options: {
    name: string;
    eventId: string;
    description?: string;
  }
): Promise<{ id: string; name: string }> {
  const tenantId = await ensureDefaultTenant(prisma);

  // Use any to bypass TypeScript strict checking for Prisma's complex input types
  const contest = await (prisma.contest.create as any)({
    data: {
      name: options.name,
      eventId: options.eventId,
      description: options.description || null,
      tenantId,
    },
  });

  return { id: contest.id, name: contest.name };
}

/**
 * Create a test category with proper tenant association
 */
export async function createTestCategory(
  prisma: PrismaClient,
  options: {
    name: string;
    contestId: string;
    description?: string;
    scoreCap?: number;
  }
): Promise<{ id: string; name: string }> {
  const tenantId = await ensureDefaultTenant(prisma);

  // Use any to bypass TypeScript strict checking for Prisma's complex input types
  const category = await (prisma.category.create as any)({
    data: {
      name: options.name,
      contestId: options.contestId,
      description: options.description || null,
      scoreCap: options.scoreCap || 100,
      tenantId,
    },
  });

  return { id: category.id, name: category.name };
}

/**
 * Create a test judge with proper tenant association
 */
export async function createTestJudge(
  prisma: PrismaClient,
  options: {
    name: string;
    email: string;
  }
): Promise<{ id: string; name: string }> {
  const tenantId = await ensureDefaultTenant(prisma);

  // Use any to bypass TypeScript strict checking for Prisma's complex input types
  const judge = await (prisma.judge.create as any)({
    data: {
      name: options.name,
      email: options.email,
      tenantId,
    },
  });

  return { id: judge.id, name: judge.name };
}

/**
 * Create a test contestant with proper tenant association
 */
export async function createTestContestant(
  prisma: PrismaClient,
  options: {
    name: string;
    eventId: string;
  }
): Promise<{ id: string; name: string }> {
  const tenantId = await ensureDefaultTenant(prisma);

  // Use any to bypass TypeScript strict checking for Prisma's complex input types
  const contestant = await (prisma.contestant.create as any)({
    data: {
      name: options.name,
      eventId: options.eventId,
      tenantId,
    },
  });

  return { id: contestant.id, name: contestant.name };
}

/**
 * Generate a JWT token for testing
 * IMPORTANT: Auth middleware requires tenantId in token
 */
export function generateTestToken(
  userId: string,
  role: UserRole,
  tenantId: string = DEFAULT_TENANT_ID,
  sessionVersion: number = 1
): string {
  return jwt.sign(
    { userId, role, tenantId, sessionVersion },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

/**
 * Clean up test data by email pattern
 */
export async function cleanupTestUsers(
  prisma: PrismaClient,
  emailPattern: string
): Promise<void> {
  await prisma.user.deleteMany({
    where: { email: { contains: emailPattern } },
  });
}

/**
 * Clean up test events by name pattern
 */
export async function cleanupTestEvents(
  prisma: PrismaClient,
  namePattern: string
): Promise<void> {
  await prisma.event.deleteMany({
    where: { name: { contains: namePattern } },
  });
}

/**
 * Clean up test data by various patterns (comprehensive cleanup)
 */
export async function cleanupAllTestData(
  prisma: PrismaClient,
  pattern: string
): Promise<void> {
  // Clean up in reverse dependency order
  await prisma.score.deleteMany({
    where: {
      category: { name: { contains: pattern } },
    },
  }).catch(() => {});

  await prisma.category.deleteMany({
    where: { name: { contains: pattern } },
  }).catch(() => {});

  await prisma.contest.deleteMany({
    where: { name: { contains: pattern } },
  }).catch(() => {});

  await prisma.event.deleteMany({
    where: { name: { contains: pattern } },
  }).catch(() => {});

  await prisma.judge.deleteMany({
    where: { email: { contains: pattern } },
  }).catch(() => {});

  await prisma.contestant.deleteMany({
    where: { name: { contains: pattern } },
  }).catch(() => {});

  await prisma.user.deleteMany({
    where: { email: { contains: pattern } },
  }).catch(() => {});
}
