/**
 * Test Event Setup Service
 * Creates a complete test event with configurable options
 */

import { PrismaClient } from '@prisma/client';
import { injectable, inject } from 'tsyringe';
import { BaseService } from './BaseService';
import * as bcrypt from 'bcryptjs';

export interface TestEventConfig {
  eventName?: string;
  contestCount?: number;
  categoriesPerContest?: number;
  contestantsPerCategory?: number;
  judgesPerCategory?: number;
  tallyMastersPerContest?: number;
  auditorsPerContest?: number;
  boardUsers?: number;
  organizers?: number;
  assignJudgesToCategories?: boolean;
  assignContestantsToCategories?: boolean;
}

@injectable()
export class TestEventSetupService extends BaseService {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {
    super();
  }

  /**
   * Create a complete test event with all components
   */
  async createTestEvent(
    config: TestEventConfig,
    userId: string,
    userRole: string
  ): Promise<{ eventId: string; message: string }> {
    // Only admin can create test events
    if (userRole !== 'ADMIN') {
      throw this.forbiddenError('Only administrators can create test events');
    }

    const {
      eventName = `Test Event ${Date.now()}`,
      contestCount = 2,
      categoriesPerContest = 3,
      contestantsPerCategory = 5,
      judgesPerCategory = 3,
      tallyMastersPerContest = 1,
      auditorsPerContest = 1,
      boardUsers = 2,
      organizers = 2,
      assignJudgesToCategories = true,
      assignContestantsToCategories = true
    } = config;

    // Validate config
    if (contestCount < 1 || contestCount > 10) {
      throw this.validationError('contestCount must be between 1 and 10');
    }
    if (categoriesPerContest < 1 || categoriesPerContest > 10) {
      throw this.validationError('categoriesPerContest must be between 1 and 10');
    }
    if (contestantsPerCategory < 1 || contestantsPerCategory > 20) {
      throw this.validationError('contestantsPerCategory must be between 1 and 20');
    }
    if (judgesPerCategory < 1 || judgesPerCategory > 10) {
      throw this.validationError('judgesPerCategory must be between 1 and 10');
    }

    const hashedPassword = await bcrypt.hash('password123', 10);
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 7);

