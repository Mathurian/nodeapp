/**
 * Database Seeding Example for Integration Tests
 *
 * This file shows how to seed the test database with initial data
 * and clean it up after tests complete.
 *
 * Copy this to seedData.ts and customize for your needs.
 */

import { ContestantNumberingMode, PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
const TEST_TENANT_SLUG = 'seed-test-tenant';

async function ensureTestTenant() {
  return prisma.tenant.upsert({
    where: { slug: TEST_TENANT_SLUG },
    update: {
      name: 'Seed Test Tenant',
      isActive: true,
      planType: 'enterprise',
      subscriptionStatus: 'active',
    },
    create: {
      name: 'Seed Test Tenant',
      slug: TEST_TENANT_SLUG,
      isActive: true,
      planType: 'enterprise',
      subscriptionStatus: 'active',
    },
  });
}

// ============================================================================
// SEED DATA - Main Function
// ============================================================================

export async function seedTestDatabase() {
  console.log('🌱 Seeding test database...');

  // Clean up first
  await cleanupTestDatabase();
  const tenant = await ensureTestTenant();

  // Create users
  const users = await seedUsers(tenant.id);
  console.log(`✅ Created ${users.length} test users`);

  // Create events
  const events = await seedEvents(tenant.id);
  console.log(`✅ Created ${events.length} test events`);

  // Create contests
  const contests = await seedContests(events[0].id);
  console.log(`✅ Created ${contests.length} test contests`);

  // Create categories
  const categories = await seedCategories(contests[0].id);
  console.log(`✅ Created ${categories.length} test categories`);

  console.log('✅ Database seeding complete!');

  return {
    users,
    events,
    contests,
    categories
  };
}

// ============================================================================
// CLEANUP - Remove Test Data
// ============================================================================

export async function cleanupTestDatabase() {
  console.log('🧹 Cleaning up test database...');

  const tenant = await prisma.tenant.findUnique({
    where: { slug: TEST_TENANT_SLUG },
    select: { id: true },
  });

  // Delete in correct order (respect foreign keys)
  await prisma.$transaction([
    // Scores depend on categories
    prisma.score.deleteMany({
      where: {
        OR: [
          ...(tenant ? [{ tenantId: tenant.id }] : []),
          { createdAt: { gte: new Date(Date.now() - 3600000) } },
          { category: { name: { contains: 'Test' } } }
        ]
      }
    }),

    prisma.categoryContestant.deleteMany({
      where: tenant ? { tenantId: tenant.id } : {},
    }),
    prisma.categoryJudge.deleteMany({
      where: tenant ? { tenantId: tenant.id } : {},
    }),

    // Categories depend on contests
    prisma.category.deleteMany({
      where: {
        OR: [
          ...(tenant ? [{ tenantId: tenant.id }] : []),
          { name: { contains: 'Test' } },
          { createdAt: { gte: new Date(Date.now() - 3600000) } }
        ]
      }
    }),

    // Contests depend on events
    prisma.contest.deleteMany({
      where: {
        OR: [
          ...(tenant ? [{ tenantId: tenant.id }] : []),
          { name: { contains: 'Test' } },
          { createdAt: { gte: new Date(Date.now() - 3600000) } }
        ]
      }
    }),

    // Events are independent
    prisma.event.deleteMany({
      where: {
        OR: [
          ...(tenant ? [{ tenantId: tenant.id }] : []),
          { name: { contains: 'Test' } },
          { createdAt: { gte: new Date(Date.now() - 3600000) } }
        ]
      }
    }),

    // Users are independent
    prisma.user.deleteMany({
      where: tenant ? { tenantId: tenant.id } : { email: { contains: '@test.com' } }
    }),
  ]);

  if (tenant) {
    await prisma.tenant.delete({ where: { id: tenant.id } });
  }

  console.log('✅ Cleanup complete!');
}

// ============================================================================
// SEED USERS
// ============================================================================

export async function seedUsers(tenantId: string) {
  const hashedPassword = await bcrypt.hash('password123', 10);

  const usersData = [
    {
      email: 'admin@test.com',
      name: 'Test Admin',
      password: hashedPassword,
      role: 'ADMIN' as UserRole,
      isActive: true
    },
    {
      email: 'organizer@test.com',
      name: 'Test Organizer',
      password: hashedPassword,
      role: 'ORGANIZER' as UserRole,
      isActive: true
    },
    {
      email: 'judge@test.com',
      name: 'Test Judge',
      password: hashedPassword,
      role: 'JUDGE' as UserRole,
      isActive: true
    },
    {
      email: 'contestant@test.com',
      name: 'Test Contestant',
      password: hashedPassword,
      role: 'CONTESTANT' as UserRole,
      isActive: true
    },
    {
      email: 'board@test.com',
      name: 'Test Board Member',
      password: hashedPassword,
      role: 'BOARD' as UserRole,
      isActive: true
    },
  ];

  const users = [];
  for (const userData of usersData) {
    const user = await prisma.user.create({
      data: {
        ...userData,
        preferredName: userData.name,
        sessionVersion: 1,
        tenantId,
      },
    });
    users.push(user);
  }

  return users;
}

// ============================================================================
// SEED EVENTS
// ============================================================================

export async function seedEvents(tenantId: string) {
  const eventsData = [
    {
      name: 'Test Event 2025',
      description: 'Main test event for integration tests',
      location: 'Test Venue',
      startDate: new Date('2025-06-01T09:00:00'),
      endDate: new Date('2025-06-01T17:00:00'),
      archived: false,
      contestantNumberingMode: ContestantNumberingMode.MANUAL,
      tenantId,
    },
    {
      name: 'Test Event 2025 - Regional',
      description: 'Regional test event',
      location: 'Test Regional Center',
      startDate: new Date('2025-07-15T10:00:00'),
      endDate: new Date('2025-07-15T16:00:00'),
      archived: false,
      contestantNumberingMode: ContestantNumberingMode.MANUAL,
      tenantId,
    }
  ];

  const events = [];
  for (const eventData of eventsData) {
    const event = await prisma.event.create({ data: eventData });
    events.push(event);
  }

  return events;
}

// ============================================================================
// SEED CONTESTS
// ============================================================================

export async function seedContests(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { tenantId: true },
  });
  if (!event) {
    throw new Error(`Event ${eventId} not found`);
  }

  const contestsData = [
    {
      name: 'Test Vocal Performance',
      description: 'Vocal performance contest',
      eventId,
      tenantId: event.tenantId,
      contestantNumberingMode: ContestantNumberingMode.MANUAL,
      nextContestantNumber: 1,
    },
    {
      name: 'Test Instrumental Performance',
      description: 'Instrumental performance contest',
      eventId,
      tenantId: event.tenantId,
      contestantNumberingMode: ContestantNumberingMode.MANUAL,
      nextContestantNumber: 1,
    }
  ];

  const contests = [];
  for (const contestData of contestsData) {
    const contest = await prisma.contest.create({ data: contestData });
    contests.push(contest);
  }

  return contests;
}

