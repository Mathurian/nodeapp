/**
 * Test Event Setup Service
 * Creates a complete test event with configurable options
 */

import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import * as bcrypt from 'bcrypt';

export interface TestEventConfig {
  eventName?: string;
  contestCount?: number;
  contestNames?: string[];  // Optional custom names
  categoriesPerContest?: number;
  contestantsPerCategory?: number;
  judgesPerCategory?: number;
  tallyMastersPerContest?: number;
  auditorsPerContest?: number;
  boardUsers?: number;
  organizers?: number;
  emcees?: number;
  admins?: number;
  assignJudgesToCategories?: boolean;
  assignContestantsToCategories?: boolean;
  defaultPassword?: string;  // If not provided, generate random
  tenantId?: string;
  createNewTenant?: boolean;  // Create a new tenant for this test
  tenantName?: string;  // Custom tenant name (if empty, auto-generate)
  tenantScoringType?: 'STRAIGHT' | 'OLYMPIC';  // Scoring type for tenant (if creating new)
  eventScoringType?: 'STRAIGHT' | 'OLYMPIC' | null;  // Event-level override
  contestScoringTypes?: ('STRAIGHT' | 'OLYMPIC' | null)[];  // Per-contest overrides
}

export interface TestEventResult {
  eventId: string;
  eventName: string;
  message: string;
  generatedPassword: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
    createdNew: boolean;
  };
  counts: {
    contests: number;
    categories: number;
    contestants: number;
    judges: number;
    tallyMasters: number;
    auditors: number;
    organizers: number;
    boardUsers: number;
    emcees: number;
    admins: number;
  };
}