    const result = await this.prisma.$transaction(async (tx) => {
      // Create event
      const event = await tx.event.create({
        data: {
          tenantId: 'default_tenant',
          name: eventName,
          description: 'Test event created by test setup service',
          startDate,
          endDate,
          location: 'Test Location'
        }
      });

      // Create organizers
      const organizerUsers = [];
      for (let i = 0; i < organizers; i++) {
        const user = await tx.user.create({
          data: {
            tenantId: 'default_tenant',
            name: `Test Organizer ${i + 1}`,
            email: `testorganizer${i + 1}@test.com`,
            password: hashedPassword,
            role: 'ORGANIZER',
            isActive: true
          }
        });
        organizerUsers.push(user);
      }

      // Create board users
      const boardUserList = [];
      for (let i = 0; i < boardUsers; i++) {
        const user = await tx.user.create({
          data: {
            tenantId: 'default_tenant',
            name: `Test Board ${i + 1}`,
            email: `testboard${i + 1}@test.com`,
            password: hashedPassword,
            role: 'BOARD',
            isActive: true
          }
        });
        boardUserList.push(user);
      }

      // Create contests
      const contests = [];
      for (let c = 0; c < contestCount; c++) {
        const contest = await tx.contest.create({
          data: {
            tenantId: 'default_tenant',
            eventId: event.id,
            name: `Test Contest ${c + 1}`,
            description: `Test contest ${c + 1} description`
          }
        });
        contests.push(contest);

        // Create tally masters for this contest
        const tallyMasters = [];
        for (let t = 0; t < tallyMastersPerContest; t++) {
          const user = await tx.user.create({
            data: {
            tenantId: 'default_tenant',
              name: `Test Tally Master ${c + 1}-${t + 1}`,
              email: `testtally${c + 1}_${t + 1}@test.com`,
              password: hashedPassword,
              role: 'TALLY_MASTER',
              isActive: true
            }
          });
          tallyMasters.push(user);

          // Assign tally master to contest
          await tx.roleAssignment.create({
            data: {
              tenantId: 'default_tenant',
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
        const auditors = [];
        for (let a = 0; a < auditorsPerContest; a++) {
          const user = await tx.user.create({
            data: {
            tenantId: 'default_tenant',
              name: `Test Auditor ${c + 1}-${a + 1}`,
              email: `testauditor${c + 1}_${a + 1}@test.com`,
              password: hashedPassword,
              role: 'AUDITOR',
              isActive: true
            }
          });
          auditors.push(user);

          // Assign auditor to contest
          await tx.roleAssignment.create({
            data: {
              tenantId: 'default_tenant',
              userId: user.id,
              role: 'AUDITOR',
              contestId: contest.id,
              eventId: event.id,
              assignedBy: userId,
              isActive: true
            }
          });
        }

        // Create categories for this contest
        const categories = [];
        for (let cat = 0; cat < categoriesPerContest; cat++) {
          const category = await tx.category.create({
            data: {
              tenantId: 'default_tenant',
              contestId: contest.id,
              name: `Test Category ${c + 1}-${cat + 1}`,
              description: `Test category ${c + 1}-${cat + 1} description`,
              scoreCap: 100
            }
          });
          categories.push(category);

          // Create criteria for category
          await tx.criterion.createMany({
            data: [
              {
                categoryId: category.id,
                name: 'Criterion 1',
                maxScore: 30
              },
              {
                categoryId: category.id,
                name: 'Criterion 2',
                maxScore: 40
              },
              {
                categoryId: category.id,
                name: 'Criterion 3',
                maxScore: 30
              }
            ]
          });

          // Create judges for this category
          const judges = [];
          for (let j = 0; j < judgesPerCategory; j++) {
            const judge = await tx.judge.create({
              data: {
                tenantId: 'default_tenant',
                name: `Test Judge ${c + 1}-${cat + 1}-${j + 1}`,
                email: `testjudge${c + 1}_${cat + 1}_${j + 1}@test.com`,
                bio: `Test judge bio ${c + 1}-${cat + 1}-${j + 1}`
              }
            });
            judges.push(judge);

            // Create user for judge
            const judgeUser = await tx.user.create({
              data: {
                tenantId: 'default_tenant',
                name: judge.name,
                email: judge.email || `judge${judge.id}@test.com`,
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

            if (assignJudgesToCategories) {
              // Assign judge to category
              await tx.categoryJudge.create({
                data: {
                  categoryId: category.id,
                  judgeId: judge.id
                }
              });
            }
          }

          // Create contestants for this category
          const contestants = [];
          for (let cont = 0; cont < contestantsPerCategory; cont++) {
            const contestant = await tx.contestant.create({
              data: {
                tenantId: 'default_tenant',
                name: `Test Contestant ${c + 1}-${cat + 1}-${cont + 1}`,
                email: `testcontestant${c + 1}_${cat + 1}_${cont + 1}@test.com`,
                bio: `Test contestant bio ${c + 1}-${cat + 1}-${cont + 1}`,
                contestantNumber: cont + 1
              }
            });
            contestants.push(contestant);

            // Create user for contestant
            const contestantUser = await tx.user.create({
              data: {
                tenantId: 'default_tenant',
                name: contestant.name,
                email: contestant.email || `contestant${contestant.id}@test.com`,
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
                  categoryId: category.id,
                  contestantId: contestant.id
                }
              });

              // Also assign to contest
              await tx.contestContestant.create({
                data: {
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
        message: `Test event created successfully with ${contestCount} contests, ${categoriesPerContest} categories per contest, ${contestantsPerCategory} contestants per category, ${judgesPerCategory} judges per category`
      };
    });

    this.logInfo('Test event created', { eventId: result.eventId, userId });
    return result;
  }
}