// ============================================================================
// SEED CATEGORIES
// ============================================================================

export async function seedCategories(contestId: string) {
  const contest = await prisma.contest.findUnique({
    where: { id: contestId },
    select: { tenantId: true },
  });
  if (!contest) {
    throw new Error(`Contest ${contestId} not found`);
  }

  const categoriesData = [
    {
      name: 'Test Solo Vocal - Age 8-10',
      description: 'Solo vocal performance for ages 8-10',
      contestId,
      contestantMin: 8,
      contestantMax: 10,
      scoreCap: 100,
      tenantId: contest.tenantId,
    },
    {
      name: 'Test Solo Vocal - Age 11-13',
      description: 'Solo vocal performance for ages 11-13',
      contestId,
      contestantMin: 11,
      contestantMax: 13,
      scoreCap: 100,
      tenantId: contest.tenantId,
    },
    {
      name: 'Test Group Vocal',
      description: 'Group vocal performance',
      contestId,
      contestantMin: 8,
      contestantMax: 18,
      scoreCap: 100,
      tenantId: contest.tenantId,
    }
  ];

  const categories = [];
  for (const categoryData of categoriesData) {
    const category = await prisma.category.create({ data: categoryData });
    categories.push(category);
  }

  return categories;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get a test user by role
 */
export async function getTestUserByRole(role: UserRole) {
  return await prisma.user.findFirst({
    where: {
      email: { contains: '@test.com' },
      role
    }
  });
}

/**
 * Create a temporary test user (for one-off tests)
 */
export async function createTemporaryTestUser(overrides = {}) {
  const hashedPassword = await bcrypt.hash('password123', 10);
  const tenant = await ensureTestTenant();

  return await prisma.user.create({
    data: {
      email: `temp-${Date.now()}@test.com`,
      name: 'Temporary Test User',
      preferredName: 'Temporary Test User',
      password: hashedPassword,
      role: 'CONTESTANT',
      isActive: true,
      sessionVersion: 1,
      tenantId: tenant.id,
      ...overrides
    }
  });
}

/**
 * Delete a temporary test user
 */
export async function deleteTemporaryTestUser(userId: string) {
  await prisma.user.delete({ where: { id: userId } });
}

/**
 * Reset all scores (useful between test suites)
 */
export async function resetScores() {
  await prisma.score.deleteMany({
    where: {
      category: {
        name: { contains: 'Test' }
      }
    }
  });
}

/**
 * Get current test data counts
 */
export async function getTestDataCounts() {
  const counts = await prisma.$transaction([
    prisma.user.count({ where: { email: { contains: '@test.com' } } }),
    prisma.event.count({ where: { name: { contains: 'Test' } } }),
    prisma.contest.count({ where: { name: { contains: 'Test' } } }),
    prisma.category.count({ where: { name: { contains: 'Test' } } }),
    prisma.score.count({
      where: { category: { name: { contains: 'Test' } } }
    }),
  ]);

  return {
    users: counts[0],
    events: counts[1],
    contests: counts[2],
    categories: counts[3],
    scores: counts[4],
    total: counts.reduce((sum, count) => sum + count, 0)
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  seedTestDatabase,
  cleanupTestDatabase,
  seedUsers,
  seedEvents,
  seedContests,
  seedCategories,
  getTestUserByRole,
  createTemporaryTestUser,
  deleteTemporaryTestUser,
  resetScores,
  getTestDataCounts
};
