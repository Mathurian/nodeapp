/**
 * Test Data Factory
 * Dynamically creates test data and tracks it for automatic cleanup
 * Ensures tests are independent and don't leave orphaned data
 *
 * Usage:
 * const factory = new TestDataFactory(prisma, 'mytest');
 * const testData = await factory.createCompleteEnvironment();
 * // ... run tests ...
 * await factory.cleanup(); // Automatically removes all created data
 */

import { PrismaClient, UserRole, Prisma, ContestantNumberingMode } from '@prisma/client';
import bcrypt from 'bcryptjs';

interface TestDataTracker {
  tenants: string[];
  users: string[];
  events: string[];
  contests: string[];
  categories: string[];
  judges: string[];
  contestants: string[];
  scores: string[];
  assignments: string[];
  certifications: string[];
  notifications: string[];
  auditLogs: string[];
  categoryContestants: { categoryId: string; contestantId: string }[];
  contestContestants: string[];
  categoryJudges: { categoryId: string; judgeId: string }[];
  contestJudges: string[];
  criteria: string[];
  emceeScripts: string[];
  tallyMasterAssignments: string[];
  auditorAssignments: string[];
  roleAssignments: string[];
}

export class TestDataFactory {
  private prisma: PrismaClient;
  private tracker: TestDataTracker;
  private testPrefix: string;
  private defaultTenantId: string | null = null;