@injectable()
export class TestEventSetupService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Generate a random password
   */
  private generateRandomPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%';
    let password = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * charset.length);
      password += charset[randomIndex];
    }
    return password;
  }

  /**
   * Generate a slug from name
   */
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  /**
   * Create a complete test event with all components
   */
  async createTestEvent(
    config: TestEventConfig,
    userId: string,
    userRole: string,
    userTenantId: string
  ): Promise<TestEventResult> {
    // Only SUPER_ADMIN and ADMIN can create test events
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw this.forbiddenError('Only administrators can create test events');
    }

    const {
      eventName = `Test Event ${Date.now()}`,
      contestCount = 2,
      contestNames = [],
      categoriesPerContest = 3,
      contestantsPerCategory = 5,
      judgesPerCategory = 3,
      tallyMastersPerContest = 1,
      auditorsPerContest = 1,
      boardUsers = 2,
      organizers = 2,
      emcees = 1,
      admins = 0,
      assignJudgesToCategories = true,
      assignContestantsToCategories = true,
      defaultPassword,
      createNewTenant = false,
      tenantName,
      tenantScoringType = 'STRAIGHT',
      eventScoringType = null,
      contestScoringTypes = []
    } = config;

    let { tenantId = userTenantId } = config;

    // Handle tenant creation
    let createdTenant: any = null;
    let tenantCreatedNew = false;

    if (createNewTenant) {
      // Generate tenant name if not provided
      const generatedTenantName = tenantName || `Test Tenant ${Date.now()}`;
      const tenantSlug = this.generateSlug(generatedTenantName);

      // Check if slug already exists
      const existingTenant = await this.prisma.tenant.findUnique({
        where: { slug: tenantSlug }
      });

      if (existingTenant) {
        // Use existing tenant if slug matches
        tenantId = existingTenant.id;
        createdTenant = existingTenant;
        tenantCreatedNew = false;
      } else {
        // Create new tenant with internal plan (high rate limits for testing)
        createdTenant = await this.prisma.tenant.create({
          data: {
            name: generatedTenantName,
            slug: tenantSlug,
            isActive: true,
            scoringType: tenantScoringType,
            planType: 'internal'  // Use internal plan to avoid rate limiting during testing
          }
        });
        tenantId = createdTenant.id;
        tenantCreatedNew = true;
      }
    } else {
      // Get existing tenant info for result
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId }
      });
      if (tenant) {
        createdTenant = tenant;
        tenantCreatedNew = false;
      }
    }

    // Validate config
    if (contestCount < 1 || contestCount > 10) {
      throw this.validationError('contestCount must be between 1 and 10');
    }
    if (categoriesPerContest < 1 || categoriesPerContest > 10) {
      throw this.validationError('categoriesPerContest must be between 1 and 10');
    }
    if (contestantsPerCategory < 1 || contestantsPerCategory > 50) {
      throw this.validationError('contestantsPerCategory must be between 1 and 50');
    }
    if (judgesPerCategory < 1 || judgesPerCategory > 15) {
      throw this.validationError('judgesPerCategory must be between 1 and 15');
    }

    // Generate or use provided password
    const generatedPassword = defaultPassword || this.generateRandomPassword();
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    // Track counts for result
    const counts = {
      contests: 0,
      categories: 0,
      contestants: 0,
      judges: 0,
      tallyMasters: 0,
      auditors: 0,
      organizers: 0,
      boardUsers: 0,
      emcees: 0,
      admins: 0
    };

    // Get tenant slug for email domain
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { slug: true }
    });
    const emailDomain = tenant?.slug || 'test';

    const result: any = await this.prisma.$transaction(async (tx) => {
      // Create event
      const event = await tx.event.create({
        data: {
          tenantId,
          name: eventName,
          description: 'Test event created by test setup service',
          startDate,
          endDate,
          location: 'Test Location',
          scoringType: eventScoringType
        }
      });

      // Create admin users if requested
      for (let i = 0; i < admins; i++) {
        await tx.user.create({
          data: {
            tenantId,
            name: `Test Admin ${i + 1}`,
            email: `admin${i + 1}@${emailDomain}.com`,
            password: hashedPassword,
            role: 'ADMIN',
            isActive: true
          }
        });
        counts.admins++;
      }

      // Create emcee users
      for (let i = 0; i < emcees; i++) {
        const user = await tx.user.create({
          data: {
            tenantId,
            name: `Test Emcee ${i + 1}`,
            email: `emcee${i + 1}@${emailDomain}.com`,
            password: hashedPassword,
            role: 'EMCEE',
            isActive: true
          }
        });

        // Assign emcee to event
        await tx.roleAssignment.create({
          data: {
            tenantId,
            userId: user.id,
            role: 'EMCEE',
            eventId: event.id,
            assignedBy: userId,
            isActive: true
          }
        });
        counts.emcees++;
      }

      // Create organizers
      for (let i = 0; i < organizers; i++) {
        await tx.user.create({
          data: {
            tenantId,
            name: `Test Organizer ${i + 1}`,
            email: `organizer${i + 1}@${emailDomain}.com`,
            password: hashedPassword,
            role: 'ORGANIZER',
            isActive: true
          }
        });
        counts.organizers++;
      }

      // Create board users
      for (let i = 0; i < boardUsers; i++) {
        await tx.user.create({
          data: {
            tenantId,
            name: `Test Board ${i + 1}`,
            email: `board${i + 1}@${emailDomain}.com`,
            password: hashedPassword,
            role: 'BOARD',
            isActive: true
          }
        });
        counts.boardUsers++;
      }

      // Create contests
      for (let c = 0; c < contestCount; c++) {
        const contestName = contestNames[c] || `Test Contest ${c + 1}`;
        const contestScoringType = contestScoringTypes[c] !== undefined ? contestScoringTypes[c] : null;
        const contest = await tx.contest.create({
          data: {
            tenantId,
            eventId: event.id,
            name: contestName,
            description: `${contestName} description`,
            scoringType: contestScoringType
          }
        });
        counts.contests++;

        // Create tally masters for this contest
        for (let t = 0; t < tallyMastersPerContest; t++) {
          const tallyNum = (c * tallyMastersPerContest) + t + 1;
          const user = await tx.user.create({
            data: {
              tenantId,
              name: `Test Tally Master ${tallyNum}`,
              email: `tally${tallyNum}@${emailDomain}.com`,
              password: hashedPassword,
              role: 'TALLY_MASTER',
              isActive: true
            }
          });
          counts.tallyMasters++;

          // Assign tally master to contest
          await tx.roleAssignment.create({
            data: {
              tenantId,
              userId: user.id,
              role: 'TALLY_MASTER',
              contestId: contest.id,
              eventId: event.id,
              assignedBy: userId,
              isActive: true
            }
          });
        }

        // Create auditors for this contest
        for (let a = 0; a < auditorsPerContest; a++) {
          const auditorNum = (c * auditorsPerContest) + a + 1;
          const user = await tx.user.create({
            data: {
              tenantId,
              name: `Test Auditor ${auditorNum}`,
              email: `auditor${auditorNum}@${emailDomain}.com`,
              password: hashedPassword,
              role: 'AUDITOR',
              isActive: true
            }
          });
          counts.auditors++;

          // Assign auditor to contest
          await tx.roleAssignment.create({
            data: {
              tenantId,
              userId: user.id,
              role: 'AUDITOR',
              contestId: contest.id,
              eventId: event.id,
              assignedBy: userId,
              isActive: true
            }
          });
        }

        // Create judges for this contest (not per category)
        const contestJudges = [];
        for (let j = 0; j < judgesPerCategory; j++) {
          const judgeNum = (c * judgesPerCategory) + j + 1;
          const judge = await tx.judge.create({
            data: {
              tenantId,
              name: `Test Judge ${judgeNum}`,
              email: `judge${judgeNum}@${emailDomain}.com`,
              bio: `Test judge bio ${judgeNum}`
            }
          });
          counts.judges++;

          // Create user for judge
          const judgeUser = await tx.user.create({
            data: {
              tenantId,
              name: judge.name,
              email: judge.email || `judge${judgeNum}@${emailDomain}.com`,
              password: hashedPassword,
              role: 'JUDGE',
              isActive: true
            }
          });

          // Link judge to user
          await tx.user.update({
            where: { id: judgeUser.id },
            data: { judgeId: judge.id }
          });

          // Add to contest judges array for later assignment to categories
          contestJudges.push(judge);

          // Create contest-level judge assignment
          await tx.contestJudge.create({
            data: {
              tenantId,
              contestId: contest.id,
              judgeId: judge.id
            }
          });
        }

        // Create categories for this contest
        for (let cat = 0; cat < categoriesPerContest; cat++) {
          const category = await tx.category.create({
            data: {
              tenantId,
              contestId: contest.id,
              name: `Test Category ${c + 1}-${cat + 1}`,
              description: `Test category ${c + 1}-${cat + 1} description`,
              scoreCap: 100
            }
          });
          counts.categories++;

          // Create criteria for category
          await tx.criterion.createMany({
            data: [
              {
                tenantId,
                categoryId: category.id,
                name: 'Criterion 1',
                maxScore: 30
              },
              {
                tenantId,
                categoryId: category.id,
                name: 'Criterion 2',
                maxScore: 40
              },
              {
                tenantId,
                categoryId: category.id,
                name: 'Criterion 3',
                maxScore: 30
              }
            ]
          });

          // Assign all contest judges to this category
          if (assignJudgesToCategories) {
            for (const judge of contestJudges) {
              await tx.categoryJudge.create({
                data: {
                  tenantId,
                  categoryId: category.id,
                  judgeId: judge.id
                }
              });

              // Create Assignment record for judge to category
              await tx.assignment.create({
                data: {
                  tenantId,
                  judgeId: judge.id,
                  categoryId: category.id,
                  contestId: contest.id,
                  eventId: event.id,
                  priority: 0,
                  status: 'PENDING',
                  assignedBy: userId,
                  assignedAt: new Date()
                }
              });
            }
          }

          // Create contestants for this category
          for (let cont = 0; cont < contestantsPerCategory; cont++) {
            const contestantNum = (c * categoriesPerContest * contestantsPerCategory) + (cat * contestantsPerCategory) + cont + 1;
            const contestant = await tx.contestant.create({
              data: {
                tenantId,
                name: `Test Contestant ${contestantNum}`,
                email: `contestant${contestantNum}@${emailDomain}.com`,
                bio: `Test contestant bio ${contestantNum}`,
                contestantNumber: contestantNum
              }
            });
            counts.contestants++;

            // Create user for contestant
            const contestantUser = await tx.user.create({
              data: {
                tenantId,
                name: contestant.name,
                email: contestant.email || `contestant${contestantNum}@${emailDomain}.com`,
                password: hashedPassword,
                role: 'CONTESTANT',
                isActive: true
              }
            });

            // Link contestant to user
            await tx.user.update({
              where: { id: contestantUser.id },
              data: { contestantId: contestant.id }
            });

            if (assignContestantsToCategories) {
              // Assign contestant to category
              await tx.categoryContestant.create({
                data: {
                  tenantId,
                  categoryId: category.id,
                  contestantId: contestant.id
                }
              });

              // Also assign to contest
              await tx.contestContestant.create({
                data: {
                  tenantId,
                  contestId: contest.id,
                  contestantId: contestant.id
                }
              });
            }
          }
        }
      }

      return {
        eventId: event.id,
        eventName: event.name
      };
    });

    this.logInfo('Test event created', { eventId: result.eventId, userId, counts });

    return {
      eventId: result.eventId,
      eventName: result.eventName,
      message: `Test event "${result.eventName}" created successfully`,
      generatedPassword,
      tenant: createdTenant ? {
        id: createdTenant.id,
        name: createdTenant.name,
        slug: createdTenant.slug,
        createdNew: tenantCreatedNew
      } : undefined,
      counts
    };
  }

  /**
   * Delete a test event and all its related data
   * This is a destructive operation - use with caution!
   */
  async deleteTestEvent(
    eventId: string,
    userRole: string,
    deleteTenant: boolean = false
  ): Promise<{ message: string; deletedCounts: any }> {
    // Only SUPER_ADMIN and ADMIN can delete test events
    if (userRole !== 'ADMIN' && userRole !== 'SUPER_ADMIN') {
      throw this.forbiddenError('Only administrators can delete test events');
    }

    // Get event to find tenant
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { contests: { include: { categories: true } } }
    });

    if (!event) {
      throw this.createNotFoundError('Event not found');
    }

    const deletedCounts = {
      event: 0,
      contests: 0,
      categories: 0,
      users: 0,
      judges: 0,
      contestants: 0,
      assignments: 0,
      tenant: 0
    };

    await this.prisma.$transaction(async (tx) => {
      // Delete all assignments related to this event
      const deletedAssignments = await tx.assignment.deleteMany({
        where: { eventId }
      });
      deletedCounts.assignments += deletedAssignments.count;

      // Delete all tally master assignments
      await tx.tallyMasterAssignment.deleteMany({
        where: { eventId }
      });

      // Delete all auditor assignments
      await tx.auditorAssignment.deleteMany({
        where: { eventId }
      });

      // Delete all category contestants
      for (const contest of event.contests) {
        for (const category of contest.categories) {
          await tx.categoryContestant.deleteMany({
            where: { categoryId: category.id }
          });
        }
      }

      // Delete all categories
      for (const contest of event.contests) {
        const deletedCategories = await tx.category.deleteMany({
          where: { contestId: contest.id }
        });
        deletedCounts.categories += deletedCategories.count;
      }

      // Delete all contests
      const deletedContests = await tx.contest.deleteMany({
        where: { eventId }
      });
      deletedCounts.contests += deletedContests.count;

      // Delete the event
      await tx.event.delete({
        where: { id: eventId }
      });
      deletedCounts.event = 1;

      // If requested and user is SUPER_ADMIN, delete the tenant and all its data
      if (deleteTenant && userRole === 'SUPER_ADMIN') {
        // Count users before deletion
        const userCount = await tx.user.count({
          where: { tenantId: event.tenantId }
        });
        deletedCounts.users = userCount;

        // Delete tenant (cascade will delete all related data)
        await tx.tenant.delete({
          where: { id: event.tenantId }
        });
        deletedCounts.tenant = 1;
      }
    });

    return {
      message: deleteTenant
        ? 'Test event and tenant deleted successfully'
        : 'Test event deleted successfully',
      deletedCounts
    };
  }
}