  constructor(prisma: PrismaClient, testSuiteName?: string) {
    this.prisma = prisma;
    this.testPrefix = testSuiteName || `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    this.tracker = {
      tenants: [],
      users: [],
      events: [],
      contests: [],
      categories: [],
      judges: [],
      contestants: [],
      scores: [],
      assignments: [],
      certifications: [],
      notifications: [],
      auditLogs: [],
      categoryContestants: [],
      contestContestants: [],
      categoryJudges: [],
      contestJudges: [],
      criteria: [],
      emceeScripts: [],
      tallyMasterAssignments: [],
      auditorAssignments: [],
      roleAssignments: [],
    };
  }

  /**
   * Create a test tenant
   */
  async createTenant(overrides?: Partial<Prisma.TenantCreateInput>) {
    const timestamp = Date.now();

    // Check if 'default' tenant already exists
    const existingDefault = await this.prisma.tenant.findUnique({
      where: { slug: 'default' },
    });

    // If 'default' exists and we don't have a default tenant set, use it
    if (existingDefault && !this.defaultTenantId) {
      this.defaultTenantId = existingDefault.id;
      this.tracker.tenants.push(existingDefault.id);
      return existingDefault;
    }

    // Use 'default' slug only if it doesn't exist and this is our first tenant
    const isFirstTenant = !this.defaultTenantId && !existingDefault;
    const slug = isFirstTenant
      ? 'default'
      : `${this.testPrefix}_tenant_${timestamp}_${Math.random().toString(36).substring(7)}`;

    const tenant = await this.prisma.tenant.create({
      data: {
        name: `${this.testPrefix}_Tenant_${timestamp}`,
        slug,
        isActive: true,
        planType: 'enterprise',
        subscriptionStatus: 'active',
        ...overrides,
      },
    });
    this.tracker.tenants.push(tenant.id);

    // Set as default tenant if this is the first one
    if (!this.defaultTenantId) {
      this.defaultTenantId = tenant.id;
    }

    return tenant;
  }

  /**
   * Get or create default tenant
   */
  private async getDefaultTenant() {
    if (this.defaultTenantId) {
      return await this.prisma.tenant.findUnique({
        where: { id: this.defaultTenantId },
      });
    }
    return await this.createTenant();
  }

  /**
   * Create a test user with specific role
   */
  async createUser(
    role: UserRole,
    tenantId?: string,
    overrides?: Partial<Prisma.UserCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);
    const hashedPassword = await bcrypt.hash('password123', 10);

    const user = await this.prisma.user.create({
      data: {
        email: `${this.testPrefix}_${role.toLowerCase()}_${timestamp}_${randomSuffix}@test.com`,
        name: `${this.testPrefix}_${role}_${randomSuffix}`,
        preferredName: `Test ${role}`,
        password: hashedPassword,
        role: role,
        isActive: true,
        sessionVersion: 1,
        tenantId: tenant.id,
        ...overrides,
      },
    });
    this.tracker.users.push(user.id);
    return user;
  }

  /**
   * Create all user roles for a tenant
   */
  async createAllRoles(tenantId?: string) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const roles: UserRole[] = [
      'SUPER_ADMIN',
      'ADMIN',
      'ORGANIZER',
      'JUDGE',
      'CONTESTANT',
      'TALLY_MASTER',
      'AUDITOR',
      'BOARD',
      'EMCEE',
    ];

    const users: Record<string, any> = {};

    for (const role of roles) {
      users[role.toLowerCase()] = await this.createUser(role, tenant.id);
    }

    return users;
  }

  /**
   * Create a test event
   */
  async createEvent(tenantId?: string, overrides?: Partial<Prisma.EventCreateInput>) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    const event = await this.prisma.event.create({
      data: {
        name: `${this.testPrefix}_Event_${timestamp}_${randomSuffix}`,
        description: 'Test event for automated testing',
        startDate: new Date('2025-06-01'),
        endDate: new Date('2025-06-03'),
        location: 'Test Venue',
        maxContestants: 100,
        contestantNumberingMode: 'MANUAL' as ContestantNumberingMode,
        archived: false,
        tenantId: tenant.id,
        ...overrides,
      },
    });
    this.tracker.events.push(event.id);
    return event;
  }

  /**
   * Create a test contest
   */
  async createContest(
    eventId: string,
    tenantId?: string,
    overrides?: Partial<Prisma.ContestCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    const contest = await this.prisma.contest.create({
      data: {
        name: `${this.testPrefix}_Contest_${timestamp}_${randomSuffix}`,
        description: 'Test contest',
        eventId: eventId,
        tenantId: tenant.id,
        contestantNumberingMode: 'MANUAL' as ContestantNumberingMode,
        nextContestantNumber: 1,
        ...overrides,
      },
    });
    this.tracker.contests.push(contest.id);
    return contest;
  }

  /**
   * Create a test category
   */
  async createCategory(
    contestId: string,
    tenantId?: string,
    overrides?: Partial<Prisma.CategoryCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(7);

    const category = await this.prisma.category.create({
      data: {
        name: `${this.testPrefix}_Category_${timestamp}_${randomSuffix}`,
        description: 'Test category',
        contestId: contestId,
        scoreCap: 100,
        tenantId: tenant.id,
        ...overrides,
      },
    });
    this.tracker.categories.push(category.id);
    return category;
  }

  /**
   * Create test criteria for a category
   */
  async createCriteria(
    categoryId: string,
    count: number = 3,
    tenantId?: string,
    overrides?: Partial<Prisma.CriterionCreateInput>
  ) {
    const criteria = [];
    for (let i = 1; i <= count; i++) {
      const criterion = await this.prisma.criterion.create({
        data: {
          categoryId: categoryId,
          name: `Criterion ${i}`,
          maxScore: 10,
          ...(tenantId && { tenantId }),
          ...overrides,
        },
      });
      this.tracker.criteria.push(criterion.id);
      criteria.push(criterion);
    }
    return criteria;
  }

  /**
   * Create a test judge record
   */
  async createJudge(
    userId: string,
    tenantId?: string,
    overrides?: Partial<Prisma.JudgeCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const judge = await this.prisma.judge.create({
      data: {
        name: user.name,
        email: user.email,
        tenantId: tenant.id,
        isHeadJudge: false,
        ...overrides,
      },
    });
    this.tracker.judges.push(judge.id);

    // Link the user to the judge
    await this.prisma.user.update({
      where: { id: userId },
      data: { judgeId: judge.id },
    });

    return judge;
  }

  /**
   * Create a test contestant record
   */
  async createContestant(
    userId: string,
    contestantNumber: number,
    tenantId?: string,
    overrides?: Partial<Prisma.ContestantCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('User not found');

    const contestant = await this.prisma.contestant.create({
      data: {
        name: user.name,
        email: user.email,
        contestantNumber: contestantNumber,
        tenantId: tenant.id,
        ...overrides,
      },
    });
    this.tracker.contestants.push(contestant.id);

    // Link the user to the contestant
    await this.prisma.user.update({
      where: { id: userId },
      data: { contestantId: contestant.id },
    });

    return contestant;
  }

  /**
   * Create a judge assignment
   */
  async createAssignment(
    judgeId: string,
    categoryId: string,
    tenantId?: string,
    overrides?: Partial<Prisma.AssignmentCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    // Get category to find contestId and eventId
    const category = await this.prisma.category.findUnique({
      where: { id: categoryId },
      include: { contest: true },
    });
    if (!category || !category.contest) throw new Error('Category or Contest not found');

    // Get a user to use as assignedBy (use first admin/super_admin)
    const adminUser = await this.prisma.user.findFirst({
      where: {
        tenantId: tenant.id,
        role: { in: ['ADMIN', 'SUPER_ADMIN'] },
      },
    });
    if (!adminUser) throw new Error('No admin user found for assignment');

    const assignment = await this.prisma.assignment.create({
      data: {
        judge: { connect: { id: judgeId } },
        category: { connect: { id: categoryId } },
        contest: { connect: { id: category.contestId } },
        event: { connect: { id: category.contest.eventId } },
        assignedByUser: { connect: { id: adminUser.id } },
        tenantId: tenant.id,
        status: 'ACTIVE',
        ...overrides,
      },
    });
    this.tracker.assignments.push(assignment.id);
    return assignment;
  }

  /**
   * Link contestant to category
   */
  async assignContestantToCategory(
    contestantId: string,
    categoryId: string,
    tenantId?: string
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const assignment = await this.prisma.categoryContestant.create({
      data: {
        contestantId: contestantId,
        categoryId: categoryId,
        tenantId: tenant.id,
      },
    });
    this.tracker.categoryContestants.push({ categoryId, contestantId });
    return assignment;
  }

  /**
   * Link judge to category
   */
  async assignJudgeToCategory(
    judgeId: string,
    categoryId: string,
    tenantId?: string
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const assignment = await this.prisma.categoryJudge.create({
      data: {
        judgeId: judgeId,
        categoryId: categoryId,
        tenantId: tenant.id,
      },
    });
    this.tracker.categoryJudges.push({ categoryId, judgeId });
    return assignment;
  }

  /**
   * Create a score
   */
  async createScore(
    judgeId: string,
    contestantId: string,
    categoryId: string,
    criterionId: string,
    score: number,
    tenantId?: string,
    overrides?: Partial<Prisma.ScoreCreateInput>
  ) {
    const tenant = tenantId ? { id: tenantId } : await this.getDefaultTenant();
    if (!tenant) throw new Error('No tenant available');

    const scoreRecord = await this.prisma.score.create({
      data: {
        judgeId: judgeId,
        contestantId: contestantId,
        categoryId: categoryId,
        criterionId: criterionId,
        score: score,
        tenantId: tenant.id,
        ...overrides,
      },
    });
    this.tracker.scores.push(scoreRecord.id);
    return scoreRecord;
  }

  /**
   * Create a complete test environment
   * Returns all entities needed for comprehensive testing
   */
  async createCompleteEnvironment(options?: {
    skipTenant?: boolean;
    tenantId?: string;
    createMultipleContests?: boolean;
    createScores?: boolean;
  }) {
    // 1. Create or use tenant
    const tenant = options?.skipTenant && options?.tenantId
      ? await this.prisma.tenant.findUnique({ where: { id: options.tenantId } })
      : await this.createTenant();

    if (!tenant) throw new Error('Failed to create tenant');

    // 2. Create all user roles
    const users = await this.createAllRoles(tenant.id);

    // 3. Create event
    const event = await this.createEvent(tenant.id);

    // 4. Create contests
    const contest1 = await this.createContest(event.id, tenant.id);
    const contests = [contest1];

    if (options?.createMultipleContests) {
      const contest2 = await this.createContest(event.id, tenant.id, {
        name: `${this.testPrefix}_Contest_2_${Date.now()}`,
      });
      contests.push(contest2);
    }

    // 5. Create categories
    const category1 = await this.createCategory(contest1.id, tenant.id);
    const category2 = await this.createCategory(contest1.id, tenant.id, {
      name: `${this.testPrefix}_Category_2_${Date.now()}`,
    });
    const categories = [category1, category2];

    // 6. Create criteria for categories
    const criteria1 = await this.createCriteria(category1.id, 3, tenant.id);
    const criteria2 = await this.createCriteria(category2.id, 3, tenant.id);

    // 7. Create judge records
    const judge = await this.createJudge(users.judge.id, tenant.id);

    // 8. Create contestant records
    const contestant = await this.createContestant(users.contestant.id, 1, tenant.id);

    // 9. Create assignments
    const assignment = await this.createAssignment(judge.id, category1.id, tenant.id);

    // 10. Assign judge to category
    await this.assignJudgeToCategory(judge.id, category1.id, tenant.id);

    // 11. Assign contestant to category
    await this.assignContestantToCategory(contestant.id, category1.id, tenant.id);

    // 12. Optionally create scores
    if (options?.createScores) {
      for (const criterion of criteria1) {
        await this.createScore(
          judge.id,
          contestant.id,
          category1.id,
          criterion.id,
          8.5,
          tenant.id
        );
      }
    }

    return {
      tenant,
      users,
      event,
      contests,
      categories,
      criteria: { category1: criteria1, category2: criteria2 },
      judge,
      contestant,
      assignment,
    };
  }

  /**
   * Clean up all created test data
   * Deletes in correct order respecting foreign key constraints
   */
  async cleanup() {
    console.log(`🧹 Cleaning up test data for ${this.testPrefix}...`);

    try {
      // Delete in reverse order of dependencies
      if (this.tracker.scores.length > 0) {
        await this.prisma.score.deleteMany({
          where: { id: { in: this.tracker.scores } },
        });
      }

      if (this.tracker.criteria.length > 0) {
        await this.prisma.criterion.deleteMany({
          where: { id: { in: this.tracker.criteria } },
        });
      }

      if (this.tracker.categoryJudges.length > 0) {
        await this.prisma.categoryJudge.deleteMany({
          where: {
            OR: this.tracker.categoryJudges.map((cj) => ({
              categoryId: cj.categoryId,
              judgeId: cj.judgeId,
            })),
          },
        });
      }

      if (this.tracker.categoryContestants.length > 0) {
        await this.prisma.categoryContestant.deleteMany({
          where: {
            OR: this.tracker.categoryContestants.map((cc) => ({
              categoryId: cc.categoryId,
              contestantId: cc.contestantId,
            })),
          },
        });
      }

      if (this.tracker.assignments.length > 0) {
        await this.prisma.assignment.deleteMany({
          where: { id: { in: this.tracker.assignments } },
        });
      }

      if (this.tracker.tallyMasterAssignments.length > 0) {
        await this.prisma.tallyMasterAssignment.deleteMany({
          where: { id: { in: this.tracker.tallyMasterAssignments } },
        });
      }

      if (this.tracker.auditorAssignments.length > 0) {
        await this.prisma.auditorAssignment.deleteMany({
          where: { id: { in: this.tracker.auditorAssignments } },
        });
      }

      if (this.tracker.roleAssignments.length > 0) {
        await this.prisma.roleAssignment.deleteMany({
          where: { id: { in: this.tracker.roleAssignments } },
        });
      }

      if (this.tracker.certifications.length > 0) {
        await this.prisma.certification.deleteMany({
          where: { id: { in: this.tracker.certifications } },
        });
      }

      if (this.tracker.emceeScripts.length > 0) {
        await this.prisma.emceeScript.deleteMany({
          where: { id: { in: this.tracker.emceeScripts } },
        });
      }

      if (this.tracker.categories.length > 0) {
        await this.prisma.category.deleteMany({
          where: { id: { in: this.tracker.categories } },
        });
      }

      if (this.tracker.contestContestants.length > 0) {
        await this.prisma.contestContestant.deleteMany({
          where: { id: { in: this.tracker.contestContestants } },
        });
      }

      if (this.tracker.contestJudges.length > 0) {
        await this.prisma.contestJudge.deleteMany({
          where: { id: { in: this.tracker.contestJudges } },
        });
      }

      if (this.tracker.contests.length > 0) {
        await this.prisma.contest.deleteMany({
          where: { id: { in: this.tracker.contests } },
        });
      }

      if (this.tracker.events.length > 0) {
        await this.prisma.event.deleteMany({
          where: { id: { in: this.tracker.events } },
        });
      }

      if (this.tracker.notifications.length > 0) {
        await this.prisma.notification.deleteMany({
          where: { id: { in: this.tracker.notifications } },
        });
      }

      if (this.tracker.auditLogs.length > 0) {
        await this.prisma.auditLog.deleteMany({
          where: { id: { in: this.tracker.auditLogs } },
        });
      }

      if (this.tracker.contestants.length > 0) {
        await this.prisma.contestant.deleteMany({
          where: { id: { in: this.tracker.contestants } },
        });
      }

      if (this.tracker.judges.length > 0) {
        await this.prisma.judge.deleteMany({
          where: { id: { in: this.tracker.judges } },
        });
      }

      if (this.tracker.users.length > 0) {
        // Don't delete users belonging to 'default' tenant (shared across tests)
        const defaultTenant = await this.prisma.tenant.findUnique({
          where: { slug: 'default' },
          select: { id: true },
        });

        const whereClause: any = { id: { in: this.tracker.users } };
        if (defaultTenant) {
          whereClause.tenantId = { not: defaultTenant.id };
        }

        await this.prisma.user.deleteMany({ where: whereClause });
      }

      if (this.tracker.tenants.length > 0) {
        // Get tenant slugs to avoid deleting 'default' tenant which is shared across tests
        const tenantsToDelete = await this.prisma.tenant.findMany({
          where: {
            id: { in: this.tracker.tenants },
            slug: { not: 'default' }, // Preserve 'default' tenant for reuse
          },
          select: { id: true },
        });

        if (tenantsToDelete.length > 0) {
          await this.prisma.tenant.deleteMany({
            where: { id: { in: tenantsToDelete.map(t => t.id) } },
          });
        }
      }

      console.log(`✅ Cleanup complete for ${this.testPrefix}`);
      console.log(`   - Cleaned ${this.tracker.users.length} users`);
      console.log(`   - Cleaned ${this.tracker.events.length} events`);
      console.log(`   - Cleaned ${this.tracker.contests.length} contests`);
      console.log(`   - Cleaned ${this.tracker.categories.length} categories`);
      console.log(`   - Cleaned ${this.tracker.scores.length} scores`);

    } catch (error) {
      console.error(`❌ Cleanup failed for ${this.testPrefix}:`, error);
      throw error;
    }
  }

  /**
   * Get tracked data (for debugging)
   */
  getTracker() {
    return this.tracker;
  }

  /**
   * Get test prefix
   */
  getTestPrefix() {
    return this.testPrefix;
  }

  /**
   * Verify cleanup was successful
   */
  async verifyCleanup(): Promise<boolean> {
    const counts = {
      users: await this.prisma.user.count({
        where: { id: { in: this.tracker.users } },
      }),
      events: await this.prisma.event.count({
        where: { id: { in: this.tracker.events } },
      }),
      contests: await this.prisma.contest.count({
        where: { id: { in: this.tracker.contests } },
      }),
      categories: await this.prisma.category.count({
        where: { id: { in: this.tracker.categories } },
      }),
      tenants: await this.prisma.tenant.count({
        where: { id: { in: this.tracker.tenants } },
      }),
    };

    const totalRemaining = Object.values(counts).reduce((sum, count) => sum + count, 0);

    if (totalRemaining > 0) {
      console.error(`⚠️  Cleanup verification failed. Remaining records:`, counts);
      return false;
    }

    return true;
  }
}
